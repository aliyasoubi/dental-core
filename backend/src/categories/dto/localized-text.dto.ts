// src/categories/dto/localized-text.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  en: string;

  @IsString()
  @IsOptional()
  fa?: string;
}
