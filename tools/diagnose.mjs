/**
 * Headless diagnostic: opens the built site, scrolls to the Lab, and reports
 * the canvas geometry plus how many non-background pixels it actually painted.
 *
 * Run with: node tools/diagnose.mjs
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1440, height: 1000 },
});

const page = await browser.newPage();
const messages = [];
page.on('console', (message) => messages.push(`[${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => messages.push(`[pageerror] ${error.message}`));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });

// The Lab only fetches its data once the section is near the viewport.
await page.evaluate(() => document.querySelector('#lab')?.scrollIntoView());
await new Promise((resolve) => setTimeout(resolve, 2500));

const report = await page.evaluate(() => {
  const canvas = document.querySelector('#lab canvas');
  const shell = document.querySelector('#lab .canvas-shell');
  if (!canvas) return { error: 'no canvas element' };

  const box = canvas.getBoundingClientRect();
  const ctx = canvas.getContext('2d');
  let painted = 0;
  let sampled = 0;
  if (ctx && canvas.width > 0 && canvas.height > 0) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < data.length; index += 4) {
      sampled += 1;
      if (data[index] > 8) painted += 1;
    }
  }

  return {
    canvasCss: { width: box.width, height: box.height },
    canvasBacking: { width: canvas.width, height: canvas.height },
    shell: shell
      ? { width: shell.getBoundingClientRect().width, height: shell.getBoundingClientRect().height }
      : null,
    opacityCoverage: sampled ? painted / sampled : 0,
    devicePixelRatio: window.devicePixelRatio,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
});

console.log(JSON.stringify({ report, messages: messages.slice(0, 20) }, null, 2));

await browser.close();
