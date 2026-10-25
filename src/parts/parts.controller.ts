import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PrebuiltsService } from './prebuilts';
import { BudgetService } from './budget';
import { CATEGORIES, isCategory } from './part.types';

@Controller('parts')
export class PartsController {
  constructor(
    private readonly parts: PartsService,
    private readonly prebuilts: PrebuiltsService,
    private readonly budget: BudgetService,
  ) {}

  /** GET /api/parts/prebuilts — the home page's ready-made builds, assembled from the live catalog */
  @Get('prebuilts')
  prebuiltList() {
    return this.prebuilts.list();
  }

  /**
   * POST /api/parts/budget  { budget: 1300, use?: 'gaming', selection?: { case: 3 }, builtInGraphics?: true, cpuBrand?: 'amd' }
   * — the strongest compatible PC for that money, keeping any parts already picked
   */
  @Post('budget')
  budgetBuild(@Body() body: { budget?: unknown; use?: unknown; selection?: unknown; builtInGraphics?: unknown; cpuBrand?: unknown }) {
    return this.budget.build(body?.budget, body?.use, body?.selection, body?.builtInGraphics, body?.cpuBrand);
  }

  /**
   * POST /api/parts/lookup  { ids: [12, 40] } — the current version of these parts. Parts no longer
   * sold are simply missing, so the site can drop them from saved builds and carts.
   */
  @Post('lookup')
  lookup(@Body() body: { ids?: unknown }) {
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length > 100 || !ids.every((id) => Number.isInteger(id))) {
      throw new BadRequestException('ids must be a list of at most 100 part ids');
    }
    return this.parts.findByIds(ids as number[]);
  }

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
