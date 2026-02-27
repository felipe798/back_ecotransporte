// user-information.entity.ts

import { Exclude } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { UserEntity } from 'src/user/entities/users.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';

@Entity('user_information')
export class UserInformationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity, (user) => user.userInformation, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user_id: UserEntity;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @IsNotEmpty()
  userName: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @IsNotEmpty()
  userAbbreviation: string;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  mainAddress: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  contactName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  contactEmail: string;
  
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  contactPhone: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Exclude()
  public createdAt: Date;
}
