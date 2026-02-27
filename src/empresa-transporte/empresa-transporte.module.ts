import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaTransporteEntity } from './entities/empresa-transporte.entity';
import { EmpresaTransporteService } from './services/empresa-transporte.service';
import { EmpresaTransporteController } from './controllers/empresa-transporte.controller';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmpresaTransporteEntity, DocumentEntity])],
  controllers: [EmpresaTransporteController],
  providers: [EmpresaTransporteService],
  exports: [EmpresaTransporteService],
})
export class EmpresaTransporteModule {}
