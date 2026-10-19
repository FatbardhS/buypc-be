// Stage 1: crawls gjirafa50.com PC-part categories and caches every product's
// name, price, picture and spec table to scripts/scrape/.cache/raw.json.
//
//   node scripts/scrape/fetch.mjs            (all categories, up to 12 pages each)
//   node scripts/scrape/fetch.mjs gpu cpu    (only some)
//
// Polite by design: one request at a time with a pause, only paths robots.txt allows.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://gjirafa50.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; BYPC-catalog/1.0)' };
const DELAY_MS = 400;
const MAX_PAGES = 12;
const CONCURRENCY = 3;

/** Our category → shop listing pages */
const SOURCES = {
  case: ['per-kompjuter-kasa'],
  motherboard: ['pllake-ame-per-kompjuter'],
  cpu: ['per-kompjuter-procesor'],
  cooler: ['ftohes-per-kompjuter', 'me-uje-ftohes'],
  gpu: ['kartela-grafike-per-kompjuter'],
  psu: ['burime-energjie'],
  ram: ['memorie-operative-per-kompjuter'],
  storage: ['per-kompjuter-disk'],
};

const CACHE = join(dirname(fileURLToPath(import.meta.url)), '.cache', 'raw.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function decode(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function get(path) {
  await sleep(DELAY_MS);
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(BASE + path, { headers: HEADERS });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt >= 3) throw err;
      await sleep(2000 * attempt);
    }
  }
}

/** Product cards on a listing page */
function parseListing(html) {
  const cards = html.split('class="item-box"').slice(1);
  return cards.flatMap((card) => {
    const id = card.match(/data-productid="(\d+)"/)?.[1];
    const href = card.match(/product-title[\s\S]*?href="(\/[^"]+)"/)?.[1];
    const name = card.match(/product-title[\s\S]*?title="([^"]+)"/)?.[1];
    const price = card.match(/class="price main[^>]*>([\d.,]+)/)?.[1];
    if (!id || !href || !name || !price) return [];
    return [{ id, path: href, name: decode(name), price: Number(price.replace(/,/g, '')) }];
  });
}

/** Spec table, brand and full-size picture from a product page */
function parseProduct(html) {
  const specs = {};
  for (const m of html.matchAll(/spec-name[^>]*>([\s\S]*?)<\/h3>\s*<div class="spec-value[^>]*>([\s\S]*?)<\/div>/g)) {
    const key = decode(m[1]).replace(/:$/, '').trim();
    if (key && !(key in specs)) specs[key] = decode(m[2]);
  }
  const image = html.match(/property="og:image" content="([^"]+)"/)?.[1] ?? null;
  return { specs, image };
}

async function main() {
  const only = process.argv.slice(2);
  let cache = {};
  try {
    cache = JSON.parse(await readFile(CACHE, 'utf8'));
  } catch {
    // first run
  }

  for (const [category, listings] of Object.entries(SOURCES)) {
    if (only.length && !only.includes(category)) continue;
    const products = new Map();

    for (const listing of listings) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const html = await get(`/${listing}${page > 1 ? `?pagenumber=${page}` : ''}`);
        const items = html ? parseListing(html) : [];
        const fresh = items.filter((p) => !products.has(p.id));
        fresh.forEach((p) => products.set(p.id, p));
        console.log(`${category} ${listing} p${page}: ${items.length} items (${fresh.length} new)`);
        if (!fresh.length) break;
      }
    }

    const previous = new Map((cache[category] ?? []).map((p) => [p.id, p]));
    const out = [];
    const todo = [];
    for (const p of products.values()) {
      // Spec tables rarely change, so only new products are opened
      const known = previous.get(p.id);
      if (known?.specs) out.push({ ...known, name: p.name, price: p.price });
      else todo.push(p);
    }

    // A few product pages at a time
    for (let i = 0; i < todo.length; i += CONCURRENCY) {
      const batch = todo.slice(i, i + CONCURRENCY);
      const pages = await Promise.all(batch.map((p) => get(p.path)));
      batch.forEach((p, j) => pages[j] && out.push({ ...p, url: BASE + p.path, ...parseProduct(pages[j]) }));

      if ((i / CONCURRENCY) % 10 === 9) {
        console.log(`  ${category}: ${i + batch.length}/${todo.length} new product pages`);
        // Save progress so an interrupted run can pick up where it stopped
        const done = new Set(out.map((p) => p.id));
        cache[category] = [...out, ...[...previous.values()].filter((p) => !done.has(p.id))];
        await mkdir(dirname(CACHE), { recursive: true });
        await writeFile(CACHE, JSON.stringify(cache, null, 1));
      }
    }
    cache[category] = out;
    await mkdir(dirname(CACHE), { recursive: true });
    await writeFile(CACHE, JSON.stringify(cache, null, 1));
    console.log(`${category}: ${out.length} products cached`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
