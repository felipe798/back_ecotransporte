import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/users.entity';
import { UnidadEntity } from '../../unidad/entities/unidad.entity';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  uploaded_by: number;

  @ManyToOne(() => UserEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: UserEntity;

  // Campos de auditoría
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ nullable: true })
  updated_by: number;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: UserEntity;

  // Relación con Unidad (placa)
  @Column({ name: 'unidad_id', nullable: true })
  unidadId: number;

  @ManyToOne(() => UnidadEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'unidad_id' })
  unidadRelacion: UnidadEntity;

  @Column({ length: 500, nullable: true })
  pdf_file_path: string;

  @Column({ length: 255, nullable: true })
  pdf_original_name: string;

  // Campos extraídos del PDF
  @Column({ length: 50, nullable: true })
  mes: string;

  @Column({ length: 50, nullable: true })
  semana: string;

  @Column({ type: 'date', nullable: true })
  fecha: Date;

  @Column({ length: 100, nullable: true })
  grt: string;

  @Column({ length: 255, nullable: true })
  transportista: string;

  @Column({ length: 100, nullable: true })
  unidad: string;

  @Column({ length: 255, nullable: true })
  empresa: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tn_enviado: number;

  @Column({ length: 255, nullable: true })
  deposito: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tn_recibida: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tn_recibida_data_cruda: number;

  @Column({ length: 255, nullable: true })
  ticket: string;

  @Column({ length: 255, nullable: true })
  factura: string;

  @Column({ type: 'boolean', default: false })
  anulado: boolean;

  @Column({ length: 100, nullable: true })
  grr: string;

  @Column({ length: 255, nullable: true })
  cliente: string;

  @Column({ length: 255, nullable: true })
  partida: string;

  @Column({ length: 255, nullable: true })
  llegada: string;

  @Column({ length: 255, nullable: true })
  transportado: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precio_unitario: number;

  @Column({ length: 10, nullable: true })
  divisa: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precio_final: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pcosto: number;

  @Column({ length: 10, nullable: true })
  divisa_cost: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costo_final: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  margen_operativo: number;

  @Column('text', { array: true, nullable: true, name: 'documentos' })
  documentos: string[];
}
