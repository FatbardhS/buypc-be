import type { Part } from '../parts/part.entity';
import type {
  CaseSpecs,
  CoolerSpecs,
  CpuSpecs,
  GpuSpecs,
  MotherboardSpecs,
  PsuSpecs,
  RamSpecs,
  StorageSpecs,
} from '../parts/part.types';
import { estimatePower, Selection } from '../compatibility/compatibility';
import { Range, Targets } from './profile';

/**
 * How well a part suits what the buyer needs.
 * - good: right for the job
 * - overkill: works, but costs more than needed
 * - weak: works, but too slow / too small for the job
 * - other: not the processor brand the buyer asked for
 */
export type FitLevel = 'good' | 'overkill' | 'weak' | 'other';

export interface Fit {
  level: FitLevel;
  /** One plain-language sentence for non-technical buyers */
  note: string;
  /** Distance from the ideal; lower is better. Used to pick the recommended part. */
  score: number;
}

const specs = <T>(part: Part) => part.specs as T;

function rate(value: number, range: Range, aim = range.ideal): { level: FitLevel; score: number } {
  if (value < range.min) return { level: 'weak', score: 100 + (range.min - value) };
  if (value > range.max) return { level: 'overkill', score: 50 + (value - range.max) };
  return { level: 'good', score: Math.abs(value - aim) };
}

/**
 * What to aim for inside the "good" range. Office: the ideal (cheapest that's enough).
 * Demanding uses: one class above the ideal, so the PC is strong rather than just enough.
 * `cap` keeps flagship prices for when the job really needs them (4K, top refresh rates).
 */
function aimFor(range: Range, t: Targets, cap = 5): number {
  if (!t.performance) return range.ideal;
  return Math.min(range.max, Math.max(range.ideal, Math.min(cap, range.ideal + 1)));
}

/** Budget motherboard chipsets (AMD A-series and B840, Intel H-series) */
const BUDGET_CHIPSET = /^(A\d{3}|H\d{3}|B840)$/;
/** 0 = Gold or better, higher = cheaper power supply */
const efficiencyPenalty = (e: string) => (/gold|platinum|titanium/i.test(e) ? 0 : /bronze/i.test(e) ? 1 : 2);

const BRAND_NAMES = { amd: 'AMD', intel: 'Intel' } as const;
const socketBrand = (socket: string): 'amd' | 'intel' => (socket.startsWith('AM') ? 'amd' : 'intel');

const gb = (n: number) => (n >= 1000 ? `${n / 1000}TB` : `${n}GB`);

/** Extra catalog knowledge some steps need to look ahead (e.g. which processors a board allows). */
export interface FitContext {
  /** Per socket: the best processor for the job (fit score and price), if any is good enough */
  bestCpuBySocket?: Map<string, { score: number; price: number; name: string }>;
}

/** For each socket, the best-fitting processor the buyer could put in it. */
export function bestCpuBySocket(cpus: Part[], t: Targets): Map<string, { score: number; price: number; name: string }> {
  const best = new Map<string, { score: number; price: number; name: string }>();
  for (const cpu of cpus) {
    const fit = fitFor(cpu, t, {});
    if (fit.level !== 'good') continue;
    const socket = specs<CpuSpecs>(cpu).socket;
    const current = best.get(socket);
    if (!current || fit.score < current.score || (fit.score === current.score && cpu.price < current.price)) {
      best.set(socket, { score: fit.score, price: cpu.price, name: cpu.name });
    }
  }
  return best;
}

/** Fit of `part` for the buyer's needs, given the parts already picked in earlier steps. */
export function fitFor(part: Part, t: Targets, earlier: Selection, ctx: FitContext = {}): Fit {
  const job = t.label;

  switch (part.category) {
    case 'case': {
      const c = specs<CaseSpecs>(part);
      if (t.gpuTier.ideal >= 4 && (c.maxGpuLengthMm < 340 || c.maxRadiatorMm < 280)) {
        return { level: 'weak', note: `Tight on space for the big graphics card and cooling ${job} needs`, score: 100 };
      }
      if (t.gpuTier.max === 0) {
        const compact = c.size === 'Micro Tower' || c.size === 'Small Form Factor';
        return compact
          ? { level: 'good', note: 'Compact and affordable, perfect for an office PC', score: 0 }
          : { level: 'good', note: 'Roomy case, more space than an office PC needs', score: 1 };
      }
      if (t.performance) {
        // Room for a long graphics card and a big radiator
        const score = (c.maxGpuLengthMm >= 360 ? 0 : 1) + (c.maxRadiatorMm >= 360 ? 0 : 1);
        return { level: 'good', note: `Good airflow and plenty of room for ${job}`, score };
      }
      return { level: 'good', note: `Good airflow and plenty of room for ${job}`, score: c.maxGpuLengthMm >= 360 ? 0 : 1 };
    }

    case 'motherboard': {
      const m = specs<MotherboardSpecs>(part);
      if (t.cpuBrand && socketBrand(m.socket) !== t.cpuBrand) {
        const brand = BRAND_NAMES[socketBrand(m.socket)];
        return { level: 'other', note: `For ${brand} processors; you chose ${BRAND_NAMES[t.cpuBrand]}`, score: 200 };
      }
      if (m.maxMemoryGb < t.ramGb.ideal) {
        return { level: 'weak', note: `Holds at most ${m.maxMemoryGb}GB memory; ${job} works best with ${t.ramGb.ideal}GB`, score: 100 };
      }
      // The board decides the processor socket, so look ahead at the processors it allows
      let score = 0;
      if (ctx.bestCpuBySocket) {
        const cpu = ctx.bestCpuBySocket.get(m.socket);
        if (!cpu) {
          return { level: 'weak', note: `The processors that fit this board are too slow for ${job}`, score: 100 };
        }
        // Prefer the platform with the best processor for the job, then the cheapest board + processor
        score = cpu.score + (part.price + cpu.price) / 10000;
      }
      if (t.performance) {
        // Budget A/H chipsets cut corners (power delivery, fewer M.2 slots, no tuning)
        if (BUDGET_CHIPSET.test(m.chipset)) score += 1;
      }
      if (t.gpuTier.max === 0 && part.price > 200) {
        return { level: 'overkill', note: 'Lots of extra features an office PC won\'t use', score: 50 + score };
      }
      return { level: 'good', note: `Has everything ${job} needs, and fits a great processor for it`, score };
    }

    case 'cpu': {
      const c = specs<CpuSpecs>(part);
      if (t.cpuBrand && socketBrand(c.socket) !== t.cpuBrand) {
        return { level: 'other', note: `An ${BRAND_NAMES[socketBrand(c.socket)]} processor; you chose ${BRAND_NAMES[t.cpuBrand]}`, score: 200 };
      }
      const ratings = [
        t.cpuGaming && rate(c.gamingTier, t.cpuGaming, aimFor(t.cpuGaming, t)),
        t.cpuWork && rate(c.workTier, t.cpuWork, aimFor(t.cpuWork, t)),
      ].filter((x): x is { level: FitLevel; score: number } => !!x);
      const level: FitLevel = ratings.some((x) => x.level === 'weak')
        ? 'weak'
        : ratings.some((x) => x.level === 'good')
          ? 'good'
          : 'overkill';
      let score = ratings.reduce((s, x) => s + x.score, 0);
      let note =
        level === 'weak' ? `Too slow for ${job}`
        : level === 'overkill' ? `More power than ${job} needs, so you can save money`
        : `Fast enough for ${job}`;

      // Without a graphics card in the plan, the CPU must have built-in graphics
      if (t.gpuTier.max === 0) {
        if (c.integratedGraphics) {
          note += '. Has built-in graphics, so no graphics card needed';
        } else {
          score += 3;
          note += '. No built-in graphics, so you\'d also need a graphics card';
        }
      }
      return { level, note, score };
    }

    case 'cooler': {
      const c = specs<CoolerSpecs>(part);
      const cpu = earlier.cpu ? specs<CpuSpecs>(earlier.cpu) : undefined;
      const tdp = cpu?.tdpW ?? 65;
      if (c.type === 'Liquid' && tdp < 150) {
        return { level: 'overkill', note: 'An air cooler is enough for your processor', score: 50 };
      }
      if (t.performance) {
        // More cooling headroom = quieter and faster under long loads
        // About twice the processor's heat: quiet under long loads without paying for more
        const aim = Math.min(280, Math.max(180, tdp * 2));
        if (c.tdpRatingW < tdp * 1.3) return { level: 'weak', note: 'Only just enough for your processor; it will run loud', score: 100 };
        return { level: 'good', note: 'Keeps your processor cool and quiet under heavy load', score: Math.abs(Math.min(c.tdpRatingW, 300) - aim) / 100 };
      }
      if (c.type === 'Air' && c.tdpRatingW > Math.max(tdp * 2.5, 180)) {
        return { level: 'overkill', note: 'Bigger than your processor needs', score: 50 };
      }
      return { level: 'good', note: 'Keeps your processor cool and quiet', score: 0 };
    }

    case 'gpu': {
      const g = specs<GpuSpecs>(part);
      if (t.gpuTier.max === 0) {
        const hasBuiltIn = earlier.cpu && specs<CpuSpecs>(earlier.cpu).integratedGraphics;
        if (hasBuiltIn) {
          return { level: 'overkill', note: 'Not needed: your processor\'s built-in graphics handle office work', score: 50 + g.tier };
        }
        return g.tier <= 2
          ? { level: 'good', note: 'Your processor has no built-in graphics, so a basic card is enough', score: g.tier }
          : { level: 'overkill', note: `Far more than ${job} needs`, score: 50 + g.tier };
      }
      const { level, score } = rate(g.tier, t.gpuTier, aimFor(t.gpuTier, t, t.gpuTier.ideal >= 5 ? 5 : 4));
      let note =
        level === 'weak' ? `Too slow for ${job}`
        : level === 'overkill' ? `More power than ${job} needs, so you can save money`
        : `Runs ${job} smoothly`;
      let extra = 0;
      if (t.minVramGb && g.vramGb < t.minVramGb && level !== 'weak') {
        note += `. Only ${g.vramGb}GB video memory; big scenes work better with ${t.minVramGb}GB+`;
        extra = 2;
      }
      return { level, note, score: score + extra };
    }

    case 'psu': {
      const p = specs<PsuSpecs>(part);
      const { recommendedPsuW } = estimatePower(earlier);
      if (p.wattage > Math.max(recommendedPsuW + 300, recommendedPsuW * 1.4)) {
        return { level: 'overkill', note: `More power than your parts need (${recommendedPsuW}W is enough)`, score: 50 };
      }
      let score = (p.wattage - recommendedPsuW) / 100;
      if (t.performance) score += efficiencyPenalty(p.efficiency) * 2 + (p.modular === 'No' ? 0.5 : 0);
      return { level: 'good', note: 'Enough safe power for your parts, with room to spare', score };
    }

    case 'ram': {
      const r = specs<RamSpecs>(part);
      // Strong builds get at least 32GB; 64GB+ only where the job's ideal already asks for it
      const aim = t.performance ? Math.min(t.ramGb.max, Math.max(t.ramGb.ideal, 32)) : t.ramGb.ideal;
      const { level, score } = rate(r.capacityGb, t.ramGb, aim);
      const note =
        level === 'weak' ? `Not enough RAM for ${job} (we suggest ${t.ramGb.ideal}GB)`
        : level === 'overkill' ? `More RAM than ${job} needs`
        : `${r.capacityGb}GB is right for ${job}`;
      return { level, note, score: score / 16 };
    }

    case 'storage': {
      const s = specs<StorageSpecs>(part);
      const { level, score } = rate(s.capacityGb, t.storageGb, t.performance ? t.storageGb.max : t.storageGb.ideal);
      let note =
        level === 'weak' ? `Small for ${job}; you may run out of space`
        : level === 'overkill' ? `More space than ${job} usually needs`
        : `${gb(s.capacityGb)} is plenty for ${job}`;
      let extra = 0;
      if (s.formFactor === '3.5"') {
        note += '. Hard drive: much slower, best as extra space next to an SSD';
        extra = 2;
      } else if (s.interface === 'SATA') {
        note += '. Slower than an NVMe drive';
        extra = 1;
      }
      return { level, note, score: score / 500 + extra };
    }
  }
}

/** Plain-language fit for the "no graphics card" choice (only offered when the CPU has built-in graphics). */
export function builtInGraphicsFit(t: Targets): Fit {
  if (t.gpuTier.max === 0) {
    return { level: 'good', note: 'Built-in graphics handle office work. No need to pay for a graphics card', score: 0 };
  }
  return { level: 'weak', note: `Built-in graphics are too slow for ${t.label}`, score: 100 };
}
