import { BadRequestException, ConflictException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicUser, User, toPublic } from '../users/user.entity';
import { hashPassword, verifyPassword } from './password';
import { MailService } from '../mail/mail.service';

/** Marks confirmation-link tokens so they can't be used to log in (and login tokens can't confirm) */
export const VERIFY_PURPOSE = 'verify-email';

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Last resend per user, so the Gmail account can't be used to spam (per server instance) */
  private readonly lastResend = new Map<string, number>();
  /** Emails that are made admin when they register or log in (ADMIN_EMAILS, comma-separated) */
  private readonly adminEmails: Set<string>;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
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
        // Without a mailbox configured nobody could confirm, so accounts start confirmed
        emailVerified: !this.mail.enabled,
      }),
    );
    if (!user.emailVerified) await this.sendVerification(user);
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

  /** POST /auth/verify-email: marks the email confirmed when the link's token is valid */
  async verifyEmail(token: unknown): Promise<PublicUser> {
    let payload: { sub: string; email: string; purpose?: string };
    try {
      payload = await this.jwt.verifyAsync(typeof token === 'string' ? token : '');
    } catch {
      throw new BadRequestException('This confirmation link is invalid or has expired. Send a new one from the app.');
    }
    if (payload.purpose !== VERIFY_PURPOSE) throw new BadRequestException('This confirmation link is invalid.');
    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user || user.email !== payload.email) throw new BadRequestException('This confirmation link is invalid.');
    if (!user.emailVerified) {
      user.emailVerified = true;
      await this.users.update(user.id, { emailVerified: true });
    }
    return toPublic(user);
  }

  /** POST /auth/resend-verification: emails a new confirmation link to the logged-in user */
  async resendVerification(userId: string): Promise<{ sent: boolean }> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) return { sent: false };
    const last = this.lastResend.get(userId) ?? 0;
    if (Date.now() - last < 60_000) {
      throw new BadRequestException('A confirmation email was just sent. Wait a minute before asking again.');
    }
    this.lastResend.set(userId, Date.now());
    if (!(await this.sendVerification(user))) {
      this.lastResend.delete(userId);
      throw new ServiceUnavailableException('Could not send the email right now. Try again in a few minutes.');
    }
    return { sent: true };
  }

  /** False when the email couldn't be sent (the account still works; the user can ask again) */
  private async sendVerification(user: User): Promise<boolean> {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, purpose: VERIFY_PURPOSE }, { expiresIn: '24h' });
    try {
      await this.mail.sendVerification(user.email, user.name, token);
      return true;
    } catch (err) {
      this.logger.error(`Could not send confirmation email to ${user.email}: ${(err as Error).message}`);
      return false;
    }
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
