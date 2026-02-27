import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Injectable, Param, Post, Put, Query, Req, Request, Res, Session, UnauthorizedException, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiParam, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { BlacklistInterceptor } from '../../auth/blackllist.interceptor';
import { Response } from 'express';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { UserEntity } from '../entities/users.entity';
import { UsersService } from '../services/users.service';
import { UserFilterRequest, ResetPassordRequest, ResetPasswordResponse, CreateUserDto, ProfileUserDto, ResetMyPasswordRequest } from '../dto/User.dto';
import {TokenService} from "../../auth/service/token.service";
import {Authorization} from "../../decorators/authorization.decorator";

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@Injectable()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({
    description: 'List Users Filter',
    operationId: `ListUsersFilter`,
  })
  @ApiParam({
    name: 'role',
    required: false,
    description: 'Integer',
    type: 'integer'
  })
  @ApiParam({
    name: 'isActive',
    required: false,
    description: 'Integer',
    type: 'integer'
  })
  @ApiParam({
    name: 'isVisible',
    required: false,
    description: 'Integer',
    type: 'integer'
  })
  @Authorization(true)
  async findAll(@Paginate() query: PaginateQuery, @Req() request): Promise<Paginated<any>> {
    const tokenString = request.headers.authorization;
    const responseValidationRole = await this.tokenService.roleValidation(tokenString, 1);
    if (responseValidationRole.status !== HttpStatus.OK) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: 'role_validation_error',
          data: null,
          errors: 'You do not have permission to perform this action.',
        },HttpStatus.FORBIDDEN,
      );
    }
    return await this.usersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Success', type: UserEntity })
  getUserById(@Param('id') id: number) {
    return this.usersService.getUserById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({
    type: CreateUserDto,
    schema: {
      example: {
        email: 'example@example.com',
        isVisible: 1,
        isActive: 1,
        role: 1,
        userName: 'exampleUsername',
        userAbbreviation: 'EU',
        contactName: 'John Doe',
        contactEmail: 'contact@example.com',
        contactPhone: '123456789',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Success', type: UserEntity })
  createUser(@Body() user: CreateUserDto) {
    return this.usersService.createUser(user);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({ summary: 'Update a user' })
  @ApiBody({
    type: UserEntity,
    examples: {
      example1: {
        value: {
          email: 'jane@example.com',
          role: 1,
          isVisible: 1,
          isActive: 1,
        },
        summary: 'Ejemplo de creación de información de usuario',
      },
    }
  })
  @ApiResponse({ status: 200, description: 'Success', type: UserEntity })
  async updateUserOption(@Param('id') id: number, @Body() user) {
    let newObj = {
      email: user.email,
      role: user.role,
      isVisible: user.isVisible,
      isActive: user.isActive,
    };
    return await this.usersService.updateUser(id, newObj);
  }

  @Post('profile')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a profile user' })
  @ApiResponse({ status: 200, description: 'Success', type: UserEntity })
  async updateProfileUserOption(@Req() request,@Body() user: ProfileUserDto)
  {
    const tokenString = request.headers.authorization;
    let bearerToken = '';
    if (tokenString.startsWith('Bearer ')) {
      const tokenArray = tokenString.split(' ');
      bearerToken = tokenArray[1];
    } else {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: 'token_decode_error',
          data: null,
          errors: 'You have not sent authorization in header.',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const userTokenInfo = await this.tokenService.decodeToken(bearerToken);
    return this.usersService.updateUserProfile(userTokenInfo.data.userinfo.id, user);
  }

  @Put('visibility/:id')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({ summary: 'Hide or Show a user' })
  @ApiBody({
    type: Number,
    schema: {
      example: {
        isVisible: 0,
        isActive: 0,
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Success', type: Number })
  async updateUserVisibility(@Param('id') id: number, @Body() data, @Req() request) {
    const tokenString = request.headers.authorization;
    const responseValidationRole = await this.tokenService.roleValidation(tokenString, 1);
    if (responseValidationRole.status !== HttpStatus.OK) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: 'role_validation_error',
          data: null,
          errors: 'You do not have permission to perform this action.',
        },HttpStatus.FORBIDDEN,
      );
    }
    let newObj = {
      isVisible: data.isVisible,
      isActive: data.isActive ? data.isActive : 0,
    };
    return await this.usersService.updateUserVisibility(id, newObj);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'Success' })
  async deleteUser(@Param('id') id: number) {
    return await this.usersService.deleteUser(id);
  }

  @Get('list-by-role/:role')
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiBearerAuth()
  @ApiOperation({
    description: "List Users Filter Role",
    operationId: `ListUsersFilterRole`,
  })
  async findList(
    @Param('role') role: number,
    @Res() res: Response
  ): Promise<any> {
    const users = await this.usersService.findAllList({
      role: role
    });
    return res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
      message: "List users successfully",
      data: {
        users: users
      },
      errors: null
    });
  }

  @Post('resetPassword')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiOperation({
    description: '',
    operationId: `resetPassword`,
  })
  async resetPassword(
    @Request() req,
    @Body() body: ResetPassordRequest,
  ): Promise<ResetPasswordResponse> {
    await this.usersService.updatePassword(body.id, body.password);
    return { success: true };
  }

  @Post('resetMyPassword')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: BadRequestException })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: UnauthorizedException })
  @ApiOperation({
    description: 'Reset password for the authenticated user',
    operationId: `resetMyPassword`,
  })
  async resetMyPassword(
    @Request() req,
    @Body() body: ResetMyPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const userId = req.session.id;
    await this.usersService.updatePassword(userId, body.password);
    return { success: true };
  }
}
