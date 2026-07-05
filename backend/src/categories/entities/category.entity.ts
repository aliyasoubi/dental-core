// src/categories/entities/category.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export interface LocalizedText {
  en: string;
  fa?: string;
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedText;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL', // deleting a parent shouldn't cascade-delete its children
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}