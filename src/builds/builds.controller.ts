import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { BuildsService } from './builds.service';
import { AuthGuard, UserId } from '../auth/auth.guard';

@Controller('builds')
export class BuildsController {
  constructor(private readonly builds: BuildsService) {}

  /** POST /api/builds/check  { selection: { case: 1, motherboard: 9, ... } } */
  @Post('check')
  check(@Body() body: { selection?: unknown }) {
    return this.builds.check(body?.selection);
  }

  /** POST /api/builds/parts  { items: [{ partId, quantity }] } — the parts shop's cart */
  @Post('parts')
  @UseGuards(AuthGuard)
  createPartsOrder(@UserId() userId: string, @Body() body: { items?: unknown }) {
    return this.builds.createPartsOrder(userId, body?.items);
  }

  /** POST /api/builds  { name?: string, selection: { ...all 8 categories } } */
  @Post()
  @UseGuards(AuthGuard)
  create(@UserId() userId: string, @Body() body: { selection?: unknown; name?: string }) {
    return this.builds.create(userId, body?.selection, body?.name);
  }

  /** The logged-in user's orders */
  @Get()
  @UseGuards(AuthGuard)
  findAll(@UserId() userId: string) {
    return this.builds.findAll(userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.builds.findOne(userId, id);
  }
}
