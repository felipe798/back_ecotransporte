import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UserAddressModule } from './user-address/user-address.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './user/users.module';
import { UserInformationModule } from './user-information/user-information.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { ClientTariffModule } from './client-tariff/client-tariff.module';
import { EmpresaTransporteModule } from './empresa-transporte/empresa-transporte.module';
import { UnidadModule } from './unidad/unidad.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthGuard } from './service/guards/authorization.guard';
import {APP_GUARD} from "@nestjs/core";
import {TokenService} from "./auth/service/token.service";
import { UserEntity } from './user/entities/users.entity';
import { RoleEntity } from './roles/entities/role.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'assets'),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PS_DBHOST,
      port: Number(process.env.PS_DBPORT),
      username: process.env.PS_DBUSERNAME,
      password: process.env.PS_DBPASSWORD,
      database: process.env.PS_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
    AuthModule,
    UserAddressModule,
    RolesModule,
    UsersModule,
    UserInformationModule,
    DocumentsModule,
    AiModule,
    ClientTariffModule,
    EmpresaTransporteModule,
    UnidadModule,
    DashboardModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TokenService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
