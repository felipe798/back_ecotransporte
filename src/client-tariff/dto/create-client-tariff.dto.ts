import { IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class CreateClientTariffDto {
  @IsNotEmpty()
  @IsString()
  cliente: string;

  @IsNotEmpty()
  @IsString()
  partida: string;

  @IsNotEmpty()
  @IsString()
  llegada: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsNumber()
  precioVentaSinIgv?: number;

  @IsOptional()
  @IsNumber()
  precioVentaConIgv?: number;

  @IsNotEmpty()
  @IsString()
  moneda: string;

  @IsOptional()
  @IsNumber()
  precioCostoSinIgv?: number;

  @IsOptional()
  @IsNumber()
  precioCostoConIgv?: number;

  @IsNotEmpty()
  @IsString()
  divisa: string;
}
