import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Part } from './part.entity';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { PartsSeeder } from '../seed/parts.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([Part])],
  controllers: [PartsController],
  providers: [PartsService, PartsSeeder],
  exports: [PartsService],
})
export class PartsModule {}
