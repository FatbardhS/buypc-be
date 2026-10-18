import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PartsService } from './parts.service';
import { CATEGORIES, isCategory } from './part.types';

@Controller('parts')
export class PartsController {
  constructor(private readonly parts: PartsService) {}

  @Get('categories')
  categories() {
    return CATEGORIES;
  }

  /** GET /api/parts?category=case */
  @Get()
  list(@Query('category') category: string) {
    if (!isCategory(category)) {
      throw new BadRequestException(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
    return this.parts.findByCategory(category);
  }

  /** POST /api/parts/options  { category: 'cpu', selection: { case: 1, motherboard: 9 }, profile?: { uses: ['gaming'], resolution: '1440p' } } */
  @Post('options')
  options(@Body() body: { category?: string; selection?: unknown; profile?: unknown }) {
    if (!isCategory(body?.category)) {
      throw new BadRequestException(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
    return this.parts.options(body.category, body.selection, body.profile);
  }
}
