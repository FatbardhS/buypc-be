import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/** Rejects requests without a valid `Authorization: Bearer <token>` and puts the user id on the request. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { userId?: string }>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Please log in');

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; purpose?: string }>(token);
      // Email-confirmation tokens are not login tokens
      if (payload.purpose) throw new Error('wrong token type');
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Your session has expired, please log in again');
    }
  }
}

/** The logged-in user's id. Only use behind AuthGuard. */
export const UserId = createParamDecorator(
  (_: unknown, context: ExecutionContext) => context.switchToHttp().getRequest().userId as string,
);
