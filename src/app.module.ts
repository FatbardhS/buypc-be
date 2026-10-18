import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartsModule } from './parts/parts.module';
import { BuildsModule } from './builds/builds.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL', 'postgres://buypc:buypc@localhost:5432/buypc'),
        autoLoadEntities: true,
        // Creates/updates tables from the entities. Fine for development; use migrations in production.
        synchronize: true,
      }),
    }),
    PartsModule,
    BuildsModule,
  ],
})
export class AppModule {}
