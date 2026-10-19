import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

/** Returns "salt:hash" in hex. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}
