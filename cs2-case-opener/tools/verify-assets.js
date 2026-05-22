import fs from 'node:fs';
import path from 'node:path';
import { buildImageMap } from '../src/data/cases.js';

const ROOT = process.cwd();
const THRESHOLD = 2 * 1024;

function checkPath(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  try {
    const stat = fs.statSync(fullPath);
    return stat.isFile() && stat.size > THRESHOLD;
  } catch {
    return false;
  }
}

function main() {
  const mapFile = path.join(ROOT, 'reports', 'image-map.json');
  const entries = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : buildImageMap();
  let ok = 0;
  let missing = 0;

  for (const entry of entries) {
    const valid = Array.isArray(entry.targetPaths) && entry.targetPaths.some((targetPath) => checkPath(targetPath));
    if (valid) {
      ok += 1;
      console.log(`✅ ${entry.fileName}`);
    } else {
      missing += 1;
      console.log(`❌ ${entry.fileName} missing`);
    }
  }

  console.log(`\n${ok}/${entries.length} images OK, ${missing} missing or broken.`);
  process.exitCode = missing > 0 ? 1 : 0;
}

main();
