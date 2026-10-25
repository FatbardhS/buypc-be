import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Build } from './build.entity';
import { User, hasDeliveryInfo } from '../users/user.entity';
import { PartsService } from '../parts/parts.service';
import { CATEGORIES, CpuSpecs } from '../parts/part.types';
import { checkSelection, estimatePower, noteSelection, Selection } from '../compatibility/compatibility';

@Injectable()
export class BuildsService {
  constructor(
    @InjectRepository(Build) private readonly builds: Repository<Build>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly parts: PartsService,
  ) {}

  private summarize(selection: Selection) {
    const totalPrice = Math.round(
      CATEGORIES.reduce((sum, c) => sum + (selection[c]?.price ?? 0), 0) * 100,
    ) / 100;
    return { issues: checkSelection(selection), notes: noteSelection(selection), power: estimatePower(selection), totalPrice };
  }

  /** Validates a (possibly partial) build without saving it. */
  async check(ids: unknown) {
    return this.summarize(await this.parts.resolveSelection(ids, { skipMissing: true }));
  }

  /** Every order needs a confirmed email and somewhere to deliver it */
  private async assertCanOrder(userId: string): Promise<void> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('Please log in again');
    if (!user.emailVerified) {
      throw new BadRequestException({ message: 'Confirm your email before ordering. Check your inbox for the link.', code: 'EMAIL_NOT_VERIFIED' });
    }
    if (!hasDeliveryInfo(user)) {
      throw new BadRequestException({ message: 'Add your phone, address and city in My info before ordering', code: 'DELIVERY_INFO_MISSING' });
    }
  }

  /**
   * Orders loose parts from the parts shop (the cart). Prices always come from the catalog,
   * never from the client.
   */
  async createPartsOrder(userId: string, rawItems: unknown): Promise<Build> {
    await this.assertCanOrder(userId);
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw new BadRequestException('Your cart is empty');
    if (rawItems.length > 30) throw new BadRequestException('Too many different parts in one order (max 30)');

    const wanted = new Map<number, number>();
    for (const item of rawItems as { partId?: unknown; quantity?: unknown }[]) {
      const id = item?.partId;
      const qty = item?.quantity ?? 1;
      if (!Number.isInteger(id) || !Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > 10) {
        throw new BadRequestException('Each item needs a part id and a quantity from 1 to 10');
      }
      wanted.set(id as number, Math.min(10, (wanted.get(id as number) ?? 0) + (qty as number)));
    }

    const found = await this.parts.findByIds([...wanted.keys()]);
    if (found.length !== wanted.size) throw new BadRequestException('Some parts in your cart are no longer sold. Remove them and try again.');

    const items = found
      .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category))
      .map((part) => ({ category: part.category, partId: part.id, brand: part.brand, name: part.name, price: part.price, quantity: wanted.get(part.id)! }));
    const totalPrice = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
    const count = items.reduce((n, i) => n + i.quantity, 0);

    return this.builds.save(
      this.builds.create({
        userId,
        kind: 'parts',
        name: count === 1 ? `${items[0].brand} ${items[0].name}`.slice(0, 120) : `Parts order (${count} items)`,
        items,
        totalPrice,
        estimatedPowerW: 0,
      }),
    );
  }

  /** Saves a finished build as an order. Rejects missing or incompatible parts. */
  async create(userId: string, ids: unknown, name?: string): Promise<Build> {
    await this.assertCanOrder(userId);

    const selection = await this.parts.resolveSelection(ids);

    // A graphics card is optional when the processor has built-in graphics
    const builtInGraphics = !!(selection.cpu?.specs as CpuSpecs | undefined)?.integratedGraphics;
    const missing = CATEGORIES.filter((c) => !selection[c] && !(c === 'gpu' && builtInGraphics));
    if (missing.length) {
      throw new BadRequestException(`Pick a part for: ${missing.join(', ')}`);
    }

    const { issues, power, totalPrice } = this.summarize(selection);
    if (Object.keys(issues).length) {
      throw new BadRequestException({ message: 'Build has incompatible parts', issues });
    }

    const build = this.builds.create({
      userId,
      name: (typeof name === 'string' && name.trim().slice(0, 120)) || `My ${selection.cpu!.name} build`,
      items: CATEGORIES.filter((category) => selection[category]).map((category) => {
        const part = selection[category]!;
        return { category, partId: part.id, brand: part.brand, name: part.name, price: part.price };
      }),
      totalPrice,
      estimatedPowerW: power.estimatedW,
    });
    return this.builds.save(build);
  }

  findAll(userId: string): Promise<Build[]> {
    return this.builds.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: string, id: string): Promise<Build> {
    const build = await this.builds.findOneBy({ id, userId });
    if (!build) throw new NotFoundException('Build not found');
    return build;
  }
}
