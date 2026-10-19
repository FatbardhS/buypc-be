import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicUser, User, toPublic } from '../users/user.entity';
import { hashPassword, verifyPassword } from './password';

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  /** Emails that are made admin when they register or log in (ADMIN_EMAILS, comma-separated) */
  private readonly adminEmails: Set<string>;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.adminEmails = new Set(
      (config.get<string>('ADMIN_EMAILS') ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  async register(body: { name?: unknown; email?: unknown; password?: unknown }): Promise<AuthResponse> {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!name || name.length > 120) throw new BadRequestException('Enter your name');
    if (!EMAIL.test(email) || email.length > 254) throw new BadRequestException('Enter a valid email');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    if (await this.users.existsBy({ email })) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.users.save(
      this.users.create({
        name,
        email,
        passwordHash: await hashPassword(password),
        role: this.adminEmails.has(email) ? 'admin' : 'user',
      }),
    );
    return this.issue(user);
  }

  async login(body: { email?: unknown; password?: unknown }): Promise<AuthResponse> {
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Wrong email or password');
    }
    // Accounts that existed before their email was added to ADMIN_EMAILS
    if (this.adminEmails.has(email) && user.role !== 'admin') {
      user.role = 'admin';
      await this.users.update(user.id, { role: 'admin' });
    }
    return this.issue(user);
  }

  async findPublic(id: string): Promise<PublicUser> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new UnauthorizedException();
    return toPublic(user);
  }

  private async issue(user: User): Promise<AuthResponse> {
    // Only the id goes in the token; the role is always read from the database
    const token = await this.jwt.signAsync({ sub: user.id });
    return { token, user: toPublic(user) };
  }
}
