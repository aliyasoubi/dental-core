// src/inventory/items/items.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoriesService } from 'src/categories/categories.service';
import { Repository } from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';
import { SuppliersService } from 'src/suppliers/suppliers.service';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepository: Repository<InventoryItem>,
    private readonly categoriesService: CategoriesService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(dto: CreateItemDto): Promise<InventoryItem> {
    await this.categoriesService.findOne(dto.categoryId); // throws if invalid
    if (dto.supplierId) {
      await this.suppliersService.findOne(dto.supplierId); // throws if invalid
    }
    await this.assertSkuAvailable(dto.sku);

    const item = this.itemsRepository.create(dto);
    return this.itemsRepository.save(item);
  }

  async findAll(): Promise<InventoryItem[]> {
    return this.itemsRepository.find({
      relations: ['category', 'supplier'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<InventoryItem> {
    return this.itemsRepository.findOneOrFail({
      where: { id },
      relations: ['category', 'supplier'],
    });
  }

  async update(id: string, dto: UpdateItemDto): Promise<InventoryItem> {
    const item = await this.findOne(id);

    if (dto.categoryId && dto.categoryId !== item.categoryId) {
      await this.categoriesService.findOne(dto.categoryId);
    }
    if (dto.supplierId && dto.supplierId !== item.supplierId) {
      await this.suppliersService.findOne(dto.supplierId);
    }
    if (dto.sku && dto.sku !== item.sku) {
      await this.assertSkuAvailable(dto.sku);
    }

    Object.assign(item, dto);
    return this.itemsRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.itemsRepository.softRemove(item);
  }

  private async assertSkuAvailable(sku: string): Promise<void> {
    const existing = await this.itemsRepository.findOne({ where: { sku } });
    if (existing) {
      throw new ConflictException('An item with this SKU already exists');
    }
  }
}
