import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from '../parts/part.entity';
import { CATEGORIES } from '../parts/part.types';
import { CATALOG } from './parts.data';
import { CURATED_FROM_SHOP, SCRAPED } from './scraped.data';

/**
 * Upserts the parts catalog on startup, so editing the seed files and restarting is enough.
 * Hand-checked parts (parts.data.ts) get the shop's euro price and picture when the scraper
 * matched them; scraped parts (scraped.data.ts) are added alongside.
 */
@Injectable()
export class PartsSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PartsSeeder.name);

  constructor(@InjectRepository(Part) private readonly parts: Repository<Part>) {}

  async onApplicationBootstrap(): Promise<void> {
    const curated = CATEGORIES.flatMap((category) =>
      CATALOG[category].map((p) => {
        const shop = CURATED_FROM_SHOP[`${category}/${p.slug}`] as (typeof CURATED_FROM_SHOP)[string] | undefined;
        return {
          ...p,
          category,
          price: shop?.price ?? p.price,
          imageUrl: shop?.imageUrl ?? p.imageUrl ?? null,
          sourceUrl: shop?.sourceUrl ?? p.sourceUrl ?? null,
        };
      }),
    );
    const taken = new Set(curated.map((p) => `${p.category}/${p.slug}`));
    const scraped = SCRAPED.filter((p) => !taken.has(`${p.category}/${p.slug}`));

    const rows = [...curated, ...scraped];
    // Postgres caps parameters per query, so upsert in chunks
    for (let i = 0; i < rows.length; i += 200) {
      await this.parts.upsert(rows.slice(i, i + 200), ['category', 'slug']);
    }
    this.logger.log(`Parts catalog ready (${curated.length} checked + ${scraped.length} from shop)`);
  }
}
