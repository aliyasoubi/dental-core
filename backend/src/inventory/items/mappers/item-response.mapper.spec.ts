// src/inventory/items/mappers/item-response.mapper.spec.ts
import { UserRole } from '../../../users/entities/user.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { toItemResponse } from './item-response.mapper';

describe('toItemResponse', () => {
  const item = {
    id: 'item-1',
    name: { en: 'Composite Resin' },
    sku: 'RES-001',
    categoryId: 'cat-1',
    unit: 'syringe',
    reorderLevel: 10,
    costPerUnit: 45.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InventoryItem;

  it('includes costPerUnit for Admin', () => {
    const result = toItemResponse(item, UserRole.ADMIN);
    expect(result.costPerUnit).toBe(45.5);
  });

  it('omits costPerUnit entirely for Dentist', () => {
    const result = toItemResponse(item, UserRole.DENTIST);
    expect(result.costPerUnit).toBeUndefined();
    expect('costPerUnit' in result).toBe(false);
  });

  it('omits costPerUnit entirely for Assistant', () => {
    const result = toItemResponse(item, UserRole.ASSISTANT);
    expect('costPerUnit' in result).toBe(false);
  });

  it('preserves every other field regardless of role', () => {
    const result = toItemResponse(item, UserRole.RECEPTIONIST);
    expect(result.sku).toBe('RES-001');
    expect(result.name).toEqual({ en: 'Composite Resin' });
  });
});
