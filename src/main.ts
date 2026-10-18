import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(','),
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`BYPC API running on http://localhost:${port}/api`);
}
bootstrap();
