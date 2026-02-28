import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { UnidadEntity } from '../../unidad/entities/unidad.entity';
import { EmpresaTransporteEntity } from '../../empresa-transporte/entities/empresa-transporte.entity';

export interface DashboardFilters {
  mes?: string;
  semana?: string;
  cliente?: string;
  transportista?: string;
  unidad?: string;
  transportado?: string;
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
   * Lista de guías por verificar (tn_recibida = tn_enviado Y sin documentos adjuntos)
   */
  async getGuiasPorVerificarList(filters?: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .andWhere('doc.tn_recibida = doc.tn_enviado')
      .andWhere('(doc.documentos IS NULL OR array_length(doc.documentos, 1) IS NULL)');

    if (filters?.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters?.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters?.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters?.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters?.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });
    if (filters?.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder.orderBy('doc.fecha', 'DESC').limit(50).getMany();
  }

  /**
   * Guías por verificar (tn_recibida = tn_enviado Y sin documentos adjuntos)
   */
  async getGuiasPorVerificar(filters?: DashboardFilters): Promise<number> {
    const queryBuilder = this.createDocQuery()
      .select('COUNT(*)', 'count')
      .andWhere('doc.tn_recibida = doc.tn_enviado')
      .andWhere('(doc.documentos IS NULL OR array_length(doc.documentos, 1) IS NULL)');
    
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
      .addSelect('SUM(doc.tn_enviado)', 'total')
      .andWhere('doc.unidad IS NOT NULL');

    if (filters.mes) queryBuilder.andWhere('doc.mes = :mes', { mes: filters.mes });
    if (filters.semana) queryBuilder.andWhere('doc.semana = :semana', { semana: filters.semana });
    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.transportista) queryBuilder.andWhere('doc.transportista = :transportista', { transportista: filters.transportista });
    if (filters.transportado) queryBuilder.andWhere('doc.transportado = :transportado', { transportado: filters.transportado });

    return await queryBuilder
      .groupBy('doc.unidad')
      .orderBy('total', 'DESC')
      .limit(15)
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
      .limit(10)
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

    return await queryBuilder
      .groupBy('doc.unidad')
      .orderBy('cantidad', 'DESC')
      .limit(15)
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
      .addSelect('SUM(COALESCE(doc.precio_final, 0) - COALESCE(doc.costo_final, 0))', 'total')
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
    const queryBuilder = this.createDocQuery()
      .select('doc.fecha', 'fecha')
      .addSelect('COUNT(*)', 'traslados')
      .addSelect('SUM(doc.tn_recibida)', 'tonelaje_recibido')
      .andWhere('doc.fecha IS NOT NULL')
      .andWhere('(doc.transportista IS NULL OR doc.transportista != :dadoDeBaja)', { dadoDeBaja: 'DADO DE BAJA' });

    if (filters.cliente) queryBuilder.andWhere('doc.cliente = :cliente', { cliente: filters.cliente });
    if (filters.unidad) queryBuilder.andWhere('doc.unidad = :unidad', { unidad: filters.unidad });

    return await queryBuilder
      .groupBy('doc.fecha')
      .orderBy('doc.fecha', 'DESC')
      .getRawMany();
  }

  /**
   * Viajes por placa para un cliente (gráfico de barras)
   * Viaje = combinación única fecha + cliente
   * Excluye transportista = 'DADO DE BAJA'
   */
  async getViajesPorPlaca(filters: DashboardFilters): Promise<any[]> {
    const queryBuilder = this.createDocQuery()
      .select('doc.unidad', 'placa')
      .addSelect('COUNT(DISTINCT doc.fecha)', 'viajes')
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
}
