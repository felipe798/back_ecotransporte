import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/users.entity';
import { IsNotEmpty, IsOptional } from 'class-validator';
//import {LoadVendorEntity} from "../../vendors/load/entity/load-vendor.entity";

@Entity('user_address')
export class UserAddressEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({name: 'user', nullable: false, type: 'int'})
  @ManyToOne(() => UserEntity, (userEntity) => userEntity.id,
    {eager: true, onDelete: 'CASCADE'})
  @JoinColumn({ name: 'user' })
  @IsNotEmpty()
  user: UserEntity;

  @Column({ length: 100 })
  @IsNotEmpty()
  label: string;

  @Column({ length: 200 })
  @IsOptional()
  contactName: string;

  @Column({ length: 100 })
  @IsOptional()
  contactEmail: string;

  @Column({ length: 50 })
  @IsOptional()
  contactPhone: string;

  @Column({ length: 150 })
  @IsNotEmpty()
  address: string;

  @Column({ length: 200 })
  @IsNotEmpty()
  city: string;

  @Column({ length: 100 })
  @IsNotEmpty()
  state: string;

  @Column({ length: 15 })
  @IsNotEmpty()
  zipCode: string;

  @Column({ length: 200 })
  @IsNotEmpty()
  country: string;

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp',
  })
  createAt: Date;

  @CreateDateColumn({
    name: 'updateAt',
    type: 'timestamp',
  })
  updateAt: Date;
}
