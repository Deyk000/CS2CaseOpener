#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = __dirname;
const IMAGE_DIR_PUBLIC = path.join(PROJECT_ROOT, 'public', 'assets', 'images');
const IMAGE_DIR_DIST = path.join(PROJECT_ROOT, 'dist', 'assets', 'images');
const IMAGE_DIR_SKINS_PUBLIC = path.join(IMAGE_DIR_PUBLIC, 'skins');
const IMAGE_DIR_SKINS_DIST = path.join(IMAGE_DIR_DIST, 'skins');
const IMAGE_DIR_CASES_PUBLIC = path.join(IMAGE_DIR_PUBLIC, 'cases');
const IMAGE_DIR_CASES_DIST = path.join(IMAGE_DIR_DIST, 'cases');

// Create directories if they don't exist
[IMAGE_DIR_SKINS_PUBLIC, IMAGE_DIR_SKINS_DIST, IMAGE_DIR_CASES_PUBLIC, IMAGE_DIR_CASES_DIST].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// All skins and items to download
const SKINS_TO_DOWNLOAD = {
  'dreams': [
    { name: 'AK-47 | Nightwish', file: 'ak47_nightwish.png' },
    { name: 'MP9 | Starlight Protector', file: 'mp9_starlight.png' },
    { name: 'FAMAS | Rapid Eye Movement', file: 'famas_rem.png' },
    { name: 'Dual Berettas | Melondrama', file: 'dualies_melon.png' },
    { name: 'MP7 | Abyssal Apparition', file: 'mp7_abyssal.png' },
    { name: 'G3SG1 | Dream Glade', file: 'g3sg1_dreamglade.png' },
    { name: 'M4A1-S | Night Terror', file: 'm4a1s_nightterror.png' },
    { name: 'PP-Bizon | Space Cat', file: 'ppbizon_spacecat.png' },
    { name: 'USP-S | Ticket to Hell', file: 'usps_ticket.png' },
    { name: 'XM1014 | Zombie Offensive', file: 'xm1014_zombie.png' },
    { name: 'Five-SeveN | Scrawl', file: 'five7_scrawl.png' },
    { name: 'MAC-10 | Ensnared', file: 'mac10_ensnared.png' },
    { name: 'MAG-7 | Foresight', file: 'mag7_foresight.png' },
    { name: 'MP5-SD | Necro Jr.', file: 'mp5sd_necrojr.png' },
    { name: 'P2000 | Lifted Spirits', file: 'p2000_liftedspirits.png' },
    { name: 'Sawed-Off | Spirit Board', file: 'sawedoff_spiritboard.png' },
    { name: 'SCAR-20 | Poultrygeist', file: 'scar20_poultrygeist.png' },
  ],
  'kilowatt': [
    { name: 'AK-47 | Inheritance', file: 'ak47_inheritance.png' },
    { name: 'M4A1-S | Black Lotus', file: 'm4a1s_blacklotus.png' },
    { name: 'M4A1-S | Black Lotus', file: 'm4a1s_blacklotus_classified.png' },
    { name: 'USP-S | Jawbreaker', file: 'usps_jawbreaker.png' },
    { name: 'Zeus x27 | Olympus', file: 'zeus_olympus.png' },
    { name: 'Five-SeveN | Hybrid', file: 'five7_hybrid.png' },
    { name: 'Glock-18 | Block-18', file: 'glock18_block18.png' },
    { name: 'MP7 | Just Smile', file: 'mp7_justsmile.png' },
    { name: 'Sawed-Off | Analog Input', file: 'sawedoff_analog.png' },
    { name: 'SSG 08 | Dezastre', file: 'ssg08_dezastre.png' },
    { name: 'Dual Berettas | Hideout', file: 'dualberettas_hideout.png' },
    { name: 'MAC-10 | Light Box', file: 'mac10_lightbox.png' },
    { name: 'Nova | Dark Sigil', file: 'nova_darksigil.png' },
    { name: 'Tec-9 | Slag', file: 'tec9_slag.png' },
    { name: 'UMP-45 | Motorized', file: 'ump45_motorized.png' },
    { name: 'XM1014 | Irezumi', file: 'xm1014_irezumi.png' },
    { name: 'M249 | Hypnosis', file: 'm249_hypnosis.png' },
  ],
  'recoil': [
    { name: 'AWP | Chromatic Aberration', file: 'awp_chromatic_aberration.png' },
    { name: 'USP-S | Printstream', file: 'usp_s_printstream.png' },
    { name: 'AK-47 | Ice Coaled', file: 'ak47_ice_coaled.png' },
    { name: 'P250 | Visions', file: 'p250_visions.png' },
    { name: 'Sawed-Off | Kiss♥Love', file: 'sawedoff_kiss_love.png' },
    { name: 'R8 Revolver | Crazy 8', file: 'r8_revolver_crazy_8.png' },
    { name: 'M249 | Downtown', file: 'm249_downtown.png' },
    { name: 'SG 553 | Dragon Tech', file: 'sg553_dragon_tech.png' },
    { name: 'P90 | Vent Rush', file: 'p90_vent_rush.png' },
    { name: 'Dual Berettas | Flora Carnivora', file: 'dual_berettas_flora_carnivora.png' },
    { name: 'FAMAS | Meow 36', file: 'famas_meow36.png' },
    { name: 'Galil AR | Destroyer', file: 'galil_ar_destroyer.png' },
    { name: 'Glock-18 | Winterized', file: 'glock_winterized.png' },
    { name: 'M4A4 | Poly Mag', file: 'm4a4_poly_mag.png' },
    { name: 'MAC-10 | Monkeyflage', file: 'mac10_monkeyflage.png' },
    { name: 'Negev | Drop Me', file: 'negev_drop_me.png' },
    { name: 'UMP-45 | Roadblock', file: 'ump45_roadblock.png' },
  ],
  'revolution': [
    { name: 'AK-47 | Head Shot', file: 'ak47_headshot.png' },
    { name: 'M4A4 | Temukau', file: 'm4a4_temukau.png' },
    { name: 'AWP | Duality', file: 'awp_duality.png' },
    { name: 'P2000 | Wicked Sick', file: 'p2000_wickedsick.png' },
    { name: 'UMP-45 | Wild Child', file: 'ump45_wildchild.png' },
    { name: 'Glock-18 | Umbral Rabbit', file: 'glock18_umbralrabbit.png' },
    { name: 'M4A1-S | Emphorosaur-S', file: 'm4a1s_emphorosaur.png' },
    { name: 'P90 | Neoqueen', file: 'p90_neoqueen.png' },
    { name: 'R8 Revolver | Banana Cannon', file: 'r8_bananacanon.png' },
    { name: 'MAG-7 | Insomnia', file: 'mag7_insomnia.png' },
    { name: 'MP9 | Featherweight', file: 'mp9_featherweight.png' },
    { name: 'SCAR-20 | Fragments', file: 'scar20_fragments.png' },
    { name: 'SG 553 | Cyberforce', file: 'sg553_cyberforce.png' },
    { name: 'Tec-9 | Rebel', file: 'tec9_rebel.png' },
    { name: 'MAC-10 | Sakkaku', file: 'mac10_sakkaku.png' },
    { name: 'P250 | Re.built', file: 'p250_rebuilt.png' },
  ],
};

const KNIVES_GLOVES = [
  // Knives
  { name: '★ Butterfly Knife | Doppler', file: 'knife_butterfly_doppler.png' },
  { name: '★ Huntsman Knife | Fade', file: 'knife_huntsman_fade.png' },
  { name: '★ Bowie Knife | Urban Masked', file: 'knife_bowie_urban.png' },
  { name: '★ Falchion Knife | Slaughter', file: 'knife_falchion_slaughter.png' },
  { name: '★ Shadow Daggers | Fade', file: 'knife_shadow_fade.png' },
  { name: '★ Kukri Knife | Doppler', file: 'knife_kukri_doppler.png' },
  { name: '★ Kukri Knife | Marble Fade', file: 'knife_kukri_marblefade.png' },
  { name: '★ Kukri Knife | Tiger Tooth', file: 'knife_kukri_tigertooth.png' },
  { name: '★ Kukri Knife | Slaughter', file: 'knife_kukri_slaughter.png' },
  // Gloves
  { name: 'Broken Fang Gloves | Jade', file: 'gloves_brokenfang_jade.png' },
  { name: 'Broken Fang Gloves | Needle Point', file: 'gloves_brokenfang_needlepoint.png' },
  { name: 'Broken Fang Gloves | Unhinged', file: 'gloves_brokenfang_unhinged.png' },
  { name: 'Broken Fang Gloves | Yellow-banded', file: 'gloves_brokenfang_yellowbanded.png' },
  { name: 'Clutch Gloves | Weathered', file: 'gloves_clutch_weathered.png' },
  { name: 'Clutch Gloves | Cordura', file: 'gloves_clutch_cordura.png' },
  { name: 'Clutch Gloves | Unstoppable Force', file: 'gloves_clutch_unstoppableforce.png' },
  { name: 'Clutch Gloves | Voltage', file: 'gloves_clutch_voltage.png' },
];

const CASES = [
  { name: 'Dreams & Nightmares Case', file: 'dreams_case.png' },
  { name: 'Kilowatt Case', file: 'kilowatt_case.png' },
  { name: 'Recoil Case', file: 'recoil_case.png' },
  { name: 'Revolution Case', file: 'revolution_case.png' },
];

// Statistics
let stats = {
  downloaded: 0,
  skipped: 0,
  failed: 0,
  total: 0,
  failures: [],
};

/**
 * Download file from URL with retry logic
 */
function downloadFile(url, filePath, retries = 3) {
  return new Promise((resolve) => {
    const attempt = (attemptsLeft) => {
      const urlObj = new URL(url);
      const client = url.startsWith('https') ? https : http;

      client.get(url, { timeout: 10000 }, (response) => {
        // Check for redirects or error pages
        if (response.statusCode >= 400) {
          if (attemptsLeft > 0) {
            setTimeout(() => attempt(attemptsLeft - 1), 1500);
          } else {
            resolve({ success: false, reason: `HTTP ${response.statusCode}` });
          }
          return;
        }

        let chunks = [];
        let size = 0;

        response.on('data', (chunk) => {
          chunks.push(chunk);
          size += chunk.length;
        });

        response.on('end', () => {
          // Validate it's actual PNG/image (not HTML error page)
          const buffer = Buffer.concat(chunks);
          
          // PNG files start with this magic number
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
          
          if (!isPNG) {
            if (attemptsLeft > 0) {
              setTimeout(() => attempt(attemptsLeft - 1), 1500);
            } else {
              resolve({ success: false, reason: 'Invalid PNG file' });
            }
            return;
          }

          // Write to both public and dist
          try {
            const publicPath = filePath.replace(/\\dist\\/, '\\public\\');
            fs.writeFileSync(filePath, buffer);
            fs.writeFileSync(publicPath, buffer);
            resolve({ success: true, size });
          } catch (err) {
            if (attemptsLeft > 0) {
              setTimeout(() => attempt(attemptsLeft - 1), 1500);
            } else {
              resolve({ success: false, reason: err.message });
            }
          }
        });

        response.on('error', () => {
          if (attemptsLeft > 0) {
            setTimeout(() => attempt(attemptsLeft - 1), 1500);
          } else {
            resolve({ success: false, reason: 'Connection error' });
          }
        });
      }).on('error', () => {
        if (attemptsLeft > 0) {
          setTimeout(() => attempt(attemptsLeft - 1), 1500);
        } else {
          resolve({ success: false, reason: 'Connection error' });
        }
      }).on('timeout', function() {
        this.destroy();
        if (attemptsLeft > 0) {
          setTimeout(() => attempt(attemptsLeft - 1), 1500);
        } else {
          resolve({ success: false, reason: 'Timeout' });
        }
      });
    };

    attempt(retries);
  });
}

/**
 * Build Steam Market URL
 */
function getSteamMarketUrl(name) {
  const encoded = encodeURIComponent(name);
  return `https://steamcommunity.com/market/listings/730/${encoded}`;
}

/**
 * Build CSGOStash URL as fallback
 */
function getCSGOStashUrl(name) {
  return `https://csgostash.com/skin/${name.replace(/[\s|]/g, '-').toLowerCase()}`;
}

/**
 * Try multiple sources to download image
 */
async function tryDownloadSkin(skinName, fileName, type = 'skins') {
  const distPath = path.join(IMAGE_DIR_DIST, type, fileName);
  const publicPath = path.join(IMAGE_DIR_PUBLIC, type, fileName);

  // Skip if already exists
  if (fs.existsSync(distPath) && fs.existsSync(publicPath)) {
    const stat = fs.statSync(distPath);
    if (stat.size > 1000) {  // Must be at least 1KB
      return { status: 'SKIP', reason: 'exists' };
    }
  }

  console.log(`[${stats.total}/${stats.total + 1}] Attempting: ${fileName}...`);

  // Try multiple URLs
  const urls = [
    getSteamMarketUrl(skinName),
  ];

  for (const url of urls) {
    const result = await downloadFile(url, distPath, 3);
    if (result.success) {
      return { status: 'DOWNLOAD', size: result.size };
    }
  }

  return { status: 'FAILED', reason: 'No working source' };
}

/**
 * Main download process
 */
async function main() {
  console.log('\n════════════════════════════════════════════════');
  console.log('   CS2 IMAGE AUTO-DOWNLOADER v2');
  console.log('════════════════════════════════════════════════\n');

  console.log(`📁 Public path: ${IMAGE_DIR_PUBLIC}`);
  console.log(`📁 Dist path:   ${IMAGE_DIR_DIST}\n`);

  // Collect all items
  const allItems = [];
  
  // Add case skins
  Object.entries(SKINS_TO_DOWNLOAD).forEach(([caseKey, skins]) => {
    skins.forEach(skin => {
      allItems.push({
        name: skin.name,
        file: skin.file,
        type: 'skins',
        case: caseKey,
      });
    });
  });

  // Add knives/gloves
  KNIVES_GLOVES.forEach(item => {
    allItems.push({
      name: item.name,
      file: item.file,
      type: 'skins',
      case: 'special',
    });
  });

  // Add cases
  CASES.forEach(item => {
    allItems.push({
      name: item.name,
      file: item.file,
      type: 'cases',
      case: 'cases',
    });
  });

  stats.total = allItems.length;

  console.log(`📦 Total items to process: ${stats.total}\n`);

  // Process each item
  for (const item of allItems) {
    const result = await tryDownloadSkin(item.name, item.file, item.type);
    
    if (result.status === 'DOWNLOAD') {
      console.log(`   ✅ DOWNLOADED: ${item.file} (${result.size} bytes)`);
      stats.downloaded++;
    } else if (result.status === 'SKIP') {
      console.log(`   ⏭  SKIPPED: ${item.file}`);
      stats.skipped++;
    } else {
      console.log(`   ❌ FAILED: ${item.file} - ${result.reason}`);
      stats.failed++;
      stats.failures.push({
        file: item.file,
        name: item.name,
        reason: result.reason,
      });
    }

    // Wait between requests
    if (stats.downloaded + stats.failed > 0 && stats.downloaded + stats.failed < stats.total) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Generate reports
  console.log('\n════════════════════════════════════════════════');
  console.log('                  SUMMARY');
  console.log('════════════════════════════════════════════════\n');

  console.log(`✅ Downloaded: ${stats.downloaded}`);
  console.log(`⏭  Skipped:    ${stats.skipped}`);
  console.log(`❌ Failed:     ${stats.failed}`);
  console.log(`📊 Total:      ${stats.total}\n`);

  // Save download report
  const reportPath = path.join(PROJECT_ROOT, 'download-report.txt');
  let report = `CS2 IMAGE DOWNLOAD REPORT\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `SUMMARY:\n`;
  report += `  Downloaded: ${stats.downloaded}\n`;
  report += `  Skipped: ${stats.skipped}\n`;
  report += `  Failed: ${stats.failed}\n`;
  report += `  Total: ${stats.total}\n\n`;

  if (stats.failures.length > 0) {
    report += `FAILED DOWNLOADS:\n`;
    stats.failures.forEach(f => {
      report += `  - ${f.file} (${f.name}): ${f.reason}\n`;
    });
  }

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report saved to: download-report.txt\n`);

  // Save failed images list as JSON
  const missingPath = path.join(PROJECT_ROOT, 'missing-images.json');
  fs.writeFileSync(missingPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    failed: stats.failures.map(f => ({
      file: f.file,
      name: f.name,
      reason: f.reason,
    })),
    total: stats.failed,
  }, null, 2));
  console.log(`📄 Missing images JSON saved to: missing-images.json\n`);

  // Generate fallback HTML
  if (stats.failures.length > 0) {
    const htmlPath = path.join(PROJECT_ROOT, 'failed-images.html');
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Failed Downloads - Manual Download Required</title>
  <style>
    body { font-family: Arial; margin: 20px; background: #f5f5f5; }
    h1 { color: #d32f2f; }
    .item { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #d32f2f; }
    .item a { color: #1976d2; text-decoration: none; font-weight: bold; }
    .item a:hover { text-decoration: underline; }
    .name { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>❌ Failed Image Downloads</h1>
  <p>${stats.failures.length} images need manual download:</p>`;

    stats.failures.forEach(f => {
      html += `
  <div class="item">
    <strong>${f.file}</strong><br>
    <span class="name">${f.name} (${f.reason})</span><br>
    <a href="https://csgostash.com/search?search=${encodeURIComponent(f.name)}" target="_blank">
      🔗 Search on CSGOStash
    </a>
  </div>`;
    });

    html += `
</body>
</html>`;
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 Fallback HTML saved to: failed-images.html\n`);
  }

  console.log('✨ Download process complete!\n');
}

main().catch(console.error);
