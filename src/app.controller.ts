import { Controller, Get, Post, UseGuards, Req, Session, UseInterceptors } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "./auth/auth.guard";
import { JWT } from "./auth/interface/jwt.interface";
import { BlacklistInterceptor } from "./auth/blackllist.interceptor";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user/entities/users.entity";
import { RoleEntity } from "./roles/entities/role.entity";
import * as bcrypt from 'bcryptjs';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private roleRepo: Repository<RoleEntity>,
  ) {}

  // ENDPOINT TEMPORAL - ELIMINAR DESPUÉS DE CREAR DATOS
  @Post('seed')
  @ApiOperation({ summary: 'Seed initial data - DELETE AFTER USE' })
  async seedData(): Promise<any> {
    try {
      // Crear roles si no existen
      const roles = [
        { id: 1, name: 'Administrator' },
        { id: 2, name: 'User' },
        { id: 3, name: 'Manager' },
      ];
      
      for (const r of roles) {
        const exists = await this.roleRepo.findOne({ where: { id: r.id } });
        if (!exists) {
          await this.roleRepo.save(r);
        }
      }

      // Eliminar usuario existente para recrearlo correctamente
      const adminEmail = 'jalban@acyde.com';
      await this.userRepo.delete({ email: adminEmail });
      
      // Crear usuario - NO hashear aquí, la entidad lo hace con @BeforeInsert
      const user = this.userRepo.create({
        email: adminEmail,
        password: 'abc123',  // Texto plano - @BeforeInsert lo hashea
        role: 1,
        isActive: 1,
        isVisible: 1,
      });
      await this.userRepo.save(user);
      
      return {
        success: true,
        message: 'Datos sembrados correctamente',
        user: { email: adminEmail, password: 'abc123' }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get()
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Hello World",
    description: "Test verification JWT.",
    operationId: `Hello World`,
  })
  getHello(@Session() session: JWT): any{
    return {
      "message": this.appService.getHello(),
      "session": session
    };
  }
}
  