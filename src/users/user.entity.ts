import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
