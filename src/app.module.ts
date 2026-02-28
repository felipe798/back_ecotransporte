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



// compute flags before module metadata; functions can't be called inside array
const isProd = process.env.NODE_ENV === 'production';
// dropSchema is now completely disabled; schema changes should be handled
// via migrations or manual intervention. DB_RESET variable is deprecated.


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
      // add SSL settings required by managed Postgres providers like Neon
      ssl: process.env.PS_DBSSL === 'true' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      // synchronize what the entities describe into the database schema.
      // normally ON in development; in production we use migrations and set
      // TYPEORM_SYNC=true temporarily if absolutely needed.
      synchronize: process.env.TYPEORM_SYNC === 'true' || !isProd,
      // dropSchema has been disabled entirely to avoid accidental data loss.
      dropSchema: false,
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
