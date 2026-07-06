// src/suppliers/suppliers.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((s) => Promise.resolve({ id: 'sup-1', ...s })),
      find: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: getRepositoryToken(Supplier), useValue: repo },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('creates a supplier with only the required name field', async () => {
      const result = await service.create({ name: 'MediDent' } as any);
      expect(repo.create).toHaveBeenCalledWith({ name: 'MediDent' });
      expect(result.id).toBe('sup-1');
    });
  });

  describe('findAll', () => {
    it('returns suppliers ordered by name', async () => {
      repo.find.mockResolvedValue([{ id: 'sup-1', name: 'MediDent' }]);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when supplier does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the supplier when found', async () => {
      const supplier = { id: 'sup-1', name: 'MediDent' };
      repo.findOne.mockResolvedValue(supplier);

      const result = await service.findOne('sup-1');
      expect(result).toBe(supplier);
    });
  });

  describe('update', () => {
    it('merges the dto onto the existing supplier and saves', async () => {
      repo.findOne.mockResolvedValue({ id: 'sup-1', name: 'MediDent' });

      const result = await service.update('sup-1', {
        phone: '+98 21 0000 0000',
      } as any);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'MediDent',
          phone: '+98 21 0000 0000',
        }),
      );
      expect(result.id).toBe('sup-1');
    });

    it('throws NotFoundException when updating a missing supplier', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update('missing-id', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-removes the supplier instead of hard-deleting it', async () => {
      const supplier = { id: 'sup-1', name: 'MediDent' };
      repo.findOne.mockResolvedValue(supplier);

      await service.remove('sup-1');

      expect(repo.softRemove).toHaveBeenCalledWith(supplier);
    });
  });
});