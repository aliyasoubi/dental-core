// src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
    'database',
    (): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'dental_user',
        password: process.env.DB_PASSWORD || 'dental_pass',
        database: process.env.DB_NAME || 'dental_core',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development', // Only for development
        logging: process.env.NODE_ENV === 'development',
        autoLoadEntities: true,
    }),
);
