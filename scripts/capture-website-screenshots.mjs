/**
 * Captures website screenshots for README/docs.
 * Requires: npx playwright install chromium (run once)
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const websiteDir = path.join(root, 'website');
const outDir = path.join(root, 'docs', 'screenshots');

const shots = [
  { name: 'website-hero.png', scrollY: 0, height: 720 },
  { name: 'website-features.png', selector: '#features', height: 900 },
  { name: 'website-install.png', selector: '#install', height: 900 },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(`file://${path.join(websiteDir, 'index.html')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  for (const shot of shots) {
    if (shot.selector) {
      const el = page.locator(shot.selector);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await el.screenshot({ path: path.join(outDir, shot.name) });
    } else {
      await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY ?? 0);
      await page.screenshot({
        path: path.join(outDir, shot.name),
        clip: { x: 0, y: 0, width: 1280, height: shot.height ?? 800 },
      });
    }
    console.log(`Saved ${shot.name}`);
  }

  await browser.close();
  console.log(`Screenshots written to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
