import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Category } from '../parts/part.types';

const numeric = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/** Snapshot of a part at order time, so later price/catalog changes don't rewrite history */
export interface BuildItem {
  category: Category;
  partId: number;
  brand: string;
  name: string;
  price: number;
}

@Entity('builds')
export class Build {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'placed' })
  status: 'placed' | 'processing' | 'shipped' | 'delivered';

  @Column({ type: 'jsonb' })
  items: BuildItem[];

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numeric })
  totalPrice: number;

  @Column({ type: 'int' })
  estimatedPowerW: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
