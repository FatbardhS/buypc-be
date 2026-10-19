import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { hashPassword, verifyPassword } from './password';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

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
      this.users.create({ name, email, passwordHash: await hashPassword(password) }),
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
    return this.issue(user);
  }

  async findPublic(id: string): Promise<PublicUser> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new UnauthorizedException();
    return this.toPublic(user);
  }

  private async issue(user: User): Promise<AuthResponse> {
    const token = await this.jwt.signAsync({ sub: user.id });
    return { token, user: this.toPublic(user) };
  }

  private toPublic(user: User): PublicUser {
    return { id: user.id, name: user.name, email: user.email };
  }
}
