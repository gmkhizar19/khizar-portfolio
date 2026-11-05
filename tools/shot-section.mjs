/**
 * Screenshots one section of the built site after it has settled.
 * Run with: node tools/shot-section.mjs "<selector>" [outfile]
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const selector = process.argv[2] ?? '#work';
const out = process.argv[3] ?? 'C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\section.png';
const width = Number(process.argv[4] ?? 1440);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width, height: 1000, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });

// The nav is position: sticky, so an element screenshot would draw it on top of whatever
// section we capture. Pin it out of the flow for the shot; this affects the capture only.
await page.addStyleTag({ content: '.nav { position: static !important; }' });

// Scroll through the page once so lazy images and IntersectionObservers fire.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
});
await new Promise((resolve) => setTimeout(resolve, 1200));

const element = await page.$(selector);
if (!element) {
  console.error(`no element for ${selector}`);
  process.exit(1);
}
await element.screenshot({ path: out });
console.log(`saved ${out}`);
await browser.close();
