import { IsNotEmpty, IsOptional, IsString, IsInt, MaxLength } from 'class-validator';

export class CreateUnidadDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  placa: string;

  @IsOptional()
  @IsInt()
  empresa_id?: number;

  @IsOptional()
  @IsString()
  estado?: string;
}
