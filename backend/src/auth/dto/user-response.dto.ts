// src/auth/dto/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class UserResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    mobileNumber: string;

    @ApiProperty({ enum: UserRole })
    role: UserRole;
}