// src/inventory/items/items.service.spec.ts

import { ConflictException } from '@nestjs/common';
import { TestingModule, Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from 'src/categories/categories.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { InventoryItem } from './entities/inventory-item.entity';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let repo: any;
  let categoriesService: any;
  let suppliersService: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((i) => Promise.resolve({ id: 'item-1', ...i })),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      softRemove: jest.fn(),
    };
    categoriesService = { findOne: jest.fn() };
    suppliersService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: getRepositoryToken(InventoryItem), useValue: repo },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: SuppliersService, useValue: suppliersService },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const dto = {
      name: { en: 'Resin' },
      sku: 'RES-001',
      categoryId: 'cat-1',
      unit: 'syringe',
      reorderLevel: 10,
      costPerUnit: 45.5,
    } as any;

    it('validates the category exists', async () => {
      repo.findOne.mockResolvedValue(null); // sku check passes
      await service.create(dto);
      expect(categoriesService.findOne).toHaveBeenCalledWith('cat-1');
    });

    it('validates the supplier exists only when supplierId is provided', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.create(dto);
      expect(suppliersService.findOne).not.toHaveBeenCalled();

      await service.create({ ...dto, supplierId: 'sup-1' });
      expect(suppliersService.findOne).toHaveBeenCalledWith('sup-1');
    });

    it('throws ConflictException if the SKU is already taken', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing-item' });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('creates the item when everything is valid', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create(dto);
      expect(result.id).toBe('item-1');
    });
  });

  describe('update', () => {
    const existingItem = {
      id: 'item-1',
      sku: 'RES-001',
      categoryId: 'cat-1',
      supplierId: undefined,
    };

    it('does not re-validate category if categoryId is unchanged', async () => {
      repo.findOneOrFail.mockResolvedValue(existingItem);
      await service.update('item-1', { categoryId: 'cat-1' } as any);
      expect(categoriesService.findOne).not.toHaveBeenCalled();
    });

    it('re-validates category when categoryId changes', async () => {
      repo.findOneOrFail.mockResolvedValue(existingItem);
      await service.update('item-1', { categoryId: 'cat-2' } as any);
      expect(categoriesService.findOne).toHaveBeenCalledWith('cat-2');
    });

    it('re-checks SKU uniqueness only when sku changes', async () => {
      repo.findOneOrFail.mockResolvedValue(existingItem);
      repo.findOne.mockResolvedValue(null);

      await service.update('item-1', { sku: 'RES-001' } as any); // unchanged
      expect(repo.findOne).not.toHaveBeenCalled();

      await service.update('item-1', { sku: 'RES-002' } as any); // changed
      expect(repo.findOne).toHaveBeenCalledWith({ where: { sku: 'RES-002' } });
    });
  });

  describe('remove', () => {
    it('soft-removes the item', async () => {
      const item = { id: 'item-1' };
      repo.findOneOrFail.mockResolvedValue(item);
      await service.remove('item-1');
      expect(repo.softRemove).toHaveBeenCalledWith(item);
    });
  });
});
