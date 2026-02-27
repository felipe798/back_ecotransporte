import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, HttpStatus, Ip, Post, Query, Request, Session, UnauthorizedException, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { BlacklistInterceptor } from '../blackllist.interceptor';
import { LoginRequest, LoginResponse } from '../dto/login.dto';
import { JWT } from '../interface/jwt.interface';
import { AuthService } from '../service/auth.service';
import { authRequestResetPassordRequest, authRequestResetPasswordResponse, authResetPassordRequest, authResetPasswordResponse } from '../dto/password.dto';
import { NodemailerService } from 'src/service/nodemailer.service';
import { v4 as uuidv4 } from 'uuid';
import { SignupRequest, SignupResponse } from '../dto/signup.dto';
import { UserEntity } from 'src/user/entities/users.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private nodemailerService: NodemailerService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK, type: LoginResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiOperation({
    description: 'Validate credentials.',
    operationId: `Login`,
  })
  @ApiBody({
    type: UserEntity,
    examples: {
      example1: {
        value: {
          email: 'jalban@acyde.com',
          password: 'abc123',
        },
      },
    },
  })
  @ApiTags('Auth')
  async login(@Ip() userIp, @Body() credentials: LoginRequest): Promise<LoginResponse> {
    const loginResult: LoginResponse = await this.authService.login(credentials, userIp);
    return loginResult;
  }

  @Post('signup')
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK, type: SignupResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiOperation({
    description: 'Crear un nuevo usuario.',
    operationId: `Signup`,
  })
  @ApiTags('Auth')
  async signup(@Body() user: SignupRequest): Promise<SignupResponse> {
    let userExists;
    try {
      userExists = await this.authService.getByEmail(user.email);
    } catch (e) {

    }
    if (userExists) {
      throw new HttpException('Email ya existe!.', HttpStatus.BAD_REQUEST);
    }
    await this.authService.signup(user.email, user.password,user.userName);
    return { success: true };
  }

  @Get('access_token')
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, type: LoginResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiQuery({ name: 'access_token', required: false })
  @ApiQuery({ name: 'refresh_token', required: false })
  @ApiOperation({
    operationId: 'AccessToken',
    description: 'Get a refresh token',
  })
  @ApiTags('Auth')
  async token(
    @Ip() userIp,
    @Query('access_token') accessToken?: string,
    @Query('refresh_token') refreshToken?: string,
  ): Promise<LoginResponse> {
    if (!accessToken && !refreshToken) {
      throw new HttpException('No token provided.', HttpStatus.BAD_REQUEST);
    }
    const refreshResult: LoginResponse = await this.authService.refresh(
      accessToken,
      refreshToken,
      userIp,
    );
    return refreshResult;
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiOperation({
    description: '',
    operationId: `Logout`,
  })
  @ApiTags('Auth')
  async logout(
    @Request() req,
    @Session() user: JWT,
    @Query('refresh_token') refreshToken: string,
  ): Promise<any> {
    const accessToken: string = req.headers.authorization.replace('Bearer ','');
    await this.authService.logout(user.id, accessToken, refreshToken);
    return { message: 'ok' };
  }

  @Post('resetPassword')
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiOperation({
    description: '',
    operationId: `resetPassword`,
  })
  @ApiTags('Auth')
  async resetPassword(
    @Request() req,
    @Body() body: authResetPassordRequest,
  ): Promise<authResetPasswordResponse> {
    const user = await this.authService.getByToken(body.token);
    await this.authService.updatePassword(user.id, body.password);
    return { success: true };
  }

  @Post('requestResetPassword')
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiOperation({
    description: '',
    operationId: `requestResetPassword`,
  })
  @ApiTags('Auth')
  async requestResetPassword(
    @Request() req,
    @Body() body: authRequestResetPassordRequest,
  ): Promise<authRequestResetPasswordResponse> {
    const user = await this.authService.getByEmail(body.email);
    const token: string = uuidv4().replace(/-/g, '');
    const dueDate: Date = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    await this.authService.registerTryResetPassword(user, token, dueDate);
    await this.nodemailerService.sendEmail(
      body.email,
      'Restablecimiento de contraseña',
      'reset_password',
      {
        ...user,
        url_reset_password: `http://localhost:3000/auth/resetPassword/${token}`,
      },
    );
    return { success: true };
  }
}
