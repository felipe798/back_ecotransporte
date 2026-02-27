import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PaginationDto {
  @ApiProperty({ default: 1, description: 'Page number' })
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({ default: 10, description: 'Number of items per page' })
  @IsInt()
  @Min(1)
  limit: number;

  @ApiProperty({ default: ' ', description: 'Search' })
  @IsOptional()
  @IsString()
  search: string;
}
