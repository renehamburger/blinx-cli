import puppeteer from 'puppeteer';
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
export declare class Crawler {
    private readonly config;
    private readonly queuedUrls;
    private readonly queue;
    private readonly scrapingWhitelist;
    private readonly crawlingWhitelist;
    private readonly crawlingCompleted;
    private readonly outputDir;
    private browser;
    constructor(config: CrawlConfig);
    execute(): Promise<unknown>;
    private setupBrowser;
    private enqueueUrl;
    private crawlPage;
    private debug;
    private clearOutputDirectory;
    private writeReferencesToFile;
}
