import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmpresaTransporteEntity } from '../entities/empresa-transporte.entity';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Injectable()
export class EmpresaTransporteService {
  constructor(
    @InjectRepository(EmpresaTransporteEntity)
    private empresaRepository: Repository<EmpresaTransporteEntity>,
    @InjectRepository(DocumentEntity)
    private documentsRepository: Repository<DocumentEntity>,
  ) {}

  async findAll(): Promise<EmpresaTransporteEntity[]> {
    return await this.empresaRepository.find({
      relations: ['unidades'],
      order: { nombre: 'ASC' },
    });
  }

  async findById(id: number): Promise<EmpresaTransporteEntity | null> {
    return await this.empresaRepository.findOne({
      where: { id },
      relations: ['unidades'],
    });
  }

  async findByNombre(nombre: string): Promise<EmpresaTransporteEntity | null> {
    return await this.empresaRepository.findOne({
      where: { nombre },
    });
  }

  async create(data: Partial<EmpresaTransporteEntity>): Promise<EmpresaTransporteEntity> {
    const empresa = this.empresaRepository.create(data);
    return await this.empresaRepository.save(empresa);
  }

  async update(id: number, data: Partial<EmpresaTransporteEntity>): Promise<EmpresaTransporteEntity | null> {
    // Si se está cambiando el nombre, propagar a todos los documentos
    if (data.nombre) {
      const oldEmpresa = await this.findById(id);
      if (oldEmpresa && oldEmpresa.nombre !== data.nombre) {
        await this.documentsRepository
          .createQueryBuilder()
          .update(DocumentEntity)
          .set({ empresa: data.nombre })
          .where('empresa = :oldNombre', { oldNombre: oldEmpresa.nombre })
          .execute();
        console.log(`Cascada: empresa "${oldEmpresa.nombre}" → "${data.nombre}" actualizada en documentos`);
      }
    }

    await this.empresaRepository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.empresaRepository.delete(id);
    return result.affected > 0;
  }

  async getActivas(): Promise<EmpresaTransporteEntity[]> {
    return await this.empresaRepository.find({
      where: { estado: 'activo' },
      order: { nombre: 'ASC' },
    });
  }

  async getDadasDeBaja(): Promise<EmpresaTransporteEntity[]> {
    return await this.empresaRepository.find({
      where: { estado: 'dado_de_baja' },
      order: { nombre: 'ASC' },
    });
  }
}
