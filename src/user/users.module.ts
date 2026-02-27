import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/users.entity';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { UserAddressEntity } from 'src/user-address/entities/user-address.entity';
import { UserInformationModule } from '../user-information/user-information.module';
import { UserInformationService } from '../user-information/service/user-information.service';
import { UserInformationController } from '../user-information/controllers/user-information.controller';
import { UserInformationEntity } from '../user-information/entities/user-information.entity';
import {TokenService} from "../auth/service/token.service";
import {AuthService} from "../auth/service/auth.service";
import {AuthController} from "../auth/controllers/auth.controller";
import {NodemailerService} from "../service/nodemailer.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserAddressEntity, UserInformationEntity]), UserInformationModule],
  providers: [UsersService, UserInformationService,TokenService,AuthService,NodemailerService],
  controllers: [UsersController, UserInformationController,AuthController],
})
export class UsersModule {}
