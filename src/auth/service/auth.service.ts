import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TokenService } from './token.service';
import { LoginRequest, LoginResponse } from '../dto/login.dto';
import { UsersService } from '../../user/services/users.service';
import { UserEntity } from '../../user/entities/users.entity';
import { JWT } from '../interface/jwt.interface';
import { RoleEntity } from '../../roles/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInformationEntity } from '../../user-information/entities/user-information.entity';
import { abbreviateField } from 'src/utils/utilities';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async signup(
    email: string,
    password: string,
    userName: string,
  ): Promise<UserEntity> {
    const user: UserEntity = new UserEntity();
    user.email = email;
    user.password = password;
    user.isActive = 1;
    const userInformation: UserInformationEntity = new UserInformationEntity();
    userInformation.userName = userName;
    userInformation.userAbbreviation = await abbreviateField(userName);
    user.userInformation = userInformation;
    await this.userRepository.save(user);
    return user;
  }

  async login(
    credentials: LoginRequest,
    ipAddress: any,
  ): Promise<LoginResponse> {
    console.log('=== LOGIN DEBUG ===');
    console.log('Email recibido:', credentials.email);
    console.log('Password recibido:', credentials.password);
    
    const user: UserEntity = await this.userRepository.findOne({
      where: { email: credentials.email },
    });
    
    console.log('Usuario encontrado:', user ? 'SÍ' : 'NO');
    if (user) {
      console.log('User ID:', user.id);
      console.log('User email:', user.email);
      console.log('User password (hash):', user.password);
      console.log('User isActive:', user.isActive);
      
      const passwordMatch = await user.comparePassword(credentials.password);
      console.log('Password coincide:', passwordMatch);
    }
    
    if (!user || !(await user.comparePassword(credentials.password))) {
      console.log('=== LOGIN FAILED ===');
      throw new HttpException(
        'This email, password combination was not found.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (user.isActive !== 1) {
      console.log('=== USER NOT ACTIVE ===');
      throw new HttpException('User not active.', HttpStatus.BAD_REQUEST);
    }
    console.log('=== LOGIN SUCCESS ===');
    // Generate token
    const accessToken: string = await this.tokenService.createAccessToken({
      ...user,
      password: undefined,
      lastLoginDate: undefined,
    });

    return {
      accessToken,
      refreshToken: null,
      email: user.email,
      role: user.role,
    };
  }

  async logout(
    userId: number,
    accessToken: string,
    refreshToken: string,
  ): Promise<any> {
    throw new HttpException(
      'Logout functionality is not available without refresh_token and blacklist tables.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  async refresh(
    accessToken: string,
    refreshToken: string,
    ipAddress: string,
  ): Promise<any> {
    throw new HttpException(
      'Refresh token functionality is not available without refresh_token table.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  async updatePassword(id: any, password: string): Promise<UserEntity> {
    //Pasar a Null token del usuario y la expiracion
    //Cambiar la clave
    const userUpdated = await this.usersService.updatePassword(id, password);
    return userUpdated;
  }

  async getByEmail(email: string): Promise<UserEntity> {
    const user = await this.usersService.getByEmail(email);
    return user;
  }

  async getByToken(token: string): Promise<UserEntity> {
    const user = await this.usersService.getByToken(token);
    return user;
  }

  async registerTryResetPassword(
    user: UserEntity,
    token: string,
    date: Date,
  ): Promise<UserEntity> {
    const userUpodated = await this.usersService.registerTryResetPassword(
      user,
      token,
      date,
    );
    return userUpodated;
  }
}
