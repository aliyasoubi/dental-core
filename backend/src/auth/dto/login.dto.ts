// src/auth/dto/login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'ahmad@example.com' })
    @IsNotEmpty()
    @IsString()
    emailOrMobile: string;

    @ApiProperty({ example: 'StrongP@ss123' })
    @IsNotEmpty()
    @IsString()
    password: string;
}
