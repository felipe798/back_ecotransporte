import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('client_tariff')
export class ClientTariffEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  cliente: string;

  @Column({ length: 255 })
  partida: string;

  @Column({ length: 255 })
  llegada: string;

  @Column({ length: 255 })
  material: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  precioVentaSinIgv: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  precioVentaConIgv: number;

  @Column({ length: 50 })
  moneda: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  precioCostoSinIgv: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  precioCostoConIgv: number;

  @Column({ length: 50 })
  divisa: string;
}
