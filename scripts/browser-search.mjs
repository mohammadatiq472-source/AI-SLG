import { chromium } from 'playwright';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

export async function searchX(keyword) {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(`https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    const results = await page.evaluate(() => {
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(tweets).slice(0, 10).map(tweet => {
        const text = tweet.querySelector('div[data-testid="tweetText"]')?.innerText || '';
        const user = tweet.querySelector('a[role="link"]')?.innerText || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        return { user, text: text.substring(0, 200), time };
      });
    });

    return results;
  } finally {
    await browser.close();
  }
}

export async function searchGoogle(keyword) {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('div.g');
      return Array.from(items).slice(0, 10).map(item => {
        const title = item.querySelector('h3')?.innerText || '';
        const link = item.querySelector('a')?.href || '';
        const snippet = item.querySelector('div.VwiC3b')?.innerText || '';
        return { title, link, snippet };
      });
    });

    return results;
  } finally {
    await browser.close();
  }
}

export async function fetchPage(url) {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    const content = await page.evaluate(() => {
      return document.body.innerText.substring(0, 5000);
    });

    return content;
  } finally {
    await browser.close();
  }
}

if (process.argv[2]) {
  const cmd = process.argv[2];
  const query = process.argv.slice(3).join(' ');
  
  if (cmd === 'x') {
    searchX(query).then(r => console.log(JSON.stringify(r, null, 2)));
  } else if (cmd === 'google') {
    searchGoogle(query).then(r => console.log(JSON.stringify(r, null, 2)));
  } else if (cmd === 'fetch') {
    fetchPage(query).then(r => console.log(r));
  }
}
