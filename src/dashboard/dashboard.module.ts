import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../documents/entities/document.entity';
import { UnidadEntity } from '../unidad/entities/unidad.entity';
import { EmpresaTransporteEntity } from '../empresa-transporte/entities/empresa-transporte.entity';
import { DashboardService } from './services/dashboard.service';
import { DashboardController } from './controllers/dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, UnidadEntity, EmpresaTransporteEntity]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
