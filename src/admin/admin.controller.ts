import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { AuthService } from '../auth/auth.service';
import { UserId } from '../auth/auth.guard';
import { Build, BUILD_STATUSES } from '../builds/build.entity';
import { ROLES, User, toPublic } from '../users/user.entity';

/** Everything under /api/admin needs an admin account */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Build) private readonly builds: Repository<Build>,
    private readonly auth: AuthService,
  ) {}

  /** GET /api/admin/users — every account with its info and number of orders */
  @Get('users')
  async listUsers() {
    const [users, counts] = await Promise.all([
      this.users.find({ order: { createdAt: 'DESC' } }),
      this.builds
        .createQueryBuilder('b')
        .select('b.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .groupBy('b.userId')
        .getRawMany<{ userId: string; count: string }>(),
    ]);
    const orders = new Map(counts.map((c) => [c.userId, Number(c.count)]));
    return users.map((u) => ({ ...toPublic(u), createdAt: u.createdAt, orders: orders.get(u.id) ?? 0 }));
  }

  /** PATCH /api/admin/users/:id/role  { role: 'user' | 'admin' } */
  @Patch('users/:id/role')
  async setRole(@UserId() me: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: { role?: unknown }) {
    if (!(ROLES as readonly unknown[]).includes(body?.role)) {
      throw new BadRequestException(`role must be one of: ${ROLES.join(', ')}`);
    }
    if (id === me && body.role !== 'admin') {
      throw new BadRequestException("You can't remove your own admin role");
    }
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    user.role = body.role as User['role'];
    return toPublic(await this.users.save(user));
  }

  /** POST /api/admin/users/:id/resend-verification — shows Gmail's exact error if sending fails */
  @Post('users/:id/resend-verification')
  @HttpCode(200)
  resendVerification(@Param('id', ParseUUIDPipe) id: string) {
    return this.auth.resendVerification(id, true);
  }

  /** GET /api/admin/orders — every order, newest first, with who placed it and where it goes */
  @Get('orders')
  async listOrders() {
    const orders = await this.builds.find({ relations: { user: true }, order: { createdAt: 'DESC' } });
    return orders.map(({ user, ...order }) => ({ ...order, customer: user ? toPublic(user) : null }));
  }

  /** PATCH /api/admin/orders/:id/status  { status } */
  @Patch('orders/:id/status')
  async setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status?: unknown }) {
    if (!(BUILD_STATUSES as readonly unknown[]).includes(body?.status)) {
      throw new BadRequestException(`status must be one of: ${BUILD_STATUSES.join(', ')}`);
    }
    const order = await this.builds.findOneBy({ id });
    if (!order) throw new NotFoundException('Order not found');
    order.status = body.status as Build['status'];
    return this.builds.save(order);
  }
}
