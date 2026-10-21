import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Part } from './part.entity';
import { CATEGORIES, Category, CpuSpecs, isCategory } from './part.types';
import { Selection, estimatePower, issuesFor, notesFor } from '../compatibility/compatibility';
import { buildTargets, parseProfile } from '../recommend/profile';
import { Fit, FitContext, bestCpuBySocket, builtInGraphicsFit, fitFor } from '../recommend/fit';

/** What the client sends: the id of the part picked in each category */
export type SelectionIds = Partial<Record<Category, number>>;

export interface PartOption {
  part: Part;
  compatible: boolean;
  issues: string[];
  /** Heads-ups that don't block the pick (e.g. may need a BIOS update) */
  notes: string[];
  fit?: Fit;
  recommended: boolean;
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

  /**
   * Every part in a category, marked compatible or not with the current picks (compatible first).
   * With a profile ("what is this PC for?") each part also gets a plain-language fit, and the
   * single best match is flagged `recommended` and moved to the top.
   */
  async options(category: Category, ids: unknown, rawProfile?: unknown) {
    const selection = await this.resolveSelection(ids);
    // Only parts picked in earlier steps constrain this step
    const earlier: Selection = {};
    for (const prev of CATEGORIES.slice(0, CATEGORIES.indexOf(category))) {
      if (selection[prev]) earlier[prev] = selection[prev];
    }

    const profile = parseProfile(rawProfile);
    const targets = profile && buildTargets(profile);

    // The motherboard step looks ahead: a board is only as good as the processors it accepts
    const ctx: FitContext = {};
    if (targets && category === 'motherboard') {
      ctx.bestCpuBySocket = bestCpuBySocket(await this.findByCategory('cpu'), targets);
    }

    const parts = await this.findByCategory(category);
    const options: PartOption[] = parts.map((part) => {
      const issues = issuesFor(part, earlier);
      return {
        part,
        compatible: issues.length === 0,
        issues,
        notes: issues.length ? [] : notesFor(part, earlier),
        fit: targets && fitFor(part, targets, earlier, ctx),
        recommended: false,
      };
    });
    options.sort((a, b) => Number(b.compatible) - Number(a.compatible));

    // "No graphics card" is a valid choice when the processor has built-in graphics
    const cpu = earlier.cpu?.specs as CpuSpecs | undefined;
    const builtInGraphics =
      category === 'gpu' && cpu?.integratedGraphics
        ? { available: true, fit: targets && builtInGraphicsFit(targets), recommended: false }
        : undefined;

    if (targets) {
      const candidates = options.filter((o) => o.compatible && o.fit && o.fit.level !== 'weak' && o.fit.level !== 'other');
      const rank = (fit: Fit, price: number) => [fit.level === 'good' ? 0 : 1, fit.score, price];
      const better = (a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
      let best: PartOption | undefined;
      for (const o of candidates) {
        if (!best || better(rank(o.fit!, o.part.price), rank(best.fit!, best.part.price)) < 0) best = o;
      }

      if (builtInGraphics?.fit?.level === 'good' && (!best || best.fit!.level !== 'good' || best.fit!.score > 0)) {
        builtInGraphics.recommended = true;
      } else if (best) {
        best.recommended = true;
        options.splice(options.indexOf(best), 1);
        options.unshift(best);
      }
    }

    return { category, options, power: estimatePower(earlier), builtInGraphics, useLabel: targets?.label };
  }
}
