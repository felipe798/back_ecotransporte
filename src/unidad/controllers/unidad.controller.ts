import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UnidadService } from '../services/unidad.service';
import { UnidadEntity } from '../entities/unidad.entity';
import { CreateUnidadDto } from '../dto/create-unidad.dto';
import { UpdateUnidadDto } from '../dto/update-unidad.dto';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('unidad')
@UseGuards(AuthGuard)
export class UnidadController {
  constructor(private readonly unidadService: UnidadService) {}

  @Get()
  async findAll(): Promise<UnidadEntity[]> {
    return await this.unidadService.findAll();
  }

  @Get('activas')
  async getActivas(): Promise<UnidadEntity[]> {
    return await this.unidadService.getActivas();
  }

  @Get('empresa/:empresaId')
  async findByEmpresa(@Param('empresaId') empresaId: number): Promise<UnidadEntity[]> {
    return await this.unidadService.findByEmpresa(empresaId);
  }

  @Get('placa/:placa')
  async findByPlaca(@Param('placa') placa: string): Promise<UnidadEntity | null> {
    return await this.unidadService.findByPlaca(placa);
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<UnidadEntity | null> {
    return await this.unidadService.findById(id);
  }

  @Post()
  async create(@Body() data: CreateUnidadDto): Promise<UnidadEntity> {
    const { empresa_id, ...rest } = data;
    return await this.unidadService.create({
      ...rest,
      ...(empresa_id != null && { empresaId: empresa_id }),
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() data: UpdateUnidadDto,
  ): Promise<UnidadEntity | null> {
    const { empresa_id, ...rest } = data;
    return await this.unidadService.update(id, {
      ...rest,
      ...(empresa_id !== undefined && { empresaId: empresa_id }),
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<{ success: boolean }> {
    const result = await this.unidadService.delete(id);
    return { success: result };
  }
}
