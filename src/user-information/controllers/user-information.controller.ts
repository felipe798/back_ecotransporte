import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Query,
  Req,
} from '@nestjs/common';
import { UserInformationEntity } from '../entities/user-information.entity';
import { UserInformationService } from '../service/user-information.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { BlacklistInterceptor } from 'src/auth/blackllist.interceptor';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { PaginationDto } from '../dto/pagination.dto';

@Controller('user-information')
@ApiTags('User Information')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class UserInformationController {
  constructor(
    private readonly userInformationService: UserInformationService, // private readonly paginationHelper: PaginationHelper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all user information' })
  @ApiQuery({ type: PaginationDto }) // Add a query parameter to Swagger documentation
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<any>> {
    return this.userInformationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user information by ID' })
  findOne(@Param('id') id: string): Promise<UserInformationEntity> {
    return this.userInformationService.findOne(Number(id));
  }

  @Get(':id/:idUser')
  @ApiOperation({ summary: 'Get user information by ID' })
  findOneByUser(
    @Param('id') id: string,
    @Param('user_id') user_id: string,
    @Req() req,
  ): Promise<UserInformationEntity> {
    return this.userInformationService.findOneByUser(
      Number(id),
      Number(user_id),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create user information' })
  @ApiBody({
    type: UserInformationEntity,
    examples: {
      example1: {
        value: {
          idUser: 1,
          name: 'John Doe',
          abbreviation: 'JD',
          contactName: 'Jane Smith',
          contactEmail: 'jane@example.com',
          contactPhone: '123-456-7890',
          origin: 'Web',
          mainAddress: 1,
          idTerm: 1,
          idSalesExecutive: 1,
        },
        summary: 'Ejemplo de creación de información de usuario',
      },
    },
  })
  create(
    @Body() userInformation: UserInformationEntity,
  ): Promise<UserInformationEntity> {
    return this.userInformationService.create(userInformation);
  }

  @Put('/update/:id')
  @ApiOperation({ summary: 'Update user information by ID' })
  @ApiBody({
    type: UserInformationEntity,
    examples: {
      example1: {
        value: {
          user_id: 1,
          name: 'John Doe',
          abbreviation: 'JD',
          contactName: 'Jane Smith',
          contactEmail: 'jane@example.com',
          contactPhone: '123-456-7890',
          origin: 'Web',
          mainAddress: 1,
          idTerm: 1,
          idSalesExecutive: 1,
        },
        summary: 'Ejemplo de creación de información de usuario',
      },
    },
  })
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() userInformation: UserInformationEntity,
  ): Promise<UserInformationEntity> {
    return this.userInformationService.update(Number(id), userInformation);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information by ID' })
  @ApiBody({
    type: UserInformationEntity,
    examples: {
      example1: {
        value: {
          userName: 'John Doe',
          userAbbreviation: 'JD',
          mainAddress: 1,
          contactName: 'Jane Smith',
          contactEmail: 'jane@example.com',
          contactPhone: '123-456-7890',
        },
        summary: 'Ejemplo de creación de información de usuario',
      },
    },
  })
  @UseGuards(AuthGuard)
  @UseInterceptors(BlacklistInterceptor)
  @ApiBearerAuth()
  updateByUser(@Param('id') id: string, @Body() userInformation: Partial<Omit<UserInformationEntity, 'id' | 'user_id'>>): Promise<UserInformationEntity> {
    return this.userInformationService.updateByUser(Number(id), userInformation);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user information by ID' })
  remove(@Param('id') id: string): Promise<void> {
    return this.userInformationService.remove(Number(id));
  }
}
