import puppeteer from 'puppeteer';
import { promisify } from 'util';
import * as fs from 'fs';
import fastq from 'fastq';
import { Deferred } from './deferred';
import rimraf from 'rimraf';

interface Reference {
  text: string;
  osis: string;
}

interface PageLinks {
  references: Reference[];
  websiteLinks: string[];
}

export interface CrawlConfig {
  /** Initial URL to start crawling at. */
  url: string;
  /** Whitelist of URL paths that should be scraped for references */
  scrapingWhitelist?: string[];
  /** Whitelist of URL paths that should be crawled; scrapingWhitelist is implied here */
  crawlingWhitelist?: string[];
  /** List of query parameters that are significant */
  queryParamWhitelist?: string[];
  /** Function to be executed before the crawling starts, e.g. to log in */
  onLaunch?: (browser: puppeteer.Browser) => Promise<void>;
  /** Parallel browser sessions crawling; defaults to 5 */
  concurrency?: number;
  /** Activate debug output */
  debug?: boolean;
  /** Output directory, which will always be emptied on start; defaults to `output` */
  dir?: string;
}

export class Crawler {
  private readonly queuedUrls = new Set<string>();
  private readonly queue = fastq(this, this.crawlPage, this.config.concurrency || 5);
  private readonly scrapingWhitelist: string[];
  private readonly crawlingWhitelist: string[];
  private readonly crawlingCompleted = new Deferred();
  private readonly outputDir = this.config.dir || 'output';
  private browser!: puppeteer.Browser;

  constructor(private readonly config: CrawlConfig) {
    this.scrapingWhitelist = this.config.scrapingWhitelist || [];
    this.crawlingWhitelist = (this.config.crawlingWhitelist || []).concat(this.scrapingWhitelist);
  }

  async execute() {
    await Promise.all([this.setupBrowser(), this.clearOutputDirectory()]);
    this.enqueueUrl(this.config.url);
    return this.crawlingCompleted.promise;
  }

  private async setupBrowser() {
    this.browser = await puppeteer.launch({ headless: !this.config.debug });
    if (this.config.onLaunch) {
      await this.config.onLaunch(this.browser);
    }
  }

  private enqueueUrl(url: string) {
    if (!this.queuedUrls.has(url)) {
      this.queuedUrls.add(url);
      this.queue.push(url, async (err, result?: PageLinks) => {
        if (err) {
          console.error(`Failed to crawl '${url}':`, err);
        } else if (result) {
          if (
            this.scrapingWhitelist.length === 0 ||
            this.scrapingWhitelist.some((entry) => url.startsWith(entry))
          ) {
            await this.writeReferencesToFile(url, result.references);
            console.log(`${result.references.length} references saved for ${url}`);
          }
          result.websiteLinks.forEach((link: string) => {
            const isLinkPermitted =
              this.crawlingWhitelist.length === 0 ||
              this.crawlingWhitelist.some((entry) => link.startsWith(entry));
            if (isLinkPermitted) {
              this.enqueueUrl(link);
            }
          });
          setTimeout(() => {
            if (this.queue.idle()) {
              this.crawlingCompleted.resolve();
            } else {
              console.log(`${this.queuedUrls.size - this.queue.length()}/${this.queuedUrls.size}`);
            }
          });
        }
      });
    }
  }

  private async crawlPage(url: string, cb: fastq.done<PageLinks>) {
    this.debug(`Retrieving ${url}`);
    let page: puppeteer.Page | undefined;
    try {
      page = await this.browser.newPage();
      await page.goto(url);
      const results = await page.evaluate((queryParamWhitelist) => {
        const cleanUrl = (completeUrl: string): string => {
          const urlWithoutLocation = completeUrl.replace(/#.*$/, '');
          const [result, queryString] = urlWithoutLocation.split('?');
          let filteredQueryString = '';
          if (queryString) {
            queryString.split('&').forEach((pair) => {
              const param = pair.split('=')[0];
              if (queryParamWhitelist.includes(param)) {
                filteredQueryString += `${filteredQueryString ? '&' : ''}${pair}`;
              }
            });
          }
          return `${result}${filteredQueryString ? '?' : ''}${filteredQueryString}`;
        };
        const references: Reference[] = [];
        const websiteLinks: string[] = [];
        document.querySelectorAll('a').forEach((link) => {
          const osis = link.getAttribute('data-osis');
          if (osis) {
            references.push({ text: link.innerText, osis });
          } else {
            const href = cleanUrl(link.getAttribute('href') || '');
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
      }, this.config.queryParamWhitelist || []);
      cb(null, results);
    } catch (err) {
      cb(err);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private debug(...args: any[]) {
    if (this.config.debug) {
      console.debug(...args);
    }
  }
  private async clearOutputDirectory() {
    await promisify(rimraf)(this.outputDir);
    await promisify(fs.mkdir)(this.outputDir);
  }

  private async writeReferencesToFile(url: string, references: Reference[]) {
    const filename = url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    await promisify(fs.writeFile)(
      `${this.outputDir}/${filename}.json`,
      JSON.stringify(references, null, 2),
      'utf-8'
    );
  }
}
