import fs from 'node:fs';
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = __dirname;
export const TARGET_CASE_NAMES = new Set([
  'Dreams & Nightmares Case',
  'Kilowatt Case',
  'Recoil Case',
  'Revolution Case',
]);

const CASES_DIR = path.join(PROJECT_ROOT, 'src', 'data', 'cases');
const PUBLIC_IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'images');
const DIST_IMAGES_DIR = path.join(PROJECT_ROOT, 'dist', 'assets', 'images');

export function getTargetDirs(kind) {
  const subdir = kind === 'case' ? 'cases' : 'skins';
  return [
    path.join(PUBLIC_IMAGES_DIR, subdir),
    path.join(DIST_IMAGES_DIR, subdir),
  ];
}

export function getTargetPaths(kind, fileName) {
  return getTargetDirs(kind).map((dir) => path.join(dir, fileName));
}

export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function isPngBuffer(buffer) {
  return Boolean(
    buffer &&
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  );
}

export function isValidImageBuffer(buffer) {
  return isPngBuffer(buffer) && buffer.length >= 5 * 1024;
}

function pickCaseExport(moduleExports) {
  return Object.values(moduleExports).find(
    (value) => value && typeof value === 'object' && value.name && value.image && Array.isArray(value.skins),
  );
}

function normalizeQueryName(name) {
  return name.replace(/^★\s*/, '').replace(/\s*\(.*?\)$/, '').trim();
}

export async function loadTargetCases() {
  const fileNames = (await readdir(CASES_DIR)).filter((fileName) => fileName.endsWith('.js')).sort();
  const cases = [];

  for (const fileName of fileNames) {
    const moduleUrl = pathToFileURL(path.join(CASES_DIR, fileName)).href;
    const moduleExports = await import(moduleUrl);
    const caseData = pickCaseExport(moduleExports);

    if (caseData && TARGET_CASE_NAMES.has(caseData.name)) {
      cases.push(caseData);
    }
  }

  return cases;
}

export function buildImageCatalog(cases) {
  const entries = [];
  const seen = new Set();

  const addEntry = (entry) => {
    const key = `${entry.kind}/${entry.fileName}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    entries.push(entry);
  };

  for (const caseData of cases) {
    addEntry({
      kind: 'case',
      caseName: caseData.name,
      displayName: caseData.name,
      rarity: 'case',
      fileName: path.basename(caseData.image),
      queryName: caseData.name,
      sourceUrls: [],
    });

    for (const skin of caseData.skins) {
      addEntry({
        kind: 'skin',
        caseName: caseData.name,
        displayName: skin.name,
        rarity: skin.rarity?.name ?? 'Unknown',
        fileName: skin.image,
        queryName: normalizeQueryName(skin.name),
        sourceUrls: [],
      });
    }

    for (const specialItem of caseData.specialItemPool ?? []) {
      addEntry({
        kind: 'skin',
        caseName: caseData.name,
        displayName: specialItem.name,
        rarity: specialItem.rarity?.name ?? 'Rare Special Item',
        fileName: specialItem.image,
        queryName: normalizeQueryName(specialItem.name),
        sourceUrls: [],
      });
    }
  }

  return entries;
}

export async function buildTargetImageCatalog() {
  const cases = await loadTargetCases();
  const entries = buildImageCatalog(cases);
  return { cases, entries };
}

export function fileIsUsable(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const stats = fs.statSync(filePath);
  if (stats.size < 5 * 1024) {
    return false;
  }

  const buffer = fs.readFileSync(filePath);
  return isValidImageBuffer(buffer);
}

export function existingFilePathFor(kind, fileName) {
  for (const targetPath of getTargetPaths(kind, fileName)) {
    if (fileIsUsable(targetPath)) {
      return targetPath;
    }
  }

  return null;
}