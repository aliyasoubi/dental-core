// src/categories/categories.service.spec.ts

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TestingModule, Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entites/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((c) => Promise.resolve({ id: 'cat-1', ...c })),
      find: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('creates a top-level category without checking for a parent', async () => {
      const result = await service.create({ name: { en: 'Resins' } } as any);
      expect(repo.exists).not.toHaveBeenCalled();
      expect(result.id).toBe('cat-1');
    });

    it('throws BadRequestException if parentId does not exist', async () => {
      repo.exists.mockResolvedValue(false);

      await expect(
        service.create({
          name: { en: 'Resins' },
          parentId: 'missing-parent',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a subcategory when parentId exists', async () => {
      repo.exists.mockResolvedValue(true);

      const result = await service.create({
        name: { en: 'Resins' },
        parentId: 'parent-1',
      } as any);

      expect(result.id).toBe('cat-1');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when category does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the category with parent/children relations loaded', async () => {
      const category = { id: 'cat-1', name: { en: 'Resins' } };
      repo.findOne.mockResolvedValue(category);

      const result = await service.findOne('cat-1');

      expect(result).toBe(category);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        relations: ['parent', 'children'],
      });
    });
  });

  describe('update', () => {
    it('throws BadRequestException if a category is set as its own parent', async () => {
      repo.findOne.mockResolvedValue({ id: 'cat-1', name: { en: 'Resins' } });

      await expect(
        service.update('cat-1', { parentId: 'cat-1' } as any),
      ).rejects.toThrow('cannot be its own parent');
    });

    it('throws BadRequestException if the new parentId does not exist', async () => {
      repo.findOne.mockResolvedValue({ id: 'cat-1', name: { en: 'Resins' } });
      repo.exists.mockResolvedValue(false);

      await expect(
        service.update('cat-1', { parentId: 'missing-parent' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates fields and saves', async () => {
      repo.findOne.mockResolvedValue({ id: 'cat-1', name: { en: 'Resins' } });

      const result = await service.update('cat-1', {
        name: { en: 'Composite Resins' },
      } as any);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: { en: 'Composite Resins' } }),
      );
      expect(result.id).toBe('cat-1');
    });
  });

  describe('remove', () => {
    it('soft-removes the category instead of hard-deleting it', async () => {
      const category = { id: 'cat-1', name: { en: 'Resins' } };
      repo.findOne.mockResolvedValue(category);

      await service.remove('cat-1');

      expect(repo.softRemove).toHaveBeenCalledWith(category);
    });
  });
});
