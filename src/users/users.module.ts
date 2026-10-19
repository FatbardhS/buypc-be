import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';

/** The users repository comes from the global AuthModule */
@Module({
  controllers: [UsersController],
})
export class UsersModule {}
