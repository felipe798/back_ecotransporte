import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength, Max, IsOptional,IsEmail } from "class-validator";

export class UserFilterRequest {
  @ApiProperty({example: 3, description: "Role ID 4 Clientes, 6 Sellers."})
  role: number;
}

export class ResetPassordRequest {
    @IsNotEmpty({ message: 'User is required' })
    @ApiProperty()
    id: number;

    @IsNotEmpty({ message: 'Password is required' })
    @ApiProperty()
    password: string;
}

export class ResetMyPasswordRequest {
  @IsNotEmpty({ message: 'Password is required' })
  @ApiProperty()
  password: string;
}


export class ResetPasswordResponse {
    @ApiProperty()
    success: boolean;
}

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  password?: string;

  @IsNotEmpty()
  isVisible: number;

  @IsNotEmpty()
  isActive: number;

  @IsNotEmpty()
  role: number;

  @IsNotEmpty()
  userName: string;

  @IsNotEmpty()
  userAbbreviation: string;

  @IsOptional()
  contactName?: string;

  @IsOptional()
  contactEmail?: string;

  @IsOptional()
  contactPhone?: string;
}

export class ProfileUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'user@email.com' })
  email: string;

  @IsOptional()
  @ApiProperty({ example: 'abc123' })
  password?: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'username' })
  userName: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'Abbr' })
  userAbbreviation: string;

  @IsOptional()
  @ApiProperty({ example: 'Contact' })
  contactName?: string;

  @IsOptional()
  @ApiProperty({ example: '' })
  contactEmail?: string;

  @IsOptional()
  @ApiProperty({ example: '' })
  contactPhone?: string;
}


