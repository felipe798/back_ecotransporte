import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";


export class authResetPassordRequest {
    @IsNotEmpty({ message: 'Token is required' })
    @ApiProperty()
    token: string;

    @IsNotEmpty({ message: 'Password is required' })
    @ApiProperty()
    password: string;
}

export class authResetPasswordResponse {
    @ApiProperty()
    success: boolean;
}

export class authRequestResetPassordRequest {
    @IsEmail({}, { message: 'Email is invalid' })
    @ApiProperty()
    email: string;
}

export class authRequestResetPasswordResponse {
    @ApiProperty()
    success: boolean;
}