import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientTariffService } from '../services/client-tariff.service';
import { CreateClientTariffDto } from '../dto/create-client-tariff.dto';
import { UpdateClientTariffDto } from '../dto/update-client-tariff.dto';

@Controller('client-tariff')
export class ClientTariffController {
  constructor(private readonly clientTariffService: ClientTariffService) {}

  @Post()
  create(@Body() createDto: CreateClientTariffDto) {
    return this.clientTariffService.create(createDto);
  }

  @Post('bulk')
  createBulk(@Body() createDtos: CreateClientTariffDto[]) {
    return this.clientTariffService.createBulk(createDtos);
  }

  @Post('seed')
  async seedData() {
    // Primero limpiar datos existentes
    await this.clientTariffService.removeAll();
    
    // Insertar datos de prueba
    const seedData = [
      { cliente: 'PALTARUMI SAC', partida: 'LA LIBERTAD-TRUJILLO-HUANCHACO', llegada: 'LIMA-BARRANCA-PARAMONGA', material: 'MINERAL AURIFERO', precioVentaSinIgv: 21, moneda: 'dólar', precioCostoSinIgv: 19, divisa: 'dólar' },
      { cliente: 'ECO GOLD SAC', partida: 'LIMA-BARRANCA-PARAMONGA', llegada: 'CALLAO-CALLAO-VENTANILLA', material: 'CONCENTRADO DE AU', precioVentaSinIgv: 23, moneda: 'dólar', precioCostoSinIgv: 21, divisa: 'dólar' },
      { cliente: 'ECO GOLD SAC', partida: 'LA LIBERTAD-TRUJILLO-HUANCHACO', llegada: 'CALLAO-CALLAO-VENTANILLA', material: 'CONCENTRADO DE PLATA A GRANEL', precioVentaSinIgv: 44, moneda: 'dólar', precioCostoSinIgv: 40, divisa: 'dólar' },
      { cliente: 'ECO GOLD SAC', partida: 'LA LIBERTAD-TRUJILLO-HUANCHACO', llegada: 'LIMA-BARRANCA-PARAMONGA', material: 'MINERAL AURIFERO', precioVentaSinIgv: 21, moneda: 'dólar', precioCostoSinIgv: 19, divisa: 'dólar' },
      { cliente: 'ECO GOLD SAC', partida: 'ANCASH-HUARMEY-HUARMEY', llegada: 'LIMA-BARRANCA-PARAMONGA', material: 'MINERAL POLIMETALICO', precioVentaSinIgv: 3, moneda: 'dólar', precioCostoSinIgv: 2, divisa: 'dólar' },
      { cliente: 'POLIMETALICOS DEL NORTE SAC', partida: 'LA LIBERTAD-GRAN CHIMU-LUCMA', llegada: 'LA LIBERTAD-TRUJILLO-HUANCHACO', material: 'CONCENTRADO DE PLATA A GRANEL', precioVentaSinIgv: 31, moneda: 'dólar', precioCostoSinIgv: 28, divisa: 'dólar' },
      { cliente: 'MONARCA GOLD SAC', partida: 'ANCASH-SANTA-NEPEÑA', llegada: 'CALLAO-CALLAO-CALLAO (IMPALA)', material: 'CONCENTRADO DE ZN', precioVentaSinIgv: 33, moneda: 'dólar', precioCostoSinIgv: 27, divisa: 'dólar' },
      { cliente: 'MONARCA GOLD SAC', partida: 'LA LIBERTAD-TRUJILLO-HUANCHACO', llegada: 'ANCASH-SANTA-NEPEÑA', material: 'MINERAL POLIMETALICO', precioVentaSinIgv: 50.847457, moneda: 'soles', precioCostoSinIgv: 35, divisa: 'soles' },
      { cliente: 'ANDES MINERAL S.A.C.', partida: 'MATUCANA', llegada: 'ALTAGRACIA', material: 'MINERAL EN BRUTO', precioVentaSinIgv: 66.94915254, moneda: 'soles', precioCostoSinIgv: 50, divisa: 'soles' },
      { cliente: 'PARKANO RESOURCES S.A.C.', partida: 'CHIMBOTE', llegada: 'CALLAO-CALLAO-CALLAO (IMPALA)', material: 'CONCENTRADO DE PLOMO', precioVentaSinIgv: 110, moneda: 'soles', precioCostoSinIgv: 90, divisa: 'soles' },
      { cliente: 'GRUPO MINERA KATA DEL SUR S.A.C.', partida: 'MATUCANA', llegada: 'ALTAGRACIA', material: 'MINERAL EN BRUTO', precioVentaSinIgv: 66.94915254, moneda: 'soles', precioCostoSinIgv: 50, divisa: 'soles' },
      { cliente: 'NUKLEO PERU SAC', partida: 'LIMA-LIMA-PUENTE PIEDRA', llegada: 'CALLAO-CALLAO-CALLAO', material: '', precioVentaSinIgv: 99, moneda: 'soles', precioCostoSinIgv: 98, divisa: 'soles' },
    ];

    const result = await this.clientTariffService.createBulk(seedData as any);
    return { message: 'Datos insertados correctamente', count: result.length };
  }

  @Get()
  findAll() {
    return this.clientTariffService.findAll();
  }

  @Get('search')
  findByRoute(
    @Query('cliente') cliente: string,
    @Query('partida') partida: string,
    @Query('llegada') llegada: string,
  ) {
    return this.clientTariffService.findByRoute(partida, llegada, cliente);
  }

  @Get('cliente/:cliente')
  findByCliente(@Param('cliente') cliente: string) {
    return this.clientTariffService.findByCliente(cliente);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientTariffService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateClientTariffDto,
  ) {
    return this.clientTariffService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientTariffService.remove(id);
  }

  @Delete()
  removeAll() {
    return this.clientTariffService.removeAll();
  }
}
