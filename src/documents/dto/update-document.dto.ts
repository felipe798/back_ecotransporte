import { IsOptional, IsString, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  mes?: string;

  @IsOptional()
  @IsString()
  semana?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha?: Date;

  @IsOptional()
  @IsString()
  grt?: string;

  @IsOptional()
  @IsString()
  transportista?: string;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsString()
  empresa?: string;

  @IsOptional()
  @IsNumber()
  tn_enviado?: number;

  @IsOptional()
  @IsString()
  deposito?: string;

  @IsOptional()
  @IsNumber()
  tn_recibida?: number;

  @IsOptional()
  @IsNumber()
  tn_recibida_data_cruda?: number;

  @IsOptional()
  @IsString()
  ticket?: string;

  @IsOptional()
  @IsString()
  factura?: string;

  @IsOptional()
  anulado?: boolean;

  @IsOptional()
  @IsString()
  grr?: string;

  @IsOptional()
  @IsString()
  cliente?: string;

  @IsOptional()
  @IsString()
  partida?: string;

  @IsOptional()
  @IsString()
  llegada?: string;

  @IsOptional()
  @IsString()
  transportado?: string;

  @IsOptional()
  @IsNumber()
  precio_unitario?: number;

  @IsOptional()
  @IsString()
  divisa?: string;

  @IsOptional()
  @IsNumber()
  precio_final?: number;

  @IsOptional()
  @IsNumber()
  pcosto?: number;

  @IsOptional()
  @IsString()
  divisa_cost?: string;

  @IsOptional()
  @IsNumber()
  costo_final?: number;

  @IsOptional()
  @IsNumber()
  margen_operativo?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentos?: string[];
}
