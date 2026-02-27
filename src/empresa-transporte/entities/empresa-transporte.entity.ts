import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UnidadEntity } from '../../unidad/entities/unidad.entity';

@Entity('empresa_transporte')
export class EmpresaTransporteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  ruc: string;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string; // activo, dado_de_baja

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => UnidadEntity, (unidad) => unidad.empresa)
  unidades: UnidadEntity[];
}
