/**
 * Captures the Lab section after the network data has loaded, so the canvas is
 * verified from pixels rather than assumed.
 *
 * Run with: node tools/shot-lab.mjs [outfile]
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = process.argv[2] ?? 'C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\lab.png';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => document.querySelector('#lab')?.scrollIntoView({ block: 'start' }));
await new Promise((resolve) => setTimeout(resolve, 2500));

const section = await page.$('#lab');
await section.screenshot({ path: out });
console.log(`saved ${out}`);
await browser.close();
