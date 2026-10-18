import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Build } from './build.entity';
import { PartsService } from '../parts/parts.service';
import { CATEGORIES } from '../parts/part.types';
import { checkSelection, estimatePower, Selection } from '../compatibility/compatibility';

@Injectable()
export class BuildsService {
  constructor(
    @InjectRepository(Build) private readonly builds: Repository<Build>,
    private readonly parts: PartsService,
  ) {}

  private summarize(selection: Selection) {
    const totalPrice = Math.round(
      CATEGORIES.reduce((sum, c) => sum + (selection[c]?.price ?? 0), 0) * 100,
    ) / 100;
    return { issues: checkSelection(selection), power: estimatePower(selection), totalPrice };
  }

  /** Validates a (possibly partial) build without saving it. */
  async check(ids: unknown) {
    return this.summarize(await this.parts.resolveSelection(ids));
  }

  /** Saves a finished build as an order. Rejects missing or incompatible parts. */
  async create(ids: unknown, name?: string): Promise<Build> {
    const selection = await this.parts.resolveSelection(ids);

    const missing = CATEGORIES.filter((c) => !selection[c]);
    if (missing.length) {
      throw new BadRequestException(`Pick a part for: ${missing.join(', ')}`);
    }

    const { issues, power, totalPrice } = this.summarize(selection);
    if (Object.keys(issues).length) {
      throw new BadRequestException({ message: 'Build has incompatible parts', issues });
    }

    const build = this.builds.create({
      name: (typeof name === 'string' && name.trim().slice(0, 120)) || `My ${selection.cpu!.name} build`,
      items: CATEGORIES.map((category) => {
        const part = selection[category]!;
        return { category, partId: part.id, brand: part.brand, name: part.name, price: part.price };
      }),
      totalPrice,
      estimatedPowerW: power.estimatedW,
    });
    return this.builds.save(build);
  }

  findAll(): Promise<Build[]> {
    return this.builds.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Build> {
    const build = await this.builds.findOneBy({ id });
    if (!build) throw new NotFoundException('Build not found');
    return build;
  }
}
