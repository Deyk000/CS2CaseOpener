#!/usr/bin/env node
// Downloads case + skin images from the ByMykel CSGO-API and regenerates
// src/data/cases/*.js so the in-app case contents match the real Valve drop pools.
//
// Fallback chain per image:
//   1. ByMykel CSGO-API direct CDN URL (steamcommunity-a.akamaihd.net)
//   2. CSGOStash skin page scrape (extract og:image)
//   3. Skip with a row in reports/missing-images.json
//
// Usage: node tools/sync-from-api.js

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Known-bad placeholder image hashes (Steam logo / "image not found" PNGs).
// Files matching these hashes are treated as missing and will be re-downloaded.
const PLACEHOLDER_HASHES = new Set([
  '6cb869df089146c12efb5e9c968e911c314842624ba6f052a11346ac734cadc8', // Steam logo placeholder (10863 bytes)
]);

function fileHash(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKINS_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'images', 'skins');
const CASES_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'images', 'cases');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data', 'cases');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');

for (const dir of [SKINS_DIR, CASES_DIR, DATA_DIR, REPORTS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Target cases — name must match ByMykel's "name" field exactly.
// Each entry maps to the in-app file (src/data/cases/<file>.js) and export name.
const TARGET_CASES = [
  { apiName: 'Chroma Case', file: 'chroma', exportName: 'chromaCase', imageFile: 'chroma_case.png' },
  { apiName: 'Dreams & Nightmares Case', file: 'dreams', exportName: 'dreamsCase', imageFile: 'dreams_case.png' },
  { apiName: 'Falchion Case', file: 'falchion', exportName: 'falchionCase', imageFile: 'falchion_case.png' },
  { apiName: 'Kilowatt Case', file: 'kilowatt', exportName: 'kilowattCase', imageFile: 'kilowatt_case.png' },
  { apiName: 'Operation Riptide Case', file: 'operation_riptide', exportName: 'operationRiptideCase', imageFile: 'operation_riptide_case.png' },
  { apiName: 'Prisma Case', file: 'prisma', exportName: 'prismaCase', imageFile: 'prisma_case.png' },
  { apiName: 'Recoil Case', file: 'recoil', exportName: 'recoilCase', imageFile: 'recoil_case.png' },
  { apiName: 'Revolution Case', file: 'revolution', exportName: 'revolutionCase', imageFile: 'revolution_case.png' },
];

const RARITY_MAP = {
  'Consumer Grade': 'CONSUMER',
  'Industrial Grade': 'INDUSTRIAL',
  'Mil-Spec Grade': 'MIL_SPEC',
  'Restricted': 'RESTRICTED',
  'Classified': 'CLASSIFIED',
  'Covert': 'COVERT',
  'Contraband': 'COVERT',
  'Extraordinary': 'KNIFE',
  '★': 'KNIFE',
};

// One representative knife finish per knife type (used when an item is a knife/gloves group)
const PREFERRED_KNIFE_FINISH = ['Doppler', 'Fade', 'Marble Fade', 'Tiger Tooth', 'Slaughter', 'Crimson Web', 'Case Hardened'];

function get(url, { binary = false } = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('http://') ? http : https;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 cs2-case-opener-sync' }, timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return resolve(get(next, { binary }));
      }
      if (res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(binary ? buf : buf.toString('utf8'));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout ' + url)); });
  });
}

function isValidImage(buf) {
  if (!buf || buf.length < 1024) return false;
  // PNG magic
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // JPEG magic
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // WEBP -> "RIFF....WEBP"
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return true;
  return false;
}

function slugifyFile(name) {
  return name
    .normalize('NFKD')
    .replace(/[★★]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

// Source 1: ByMykel CDN URL is already in the item.image field
// Source 2: CSGOStash page scrape
async function stashFallback(itemName) {
  const slug = itemName
    .replace(/^★\s*/u, '')
    .replace(/\s*\|\s*/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .toLowerCase();
  const searchUrl = `https://csgostash.com/skin/${slug}`;
  try {
    const html = await get(searchUrl);
    const m = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    if (m) {
      return await get(m[1], { binary: true });
    }
  } catch {}
  return null;
}

async function downloadImage(itemName, cdnUrl, destPath) {
  if (fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath);
    if (stat.size > 4096) {
      const hash = fileHash(destPath);
      if (!PLACEHOLDER_HASHES.has(hash)) {
        return { ok: true, source: 'cache' };
      }
      // It's a known placeholder — fall through and try to re-download
    }
  }
  // Try CDN URL
  if (cdnUrl) {
    try {
      const buf = await get(cdnUrl, { binary: true });
      if (isValidImage(buf)) {
        fs.writeFileSync(destPath, buf);
        return { ok: true, source: 'api' };
      }
    } catch (e) {
      // continue to fallback
    }
  }
  // Fallback to CSGOStash
  const buf = await stashFallback(itemName);
  if (buf && isValidImage(buf)) {
    fs.writeFileSync(destPath, buf);
    return { ok: true, source: 'stash' };
  }
  return { ok: false, source: 'none' };
}

function rarityKey(rarityName) {
  if (!rarityName) return 'MIL_SPEC';
  if (RARITY_MAP[rarityName]) return RARITY_MAP[rarityName];
  // ByMykel uses { id, name } for rarity in some endpoints; "name" might be the cleaned label
  return RARITY_MAP[rarityName.trim()] ?? 'MIL_SPEC';
}

function pickPreferredFinish(items) {
  // items: array of variants of one knife/glove (e.g. ★ Karambit | <finish>)
  if (!items || items.length === 0) return null;
  for (const finish of PREFERRED_KNIFE_FINISH) {
    const hit = items.find((i) => i.name.endsWith(`| ${finish}`));
    if (hit) return hit;
  }
  return items[0];
}

const LABEL_TO_ID = {
  'Consumer Grade': 'consumer',
  'Industrial Grade': 'industrial',
  'Mil-Spec Grade': 'milspec',
  'Restricted': 'restricted',
  'Classified': 'classified',
  'Covert': 'covert',
  'Rare Special Item': 'extraordinary',
};

function buildCaseEntry({ caseName, imageFile, skins, knives }) {
  return {
    name: caseName,
    image: imageFile,
    skins: skins.map((s) => {
      const finishOrName = s.name.split('|').slice(1).join('|').trim() || s.name;
      return {
        name: finishOrName,
        fullName: s.name,
        rarityName: s.rarityName ?? null,
        rarityId: LABEL_TO_ID[s.rarityName] ?? null,
        image: s.image,
        stattrak: true,
      };
    }),
    specialPool: knives.map((k) => ({
      name: k.name,
      fullName: k.name,
      rarityName: 'Rare Special Item',
      rarityId: 'extraordinary',
      image: k.image,
      stattrak: true,
    })),
  };
}

async function main() {
  console.log('Fetching ByMykel CSGO-API catalogues...');
  const API_BASE = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en';
  const cratesJson = JSON.parse(await get(`${API_BASE}/crates.json`));
  const skinsJson = JSON.parse(await get(`${API_BASE}/skins.json`));

  const skinById = new Map(skinsJson.map((s) => [s.id, s]));
  const crateByName = new Map(cratesJson.map((c) => [c.name, c]));

  const failures = [];
  let downloaded = 0;
  let cached = 0;
  const accumulatedCases = [];

  for (const target of TARGET_CASES) {
    const crate = crateByName.get(target.apiName);
    if (!crate) {
      console.warn(`!! Crate not found in API: ${target.apiName}`);
      failures.push({ kind: 'crate', name: target.apiName, reason: 'not in API' });
      continue;
    }

    console.log(`\n=== ${crate.name} ===`);

    // 1. Download the case image
    const casePath = path.join(CASES_DIR, target.imageFile);
    const caseRes = await downloadImage(crate.name, crate.image, casePath);
    if (caseRes.ok) {
      if (caseRes.source === 'cache') cached++; else downloaded++;
      console.log(`  case image: ${caseRes.source} -> ${target.imageFile}`);
    } else {
      failures.push({ kind: 'case', name: crate.name });
      console.log(`  case image: FAILED`);
    }

    // 2. Resolve all contained skins
    const skinEntries = [];
    for (const ref of crate.contains ?? []) {
      const skin = skinById.get(ref.id) ?? ref; // ref already has name/image/rarity in most cases
      const fileName = `${slugifyFile(skin.name)}.png`;
      const dest = path.join(SKINS_DIR, fileName);
      const res = await downloadImage(skin.name, skin.image, dest);
      if (res.ok) {
        if (res.source === 'cache') cached++; else downloaded++;
        skinEntries.push({ name: skin.name, image: fileName, rarityName: skin.rarity?.name ?? skin.rarity });
      } else {
        failures.push({ kind: 'skin', name: skin.name });
        // still include in data so the slot exists; image will fall back to placeholder
        skinEntries.push({ name: skin.name, image: fileName, rarityName: skin.rarity?.name ?? skin.rarity });
      }
    }

    // 3. Knife pool: group by weapon (left side of '|'), pick preferred finish per knife
    const rareItems = crate.contains_rare ?? [];
    const byWeapon = new Map();
    for (const ref of rareItems) {
      const item = skinById.get(ref.id) ?? ref;
      const weapon = (item.name.split('|')[0] ?? item.name).trim();
      if (!byWeapon.has(weapon)) byWeapon.set(weapon, []);
      byWeapon.get(weapon).push(item);
    }

    const knifeEntries = [];
    for (const [, variants] of byWeapon) {
      const chosen = pickPreferredFinish(variants);
      if (!chosen) continue;
      const fileName = `${slugifyFile(chosen.name)}.png`;
      const dest = path.join(SKINS_DIR, fileName);
      const res = await downloadImage(chosen.name, chosen.image, dest);
      if (res.ok) {
        if (res.source === 'cache') cached++; else downloaded++;
      } else {
        failures.push({ kind: 'knife', name: chosen.name });
      }
      knifeEntries.push({ name: chosen.name, image: fileName });
    }

    // 4. Accumulate the case for the single generated JSON.
    accumulatedCases.push(buildCaseEntry({
      caseName: target.apiName,
      imageFile: target.imageFile,
      skins: skinEntries,
      knives: knifeEntries,
    }));
    console.log(`  collected ${target.apiName} (${skinEntries.length} skins, ${knifeEntries.length} special)`);
  }

  // Write the single JSON file consumed by src/data/cases.js
  const jsonPath = path.join(PROJECT_ROOT, 'src', 'data', 'cases.generated.json');
  fs.writeFileSync(jsonPath, JSON.stringify(accumulatedCases, null, 2));
  console.log(`\nWrote ${path.relative(PROJECT_ROOT, jsonPath)} with ${accumulatedCases.length} cases.`);

  // Report
  console.log('\n=== Summary ===');
  console.log(`  downloaded: ${downloaded}`);
  console.log(`  cached:     ${cached}`);
  console.log(`  failed:     ${failures.length}`);
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'sync-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), downloaded, cached, failures }, null, 2),
  );
  console.log(`  report:     reports/sync-report.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
