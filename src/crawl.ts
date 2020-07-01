import puppeteer from 'puppeteer';
import { promisify } from 'util';
import * as fs from 'fs';

const pendingUrls = new Set<string>();
const visitedUrls = new Set<string>();

interface Reference {
  text: string;
  osis: string;
}

interface PageLinks {
  references: Reference[];
  websiteLinks: string[];
}

export async function executeCrawl(
  initialUrl: string,
  whitelistForScraping: string[] = [],
  whitelistForCrawling: string[] = []
) {
  whitelistForCrawling = whitelistForCrawling.concat(whitelistForScraping);
  const browser = await puppeteer.launch();
  pendingUrls.add(initialUrl);
  while (pendingUrls.size) {
    const url: string = pendingUrls.values().next().value;
    const { references, websiteLinks } = await crawlPage(browser, url);
    visitedUrls.add(url);
    pendingUrls.delete(url);
    if (
      whitelistForScraping.length === 0 ||
      whitelistForScraping.some((entry) => url.startsWith(entry))
    ) {
      await writeReferencesToFile(url, references);
    }
    websiteLinks.forEach((link) => {
      const isLinkPermitted =
        whitelistForCrawling.length === 0 ||
        whitelistForCrawling.some((entry) => link.startsWith(entry));
      if (isLinkPermitted && !visitedUrls.has(link)) {
        pendingUrls.add(link);
      }
    });
  }
}

export async function crawlPage(browser: puppeteer.Browser, url: string): Promise<PageLinks> {
  console.debug(`Retrieving ${url}`);
  const page = await browser.newPage();
  await page.goto(url);
  return await page.evaluate(() => {
    const references: Reference[] = [];
    const websiteLinks: string[] = [];
    document.querySelectorAll('a').forEach((link) => {
      const osis = link.getAttribute('data-osis');
      if (osis) {
        references.push({ text: link.innerText, osis });
      } else {
        const href = (link.getAttribute('href') || '').replace(/#.*$/, '');
        if (href) {
          const parsedHref = new URL(href, location.origin);
          if (location.origin === parsedHref.origin) {
            websiteLinks.push(parsedHref.href);
          }
        }
      }
    });
    return {
      references,
      websiteLinks
    };
  });
}

async function writeReferencesToFile(url: string, references: Reference[]) {
  const filename = url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  await promisify(fs.writeFile)(
    `output/${filename}.json`,
    JSON.stringify(references, null, 2),
    'utf-8'
  );
}
