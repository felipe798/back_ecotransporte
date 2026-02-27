import { Injectable } from '@nestjs/common';
import { FindManyOptions } from 'typeorm';

@Injectable()
export class PaginationHelper {
  paginate<T>(
    query: FindManyOptions<T>,
    page: number,
    limit: number,
  ): FindManyOptions<T> {
    const skip = (page - 1) * limit;
    const take = limit;

    return {
      ...query,
      skip,
      take,
    };
  }
}
