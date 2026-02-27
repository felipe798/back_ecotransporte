import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/users.entity';
import { MoreThan, Repository } from 'typeorm';
import {HttpException, HttpStatus, Inject} from '@nestjs/common';
import { FilterOperator, PaginateQuery, Paginated, paginate } from 'nestjs-paginate';
import { OnEvent } from '@nestjs/event-emitter';
import { UserInformationEntity } from '../../user-information/entities/user-information.entity';
import { generateRandomPass } from '../../utils/utilities';
import { CreateUserDto } from '../dto/User.dto';
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(UserInformationEntity)
    private userInformationRepository: Repository<UserInformationEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<any>> {
    return paginate({ ...query }, this.userRepository, {
      sortableColumns: ['id', 'email', 'isVisible', 'isActive', 'role', 'userAddress', 'userInformation'],
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: ['id', 'email', 'isVisible', 'isActive', 'role', 'userAddress', 'userInformation'],
      filterableColumns: {
        email: [FilterOperator.ILIKE],
        isVisible: [FilterOperator.EQ],
        isActive: [FilterOperator.EQ],
        phone: [FilterOperator.ILIKE],
        role: [FilterOperator.EQ],
        userAddress: [FilterOperator.EQ],
        'userInformation.userName': [FilterOperator.ILIKE],
        'userInformation.userAbbreviation': [FilterOperator.ILIKE],
        'userInformation.contactName': [FilterOperator.ILIKE],
        'userInformation.contactEmail': [FilterOperator.ILIKE],
        'userInformation.contactPhone': [FilterOperator.ILIKE],
        id: true,
      },
      relations: ['userInformation', 'userAddress', 'role'],
    });
  }

  getAllUsers(): Promise<UserEntity[]> {
    return this.userRepository.find();
  }

  getUserById(id: any): Promise<UserEntity> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateUser(id: any, updatedUser: any): Promise<UserEntity> {
    const user: UserEntity = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new Error('User not found');
    }
    Object.assign(user, updatedUser);
    return this.userRepository.save(user);
  }

  async updateUserProfile(id: any, updatedUser: any): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userInformation'],
    });
    if (!user) {
      throw new Error('User not found');
    }
    const userSave = await this.userRepository.findOne({
      where: { id }
    });
    Object.assign(userSave, {
      email: updatedUser.email,
      password: updatedUser.password,
    });
    let userInformation: UserInformationEntity = await this.userInformationRepository.findOne({
      where: { id: user.userInformation.id, user_id: id },
    });
    if (!userInformation) {
      throw new Error('userInformation not found');
    }
    Object.assign(userInformation, {
      userName: updatedUser.userName,
      userAbbreviation: updatedUser.userAbbreviation,
      contactName: updatedUser.contactName,
      contactEmail: updatedUser.contactEmail,
      contactPhone: updatedUser.contactPhone,
    });
    await this.userInformationRepository.save(userInformation);
    return await this.userRepository.save(userSave);
  }



  async updateUserVisibility(id: any, data): Promise<any> {
    let user: UserEntity = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    user.isVisible = data.isActive;
    user.isActive = data.isActive;
    return this.userRepository.save(user);
  }

  async deleteUser(id: any): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    await this.userRepository.delete(id);
    return { message: 'Deleted successfully' };
  }

  async createUser(data: CreateUserDto): Promise<UserEntity> {
    const user: UserEntity = new UserEntity();
    user.email = data.email;
    user.password = data.password || await generateRandomPass();
    user.isVisible = data.isVisible ? 1 : 0;
    user.isActive = data.isActive ? 1 : 0;
    user.role = data.role;
    user.userInformation = new UserInformationEntity();
    user.userInformation.userName = data.userName;
    user.userInformation.userAbbreviation = data.userAbbreviation;
    user.userInformation.contactName = data.contactName;
    user.userInformation.contactEmail = data.contactEmail;
    user.userInformation.contactPhone = data.contactPhone;
    await this.userRepository.save(user);
    return user;
  }

  async get(id): Promise<UserEntity> {
    const user: UserEntity = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new HttpException('User not found.', HttpStatus.BAD_REQUEST);
    }
    return user;
  }

  async getByEmail(email: string): Promise<UserEntity> {
    const user: UserEntity = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new HttpException('User not found.', HttpStatus.BAD_REQUEST);
    }
    return user;
  }

  async getByToken(token: string): Promise<UserEntity> {
    const user: UserEntity = await this.userRepository.findOne({
      where: {
        tokenRefreshPassword: token,
        tokenExpiryDate: MoreThan(new Date()),
      },
    });
    if (!user) {
      throw new HttpException('Token expired!', HttpStatus.BAD_REQUEST);
    }
    return user;
  }

  async registerTryResetPassword(
    user: UserEntity,
    token: string,
    date: Date,
  ): Promise<UserEntity> {
    user.tokenExpiryDate = date;
    user.tokenRefreshPassword = token;
    await this.userRepository.save(user);
    return user;
  }

  async updatePassword(id: number, data: any): Promise<UserEntity> {
    let user: UserEntity = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('User not found');
    }

    user.password = data;
    await this.userRepository.save(user);
    return user;
  }

  async abbreviateField(fieldValue: string, spaceLettersLimit: number = 3): Promise<string> {
    const words = fieldValue.split(' ');

    if (words.length > 1) {
      // Si hay espacios, tomar las primeras letras hasta completar spaceLettersLimit
      const abbreviation = words.slice(0, spaceLettersLimit).map(word => word[0].toUpperCase()).join('');
      return abbreviation;
    } else {
      // Si es una sola palabra, tomar la primera, una al azar y la última
      const firstLetter = words[0][0].toUpperCase();
      const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Letra al azar
      const lastLetter = words[0][words[0].length - 1].toUpperCase();

      return firstLetter + randomLetter + lastLetter;
    }
  }

  @OnEvent('dataUpdated')
  handleDataUpdated(data: any) {

  }
  async findAllList(filter:any): Promise<UserEntity[]> {
    const options = {
      select: {"id":true, "email":true, "phone":true,  "isActive":true, "isVisible":true},
      defaultSortBy: [['id', 'DESC']],
      relations: ['role', 'userInformation'],
      where: {
        isVisible: 1
      }
    };
    if(filter) {
      if(filter.role) {
        options.where['role'] = filter.role;
      }
      if(filter.isActive) {
        options.where['isActive'] = filter.isActive;
      }
      if(filter.isVisible) {
        options.where['isVisible'] = filter.isVisible;
      }
    }
    return await this.userRepository.find(options);
  }
}
