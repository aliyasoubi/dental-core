// src/suppliers/suppliers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.suppliersRepository.create(dto);
    return this.suppliersRepository.save(supplier);
  }

  async findAll(): Promise<Supplier[]> {
    return this.suppliersRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({
      where: { id },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, dto);
    return this.suppliersRepository.save(supplier);
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    await this.suppliersRepository.softRemove(supplier);
  }
}
