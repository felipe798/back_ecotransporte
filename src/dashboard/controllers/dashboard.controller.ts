import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardFilters } from '../services/dashboard.service';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Obtiene valores para los segmentadores (filtros)
   */
  @Get('segmentadores')
  async getSegmentadores() {
    return await this.dashboardService.getSegmentadores();
  }

  /**
   * Segmentadores filtrados en cascada
   */
  @Get('segmentadores-filtrados')
  async getSegmentadoresFiltrados(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getSegmentadoresFiltrados(filters);
  }

  /**
   * Lista de guías por verificar
   */
  @Get('guias-por-verificar-list')
  async getGuiasPorVerificarList(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getGuiasPorVerificarList(filters);
  }

  /**
   * Guías por verificar (tn_recibida_data_cruda NULL o 0)
   */
  @Get('guias-por-verificar')
  async getGuiasPorVerificar(@Query() filters: DashboardFilters) {
    const count = await this.dashboardService.getGuiasPorVerificar(filters);
    return { count };
  }

  /**
   * Conteo de guías por verificar
   */
  @Get('guias-por-verificar-count')
  async getGuiasPorVerificarCount(@Query() filters: DashboardFilters) {
    const count = await this.dashboardService.getGuiasPorVerificar(filters);
    return { count };
  }

  /**
   * Conteo de tickets no recepcionados (guías sin ticket)
   */
  @Get('tickets-no-recepcionados')
  async getTicketsNoRecepcionados(@Query() filters: DashboardFilters) {
    const count = await this.dashboardService.getTicketsNoRecepcionados(filters);
    return { count };
  }

  /**
   * Lista de tickets no recepcionados
   */
  @Get('tickets-no-recepcionados-list')
  async getTicketsNoRecepcionadosList(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTicketsNoRecepcionadosList(filters);
  }

  /**
   * Control de peso
   */
  @Get('control-peso')
  async getControlPeso(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getControlPeso(filters);
  }

  /**
   * TN Enviado por semana
   */
  @Get('tn-enviado-semana')
  async getTnEnviadoPorSemana(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnEnviadoPorSemana(filters);
  }

  /**
   * TN Recibido por semana
   */
  @Get('tn-recibido-semana')
  async getTnRecibidoPorSemana(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnRecibidoPorSemana(filters);
  }

  /**
   * TN por tipo de concentrado (enviado)
   */
  @Get('tn-concentrado-enviado')
  async getTnPorConcentradoEnviado(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnPorConcentradoEnviado(filters);
  }

  /**
   * TN por tipo de concentrado (recibido)
   */
  @Get('tn-concentrado-recibido')
  async getTnPorConcentradoRecibido(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnPorConcentradoRecibido(filters);
  }

  /**
   * TN por unidad
   */
  @Get('tn-por-unidad')
  async getTnPorUnidad(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnPorUnidad(filters);
  }

  /**
   * TN por unidad por mes
   */
  @Get('tn-por-unidad-mes')
  async getTnPorUnidadMes(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnPorUnidadMes(filters);
  }

  /**
   * TN por cliente
   */
  @Get('tn-por-cliente')
  async getTnPorCliente(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnPorCliente(filters);
  }

  /**
   * Traslados (total de documentos)
   */
  @Get('traslados')
  async getTraslados(@Query() filters: DashboardFilters) {
    const count = await this.dashboardService.getTotalTraslados(filters);
    return { count };
  }

  /**
   * Traslados por unidad
   */
  @Get('traslados-por-unidad')
  async getTrasladosPorUnidad(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTrasladosPorUnidad(filters);
  }

  /**
   * Viajes (combinación única fecha + cliente)
   */
  @Get('viajes')
  async getViajes(@Query() filters: DashboardFilters) {
    const count = await this.dashboardService.getViajes(filters);
    return { count };
  }

  /**
   * Detalle de transportista
   */
  @Get('detalle-transportista')
  async getDetalleTransportista(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getDetalleTransportista(filters);
  }

  /**
   * Tonelaje enviado general (sin filtros)
   */
  @Get('tonelaje-enviado-general')
  async getTonelajeEnviadoGeneral() {
    const total = await this.dashboardService.getTonelajeEnviadoGeneral();
    return { total };
  }

  /**
   * Tonelaje enviado filtrado
   */
  @Get('tonelaje-enviado-filtrado')
  async getTonelajeEnviadoFiltrado(@Query() filters: DashboardFilters) {
    const total = await this.dashboardService.getTonelajeEnviadoFiltrado(filters);
    return { total };
  }

  /**
   * Tabla pivot TN Recibidas
   */
  @Get('tabla-pivot-tn-recibidas')
  async getTablaPivotTnRecibidas(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTablaPivotTnRecibidas(filters);
  }

  /**
   * Resumen completo del dashboard (para cargar todo de una vez)
   */
  @Get('resumen')
  async getResumen(@Query() filters: DashboardFilters) {
    const [
      segmentadores,
      controlPeso,
      traslados,
      tonelajeFiltrado,
      tnRecibidaFiltrado,
      tnEnviadoPorSemana,
      tnRecibidoPorSemana,
    ] = await Promise.all([
      this.dashboardService.getSegmentadores(),
      this.dashboardService.getControlPeso(filters),
      this.dashboardService.getTotalTraslados(filters),
      this.dashboardService.getTonelajeEnviadoFiltrado(filters),
      this.dashboardService.getTonelajeRecibidoFiltrado(filters),
      this.dashboardService.getTnEnviadoPorSemana(filters),
      this.dashboardService.getTnRecibidoPorSemana(filters),
    ]);

    return {
      segmentadores,
      indicadores: {
        traslados,
        tonelajeFiltrado,
        tnRecibidaFiltrado,
      },
      controlPeso,
      tnEnviadoPorSemana,
      tnRecibidoPorSemana,
    };
  }

  // =====================================================
  // NUEVOS ENDPOINTS FINANCIEROS Y DE SEGUIMIENTO
  // =====================================================

  /**
   * Por Cobrar: Cliente → Empresa → Divisa
   */
  @Get('por-cobrar')
  async getPorCobrar(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getPorCobrar(filters);
  }

  /**
   * Por Pagar: Cliente → Empresa → Divisa
   */
  @Get('por-pagar')
  async getPorPagar(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getPorPagar(filters);
  }

  /**
   * Margen Operativo: Cliente → Empresa → Divisa
   */
  @Get('margen-operativo')
  async getMargenOperativo(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getMargenOperativo(filters);
  }

  /**
   * TN Enviado por Cliente y Empresa
   */
  @Get('tn-cliente-empresa')
  async getTnEnviadoClienteEmpresa(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getTnEnviadoClienteEmpresa(filters);
  }

  /**
   * Seguimiento de Transporte: TN por Semana
   */
  @Get('seguimiento-transporte')
  async getSeguimientoTransporte(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getSeguimientoTransporte(filters);
  }

  /**
   * Resumen Financiero por Divisa
   */
  @Get('resumen-financiero')
  async getResumenFinanciero(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getResumenFinanciero(filters);
  }

  /**
   * Lista de empresas de transporte
   */
  @Get('empresas-transporte')
  async getEmpresasTransporte() {
    return await this.dashboardService.getEmpresasTransporte();
  }

  // =====================================================
  // VIAJES POR CLIENTE
  // =====================================================

  /**
   * Días con viajes según cliente y/o placa
   */
  @Get('dias-con-viajes')
  async getDiasConViajes(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getDiasConViajes(filters);
  }

  /**
   * Viajes por placa (para gráfico de barras)
   */
  @Get('viajes-por-placa')
  async getViajesPorPlaca(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getViajesPorPlaca(filters);
  }

  /**
   * Resumen de viajes por cliente
   */
  @Get('resumen-viajes-cliente')
  async getResumenViajesCliente(@Query() filters: DashboardFilters) {
    return await this.dashboardService.getResumenViajesCliente(filters);
  }
}
