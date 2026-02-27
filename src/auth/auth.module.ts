import { Module } from '@nestjs/common';
import { AuthService } from './service/auth.service';
import { TokenService } from './service/token.service';
import { AuthController } from './controllers/auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/user/entities/users.entity';
import { UsersService } from '../user/services/users.service';
import { NodemailerService } from 'src/service/nodemailer.service';
import { UserInformationEntity } from '../user-information/entities/user-information.entity';
import { UserInformationService } from '../user-information/service/user-information.service';
import { UserInformationController } from '../user-information/controllers/user-information.controller';
import {UserAddressEntity} from "../user-address/entities/user-address.entity";
import {UserAddressService} from "../user-address/service/user-address.service";
import {UserAddressController} from "../user-address/controllers/user-address.controller";
import {UsersController} from "../user/controllers/users.controller";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserInformationEntity,UserAddressEntity])],
  providers: [
    AuthService,
    TokenService,
    UsersService,
    NodemailerService,
    UserInformationService,
    UserAddressService,
  ],
  controllers: [AuthController, UserInformationController,UserAddressController,UsersController],
})
export class AuthModule {}
