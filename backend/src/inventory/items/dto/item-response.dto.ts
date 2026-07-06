// src/inventory/items/dto/item-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { LocalizedText } from '../../../categories/entities/category.entity';

export class ItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: LocalizedText;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty({ required: false })
  supplierId?: string;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  reorderLevel: number;

  // Present only for Admins — see item-response.mapper.ts.
  @ApiProperty({ required: false })
  costPerUnit?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}