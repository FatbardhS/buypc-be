import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard, UserId } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /api/auth/register  { name, email, password } */
  @Post('register')
  register(@Body() body: { name?: unknown; email?: unknown; password?: unknown }) {
    return this.auth.register(body);
  }

  /** POST /api/auth/login  { email, password } */
  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email?: unknown; password?: unknown }) {
    return this.auth.login(body);
  }

  /** POST /api/auth/verify-email  { token } — from the link in the confirmation email */
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() body: { token?: unknown }) {
    return this.auth.verifyEmail(body?.token);
  }

  /** POST /api/auth/resend-verification — sends the confirmation email again */
  @Post('resend-verification')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  resend(@UserId() userId: string) {
    return this.auth.resendVerification(userId);
  }

  /** GET /api/auth/me — the logged-in user */
  @Get('me')
  @UseGuards(AuthGuard)
  me(@UserId() userId: string) {
    return this.auth.findPublic(userId);
  }
}
