/** What the buyer will use the PC for. Drives which parts we recommend (never which parts are allowed). */
export const USES = ['office', 'gaming', 'creative', 'engineering', 'architecture'] as const;
export type Use = (typeof USES)[number];

export const RESOLUTIONS = ['1080p', '1440p', '4k'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export interface Profile {
  uses: Use[];
  /** Only used for gaming */
  resolution?: Resolution;
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
  /** Plain-language description, e.g. "gaming at 1440p" */
  label: string;
}

const r = (min: number, ideal: number, max: number): Range => ({ min, ideal, max });

const LABELS: Record<Use, string> = {
  office: 'office work',
  gaming: 'gaming',
  creative: 'video & photo editing',
  engineering: 'engineering & CAD',
  architecture: 'architecture & 3D rendering',
};

function targetsFor(use: Use, resolution: Resolution): Omit<Targets, 'label'> {
  switch (use) {
    case 'office':
      // Word, Excel, PowerPoint, browsing: built-in graphics and 16GB are plenty
      return { cpuWork: r(1, 1, 2), gpuTier: r(0, 0, 0), ramGb: r(8, 16, 16), storageGb: r(500, 500, 1000) };
    case 'gaming':
      if (resolution === '4k') return { cpuGaming: r(3, 5, 5), gpuTier: r(4, 5, 5), ramGb: r(32, 32, 64), storageGb: r(1000, 2000, 2000) };
      if (resolution === '1440p') return { cpuGaming: r(3, 3, 5), gpuTier: r(3, 3, 4), ramGb: r(16, 32, 32), storageGb: r(1000, 1000, 2000) };
      return { cpuGaming: r(2, 2, 3), gpuTier: r(2, 2, 3), ramGb: r(16, 16, 32), storageGb: r(1000, 1000, 2000) };
    case 'creative':
      return { cpuWork: r(3, 3, 5), gpuTier: r(2, 3, 4), ramGb: r(32, 32, 64), storageGb: r(1000, 2000, 2000) };
    case 'engineering':
      // CAD and simulation: lots of memory and a strong multi-core processor
      return { cpuWork: r(3, 4, 5), gpuTier: r(2, 2, 4), ramGb: r(64, 64, 128), storageGb: r(1000, 2000, 2000) };
    case 'architecture':
      // Rendering (Lumion, Twinmotion, Enscape, V-Ray GPU): the graphics card and its memory matter most
      return { cpuWork: r(3, 3, 5), gpuTier: r(3, 4, 5), minVramGb: 16, ramGb: r(32, 64, 128), storageGb: r(1000, 2000, 2000) };
  }
}

const merge = (a: Range | undefined, b: Range | undefined): Range | undefined =>
  !a ? b : !b ? a : r(Math.max(a.min, b.min), Math.max(a.ideal, b.ideal), Math.max(a.max, b.max));

/** Combines the targets of several uses: the most demanding one wins for each part. */
export function buildTargets(profile: Profile): Targets {
  const resolution = profile.resolution ?? '1080p';
  // Office work is covered by any other use, so it only counts on its own
  const uses = profile.uses.length > 1 ? profile.uses.filter((u) => u !== 'office') : profile.uses;

  let combined: Omit<Targets, 'label'> | undefined;
  for (const use of uses) {
    const t = targetsFor(use, resolution);
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

  const label = uses
    .map((u) => (u === 'gaming' ? `gaming at ${resolution === '4k' ? '4K' : resolution}` : LABELS[u]))
    .join(' and ');
  return { ...combined!, label };
}

/** Validates the profile sent by the client. Returns undefined when there is none. */
export function parseProfile(raw: unknown): Profile | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { uses, resolution } = raw as { uses?: unknown; resolution?: unknown };
  if (!Array.isArray(uses)) return undefined;
  const valid = uses.filter((u): u is Use => (USES as readonly string[]).includes(u as string));
  if (!valid.length) return undefined;
  return {
    uses: [...new Set(valid)],
    resolution: (RESOLUTIONS as readonly string[]).includes(resolution as string) ? (resolution as Resolution) : undefined,
  };
}
