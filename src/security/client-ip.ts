import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The visitor's IP address. Vercel sets x-real-ip / x-forwarded-for itself (clients can't
 * override them there); locally it falls back to the socket address.
 */
export function clientIp(request: Request): string {
  const header = (name: string) => {
    const value = request.headers[name];
    return (Array.isArray(value) ? value[0] : value)?.split(',')[0].trim();
  };
  return header('x-vercel-forwarded-for') || header('x-real-ip') || header('x-forwarded-for') || request.socket.remoteAddress || 'unknown';
}

export const ClientIp = createParamDecorator((_: unknown, context: ExecutionContext) =>
  clientIp(context.switchToHttp().getRequest<Request>()),
);
