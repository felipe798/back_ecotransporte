import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientTariffEntity } from '../entities/client-tariff.entity';
import { CreateClientTariffDto } from '../dto/create-client-tariff.dto';
import { UpdateClientTariffDto } from '../dto/update-client-tariff.dto';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Injectable()
export class ClientTariffService {
  constructor(
    @InjectRepository(ClientTariffEntity)
    private readonly clientTariffRepository: Repository<ClientTariffEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentsRepository: Repository<DocumentEntity>,
  ) {}

  async create(createDto: CreateClientTariffDto): Promise<ClientTariffEntity> {
    createDto.precioVentaConIgv = parseFloat(((createDto.precioVentaSinIgv || 0) * 1.18).toFixed(8));
    createDto.precioCostoConIgv = parseFloat(((createDto.precioCostoSinIgv || 0) * 1.18).toFixed(8));
    const tariff = this.clientTariffRepository.create(createDto);
    return await this.clientTariffRepository.save(tariff);
  }

  async createBulk(createDtos: CreateClientTariffDto[]): Promise<ClientTariffEntity[]> {
    createDtos.forEach(dto => {
      dto.precioVentaConIgv = parseFloat(((dto.precioVentaSinIgv || 0) * 1.18).toFixed(8));
      dto.precioCostoConIgv = parseFloat(((dto.precioCostoSinIgv || 0) * 1.18).toFixed(8));
    });
    const tariffs = this.clientTariffRepository.create(createDtos);
    return await this.clientTariffRepository.save(tariffs);
  }

  async findAll(): Promise<ClientTariffEntity[]> {
    return await this.clientTariffRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ClientTariffEntity> {
    const tariff = await this.clientTariffRepository.findOne({ where: { id } });
    if (!tariff) {
      throw new NotFoundException(`Tarifa con ID ${id} no encontrada`);
    }
    return tariff;
  }

  async findByRoute(partida: string, llegada: string, cliente: string): Promise<ClientTariffEntity | null> {
    return await this.clientTariffRepository.findOne({
      where: {
        cliente,
        partida,
        llegada,
      },
    });
  }

  /**
   * Búsqueda flexible: por cliente + partida (sin llegada)
   * Retorna todas las tarifas que coincidan
   */
  async findByClienteAndPartida(cliente: string, partida: string): Promise<ClientTariffEntity[]> {
    return await this.clientTariffRepository.find({
      where: {
        cliente,
        partida,
      },
    });
  }

  /**
   * Búsqueda flexible: por cliente + partida + material
   */
  async findByClientePartidaMaterial(cliente: string, partida: string, material: string): Promise<ClientTariffEntity | null> {
    return await this.clientTariffRepository.findOne({
      where: {
        cliente,
        partida,
        material,
      },
    });
  }

  async findByCliente(cliente: string): Promise<ClientTariffEntity[]> {
    return await this.clientTariffRepository.find({
      where: { cliente },
      order: { id: 'ASC' },
    });
  }

  async update(id: number, updateDto: UpdateClientTariffDto): Promise<ClientTariffEntity> {
    const tariff = await this.findOne(id);
    const oldValues = {
      cliente: tariff.cliente,
      partida: tariff.partida,
      llegada: tariff.llegada,
      material: tariff.material,
    };

    Object.assign(tariff, updateDto);
    tariff.precioVentaConIgv = parseFloat(((tariff.precioVentaSinIgv || 0) * 1.18).toFixed(8));
    tariff.precioCostoConIgv = parseFloat(((tariff.precioCostoSinIgv || 0) * 1.18).toFixed(8));
    const saved = await this.clientTariffRepository.save(tariff);

    // Propagar cambios a documentos
    if (updateDto.cliente && updateDto.cliente !== oldValues.cliente) {
      await this.documentsRepository
        .createQueryBuilder()
        .update(DocumentEntity)
        .set({ cliente: updateDto.cliente })
        .where('cliente = :old', { old: oldValues.cliente })
        .execute();
      console.log(`Cascada: cliente "${oldValues.cliente}" → "${updateDto.cliente}" actualizado en documentos`);
    }
    if (updateDto.partida && updateDto.partida !== oldValues.partida) {
      await this.documentsRepository
        .createQueryBuilder()
        .update(DocumentEntity)
        .set({ partida: updateDto.partida })
        .where('partida = :old', { old: oldValues.partida })
        .execute();
      console.log(`Cascada: partida "${oldValues.partida}" → "${updateDto.partida}" actualizada en documentos`);
    }
    if (updateDto.llegada && updateDto.llegada !== oldValues.llegada) {
      await this.documentsRepository
        .createQueryBuilder()
        .update(DocumentEntity)
        .set({ llegada: updateDto.llegada })
        .where('llegada = :old', { old: oldValues.llegada })
        .execute();
      console.log(`Cascada: llegada "${oldValues.llegada}" → "${updateDto.llegada}" actualizada en documentos`);
    }
    if (updateDto.material && updateDto.material !== oldValues.material) {
      await this.documentsRepository
        .createQueryBuilder()
        .update(DocumentEntity)
        .set({ transportado: updateDto.material })
        .where('transportado = :old', { old: oldValues.material })
        .execute();
      console.log(`Cascada: material "${oldValues.material}" → "${updateDto.material}" actualizado en documentos`);
    }

    return saved;
  }

  async remove(id: number): Promise<void> {
    const tariff = await this.findOne(id);
    await this.clientTariffRepository.remove(tariff);
  }

  async removeAll(): Promise<void> {
    await this.clientTariffRepository.clear();
  }

  /**
   * Obtiene todos los valores únicos de cliente, partida, llegada y material
   * para usar en normalización de datos
   */
  async getUniqueValues(): Promise<{
    clientes: string[];
    partidas: string[];
    llegadas: string[];
    materiales: string[];
  }> {
    const tariffs = await this.clientTariffRepository.find();
    
    const clientes = [...new Set(tariffs.map(t => t.cliente))];
    const partidas = [...new Set(tariffs.map(t => t.partida))];
    const llegadas = [...new Set(tariffs.map(t => t.llegada))];
    const materiales = [...new Set(tariffs.map(t => t.material).filter(m => m && m.trim() !== ''))];

    return { clientes, partidas, llegadas, materiales };
  }
}
