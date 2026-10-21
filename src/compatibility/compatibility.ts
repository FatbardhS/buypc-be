import type { Part } from '../parts/part.entity';
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
} from '../parts/part.types';

/** One picked part per category */
export type Selection = Partial<Record<Category, Part>>;

/** Power for fans, drives, RAM, USB devices etc. on top of CPU + GPU */
const BASE_SYSTEM_POWER_W = 75;
/** Headroom so the PSU never runs near its limit (load spikes, ageing, efficiency sweet spot) */
const PSU_HEADROOM = 1.4;

const specs = <T>(part: Part) => part.specs as T;

export interface PowerEstimate {
  /** Worst-case draw of the selected parts */
  estimatedW: number;
  /** Smallest PSU we consider safe for this build */
  recommendedPsuW: number;
}

export function estimatePower(selection: Selection): PowerEstimate {
  const cpu = selection.cpu ? specs<CpuSpecs>(selection.cpu) : undefined;
  const gpu = selection.gpu ? specs<GpuSpecs>(selection.gpu) : undefined;

  const estimatedW = BASE_SYSTEM_POWER_W + (cpu?.maxPowerW ?? 0) + (gpu?.powerW ?? 0);
  const withHeadroom = Math.ceil((estimatedW * PSU_HEADROOM) / 50) * 50;
  const recommendedPsuW = Math.max(withHeadroom, gpu?.recommendedPsuW ?? 0);

  return { estimatedW, recommendedPsuW };
}

/**
 * Problems between two parts. Every rule lives here once and is checked no matter
 * which of the two was picked first.
 */
function pairIssues(a: Part, b: Part): string[] {
  const [x, y] = CATEGORIES.indexOf(a.category) < CATEGORIES.indexOf(b.category) ? [a, b] : [b, a];
  const key = `${x.category}:${y.category}`;
  const issues: string[] = [];

  switch (key) {
    case 'case:motherboard': {
      const pcCase = specs<CaseSpecs>(x);
      const board = specs<MotherboardSpecs>(y);
      if (!pcCase.supportedMotherboards.includes(board.formFactor)) {
        issues.push(
          `${board.formFactor} board doesn't fit the ${x.name} (fits ${pcCase.supportedMotherboards.join(', ')})`,
        );
      }
      break;
    }
    case 'case:cooler': {
      const pcCase = specs<CaseSpecs>(x);
      const cooler = specs<CoolerSpecs>(y);
      if (cooler.type === 'Air' && (cooler.heightMm ?? 0) > pcCase.maxCoolerHeightMm) {
        issues.push(`Too tall: ${cooler.heightMm}mm, but the case fits coolers up to ${pcCase.maxCoolerHeightMm}mm`);
      }
      if (cooler.type === 'Liquid' && (cooler.radiatorMm ?? 0) > pcCase.maxRadiatorMm) {
        issues.push(
          pcCase.maxRadiatorMm === 0
            ? `The ${x.name} has no room for a liquid cooler radiator`
            : `${cooler.radiatorMm}mm radiator won't fit (case supports up to ${pcCase.maxRadiatorMm}mm)`,
        );
      }
      break;
    }
    case 'case:gpu': {
      const pcCase = specs<CaseSpecs>(x);
      const gpu = specs<GpuSpecs>(y);
      if (gpu.lengthMm > pcCase.maxGpuLengthMm) {
        issues.push(`Too long: ${gpu.lengthMm}mm, but the case fits cards up to ${pcCase.maxGpuLengthMm}mm`);
      }
      break;
    }
    case 'case:psu': {
      const pcCase = specs<CaseSpecs>(x);
      const psu = specs<PsuSpecs>(y);
      if (!pcCase.psuFormFactors.includes(psu.formFactor)) {
        issues.push(`${psu.formFactor} power supply doesn't fit (case needs ${pcCase.psuFormFactors.join(' or ')})`);
      }
      break;
    }
    case 'motherboard:cpu': {
      const board = specs<MotherboardSpecs>(x);
      const cpu = specs<CpuSpecs>(y);
      if (board.socket !== cpu.socket) {
        issues.push(`${cpu.socket} CPU doesn't fit the ${board.chipset} board's ${board.socket} socket`);
      }
      break;
    }
    case 'motherboard:cooler': {
      const board = specs<MotherboardSpecs>(x);
      const cooler = specs<CoolerSpecs>(y);
      if (!cooler.sockets.includes(board.socket)) {
        issues.push(`No mounting kit for the ${board.socket} socket`);
      }
      break;
    }
    case 'cpu:cooler': {
      // Socket fit is checked against the motherboard, which always comes first
      const cpu = specs<CpuSpecs>(x);
      const cooler = specs<CoolerSpecs>(y);
      if (cooler.tdpRatingW < cpu.tdpW) {
        issues.push(`Too weak: rated for ${cooler.tdpRatingW}W, but the ${x.name} puts out ${cpu.tdpW}W`);
      }
      break;
    }
    case 'motherboard:ram': {
      const board = specs<MotherboardSpecs>(x);
      const ram = specs<RamSpecs>(y);
      if (board.memoryType !== ram.memoryType) {
        issues.push(`${ram.memoryType} memory doesn't work in a ${board.memoryType} motherboard`);
      }
      if (ram.modules > board.memorySlots) {
        issues.push(`Kit has ${ram.modules} sticks, but the board only has ${board.memorySlots} slots`);
      }
      if (ram.capacityGb > board.maxMemoryGb) {
        issues.push(`${ram.capacityGb}GB is more than the board's ${board.maxMemoryGb}GB maximum`);
      }
      break;
    }
    case 'motherboard:storage': {
      const board = specs<MotherboardSpecs>(x);
      const drive = specs<StorageSpecs>(y);
      if (drive.interface === 'NVMe' && board.m2Slots === 0) {
        issues.push('The motherboard has no M.2 slot for an NVMe drive');
      }
      if (drive.interface === 'SATA' && board.sataPorts === 0) {
        issues.push('The motherboard has no SATA ports');
      }
      break;
    }
  }

  return issues;
}

function psuPowerIssues(psu: Part, selection: Selection): string[] {
  const { recommendedPsuW, estimatedW } = estimatePower(selection);
  const { wattage } = specs<PsuSpecs>(psu);
  if (wattage < recommendedPsuW) {
    return [`Not safe: your build can draw ~${estimatedW}W. Use at least ${recommendedPsuW}W`];
  }
  return [];
}

/** Problems that `candidate` would have alongside everything else in `selection`. */
export function issuesFor(candidate: Part, selection: Selection): string[] {
  const issues: string[] = [];
  const others: Selection = { ...selection, [candidate.category]: candidate };

  for (const category of CATEGORIES) {
    const other = selection[category];
    if (other && category !== candidate.category) {
      issues.push(...pairIssues(candidate, other));
    }
  }

  if (candidate.category === 'psu') {
    issues.push(...psuPowerIssues(candidate, others));
  } else if ((candidate.category === 'cpu' || candidate.category === 'gpu') && selection.psu) {
    const powerIssues = psuPowerIssues(selection.psu, others);
    if (powerIssues.length) {
      issues.push(`Needs a bigger power supply than your ${selection.psu.name}`);
    }
  }

  return issues;
}

/**
 * Validates a whole build. Each problem is reported on the later step of the pair,
 * so the frontend knows which picks became invalid after an earlier one changed.
 */
export function checkSelection(selection: Selection): Partial<Record<Category, string[]>> {
  const result: Partial<Record<Category, string[]>> = {};

  CATEGORIES.forEach((category, index) => {
    const part = selection[category];
    if (!part) return;

    const earlier: Selection = {};
    for (const prev of CATEGORIES.slice(0, index)) {
      if (selection[prev]) earlier[prev] = selection[prev];
    }

    const issues = issuesFor(part, earlier);
    if (issues.length) result[category] = issues;
  });

  return result;
}

// ---------- Notes (don't block a pick) ----------

/**
 * Older chipsets run newer processors only after a BIOS update. Shops usually stock updated
 * boards, so this is a heads-up, not an incompatibility.
 */
const BIOS_UPDATE_RULES: { socket: string; chipsets: RegExp; cpu: RegExp; label: string }[] = [
  { socket: 'AM4', chipsets: /^(A320|B350|X370|B450|X470)$/, cpu: /Ryzen \d (4|5)\d{3}/, label: 'Ryzen 4000/5000' },
  { socket: 'AM5', chipsets: /^(A620|B650E?|X670E?)$/, cpu: /Ryzen \d (8|9)\d{3}/, label: 'Ryzen 8000/9000' },
  { socket: 'LGA1700', chipsets: /^(H610|B660|H670|Z690)$/, cpu: /Core i\d-1[34]\d{3}/, label: 'Intel 13th/14th gen' },
];

function pairNotes(a: Part, b: Part): string[] {
  const board = a.category === 'motherboard' ? a : b.category === 'motherboard' ? b : undefined;
  const cpu = a.category === 'cpu' ? a : b.category === 'cpu' ? b : undefined;
  if (!board || !cpu) return [];

  const { socket, chipset } = specs<MotherboardSpecs>(board);
  if (specs<CpuSpecs>(cpu).socket !== socket) return [];
  const rule = BIOS_UPDATE_RULES.find((r) => r.socket === socket && r.chipsets.test(chipset) && r.cpu.test(cpu.name));
  return rule
    ? [`May need a BIOS update: ${chipset} boards run ${rule.label} processors after a BIOS update. Ask the shop to check before buying.`]
    : [];
}

/** Heads-ups for `candidate` next to the other picks (the part still fits) */
export function notesFor(candidate: Part, selection: Selection): string[] {
  return CATEGORIES.flatMap((category) => {
    const other = selection[category];
    return other && category !== candidate.category ? pairNotes(candidate, other) : [];
  });
}

/** Notes for a whole build, reported on the later step of each pair (like checkSelection) */
export function noteSelection(selection: Selection): Partial<Record<Category, string[]>> {
  const result: Partial<Record<Category, string[]>> = {};
  CATEGORIES.forEach((category, index) => {
    const part = selection[category];
    if (!part) return;
    const earlier: Selection = {};
    for (const prev of CATEGORIES.slice(0, index)) if (selection[prev]) earlier[prev] = selection[prev];
    const notes = notesFor(part, earlier);
    if (notes.length) result[category] = notes;
  });
  return result;
}
