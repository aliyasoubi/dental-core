// src/database/seed-categories.ts
import { DataSource } from 'typeorm';
import databaseConfig from '../config/database.config';
import { Category } from 'src/categories/entities/category.entity';

const CATEGORIES: { en: string; fa: string }[] = [
  { en: 'PPE & Disposables', fa: 'مصرفی محافظتی' },
  { en: 'Restorative Materials', fa: 'مواد ترمیمی' },
  { en: 'Endodontic Supplies', fa: 'مصرفی اندو' },
  { en: 'Impression Materials', fa: 'مواد قالبگیری' },
  { en: 'Anesthesia Supplies', fa: 'مصرفی بی‌حسی' },
  { en: 'Surgical Supplies', fa: 'مصرفی جراحی' },
  {
    en: 'Sterilization & Infection Control',
    fa: 'استریلیزاسیون و کنترل عفونت',
  },
  { en: 'Matrix Systems', fa: 'سیستم ماتریس' },
  { en: 'Cements & Liners', fa: 'سمان‌ها و لاینرها' },
  { en: 'Polishing & Finishing', fa: 'پرداخت و پالیش' },
  { en: 'Suction & Field Isolation', fa: 'ساکشن و ایزوله' },
  { en: 'Cleaning & Housekeeping', fa: 'نظافت و بهداشت محیط' },
  { en: 'Office/Consumables (Non-clinical)', fa: 'مصرفی اداری/عمومی' },
  { en: 'Instrument Consumables', fa: 'مصرفی ابزار' },
  { en: 'Prosthetics/Lab Materials', fa: 'مواد آزمایشگاهی' },
];

async function seedCategories() {
  const dataSource = new DataSource({
    ...databaseConfig(),
    entities: [Category],
  } as any);
  await dataSource.initialize();
  const repo = dataSource.getRepository(Category);

  for (const { en, fa } of CATEGORIES) {
    const exists = await repo.exists({ where: { name: { en } as any } });
    if (exists) {
      console.log(`Skipping "${en}" — already exists`);
      continue;
    }
    await repo.save(repo.create({ name: { en, fa } }));
    console.log(`Created "${en}"`);
  }

  await dataSource.destroy();
}

seedCategories().catch((err) => {
  console.error(err);
  process.exit(1);
});
