import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SignupResponse {
  @ApiProperty()
  success: boolean;
}

export class SignupRequest {
  @IsEmail({}, { message: 'Email is invalid' })
  @ApiProperty()
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @ApiProperty()
  password: string;

  @IsNotEmpty({ message: 'Username is required' })
  @ApiProperty()
  userName: string;

  
  //@ApiProperty()
  //userAbbreviation: string;

  

}
