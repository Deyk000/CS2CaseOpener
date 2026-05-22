#!/usr/bin/env node
// Pulls live CS2 market prices in EUR from Skinport (primary) and falls back
// to Steam Market's priceoverview endpoint for anything Skinport doesn't list.
// Writes src/data/prices.generated.js → { "Market Hash Name": priceEUR, ... }.
//
// Usage: node tools/sync-prices.js
// Re-run whenever you want to refresh prices.

import fs from 'fs';
import path from 'path';
import https from 'https';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const SKIN_DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data', 'cases');
const OUT_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'prices.generated.js');

function get(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (cs2-case-opener price sync)',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, br, deflate',
            ...extraHeaders,
          },
          timeout: 30000,
        },
        (res) => {
          if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.resume();
            return resolve(get(res.headers.location, extraHeaders));
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            let buf = Buffer.concat(chunks);
            const enc = res.headers['content-encoding'];
            try {
              if (enc === 'gzip') buf = zlib.gunzipSync(buf);
              else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
              else if (enc === 'deflate') buf = zlib.inflateSync(buf);
            } catch {
              // leave as-is
            }
            resolve({ status: res.statusCode, body: buf.toString('utf8') });
          });
        },
      )
      .on('error', reject)
      .on('timeout', function () {
        this.destroy(new Error(`timeout ${url}`));
      });
  });
}

function parseSkinportPriceEUR(entry) {
  // suggested_price is Skinport's recommended sell price; falls back to median or mean.
  return Number(entry.suggested_price ?? entry.median_price ?? entry.mean_price ?? 0);
}

async function fetchSkinportMap() {
  console.log('Fetching Skinport price feed (EUR)...');
  const res = await get('https://api.skinport.com/v1/items?app_id=730&currency=EUR');
  if (res.status !== 200) {
    throw new Error(`Skinport HTTP ${res.status}`);
  }
  const arr = JSON.parse(res.body);
  const map = new Map();
  for (const entry of arr) {
    const price = parseSkinportPriceEUR(entry);
    if (price > 0 && entry.market_hash_name) {
      map.set(entry.market_hash_name, price);
    }
  }
  console.log(`  Skinport: ${map.size} priced items`);
  return map;
}

// Collect every (fullName, wear) combination from the regenerated case files.
function collectMarketHashNames() {
  const wears = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
  const baseNames = new Set();
  const cases = ['chroma', 'dreams', 'falchion', 'kilowatt', 'operation_riptide', 'prisma', 'recoil', 'revolution'];
  for (const id of cases) {
    const file = fs.readFileSync(path.join(SKIN_DATA_DIR, `${id}.js`), 'utf8');
    // Match `fullName: "..."` for regular skins, and `name: "★ ..."` for knives/gloves.
    const fullNameRe = /fullName:\s*"([^"]+)"/g;
    let m;
    while ((m = fullNameRe.exec(file))) baseNames.add(m[1]);
    const specialBlock = /specialItemPool\s*=\s*\[([\s\S]*?)\]/m.exec(file);
    if (specialBlock) {
      const nameRe = /name:\s*"([^"]+)"/g;
      let n;
      while ((n = nameRe.exec(specialBlock[1]))) baseNames.add(n[1]);
    }
  }
  return { baseNames: [...baseNames], wears };
}

// Compose Steam Market hash names: e.g. "AK-47 | Inheritance (Field-Tested)"
function withWear(name, wear) {
  return `${name} (${wear})`;
}

async function steamFallback(marketHashName) {
  const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(marketHashName)}`;
  const res = await get(url);
  if (res.status !== 200) return null;
  try {
    const data = JSON.parse(res.body);
    if (!data?.success) return null;
    const raw = data.lowest_price || data.median_price;
    if (!raw) return null;
    // "52,06€" or "1 234,56€" -> 52.06
    const num = Number(String(raw).replace(/[^\d,.\s]/g, '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

async function main() {
  const { baseNames, wears } = collectMarketHashNames();
  console.log(`Resolving prices for ${baseNames.length} unique skins...`);

  const skinport = await fetchSkinportMap();

  // For each base name, compute an average across the wears that exist in Skinport.
  const result = {};
  const fallbackQueue = [];
  for (const base of baseNames) {
    const prices = [];
    for (const wear of wears) {
      const hash = withWear(base, wear);
      const p = skinport.get(hash);
      if (p) prices.push(p);
    }
    // Knives/gloves: also try the bare name (vanilla pickups don't have a wear suffix in some cases)
    if (skinport.has(base)) prices.push(skinport.get(base));
    if (prices.length > 0) {
      // Use median across available wears.
      prices.sort((a, b) => a - b);
      result[base] = Number(prices[Math.floor(prices.length / 2)].toFixed(2));
    } else {
      fallbackQueue.push(base);
    }
  }

  console.log(`  resolved via Skinport: ${Object.keys(result).length}`);
  console.log(`  needs fallback:        ${fallbackQueue.length}`);

  // Steam fallback (rate-limited, 1.2 s between calls).
  for (const base of fallbackQueue) {
    // Try the most common wear first; if that 404s, try the others.
    let price = null;
    for (const wear of wears) {
      const hash = withWear(base, wear);
      // eslint-disable-next-line no-await-in-loop
      price = await steamFallback(hash);
      if (price) break;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1200));
    }
    if (!price) {
      // Knife vanilla form
      // eslint-disable-next-line no-await-in-loop
      price = await steamFallback(base);
    }
    if (price) {
      result[base] = Number(price.toFixed(2));
      console.log(`  fallback OK: ${base} -> €${price.toFixed(2)}`);
    } else {
      console.log(`  fallback FAIL: ${base}`);
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Write generated module.
  const header = `// AUTO-GENERATED by tools/sync-prices.js — do not edit by hand.
// Run \`node tools/sync-prices.js\` to refresh.
// Prices are in EUR, sourced from Skinport (primary) and Steam Market (fallback).
// Each value is the median across available wear tiers.
`;
  const body = `export const PRICES = ${JSON.stringify(result, null, 2)};\n`;
  fs.writeFileSync(OUT_PATH, header + '\n' + body);
  console.log(`\nWrote ${path.relative(PROJECT_ROOT, OUT_PATH)} with ${Object.keys(result).length} prices.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
