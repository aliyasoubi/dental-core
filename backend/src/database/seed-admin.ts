// src/database/seed-admin.ts
// Run once: ts-node -r tsconfig-paths/register src/database/seed-admin.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import databaseConfig from '../config/database.config';

async function seedAdmin() {
  const dataSource = new DataSource({
    ...databaseConfig(),
    entities: [User],
  } as any);
  await dataSource.initialize();

  const repo = dataSource.getRepository(User);
  const exists = await repo.findOne({
    where: { email: process.env.SEED_ADMIN_EMAIL! },
  });
  if (exists) {
    console.log('Admin already exists, skipping.');
    await dataSource.destroy();
    return;
  }

  const password = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD!, 10);
  await repo.save(
    repo.create({
      email: process.env.SEED_ADMIN_EMAIL!,
      mobileNumber: process.env.SEED_ADMIN_MOBILE!,
      password,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    }),
  );
  console.log('Admin created.');
  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
