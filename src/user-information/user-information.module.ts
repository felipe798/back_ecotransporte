import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInformationService } from './service/user-information.service';
import { UserInformationController } from './controllers/user-information.controller';
import { UserInformationEntity } from './entities/user-information.entity';
import { UserEntity } from 'src/user/entities/users.entity';
import { UsersService } from 'src/user/services/users.service';
import { UsersController } from 'src/user/controllers/users.controller';
import { PaginationHelper } from 'src/utils/pagination.helper';
import {TokenService} from "../auth/service/token.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserInformationEntity, UserEntity])],
  providers: [UserInformationService, UsersService, PaginationHelper,TokenService],
  controllers: [UserInformationController, UsersController],
})
export class UserInformationModule {}
