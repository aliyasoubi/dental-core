// src/suppliers/dto/create-supplier.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'MediDent Supplies Co.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false, example: 'Sara Ahmadi' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactName?: string;

  @ApiProperty({ required: false, example: '+98 21 1234 5678' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ required: false, example: 'sales@medident.example' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;
}
