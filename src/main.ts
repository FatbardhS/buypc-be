import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`BYPC API running on http://localhost:${port}/api`);
}
bootstrap();
