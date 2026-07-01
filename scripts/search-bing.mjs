import { chromium } from 'playwright';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

export async function searchBing(keyword) {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(keyword)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    const content = await page.evaluate(() => {
      return document.body.innerText.substring(0, 10000);
    });

    return content;
  } finally {
    await browser.close();
  }
}

if (process.argv[2]) {
  const query = process.argv.slice(2).join(' ');
  searchBing(query).then(r => console.log(r));
}
