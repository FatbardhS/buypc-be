import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Build } from './build.entity';
import { BuildsController } from './builds.controller';
import { BuildsService } from './builds.service';
import { PartsModule } from '../parts/parts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Build]), PartsModule],
  controllers: [BuildsController],
  providers: [BuildsService],
})
export class BuildsModule {}
