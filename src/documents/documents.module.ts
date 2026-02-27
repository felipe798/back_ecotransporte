import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './entities/document.entity';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';
import { AiModule } from '../ai/ai.module';
import { ClientTariffModule } from '../client-tariff/client-tariff.module';
import { UnidadModule } from '../unidad/unidad.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    AiModule,
    ClientTariffModule,
    UnidadModule,
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
