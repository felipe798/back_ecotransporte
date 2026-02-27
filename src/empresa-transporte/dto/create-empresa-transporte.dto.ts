import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmpresaTransporteDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  ruc?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}
