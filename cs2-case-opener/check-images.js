import fs from 'node:fs';
import path from 'node:path';
import { buildTargetImageCatalog, existingFilePathFor, getTargetPaths } from './image-catalog.js';

function main() {
  buildTargetImageCatalog()
    .then(({ entries }) => {
      console.log('CS2 Image Checker');

      let found = 0;
      let missing = 0;
      const missingFiles = [];

      for (const entry of entries) {
        const targetPaths = getTargetPaths(entry.kind, entry.fileName);
        const usablePath = existingFilePathFor(entry.kind, entry.fileName);

        if (usablePath) {
          found += 1;
          console.log(`✅ FOUND:   ${entry.fileName}`);
          continue;
        }

        missing += 1;
        missingFiles.push({ entry, targetPaths });
        console.log(`❌ MISSING: ${entry.fileName} | ${entry.caseName} | ${entry.displayName}`);
      }

      console.log(`\nTracked: ${entries.length}`);
      console.log(`Found:   ${found}`);
      console.log(`Missing: ${missing}`);

      if (missingFiles.length > 0) {
        const payload = missingFiles.map(({ entry, targetPaths }) => ({
          fileName: entry.fileName,
          caseName: entry.caseName,
          displayName: entry.displayName,
          rarity: entry.rarity,
          kind: entry.kind,
          targetPaths,
        }));
        fs.writeFileSync(path.join(process.cwd(), 'missing-images.json'), JSON.stringify(payload, null, 2), 'utf8');
      }

      process.exitCode = missing === 0 ? 0 : 1;
    })
    .catch((error) => {
      console.error('Checker failed:', error.message);
      process.exitCode = 1;
    });
}

main();
