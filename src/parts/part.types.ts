/** Build order: each step's choices are limited by what was picked before it. */
export const CATEGORIES = [
  'case',
  'motherboard',
  'cpu',
  'cooler',
  'gpu',
  'psu',
  'ram',
  'storage',
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export type MotherboardFormFactor = 'E-ATX' | 'ATX' | 'Micro-ATX' | 'Mini-ITX';
export type Socket = 'AM4' | 'AM5' | 'LGA1700' | 'LGA1851';
export type MemoryType = 'DDR4' | 'DDR5';
export type PsuFormFactor = 'ATX' | 'SFX';

export interface CaseSpecs {
  size: 'Full Tower' | 'Mid Tower' | 'Micro Tower' | 'Small Form Factor';
  supportedMotherboards: MotherboardFormFactor[];
  maxGpuLengthMm: number;
  maxCoolerHeightMm: number;
  /** Largest liquid-cooler radiator that fits (0 = none) */
  maxRadiatorMm: number;
  psuFormFactors: PsuFormFactor[];
}

export interface MotherboardSpecs {
  socket: Socket;
  chipset: string;
  formFactor: MotherboardFormFactor;
  memoryType: MemoryType;
  memorySlots: number;
  maxMemoryGb: number;
  m2Slots: number;
  sataPorts: number;
}

export interface CpuSpecs {
  socket: Socket;
  cores: number;
  threads: number;
  boostGhz: number;
  /** Rated TDP, used for cooler sizing */
  tdpW: number;
  /** Peak package power (AMD PPT / Intel max turbo power), used for PSU sizing */
  maxPowerW: number;
}

export interface CoolerSpecs {
  type: 'Air' | 'Liquid';
  sockets: Socket[];
  /** Air coolers: height above the CPU */
  heightMm?: number;
  /** Liquid coolers: radiator size */
  radiatorMm?: number;
  /** Heat the cooler can handle */
  tdpRatingW: number;
}

export interface GpuSpecs {
  chip: string;
  vramGb: number;
  lengthMm: number;
  powerW: number;
  /** Manufacturer-recommended PSU */
  recommendedPsuW: number;
}

export interface PsuSpecs {
  wattage: number;
  formFactor: PsuFormFactor;
  efficiency: string;
  modular: 'Full' | 'Semi' | 'No';
}

export interface RamSpecs {
  memoryType: MemoryType;
  capacityGb: number;
  modules: number;
  speedMts: number;
}

export interface StorageSpecs {
  interface: 'NVMe' | 'SATA';
  formFactor: 'M.2' | '2.5"';
  capacityGb: number;
}

export interface SpecsByCategory {
  case: CaseSpecs;
  motherboard: MotherboardSpecs;
  cpu: CpuSpecs;
  cooler: CoolerSpecs;
  gpu: GpuSpecs;
  psu: PsuSpecs;
  ram: RamSpecs;
  storage: StorageSpecs;
}

export type AnySpecs = SpecsByCategory[Category];
