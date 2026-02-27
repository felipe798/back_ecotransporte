import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { UserAddressEntity } from '../entities/user-address.entity';
import { UserAddressService } from '../service/user-address.service';
import {getByUserDto} from "../dto/getByUser.dto";

@Controller('user-address')
@ApiTags('User Addresses')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class UserAddressController {
  constructor(private readonly userAddressService: UserAddressService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las direcciones de usuario' })
  @ApiResponse({ status: 200, description: 'Éxito', type: [UserAddressEntity] })
  getAllUserAddresses(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<any>> {
    return this.userAddressService.getAllUserAddresses(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una dirección de usuario por su ID' })
  @ApiResponse({ status: 200, description: 'Éxito', type: UserAddressEntity })
  getUserAddressById(@Param('id') id: number) {
    return this.userAddressService.getUserAddressById(id);
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Obtener una dirección de usuario por su ID' })
  @ApiResponse({ status: 200, description: 'Éxito', type: UserAddressEntity })
  getUserAddressByUser(
    @Param('id') id: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<any>> {
    return this.userAddressService.getUserAddressByIdUser(id, query);
  }

  @Post()
  @ApiBody({
    type: UserAddressEntity,
    examples: {
      example1: {
        value: {
          user: 1,
          label: 'Home',
          contactName: 'John Doe',
          contactEmail: 'john.doe@example.com',
          contactPhone: '1234567890',
          address: '123 Main St',
          country: 'USA',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Crear una nueva dirección de usuario' })
  @ApiResponse({ status: 201, description: 'Creado', type: UserAddressEntity })
  createUserAddress(@Body() userAddress: UserAddressEntity) {
    return this.userAddressService.createUserAddress(userAddress);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una dirección de usuario existente' })
  @ApiBody({
    type: UserAddressEntity,
    examples: {
      example: {
        value: {
          user: 1,
          label: 'Home',
          contactName: 'John Doe',
          contactEmail: 'john.doe@example.com',
          contactPhone: '1234567890',
          address: '123 Main St',
          country: 'USA',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Éxito', type: UserAddressEntity })
  updateUserAddress(
    @Param('id') id: number,
    @Body() userAddress: UserAddressEntity,
  ) {
    return this.userAddressService.updateUserAddress(id, userAddress);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una dirección de usuario' })
  @ApiResponse({ status: 200, description: 'Éxito' })
  deleteUserAddress(@Param('id') id: number) {
    return this.userAddressService.deleteUserAddress(id);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    description: "Find User Address ByUser",
    operationId: `FindUserAddress ByUser`,
  })
  @Post('find-by-user')
  findByUser(@Body() filter: getByUserDto) {
    return this.userAddressService.findAllByUser(filter);
  }
}
