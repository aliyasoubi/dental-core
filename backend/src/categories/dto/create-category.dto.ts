// src/categories/dto/create-category.dto.ts
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from 'src/categories/dto/localized-text.dto';

export class CreateCategoryDto {
  @ApiProperty({ example: { en: 'Composite Resins', fa: 'کامپوزیت‌ها' } })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  description?: LocalizedTextDto;

  @ApiProperty({
    required: false,
    description: 'Parent category ID, for creating a subcategory',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
