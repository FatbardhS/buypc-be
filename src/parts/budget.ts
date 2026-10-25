import { BadRequestException, Injectable } from '@nestjs/common';
import { Part } from './part.entity';
import {
  CATEGORIES,
  CaseSpecs,
  Category,
  CoolerSpecs,
  CpuSpecs,
  GpuSpecs,
  MotherboardSpecs,
  PsuSpecs,
  RamSpecs,
  StorageSpecs,
} from './part.types';
import { PartsService } from './parts.service';
import { Prebuilt } from './prebuilts';
import { Selection, checkSelection, estimatePower, issuesFor } from '../compatibility/compatibility';
import { USES, Use } from '../recommend/profile';

/**
 * How much each core part counts toward the build's score, per use.
 * CPU, graphics and memory get the money; the other parts only need to be decent.
 */
const WEIGHTS: Record<Use, { cpuGaming: number; cpuWork: number; gpu: number; ram: number }> = {
  gaming: { cpuGaming: 0.6, cpuWork: 0.1, gpu: 1, ram: 0.3 },
  creative: { cpuGaming: 0.1, cpuWork: 0.9, gpu: 0.7, ram: 0.5 },
  engineering: { cpuGaming: 0.1, cpuWork: 1, gpu: 0.6, ram: 0.5 },
  architecture: { cpuGaming: 0.1, cpuWork: 0.9, gpu: 0.9, ram: 0.5 },
  office: { cpuGaming: 0.2, cpuWork: 0.6, gpu: 0, ram: 0.3 },
};

/** Past these, a faster part doesn't make the job any better, so the cheaper one wins */
const CAPS: Record<Use, { cpuTier: number; ramGb: number }> = {
  gaming: { cpuTier: 5, ramGb: 32 },
  creative: { cpuTier: 5, ramGb: 64 },
  engineering: { cpuTier: 5, ramGb: 128 },
  architecture: { cpuTier: 5, ramGb: 128 },
  office: { cpuTier: 3, ramGb: 16 },
};

/** Uses that really need a graphics card (tier 2+); the cheapest cards are only display adapters */
const NEEDS_GPU: Use[] = ['gaming', 'architecture'];

/** Score lost per euro, so leftover money isn't spent on parts that are barely better */
const PRICE_PENALTY = 0.00003;

const MIN_BUDGET = 300;
const MAX_BUDGET = 20000;

const specs = <T>(part: Part) => part.specs as T;
const BUDGET_CHIPSET = /^(A\d{3}|H\d{3}|B840)$/;

const cpuGaming = (c: CpuSpecs) => c.gamingTier + c.boostGhz / 50;
const cpuWork = (c: CpuSpecs) => c.workTier + c.cores / 100;
const gpuPerf = (g?: GpuSpecs) => (g ? g.tier + g.vramGb / 64 : 0);
/** More memory helps less and less: 16GB is the big step, 64GB+ barely adds for most jobs */
function ramPerf(r: RamSpecs, capGb = Infinity): number {
  const gb = Math.min(r.capacityGb, capGb);
  const size = gb >= 96 ? 3.2 : gb >= 64 ? 3 : gb >= 32 ? 2.5 : gb >= 16 ? 1.5 : 0.5;
  return size + (r.capacityGb > capGb ? 0 : r.speedMts / 20000);
}
/** Each step up is worth less than the one before, so balanced builds beat lopsided ones */
const gain = (x: number) => Math.log1p(Math.max(0, x));

/** Keeps only parts no other part beats on every key while costing the same or less */
function paretoFront(parts: Part[], keys: (p: Part) => number[]): Part[] {
  const sorted = [...parts].sort((a, b) => a.price - b.price);
  const kept: Part[] = [];
  for (const p of sorted) {
    const k = keys(p);
    const beaten = kept.some((q) => keys(q).every((v, i) => v >= k[i]));
    if (!beaten) kept.push(p);
  }
  return kept;
}

/** Cheapest part that fits `selection`, preferring ones that pass `decent` */
function cheapest(parts: Part[], selection: Selection, decent: (p: Part) => boolean): Part | undefined {
  let fallback: Part | undefined;
  for (const p of parts) {
    if (issuesFor(p, selection).length) continue;
    if (decent(p)) return p;
    fallback ??= p;
  }
  return fallback;
}

/**
 * Builds the strongest compatible PC for a budget. Every CPU × graphics × memory combination worth
 * considering is tried; the other parts are the cheapest ones that are still decent (bronze PSU,
 * NVMe SSD, a cooler with headroom…). The best-scoring build that fits the budget wins.
 */
@Injectable()
export class BudgetService {
  constructor(private readonly parts: PartsService) {}

  /**
   * `selection` holds parts the buyer already picked in the builder; they stay and the rest is
   * planned around them. `builtInGraphics` means they chose no graphics card. `cpuBrand` limits
   * the processors to AMD or Intel.
   */
  async build(rawBudget: unknown, rawUse: unknown, rawSelection?: unknown, builtIn?: unknown, rawBrand?: unknown): Promise<Prebuilt> {
    const budget = Number(rawBudget);
    if (!Number.isFinite(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) {
      throw new BadRequestException(`Budget must be between €${MIN_BUDGET} and €${MAX_BUDGET}`);
    }
    const use: Use = (USES as readonly string[]).includes(rawUse as string) ? (rawUse as Use) : 'gaming';
    const w = WEIGHTS[use];
    const cap = CAPS[use];
    const locked = await this.parts.resolveSelection(rawSelection, { skipMissing: true });
    const noGraphicsCard = builtIn === true;
    const brand = rawBrand === 'amd' || rawBrand === 'intel' ? rawBrand : undefined;

    const all = {} as Record<Category, Part[]>;
    await Promise.all(CATEGORIES.map(async (c) => (all[c] = await this.parts.findByCategory(c))));
    for (const c of CATEGORIES) if (locked[c]) all[c] = [locked[c]];
    if (noGraphicsCard) all.gpu = [];
    if (brand && !locked.cpu) {
      all.cpu = all.cpu.filter((p) => specs<CpuSpecs>(p).socket.startsWith('AM') === (brand === 'amd'));
    }

    // Per socket, so every platform keeps its own candidates (boards cost differently)
    const sockets = [...new Set(all.cpu.map((p) => specs<CpuSpecs>(p).socket))];
    const cpus = sockets.flatMap((socket) =>
      paretoFront(
        all.cpu.filter((p) => specs<CpuSpecs>(p).socket === socket),
        (p) => {
          const c = specs<CpuSpecs>(p);
          return [cpuGaming(c), cpuWork(c), Number(c.integratedGraphics), -c.tdpW];
        },
      ),
    );
    const gpus = paretoFront(all.gpu, (p) => [gpuPerf(specs<GpuSpecs>(p)), -specs<GpuSpecs>(p).lengthMm, -specs<GpuSpecs>(p).powerW]);

    let best: { score: number; price: number; selection: Selection } | undefined;
    /** Cheapest complete build with a real graphics card, to tell buyers what a gaming PC starts at */
    let cheapestRealGpu = Infinity;
    const caseCache = new Map<string, Part | undefined>();
    const psuCache = new Map<string, Part | undefined>();

    for (const cpu of cpus) {
      const c = specs<CpuSpecs>(cpu);
      const strongCpu = Math.max(c.gamingTier, c.workTier) >= 4;
      for (const memoryType of ['DDR4', 'DDR5'] as const) {
        const board = cheapest(
          all.motherboard.filter((b) => specs<MotherboardSpecs>(b).memoryType === memoryType),
          { cpu },
          (b) => {
            const m = specs<MotherboardSpecs>(b);
            return m.m2Slots >= 1 && m.maxMemoryGb >= 64 && (!strongCpu || !BUDGET_CHIPSET.test(m.chipset));
          },
        );
        if (!board) continue;
        const base: Selection = { motherboard: board, cpu };

        const cooler = cheapest(all.cooler, base, (k) => {
          const s = specs<CoolerSpecs>(k);
          return s.type === 'Air' && s.tdpRatingW >= c.tdpW * 1.3;
        });
        if (!cooler) continue;
        const storage = cheapest(all.storage, base, (s) => {
          const d = specs<StorageSpecs>(s);
          return d.interface === 'NVMe' && d.capacityGb >= 1000;
        });
        if (!storage) continue;

        const rams = paretoFront(
          all.ram.filter((r) => !issuesFor(r, { motherboard: board }).length),
          (r) => [ramPerf(specs<RamSpecs>(r))],
        );
        if (!rams.length) continue;

        const gpuChoices: (Part | undefined)[] = [...gpus];
        if (c.integratedGraphics && !locked.gpu) gpuChoices.unshift(undefined);

        for (const gpu of gpuChoices) {
          if (gpu && issuesFor(gpu, { ...base, cooler }).length) continue;
          const withGpu: Selection = { ...base, cooler, ...(gpu && { gpu }) };
          // Strong graphics cards get a Gold power supply and a roomy, airy case
          const highEnd = !!gpu && specs<GpuSpecs>(gpu).tier >= 3;

          const psuKey = `${cpu.id}:${gpu?.id ?? 0}`;
          if (!psuCache.has(psuKey)) {
            const { recommendedPsuW } = estimatePower(withGpu);
            psuCache.set(
              psuKey,
              cheapest(all.psu, withGpu, (p) => {
                const s = specs<PsuSpecs>(p);
                const efficient = highEnd ? /gold|platinum|titanium/i : /bronze|silver|gold|platinum|titanium/i;
                return efficient.test(s.efficiency) && s.wattage <= recommendedPsuW + 250;
              }),
            );
          }
          const psu = psuCache.get(psuKey);
          if (!psu) continue;

          const caseKey = `${board.id}:${cooler.id}:${gpu?.id ?? 0}:${psu.id}`;
          if (!caseCache.has(caseKey)) {
            caseCache.set(
              caseKey,
              cheapest(all.case, { ...withGpu, psu }, (k) => {
                const s = specs<CaseSpecs>(k);
                if (highEnd) return (s.size === 'Mid Tower' || s.size === 'Full Tower') && s.maxGpuLengthMm >= 340 && s.maxRadiatorMm >= 280;
                return s.size === 'Mid Tower' || (!gpu && s.size === 'Micro Tower');
              }),
            );
          }
          const pcCase = caseCache.get(caseKey);
          if (!pcCase) continue;

          const fixed = board.price + cpu.price + cooler.price + (gpu?.price ?? 0) + psu.price + pcCase.price + storage.price;
          if (gpu && specs<GpuSpecs>(gpu).tier >= 2) cheapestRealGpu = Math.min(cheapestRealGpu, fixed + rams[0].price);
          if (fixed + rams[0].price > budget) continue;

          // Best-value memory that still fits the budget
          const ramScore = (r: Part) => w.ram * gain(ramPerf(specs<RamSpecs>(r), cap.ramGb)) - r.price * PRICE_PENALTY;
          let ram = rams[0];
          for (const r of rams) if (fixed + r.price <= budget && ramScore(r) > ramScore(ram)) ram = r;

          const g = gpu && specs<GpuSpecs>(gpu);
          // A fast graphics card held back by a slow processor wastes money in games
          const bottleneck = w.gpu && g ? Math.max(0, g.tier - c.gamingTier - 1) * 0.6 * w.gpu : 0;
          const price = fixed + ram.price;
          const score =
            w.cpuGaming * gain(Math.min(cpuGaming(c), cap.cpuTier)) +
            w.cpuWork * gain(Math.min(cpuWork(c), cap.cpuTier)) +
            w.gpu * gain(gpuPerf(g)) +
            ramScore(ram) -
            bottleneck * 0.3 -
            fixed * PRICE_PENALTY;
          if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && price < best.price)) {
            best = { score, price, selection: { case: pcCase, motherboard: board, cpu, cooler, gpu, psu, ram, storage } };
          }
        }
      }
    }

    if (!best) {
      throw new BadRequestException(
        Object.keys(locked).length
          ? `With the parts you picked so far, a working PC costs more than €${Math.round(budget)}. Raise the budget or change a part.`
          : `We couldn't put a working PC together for €${Math.round(budget)}. Try a bigger budget.`,
      );
    }
    const selection = best.selection;
    // Safety net: the search only uses compatible parts, but check the whole build once more
    if (Object.keys(checkSelection(selection)).length) {
      throw new BadRequestException('Something went wrong putting the build together. Please try another budget.');
    }

    const builtInGraphics = !selection.gpu;
    const weakGpu = !selection.gpu || specs<GpuSpecs>(selection.gpu).tier < 2;
    const note =
      NEEDS_GPU.includes(use) && weakGpu && Number.isFinite(cheapestRealGpu)
        ? `€${Math.round(budget)} is tight for ${use}: this PC only gets a basic graphics card. From about €${Math.ceil(cheapestRealGpu / 10) * 10} you get one that really runs games and 3D.`
        : undefined;
    if (builtInGraphics) delete selection.gpu;
    const ram = specs<RamSpecs>(selection.ram!);
    const totalPrice = Math.round(best.price * 100) / 100;
    return {
      id: 'budget',
      name: `€${Math.round(budget)} build`,
      tagline: `Best ${use === 'office' ? 'office' : use} PC for €${Math.round(budget)}`,
      featured: false,
      profile: { uses: [use], resolution: '1440p', refreshHz: 144 },
      parts: selection,
      builtInGraphics,
      totalPrice,
      note,
      highlights: [
        selection.cpu!.name.replace(/\s*\(tray\)/i, ''),
        builtInGraphics ? 'Built-in graphics' : specs<GpuSpecs>(selection.gpu!).chip,
        `${ram.capacityGb}GB ${ram.memoryType}`,
      ],
    };
  }
}
