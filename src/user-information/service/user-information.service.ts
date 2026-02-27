// user-information.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInformationEntity } from '../entities/user-information.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  FilterOperator,
  PaginateQuery,
  paginate,
  Paginated,
} from 'nestjs-paginate';

@Injectable()
export class UserInformationService {
  constructor(
    @InjectRepository(UserInformationEntity)
    private readonly userInformationRepository: Repository<UserInformationEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<any>> {
    return paginate(query, this.userInformationRepository, {
      sortableColumns: [
        'id',
        'userName',
        "userAbbreviation",
        'contactName',
        'contactEmail',
        'contactPhone',
        'mainAddress',
      ],
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: [
        'id',
        'userName',
        "userAbbreviation",
        'contactName',
        'contactEmail',
        'contactPhone',
        'mainAddress',
      ],
      filterableColumns: {
        userName: [FilterOperator.ILIKE],
        contactName: [FilterOperator.ILIKE],
        contactEmail: [FilterOperator.ILIKE],
        contactPhone: [FilterOperator.ILIKE],
        id: true,
      },
    });
  }

  findOne(id: any): Promise<UserInformationEntity> {
    return this.userInformationRepository.findOne({ where: { id } });
  }

  findOneByUser(id: any, user_id: any): Promise<UserInformationEntity> {
    return this.userInformationRepository.findOne({ where: { id, user_id } });
  }

  create(
    userInformation: UserInformationEntity,
  ): Promise<UserInformationEntity> {
    return this.userInformationRepository.save(userInformation);
  }

  async update(
    id: any,
    userInformation: UserInformationEntity,
  ): Promise<UserInformationEntity> {
    const response = await this.userInformationRepository.findOne({
      where: { id },
    });
    if (!response) {
      throw new Error('response not found');
    }
    let newObj: any = userInformation;
    delete newObj?.role;
    delete newObj?.isVisible;
    delete newObj?.isActive;
    Object.assign(response, newObj);
    return this.userInformationRepository.save(response);
  }
  async updateByUser(id: any, userInformation: Partial<Omit<UserInformationEntity, 'id' | 'user_id'>>): Promise<UserInformationEntity> {
    const response = await this.userInformationRepository.findOne({
      where: { id },
    });
    if (!response) {
      throw new Error('response not found');
    }
    Object.assign(response, userInformation);
    return this.userInformationRepository.save(response);
  }
  async updateByUserId(
    user_id: any,
    userInformation,
  ): Promise<UserInformationEntity> {
    const response = await this.userInformationRepository.findOne({
      where: { user_id },
    });
    if (!response) {
      throw new Error('response not found');
    }
    Object.assign(response, userInformation);
    return this.userInformationRepository.save(response);
  }

  async remove(id: number): Promise<any> {
    const deleteResult: any = await this.userInformationRepository.delete(id);
    if (deleteResult.affected === 0) {
      throw new NotFoundException('Entity not found');
    }
    return { message: 'Deleted successfully' };
  }
}
