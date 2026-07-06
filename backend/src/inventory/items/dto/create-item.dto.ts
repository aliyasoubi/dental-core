// src/inventory/items/dto/create-item.dto.ts
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../categories/dto/localized-text.dto';

export class CreateItemDto {
  @ApiProperty({ example: { en: 'Composite Resin A2', fa: 'کامپوزیت A2' } })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ example: 'RES-A2-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ example: 'syringe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string;

  @ApiProperty({ example: 10, description: 'Reorder threshold quantity' })
  @IsInt()
  @Min(0)
  reorderLevel: number;

  @ApiProperty({ example: 45.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerUnit: number;
}
