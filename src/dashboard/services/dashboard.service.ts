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
   * Construye la condición WHERE basada en los filtros
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

  /**
   * Helper: crea un QueryBuilder que siempre excluye documentos anulados
   */
  private createDocQuery(alias = 'doc') {
    return this.documentsRepository.createQueryBuilder(alias)
      .where(`${alias}.anulado = :anulado`, { anulado: false });
  }

  /**
   * Obtiene valores únicos para los segmentadores
   */
  async getSegmentadores(): Promise<any> {
    const meses = await this.createDocQuery()
      .select('DISTINCT doc.mes', 'mes')
      .andWhere('doc.mes IS NOT NULL')
      .orderBy('doc.mes')
      .getRawMany();

    const semanas = await this.createDocQuery()
      .select('DISTINCT doc.semana', 'semana')
      .andWhere('doc.semana IS NOT NULL')
      .orderBy('doc.semana')
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
      meses: meses.map(m => m.mes),
      semanas: semanas.map(s => s.semana),
      clientes: clientes.map(c => c.cliente),
      transportistas: transportistas.map(t => t.transportista),
      unidades: unidades.map(u => u.unidad),
      transportados: transportados.map(t => t.transportado),
    };
  }

  /**
   * Segmentadores filtrados en cascada:
   * Para cada dimensión devuelve solo las opciones disponibles
   * dada la combinación de los DEMÁS filtros seleccionados.
   */
  async getSegmentadoresFiltrados(filters: DashboardFilters): Promise<any> {
    const { mes, semana, cliente, transportista, unidad, transportado } = filters;

    const { divisa } = filters;

    const applyFilters = (qb: any, omit: string) => {
      if (mes && omit !== 'mes') qb.andWhere('doc.mes = :mes', { mes });
      if (semana && omit !== 'semana') qb.andWhere('doc.semana = :semana', { semana });
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
        applyFilters(this.createDocQuery().select('DISTINCT doc.mes', 'mes').andWhere('doc.mes IS NOT NULL').orderBy('doc.mes'), 'mes').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.semana', 'semana').andWhere('doc.semana IS NOT NULL').orderBy('doc.semana'), 'semana').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.cliente', 'cliente').andWhere('doc.cliente IS NOT NULL').orderBy('doc.cliente'), 'cliente').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.transportista', 'transportista').andWhere('doc.transportista IS NOT NULL').orderBy('doc.transportista'), 'transportista').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.unidad', 'unidad').andWhere('doc.unidad IS NOT NULL').orderBy('doc.unidad'), 'unidad').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.transportado', 'transportado').andWhere('doc.transportado IS NOT NULL').orderBy('doc.transportado'), 'transportado').getRawMany(),
        applyFilters(this.createDocQuery().select('DISTINCT doc.divisa', 'divisa').andWhere('doc.divisa IS NOT NULL').orderBy('doc.divisa'), 'divisa').getRawMany(),
      ]);

    return {
      meses: mesesRaw.map(m => m.mes),
      semanas: semanasRaw.map(s => s.semana),
      clientes: clientesRaw.map(c => c.cliente),
      transportistas: transportistasRaw.map(t => t.transportista),
      unidades: unidadesRaw.map(u => u.unidad),
      transportados: transportadosRaw.map(t => t.transportado),
      divisas: divisasRaw.map(d => d.divisa),
    };
  }

  /**
   * Lista de guías por verificar (tn_recibida = tn_enviado)
   */
  async getGuiasPorVerificarList(filters?: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .andWhere('doc.tn_recibida = doc.tn_enviado');

    if (filters?.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters?.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters?.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters?.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters?.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters?.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder.orderBy(`CAST(SUBSTRING(doc.grt FROM '([0-9]+)$') AS INTEGER)`, 'ASC').addOrderBy('doc.grt', 'ASC').limit(50).getMany();
  }

  /**
   * Guías por verificar (tn_recibida = tn_enviado)
   */
  async getGuiasPorVerificar(filters?: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(*)', 'count')
      .andWhere('doc.tn_recibida = doc.tn_enviado');
    
    if (filters?.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
   * Tickets no recepcionados (solo ticket vacío/null, sin importar peso)
   */
  async getTicketsNoRecepcionados(filters?: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(*)', 'count')
      .andWhere('(doc.ticket IS NULL OR doc.ticket = :empty OR doc.ticket = :dash)',
        { empty: '', dash: '-' });
    
    if (filters?.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
   * Lista de tickets no recepcionados (solo ticket vacío/null)
   */
  async getTicketsNoRecepcionadosList(filters?: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .andWhere('(doc.ticket IS NULL OR doc.ticket = :empty OR doc.ticket = :dash)',
        { empty: '', dash: '-' });
    
    if (filters?.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
   * Control de peso: TN Enviado total, TN Recibido total, Variación
   */
  async getControlPeso(filters: DashboardFilters): Promise<any> {
    const queryBuilder = this.createDocQuery()
      .select('SUM(doc.tn_enviado)', 'tn_enviado_total')
      .addSelect('SUM(doc.tn_recibida)', 'tn_recibida_total')
      .andWhere('1=1');

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
    const queryBuilder = this.createDocQuery()
      .select('doc.semana', 'semana')
      .addSelect('doc.mes', 'mes')
      .addSelect('SUM(doc.tn_enviado)', 'total')
      .andWhere('doc.semana IS NOT NULL');

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.semana')
      .addGroupBy('doc.mes')
      .orderBy('doc.mes')
      .addOrderBy('doc.semana')
      .getRawMany();
  }

  /**
   * TN Recibido por semana
   */
  async getTnRecibidoPorSemana(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.semana', 'semana')
      .addSelect('doc.mes', 'mes')
      .addSelect('SUM(doc.tn_recibida)', 'total')
      .andWhere('doc.semana IS NOT NULL')
      .andWhere('doc.tn_recibida IS NOT NULL');

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.semana')
      .addGroupBy('doc.mes')
      .orderBy('doc.mes')
      .addOrderBy('doc.semana')
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

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
      .addSelect('SUM(doc.tn_recibida)', 'total')
      .andWhere('doc.transportado IS NOT NULL')
      .andWhere('doc.tn_recibida IS NOT NULL');

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
   * TN Enviadas por unidad (placa) - simplificado para chart
   */
  async getTnPorUnidad(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.unidad', 'placa')
      .addSelect('SUM(doc.tn_recibida)', 'total')
      .andWhere('doc.unidad IS NOT NULL');

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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

    if (filters?.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
   * Viajes: combinación única de fecha + cliente
   * Un viaje = todos los traslados del mismo día para el mismo cliente
   * Excluye documentos con transportista = 'DADO DE BAJA'
   */
  async getViajes(filters: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(DISTINCT CONCAT(doc.fecha, doc.cliente))', 'viajes')
      .andWhere('doc.fecha IS NOT NULL')
      .andWhere('doc.cliente IS NOT NULL')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
      .addSelect('COUNT(*)', 'cantidad_traslados')
      .addSelect('SUM(doc.tn_enviado)', 'tn_enviado')
      .addSelect('SUM(doc.tn_recibida)', 'tn_recibido')
      .addSelect('SUM(doc.tn_recibida) - SUM(doc.tn_enviado)', 'variacion')
      .addSelect('SUM(doc.costo_final)', 'costo_total')
      .andWhere('doc.transportista IS NOT NULL');

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

    return await queryBuilder
      .groupBy('doc.transportista')
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

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
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
   * Por Cobrar: Agrupado por Cliente → Empresa → Divisa
   * Suma de precio_final
   */
  async getPorCobrar(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .leftJoin('unidad', 'u', 'u.placa = doc.unidad')
      .leftJoin('empresa_transporte', 'et', 'et.id = u.empresa_id')
      .select('doc.cliente', 'cliente')
      .addSelect('COALESCE(et.nombre, \'SIN EMPRESA\')', 'empresa')
      .addSelect('COALESCE(doc.divisa, \'PEN\')', 'divisa')
      .addSelect('SUM(doc.precio_final)', 'total')
      .andWhere('doc.precio_final IS NOT NULL')
      .andWhere('doc.precio_final > 0');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy('et.nombre')
      .addGroupBy('doc.divisa')
      .orderBy('doc.cliente')
      .addOrderBy('et.nombre')
      .getRawMany();
  }

  /**
   * Por Pagar: Agrupado por Cliente → Empresa → Divisa
   * Suma de costo_final
   */
  async getPorPagar(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .leftJoin('unidad', 'u', 'u.placa = doc.unidad')
      .leftJoin('empresa_transporte', 'et', 'et.id = u.empresa_id')
      .select('doc.cliente', 'cliente')
      .addSelect('COALESCE(et.nombre, \'SIN EMPRESA\')', 'empresa')
      .addSelect('COALESCE(doc.divisa_cost, \'PEN\')', 'divisa')
      .addSelect('SUM(doc.costo_final)', 'total')
      .andWhere('doc.costo_final IS NOT NULL')
      .andWhere('doc.costo_final > 0');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa_cost = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy('et.nombre')
      .addGroupBy('doc.divisa_cost')
      .orderBy('doc.cliente')
      .addOrderBy('et.nombre')
      .getRawMany();
  }

  /**
   * Margen Operativo: Agrupado por Cliente → Empresa → Divisa
   * Suma de (precio_final - costo_final)
   */
  async getMargenOperativo(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .leftJoin('unidad', 'u', 'u.placa = doc.unidad')
      .leftJoin('empresa_transporte', 'et', 'et.id = u.empresa_id')
      .select('doc.cliente', 'cliente')
      .addSelect('COALESCE(et.nombre, \'SIN EMPRESA\')', 'empresa')
      .addSelect('COALESCE(doc.divisa, \'PEN\')', 'divisa')
      .addSelect('SUM(CASE WHEN et.nombre = \'ECOTRANSPORTE\' THEN COALESCE(doc.precio_final, 0) ELSE COALESCE(doc.precio_final, 0) - COALESCE(doc.costo_final, 0) END)', 'total')
      .andWhere('1=1');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy('et.nombre')
      .addGroupBy('doc.divisa')
      .orderBy('doc.cliente')
      .addOrderBy('et.nombre')
      .getRawMany();
  }

  /**
   * TN Enviado por Cliente y Empresa
   * Agrupado por Cliente → Empresa
   */
  async getTnEnviadoClienteEmpresa(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .leftJoin('unidad', 'u', 'u.placa = doc.unidad')
      .leftJoin('empresa_transporte', 'et', 'et.id = u.empresa_id')
      .select('doc.cliente', 'cliente')
      .addSelect('COALESCE(et.nombre, \'SIN EMPRESA\')', 'empresa')
      .addSelect('SUM(doc.tn_recibida)', 'total')
      .andWhere('doc.tn_recibida IS NOT NULL');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });
    if (filters.divisa) queryBuilder.andWhere('doc.divisa = :divisa', { divisa: filters.divisa });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy('et.nombre')
      .orderBy('doc.cliente')
      .addOrderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * Seguimiento de Transporte: TN Enviado por Semana
   * Agrupado por Cliente → Empresa → Unidad → Semana
   */
  async getSeguimientoTransporte(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .leftJoin('unidad', 'u', 'u.placa = doc.unidad')
      .leftJoin('empresa_transporte', 'et', 'et.id = u.empresa_id')
      .select('doc.cliente', 'cliente')
      .addSelect('COALESCE(et.nombre, \'SIN EMPRESA\')', 'empresa')
      .addSelect('doc.unidad', 'placa')
      .addSelect('doc.semana', 'semana')
      .addSelect('SUM(doc.tn_enviado)', 'tn_enviado')
      .andWhere('doc.semana IS NOT NULL')
      .andWhere('doc.unidad IS NOT NULL');

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });

    return await queryBuilder
      .groupBy('doc.cliente')
      .addGroupBy('et.nombre')
      .addGroupBy('doc.unidad')
      .addGroupBy('doc.semana')
      .orderBy('doc.cliente')
      .addOrderBy('et.nombre')
      .addOrderBy('doc.unidad')
      .addOrderBy('doc.semana')
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
    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });

    return await queryBuilder
      .groupBy('doc.divisa')
      .getRawMany();
  }

  // =====================================================
  // VIAJES POR CLIENTE
  // =====================================================

  /**
   * Obtener días con viajes según cliente y/o placa
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
   * Viajes por placa para un cliente (gráfico de barras)
   * Viaje = combinación única fecha + cliente
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

    return await queryBuilder
      .groupBy('doc.unidad')
      .orderBy('viajes', 'DESC')
      .getRawMany();
  }

  /**
   * Resumen de viajes por cliente
   */
  async getResumenViajesCliente(filters: DashboardFilters): Promise<any> {
    // Total de viajes (combinaciones únicas fecha + cliente)
    const viajesQuery = this.createDocQuery()
      .select('COUNT(DISTINCT CONCAT(doc.fecha, doc.cliente))', 'viajes')
      .andWhere('doc.fecha IS NOT NULL')
      .andWhere('doc.cliente IS NOT NULL')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.cliente) viajesQuery.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) viajesQuery.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

    // Total de traslados
    const trasladosQuery = this.createDocQuery()
      .select('COUNT(*)', 'traslados')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.cliente) trasladosQuery.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) trasladosQuery.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

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
   * Definición de las 7 filas fijas (agrupaciones predefinidas de tarifas).
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
        label: 'Polimetálicos',
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
        label: 'ECO-GOLD-Mineral Polimetálico',
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
        label: 'MONARCA (Nepeña-Impala)',
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
   * Tablas Detalladas: Venta, Costo y Margen agrupados por cliente → material y empresa
   */
  async getTablasDetalladas(mes: string): Promise<any> {
    // 1. Obtener todos los documentos no anulados del mes
    const docs = await this.createDocQuery()
      .andWhere('doc.mes = :mes', { mes })
      .getMany();

    // 2. Resolver empresa por placa
    const allUnidades = await this.unidadRepository.find();
    const allEmpresas = await this.empresaRepository.find({ where: { estado: 'activo' }, order: { id: 'ASC' } });

    const empresaIdToNombre = new Map<number, string>();
    for (const emp of allEmpresas) {
      empresaIdToNombre.set(emp.id, emp.nombre);
    }

    const unidadIdToEmpresa = new Map<number, string>();
    const placaToEmpresa = new Map<string, string>();
    for (const u of allUnidades) {
      const empNombre = empresaIdToNombre.get(u.empresaId) || '';
      if (empNombre) {
        unidadIdToEmpresa.set(u.id, empNombre);
        placaToEmpresa.set(u.placa.toUpperCase().trim(), empNombre);
      }
    }

    const getDocEmpresa = (doc: any): string => {
      if (doc.unidadId && unidadIdToEmpresa.has(doc.unidadId)) {
        return unidadIdToEmpresa.get(doc.unidadId);
      }
      const placa = (doc.unidad || '').toUpperCase().trim();
      if (placa && placaToEmpresa.has(placa)) {
        return placaToEmpresa.get(placa);
      }
      return '';
    };

    // 3. Empresas con actividad en el mes
    const empresasConActividad = [...new Set(docs.map(d => getDocEmpresa(d).toUpperCase().trim()).filter(e => e))];
    const empresasColumna = allEmpresas
      .filter(emp => empresasConActividad.includes(emp.nombre.toUpperCase().trim()))
      .map(emp => emp.nombre);

    // 4. Agrupar documentos por cliente → material (transportado)
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

    // Ordenar clientes alfabéticamente
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

          // Si la empresa del documento es ECOTRANSPORTE, el costo es 0 (empresa propia)
          const docEmpresaName = getDocEmpresa(doc);
          const esEcotransporte = docEmpresaName.toUpperCase().trim().includes('ECOTRANSPORTE');
          const costoEfectivo = esEcotransporte ? 0 : pcosto * tnRecibida;

          data.general.tne += tnRecibida;
          data.general.importeVenta += precioUnit * tnRecibida;
          data.general.importeCosto += costoEfectivo;

          for (const emp of empresasColumna) {
            if (emp.toUpperCase().trim() === docEmpresaName.toUpperCase().trim()) {
              data[emp].tne += tnRecibida;
              data[emp].importeVenta += precioUnit * tnRecibida;
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
      empresas: empresasColumna,
      grupos,
      totales,
      margen,
    };
  }

  // =====================================================
  // REPORTE DE GUÍAS EMITIDAS POR EMPRESA DE TRANSPORTE
  // =====================================================

  /**
   * Opciones para el reporte de guías: empresas disponibles y meses
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
   * Reporte detallado de guías emitidas para una empresa de transporte en un mes.
   * Agrupa por placa (unidad) y sub-agrupa por semana.
   */
  async getReporteGuias(empresaNombre: string, mes: string): Promise<any> {
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

    // Obtener documentos del mes para esas placas
    const qb = this.createDocQuery()
      .andWhere('doc.mes = :mes', { mes })
      .andWhere('doc.unidad IN (:...placas)', { placas })
      .orderBy('doc.fecha', 'ASC')
      .addOrderBy('doc.id', 'ASC');

    const docs = await qb.getMany();

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
        const sem = doc.semana || 'Sin semana';
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
          const bi = precioUnit * tnRecibida;
          const importeTotal = bi * 1.18;
          const div = (doc.divisa || 'USD').toUpperCase();

          semanaTn += tnRecibida;

          if (div.includes('PEN') || div.includes('SOL')) {
            placaSoles += importeTotal;
          } else {
            placaDolares += importeTotal;
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
      bloques,
      totalesGenerales: {
        totalTn: totalGeneralTn,
        totalDolares,
        totalSoles,
      },
    };
  }
}
