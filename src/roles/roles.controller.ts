import {Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpException, Res} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {Authorization} from "../decorators/authorization.decorator";
import { responseError, responseOk } from '../utils/helpers';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Authorization(true)
  @Post()
  async create(
    @Res() res,
    @Body() createRoleDto: CreateRoleDto
  ) {
    try {
      const response = await this.rolesService.create(createRoleDto);
      if (response.errors) {
        throw new HttpException(response, response.status);
      }
      return responseOk(res, response);
    } catch (error) {
      return responseError(res, error);
    }
  }

  @Authorization(true)
  @Get()
  async findAll(
    @Res() res
  ) {
    try {
      const response = await this.rolesService.findAll();
      if (response.errors) {
        throw new HttpException(response, response.status);
      }
      return responseOk(res, response);
    } catch (error) {
      return responseError(res, error);
    }
  }

  @Authorization(true)
  @Get(':id')
  async findOne(
    @Res() res,
    @Param('id') id: string) {
    try {
      const response = await this.rolesService.findOne(+id);
      if (response.errors) {
        throw new HttpException(response, response.status);
      }
      return responseOk(res, response);
    } catch (error) {
      return responseError(res, error);
    }
  }

  @Authorization(true)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(+id, updateRoleDto);
  }

  @Authorization(true)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.rolesService.remove(+id);
  }
}
