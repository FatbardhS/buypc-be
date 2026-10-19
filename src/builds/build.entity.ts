import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
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

export const BUILD_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];

@Entity('builds')
export class Build {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Who placed the order. Null only for orders placed before accounts existed. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'placed' })
  status: BuildStatus;

  @Column({ type: 'jsonb' })
  items: BuildItem[];

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numeric })
  totalPrice: number;

  @Column({ type: 'int' })
  estimatedPowerW: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
