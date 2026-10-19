import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Stored lower-cased so logins are case-insensitive */
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  /** scrypt hash as "salt:hash" (hex). Never sent to the client. */
  @Column({ type: 'varchar', length: 200, select: false })
  passwordHash: string;

  /** Set when the user opens the link in the confirmation email. Needed before ordering. */
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  /** "admin" can open the admin panel; checked against the database on every admin request */
  @Column({ type: 'varchar', length: 10, default: 'user' })
  role: Role;

  // Delivery details, filled in by the user on the "My info" page. Needed before ordering.
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** What the API returns about a user (never the password hash) */
export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'emailVerified' | 'role' | 'phone' | 'address' | 'city'>;

export function toPublic(user: User): PublicUser {
  const { id, name, email, emailVerified, role, phone, address, city } = user;
  return { id, name, email, emailVerified, role, phone, address, city };
}

/** Phone, address and city are all needed to deliver an order */
export function hasDeliveryInfo(user: Pick<User, 'phone' | 'address' | 'city'>): boolean {
  return !!(user.phone && user.address && user.city);
}
