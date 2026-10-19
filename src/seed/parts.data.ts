import type { Category, SpecsByCategory } from '../parts/part.types';

export interface SeedPart<C extends Category = Category> {
  slug: string;
  brand: string;
  name: string;
  price: number;
  specs: SpecsByCategory[C];
  imageUrl?: string | null;
  sourceUrl?: string | null;
}

export type Catalog = { [C in Category]: SeedPart<C>[] };

const ATX_ALL = ['ATX', 'Micro-ATX', 'Mini-ITX'] as const;
const ALL_SOCKETS = ['AM4', 'AM5', 'LGA1700', 'LGA1851'] as const;

/**
 * Real, widely available parts. Dimensions, sockets and power figures come from
 * manufacturer spec sheets. Prices are in EUR: the gjirafa50.com price when the scraper matched
 * the part (src/seed/scraped.data.ts, CURATED_FROM_SHOP), otherwise an estimate.
 */
export const CATALOG: Catalog = {
  case: [
    { slug: 'nzxt-h5-flow', brand: 'NZXT', name: 'H5 Flow', price: 94.99,
      specs: { size: 'Mid Tower', supportedMotherboards: [...ATX_ALL], maxGpuLengthMm: 365, maxCoolerHeightMm: 165, maxRadiatorMm: 280, psuFormFactors: ['ATX'] } },
    { slug: 'lian-li-o11-dynamic-evo', brand: 'Lian Li', name: 'O11 Dynamic EVO', price: 159.99,
      specs: { size: 'Mid Tower', supportedMotherboards: ['E-ATX', ...ATX_ALL], maxGpuLengthMm: 426, maxCoolerHeightMm: 167, maxRadiatorMm: 360, psuFormFactors: ['ATX'] } },
    { slug: 'fractal-north', brand: 'Fractal Design', name: 'North', price: 139.99,
      specs: { size: 'Mid Tower', supportedMotherboards: [...ATX_ALL], maxGpuLengthMm: 355, maxCoolerHeightMm: 170, maxRadiatorMm: 360, psuFormFactors: ['ATX'] } },
    { slug: 'corsair-4000d-airflow', brand: 'Corsair', name: '4000D Airflow', price: 104.99,
      specs: { size: 'Mid Tower', supportedMotherboards: [...ATX_ALL], maxGpuLengthMm: 360, maxCoolerHeightMm: 170, maxRadiatorMm: 360, psuFormFactors: ['ATX'] } },
    { slug: 'phanteks-xt-pro-ultra', brand: 'Phanteks', name: 'XT Pro Ultra', price: 89.99,
      specs: { size: 'Mid Tower', supportedMotherboards: ['E-ATX', ...ATX_ALL], maxGpuLengthMm: 415, maxCoolerHeightMm: 184, maxRadiatorMm: 360, psuFormFactors: ['ATX'] } },
    { slug: 'thermaltake-versa-h18', brand: 'Thermaltake', name: 'Versa H18', price: 54.99,
      specs: { size: 'Micro Tower', supportedMotherboards: ['Micro-ATX', 'Mini-ITX'], maxGpuLengthMm: 350, maxCoolerHeightMm: 155, maxRadiatorMm: 240, psuFormFactors: ['ATX'] } },
    { slug: 'cooler-master-nr200p', brand: 'Cooler Master', name: 'MasterBox NR200P', price: 109.99,
      specs: { size: 'Small Form Factor', supportedMotherboards: ['Mini-ITX'], maxGpuLengthMm: 330, maxCoolerHeightMm: 155, maxRadiatorMm: 280, psuFormFactors: ['SFX'] } },
    { slug: 'fractal-terra', brand: 'Fractal Design', name: 'Terra', price: 179.99,
      specs: { size: 'Small Form Factor', supportedMotherboards: ['Mini-ITX'], maxGpuLengthMm: 322, maxCoolerHeightMm: 77, maxRadiatorMm: 0, psuFormFactors: ['SFX'] } },
  ],

  motherboard: [
    { slug: 'gigabyte-b550m-ds3h', brand: 'Gigabyte', name: 'B550M DS3H', price: 99.99,
      specs: { socket: 'AM4', chipset: 'B550', formFactor: 'Micro-ATX', memoryType: 'DDR4', memorySlots: 4, maxMemoryGb: 128, m2Slots: 2, sataPorts: 4 } },
    { slug: 'asrock-b650m-hdv-m2', brand: 'ASRock', name: 'B650M-HDV/M.2', price: 119.99,
      specs: { socket: 'AM5', chipset: 'B650', formFactor: 'Micro-ATX', memoryType: 'DDR5', memorySlots: 2, maxMemoryGb: 96, m2Slots: 2, sataPorts: 4 } },
    { slug: 'asus-rog-strix-b550-f', brand: 'ASUS', name: 'ROG Strix B550-F Gaming WiFi II', price: 169.99,
      specs: { socket: 'AM4', chipset: 'B550', formFactor: 'ATX', memoryType: 'DDR4', memorySlots: 4, maxMemoryGb: 128, m2Slots: 2, sataPorts: 6 } },
    { slug: 'msi-b550m-mortar', brand: 'MSI', name: 'MAG B550M Mortar WiFi', price: 139.99,
      specs: { socket: 'AM4', chipset: 'B550', formFactor: 'Micro-ATX', memoryType: 'DDR4', memorySlots: 4, maxMemoryGb: 128, m2Slots: 2, sataPorts: 6 } },
    { slug: 'asus-rog-strix-b550-i', brand: 'ASUS', name: 'ROG Strix B550-I Gaming', price: 199.99,
      specs: { socket: 'AM4', chipset: 'B550', formFactor: 'Mini-ITX', memoryType: 'DDR4', memorySlots: 2, maxMemoryGb: 64, m2Slots: 2, sataPorts: 4 } },
    { slug: 'msi-b650-tomahawk', brand: 'MSI', name: 'MAG B650 Tomahawk WiFi', price: 199.99,
      specs: { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemoryGb: 192, m2Slots: 3, sataPorts: 6 } },
    { slug: 'gigabyte-b650m-aorus-elite-ax', brand: 'Gigabyte', name: 'B650M Aorus Elite AX', price: 179.99,
      specs: { socket: 'AM5', chipset: 'B650', formFactor: 'Micro-ATX', memoryType: 'DDR5', memorySlots: 4, maxMemoryGb: 192, m2Slots: 2, sataPorts: 4 } },
    { slug: 'asus-rog-strix-b650e-i', brand: 'ASUS', name: 'ROG Strix B650E-I Gaming WiFi', price: 289.99,
      specs: { socket: 'AM5', chipset: 'B650E', formFactor: 'Mini-ITX', memoryType: 'DDR5', memorySlots: 2, maxMemoryGb: 96, m2Slots: 2, sataPorts: 2 } },
    { slug: 'asus-rog-strix-x670e-e', brand: 'ASUS', name: 'ROG Strix X670E-E Gaming WiFi', price: 449.99,
      specs: { socket: 'AM5', chipset: 'X670E', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemoryGb: 192, m2Slots: 4, sataPorts: 4 } },
    { slug: 'msi-pro-b760m-a-ddr4', brand: 'MSI', name: 'PRO B760M-A WiFi DDR4', price: 139.99,
      specs: { socket: 'LGA1700', chipset: 'B760', formFactor: 'Micro-ATX', memoryType: 'DDR4', memorySlots: 4, maxMemoryGb: 128, m2Slots: 2, sataPorts: 4 } },
    { slug: 'asus-tuf-z790-plus', brand: 'ASUS', name: 'TUF Gaming Z790-Plus WiFi', price: 249.99,
      specs: { socket: 'LGA1700', chipset: 'Z790', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemoryGb: 192, m2Slots: 4, sataPorts: 4 } },
    { slug: 'gigabyte-b760i-aorus-pro', brand: 'Gigabyte', name: 'B760I Aorus Pro', price: 199.99,
      specs: { socket: 'LGA1700', chipset: 'B760', formFactor: 'Mini-ITX', memoryType: 'DDR5', memorySlots: 2, maxMemoryGb: 96, m2Slots: 2, sataPorts: 4 } },
    { slug: 'msi-mag-z890-tomahawk', brand: 'MSI', name: 'MAG Z890 Tomahawk WiFi', price: 299.99,
      specs: { socket: 'LGA1851', chipset: 'Z890', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemoryGb: 256, m2Slots: 4, sataPorts: 4 } },
  ],

  cpu: [
    { slug: 'amd-ryzen-5-5600g', brand: 'AMD', name: 'Ryzen 5 5600G', price: 129.99,
      specs: { socket: 'AM4', cores: 6, threads: 12, boostGhz: 4.4, tdpW: 65, maxPowerW: 88, integratedGraphics: true, gamingTier: 1, workTier: 1 } },
    { slug: 'amd-ryzen-5-8600g', brand: 'AMD', name: 'Ryzen 5 8600G', price: 199.99,
      specs: { socket: 'AM5', cores: 6, threads: 12, boostGhz: 5.0, tdpW: 65, maxPowerW: 88, integratedGraphics: true, gamingTier: 2, workTier: 2 } },
    { slug: 'intel-core-i5-14400', brand: 'Intel', name: 'Core i5-14400', price: 219.99,
      specs: { socket: 'LGA1700', cores: 10, threads: 16, boostGhz: 4.7, tdpW: 65, maxPowerW: 148, integratedGraphics: true, gamingTier: 2, workTier: 2 } },
    { slug: 'amd-ryzen-5-5600x', brand: 'AMD', name: 'Ryzen 5 5600X', price: 139.99,
      specs: { socket: 'AM4', cores: 6, threads: 12, boostGhz: 4.6, tdpW: 65, maxPowerW: 76, integratedGraphics: false, gamingTier: 2, workTier: 2 } },
    { slug: 'amd-ryzen-7-5800x3d', brand: 'AMD', name: 'Ryzen 7 5800X3D', price: 299.99,
      specs: { socket: 'AM4', cores: 8, threads: 16, boostGhz: 4.5, tdpW: 105, maxPowerW: 142, integratedGraphics: false, gamingTier: 3, workTier: 2 } },
    { slug: 'amd-ryzen-5-7600x', brand: 'AMD', name: 'Ryzen 5 7600X', price: 199.99,
      specs: { socket: 'AM5', cores: 6, threads: 12, boostGhz: 5.3, tdpW: 105, maxPowerW: 142, integratedGraphics: true, gamingTier: 3, workTier: 2 } },
    { slug: 'amd-ryzen-7-7800x3d', brand: 'AMD', name: 'Ryzen 7 7800X3D', price: 389.99,
      specs: { socket: 'AM5', cores: 8, threads: 16, boostGhz: 5.0, tdpW: 120, maxPowerW: 162, integratedGraphics: true, gamingTier: 5, workTier: 3 } },
    { slug: 'amd-ryzen-9-9950x', brand: 'AMD', name: 'Ryzen 9 9950X', price: 599.99,
      specs: { socket: 'AM5', cores: 16, threads: 32, boostGhz: 5.7, tdpW: 170, maxPowerW: 230, integratedGraphics: true, gamingTier: 4, workTier: 5 } },
    { slug: 'intel-core-i5-13400f', brand: 'Intel', name: 'Core i5-13400F', price: 179.99,
      specs: { socket: 'LGA1700', cores: 10, threads: 16, boostGhz: 4.6, tdpW: 65, maxPowerW: 148, integratedGraphics: false, gamingTier: 2, workTier: 2 } },
    { slug: 'intel-core-i5-14600k', brand: 'Intel', name: 'Core i5-14600K', price: 279.99,
      specs: { socket: 'LGA1700', cores: 14, threads: 20, boostGhz: 5.3, tdpW: 125, maxPowerW: 181, integratedGraphics: true, gamingTier: 3, workTier: 3 } },
    { slug: 'intel-core-i9-14900k', brand: 'Intel', name: 'Core i9-14900K', price: 529.99,
      specs: { socket: 'LGA1700', cores: 24, threads: 32, boostGhz: 6.0, tdpW: 125, maxPowerW: 253, integratedGraphics: true, gamingTier: 4, workTier: 5 } },
    { slug: 'intel-core-ultra-7-265k', brand: 'Intel', name: 'Core Ultra 7 265K', price: 299.99,
      specs: { socket: 'LGA1851', cores: 20, threads: 20, boostGhz: 5.5, tdpW: 125, maxPowerW: 250, integratedGraphics: true, gamingTier: 4, workTier: 4 } },
  ],

  cooler: [
    { slug: 'thermalright-peerless-assassin-120-se', brand: 'Thermalright', name: 'Peerless Assassin 120 SE', price: 35.9,
      specs: { type: 'Air', sockets: [...ALL_SOCKETS], heightMm: 155, tdpRatingW: 245 } },
    { slug: 'cooler-master-hyper-212-black', brand: 'Cooler Master', name: 'Hyper 212 Black Edition', price: 29.99,
      specs: { type: 'Air', sockets: [...ALL_SOCKETS], heightMm: 159, tdpRatingW: 150 } },
    { slug: 'noctua-nh-d15-g2', brand: 'Noctua', name: 'NH-D15 G2', price: 149.95,
      specs: { type: 'Air', sockets: [...ALL_SOCKETS], heightMm: 168, tdpRatingW: 250 } },
    { slug: 'be-quiet-dark-rock-pro-5', brand: 'be quiet!', name: 'Dark Rock Pro 5', price: 99.9,
      specs: { type: 'Air', sockets: [...ALL_SOCKETS], heightMm: 168, tdpRatingW: 270 } },
    { slug: 'noctua-nh-l9a-am5', brand: 'Noctua', name: 'NH-L9a-AM5 (low profile)', price: 49.95,
      specs: { type: 'Air', sockets: ['AM4', 'AM5'], heightMm: 37, tdpRatingW: 65 } },
    { slug: 'noctua-nh-l9i-17xx', brand: 'Noctua', name: 'NH-L9i-17xx (low profile)', price: 49.95,
      specs: { type: 'Air', sockets: ['LGA1700', 'LGA1851'], heightMm: 37, tdpRatingW: 65 } },
    { slug: 'arctic-liquid-freezer-iii-280', brand: 'Arctic', name: 'Liquid Freezer III 280', price: 99.99,
      specs: { type: 'Liquid', sockets: [...ALL_SOCKETS], radiatorMm: 280, tdpRatingW: 280 } },
    { slug: 'arctic-liquid-freezer-iii-360', brand: 'Arctic', name: 'Liquid Freezer III 360', price: 109.99,
      specs: { type: 'Liquid', sockets: [...ALL_SOCKETS], radiatorMm: 360, tdpRatingW: 300 } },
    { slug: 'nzxt-kraken-240', brand: 'NZXT', name: 'Kraken 240', price: 139.99,
      specs: { type: 'Liquid', sockets: [...ALL_SOCKETS], radiatorMm: 240, tdpRatingW: 220 } },
  ],

  gpu: [
    { slug: 'intel-arc-b580', brand: 'Intel', name: 'Arc B580 Limited Edition', price: 249.99,
      specs: { chip: 'Arc B580', vramGb: 12, lengthMm: 272, powerW: 190, recommendedPsuW: 600, tier: 2 } },
    { slug: 'asus-dual-rtx-4060', brand: 'ASUS', name: 'Dual GeForce RTX 4060 OC', price: 299.99,
      specs: { chip: 'GeForce RTX 4060', vramGb: 8, lengthMm: 227, powerW: 115, recommendedPsuW: 550, tier: 2 } },
    { slug: 'sapphire-pulse-rx-7600', brand: 'Sapphire', name: 'Pulse Radeon RX 7600', price: 269.99,
      specs: { chip: 'Radeon RX 7600', vramGb: 8, lengthMm: 240, powerW: 165, recommendedPsuW: 550, tier: 2 } },
    { slug: 'nvidia-rtx-5070-fe', brand: 'NVIDIA', name: 'GeForce RTX 5070 Founders Edition', price: 549.99,
      specs: { chip: 'GeForce RTX 5070', vramGb: 12, lengthMm: 242, powerW: 250, recommendedPsuW: 650, tier: 3 } },
    { slug: 'sapphire-nitro-rx-7800-xt', brand: 'Sapphire', name: 'Nitro+ Radeon RX 7800 XT', price: 529.99,
      specs: { chip: 'Radeon RX 7800 XT', vramGb: 16, lengthMm: 320, powerW: 263, recommendedPsuW: 700, tier: 3 } },
    { slug: 'nvidia-rtx-4080-super-fe', brand: 'NVIDIA', name: 'GeForce RTX 4080 Super Founders Edition', price: 999.99,
      specs: { chip: 'GeForce RTX 4080 Super', vramGb: 16, lengthMm: 310, powerW: 320, recommendedPsuW: 750, tier: 4 } },
    { slug: 'amd-rx-7900-xtx', brand: 'AMD', name: 'Radeon RX 7900 XTX (reference)', price: 929.99,
      specs: { chip: 'Radeon RX 7900 XTX', vramGb: 24, lengthMm: 287, powerW: 355, recommendedPsuW: 800, tier: 4 } },
    { slug: 'asus-rog-strix-rtx-4090', brand: 'ASUS', name: 'ROG Strix GeForce RTX 4090 OC', price: 1999.99,
      specs: { chip: 'GeForce RTX 4090', vramGb: 24, lengthMm: 358, powerW: 450, recommendedPsuW: 1000, tier: 5 } },
    { slug: 'nvidia-rtx-5090-fe', brand: 'NVIDIA', name: 'GeForce RTX 5090 Founders Edition', price: 1999.99,
      specs: { chip: 'GeForce RTX 5090', vramGb: 32, lengthMm: 304, powerW: 575, recommendedPsuW: 1000, tier: 5 } },
  ],

  psu: [
    { slug: 'evga-400-n1', brand: 'EVGA', name: '400 N1', price: 39.99,
      specs: { wattage: 400, formFactor: 'ATX', efficiency: '80+ White', modular: 'No' } },
    { slug: 'corsair-cx550', brand: 'Corsair', name: 'CX550', price: 64.99,
      specs: { wattage: 550, formFactor: 'ATX', efficiency: '80+ Bronze', modular: 'No' } },
    { slug: 'corsair-rm750e', brand: 'Corsair', name: 'RM750e', price: 99.99,
      specs: { wattage: 750, formFactor: 'ATX', efficiency: '80+ Gold', modular: 'Full' } },
    { slug: 'seasonic-focus-gx-850', brand: 'Seasonic', name: 'Focus GX-850', price: 139.99,
      specs: { wattage: 850, formFactor: 'ATX', efficiency: '80+ Gold', modular: 'Full' } },
    { slug: 'be-quiet-dark-power-13-1000', brand: 'be quiet!', name: 'Dark Power 13 1000W', price: 269.99,
      specs: { wattage: 1000, formFactor: 'ATX', efficiency: '80+ Titanium', modular: 'Full' } },
    { slug: 'corsair-hx1500i', brand: 'Corsair', name: 'HX1500i', price: 349.99,
      specs: { wattage: 1500, formFactor: 'ATX', efficiency: '80+ Platinum', modular: 'Full' } },
    { slug: 'corsair-sf750', brand: 'Corsair', name: 'SF750 (SFX)', price: 179.99,
      specs: { wattage: 750, formFactor: 'SFX', efficiency: '80+ Platinum', modular: 'Full' } },
    { slug: 'cooler-master-v850-sfx', brand: 'Cooler Master', name: 'V850 SFX Gold', price: 189.99,
      specs: { wattage: 850, formFactor: 'SFX', efficiency: '80+ Gold', modular: 'Full' } },
  ],

  ram: [
    { slug: 'kingston-fury-beast-16-ddr5-5200', brand: 'Kingston', name: 'Fury Beast 16GB (2x8GB) DDR5-5200', price: 54.99,
      specs: { memoryType: 'DDR5', capacityGb: 16, modules: 2, speedMts: 5200 } },
    { slug: 'corsair-vengeance-lpx-16-ddr4-3200', brand: 'Corsair', name: 'Vengeance LPX 16GB (2x8GB) DDR4-3200', price: 39.99,
      specs: { memoryType: 'DDR4', capacityGb: 16, modules: 2, speedMts: 3200 } },
    { slug: 'gskill-ripjaws-v-32-ddr4-3600', brand: 'G.Skill', name: 'Ripjaws V 32GB (2x16GB) DDR4-3600', price: 64.99,
      specs: { memoryType: 'DDR4', capacityGb: 32, modules: 2, speedMts: 3600 } },
    { slug: 'kingston-fury-beast-64-ddr4-3200', brand: 'Kingston', name: 'Fury Beast 64GB (2x32GB) DDR4-3200', price: 129.99,
      specs: { memoryType: 'DDR4', capacityGb: 64, modules: 2, speedMts: 3200 } },
    { slug: 'corsair-vengeance-32-ddr5-6000', brand: 'Corsair', name: 'Vengeance 32GB (2x16GB) DDR5-6000', price: 99.99,
      specs: { memoryType: 'DDR5', capacityGb: 32, modules: 2, speedMts: 6000 } },
    { slug: 'gskill-trident-z5-rgb-32-ddr5-6400', brand: 'G.Skill', name: 'Trident Z5 RGB 32GB (2x16GB) DDR5-6400', price: 119.99,
      specs: { memoryType: 'DDR5', capacityGb: 32, modules: 2, speedMts: 6400 } },
    { slug: 'kingston-fury-beast-64-ddr5-5600', brand: 'Kingston', name: 'Fury Beast 64GB (2x32GB) DDR5-5600', price: 179.99,
      specs: { memoryType: 'DDR5', capacityGb: 64, modules: 2, speedMts: 5600 } },
    { slug: 'corsair-vengeance-128-ddr5-5600', brand: 'Corsair', name: 'Vengeance 128GB (4x32GB) DDR5-5600', price: 349.99,
      specs: { memoryType: 'DDR5', capacityGb: 128, modules: 4, speedMts: 5600 } },
  ],

  storage: [
    { slug: 'wd-blue-sn580-500gb', brand: 'WD', name: 'Blue SN580 500GB NVMe', price: 44.99,
      specs: { interface: 'NVMe', formFactor: 'M.2', capacityGb: 500 } },
    { slug: 'crucial-p3-plus-1tb', brand: 'Crucial', name: 'P3 Plus 1TB NVMe', price: 69.99,
      specs: { interface: 'NVMe', formFactor: 'M.2', capacityGb: 1000 } },
    { slug: 'samsung-990-pro-1tb', brand: 'Samsung', name: '990 Pro 1TB NVMe', price: 119.99,
      specs: { interface: 'NVMe', formFactor: 'M.2', capacityGb: 1000 } },
    { slug: 'samsung-990-pro-2tb', brand: 'Samsung', name: '990 Pro 2TB NVMe', price: 169.99,
      specs: { interface: 'NVMe', formFactor: 'M.2', capacityGb: 2000 } },
    { slug: 'wd-black-sn850x-2tb', brand: 'WD', name: 'Black SN850X 2TB NVMe', price: 149.99,
      specs: { interface: 'NVMe', formFactor: 'M.2', capacityGb: 2000 } },
    { slug: 'samsung-870-evo-1tb', brand: 'Samsung', name: '870 EVO 1TB SATA SSD', price: 89.99,
      specs: { interface: 'SATA', formFactor: '2.5"', capacityGb: 1000 } },
    { slug: 'crucial-mx500-2tb', brand: 'Crucial', name: 'MX500 2TB SATA SSD', price: 119.99,
      specs: { interface: 'SATA', formFactor: '2.5"', capacityGb: 2000 } },
  ],
};
