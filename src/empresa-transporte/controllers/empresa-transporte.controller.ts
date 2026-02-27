import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { EmpresaTransporteService } from '../services/empresa-transporte.service';
import { EmpresaTransporteEntity } from '../entities/empresa-transporte.entity';
import { CreateEmpresaTransporteDto } from '../dto/create-empresa-transporte.dto';
import { UpdateEmpresaTransporteDto } from '../dto/update-empresa-transporte.dto';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('empresa-transporte')
@UseGuards(AuthGuard)
export class EmpresaTransporteController {
  constructor(private readonly empresaService: EmpresaTransporteService) {}

  @Get()
  async findAll(): Promise<EmpresaTransporteEntity[]> {
    return await this.empresaService.findAll();
  }

  @Get('activas')
  async getActivas(): Promise<EmpresaTransporteEntity[]> {
    return await this.empresaService.getActivas();
  }

  @Get('dadas-de-baja')
  async getDadasDeBaja(): Promise<EmpresaTransporteEntity[]> {
    return await this.empresaService.getDadasDeBaja();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<EmpresaTransporteEntity | null> {
    return await this.empresaService.findById(id);
  }

  @Post()
  async create(@Body() data: CreateEmpresaTransporteDto): Promise<EmpresaTransporteEntity> {
    return await this.empresaService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() data: UpdateEmpresaTransporteDto,
  ): Promise<EmpresaTransporteEntity | null> {
    return await this.empresaService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<{ success: boolean }> {
    const result = await this.empresaService.delete(id);
    return { success: result };
  }
}
