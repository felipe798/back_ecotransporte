import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { UnidadEntity } from '../../unidad/entities/unidad.entity';
import { EmpresaTransporteEntity } from '../../empresa-transporte/entities/empresa-transporte.entity';
import { ClientTariffEntity } from '../../client-tariff/entities/client-tariff.entity';
import { IsOptional, IsString } from 'class-validator';

export class DashboardFilters {
  @IsOptional()
  @IsString()
  mes?: string;

  @IsOptional()
  @IsString()
  semana?: string;

  @IsOptional()
  @IsString()
  cliente?: string;

  @IsOptional()
  @IsString()
  transportista?: string;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsString()
  transportado?: string;

  @IsOptional()
  @IsString()
  divisa?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentsRepository: Repository<DocumentEntity>,
    @InjectRepository(UnidadEntity)
    private unidadRepository: Repository<UnidadEntity>,
    @InjectRepository(EmpresaTransporteEntity)
    private empresaRepository: Repository<EmpresaTransporteEntity>,
    @InjectRepository(ClientTariffEntity)
    private clientTariffRepository: Repository<ClientTariffEntity>,
  ) {}

  /**
   * Construye la condici�n WHERE basada en los filtros
   */
  private buildWhereCondition(filters: DashboardFilters): any {
    const where: any = { anulado: false };
    
    if (filters.mes) where.mes = filters.mes;
    if (filters.semana) where.semana = filters.semana;
    if (filters.cliente) where.cliente = filters.cliente;
    if (filters.transportista) where.transportista = filters.transportista;
    if (filters.unidad) where.unidad = filters.unidad;
    if (filters.transportado) where.transportado = filters.transportado;
    
    return where;
  }

  private getMesNumero(mes: string): number | null {
    if (!mes) return null;
    const mapa: Record<string, number> = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      setiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    };
    return mapa[String(mes).toLowerCase().trim()] ?? null;
  }

  private applyMesFilter(queryBuilder: any, mes?: string, alias = 'doc', paramName = 'mes') {
    if (!mes) return queryBuilder;

    const mesNumero = this.getMesNumero(mes);
    const mesParam = paramName;
    const mesNumeroParam = `${paramName}Numero`;

    if (mesNumero) {
      queryBuilder.andWhere(
        `(${alias}.mes = :${mesParam} OR (${alias}.mes IS NULL AND ${alias}.fecha IS NOT NULL AND EXTRACT(MONTH FROM ${alias}.fecha) = :${mesNumeroParam}))`,
        {
          [mesParam]: mes,
          [mesNumeroParam]: mesNumero,
        },
      );
    } else {
      queryBuilder.andWhere(`${alias}.mes = :${mesParam}`, { [mesParam]: mes });
    }

    return queryBuilder;
  }

  private getMesSqlExpression(alias = 'doc') {
    return `COALESCE(NULLIF(LOWER(TRIM(${alias}.mes)), ''), CASE WHEN ${alias}.fecha IS NOT NULL THEN CASE EXTRACT(MONTH FROM ${alias}.fecha)::int WHEN 1 THEN 'enero' WHEN 2 THEN 'febrero' WHEN 3 THEN 'marzo' WHEN 4 THEN 'abril' WHEN 5 THEN 'mayo' WHEN 6 THEN 'junio' WHEN 7 THEN 'julio' WHEN 8 THEN 'agosto' WHEN 9 THEN 'septiembre' WHEN 10 THEN 'octubre' WHEN 11 THEN 'noviembre' WHEN 12 THEN 'diciembre' END END)`;
  }

  private getSemanaSqlExpression(alias = 'doc') {
    return `CASE WHEN ${alias}.fecha IS NOT NULL THEN (1 + FLOOR(((EXTRACT(DOY FROM ${alias}.fecha)::int - 1) + EXTRACT(DOW FROM DATE_TRUNC('year', ${alias}.fecha))::int) / 7))::text ELSE NULLIF(TRIM(${alias}.semana), '') END`;
  }

  private resolveSemanaFromDoc(doc: Partial<DocumentEntity>): string | null {
    const fechaValue = doc?.fecha as any;
    if (fechaValue) {
      const fecha = fechaValue instanceof Date ? fechaValue : new Date(fechaValue);
      if (!isNaN(fecha.getTime())) {
        const startOfYear = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
        const current = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
        const dayOfYear = Math.floor((current.getTime() - startOfYear.getTime()) / 86400000) + 1;
        const jan1Dow = startOfYear.getUTCDay();
        const week = Math.floor((dayOfYear + jan1Dow - 1) / 7) + 1;
        return String(week);
      }
    }

    if (doc?.semana !== null && doc?.semana !== undefined && String(doc.semana).trim() !== '') {
      return String(doc.semana).trim();
    }
    return null;
  }

  private applySemanaFilter(queryBuilder: any, semana?: string, alias = 'doc', paramName = 'semana') {
    if (!semana) return queryBuilder;
    const semanaExpr = this.getSemanaSqlExpression(alias);
    queryBuilder.andWhere(`${semanaExpr} = :${paramName}`, { [paramName]: String(semana) });
    return queryBuilder;
  }

  private sortMeses(meses: string[]): string[] {
    const orden: Record<string, number> = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      setiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    };

    return [...meses].sort((a, b) => {
      const aa = String(a || '').toLowerCase().trim();
      const bb = String(b || '').toLowerCase().trim();
      const oa = orden[aa] ?? 99;
      const ob = orden[bb] ?? 99;
      if (oa !== ob) return oa - ob;
      return aa.localeCompare(bb, 'es');
    });
  }

  private sortSemanas(semanas: string[]): string[] {
    return [...semanas]
      .filter((s) => s !== null && s !== undefined && String(s).trim() !== '')
      .map((s) => String(s).trim())
      .sort((a, b) => Number(a) - Number(b));
  }

  private getEmpresaSqlExpression(alias = 'doc') {
    return `COALESCE(NULLIF(TRIM(${alias}.empresa), ''), (SELECT et2.nombre FROM unidad u2 LEFT JOIN empresa_transporte et2 ON et2.id = u2.empresa_id WHERE UPPER(TRIM(u2.placa)) = UPPER(TRIM(${alias}.unidad)) ORDER BY CASE WHEN u2.estado = 'activo' THEN 0 ELSE 1 END, u2.id DESC LIMIT 1), 'SIN EMPRESA')`;
  }

  /**
   * Helper: crea un QueryBuilder que siempre excluye documentos anulados
   */
  private createDocQuery(alias = 'doc') {
    return this.documentsRepository.createQueryBuilder(alias)
      .where(`${alias}.anulado = :anulado`, { anulado: false });
  }

  /**
   * Obtiene valores �nicos para los segmentadores
   */
  async getSegmentadores(): Promise<any> {
    const mesExpr = this.getMesSqlExpression('doc');
    const semanaExpr = this.getSemanaSqlExpression('doc');

    const meses = await this.createDocQuery()
      .select(`DISTINCT ${mesExpr}`, 'mes')
      .andWhere(`${mesExpr} IS NOT NULL`)
      .getRawMany();

    const semanas = await this.createDocQuery()
      .select(`DISTINCT ${semanaExpr}`, 'semana')
      .andWhere(`${semanaExpr} IS NOT NULL`)
      .getRawMany();

    const clientes = await this.createDocQuery()
      .select('DISTINCT doc.cliente', 'cliente')
      .andWhere('doc.cliente IS NOT NULL')
      .orderBy('doc.cliente')
      .getRawMany();

    const transportistas = await this.createDocQuery()
      .select('DISTINCT doc.transportista', 'transportista')
      .andWhere('doc.transportista IS NOT NULL')
      .orderBy('doc.transportista')
      .getRawMany();

    const unidades = await this.createDocQuery()
      .select('DISTINCT doc.unidad', 'unidad')
      .andWhere('doc.unidad IS NOT NULL')
      .orderBy('doc.unidad')
      .getRawMany();

    const transportados = await this.createDocQuery()
      .select('DISTINCT doc.transportado', 'transportado')
      .andWhere('doc.transportado IS NOT NULL')
      .orderBy('doc.transportado')
      .getRawMany();

    return {
      meses: this.sortMeses(meses.map(m => m.mes)),
      semanas: this.sortSemanas(semanas.map(s => s.semana)),
      clientes: clientes.map(c => c.cliente),
      transportistas: transportistas.map(t => t.transportista),
      unidades: unidades.map(u => u.unidad),
      transportados: transportados.map(t => t.transportado),
    };
  }

  /**
   * Segmentadores filtrados en cascada:
   * Para cada dimensi�n devuelve solo las opciones disponibles
   * dada la combinaci�n de los DEM�S filtros seleccionados.
   */
  async getSegmentadoresFiltrados(filters: DashboardFilters): Promise<any> {
    const { mes, semana, cliente, transportista, unidad, transportado } = filters;
    const mesExpr = this.getMesSqlExpression('doc');
    const semanaExpr = this.getSemanaSqlExpression('doc');

    const { divisa } = filters;

    const applyFilters = (qb: any, omit: string) => {
      if (mes && omit !== 'mes') this.applyMesFilter(qb, mes);
      if (semana && omit !== 'semana') this.applySemanaFilter(qb, semana);
      if (cliente && omit !== 'cliente') qb.andWhere('doc.cliente = :cliente', { cliente });
      if (transportista && omit !== 'transportista') qb.andWhere('doc.transportista = :transportista', { transportista });
      if (unidad && omit !== 'unidad') qb.andWhere('doc.unidad = :unidad', { unidad });
      if (transportado && omit !== 'transportado') qb.andWhere('doc.transportado = :transportado', { transportado });
      if (divisa && omit !== 'divisa') qb.andWhere('doc.divisa = :divisa', { divisa });
      return qb;
    };

    const repo = this.documentsRepository;

    const [mesesRaw, semanasRaw, clientesRaw, transportistasRaw, unidadesRaw, transportadosRaw, divisasRaw] =
      await Promise.all([
        applyFilters(
          this.createDocQuery()
            .select(`DISTINCT ${mesExpr}`, 'mes')
            .andWhere(`${mesExpr} IS NOT NULL`),
          'mes',
        ).getRawMany(),
        applyFilters(
          this.createDocQuery()
            .select(`DISTINCT ${semanaExpr}`, 'semana')
            .andWhere(`${semanaExpr} IS NOT NULL`),
          'semana',
        ).getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.cliente', 'cliente').andWhere('doc.cliente IS NOT NULL').orderBy('doc.cliente'), 'cliente').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.transportista', 'transportista').andWhere('doc.transportista IS NOT NULL').orderBy('doc.transportista'), 'transportista').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.unidad', 'unidad').andWhere('doc.unidad IS NOT NULL').orderBy('doc.unidad'), 'unidad').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.transportado', 'transportado').andWhere('doc.transportado IS NOT NULL').orderBy('doc.transportado'), 'transportado').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.divisa', 'divisa').andWhere('doc.divisa IS NOT NULL').orderBy('doc.divisa'), 'divisa').getRawMany(),
      ]);

    return {
      meses: this.sortMeses(mesesRaw.map(m => m.mes)),
      semanas: this.sortSemanas(semanasRaw.map(s => s.semana)),
      clientes: clientesRaw.map(c => c.cliente),
      transportistas: transportistasRaw.map(t => t.transportista),
      unidades: unidadesRaw.map(u => u.unidad),
      transportados: transportadosRaw.map(t => t.transportado),
      divisas: divisasRaw.map(d => d.divisa),
    };
  }

  /**
   * Lista de gu�as por verificar (tn_recibida = tn_enviado)
   */
  async getGuiasPorVerificarList(filters?: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .andWhere('doc.tn_recibida = doc.tn_enviado');

    this.applyMesFilter(queryBuilder, filters?.mes);
    if (filters?.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters?.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters?.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters?.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters?.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder.orderBy(`CAST(SUBSTRING(doc.grt FROM '([0-9]+)$') AS INTEGER)`, 'ASC').addOrderBy('doc.grt', 'ASC').limit(50).getMany();
  }

  /**
   * Gu�as por verificar (tn_recibida = tn_enviado)
   */
  async getGuiasPorVerificar(filters?: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(*)', 'count')
      .andWhere('doc.tn_recibida = doc.tn_enviado');
    
    this.applyMesFilter(queryBuilder, filters?.mes);
    if (filters?.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters?.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters?.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters?.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters?.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });
    
    const sql = queryBuilder.getSql();
    console.log('SQL Guias por verificar:', sql);
    
    const result = await queryBuilder.getRawOne();
    console.log('Resultado Guias por verificar:', result);
    return Number(result.count) || 0;
  }

  /**
   * Tickets no recepcionados (solo ticket vac�o/null, sin importar peso)
   */
  async getTicketsNoRecepcionados(filters?: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(*)', 'count')
      .andWhere('(doc.ticket IS NULL OR doc.ticket = :empty OR doc.ticket = :dash)',
        { empty: '', dash: '-' });
    
    this.applyMesFilter(queryBuilder, filters?.mes);
    if (filters?.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters?.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters?.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters?.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters?.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });
    
    const sql = queryBuilder.getSql();
    console.log('SQL Tickets no recepcionados:', sql);
    
    const result = await queryBuilder.getRawOne();
    console.log('Resultado Tickets no recepcionados:', result);
    return Number(result.count) || 0;
  }

  /**
   * Lista de tickets no recepcionados (solo ticket vac�o/null)
   */
  async getTicketsNoRecepcionadosList(filters?: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .andWhere('(doc.ticket IS NULL OR doc.ticket = :empty OR doc.ticket = :dash)',
        { empty: '', dash: '-' });
    
    this.applyMesFilter(queryBuilder, filters?.mes);
    if (filters?.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters?.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters?.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters?.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters?.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });
    
    return await queryBuilder
      .orderBy('doc.fecha', 'DESC')
      .limit(50)
      .getMany();
  }

  /**
   * Control de peso: TN Enviado total, TN Recibido total, Variaci�n
   */
  async getControlPeso(filters: DashboardFilters): Promise<any> {
    const queryBuilder = this.createDocQuery()
      .select('SUM(doc.tn_enviado)', 'tn_enviado_total')
      .addSelect('SUM(doc.tn_recibida)', 'tn_recibida_total')
      .andWhere('1=1');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    const result = await queryBuilder.getRawOne();
    
    const tnEnviado = Number(result.tn_enviado_total) || 0;
    const tnRecibido = Number(result.tn_recibida_total) || 0;
    
    return {
      tn_enviado_total: tnEnviado,
      tn_recibida_total: tnRecibido,
      variacion: tnRecibido - tnEnviado,
    };
  }

  /**
   * TN Enviado por semana
   */
  async getTnEnviadoPorSemana(filters: DashboardFilters): Promise<any[]> {
    const semanaExpr = this.getSemanaSqlExpression('doc');
    const mesExpr = this.getMesSqlExpression('doc');

    const queryBuilder = this.createDocQuery()
      .select(semanaExpr, 'semana')
      .addSelect(mesExpr, 'mes')
      .addSelect('SUM(COALESCE(doc.tn_enviado, 0))', 'total')
      .andWhere(`${semanaExpr} IS NOT NULL`);

    this.applyMesFilter(queryBuilder, filters.mes);
    this.applySemanaFilter(queryBuilder, filters.semana);
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy(semanaExpr)
      .addGroupBy(mesExpr)
      .orderBy(`CAST(${semanaExpr} AS INTEGER)`, 'ASC')
      .getRawMany();
  }

  /**
   * TN Recibido por semana
   */
  async getTnRecibidoPorSemana(filters: DashboardFilters): Promise<any[]> {
    const semanaExpr = this.getSemanaSqlExpression('doc');
    const mesExpr = this.getMesSqlExpression('doc');

    const queryBuilder = this.createDocQuery()
      .select(semanaExpr, 'semana')
      .addSelect(mesExpr, 'mes')
      .addSelect('SUM(COALESCE(doc.tn_recibida, doc.tn_enviado, 0))', 'total')
      .andWhere(`${semanaExpr} IS NOT NULL`);

    this.applyMesFilter(queryBuilder, filters.mes);
    this.applySemanaFilter(queryBuilder, filters.semana);
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy(semanaExpr)
      .addGroupBy(mesExpr)
      .orderBy(`CAST(${semanaExpr} AS INTEGER)`, 'ASC')
      .getRawMany();
  }

  /**
   * TN por tipo de concentrado (enviado)
   */
  async getTnPorConcentradoEnviado(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.transportado', 'tipo_concentrado')
      .addSelect('SUM(doc.tn_enviado)', 'total')
      .andWhere('doc.transportado IS NOT NULL');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.transportado')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * TN por tipo de concentrado (recibido)
   */
  async getTnPorConcentradoRecibido(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.transportado', 'tipo_concentrado')
      .addSelect('SUM(COALESCE(doc.tn_recibida, doc.tn_enviado, 0))', 'total')
      .andWhere('doc.transportado IS NOT NULL')
      .andWhere('(doc.tn_recibida IS NOT NULL OR doc.tn_enviado IS NOT NULL)');

    this.applyMesFilter(queryBuilder, filters.mes);
    this.applySemanaFilter(queryBuilder, filters.semana);
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.transportado')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * TN Enviadas por unidad (placa) - simplificado para chart
   */
  async getTnPorUnidad(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.unidad', 'placa')
      .addSelect('SUM(doc.tn_recibida)', 'total')
      .andWhere('doc.unidad IS NOT NULL');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.unidad')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * TN por unidad por mes
   */
  async getTnPorUnidadMes(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.mes', 'mes')
      .addSelect('doc.unidad', 'placa')
      .addSelect('SUM(doc.tn_enviado)', 'total')
      .andWhere('doc.unidad IS NOT NULL')
      .andWhere('doc.mes IS NOT NULL');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

    return await queryBuilder
      .groupBy('doc.mes')
      .addGroupBy('doc.unidad')
      .orderBy('doc.mes')
      .addOrderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * TN por cliente (simplificado para chart)
   */
  async getTnPorCliente(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.cliente', 'cliente')
      .addSelect('SUM(doc.tn_enviado)', 'total')
      .andWhere('doc.cliente IS NOT NULL');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.cliente')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * Total de traslados (documentos cuyo transportista NO es 'DADO DE BAJA')
   * Acepta filtros para reflejar el contexto del usuario
   */
  async getTotalTraslados(filters?: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(*)', 'total')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    this.applyMesFilter(queryBuilder, filters?.mes);
    if (filters?.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters?.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters?.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters?.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters?.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    const result = await queryBuilder.getRawOne();
    return Number(result.total) || 0;
  }

  /**
   * Traslados por unidad (filtrable)
   */
  async getTrasladosPorUnidad(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.unidad', 'placa')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('SUM(doc.tn_recibida)', 'tn_recibido')
      .andWhere('doc.unidad IS NOT NULL');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

    return await queryBuilder
      .groupBy('doc.unidad')
      .orderBy('cantidad', 'DESC')
      .getRawMany();
  }

  /**
   * Viajes: combinaci�n �nica de fecha + cliente
   * Un viaje = todos los traslados del mismo d�a para el mismo cliente
   * Excluye documentos con transportista = 'DADO DE BAJA'
   */
  async getViajes(filters: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(DISTINCT CONCAT(doc.fecha, doc.cliente))', 'viajes')
      .andWhere('doc.fecha IS NOT NULL')
      .andWhere('doc.cliente IS NOT NULL')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

    const result = await queryBuilder.getRawOne();
    return Number(result.viajes) || 0;
  }

  /**
   * Detalle de transportista (agrupado)
   */
  async getDetalleTransportista(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.transportista', 'transportista')
      .addSelect('COALESCE(doc.divisa_cost, \'PEN\')', 'divisa_cost')
      .addSelect('COUNT(*)', 'cantidad_traslados')
      .addSelect('SUM(doc.tn_enviado)', 'tn_enviado')
      .addSelect('SUM(doc.tn_recibida)', 'tn_recibido')
      .addSelect('SUM(doc.tn_recibida) - SUM(doc.tn_enviado)', 'variacion')
      .addSelect('SUM(COALESCE(doc.precio_final, 0))', 'precio_total')
      .andWhere('doc.transportista IS NOT NULL');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

    return await queryBuilder
      .groupBy('doc.transportista')
      .addGroupBy('doc.divisa_cost')
      .orderBy('tn_enviado', 'DESC')
      .getRawMany();
  }

  /**
   * Tonelaje total enviado (general - sin filtros)
   */
  async getTonelajeEnviadoGeneral(): Promise<number> {
    const result = await this.createDocQuery()
      .select('SUM(doc.tn_enviado)', 'total')
      .getRawOne();
    
    return Number(result.total) || 0;
  }

  /**
   * Tonelaje enviado filtrado
   */
  async getTonelajeEnviadoFiltrado(filters: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('SUM(doc.tn_enviado)', 'total')
      .andWhere('1=1');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    const result = await queryBuilder.getRawOne();
    return Number(result.total) || 0;
  }

  /**
   * Tonelaje recibido filtrado
   */
  async getTonelajeRecibidoFiltrado(filters: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('SUM(doc.tn_recibida)', 'total')
      .andWhere('1=1');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    const result = await queryBuilder.getRawOne();
    return Number(result.total) || 0;
  }

  /**
   * Tabla pivot: TN Recibidas por semana y cliente
   */
  async getTablaPivotTnRecibidas(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.semana', 'semana')
      .addSelect('doc.cliente', 'cliente')
      .addSelect('SUM(doc.tn_enviado)', 'tn_enviado')
      .addSelect('SUM(doc.tn_recibida)', 'tn_recibido')
      .addSelect('SUM(doc.tn_recibida) - SUM(doc.tn_enviado)', 'variacion')
      .andWhere('doc.semana IS NOT NULL');

    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.semana')
      .addGroupBy('doc.cliente')
      .orderBy('doc.semana')
      .addOrderBy('tn_enviado', 'DESC')
      .getRawMany();
  }

  // =====================================================
  // INDICADORES FINANCIEROS Y DE SEGUIMIENTO
  // =====================================================

  /**
   * Obtener lista de empresas de transporte
   */
  async getEmpresasTransporte(): Promise<string[]> {
    const empresas = await this.empresaRepository.find({
      where: { estado: 'activo' },
      select: ['nombre'],
      order: { nombre: 'ASC' },
    });
    return empresas.map(e => e.nombre);
  }

  /**
   * Por Cobrar: Agrupado por Cliente ? Empresa ? Divisa
   * Suma de precio_final
   */
  async getPorCobrar(filters: DashboardFilters): Promise<any[]> {
    const empresaExpr = this.getEmpresaSqlExpression('doc');

    const queryBuilder = this.createDocQuery()
      .select('doc.cliente', 'cliente')
      .addSelect(empresaExpr, 'empresa')
      .addSelect('COALESCE(doc.divisa, \'PEN\')', 'divisa')
      .addSelect('SUM(doc.precio_final)', 'total')
      .andWhere('doc.precio_final IS NOT NULL')
      .andWhere('doc.precio_final > 0');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy(empresaExpr)
      .addGroupBy('doc.divisa')
      .orderBy('doc.cliente')
      .addOrderBy(empresaExpr)
      .getRawMany();
  }

  /**
   * Por Pagar: Agrupado por Cliente ? Empresa ? Divisa
   * Suma de costo_final
   */
  async getPorPagar(filters: DashboardFilters): Promise<any[]> {
    const empresaExpr = this.getEmpresaSqlExpression('doc');

    const queryBuilder = this.createDocQuery()
      .select('doc.cliente', 'cliente')
      .addSelect(empresaExpr, 'empresa')
      .addSelect('COALESCE(doc.divisa_cost, \'PEN\')', 'divisa')
      .addSelect('SUM(doc.costo_final)', 'total')
      .andWhere('doc.costo_final IS NOT NULL')
      .andWhere('doc.costo_final > 0')
      .andWhere(`UPPER(${empresaExpr}) NOT LIKE :exclEmpresa`, { exclEmpresa: '%ECOTRANSPORTE%' });

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa_cost = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy(empresaExpr)
      .addGroupBy('doc.divisa_cost')
      .orderBy('doc.cliente')
      .addOrderBy(empresaExpr)
      .getRawMany();
  }

  /**
   * Margen Operativo: Agrupado por Cliente ? Empresa ? Divisa
   * Suma de (precio_final - costo_final)
   */
  async getMargenOperativo(filters: DashboardFilters): Promise<any[]> {
    const empresaExpr = this.getEmpresaSqlExpression('doc');

    const queryBuilder = this.createDocQuery()
      .select('doc.cliente', 'cliente')
      .addSelect(empresaExpr, 'empresa')
      .addSelect('COALESCE(doc.divisa, \'PEN\')', 'divisa')
      .addSelect(`SUM(CASE WHEN UPPER(${empresaExpr}) = 'ECOTRANSPORTE' THEN COALESCE(doc.precio_final, 0) ELSE COALESCE(doc.precio_final, 0) - COALESCE(doc.costo_final, 0) END)`, 'total')
      .andWhere('1=1');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy(empresaExpr)
      .addGroupBy('doc.divisa')
      .orderBy('doc.cliente')
      .addOrderBy(empresaExpr)
      .getRawMany();
  }

  /**
   * TN Enviado por Cliente y Empresa
   * Agrupado por Cliente ? Empresa
   */
  async getTnEnviadoClienteEmpresa(filters: DashboardFilters): Promise<any[]> {
    const empresaExpr = this.getEmpresaSqlExpression('doc');

    const queryBuilder = this.createDocQuery()
      .select('doc.cliente', 'cliente')
      .addSelect(empresaExpr, 'empresa')
      .addSelect('SUM(doc.tn_recibida)', 'total')
      .andWhere('doc.tn_recibida IS NOT NULL');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy(empresaExpr)
      .orderBy('doc.cliente')
      .addOrderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * Seguimiento de Transporte: TN Recibido por Semana
   * Agrupado por Cliente ? Empresa ? Unidad ? Semana
   */
  async getSeguimientoTransporte(filters: DashboardFilters): Promise<any[]> {
    const empresaExpr = this.getEmpresaSqlExpression('doc');
    const semanaExpr = this.getSemanaSqlExpression('doc');

    const queryBuilder = this.createDocQuery()
      .select('doc.cliente', 'cliente')
      .addSelect(empresaExpr, 'empresa')
      .addSelect(`COALESCE(NULLIF(TRIM(doc.unidad), ''), 'SIN UNIDAD')`, 'placa')
      .addSelect(semanaExpr, 'semana')
      .addSelect('SUM(COALESCE(doc.tn_recibida, doc.tn_enviado, 0))', 'tn_recibida')
      .andWhere(`${semanaExpr} IS NOT NULL`)
      .andWhere('doc.cliente IS NOT NULL');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    this.applyMesFilter(queryBuilder, filters.mes);
    this.applySemanaFilter(queryBuilder, filters.semana);

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy(empresaExpr)
      .addGroupBy(`COALESCE(NULLIF(TRIM(doc.unidad), ''), 'SIN UNIDAD')`)
      .addGroupBy(semanaExpr)
      .orderBy('doc.cliente')
      .addOrderBy(empresaExpr)
      .addOrderBy(`COALESCE(NULLIF(TRIM(doc.unidad), ''), 'SIN UNIDAD')`)
      .addOrderBy(semanaExpr)
      .getRawMany();
  }

  /**
   * Resumen financiero general
   */
  async getResumenFinanciero(filters: DashboardFilters): Promise<any> {
    const queryBuilder = this.createDocQuery()
      .select('COALESCE(doc.divisa, \'PEN\')', 'divisa')
      .addSelect('SUM(doc.precio_final)', 'total_cobrar')
      .addSelect('SUM(doc.costo_final)', 'total_pagar')
      .addSelect('SUM(COALESCE(doc.precio_final, 0) - COALESCE(doc.costo_final, 0))', 'margen')
      .andWhere('1=1');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    this.applyMesFilter(queryBuilder, filters.mes);
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });

    return await queryBuilder
      .groupBy('doc.divisa')
      .getRawMany();
  }

  // =====================================================
  // VIAJES POR CLIENTE
  // =====================================================

  /**
   * Obtener d�as con viajes seg�n cliente y/o placa
   * Excluye transportista = 'DADO DE BAJA'
   */
  async getDiasConViajes(filters: DashboardFilters): Promise<any[]> {
    console.log('[getDiasConViajes] Filtros recibidos:', JSON.stringify(filters));

    const queryBuilder = this.createDocQuery()
      .select('doc.fecha', 'fecha')
      .addSelect('COUNT(*)', 'traslados')
      .addSelect('SUM(doc.tn_recibida)', 'tonelaje_recibido')
      .andWhere('doc.fecha IS NOT NULL')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    this.applyMesFilter(queryBuilder, filters.mes);

    const result = await queryBuilder
      .groupBy('doc.fecha')
      .orderBy('doc.fecha', 'ASC')
      .getRawMany();

    console.log(`[getDiasConViajes] Total filas retornadas: ${result.length}`);
    if (result.length > 0) {
      console.log('[getDiasConViajes] Primeras 3 filas (raw):', JSON.stringify(result.slice(0, 3)));
      console.log('[getDiasConViajes] Tipos de datos fila[0]:', {
        fecha: typeof result[0].fecha,
        fechaVal: result[0].fecha,
        traslados: typeof result[0].traslados,
        trasladosVal: result[0].traslados,
        tonelaje_recibido: typeof result[0].tonelaje_recibido,
        tonelajeVal: result[0].tonelaje_recibido,
      });
    } else {
      console.log('[getDiasConViajes] Sin resultados. Filtros activos:', {
        cliente: filters.cliente || 'ninguno',
        unidad: filters.unidad || 'ninguna',
      });
    }

    return result;
  }

  /**
   * Viajes por placa para un cliente (gr�fico de barras)
   * Viaje = combinaci�n �nica fecha + cliente
   * Excluye transportista = 'DADO DE BAJA'
   */
  async getViajesPorPlaca(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.unidad', 'placa')
      .addSelect('COUNT(*)', 'viajes')
      .andWhere('doc.unidad IS NOT NULL')
      .andWhere('doc.fecha IS NOT NULL')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    this.applyMesFilter(queryBuilder, filters.mes);

    return await queryBuilder
      .groupBy('doc.unidad')
      .orderBy('viajes', 'DESC')
      .getRawMany();
  }

  /**
   * Resumen de viajes por cliente
   */
  async getResumenViajesCliente(filters: DashboardFilters): Promise<any> {
    // Total de viajes (combinaciones �nicas fecha + cliente)
    const viajesQuery = this.createDocQuery()
      .select('COUNT(DISTINCT CONCAT(doc.fecha, doc.cliente))', 'viajes')
      .andWhere('doc.fecha IS NOT NULL')
      .andWhere('doc.cliente IS NOT NULL')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.cliente) viajesQuery.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) viajesQuery.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    this.applyMesFilter(viajesQuery, filters.mes);

    // Total de traslados
    const trasladosQuery = this.createDocQuery()
      .select('COUNT(*)', 'traslados')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.cliente) trasladosQuery.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) trasladosQuery.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    this.applyMesFilter(trasladosQuery, filters.mes);

    const [viajesResult, trasladosResult] = await Promise.all([
      viajesQuery.getRawOne(),
      trasladosQuery.getRawOne(),
    ]);

    return {
      viajes: Number(viajesResult.viajes) || 0,
      traslados: Number(trasladosResult.traslados) || 0,
    };
  }

  // =====================================================
  // TABLAS DETALLADAS (VENTA / COSTO / MARGEN)
  // =====================================================

  /**
   * Definici�n de las 7 filas fijas (agrupaciones predefinidas de tarifas).
   * Cada una matchea documentos por cliente + condiciones de partida/llegada/material.
   */
  private getFixedRows(): Array<{
    label: string;
    match: (doc: any) => boolean;
    matchTariff: (t: ClientTariffEntity) => boolean;
    divisa: string;
  }> {
    return [
      {
        label: 'Paltarumi',
        match: (doc) => (doc.cliente || '').toUpperCase().includes('PALTARUMI'),
        matchTariff: (t) => t.cliente.toUpperCase().includes('PALTARUMI'),
        divisa: 'USD',
      },
      {
        label: 'ECO-GOLD-Concentrado',
        match: (doc) => {
          const cl = (doc.cliente || '').toUpperCase();
          const mat = (doc.transportado || '').toUpperCase();
          const lleg = (doc.llegada || '').toUpperCase();
          return cl.includes('ECO GOLD') && mat.includes('CONCENTRADO') && lleg.includes('VENTANILLA');
        },
        matchTariff: (t) => {
          return t.cliente.toUpperCase().includes('ECO GOLD')
            && t.material.toUpperCase().includes('CONCENTRADO')
            && t.llegada.toUpperCase().includes('VENTANILLA');
        },
        divisa: 'USD',
      },
      {
        label: 'Polimet�licos',
        match: (doc) => (doc.cliente || '').toUpperCase().includes('POLIMETALICOS'),
        matchTariff: (t) => t.cliente.toUpperCase().includes('POLIMETALICOS'),
        divisa: 'USD',
      },
      {
        label: 'ECO-GOLD (Paramonga-Vent)',
        match: (doc) => {
          const cl = (doc.cliente || '').toUpperCase();
          const part = (doc.partida || '').toUpperCase();
          const lleg = (doc.llegada || '').toUpperCase();
          const mat = (doc.transportado || '').toUpperCase();
          return cl.includes('ECO GOLD') && part.includes('PARAMONGA') && lleg.includes('VENTANILLA') && mat.includes('CONCENTRADO');
        },
        matchTariff: (t) => {
          return t.cliente.toUpperCase().includes('ECO GOLD')
            && t.partida.toUpperCase().includes('PARAMONGA')
            && t.llegada.toUpperCase().includes('VENTANILLA')
            && t.material.toUpperCase().includes('CONCENTRADO');
        },
        divisa: 'USD',
      },
      {
        label: 'ECO-GOLD-Mineral',
        match: (doc) => {
          const cl = (doc.cliente || '').toUpperCase();
          const mat = (doc.transportado || '').toUpperCase();
          return cl.includes('ECO GOLD') && mat.includes('MINERAL AURIFERO');
        },
        matchTariff: (t) => {
          return t.cliente.toUpperCase().includes('ECO GOLD')
            && t.material.toUpperCase().includes('MINERAL AURIFERO');
        },
        divisa: 'USD',
      },
      {
        label: 'ECO-GOLD-Mineral Polimet�lico',
        match: (doc) => {
          const cl = (doc.cliente || '').toUpperCase();
          const mat = (doc.transportado || '').toUpperCase();
          return cl.includes('ECO GOLD') && mat.includes('MINERAL POLIMETALICO');
        },
        matchTariff: (t) => {
          return t.cliente.toUpperCase().includes('ECO GOLD')
            && t.material.toUpperCase().includes('MINERAL POLIMETALICO');
        },
        divisa: 'USD',
      },
      {
        label: 'MONARCA (Nepe�a-Impala)',
        match: (doc) => {
          const cl = (doc.cliente || '').toUpperCase();
          const part = (doc.partida || '').toUpperCase();
          const lleg = (doc.llegada || '').toUpperCase();
          return cl.includes('MONARCA') && part.includes('NEPE') && lleg.includes('IMPALA');
        },
        matchTariff: (t) => {
          return t.cliente.toUpperCase().includes('MONARCA')
            && t.partida.toUpperCase().includes('NEPE')
            && t.llegada.toUpperCase().includes('IMPALA');
        },
        divisa: 'USD',
      },
    ];
  }

  /**
   * Tablas Detalladas: Venta, Costo y Margen agrupados por cliente ? material y empresa
   */
  async getTablasDetalladas(mes: string, semana?: string): Promise<any> {
    const mesNumero = this.getMesNumero(mes);

    // 1. Obtener todos los documentos no anulados del mes (sin filtro de semana)
    const queryMes = this.createDocQuery();
    if (mesNumero) {
      queryMes.andWhere('(doc.mes = :mes OR (doc.mes IS NULL AND EXTRACT(MONTH FROM doc.fecha) = :mesNumero))', {
        mes,
        mesNumero,
      });
    } else {
      queryMes.andWhere('doc.mes = :mes', { mes });
    }

    const allDocsDelMes = await queryMes
      .getMany();

    // Semanas disponibles en el mes (para devolver al frontend y construir el selector)
    const semanasSet = new Set<string>();
    for (const d of allDocsDelMes) {
      const sem = this.resolveSemanaFromDoc(d as any);
      if (sem) semanasSet.add(sem);
    }
    const semanasDisponibles = [...semanasSet].sort((a, b) => Number(a) - Number(b));

    // Filtrar por semana si se proporcion�
    const docs = semana
      ? allDocsDelMes.filter(d => this.resolveSemanaFromDoc(d as any) === String(semana))
      : allDocsDelMes;

    // 2. Resolver empresa por placa
    const allUnidades = await this.unidadRepository.find();
    const allEmpresas = await this.empresaRepository.find({ where: { estado: 'activo' }, order: { id: 'ASC' } });

    const empresaIdToNombre = new Map<number, string>();
    for (const emp of allEmpresas) {
      empresaIdToNombre.set(emp.id, emp.nombre);
    }

    const placaToEmpresa = new Map<string, string>();
    for (const u of allUnidades) {
      if (u.estado !== 'activo') continue; // Solo mapeamos las unidades activas
      const empNombre = empresaIdToNombre.get(u.empresaId) || '';
      if (empNombre) {
        placaToEmpresa.set(u.placa.toUpperCase().trim(), empNombre);
      }
    }

    const getDocEmpresa = (doc: any): string => {
      // Usamos el campo unidad (placa) para encontrar la empresa activa a la que pertenece
      const placa = (doc.unidad || '').toUpperCase().trim();
      if (placa && placaToEmpresa.has(placa)) {
        return placaToEmpresa.get(placa);
      }
      // Si no la encontramos por placa y el doc ya ten�a empresa, usar la empresa del doc (si existe en BD)
      if (doc.empresa && allEmpresas.some(e => e.nombre.toUpperCase().trim() === doc.empresa.toUpperCase().trim())) {
        return doc.empresa;
      }
      return '';
    };

    // 3. Empresas con actividad en el mes
    const empresasConActividad = [...new Set(docs.map(d => getDocEmpresa(d).toUpperCase().trim()).filter(e => e))];
    const empresasColumna = allEmpresas
      .filter(emp => empresasConActividad.includes(emp.nombre.toUpperCase().trim()))
      .map(emp => emp.nombre);

    // 4. Agrupar documentos por cliente ? material (transportado)
    const clienteMap = new Map<string, Map<string, any[]>>();

    for (const doc of docs) {
      const cliente = (doc.cliente || 'SIN CLIENTE').trim();
      const material = (doc.transportado || 'SIN MATERIAL').trim();

      if (!clienteMap.has(cliente)) {
        clienteMap.set(cliente, new Map());
      }
      const materialMap = clienteMap.get(cliente);
      if (!materialMap.has(material)) {
        materialMap.set(material, []);
      }
      materialMap.get(material).push(doc);
    }

    // 5. Construir grupos (cliente con sus materiales)
    const emptyData = () => {
      const d: any = { general: { tne: 0, importeVenta: 0, importeCosto: 0 } };
      for (const emp of empresasColumna) {
        d[emp] = { tne: 0, importeVenta: 0, importeCosto: 0 };
      }
      return d;
    };

    const grupos: Array<{
      cliente: string;
      divisa: string;
      materiales: Array<{
        label: string;
        divisa: string;
        data: any;
      }>;
    }> = [];

    // Ordenar clientes alfab�ticamente
    const clientesOrdenados = [...clienteMap.keys()].sort();

    for (const cliente of clientesOrdenados) {
      const materialMap = clienteMap.get(cliente);
      const materialesOrdenados = [...materialMap.keys()].sort();
      const materiales: any[] = [];
      let clienteDivisa = 'USD';

      for (const material of materialesOrdenados) {
        const docsMat = materialMap.get(material);
        const data = emptyData();
        let matDivisa = 'USD';

        for (const doc of docsMat) {
          const tnRecibida = Number(doc.tn_recibida) || 0;
          const precioUnit = Number(doc.precio_unitario) || 0;
          const pcosto = Number(doc.pcosto) || 0;
          matDivisa = (doc.divisa || 'USD').toUpperCase().includes('PEN') ? 'PEN' : 'USD';

          // Tarifa fija: Nukleo y Pay Metal cobran por servicio, no por tonelada
          const clienteUpper = (doc.cliente || '').toUpperCase();
          const esTarifaFija = clienteUpper.includes('NUKLEO') || clienteUpper.includes('PAY METAL');

          const importeVenta = esTarifaFija ? precioUnit : precioUnit * tnRecibida;

          // Si la empresa del documento es ECOTRANSPORTE, el costo es 0 (empresa propia)
          const docEmpresaName = getDocEmpresa(doc);
          const esEcotransporte = docEmpresaName.toUpperCase().trim().includes('ECOTRANSPORTE');
          const costoEfectivo = esEcotransporte ? 0 : (esTarifaFija ? pcosto : pcosto * tnRecibida);

          data.general.tne += tnRecibida;
          data.general.importeVenta += importeVenta;
          data.general.importeCosto += costoEfectivo;

          for (const emp of empresasColumna) {
            if (emp.toUpperCase().trim() === docEmpresaName.toUpperCase().trim()) {
              data[emp].tne += tnRecibida;
              data[emp].importeVenta += importeVenta;
              data[emp].importeCosto += costoEfectivo;
            }
          }
        }

        clienteDivisa = matDivisa;
        materiales.push({ label: material, divisa: matDivisa, data });
      }

      grupos.push({ cliente, divisa: clienteDivisa, materiales });
    }

    // 6. Calcular totales por divisa
    const totales = {
      USD: { general: { tne: 0, importeVenta: 0, importeCosto: 0 } as any },
      PEN: { general: { tne: 0, importeVenta: 0, importeCosto: 0 } as any },
    };
    for (const emp of empresasColumna) {
      totales.USD[emp] = { tne: 0, importeVenta: 0, importeCosto: 0 };
      totales.PEN[emp] = { tne: 0, importeVenta: 0, importeCosto: 0 };
    }

    for (const grupo of grupos) {
      for (const mat of grupo.materiales) {
        const div = (mat.divisa || 'USD').toUpperCase().includes('PEN') ? 'PEN' : 'USD';
        const target = totales[div];
        for (const key of ['general', ...empresasColumna]) {
          if (mat.data[key]) {
            target[key].tne += mat.data[key].tne;
            target[key].importeVenta += mat.data[key].importeVenta;
            target[key].importeCosto += mat.data[key].importeCosto;
          }
        }
      }
    }

    // 7. Margen de ganancia por empresa
    const margen = {
      USD: { general: { margen: totales.USD.general.importeVenta - totales.USD.general.importeCosto } } as any,
      PEN: { general: { margen: totales.PEN.general.importeVenta - totales.PEN.general.importeCosto } } as any,
      total: { general: (totales.USD.general.importeVenta - totales.USD.general.importeCosto)
                      + (totales.PEN.general.importeVenta - totales.PEN.general.importeCosto) } as any,
    };
    for (const emp of empresasColumna) {
      const usdEmp = totales.USD[emp] || { importeVenta: 0, importeCosto: 0 };
      const penEmp = totales.PEN[emp] || { importeVenta: 0, importeCosto: 0 };
      margen.USD[emp] = { margen: usdEmp.importeVenta - usdEmp.importeCosto };
      margen.PEN[emp] = { margen: penEmp.importeVenta - penEmp.importeCosto };
      margen.total[emp] = (usdEmp.importeVenta - usdEmp.importeCosto)
                        + (penEmp.importeVenta - penEmp.importeCosto);
    }

    return {
      mes,
      semana: semana || null,
      semanasDisponibles,
      empresas: empresasColumna,
      grupos,
      totales,
      margen,
    };
  }

  // =====================================================
  // REPORTE DE GU�AS EMITIDAS POR EMPRESA DE TRANSPORTE
  // =====================================================

  /**
   * Opciones para el reporte de gu�as: empresas disponibles y meses
   */
  async getReporteGuiasOpciones(): Promise<any> {
    const empresas = await this.empresaRepository.find({
      where: { estado: 'activo' },
      order: { id: 'ASC' },
    });

    const mesesRaw = await this.createDocQuery()
      .select('DISTINCT doc.mes', 'mes')
      .orderBy('doc.mes', 'ASC')
      .getRawMany();
    const meses = mesesRaw.map(r => r.mes).filter(Boolean);

    return {
      empresas: empresas.map(e => ({ id: e.id, nombre: e.nombre })),
      meses,
    };
  }

  /**
   * Reporte detallado de gu�as emitidas para una empresa de transporte en un mes.
   * Agrupa por placa (unidad) y sub-agrupa por semana.
   */
  async getReporteGuias(empresaNombre: string, mes: string, semana?: string): Promise<any> {
    const mesNumero = this.getMesNumero(mes);

    // Obtener las placas de la empresa
    const empresa = await this.empresaRepository.findOne({
      where: { nombre: empresaNombre, estado: 'activo' },
    });
    if (!empresa) return { error: 'Empresa no encontrada' };

    const unidades = await this.unidadRepository.find({
      where: { empresaId: empresa.id, estado: 'activo' },
      order: { placa: 'ASC' },
    });
    const placas = unidades.map(u => u.placa);

    if (placas.length === 0) return { error: 'No hay unidades activas para esta empresa' };

    // Obtener TODOS los documentos del mes para calcular semanas disponibles
    const queryMes = this.createDocQuery();
    if (mesNumero) {
      queryMes.andWhere('(doc.mes = :mes OR (doc.mes IS NULL AND EXTRACT(MONTH FROM doc.fecha) = :mesNumero))', {
        mes,
        mesNumero,
      });
    } else {
      queryMes.andWhere('doc.mes = :mes', { mes });
    }

    const allDocsDelMes = await queryMes
      .andWhere('doc.unidad IN (:...placas)', { placas })
      .orderBy('doc.fecha', 'ASC')
      .addOrderBy('doc.id', 'ASC')
      .getMany();

    const semanasSet = new Set<string>();
    for (const d of allDocsDelMes) {
      if (d.semana) semanasSet.add(String(d.semana));
    }
    const semanasDisponibles = [...semanasSet].sort((a, b) => Number(a) - Number(b));

    // Filtrar por semana si se proporcion�
    const docs = semana
      ? allDocsDelMes.filter(d => String(d.semana) === String(semana))
      : allDocsDelMes;

    // Agrupar por placa
    const placaGroups = new Map<string, any[]>();
    for (const placa of placas) {
      placaGroups.set(placa, []);
    }
    for (const doc of docs) {
      const placa = (doc.unidad || '').trim();
      if (placaGroups.has(placa)) {
        placaGroups.get(placa)!.push(doc);
      }
    }

    // Construir bloques por placa
    const bloques: any[] = [];
    let totalGeneralTn = 0;
    let totalDolares = 0;
    let totalSoles = 0;

    for (const [placa, placaDocs] of placaGroups) {
      if (placaDocs.length === 0) continue;

      // Sub-agrupar por semana
      const semanasMap = new Map<string, any[]>();
      for (const doc of placaDocs) {
        const sem = this.resolveSemanaFromDoc(doc as any) || 'Sin semana';
        if (!semanasMap.has(sem)) semanasMap.set(sem, []);
        semanasMap.get(sem)!.push(doc);
      }

      const semanas: any[] = [];
      let placaTotalTn = 0;
      let placaDolares = 0;
      let placaSoles = 0;

      for (const [semana, semDocs] of semanasMap) {
        let semanaTn = 0;
        const viajes = semDocs.map(doc => {
          const tnRecibida = Number(doc.tn_recibida) || 0;
          const tnEnviado = Number(doc.tn_enviado) || 0;
          const precioUnit = Number(doc.precio_unitario) || 0;

          // Tarifa fija: Nukleo y Pay Metal cobran por servicio, no por tonelada
          const clienteUpper = (doc.cliente || '').toUpperCase();
          const esTarifaFija = clienteUpper.includes('NUKLEO') || clienteUpper.includes('PAY METAL');

          const bi = Math.round((esTarifaFija ? precioUnit : precioUnit * tnRecibida) * 100) / 100;
          const importeTotal = Math.round(bi * 1.18 * 100) / 100;
          const div = (doc.divisa || 'USD').toUpperCase();

          semanaTn += tnRecibida;

          if (div.includes('PEN') || div.includes('SOL')) {
            placaSoles += bi;
          } else {
            placaDolares += bi;
          }

          return {
            fecha: doc.fecha,
            grt: doc.grt || '',
            conductor: doc.transportista || '',
            placa: doc.unidad || '',
            peso: tnEnviado,
            pesoMina: tnRecibida,
            ticket: doc.ticket || '',
            grr: doc.grr || '',
            cliente: doc.cliente || '',
            recorrido: `${(doc.partida || '').split('-').pop()?.trim() || ''}-${(doc.llegada || '').split('-').pop()?.trim() || ''}`,
            material: doc.transportado || '',
            precio: precioUnit,
            divisa: div,
            bi,
            importeTotal,
          };
        });

        placaTotalTn += semanaTn;
        semanas.push({ semana, viajes, totalTn: semanaTn });
      }

      totalGeneralTn += placaTotalTn;
      totalDolares += placaDolares;
      totalSoles += placaSoles;

      bloques.push({
        placa,
        semanas,
        totalTn: placaTotalTn,
        totalDolares: placaDolares,
        totalSoles: placaSoles,
      });
    }

    return {
      empresa: empresa.nombre,
      mes,
      semana: semana || null,
      semanasDisponibles,
      bloques,
      totalesGenerales: {
        totalTn: totalGeneralTn,
        totalDolares,
        totalSoles,
      },
    };
  }

  /**
   * Reporte de gu�as emitidas para TODAS las empresas de transporte en un mes.
   */
  async getReporteGuiasTodas(mes: string, semana?: string): Promise<any> {
    const empresas = await this.empresaRepository.find({
      where: { estado: 'activo' },
      order: { id: 'ASC' },
    });

    if (empresas.length === 0) return { error: 'No hay empresas activas' };

    const allBloques: any[] = [];
    let totalGeneralTn = 0;
    let totalDolares = 0;
    let totalSoles = 0;
    const semanasGlobalSet = new Set<string>();

    for (const emp of empresas) {
      const result = await this.getReporteGuias(emp.nombre, mes, semana);
      if (result.error) continue;

      for (const s of (result.semanasDisponibles || [])) {
        semanasGlobalSet.add(String(s));
      }

      for (const bloque of result.bloques) {
        allBloques.push({ ...bloque, empresaNombre: emp.nombre });
      }

      totalGeneralTn += result.totalesGenerales?.totalTn || 0;
      totalDolares += result.totalesGenerales?.totalDolares || 0;
      totalSoles += result.totalesGenerales?.totalSoles || 0;
    }

    const semanasDisponibles = [...semanasGlobalSet].sort((a, b) => Number(a) - Number(b));

    return {
      empresa: 'Todas las empresas',
      mes,
      semana: semana || null,
      semanasDisponibles,
      bloques: allBloques,
      totalesGenerales: {
        totalTn: totalGeneralTn,
        totalDolares,
        totalSoles,
      },
    };
  }
}

