import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadEntity } from './entities/unidad.entity';
import { UnidadService } from './services/unidad.service';
import { UnidadController } from './controllers/unidad.controller';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UnidadEntity, DocumentEntity])],
  controllers: [UnidadController],
  providers: [UnidadService],
  exports: [UnidadService],
})
export class UnidadModule {}
