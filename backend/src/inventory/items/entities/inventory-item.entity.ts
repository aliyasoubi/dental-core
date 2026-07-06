// src/inventory/items/entities/inventory-item.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from '../../../suppliers/entities/supplier.entity';
import {
  LocalizedText,
  Category,
} from 'src/categories/entities/category.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'int' })
  reorderLevel: number;

  // Postgres returns "decimal" columns as strings via node-pg to avoid
  // float precision loss — this transformer converts both directions so
  // the rest of the app always sees a plain number, not '"45.00"'.
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  costPerUnit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
