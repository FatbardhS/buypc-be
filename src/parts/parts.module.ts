import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Part } from './part.entity';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { PartsSeeder } from '../seed/parts.seeder';
import { PrebuiltsService } from './prebuilts';

@Module({
  imports: [TypeOrmModule.forFeature([Part])],
  controllers: [PartsController],
  providers: [PartsService, PartsSeeder, PrebuiltsService],
  exports: [PartsService],
})
export class PartsModule {}
