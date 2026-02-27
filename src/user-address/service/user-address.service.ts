import { Injectable, NotFoundException } from '@nestjs/common';
import { UserAddressEntity } from '../entities/user-address.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import {getByUserDto} from "../dto/getByUser.dto";

@Injectable()
export class UserAddressService {
  constructor(
    @InjectRepository(UserAddressEntity)
    private readonly userAddresses: Repository<UserAddressEntity>, // private userAddresses: UserAddressEntity[] = [];
  ) {}

  async getAllUserAddresses(query: PaginateQuery): Promise<Paginated<any>> {
    return paginate(query, this.userAddresses, {
      sortableColumns: [
        'id',
        'user',
        'label',
        'contactName',
        'contactEmail',
        'contactPhone',
        'address',
        'country',
        'city',
        'state',
        'zipCode',
      ],
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: [
        'id',
        'user',
        'label',
        'contactName',
        'contactEmail',
        'contactPhone',
        'address',
        'country',
        'city',
        'state',
        'zipCode',
      ],
      filterableColumns: {
        user: [FilterOperator.EQ],
        label: [FilterOperator.ILIKE],
        contactName: [FilterOperator.ILIKE],
        contactEmail: [FilterOperator.ILIKE],
        contactPhone: [FilterOperator.ILIKE],
        address: [FilterOperator.ILIKE],
        country: [FilterOperator.ILIKE],
        city: [FilterOperator.ILIKE],
        state: [FilterOperator.ILIKE],
        zipCode: [FilterOperator.EQ],
        id: true,
      },
    });
  }

  // async getAllUserAddresses(): Promise<UserAddressEntity[]> {
  //   return this.userAddresses.find();
  // }

  async getUserAddressById(id: any): Promise<UserAddressEntity> {
    try {
      const response = await this.userAddresses.findOne({ where: { id } });
      if (!response) {
        throw new NotFoundException('Response not found');
      }
      return response;
    } catch (e) {
      throw new NotFoundException('Problem with API');
    }
  }

  async getUserAddressByIdUser(
    id: any,
    query: PaginateQuery,
  ): Promise<Paginated<any>> {
    return paginate(query, this.userAddresses, {
      sortableColumns: [
        'id',
        'user',
        'label',
        'contactName',
        'contactEmail',
        'contactPhone',
        'address',
        'country',
        'city',
        'state',
        'zipCode',
      ],
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: [
        'id',
        'user',
        'label',
        'contactName',
        'contactEmail',
        'contactPhone',
        'address',
        'country',
        'city',
        'state',
        'zipCode',
      ],
      filterableColumns: {
        user: [FilterOperator.EQ],
        label: [FilterOperator.ILIKE],
        contactName: [FilterOperator.ILIKE],
        contactEmail: [FilterOperator.ILIKE],
        contactPhone: [FilterOperator.ILIKE],
        address: [FilterOperator.ILIKE],
        country: [FilterOperator.ILIKE],
        city: [FilterOperator.ILIKE],
        state: [FilterOperator.ILIKE],
        zipCode: [FilterOperator.EQ],
        id: true,
      },
      where: [{ user: id }],
    });
  }

  createUserAddress(data: Partial<UserAddressEntity>): Promise<UserAddressEntity> {
    const response = this.userAddresses.create(data);
    return this.userAddresses.save(response);
  }

  async updateUserAddress(
    id: any,
    updatedUserAddress: Partial<UserAddressEntity>,
  ): Promise<UserAddressEntity> {
    const response = await this.userAddresses.findOne({ where: { id } });
    if (!response) {
      throw new Error('response not found');
    }
    Object.assign(response, updatedUserAddress);
    return this.userAddresses.save(response);
  }

  async deleteUserAddress(id: any): Promise<any> {
    const deleteResult: any = await this.userAddresses.delete(id);
    if (deleteResult.affected === 0) {
      throw new NotFoundException('Entity not found');
    }
    return { message: 'Deleted successfully' };
  }

  async findAllByUser(filter: getByUserDto) {
    return await this.userAddresses.createQueryBuilder("user_address")
      .where("user_address.user = :id", { id: filter.id_user })
      .getMany();
  }
}
