import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RoleEntity } from "./entities/role.entity";
import {TypeOrmModule} from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([
    RoleEntity
  ])],
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule {}
