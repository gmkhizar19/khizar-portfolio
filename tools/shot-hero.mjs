/**
 * Captures the hero at desktop width so the theme can be judged from pixels.
 * Run with: node tools/shot-hero.mjs [outfile]
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = process.argv[2] ?? 'C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\hero.png';
const width = Number(process.argv[3] ?? 1440);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise((resolve) => setTimeout(resolve, 1200));
await page.screenshot({ path: out });
console.log(`saved ${out}`);
await browser.close();
