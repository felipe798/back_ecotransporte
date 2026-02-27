import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from 'src/user/entities/users.entity';

export class getByUserDto {
  @IsNotEmpty({ message: 'id_user is required' })
  @ApiProperty({ example: 1 })
  id_user: UserEntity;
}
