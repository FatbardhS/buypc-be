// Stage 2: turns the cached shop pages (stage 1, fetch.mjs) into catalog parts and writes
// src/seed/scraped.data.ts. A product is only kept when every spec the compatibility checker
// needs can be read from its title or spec table (or, for processors and graphics cards, from
// the model tables in models.mjs). Everything else is dropped, never guessed.
//
//   node scripts/scrape/normalize.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CPUS, GPUS, cpuKey, gpuKey } from './models.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'scripts', 'scrape', '.cache', 'raw.json');
const OUT = join(ROOT, 'src', 'seed', 'scraped.data.ts');

const BRANDS = [
  'Arctic', 'ASRock', 'ASUS', 'be quiet!', 'Biostar', 'Cooler Master', 'Corsair', 'Crucial', 'Darkflash', 'DeepCool',
  'Fractal Design', 'G.Skill', 'Gigabyte', 'Hyte', 'Intel', 'AMD', 'Kingston', 'Lexar', 'Lian Li', 'Montech', 'MSI',
  'Noctua', 'NZXT', 'Palit', 'Patriot', 'Phanteks', 'PNY', 'PowerColor', 'Sapphire', 'Samsung', 'Seagate', 'Seasonic',
  'Silicon Power', 'SilverStone', 'Thermalright', 'Thermaltake', 'Toshiba', 'WD', 'Western Digital', 'XFX', 'Zalman',
  'Zotac', 'Gainward', 'Inno3D', 'ADATA', 'XPG', 'TeamGroup', 'Team Group', 'Kioxia', 'Hiksemi', 'Rampage',
  'Endorfy', 'Antec', 'Tecnoware', 'HGST', 'Jonsbo', 'Chieftec', 'Mars Gaming', 'Fury', 'Netac', 'Transcend', 'Verbatim', 'Sabrent',
  'ID-Cooling', 'Scythe', 'Alphacool', 'EK', 'Lexar', 'Goodram', 'Apacer', 'FSP', 'Super Flower', 'Gamdias', 'Preyon',
  'VeinX', 'Krux', 'Acutake', 'Montech', 'Cougar', 'Sharkoon', 'Spire', 'Aerocool', 'Kolink', 'Nfortec', 'HP', 'Dell',
  'Lenovo', 'Sandisk', 'SanDisk', 'Kingspec', 'Hikvision', 'Fanxiang', 'Orico', 'Teamgroup', 'Ocypus', 'Vetroo',
];
const BRAND_ALIASES = { 'Western Digital': 'WD', 'Team Group': 'TeamGroup', Teamgroup: 'TeamGroup', SanDisk: 'Sandisk', XPG: 'ADATA' };

const num = (s) => (s == null ? NaN : Number(String(s).replace(',', '.').match(/\d+(?:\.\d+)?/)?.[0]));
const has = (re, ...texts) => texts.some((t) => t && re.test(t));
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

/** Finds the brand in the spec table or title. */
export function brandOf(p) {
  const fromSpec = (p.specs['Brendi'] ?? p.specs['Prodhuesi'] ?? '').split(',')[0].trim();
  const title = p.name.toLowerCase();
  const found = BRANDS.filter((b) => new RegExp(`(^|[^a-z])${b.toLowerCase().replace(/[.!]/g, '\\$&')}([^a-z]|$)`).test(title))
    .sort((a, b) => title.indexOf(a.toLowerCase()) - title.indexOf(b.toLowerCase()))[0];
  const brand = found ?? BRANDS.find((b) => b.toLowerCase() === fromSpec.toLowerCase()) ?? null;
  return brand ? BRAND_ALIASES[brand] ?? brand : null;
}

/** "Kartelë grafike ASUS Dual RTX 5060 Ti 16GB, GDDR7, e zezë" → "Dual RTX 5060 Ti 16GB" */
function cleanName(title, brand) {
  const at = title.toLowerCase().indexOf(brand.toLowerCase());
  let rest = (at >= 0 ? title.slice(at + brand.length) : title).replace(/[™®]/g, '').replace(/^[\s,:/-]+/, '');
  // Leftover product-type words when the brand appeared later in the title ("Furnizues energjie Be Quiet …")
  rest = rest
    .replace(/^(furnizues energjie|burim energjie|memorie( ram)?|disk( ssd| hdd)?|ssd i brendshëm|i brendshëm|kasë|kase)\s+/i, '')
    .replace(new RegExp(`^${brand.replace(/[.!]/g, '')}!?\s+`, 'i'), '');
  // The model is usually before the first comma; "G.Skill, 32GB (2 x 16GB), DDR5" has none, so keep the rest
  const first = rest.split(/,| – | - (?=[A-Za-zË])/)[0].trim();
  const name = (first.length >= 2 ? first : rest.replace(/,/g, ''))
    .replace(/\s+(e zezë|e bardhë|i zi|i bardhë|black|white)$/i, '')
    .trim();
  return name.length >= 2 ? name.slice(0, 150) : title.slice(0, 150);
}

// ---------- Per category ----------

const CHIPSET_SOCKET = [
  [/^(A320|A520|B350|B450|B550|X370|X470|X570)$/, 'AM4'],
  [/^(A620|B650E?|B840|B850|X670E?|X870E?)$/, 'AM5'],
  [/^(H610|B660|H670|Z690|B760|H770|Z790)$/, 'LGA1700'],
  [/^(H810|B860|Z890|W880)$/, 'LGA1851'],
];

function motherboard(p, brand) {
  const t = p.name;
  const s = p.specs;
  // Model names glue suffixes onto the chipset: B650M, B550I, A620AM, B850MT2
  const chipsetMatch =
    (s['Çipset për pllakë amë'] ?? s['Çipset'] ?? '').match(/[ABHXZW]\d{3}E?/) ??
    t.match(/\b([ABHXZW]\d{3}E?)(?=A?M|A?I|T\d|[\s,/-]|$)/i);
  if (!chipsetMatch) return null;
  const chipset = (chipsetMatch[1] ?? chipsetMatch[0]).toUpperCase();
  const socket = CHIPSET_SOCKET.find(([re]) => re.test(chipset))?.[1];
  if (!socket) return null;

  const ff = `${s['Standardi i pllakës'] ?? ''} ${s['Lloji i pllakës'] ?? ''}`;
  const formFactor =
    has(/E-?ATX/i, ff) ? 'E-ATX'
    : has(/ITX/i, ff, t) || /\b[ABHXZ]\d{3}E?-?I\b/i.test(t) ? 'Mini-ITX'
    : has(/micro|m-?atx|uatx|matx/i, ff) || /\b[ABHXZ]\d{3}E?M\b/i.test(t) || has(/m-?atx|matx|micro/i, t) ? 'Micro-ATX'
    : has(/\bATX\b/i, ff, t) || ff.trim() === '' ? 'ATX'
    : null;
  if (!formFactor) return null;

  const memText = `${s['Standardi i memories'] ?? ''} ${s['Lloji i memories'] ?? ''} ${t}`;
  const memoryType =
    socket === 'AM4' ? 'DDR4'
    : socket === 'AM5' || socket === 'LGA1851' ? 'DDR5'
    : has(/\bD4\b|DDR4/i, memText) ? 'DDR4'
    // Intel 600/700 boards are DDR5 unless the model says D4/DDR4
    : 'DDR5';

  const budget = /^(A|H)/.test(chipset) && formFactor === 'Micro-ATX';
  const memorySlots = num(s['Numri i sloteve për memorie']) || (formFactor === 'Mini-ITX' || budget ? 2 : 4);
  const maxMemoryGb =
    num(s['Memoria maksimale [GB]']) || num(s['Kapaciteti maksimal i memories [GB]']) ||
    (memoryType === 'DDR4' ? (memorySlots === 2 ? 64 : 128) : memorySlots === 2 ? 96 : 192);
  const m2Counts = [...(s['Mbështet disqet M.2'] ?? '').matchAll(/\((\d)x\)/g)].map((m) => +m[1]);
  const m2Slots = m2Counts.length ? m2Counts.reduce((a, b) => a + b, 0) : /^(A|H)/.test(chipset) ? 1 : 2;

  // "PRIME A520M-R AMD A520 Socket AM4 micro ATX" → "PRIME A520M-R"
  const name = cleanName(t, brand).replace(/\s+(-\s+)?(socket|amd\s+[abx]\d{3}|intel|lga|ddr[45]|m-?atx|micro|mini-itx|atx|motherboard|am[45]\b).*$/i, '').trim();
  return { name: name.length >= 3 ? name : undefined, specs: { socket, chipset, formFactor, memoryType, memorySlots, maxMemoryGb, m2Slots, sataPorts: 4 } };
}

function cpuPart(p) {
  if (!/procesor|cpu|ryzen|core/i.test(p.name) || /laptop|server|xeon|epyc|threadripper/i.test(p.name)) return null;
  const key = cpuKey(p.name);
  const specs = key && CPUS[key];
  if (!specs) return null;
  const amd = key.startsWith('ryzen');
  const pretty = amd
    ? key.replace(/^ryzen (\d) (\d{4})(.*)$/, (_, a, b, c) => `Ryzen ${a} ${b}${c.toUpperCase()}`)
    : key.startsWith('ultra')
      ? key.replace(/^ultra (\d) (\d{3})(\w*)( plus)?$/, (_, a, b, c, d) => `Core Ultra ${a} ${b}${c.toUpperCase()}${d ? ' Plus' : ''}`)
      : `Core ${key.replace(/^(i\d-\d+)(\w*)$/, (_, a, b) => a + b.toUpperCase())}`;
  const tray = /tray|bulk|oem/i.test(p.name);
  return { brand: amd ? 'AMD' : 'Intel', name: `${pretty}${tray ? ' (tray)' : ''}`, specs };
}

function gpuPart(p, brand) {
  if (/aksesor|mbajtës|kabllo|riser|laptop|bracket/i.test(p.name)) return null;
  const key = gpuKey(p.name);
  if (!key) return null;
  const ref = GPUS[key];
  const s = p.specs;
  // Listed as "Gjatësia [m]", "… [cm]", "… [mm]" or without a unit; the size of the number tells which
  const lengthEntry = Object.entries(s).find(([k]) => /^gjatësia( e kartës)?( \[(m|cm|mm)\])?$/i.test(k));
  const raw = lengthEntry ? num(lengthEntry[1]) : NaN;
  const lengthMm = raw < 1 ? raw * 1000 : raw < 50 ? raw * 10 : raw || ref.lengthMm;
  const vram = num(p.name.match(/(\d{1,2})\s?G(?:B)?\b/i)?.[1]);
  return {
    brand,
    specs: {
      chip: key,
      vramGb: vram >= 2 && vram <= 32 ? vram : ref.vramGb,
      lengthMm: lengthMm >= 150 && lengthMm <= 400 ? Math.round(lengthMm) : ref.lengthMm,
      powerW: ref.powerW,
      recommendedPsuW: ref.recommendedPsuW,
      tier: ref.tier,
    },
  };
}

function casePart(p) {
  const t = p.name;
  const s = p.specs;
  if (!/^(kas|kuti|këse|kull)/i.test(t) && !/tower/i.test(t)) return null;
  if (/aksesor|psu|me burim|\d{3}w/i.test(t)) return null;

  const cm = (v) => num(v) * 10;
  const maxGpuLengthMm = cm(s['Gjatësia maksimale e kartës grafike [cm]']);
  const maxCoolerHeightMm = cm(s['Lartësia maksimale e sistemit të ftohjes së CPU-së [cm]'] ?? s['Lartësia maksimale e ftohësit të CPU [cm]']);
  if (!(maxGpuLengthMm >= 150) || !(maxCoolerHeightMm >= 40)) return null;

  const type = `${s['Lloji i kasës'] ?? ''} ${t}`;
  const size =
    has(/full|big/i, type) ? 'Full Tower'
    : has(/mini tower|micro tower/i, type) ? 'Micro Tower'
    : has(/midi|mid|middle/i, type) ? 'Mid Tower'
    : has(/cube|itx|sff|small/i, type) ? 'Small Form Factor'
    : 'Mid Tower';

  const compat = `${s['Përputhshmëria'] ?? ''} ${s['Motherboard'] ?? ''} ${t}`;
  const boards = new Set();
  if (has(/E-?ATX/i, compat)) boards.add('E-ATX');
  // Remove the micro-ATX spellings first so plain "ATX" isn't matched inside them
  const plain = compat.replace(/micro\s?atx|m[-\s]?atx|u-?atx|matx/gi, ' MICRO ').replace(/E-?ATX/gi, ' ');
  if (/\bATX\b/i.test(plain)) boards.add('ATX');
  if (/MICRO/.test(plain)) boards.add('Micro-ATX');
  if (/ITX/i.test(plain)) boards.add('Mini-ITX');
  if (!boards.size) {
    if (size === 'Small Form Factor') boards.add('Mini-ITX');
    else if (size === 'Micro Tower') ['Micro-ATX', 'Mini-ITX'].forEach((b) => boards.add(b));
    else ['ATX', 'Micro-ATX', 'Mini-ITX'].forEach((b) => boards.add(b));
    if (size === 'Full Tower') boards.add('E-ATX');
  }
  // A case that takes a bigger board also takes the smaller ones
  if (boards.has('E-ATX') || boards.has('ATX')) ['Micro-ATX', 'Mini-ITX'].forEach((b) => boards.add(b));
  if (boards.has('Micro-ATX')) boards.add('Mini-ITX');
  const order = ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'];

  // Radiator room from the fan mounts on the top and front panels
  const mounts = ['Paneli i sipërm', 'Paneli përballë', 'Paneli i përparmë'].map((k) => s[k] ?? '').join(' ');
  const radiators = [...mounts.matchAll(/(120|140)\s?mm(?:\/140\s?mm)?\s?x\s?(\d)/gi)].map((m) => {
    const size = /\/140/.test(m[0]) ? 140 : +m[1];
    const n = Math.min(+m[2], 3);
    return n >= 2 ? size * n : 0;
  });
  const maxRadiatorMm = radiators.length
    ? Math.min(420, Math.max(...radiators))
    : size === 'Mid Tower' || size === 'Full Tower' ? 240 : 0;

  const itxOnly = boards.size === 1 && boards.has('Mini-ITX');
  return {
    specs: {
      size,
      supportedMotherboards: order.filter((b) => boards.has(b)),
      maxGpuLengthMm: Math.round(maxGpuLengthMm),
      maxCoolerHeightMm: Math.round(maxCoolerHeightMm),
      maxRadiatorMm,
      psuFormFactors: itxOnly ? ['SFX'] : ['ATX'],
    },
  };
}

const AIR_FAMILIES = /peerless|assassin|phantom spirit|hyper 212|hyper 620|nh-[ud]\d|nh-l9|dark rock|pure rock|ak\d{3}|ag\d{3}|ax\d{3}|frost commander|royal knight|fuma|mugen|freezer \d|freezer 36|se-\d{3}|bk0\d\d|cpu cooler|ftohës cpu|cpu/i;

function coolerPart(p) {
  const t = p.name;
  const s = p.specs;
  if (/pack|3x|ventilator|fan(?!ub)|pastë|paste|lëng|fluid|lidh|tub|pomp|pump|block|bllok|kabllo|aksesor|kit\b/i.test(t) && !/cpu|likuid|liquid|aio/i.test(t)) {
    return null;
  }
  if (/pastë|paste|lëng|fluid|lidh|pump|pomp|block|ventilator(ë)?\s/i.test(t)) return null;
  // Threadripper / server coolers don't mount on the sockets we support
  if (/\b(s?TR4|sTRX4|sTR5|SP[35]|LGA ?(2011|2066|4677))\b/i.test(t)) return null;

  const radiator = num(t.match(/\b(240|280|360|420)\b/)?.[1]);
  const liquid = /likuid|liquid|aio|water|ujë|frozen|kraken|galahad|levante|lt\d{3}|castle|ls\d{3}|nautilus|mystique/i.test(t) && radiator > 0;
  const air = !liquid && AIR_FAMILIES.test(t);
  if (!liquid && !air) return null;

  // ("Prizë për rrymë" is the power plug, so only CPU-socket and compatibility rows count)
  const socketText = Object.entries(s).filter(([k]) => /socket|foleja e procesorit|përputh/i.test(k)).map(([, v]) => v).join(' ');
  const sockets = new Set();
  if (/AM4/i.test(socketText)) sockets.add('AM4');
  if (/AM5/i.test(socketText)) sockets.add('AM5');
  if (/1700/.test(socketText)) sockets.add('LGA1700');
  if (/1851/.test(socketText) || /1700/.test(socketText)) sockets.add('LGA1851'); // same mounting holes
  // Current coolers ship with AM4/AM5 and LGA1700/1851 mounts; when the listing doesn't say, assume that
  const socketList = sockets.size ? ['AM4', 'AM5', 'LGA1700', 'LGA1851'].filter((x) => sockets.has(x)) : ['AM4', 'AM5', 'LGA1700', 'LGA1851'];

  const tdpSpec = num(Object.entries(s).find(([k]) => /tdp/i.test(k))?.[1] ?? t.match(/\b(\d{2,3})\s?W\b/i)?.[1]);
  if (liquid) {
    return {
      specs: {
        type: 'Liquid',
        sockets: socketList,
        radiatorMm: radiator,
        tdpRatingW: tdpSpec >= 100 ? tdpSpec : { 240: 250, 280: 280, 360: 300, 420: 320 }[radiator],
      },
    };
  }

  // The cooler's own height (not a radiator's); values without a unit can be cm or mm
  const heightEntry = Object.entries(s).find(([k]) => /^lartësia( e ftohësit)?( \[(mm|cm)\])?$/i.test(k));
  let height = heightEntry ? num(heightEntry[1]) : NaN;
  if (heightEntry && (/\[cm\]|cm/i.test(heightEntry[0] + heightEntry[1]) || height < 25)) height *= 10;
  const heightMm = height >= 30 && height <= 200 ? Math.round(height) : NaN;
  if (!heightMm) return null; // too risky to guess the height of an air cooler
  const dual = /dual|nh-d15|phantom spirit|peerless|frost commander|royal knight|dark rock pro|ak620|ag620/i.test(t);
  return {
    specs: {
      type: 'Air',
      sockets: socketList,
      heightMm,
      tdpRatingW: tdpSpec >= 50 ? tdpSpec : heightMm < 80 ? 65 : dual ? 220 : 150,
    },
  };
}

/** Short shop names ("VIPER Venom") get the key spec added so cards can be told apart */
function named(p, brand, suffix, already) {
  const name = cleanName(p.name, brand);
  return already.test(name) ? name : `${name} ${suffix}`.slice(0, 150);
}

function psuPart(p, brand) {
  const t = p.name;
  if (!/burim|psu|power supply|furnizues energjie|80\+|80 plus/i.test(t)) return null;
  if (/inverter|ups|emergjent|laptop|adapter|përshtatës|karikues|poe|led|bateri|sinus|solar|kasë|kase|kuti/i.test(t)) return null;
  const wattage = num(t.match(/(\d{3,4})\s?W\b/i)?.[1] ?? p.specs['Fuqia [W]']);
  if (!(wattage >= 300 && wattage <= 1800)) return null;
  const text = `${t} ${Object.values(p.specs).join(' ')}`;
  const eff = text.match(/titanium|platinum|gold|silver|bronze|white/i)?.[0];

  // "Kabllo modulare: Jo / Po (plotësisht)", otherwise the title; left out when unknown
  const modularSpec = Object.entries(p.specs).find(([k]) => /modular/i.test(k))?.[1] ?? '';
  const modular =
    /gjysm|semi/i.test(modularSpec + t) ? 'Semi'
    : /plot|full|po\b/i.test(modularSpec) || /modular/i.test(t) ? 'Full'
    : /^jo$/i.test(modularSpec.trim()) ? 'No'
    : undefined;

  return {
    name: named(p, brand, `${wattage}W`, /\d{3,4}\s?W/i),
    specs: {
      wattage,
      formFactor: /\bSFX/i.test(t) ? 'SFX' : 'ATX',
      efficiency: eff ? `80+ ${eff[0].toUpperCase()}${eff.slice(1).toLowerCase()}` : /80\s?(\+|plus)/i.test(text) ? '80+' : 'Standard',
      ...(modular ? { modular } : {}),
    },
  };
}

function ramPart(p, brand) {
  const t = p.name;
  if (/so-?dimm|laptop|notebook|ecc|rdimm|server|lavatri|frigorif/i.test(t)) return null;
  const memoryType = t.match(/DDR([45])/i) ? `DDR${t.match(/DDR([45])/i)[1]}` : null;
  if (!memoryType) return null;
  // "2x16GB", "(2 x 8 GB)" or G.Skill part numbers like F5-6000J3038F16GX2 (= 2 × 16GB)
  const kit = t.match(/(\d)\s?x\s?(\d{1,2})\s?GB/i);
  const code = t.match(/(\d{1,2})GX(\d)\b/i);
  const total = num(t.match(/(\d{1,3})\s?GB/i)?.[1]);
  const modules = kit ? +kit[1] : code ? +code[2] : 1;
  const capacityGb = kit ? +kit[1] * +kit[2] : code ? +code[1] * +code[2] : total;
  const speedMts = num(t.match(/(\d{4})\s?(?:MHz|MT\/s)/i)?.[1] ?? t.match(/(?:DDR[45]|F[45])[-\s](\d{4})/i)?.[1]);
  if (!(capacityGb >= 4 && capacityGb <= 256) || !(speedMts >= 1600 && speedMts <= 9000)) return null;
  const size = modules > 1 ? `${capacityGb}GB (${modules}x${capacityGb / modules}GB)` : `${capacityGb}GB`;
  return {
    name: named(p, brand, `${size} ${memoryType}-${speedMts}`, /\d+\s?GB/i),
    specs: { memoryType, capacityGb, modules, speedMts },
  };
}

function storagePart(p, brand) {
  const t = p.name;
  // PC makers' replacement drives (laptop/server spares) at spare-part prices
  if (['HP', 'Lenovo', 'Dell'].includes(brand)) return null;
  if (/portab|jashtëm|external|usb|adapter|përshtatës|kuti|enclosure|laptop|thinkpad|surveillance|purple|nas|red plus|skyhawk|ironwolf|hot plug|ultrastar|exos|server|\bsas\b/i.test(t)) return null;
  const nvme = /nvme|pci-?e|pcie/i.test(t);
  const m2 = /m\.?2/i.test(t);
  const in35 = /3[.,]5["″”]?/.test(t);
  const in25 = /2[.,]5["″”]?/.test(t);
  const sata = /sata/i.test(t);
  let spec;
  if (nvme) spec = { interface: 'NVMe', formFactor: 'M.2' };
  else if (m2 && sata) spec = { interface: 'SATA', formFactor: 'M.2' };
  else if (in35 && (sata || /hdd/i.test(t))) spec = { interface: 'SATA', formFactor: '3.5"' };
  else if ((in25 || /ssd/i.test(t)) && sata) spec = { interface: 'SATA', formFactor: '2.5"' };
  else return null;
  const cap = t.match(/(\d+(?:[.,]\d+)?)\s?(TB|GB)/i);
  if (!cap) return null;
  const capacityGb = Math.round(num(cap[1]) * (cap[2].toUpperCase() === 'TB' ? 1000 : 1));
  if (!(capacityGb >= 120 && capacityGb <= 30000)) return null;
  const size = capacityGb >= 1000 ? `${capacityGb / 1000}TB` : `${capacityGb}GB`;
  const kind = spec.formFactor === '3.5"' || /hdd|hard disk/i.test(t) ? 'HDD' : spec.interface === 'NVMe' ? 'NVMe' : 'SATA SSD';
  return {
    name: named(p, brand, `${size} ${kind}`, /\d+\s?(GB|TB)/i).replace(/^(Disk|SSD|HDD)\s+(SSD|HDD)?\s*/i, ''),
    specs: { ...spec, capacityGb },
  };
}

export const NORMALIZERS = { case: casePart, motherboard, cpu: cpuPart, cooler: coolerPart, gpu: gpuPart, psu: psuPart, ram: ramPart, storage: storagePart };

/** The shop's image CDN resizes on request; cards never need more than 400px */
const sized = (url) => (url.includes('50cdn.gjirafamall.tech') && !url.includes('?') ? `${url}?width=400` : url);

// ---------- Matching shop listings to the hand-checked catalog ----------

const STOP = new Set(['edition', 'the', 'gaming', 'wifi', 'with', 'and', 'black', 'white', 'reference', 'founders', 'low', 'profile', 'ssd', 'sata', 'nvme', 'oc']);
const tokens = (s) => s.toLowerCase().replace(/[()]/g, ' ').split(/[\s,/-]+/).filter((x) => x && !STOP.has(x));

async function curatedCatalog() {
  // parts.data.ts is TypeScript; read it with a tiny parser for slug/brand/name
  const src = await readFile(join(ROOT, 'src', 'seed', 'parts.data.ts'), 'utf8');
  const out = [];
  let category = null;
  for (const line of src.split('\n')) {
    const cat = line.match(/^\s{2}(\w+): \[$/);
    if (cat) category = cat[1];
    const m = line.match(/slug: '([^']+)', brand: '([^']+)', name: '([^']+)'/);
    if (m && category) out.push({ category, slug: m[1], brand: m[2], name: m[3] });
  }
  return out;
}

function matchCurated(curated, listings) {
  const result = {};
  for (const c of curated) {
    const pool = listings[c.category] ?? [];
    let hits;
    if (c.category === 'cpu') {
      const key = cpuKey(c.name);
      hits = pool.filter((p) => cpuKey(p.name) === key && !/tray|bulk|oem/i.test(p.name));
      if (!hits.length) hits = pool.filter((p) => cpuKey(p.name) === key);
    } else {
      const need = tokens(`${c.brand} ${c.name}`);
      hits = pool.filter((p) => {
        const have = new Set(tokens(p.name));
        return need.every((x) => have.has(x));
      });
    }
    const best = hits.filter((p) => p.image).sort((a, b) => a.price - b.price)[0];
    if (best) result[`${c.category}/${c.slug}`] = { price: best.price, imageUrl: sized(best.image), sourceUrl: best.url };
  }
  return result;
}

// ---------- Main ----------

async function main() {
  const raw = JSON.parse(await readFile(CACHE, 'utf8'));
  const parts = [];
  const stats = {};

  for (const [category, normalize] of Object.entries(NORMALIZERS)) {
    const seen = new Map();
    let kept = 0;
    const all = raw[category] ?? [];
    for (const p of all) {
      if (!p.image || !(p.price > 0)) continue;
      const brand = brandOf(p);
      const result = brand || category === 'cpu' ? normalize(p, brand) : null;
      if (!result) continue;
      const partBrand = result.brand ?? brand;
      if (!partBrand) continue;
      const name = result.name ?? cleanName(p.name, partBrand);
      // The same product is often listed several times (packaging, colour): keep the cheapest
      const dupKey = `${partBrand}|${name}`.toLowerCase();
      const prev = seen.get(dupKey);
      if (prev && prev.price <= p.price) continue;
      seen.set(dupKey, {
        category,
        slug: `${slugify(`${partBrand} ${name}`).slice(0, 100)}-g${p.id}`,
        brand: partBrand,
        name,
        price: Math.round(p.price * 100) / 100,
        specs: result.specs,
        imageUrl: sized(p.image),
        sourceUrl: p.url,
      });
      kept++;
    }
    parts.push(...seen.values());
    stats[category] = `${seen.size} of ${all.length}`;
  }

  const curated = await curatedCatalog();
  const curatedFromShop = matchCurated(curated, raw);

  const header = `// GENERATED by scripts/scrape/normalize.mjs from gjirafa50.com — do not edit by hand.
// ${new Date().toISOString().slice(0, 10)}: ${Object.entries(stats).map(([c, s]) => `${c} ${s}`).join(', ')}
import type { Category } from '../parts/part.types';
import type { SeedPart } from './parts.data';

/** Shop price (EUR), picture and link for hand-checked parts the shop also sells. Key: "category/slug" */
export const CURATED_FROM_SHOP: Record<string, { price: number; imageUrl: string; sourceUrl: string }> = `;
  const body = `${JSON.stringify(curatedFromShop, null, 2)};

/** Parts from the shop whose specs could be read reliably. Prices in EUR. */
export const SCRAPED: (SeedPart & { category: Category })[] = ${JSON.stringify(parts, null, 1)};
`;
  await writeFile(OUT, header + body);
  console.log(stats);
  console.log(`curated parts matched to the shop: ${Object.keys(curatedFromShop).length} of ${curated.length}`);
  console.log(`wrote ${parts.length} parts to ${OUT}`);
}

// Only run when executed directly (the functions above are also imported for debugging)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
