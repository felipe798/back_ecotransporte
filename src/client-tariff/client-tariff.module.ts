import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientTariffEntity } from './entities/client-tariff.entity';
import { ClientTariffService } from './services/client-tariff.service';
import { ClientTariffController } from './controllers/client-tariff.controller';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClientTariffEntity, DocumentEntity])],
  controllers: [ClientTariffController],
  providers: [ClientTariffService],
  exports: [ClientTariffService],
})
export class ClientTariffModule {}
