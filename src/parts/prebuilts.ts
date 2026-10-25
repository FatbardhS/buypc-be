import { Injectable } from '@nestjs/common';
import { Part } from './part.entity';
import { CATEGORIES, Category, GpuSpecs, RamSpecs } from './part.types';
import { PartsService } from './parts.service';
import type { Profile } from '../recommend/profile';

interface PrebuiltDefinition {
  id: string;
  name: string;
  /** What it's for, shown under the name */
  tagline: string;
  /** Same questions the builder asks; the parts are whatever the builder recommends for them */
  profile: Profile;
  featured?: boolean;
}

/** The prebuilt picks on the home page */
const PREBUILTS: PrebuiltDefinition[] = [
  { id: 'creator-pro', name: 'Prism', tagline: 'Video & photo editing', profile: { uses: ['creative'], resolution: '1440p' }, featured: true },
  { id: 'starter', name: 'Spark', tagline: '1080p gaming', profile: { uses: ['gaming'], resolution: '1080p', refreshHz: 144 } },
  { id: 'ultra-4k', name: 'Titan', tagline: '4K gaming & streaming', profile: { uses: ['gaming'], resolution: '4k', refreshHz: 144 } },
  { id: 'allrounder', name: 'Vortex', tagline: '1440p gaming', profile: { uses: ['gaming'], resolution: '1440p', refreshHz: 144 } },
  { id: 'workstation', name: 'Atlas', tagline: '3D, video & AI', profile: { uses: ['architecture'], resolution: '1440p' } },
];

export interface Prebuilt {
  id: string;
  name: string;
  tagline: string;
  featured: boolean;
  profile: Profile;
  /** One part per category; no graphics card when the processor's built-in graphics are recommended */
  parts: Partial<Record<Category, Part>>;
  builtInGraphics: boolean;
  totalPrice: number;
  /** Heads-up for the buyer, e.g. when a budget is too tight for the job */
  note?: string;
  /** Short headline specs, e.g. ["Ryzen 9 7900X", "Radeon RX 7800 XT", "32GB DDR5"] */
  highlights: string[];
}

/** Rebuild at most every 10 minutes per server instance (prices change slowly) */
const CACHE_MS = 10 * 60 * 1000;

@Injectable()
export class PrebuiltsService {
  private cache?: { at: number; value: Promise<Prebuilt[]> };

  constructor(private readonly parts: PartsService) {}

  list(): Promise<Prebuilt[]> {
    if (!this.cache || Date.now() - this.cache.at > CACHE_MS) {
      const value = Promise.all(PREBUILTS.map((d) => this.assemble(d)));
      this.cache = { at: Date.now(), value };
      value.catch(() => (this.cache = undefined));
    }
    return this.cache.value;
  }

  /** Walks the builder's steps and takes the recommended part each time, so every pick fits the others */
  private async assemble(def: PrebuiltDefinition): Promise<Prebuilt> {
    const picked: Partial<Record<Category, Part>> = {};
    const ids: Partial<Record<Category, number>> = {};
    let builtInGraphics = false;

    for (const category of CATEGORIES) {
      const res = await this.parts.options(category, ids, def.profile);
      if (category === 'gpu' && res.builtInGraphics?.recommended) {
        builtInGraphics = true;
        continue;
      }
      const choice = res.options.find((o) => o.recommended) ?? res.options.find((o) => o.compatible);
      if (!choice) throw new Error(`No compatible ${category} for prebuilt ${def.id}`);
      picked[category] = choice.part;
      ids[category] = choice.part.id;
    }

    const totalPrice = Math.round(CATEGORIES.reduce((sum, c) => sum + (picked[c]?.price ?? 0), 0) * 100) / 100;
    const ram = picked.ram?.specs as RamSpecs | undefined;
    const highlights = [
      picked.cpu?.name.replace(/\s*\(tray\)/i, ''),
      builtInGraphics ? 'Built-in graphics' : (picked.gpu?.specs as GpuSpecs | undefined)?.chip,
      ram && `${ram.capacityGb}GB ${ram.memoryType}`,
    ].filter((x): x is string => !!x);

    return {
      id: def.id,
      name: def.name,
      tagline: def.tagline,
      featured: !!def.featured,
      profile: def.profile,
      parts: picked,
      builtInGraphics,
      totalPrice,
      highlights,
    };
  }
}
