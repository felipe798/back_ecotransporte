import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { EmpresaTransporteEntity } from '../../empresa-transporte/entities/empresa-transporte.entity';

@Entity('unidad')
export class UnidadEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  placa: string;

  @Column({ name: 'empresa_id' })
  empresaId: number;

  @ManyToOne(() => EmpresaTransporteEntity, (empresa) => empresa.unidades)
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaTransporteEntity;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string; // activo, dado_de_baja

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
