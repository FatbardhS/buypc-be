import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuthGuard } from './auth.guard';

/**
 * Logged in AND an admin. The role is read from the database on every request, so taking
 * someone's admin role away works immediately (their token only holds their id).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthGuard,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.auth.canActivate(context);
    const { userId } = context.switchToHttp().getRequest<{ userId: string }>();
    const user = await this.users.findOneBy({ id: userId });
    if (user?.role !== 'admin') throw new ForbiddenException('Admins only');
    return true;
  }
}
