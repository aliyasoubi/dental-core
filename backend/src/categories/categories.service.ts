// src/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      await this.assertParentExists(dto.parentId);
    }

    const category = this.categoriesRepository.create(dto);
    return this.categoriesRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    // Soft-deleted rows are excluded automatically — TypeORM adds
    // "deletedAt IS NULL" to this query because of @DeleteDateColumn.
    return this.categoriesRepository.find({
      relations: ['parent'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.assertParentExists(dto.parentId);
    }

    Object.assign(category, dto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepository.softRemove(category);
  }

  private async assertParentExists(parentId: string): Promise<void> {
    const exists = await this.categoriesRepository.exists({
      where: { id: parentId },
    });
    if (!exists) {
      throw new BadRequestException('Parent category does not exist');
    }
  }
}
