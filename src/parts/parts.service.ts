import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Part } from './part.entity';
import { CATEGORIES, Category, isCategory } from './part.types';
import { Selection, estimatePower, issuesFor } from '../compatibility/compatibility';

/** What the client sends: the id of the part picked in each category */
export type SelectionIds = Partial<Record<Category, number>>;

export interface PartOption {
  part: Part;
  compatible: boolean;
  issues: string[];
}

@Injectable()
export class PartsService {
  constructor(@InjectRepository(Part) private readonly parts: Repository<Part>) {}

  findByCategory(category: Category): Promise<Part[]> {
    return this.parts.find({ where: { category }, order: { price: 'ASC' } });
  }

  /** Turns `{ case: 3, cpu: 12 }` into full Part objects, checking each id belongs to its category. */
  async resolveSelection(ids: unknown): Promise<Selection> {
    if (ids === undefined || ids === null) return {};
    if (typeof ids !== 'object' || Array.isArray(ids)) {
      throw new BadRequestException('selection must be an object of { category: partId }');
    }

    const entries = Object.entries(ids as Record<string, unknown>).filter(([, id]) => id !== null && id !== undefined);
    for (const [category, id] of entries) {
      if (!isCategory(category)) throw new BadRequestException(`Unknown category "${category}"`);
      if (!Number.isInteger(id)) throw new BadRequestException(`Part id for "${category}" must be an integer`);
    }
    if (!entries.length) return {};

    const found = await this.parts.findBy({ id: In(entries.map(([, id]) => id as number)) });
    const byId = new Map(found.map((p) => [p.id, p]));

    const selection: Selection = {};
    for (const [category, id] of entries) {
      const part = byId.get(id as number);
      if (!part || part.category !== category) {
        throw new BadRequestException(`Part ${id} is not a valid ${category}`);
      }
      selection[category as Category] = part;
    }
    return selection;
  }

  /** Every part in a category, marked compatible or not with the current picks (compatible first). */
  async options(category: Category, ids: unknown) {
    const selection = await this.resolveSelection(ids);
    // Only parts picked in earlier steps constrain this step
    const earlier: Selection = {};
    for (const prev of CATEGORIES.slice(0, CATEGORIES.indexOf(category))) {
      if (selection[prev]) earlier[prev] = selection[prev];
    }

    const parts = await this.findByCategory(category);
    const options: PartOption[] = parts.map((part) => {
      const issues = issuesFor(part, earlier);
      return { part, compatible: issues.length === 0, issues };
    });
    options.sort((a, b) => Number(b.compatible) - Number(a.compatible));

    return { category, options, power: estimatePower(earlier) };
  }
}
