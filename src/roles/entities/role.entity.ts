import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import { UserEntity } from "src/user/entities/users.entity";
import { OneToMany } from "typeorm";
@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({length: 20, unique: true})
  name: string;
  @OneToMany(() => UserEntity, userEntity => userEntity.role)
  users: UserEntity[];
}
