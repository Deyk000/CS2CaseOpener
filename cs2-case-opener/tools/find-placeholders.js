import fs from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'assets', 'images', 'skins');
const THRESHOLD = 20 * 1024; // 20KB

function findPlaceholders() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Images dir not found:', IMAGES_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.toLowerCase().endsWith('.png'));
  const small = [];

  for (const file of files) {
    const full = path.join(IMAGES_DIR, file);
    const stat = fs.statSync(full);
    if (stat.size <= THRESHOLD) {
      small.push({ file, size: stat.size });
    }
  }

  small.sort((a, b) => a.size - b.size);
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(reportsDir, 'placeholder-report.json'), JSON.stringify(small, null, 2), 'utf8');

  console.log(`Found ${small.length} placeholder-sized images (<= ${THRESHOLD} bytes).`);
  console.log('Report written to reports/placeholder-report.json');
}

findPlaceholders();
