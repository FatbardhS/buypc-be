import { BadRequestException, Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard, UserId } from '../auth/auth.guard';
import { User, toPublic } from './user.entity';

/** Optional text field: trimmed, empty → null, too long → 400 */
function text(value: unknown, label: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw new BadRequestException(`${label} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new BadRequestException(`${label} is too long (max ${max} characters)`);
  return trimmed || null;
}

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  /** GET /api/users/me — the logged-in user's info */
  @Get('me')
  async me(@UserId() userId: string) {
    return toPublic(await this.users.findOneByOrFail({ id: userId }));
  }

  /** PATCH /api/users/me  { name?, phone?, address?, city? } — users edit their own info (never their role) */
  @Patch('me')
  async update(@UserId() userId: string, @Body() body: Record<string, unknown>) {
    const name = text(body?.name, 'Name', 120);
    if (name === null) throw new BadRequestException('Enter your name');
    const phone = text(body?.phone, 'Phone', 30);
    if (phone && !/^\+?[\d\s()-]{6,}$/.test(phone)) {
      throw new BadRequestException('Enter a valid phone number, e.g. +383 44 123 456');
    }

    const changes: Partial<User> = {};
    if (name !== undefined) changes.name = name;
    if (phone !== undefined) changes.phone = phone;
    const address = text(body?.address, 'Address', 200);
    if (address !== undefined) changes.address = address;
    const city = text(body?.city, 'City', 80);
    if (city !== undefined) changes.city = city;

    if (Object.keys(changes).length) await this.users.update(userId, changes);
    return toPublic(await this.users.findOneByOrFail({ id: userId }));
  }
}
