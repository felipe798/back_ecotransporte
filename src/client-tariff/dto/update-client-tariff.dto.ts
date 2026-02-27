import { PartialType } from '@nestjs/mapped-types';
import { CreateClientTariffDto } from './create-client-tariff.dto';

export class UpdateClientTariffDto extends PartialType(CreateClientTariffDto) {}
