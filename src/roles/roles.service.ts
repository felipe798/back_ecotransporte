import {HttpStatus, Injectable} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleEntity } from "./entities/role.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";

@Injectable()
export class RolesService {

  constructor(
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>
  ) {
  }

  async create(createRoleDto: CreateRoleDto) {
    try {
      const currentRole = await this.roleRepository.find({where: {name: createRoleDto.name}});
      if (currentRole.length > 0) {
        throw new Error("Role '"+createRoleDto.name+"' already exists");
      }
      const role = this.roleRepository.create(createRoleDto);
      await this.roleRepository.save(role);
      return {
        status: HttpStatus.CREATED,
        data: role,
        message: "create_role_success",
        errors: null
      };
    } catch (error) {
      return {
        status: HttpStatus.BAD_REQUEST,
        data: null,
        message: 'create_role_error',
        errors: error.message
      };
    }
  }

  async findAll() {
    try {
      const roles = await Promise.all([this.roleRepository.find({order: {id: 'ASC'}})]);
      if (roles.length > 0) {
        return {
          status: HttpStatus.OK,
          data: roles[0],
          message: 'get_roles_success',
          errors: null
        };
      } else {
        throw new Error("No roles found");
      }
    } catch (error) {
      return {
        status: HttpStatus.BAD_REQUEST,
        data: null,
        message: 'get_roles_error',
        errors: error.message
      };
    }
  }

  async findOne(id: number) {
    try {
      const role = await this.roleRepository.findOne(
        {where: {id: id}}
      );
      if (role) {
        return {
          status: HttpStatus.OK,
          data: role,
          message: 'get_role_success',
          errors: null
        };
      } else {
        throw new Error("Role not found");
      }
    } catch (error) {
      return {
        status: HttpStatus.BAD_REQUEST,
        data: null,
        message: 'get_role_error',
        errors: error.errors
      };
    }
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    try {
      const currentRole = await this.roleRepository.findOne({where: {id: id}});
      if (!currentRole) { throw new Error("Role not found"); }
      if (currentRole.id == 1 || currentRole.id == 2) { throw new Error("Cannot update the default role "+currentRole.name); }
      const role = await this.roleRepository.update(id, updateRoleDto);
      return {
        status: HttpStatus.OK,
        data: role,
        message: 'update_role_success',
        errors: null
      };
    } catch (error) {
      return {
        status: HttpStatus.BAD_REQUEST,
        data: null,
        message: error.message,
        errors: error.errors
      };
    }
  }

  async remove(id: number) {
    try {
      const currentRole = await this.roleRepository.findOne({where: {id: id}});
      if (!currentRole) { throw new Error("Role not found"); }
      if (currentRole.id == 1 || currentRole.id == 2) { throw new Error("Cannot delete the default role "+currentRole.name); }

      //No Funciona Adecuadamente
      //Se debe poder eliminar roles que ya tengan usuarios asignados
      //Para roles con usuarios asignados se deben pasar estos usuarios a rol User.
      //Para que sirve este pedazo de codigo?
      const usersRole = currentRole.users ? currentRole.users : [];
      if (usersRole.length > 0) {
        throw new Error("Cannot delete role with users");
      }

      const role = await this.roleRepository.delete(id);
      return {
        status: HttpStatus.OK,
        data: role,
        message: 'delete_role_success',
        errors: null
      };

    } catch (error) {
      return {
        status: HttpStatus.BAD_REQUEST,
        data: null,
        message: error.message,
        errors: error.errors
      };
    }
  }
}
