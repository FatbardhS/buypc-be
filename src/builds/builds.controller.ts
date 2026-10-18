import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { BuildsService } from './builds.service';

@Controller('builds')
export class BuildsController {
  constructor(private readonly builds: BuildsService) {}

  /** POST /api/builds/check  { selection: { case: 1, motherboard: 9, ... } } */
  @Post('check')
  check(@Body() body: { selection?: unknown }) {
    return this.builds.check(body?.selection);
  }

  /** POST /api/builds  { name?: string, selection: { ...all 8 categories } } */
  @Post()
  create(@Body() body: { selection?: unknown; name?: string }) {
    return this.builds.create(body?.selection, body?.name);
  }

  @Get()
  findAll() {
    return this.builds.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.builds.findOne(id);
  }
}
