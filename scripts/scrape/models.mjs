// Reference specs for processor and graphics chips, keyed by model. A shop listing only names the
// model, so its compatibility and performance figures come from here (manufacturer spec sheets).
// Tiers follow the hand-checked catalog in src/seed/parts.data.ts (1 = entry … 5 = enthusiast).

const cpu = (socket, cores, threads, boostGhz, tdpW, maxPowerW, integratedGraphics, gamingTier, workTier) => ({
  socket, cores, threads, boostGhz, tdpW, maxPowerW, integratedGraphics, gamingTier, workTier,
});

/** Key: normalised model, e.g. "ryzen 7 7800x3d", "i5-14400f", "ultra 7 265k" */
export const CPUS = {
  // AMD AM4
  'ryzen 3 3200g': cpu('AM4', 4, 4, 4.0, 65, 88, true, 1, 1),
  'ryzen 3 4100': cpu('AM4', 4, 8, 4.0, 65, 88, false, 1, 1),
  'ryzen 5 5500gt': cpu('AM4', 6, 12, 4.4, 65, 88, true, 1, 1),
  'ryzen 7 5800xt': cpu('AM4', 8, 16, 4.8, 105, 142, false, 2, 3),
  'ryzen 5 3600': cpu('AM4', 6, 12, 4.2, 65, 88, false, 1, 2),
  'ryzen 5 4500': cpu('AM4', 6, 12, 4.1, 65, 88, false, 1, 1),
  'ryzen 5 4600g': cpu('AM4', 6, 12, 4.2, 65, 88, true, 1, 1),
  'ryzen 5 5500': cpu('AM4', 6, 12, 4.2, 65, 88, false, 1, 2),
  'ryzen 5 5600': cpu('AM4', 6, 12, 4.4, 65, 76, false, 2, 2),
  'ryzen 5 5600g': cpu('AM4', 6, 12, 4.4, 65, 88, true, 1, 1),
  'ryzen 5 5600gt': cpu('AM4', 6, 12, 4.6, 65, 88, true, 1, 1),
  'ryzen 5 5600x': cpu('AM4', 6, 12, 4.6, 65, 76, false, 2, 2),
  'ryzen 5 5600xt': cpu('AM4', 6, 12, 4.7, 65, 88, false, 2, 2),
  'ryzen 5 5600t': cpu('AM4', 6, 12, 4.5, 65, 88, false, 2, 2),
  'ryzen 7 5700': cpu('AM4', 8, 16, 4.6, 65, 88, false, 2, 2),
  'ryzen 7 5700g': cpu('AM4', 8, 16, 4.6, 65, 88, true, 1, 2),
  'ryzen 7 5700x': cpu('AM4', 8, 16, 4.6, 65, 76, false, 2, 3),
  'ryzen 7 5700x3d': cpu('AM4', 8, 16, 4.1, 105, 142, false, 3, 2),
  'ryzen 7 5800x': cpu('AM4', 8, 16, 4.7, 105, 142, false, 2, 3),
  'ryzen 7 5800x3d': cpu('AM4', 8, 16, 4.5, 105, 142, false, 3, 2),
  'ryzen 9 5900x': cpu('AM4', 12, 24, 4.8, 105, 142, false, 2, 4),
  'ryzen 9 5900xt': cpu('AM4', 16, 32, 4.8, 105, 142, false, 2, 4),
  'ryzen 9 5950x': cpu('AM4', 16, 32, 4.9, 105, 142, false, 2, 4),
  // AMD AM5 (all have basic built-in graphics except the F models)
  'ryzen 5 7500f': cpu('AM5', 6, 12, 5.0, 65, 88, false, 3, 2),
  'ryzen 5 7500x3d': cpu('AM5', 6, 12, 4.5, 65, 88, true, 3, 2),
  'ryzen 5 7600': cpu('AM5', 6, 12, 5.1, 65, 88, true, 3, 2),
  'ryzen 5 7600x': cpu('AM5', 6, 12, 5.3, 105, 142, true, 3, 2),
  'ryzen 5 7600x3d': cpu('AM5', 6, 12, 4.7, 65, 88, true, 4, 2),
  'ryzen 5 8400f': cpu('AM5', 6, 12, 4.7, 65, 88, false, 2, 2),
  'ryzen 5 8500g': cpu('AM5', 6, 12, 5.0, 65, 88, true, 2, 2),
  'ryzen 5 8600g': cpu('AM5', 6, 12, 5.0, 65, 88, true, 2, 2),
  'ryzen 7 8700f': cpu('AM5', 8, 16, 5.0, 65, 88, false, 3, 3),
  'ryzen 7 8700g': cpu('AM5', 8, 16, 5.1, 65, 88, true, 2, 3),
  'ryzen 5 9600': cpu('AM5', 6, 12, 5.2, 65, 88, true, 3, 2),
  'ryzen 5 9600x': cpu('AM5', 6, 12, 5.4, 65, 88, true, 3, 3),
  'ryzen 7 7700': cpu('AM5', 8, 16, 5.3, 65, 88, true, 3, 3),
  'ryzen 7 7700x': cpu('AM5', 8, 16, 5.4, 105, 142, true, 3, 3),
  'ryzen 7 7800x3d': cpu('AM5', 8, 16, 5.0, 120, 162, true, 5, 3),
  'ryzen 7 9700x': cpu('AM5', 8, 16, 5.5, 65, 88, true, 4, 3),
  'ryzen 7 9800x3d': cpu('AM5', 8, 16, 5.2, 120, 162, true, 5, 3),
  'ryzen 7 9850x3d': cpu('AM5', 8, 16, 5.6, 120, 162, true, 5, 3),
  'ryzen 9 7900': cpu('AM5', 12, 24, 5.4, 65, 88, true, 3, 4),
  'ryzen 9 7900x': cpu('AM5', 12, 24, 5.6, 170, 230, true, 4, 4),
  'ryzen 9 7900x3d': cpu('AM5', 12, 24, 5.6, 120, 162, true, 4, 4),
  'ryzen 9 7950x': cpu('AM5', 16, 32, 5.7, 170, 230, true, 4, 5),
  'ryzen 9 7950x3d': cpu('AM5', 16, 32, 5.7, 120, 162, true, 5, 5),
  'ryzen 9 9900x': cpu('AM5', 12, 24, 5.6, 120, 162, true, 4, 4),
  'ryzen 9 9900x3d': cpu('AM5', 12, 24, 5.5, 120, 162, true, 5, 4),
  'ryzen 9 9950x': cpu('AM5', 16, 32, 5.7, 170, 230, true, 4, 5),
  'ryzen 9 9950x3d': cpu('AM5', 16, 32, 5.7, 170, 230, true, 5, 5),
  'ryzen 9 9950x3d2': cpu('AM5', 16, 32, 5.6, 200, 230, true, 5, 5),
  // Intel LGA1700 (12th–14th gen). "F" = no built-in graphics
  'i3-12100': cpu('LGA1700', 4, 8, 4.3, 60, 89, true, 1, 1),
  'i3-12100f': cpu('LGA1700', 4, 8, 4.3, 58, 89, false, 1, 1),
  'i3-13100': cpu('LGA1700', 4, 8, 4.5, 60, 89, true, 1, 1),
  'i3-13100f': cpu('LGA1700', 4, 8, 4.5, 58, 89, false, 1, 1),
  'i3-14100': cpu('LGA1700', 4, 8, 4.7, 60, 110, true, 1, 1),
  'i3-14100f': cpu('LGA1700', 4, 8, 4.7, 58, 110, false, 1, 1),
  'i5-12400': cpu('LGA1700', 6, 12, 4.4, 65, 117, true, 2, 2),
  'i5-12400f': cpu('LGA1700', 6, 12, 4.4, 65, 117, false, 2, 2),
  'i5-12600k': cpu('LGA1700', 10, 16, 4.9, 125, 150, true, 3, 2),
  'i5-12600kf': cpu('LGA1700', 10, 16, 4.9, 125, 150, false, 3, 2),
  'i5-13400': cpu('LGA1700', 10, 16, 4.6, 65, 148, true, 2, 2),
  'i5-13400f': cpu('LGA1700', 10, 16, 4.6, 65, 148, false, 2, 2),
  'i5-12600': cpu('LGA1700', 6, 12, 4.8, 65, 117, true, 2, 2),
  'i5-14600': cpu('LGA1700', 14, 20, 5.2, 65, 154, true, 3, 3),
  'i9-12900': cpu('LGA1700', 16, 24, 5.1, 65, 202, true, 3, 4),
  'i9-12900f': cpu('LGA1700', 16, 24, 5.1, 65, 202, false, 3, 4),
  'i9-13900': cpu('LGA1700', 24, 32, 5.6, 65, 219, true, 4, 5),
  'i9-13900f': cpu('LGA1700', 24, 32, 5.6, 65, 219, false, 4, 5),
  'i5-12500': cpu('LGA1700', 6, 12, 4.6, 65, 117, true, 2, 2),
  'i5-13500': cpu('LGA1700', 14, 20, 4.8, 65, 154, true, 2, 3),
  'i5-14500': cpu('LGA1700', 14, 20, 5.0, 65, 154, true, 3, 3),
  'i5-13600k': cpu('LGA1700', 14, 20, 5.1, 125, 181, true, 3, 3),
  'i5-13600kf': cpu('LGA1700', 14, 20, 5.1, 125, 181, false, 3, 3),
  'i5-14400': cpu('LGA1700', 10, 16, 4.7, 65, 148, true, 2, 2),
  'i5-14400f': cpu('LGA1700', 10, 16, 4.7, 65, 148, false, 2, 2),
  'i5-14600k': cpu('LGA1700', 14, 20, 5.3, 125, 181, true, 3, 3),
  'i5-14600kf': cpu('LGA1700', 14, 20, 5.3, 125, 181, false, 3, 3),
  'i7-12700': cpu('LGA1700', 12, 20, 4.9, 65, 180, true, 3, 3),
  'i7-12700f': cpu('LGA1700', 12, 20, 4.9, 65, 180, false, 3, 3),
  'i7-12700k': cpu('LGA1700', 12, 20, 5.0, 125, 190, true, 3, 3),
  'i7-12700kf': cpu('LGA1700', 12, 20, 5.0, 125, 190, false, 3, 3),
  'i7-13700': cpu('LGA1700', 16, 24, 5.2, 65, 219, true, 3, 4),
  'i7-13700f': cpu('LGA1700', 16, 24, 5.2, 65, 219, false, 3, 4),
  'i7-13700k': cpu('LGA1700', 16, 24, 5.4, 125, 253, true, 4, 4),
  'i7-13700kf': cpu('LGA1700', 16, 24, 5.4, 125, 253, false, 4, 4),
  'i7-14700': cpu('LGA1700', 20, 28, 5.4, 65, 219, true, 4, 4),
  'i7-14700f': cpu('LGA1700', 20, 28, 5.4, 65, 219, false, 4, 4),
  'i7-14700k': cpu('LGA1700', 20, 28, 5.6, 125, 253, true, 4, 4),
  'i7-14700kf': cpu('LGA1700', 20, 28, 5.6, 125, 253, false, 4, 4),
  'i9-12900k': cpu('LGA1700', 16, 24, 5.2, 125, 241, true, 3, 4),
  'i9-12900kf': cpu('LGA1700', 16, 24, 5.2, 125, 241, false, 3, 4),
  'i9-13900k': cpu('LGA1700', 24, 32, 5.8, 125, 253, true, 4, 5),
  'i9-13900kf': cpu('LGA1700', 24, 32, 5.8, 125, 253, false, 4, 5),
  'i9-14900': cpu('LGA1700', 24, 32, 5.8, 65, 219, true, 4, 5),
  'i9-14900f': cpu('LGA1700', 24, 32, 5.8, 65, 219, false, 4, 5),
  'i9-14900k': cpu('LGA1700', 24, 32, 6.0, 125, 253, true, 4, 5),
  'i9-14900kf': cpu('LGA1700', 24, 32, 6.0, 125, 253, false, 4, 5),
  'i9-14900ks': cpu('LGA1700', 24, 32, 6.2, 150, 253, true, 4, 5),
  // Intel LGA1851 (Core Ultra 200S)
  'ultra 5 225': cpu('LGA1851', 10, 10, 4.9, 65, 121, true, 2, 2),
  'ultra 5 225f': cpu('LGA1851', 10, 10, 4.9, 65, 121, false, 2, 2),
  'ultra 5 235': cpu('LGA1851', 14, 14, 5.0, 65, 121, true, 3, 3),
  'ultra 5 245k': cpu('LGA1851', 14, 14, 5.2, 125, 159, true, 3, 3),
  'ultra 5 245kf': cpu('LGA1851', 14, 14, 5.2, 125, 159, false, 3, 3),
  'ultra 5 250k plus': cpu('LGA1851', 18, 18, 5.3, 125, 159, true, 3, 3),
  'ultra 7 265': cpu('LGA1851', 20, 20, 5.3, 65, 182, true, 4, 4),
  'ultra 7 265f': cpu('LGA1851', 20, 20, 5.3, 65, 182, false, 4, 4),
  'ultra 7 265k': cpu('LGA1851', 20, 20, 5.5, 125, 250, true, 4, 4),
  'ultra 7 265kf': cpu('LGA1851', 20, 20, 5.5, 125, 250, false, 4, 4),
  'ultra 7 270k plus': cpu('LGA1851', 24, 24, 5.5, 125, 250, true, 4, 4),
  'ultra 9 285': cpu('LGA1851', 24, 24, 5.6, 65, 182, true, 4, 5),
  'ultra 9 285k': cpu('LGA1851', 24, 24, 5.7, 125, 250, true, 4, 5),
};

/** Finds the CPU model in a shop title. */
export function cpuKey(title) {
  const t = title.toLowerCase().replace(/®|™/g, '');
  let m = t.match(/ryzen\s*([3579])\s*(\d{4})\s*(x3d2|x3d|xt|gt|x|g|f|t)?\b/);
  if (m) return `ryzen ${m[1]} ${m[2]}${m[3] ?? ''}`;
  // "Ryzen 9950X3D2" without the 3/5/7/9 class: it follows from the model number
  m = t.match(/ryzen\s*([5789])(\d)(\d{2})\s*(x3d2|x3d|xt|gt|x|g|f)?\b/);
  if (m) {
    const cls = { 9: 9, 8: 7, 7: 7, 6: 5, 5: 5 }[m[2]];
    if (cls) return `ryzen ${cls} ${m[1]}${m[2]}${m[3]}${m[4] ?? ''}`;
  }
  m = t.match(/\bi([3579])[\s-]*(1[2-4]\d{3})\s*(ks|kf|k|f)?\b/);
  if (m) return `i${m[1]}-${m[2]}${m[3] ?? ''}`;
  m = t.match(/ultra\s*([579])\s*(?:desktop\s*)?(2\d{2})\s*(kf|k|f)?\s*(plus)?\b/);
  if (m) return `ultra ${m[1]} ${m[2]}${m[3] ?? ''}${m[4] ? ' plus' : ''}`;
  return null;
}

const gpu = (vramGb, powerW, recommendedPsuW, tier, lengthMm) => ({ vramGb, powerW, recommendedPsuW, tier, lengthMm });

/**
 * Key: normalised chip. lengthMm is a typical partner card, used only when the shop doesn't list
 * the card's length (on the long side, so a "fits" is safe).
 */
export const GPUS = {
  'GeForce GT 1030': gpu(2, 30, 300, 1, 180),
  'GeForce GT 710': gpu(2, 19, 300, 1, 170),
  'GeForce GT 730': gpu(2, 38, 300, 1, 170),
  'GeForce GTX 1050 Ti': gpu(4, 75, 300, 1, 230),
  'GeForce GTX 1650': gpu(4, 75, 300, 1, 230),
  'GeForce GTX 1660 Super': gpu(6, 125, 450, 1, 240),
  'GeForce RTX 2060 Super': gpu(8, 175, 550, 2, 270),
  'Radeon RX 580': gpu(8, 185, 500, 1, 270),
  'Radeon RX 6400': gpu(4, 53, 350, 1, 190),
  'Radeon RX 6700 XT': gpu(12, 230, 650, 2, 290),
  'Arc A310': gpu(4, 75, 300, 1, 190),
  'GeForce RTX 3050': gpu(8, 130, 550, 1, 245),
  'GeForce RTX 3060': gpu(12, 170, 550, 2, 270),
  'GeForce RTX 3060 Ti': gpu(8, 200, 600, 2, 280),
  'GeForce RTX 3070': gpu(8, 220, 650, 3, 300),
  'GeForce RTX 4060': gpu(8, 115, 550, 2, 250),
  'GeForce RTX 4060 Ti': gpu(8, 160, 550, 2, 270),
  'GeForce RTX 4070': gpu(12, 200, 650, 3, 300),
  'GeForce RTX 4070 Super': gpu(12, 220, 650, 3, 305),
  'GeForce RTX 4070 Ti': gpu(12, 285, 700, 3, 320),
  'GeForce RTX 4070 Ti Super': gpu(16, 285, 700, 4, 320),
  'GeForce RTX 4080': gpu(16, 320, 750, 4, 340),
  'GeForce RTX 4080 Super': gpu(16, 320, 750, 4, 340),
  'GeForce RTX 4090': gpu(24, 450, 1000, 5, 360),
  'GeForce RTX 5050': gpu(8, 130, 550, 1, 250),
  'GeForce RTX 5060': gpu(8, 145, 550, 2, 260),
  'GeForce RTX 5060 Ti': gpu(16, 180, 600, 2, 280),
  'GeForce RTX 5070': gpu(12, 250, 650, 3, 305),
  'GeForce RTX 5070 Ti': gpu(16, 300, 750, 4, 335),
  'GeForce RTX 5080': gpu(16, 360, 850, 4, 340),
  'GeForce RTX 5090': gpu(32, 575, 1000, 5, 360),
  'Radeon RX 6500 XT': gpu(4, 107, 400, 1, 200),
  'Radeon RX 6600': gpu(8, 132, 450, 2, 240),
  'Radeon RX 6650 XT': gpu(8, 180, 500, 2, 260),
  'Radeon RX 6750 XT': gpu(12, 250, 650, 2, 290),
  'Radeon RX 7600': gpu(8, 165, 550, 2, 260),
  'Radeon RX 7600 XT': gpu(16, 190, 600, 2, 270),
  'Radeon RX 7700 XT': gpu(12, 245, 700, 3, 290),
  'Radeon RX 7800 XT': gpu(16, 263, 700, 3, 320),
  'Radeon RX 7900 GRE': gpu(16, 260, 700, 3, 320),
  'Radeon RX 7900 XT': gpu(20, 315, 750, 4, 330),
  'Radeon RX 7900 XTX': gpu(24, 355, 800, 4, 340),
  'Radeon RX 9060 XT': gpu(16, 160, 450, 2, 260),
  'Radeon RX 9070': gpu(16, 220, 650, 3, 310),
  'Radeon RX 9070 XT': gpu(16, 304, 750, 4, 330),
  'Arc A380': gpu(6, 75, 300, 1, 200),
  'Arc A750': gpu(8, 225, 600, 2, 270),
  'Arc A770': gpu(16, 225, 650, 2, 280),
  'Arc B570': gpu(10, 150, 500, 2, 270),
  'Arc B580': gpu(12, 190, 600, 2, 272),
};

/** Finds the graphics chip in a shop title. */
export function gpuKey(title) {
  const t = title.replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  let m = t.match(/\b(GTX|RTX|GT)\s?(\d{3,4})\s?(Ti)?\s?(Super)?\b/i);
  if (m) {
    const key = `GeForce ${m[1].toUpperCase()} ${m[2]}${m[3] ? ' Ti' : ''}${m[4] ? ' Super' : ''}`;
    if (GPUS[key]) return key;
  }
  // "RTX5070" without a space (ASUS model codes like PRIME-RTX5070-O12G)
  m = t.match(/RTX\s?(\d{4})\s?(TI)?/i);
  if (m) {
    const key = `GeForce RTX ${m[1]}${m[2] ? ' Ti' : ''}`;
    if (GPUS[key]) return key;
  }
  m = t.match(/\bRX\s?(\d{4})\s?(XTX|XT|GRE)?\b/i);
  if (m) {
    const key = `Radeon RX ${m[1]}${m[2] ? ' ' + m[2].toUpperCase() : ''}`;
    if (GPUS[key]) return key;
  }
  m = t.match(/\bArc\s?([AB]\d{3})\b/i);
  if (m) {
    const key = `Arc ${m[1].toUpperCase()}`;
    if (GPUS[key]) return key;
  }
  return null;
}
