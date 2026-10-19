import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { AnySpecs, Category } from './part.types';

const numeric = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('parts')
@Index(['category', 'slug'], { unique: true })
export class Part {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  category: Category;

  /** Stable key used by the seed so re-seeding updates instead of duplicating */
  @Column({ type: 'varchar', length: 120 })
  slug: string;

  @Column({ type: 'varchar', length: 60 })
  brand: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numeric })
  price: number;

  @Column({ type: 'jsonb' })
  specs: AnySpecs;

  /** Product picture (hosted by the shop) */
  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  /** Where the price and picture came from */
  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceUrl: string | null;
}
