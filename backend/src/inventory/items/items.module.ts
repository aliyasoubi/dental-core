// src/inventory/items/items.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { CategoriesModule } from 'src/categories/categories.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { SuppliersModule } from 'src/suppliers/suppliers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem]),
    CategoriesModule,
    SuppliersModule,
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService, TypeOrmModule],
})
export class ItemsModule {}
