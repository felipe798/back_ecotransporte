import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert,
  AfterLoad,
  BeforeUpdate,
  OneToMany,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserAddressEntity } from '../../user-address/entities/user-address.entity';
import { RoleEntity } from '../../roles/entities/role.entity';
import { UserInformationEntity } from 'src/user-information/entities/user-information.entity';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Exclude } from 'class-transformer';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  @IsNotEmpty()
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @IsNotEmpty()
  password: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginDate: Date;

  @Column({ type: 'int', default: 0, nullable: true })
  @IsOptional()
  isVisible?: number;

  @Column({ type: 'int', default: 0, nullable: true })
  @IsOptional()
  isActive?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tokenRefreshPassword?: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiryDate?: Date;

  @Column({ name: 'role', type: 'int', nullable: false, default: 3 })
  @ManyToOne(() => RoleEntity, (roleEntity) => roleEntity.id, { eager: false })
  @JoinColumn({ name: 'role' })
  @IsNotEmpty()
  role: number;

  @OneToMany(() => UserAddressEntity, (userAddressEntity) => userAddressEntity.user)
  userAddress: UserAddressEntity[];

  @OneToOne(() => UserInformationEntity, (userInfo) => userInfo.user_id, {
    nullable: true,
    cascade: true,
  })
  userInformation: UserInformationEntity;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 8);
  }

  private tempPassword: string;

  @AfterLoad()
  loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  @BeforeUpdate()
  async encryptPassword() {
    if (this.tempPassword !== this.password) {
      this.password = await bcrypt.hash(this.password, 8);
    }
  }

  async comparePassword(attempt: string) {
    return bcrypt.compare(attempt, this.password);
  }

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Exclude()
  public createdAt: Date;
}
