import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddressEntity } from './entities/user-address.entity';
import { UserAddressService } from './service/user-address.service';
import { UserAddressController } from './controllers/user-address.controller';
import { UserEntity } from 'src/user/entities/users.entity';
import { UsersController } from 'src/user/controllers/users.controller';
import { UsersService } from 'src/user/services/users.service';
import { UserInformationEntity } from '../user-information/entities/user-information.entity';
import { UserInformationController } from '../user-information/controllers/user-information.controller';
import { UserInformationService } from '../user-information/service/user-information.service';
import {TokenService} from "../auth/service/token.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserAddressEntity, UserEntity, UserInformationEntity])],
  controllers: [UserAddressController, UsersController, UserInformationController],
  providers: [UserAddressService, UsersService, UserInformationService, TokenService],
})
export class UserAddressModule {}
