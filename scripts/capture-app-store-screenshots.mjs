/**
 * Capture App Store screenshots in light and dark mode.
 * Requires: npm start (port 8200) and `npx playwright install chromium`
 *
 * iPhone sizes match App Store Connect accepted dimensions:
 *   1284×2778 (6.5") and 1242×2688 (6.5" legacy)
 *
 * Usage: node scripts/capture-app-store-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'app-store-screenshots');
const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:8200';

const THEME_KEY = 'howzat-counter/theme';
const MIGRATION_KEY = 'howzat-counter/prefs-migrated-v1';
const STORAGE_V2 = 'umpireCounterV2';
const APP_PREFS = 'umpireAppPrefs';

/** App Store portrait sizes (logical viewport × deviceScaleFactor = pixels). */
const DEVICES = [
  {
    id: 'iphone-1284x2778',
    label: 'iPhone 6.5" (1284×2778)',
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    expectWidth: 1284,
    expectHeight: 2778
  },
  {
    id: 'iphone-1242x2688',
    label: 'iPhone 6.5" legacy (1242×2688)',
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    expectWidth: 1242,
    expectHeight: 2688
  },
  {
    id: 'ipad-12.9',
    label: 'iPad Pro 12.9" (2048×2732)',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    expectWidth: 2048,
    expectHeight: 2732
  }
];

const SCREENS = [
  { slug: '01-live-scoring', path: '/home', waitFor: 'app-umpire-counter', title: 'Live Scoring' },
  { slug: '02-history', path: '/history', waitFor: '.overs-list, .empty-state', title: 'History' },
  { slug: '03-help', path: '/help', waitFor: 'app-help-visual-guide, .help-page', title: 'Help' },
  { slug: '04-settings', path: '/settings', waitFor: 'ion-list', title: 'Settings' }
];

function buildDemoMatchPayload() {
  let t = Date.now() - 3_600_000;
  let n = 0;
  const nextId = () => `ss-${++n}`;
  const nextT = () => (t += 12_000);
  const events = [];

  const overs = [
    [1, 0, 4, 2, 1, 0],
    [2, 0, 6, 1, 0, 1],
    [0, 4, 1, 2, 0, 1],
    [6, 0, 2, 1, 4, 0],
    [1, 1, 0, 2, 4, 1],
    [0, 2, 1, 6, 0, 1],
    [4, 0, 1, 2, 1, 0],
    [2, 1, 0, 4, 1, 2],
    [0, 6, 1, 2, 0, 3],
    [1, 4, 0, 2, 1, 0],
    [2, 0, 1, 4, 0, 1],
    [0, 2, 4, 1, 0, 1]
  ];
  const wicketAtBall = new Set([8, 29, 51]);

  let ball = 0;
  for (const over of overs) {
    for (const runs of over) {
      if (wicketAtBall.has(ball)) {
        events.push({ id: nextId(), t: nextT(), kind: 'w' });
      } else {
        events.push({ id: nextId(), t: nextT(), kind: 'runs', runs });
      }
      ball++;
    }
  }
  for (const runs of [2, 0, 4, 1]) {
    events.push({ id: nextId(), t: nextT(), kind: 'runs', runs });
  }

  return {
    schemaVersion: 2,
    limits: { ballsPerOver: 6, maxWickets: 10, maxOvers: 20 },
    keypad: {
      preset: 'leather',
      showWide: true,
      showNoBall: true,
      showLb: false,
      showBye: false
    },
    events,
    sessionActive: true,
    teamName: 'Riverside',
    noHistoryBannerDismissed: true
  };
}

function seedScript(theme, payload) {
  return `
    localStorage.setItem('${MIGRATION_KEY}', '1');
    localStorage.setItem('${THEME_KEY}', '${theme}');
    localStorage.setItem('${STORAGE_V2}', ${JSON.stringify(JSON.stringify(payload))});
    localStorage.setItem('${APP_PREFS}', ${JSON.stringify(
      JSON.stringify({ hapticEnabled: true, wicketSoundEnabled: false, scoreToastEnabled: true })
    )});
  `;
}

async function waitForApp(page, selector) {
  await page.waitForSelector('ion-app', { timeout: 30_000 });
  await page.waitForSelector(selector, { timeout: 30_000 });
  await page.waitForTimeout(600);
}

async function captureSet(browser, device, theme) {
  const outThemeDir = path.join(OUT_DIR, device.id, theme);
  await mkdir(outThemeDir, { recursive: true });

  const payload = buildDemoMatchPayload();
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    colorScheme: theme,
    locale: 'en-GB'
  });

  await context.addInitScript(seedScript(theme, payload));
  const page = await context.newPage();

  for (const screen of SCREENS) {
    await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle' });
    await waitForApp(page, screen.waitFor);

    const filename = `${screen.slug}.png`;
    const filepath = path.join(outThemeDir, filename);
    await page.screenshot({
      path: filepath,
      fullPage: false,
      animations: 'disabled',
      clip: {
        x: 0,
        y: 0,
        width: device.viewport.width,
        height: device.viewport.height
      }
    });
    console.log(
      `  ✓ ${device.id}/${theme}/${filename} (${device.expectWidth}×${device.expectHeight})`
    );
  }

  await context.close();
}

async function main() {
  console.log(`Capturing screenshots from ${BASE_URL}`);
  console.log(`Output: ${OUT_DIR}\n`);

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const device of DEVICES) {
      console.log(`${device.label}`);
      for (const theme of ['light', 'dark']) {
        console.log(`  ${theme} mode`);
        await captureSet(browser, device, theme);
      }
      console.log('');
    }
  } finally {
    await browser.close();
  }

  const readme = `# App Store screenshots — Howzat Counter v1.3

Generated for App Store Connect upload. Portrait only.

## Folders

| Folder | App Store slot | Pixels |
|--------|----------------|--------|
| \`iphone-1284x2778/\` | iPhone 6.5" display | **1284 × 2778** |
| \`iphone-1242x2688/\` | iPhone 6.5" display (alt) | **1242 × 2688** |
| \`ipad-12.9/\` | iPad Pro 12.9" (3rd gen+) | 2048 × 2732 |

Upload iPhone shots from \`iphone-1284x2778/\` (or \`iphone-1242x2688/\` if your slot requires it).
Do **not** use 1290×2796 — App Store Connect rejects that size for this listing.

Each device folder has \`light/\` and \`dark/\` subfolders with four screens:

1. **01-live-scoring** — Active match on Home tab
2. **02-history** — Over-by-over history
3. **03-help** — Help tab with visual guides
4. **04-settings** — Settings (theme, haptics, toasts)

## Regenerate

\`\`\`bash
npm start          # port 8200
node scripts/capture-app-store-screenshots.mjs
\`\`\`

Demo match: Riverside, ~12.4 overs (seeded in script).
`;

  await writeFile(path.join(OUT_DIR, 'README.md'), readme, 'utf8');
  console.log('Done. See app-store-screenshots/README.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
