import fs from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTargetImageCatalog,
  ensureDirectoryExists,
  existingFilePathFor,
  getTargetDirs,
  getTargetPaths,
  isValidImageBuffer,
  PROJECT_ROOT,
} from './image-catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

const REQUEST_TIMEOUT_MS = 15000;
const BASE_DELAY_MS = 1500;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeQueryName(name) {
  return name.replace(/^★\s*/, '').replace(/\s*\(.*?\)$/, '').trim();
}

function steamListingUrl(name) {
  return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(name)}`;
}

function steamSearchUrl(name) {
  return `https://steamcommunity.com/market/search?appid=730&q=${encodeURIComponent(name)}`;
}

function csfloatSearchUrl(name) {
  return `https://csfloat.com/search?q=${encodeURIComponent(name)}`;
}

function stashSearchUrls(name) {
  const query = encodeURIComponent(normalizeQueryName(name));
  return [
    `https://stash.clash.gg/search?q=${query}`,
    `https://stash.clash.gg/marketplace?search=${query}`,
  ];
}

function requestText(targetUrl, attempt = 0) {
  return requestBuffer(targetUrl, attempt).then((buffer) => buffer.toString('utf8'));
}

function requestBuffer(targetUrl, attempt = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'http:' ? http : https;

    const request = client.get(
      targetUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: '*/*',
          Referer: 'https://google.com/',
        },
      },
      (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          const redirectedUrl = new URL(response.headers.location, targetUrl).toString();
          response.resume();
          requestBuffer(redirectedUrl, attempt).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      },
    );

    request.on('error', reject);
    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error('Request timed out'));
    });
  }).catch(async (error) => {
    if (attempt + 1 < MAX_RETRIES) {
      await sleep(BASE_DELAY_MS * 2 ** attempt);
      return requestBuffer(targetUrl, attempt + 1);
    }

    throw error;
  });
}

function extractCandidateUrls(html, baseUrl) {
  const candidates = new Set();
  const metaPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      candidates.add(new URL(match[1], baseUrl).toString());
    }
  }

  const urlRegex = /https?:\/\/[^"'\s)<>]+/gi;
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    const candidate = match[0].replace(/&amp;/g, '&');
    if (/\.svg(\?|$)/i.test(candidate)) {
      continue;
    }

    if (
      /\.(png|jpg|jpeg|webp)(\?|$)/i.test(candidate) ||
      /economy\/image/i.test(candidate) ||
      /steamstatic/i.test(candidate) ||
      /steamcdn/i.test(candidate) ||
      /img\.clash\.gg/i.test(candidate) ||
      /_next\/image/i.test(candidate)
    ) {
      candidates.add(candidate);
    }
  }

  return [...candidates];
}

async function fetchSourceCandidateUrls(sourceName, sourceUrls) {
  const attemptedUrls = [];

  for (const sourceUrl of sourceUrls) {
    attemptedUrls.push(sourceUrl);

    try {
      const html = await requestText(sourceUrl);
      const candidates = extractCandidateUrls(html, sourceUrl);
      if (candidates.length > 0) {
        return { candidates, attemptedUrls };
      }
    } catch {
      continue;
    }
  }

  return { candidates: [], attemptedUrls };
}

async function downloadFromCandidates(candidateUrls) {
  const tried = [];

  for (const candidateUrl of candidateUrls) {
    tried.push(candidateUrl);

    try {
      const buffer = await requestBuffer(candidateUrl);
      if (isValidImageBuffer(buffer)) {
        return { buffer, sourceUrl: candidateUrl, tried };
      }
    } catch {
      continue;
    }
  }

  return { buffer: null, sourceUrl: null, tried };
}

async function writeMirroredFile(entry, buffer) {
  const targetPaths = getTargetPaths(entry.kind, entry.fileName);
  for (const targetPath of targetPaths) {
    ensureDirectoryExists(path.dirname(targetPath));
    await writeFile(targetPath, buffer);
  }
}

function buildSourceSteps(entry) {
  const query = entry.queryName || entry.displayName;
  return [
    { name: 'Steam Market listing', urls: [steamListingUrl(query)] },
    { name: 'Steam Market search', urls: [steamSearchUrl(query)] },
    { name: 'Steam CDN direct assets', urls: [] },
    { name: 'CSGOStash', urls: stashSearchUrls(query) },
    { name: 'CSFloat CDN', urls: [csfloatSearchUrl(query)] },
  ];
}

function buildFailedHtml(failures) {
  const cards = failures
    .map((failure) => {
      const previewUrl = failure.previewUrl || failure.attemptedUrls[0] || '';
      const sourceLinks = failure.attemptedUrls.length
        ? failure.attemptedUrls.map((url) => `<li><a href="${url}" target="_blank" rel="noreferrer">${url}</a></li>`).join('')
        : '<li>No source URLs discovered</li>';

      return `
        <article class="card">
          <img class="thumb" src="${previewUrl}" alt="${failure.fileName}" />
          <div>
            <h2>${failure.fileName}</h2>
            <p>${failure.caseName}</p>
            <p>${failure.displayName}</p>
            <p>${failure.rarity}</p>
            <button class="retry" data-url="${previewUrl}">Retry</button>
            <ul>${sourceLinks}</ul>
          </div>
        </article>
      `;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Failed Images</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #0f1115; color: #f1f5f9; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .card { background: #171923; border: 1px solid #2b3440; border-radius: 12px; padding: 12px; display: grid; gap: 12px; }
    .thumb { width: 100%; aspect-ratio: 1; object-fit: contain; background: #0b0d12; border-radius: 8px; }
    .retry { padding: 8px 12px; border: 0; border-radius: 999px; background: #3b82f6; color: white; cursor: pointer; }
    a { color: #93c5fd; word-break: break-all; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <h1>Failed Images</h1>
  <p>${failures.length} image(s) still need a manual retry.</p>
  <div class="grid">${cards}</div>
  <script>
    document.querySelectorAll('.retry').forEach((button) => {
      button.addEventListener('click', () => {
        const url = button.getAttribute('data-url');
        if (url) {
          window.open(url, '_blank', 'noopener');
        }
      });
    });
  </script>
</body>
</html>`;
}

async function main() {
  const { entries } = await buildTargetImageCatalog();
  const trackedEntries = entries;

  for (const dir of [...getTargetDirs('case'), ...getTargetDirs('skin')]) {
    ensureDirectoryExists(dir);
  }

  const imageMap = trackedEntries.map((entry) => ({
    fileName: entry.fileName,
    kind: entry.kind,
    caseName: entry.caseName,
    displayName: entry.displayName,
    rarity: entry.rarity,
    targetPaths: getTargetPaths(entry.kind, entry.fileName).map((targetPath) => path.relative(ROOT, targetPath).replaceAll('\\', '/')),
  }));

  await writeFile(path.join(ROOT, 'image-map.json'), JSON.stringify(imageMap, null, 2), 'utf8');

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let retries = 0;
  const failures = [];

  for (const [index, entry] of trackedEntries.entries()) {
    const existingPath = existingFilePathFor(entry.kind, entry.fileName);
    if (existingPath) {
      const existingBuffer = await readFile(existingPath);
      for (const targetPath of getTargetPaths(entry.kind, entry.fileName)) {
        if (!fs.existsSync(targetPath)) {
          await writeFile(targetPath, existingBuffer);
        }
      }

      skipped += 1;
      console.log(`[${index + 1}/${trackedEntries.length}] ⏭ ${entry.fileName}`);
      continue;
    }

    console.log(`[${index + 1}/${trackedEntries.length}] ⬇ ${entry.fileName}`);

    let downloadedBuffer = null;
    let sourceUrl = null;
    const attemptedUrls = [];

    for (const step of buildSourceSteps(entry)) {
      const { candidates, attemptedUrls: stepAttempted } = await fetchSourceCandidateUrls(step.name, step.urls);
      for (const url of stepAttempted) {
        if (!attemptedUrls.includes(url)) {
          attemptedUrls.push(url);
        }
      }

      if (!candidates.length) {
        continue;
      }

      const result = await downloadFromCandidates(candidates);
      for (const url of result.tried) {
        if (!attemptedUrls.includes(url)) {
          attemptedUrls.push(url);
        }
      }

      retries += Math.max(0, result.tried.length - 1);
      if (result.buffer) {
        downloadedBuffer = result.buffer;
        sourceUrl = result.sourceUrl;
        break;
      }
    }

    if (downloadedBuffer) {
      await writeMirroredFile(entry, downloadedBuffer);
      downloaded += 1;
      console.log(`   ✅ ${sourceUrl}`);
    } else {
      failed += 1;
      failures.push({
        fileName: entry.fileName,
        caseName: entry.caseName,
        displayName: entry.displayName,
        rarity: entry.rarity,
        attemptedUrls,
        previewUrl: attemptedUrls[0] || '',
      });
      console.log('   ❌ no valid source');
    }

    if (index < trackedEntries.length - 1) {
      await sleep(BASE_DELAY_MS);
    }
  }

  const report = [
    'CS2 Image Download Report',
    `Tracked:    ${trackedEntries.length}`,
    `Downloaded: ${downloaded}`,
    `Skipped:    ${skipped}`,
    `Failed:     ${failed}`,
    `Retries:    ${retries}`,
    '',
    'Missing items:',
    ...failures.map((failure) => `${failure.fileName} | ${failure.caseName} | ${failure.displayName}`),
  ].join('\n');

  await writeFile(path.join(ROOT, 'download-report.txt'), report, 'utf8');
  await writeFile(path.join(ROOT, 'missing-images.json'), JSON.stringify(failures, null, 2), 'utf8');

  if (failures.length > 0) {
    await writeFile(path.join(ROOT, 'failed-images.html'), buildFailedHtml(failures), 'utf8');
  }

  console.log('\nSummary');
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`⏭ Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Retries: ${retries}`);
}

main().catch((error) => {
  console.error('Download failed:', error.message);
  process.exitCode = 1;
});