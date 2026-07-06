// src/inventory/items/mappers/item-response.mapper.ts
import { UserRole } from '../../../users/entities/user.entity';
import { ItemResponseDto } from '../dto/item-response.dto';
import { InventoryItem } from '../entities/inventory-item.entity';

export function toItemResponse(
  item: InventoryItem,
  role: UserRole,
): ItemResponseDto {
  const { costPerUnit, ...visibleFields } = item;
  const canSeeCost = role === UserRole.ADMIN;

  return {
    ...visibleFields,
    ...(canSeeCost ? { costPerUnit } : {}),
  };
}

export function toItemResponseList(
  items: InventoryItem[],
  role: UserRole,
): ItemResponseDto[] {
  return items.map((item) => toItemResponse(item, role));
}