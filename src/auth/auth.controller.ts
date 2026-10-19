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

  /** GET /api/auth/me — the logged-in user */
  @Get('me')
  @UseGuards(AuthGuard)
  me(@UserId() userId: string) {
    return this.auth.findPublic(userId);
  }
}
