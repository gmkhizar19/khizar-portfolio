/**
 * Resolves opaque Coursera share links to their certificate names.
 *
 * Coursera renders accomplishment pages client-side and serves generic metadata to
 * crawlers, so the only reliable way to label a link is to let the page run and read
 * what it actually shows. Never attach a verification URL to a credential without this.
 *
 * Run with: node tools/resolve-credentials.mjs <share-url> [<share-url> ...]
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('usage: node tools/resolve-credentials.mjs <url> [<url> ...]');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
  defaultViewport: { width: 1280, height: 900 },
});

const results = [];
for (const url of urls) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // The certificate name arrives with the client-side render, not the first HTML byte.
    await page.waitForFunction(() => document.body.innerText.includes('Completed by'), {
      timeout: 45000,
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const detail = await page.evaluate(() => {
      const heading = document.querySelector('h1, h2');
      const body = document.body.innerText;
      return {
        title: document.title,
        heading: heading?.textContent?.trim() ?? '',
        // The first meaningful paragraph tends to be "<Programme> from <issuer>".
        firstLines: body
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 12),
        finalUrl: location.href,
      };
    });
    results.push({ url, ...detail });
  } catch (error) {
    results.push({ url, error: error.message });
  } finally {
    await page.close();
  }
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
