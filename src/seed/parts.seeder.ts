import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from '../parts/part.entity';
import { CATEGORIES } from '../parts/part.types';
import { CATALOG } from './parts.data';

/** Upserts the parts catalog on startup, so editing parts.data.ts and restarting is enough. */
@Injectable()
export class PartsSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PartsSeeder.name);

  constructor(@InjectRepository(Part) private readonly parts: Repository<Part>) {}

  async onApplicationBootstrap(): Promise<void> {
    const rows = CATEGORIES.flatMap((category) =>
      CATALOG[category].map((p) => ({ ...p, category })),
    );
    await this.parts.upsert(rows, ['category', 'slug']);
    this.logger.log(`Parts catalog ready (${rows.length} parts)`);
  }
}
