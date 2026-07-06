// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import databaseConfig from './config/database.config';
import { CategoriesModule } from './categories/categories.module';
import { ItemsModule } from './inventory/items/items.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('database')!,
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    SuppliersModule,
    ItemsModule,
  ],
})
export class AppModule {}
