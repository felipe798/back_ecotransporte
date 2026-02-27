import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginResponse {
    @ApiProperty()
    accessToken: string;
    @ApiProperty()
    refreshToken?: string;
    @ApiProperty()
    email: string;
    @ApiProperty()
    role: number;
}


export class LoginRequest {
    @IsEmail({}, { message: 'Email is invalid' })
    @ApiProperty()
    email: string;
  
    @IsNotEmpty({ message: 'Password is required' })
    @ApiProperty()
    password: string;
}
  