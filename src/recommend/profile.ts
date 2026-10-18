/** What the buyer will use the PC for. Drives which parts we recommend (never which parts are allowed). */
export const USES = ['office', 'gaming', 'creative', 'engineering', 'architecture'] as const;
export type Use = (typeof USES)[number];

export const RESOLUTIONS = ['1080p', '1440p', '4k'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

/** Monitor refresh rates offered for gaming */
export const REFRESH_RATES = [60, 144, 240, 360, 500, 600] as const;
export type RefreshRate = (typeof REFRESH_RATES)[number];

/** Processor brand the buyer prefers (unset = either) */
export const CPU_BRANDS = ['amd', 'intel'] as const;
export type CpuBrand = (typeof CPU_BRANDS)[number];

export interface Profile {
  uses: Use[];
  /** Screen resolution: asked for gaming, video & photo, and architecture */
  resolution?: Resolution;
  /** Monitor refresh rate in Hz: asked for gaming only */
  refreshHz?: RefreshRate;
  cpuBrand?: CpuBrand;
}

/** A spec value is "weak" below min, "good" up to max, "overkill" above; ideal is the sweet spot. */
export interface Range {
  min: number;
  ideal: number;
  max: number;
}

export interface Targets {
  cpuGaming?: Range;
  cpuWork?: Range;
  /** 0 = no graphics card needed (built-in graphics) */
  gpuTier: Range;
  minVramGb?: number;
  ramGb: Range;
  storageGb: Range;
  /** Only recommend processors (and motherboards) of this brand */
  cpuBrand?: CpuBrand;
  /** Plain-language description, e.g. "gaming at 1440p · 240Hz" */
  label: string;
}

const r = (min: number, ideal: number, max: number): Range => ({ min, ideal, max });
const clamp = (n: number) => Math.min(5, Math.max(1, n));

/** Tier range centred on `ideal`, one step either side */
const around = (ideal: number, below = 1, above = 1): Range =>
  r(clamp(ideal - below), clamp(ideal), clamp(ideal + above));

const RES_LABEL: Record<Resolution, string> = { '1080p': '1080p', '1440p': '1440p', '4k': '4K' };

/**
 * Gaming: resolution sets how hard the graphics card works per frame, refresh rate sets how many
 * frames per second it (and the processor) must deliver. High refresh rates are processor-heavy.
 */
function gamingTargets(resolution: Resolution, hz: RefreshRate): Omit<Targets, 'label'> {
  const gpuBase = { '1080p': 2, '1440p': 3, '4k': 5 }[resolution];
  const gpuBoost = hz <= 60 ? -1 : hz <= 144 ? 0 : hz <= 360 ? 1 : 2;
  const gpuIdeal = clamp(gpuBase + gpuBoost);

  const cpuIdeal = hz <= 60 ? 2 : hz <= 144 ? 3 : hz <= 240 ? 4 : 5;

  const bigRam = resolution === '4k';
  const midRam = resolution === '1440p' || hz >= 240;
  return {
    cpuGaming: cpuIdeal === 5 ? r(4, 5, 5) : around(cpuIdeal, 1, 2),
    gpuTier: gpuIdeal === 5 ? r(4, 5, 5) : around(gpuIdeal),
    ramGb: bigRam ? r(32, 32, 64) : midRam ? r(16, 32, 32) : r(16, 16, 32),
    storageGb: resolution === '4k' ? r(1000, 2000, 2000) : r(1000, 1000, 2000),
  };
}

function targetsFor(use: Use, resolution: Resolution, hz: RefreshRate): Omit<Targets, 'label'> {
  switch (use) {
    case 'office':
      // Word, Excel, PowerPoint, browsing: built-in graphics and 16GB are plenty
      return { cpuWork: r(1, 1, 2), gpuTier: r(0, 0, 0), ramGb: r(8, 16, 16), storageGb: r(500, 500, 1000) };
    case 'gaming':
      return gamingTargets(resolution, hz);
    case 'creative':
      // Bigger screens mean bigger footage/photos: more graphics power, video memory and RAM
      if (resolution === '4k') return { cpuWork: r(3, 4, 5), gpuTier: around(4), minVramGb: 12, ramGb: r(32, 64, 128), storageGb: r(2000, 2000, 4000) };
      if (resolution === '1440p') return { cpuWork: r(3, 3, 5), gpuTier: r(2, 3, 4), ramGb: r(32, 32, 64), storageGb: r(1000, 2000, 2000) };
      return { cpuWork: r(2, 3, 4), gpuTier: r(2, 2, 3), ramGb: r(16, 32, 64), storageGb: r(1000, 1000, 2000) };
    case 'engineering':
      // CAD and simulation: lots of memory and a strong multi-core processor
      return { cpuWork: r(3, 4, 5), gpuTier: r(2, 2, 4), ramGb: r(64, 64, 128), storageGb: r(1000, 2000, 2000) };
    case 'architecture':
      // Rendering (Lumion, Twinmotion, Enscape, V-Ray GPU): the graphics card and its memory matter most
      if (resolution === '4k') return { cpuWork: r(3, 4, 5), gpuTier: r(4, 5, 5), minVramGb: 16, ramGb: r(64, 64, 128), storageGb: r(2000, 2000, 4000) };
      if (resolution === '1440p') return { cpuWork: r(3, 3, 5), gpuTier: around(4), minVramGb: 16, ramGb: r(32, 64, 128), storageGb: r(1000, 2000, 2000) };
      return { cpuWork: r(3, 3, 4), gpuTier: around(3), minVramGb: 12, ramGb: r(32, 32, 64), storageGb: r(1000, 2000, 2000) };
  }
}

function labelFor(use: Use, resolution: Resolution, hz: RefreshRate): string {
  const res = RES_LABEL[resolution];
  switch (use) {
    case 'office': return 'office work';
    case 'gaming': return `gaming at ${res} · ${hz}Hz`;
    case 'creative': return `video & photo editing on a ${res} screen`;
    case 'engineering': return 'engineering & CAD';
    case 'architecture': return `architecture & 3D on a ${res} screen`;
  }
}

const merge = (a: Range | undefined, b: Range | undefined): Range | undefined =>
  !a ? b : !b ? a : r(Math.max(a.min, b.min), Math.max(a.ideal, b.ideal), Math.max(a.max, b.max));

/** Targets for the profile. Several uses are combined (the most demanding wins), though the UI sends one. */
export function buildTargets(profile: Profile): Targets {
  const resolution = profile.resolution ?? '1440p';
  const hz = profile.refreshHz ?? 144;
  // Office work is covered by any other use, so it only counts on its own
  const uses = profile.uses.length > 1 ? profile.uses.filter((u) => u !== 'office') : profile.uses;

  let combined: Omit<Targets, 'label'> | undefined;
  for (const use of uses) {
    const t = targetsFor(use, resolution, hz);
    combined = !combined
      ? t
      : {
          cpuGaming: merge(combined.cpuGaming, t.cpuGaming),
          cpuWork: merge(combined.cpuWork, t.cpuWork),
          gpuTier: merge(combined.gpuTier, t.gpuTier)!,
          minVramGb: Math.max(combined.minVramGb ?? 0, t.minVramGb ?? 0) || undefined,
          ramGb: merge(combined.ramGb, t.ramGb)!,
          storageGb: merge(combined.storageGb, t.storageGb)!,
        };
  }

  const brand = profile.cpuBrand ? (profile.cpuBrand === 'amd' ? ' · AMD' : ' · Intel') : '';
  return {
    ...combined!,
    cpuBrand: profile.cpuBrand,
    label: uses.map((u) => labelFor(u, resolution, hz)).join(' and ') + brand,
  };
}

/** Validates the profile sent by the client. Returns undefined when there is none. */
export function parseProfile(raw: unknown): Profile | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { uses, resolution, refreshHz, cpuBrand } = raw as { uses?: unknown; resolution?: unknown; refreshHz?: unknown; cpuBrand?: unknown };
  if (!Array.isArray(uses)) return undefined;
  const valid = uses.filter((u): u is Use => (USES as readonly string[]).includes(u as string));
  if (!valid.length) return undefined;
  return {
    uses: [...new Set(valid)],
    resolution: (RESOLUTIONS as readonly string[]).includes(resolution as string) ? (resolution as Resolution) : undefined,
    refreshHz: (REFRESH_RATES as readonly number[]).includes(refreshHz as number) ? (refreshHz as RefreshRate) : undefined,
    cpuBrand: (CPU_BRANDS as readonly string[]).includes(cpuBrand as string) ? (cpuBrand as CpuBrand) : undefined,
  };
}
