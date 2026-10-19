import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartsModule } from './parts/parts.module';
import { BuildsModule } from './builds/builds.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        // DATABASE_URL locally; Vercel's Neon integration may provide POSTGRES_URL instead
        url:
          config.get('DATABASE_URL') ||
          config.get('POSTGRES_URL') ||
          'postgres://buypc:buypc@localhost:5432/buypc',
        autoLoadEntities: true,
        // Creates/updates tables from the entities. Fine for development; use migrations in production.
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    AdminModule,
    PartsModule,
    BuildsModule,
  ],
})
export class AppModule {}
