import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Counts attempts per key (e.g. "login:someone@example.com") in the database, so the limits hold
 * across all serverless instances. A window starts with the first attempt and resets after it ends.
 */
@Injectable()
export class RateLimitService {
  private tableReady?: Promise<unknown>;

  constructor(private readonly db: DataSource) {}

  /** Counts one attempt; throws 429 once more than `limit` happened within `windowSeconds`. */
  async hit(key: string, limit: number, windowSeconds: number, message = 'Too many attempts.'): Promise<void> {
    const count = await this.count(key, windowSeconds, 1);
    if (count.value > limit) this.tooMany(message, count.resetAt);
  }

  /** Throws 429 if `key` is already over `limit`, without counting (e.g. before checking a password). */
  async check(key: string, limit: number, message = 'Too many attempts.'): Promise<void> {
    await this.ensureTable();
    const rows: { count: number; resetAt: Date }[] = await this.db.query(
      'SELECT count, "resetAt" FROM rate_limits WHERE key = $1 AND "resetAt" > now()',
      [key],
    );
    if (rows[0] && rows[0].count >= limit) this.tooMany(message, new Date(rows[0].resetAt));
  }

  /** Counts one attempt without ever throwing (e.g. a failed login). */
  async record(key: string, windowSeconds: number): Promise<void> {
    await this.count(key, windowSeconds, 1);
  }

  /** Forgets a key (e.g. after a successful login). */
  async reset(key: string): Promise<void> {
    await this.ensureTable();
    await this.db.query('DELETE FROM rate_limits WHERE key = $1', [key]);
  }

  private async count(key: string, windowSeconds: number, by: number): Promise<{ value: number; resetAt: Date }> {
    await this.ensureTable();
    // One statement, so parallel requests can't both slip under the limit
    const rows: { count: number; resetAt: Date }[] = await this.db.query(
      `INSERT INTO rate_limits (key, count, "resetAt")
       VALUES ($1, $2, now() + make_interval(secs => $3))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits."resetAt" <= now() THEN $2 ELSE rate_limits.count + $2 END,
         "resetAt" = CASE WHEN rate_limits."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE rate_limits."resetAt" END
       RETURNING count, "resetAt"`,
      [key, by, windowSeconds],
    );
    // Old rows are cleaned up now and then
    if (Math.random() < 0.02) void this.db.query('DELETE FROM rate_limits WHERE "resetAt" < now() - interval \'1 day\'');
    return { value: rows[0].count, resetAt: new Date(rows[0].resetAt) };
  }

  private tooMany(message: string, resetAt: Date): never {
    const minutes = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60_000));
    throw new HttpException(
      `${message} Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /** The table is tiny and internal, so it's created here instead of as an entity */
  private ensureTable(): Promise<unknown> {
    this.tableReady ??= this.db.query(
      `CREATE TABLE IF NOT EXISTS rate_limits (
         key varchar(200) PRIMARY KEY,
         count integer NOT NULL,
         "resetAt" timestamptz NOT NULL
       )`,
    );
    return this.tableReady;
  }
}
