// src/auth/dto/register.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
    @ApiProperty({ example: 'احمد' })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({ example: 'محمدی' })
    @IsNotEmpty()
    @IsString()
    lastName: string;

    @ApiProperty({ example: 'ahmad@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: '09123456789' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^09\d{9}$/, { message: 'Mobile number must be a valid Iranian mobile number' })
    mobileNumber: string;

    @ApiProperty({ example: 'StrongP@ss123', minLength: 8 })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain uppercase, lowercase, number, and special character',
    })
    password: string;

    @ApiPropertyOptional({ enum: UserRole, example: UserRole.RECEPTIONIST })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: '1234567890' })
    @IsOptional()
    @IsString()
    nationalId?: string;

    @ApiPropertyOptional({ example: 'DEN-12345' })
    @IsOptional()
    @IsString()
    licenseNumber?: string;
}
