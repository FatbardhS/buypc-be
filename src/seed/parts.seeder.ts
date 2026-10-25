import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from '../parts/part.entity';
import { CATEGORIES } from '../parts/part.types';
import { CATALOG } from './parts.data';
import { CURATED_FROM_SHOP, SCRAPED } from './scraped.data';

/** Below this many parts the seed files look broken, so nothing is removed from the database */
const MIN_CATALOG_SIZE = 300;

/**
 * Upserts the parts catalog on startup, so editing the seed files and restarting is enough.
 * Every part is sold at the shop's current euro price: hand-checked parts (parts.data.ts) are
 * kept only when the scraper found them in the shop, and scraped parts (scraped.data.ts) are
 * added alongside. Parts that are no longer in the shop are removed. Orders keep their own copy
 * of each part's name and price, so removing a part doesn't change past orders.
 */
@Injectable()
export class PartsSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PartsSeeder.name);

  constructor(@InjectRepository(Part) private readonly parts: Repository<Part>) {}

  async onApplicationBootstrap(): Promise<void> {
    // Without a shop match a hand-checked part only has a guessed price, so it isn't offered
    const curated = CATEGORIES.flatMap((category) =>
      CATALOG[category].flatMap((p) => {
        const shop = CURATED_FROM_SHOP[`${category}/${p.slug}`] as (typeof CURATED_FROM_SHOP)[string] | undefined;
        return shop ? [{ ...p, category, price: shop.price, imageUrl: shop.imageUrl, sourceUrl: shop.sourceUrl }] : [];
      }),
    );
    const taken = new Set(curated.map((p) => `${p.category}/${p.slug}`));
    const scraped = SCRAPED.filter((p) => !taken.has(`${p.category}/${p.slug}`));

    const rows = [...curated, ...scraped];
    // Postgres caps parameters per query, so upsert in chunks
    for (let i = 0; i < rows.length; i += 200) {
      await this.parts.upsert(rows.slice(i, i + 200), ['category', 'slug']);
    }

    let removed = 0;
    if (rows.length >= MIN_CATALOG_SIZE) {
      const keep = new Set(rows.map((p) => `${p.category}/${p.slug}`));
      const existing = await this.parts.find({ select: { id: true, category: true, slug: true } });
      const stale = existing.filter((p) => !keep.has(`${p.category}/${p.slug}`)).map((p) => p.id);
      if (stale.length) await this.parts.delete(stale);
      removed = stale.length;
    } else {
      this.logger.warn(`Only ${rows.length} parts in the seed files; not removing anything from the database`);
    }
    this.logger.log(`Parts catalog ready (${curated.length} checked + ${scraped.length} from shop, ${removed} removed)`);
  }
}
