"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crawler = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const util_1 = require("util");
const fs = __importStar(require("fs"));
const fastq_1 = __importDefault(require("fastq"));
const deferred_1 = require("./deferred");
const rimraf_1 = __importDefault(require("rimraf"));
class Crawler {
    constructor(config) {
        this.config = config;
        this.queuedUrls = new Set();
        this.queue = fastq_1.default(this, this.crawlPage, this.config.concurrency || 5);
        this.crawlingCompleted = new deferred_1.Deferred();
        this.outputDir = this.config.dir || 'output';
        this.scrapingWhitelist = this.config.scrapingWhitelist || [];
        this.crawlingWhitelist = (this.config.crawlingWhitelist || []).concat(this.scrapingWhitelist);
    }
    async execute() {
        await Promise.all([this.setupBrowser(), this.clearOutputDirectory()]);
        this.enqueueUrl(this.config.url);
        return this.crawlingCompleted.promise;
    }
    async setupBrowser() {
        this.browser = await puppeteer_1.default.launch({ headless: !this.config.debug });
        if (this.config.onLaunch) {
            await this.config.onLaunch(this.browser);
        }
    }
    enqueueUrl(url) {
        if (!this.queuedUrls.has(url)) {
            this.queuedUrls.add(url);
            this.queue.push(url, async (err, result) => {
                if (err) {
                    console.error(`Failed to crawl '${url}':`, err);
                }
                else if (result) {
                    if (this.scrapingWhitelist.length === 0 ||
                        this.scrapingWhitelist.some((entry) => url.startsWith(entry))) {
                        await this.writeReferencesToFile(url, result.references);
                        console.log(`${result.references.length} references saved for ${url}`);
                    }
                    result.websiteLinks.forEach((link) => {
                        const isLinkPermitted = this.crawlingWhitelist.length === 0 ||
                            this.crawlingWhitelist.some((entry) => link.startsWith(entry));
                        if (isLinkPermitted) {
                            this.enqueueUrl(link);
                        }
                    });
                    setTimeout(() => {
                        if (this.queue.idle()) {
                            this.crawlingCompleted.resolve();
                        }
                        else {
                            console.log(`${this.queuedUrls.size - this.queue.length()}/${this.queuedUrls.size}`);
                        }
                    });
                }
            });
        }
    }
    async crawlPage(url, cb) {
        this.debug(`Retrieving ${url}`);
        let page;
        try {
            page = await this.browser.newPage();
            await page.goto(url);
            const results = await page.evaluate((queryParamWhitelist) => {
                const cleanUrl = (completeUrl) => {
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
                const references = [];
                const websiteLinks = [];
                document.querySelectorAll('a').forEach((link) => {
                    const osis = link.getAttribute('data-osis');
                    if (osis) {
                        references.push({ text: link.innerText, osis });
                    }
                    else {
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
        }
        catch (err) {
            cb(err);
        }
        finally {
            if (page) {
                await page.close();
            }
        }
    }
    debug(...args) {
        if (this.config.debug) {
            console.debug(...args);
        }
    }
    async clearOutputDirectory() {
        await util_1.promisify(rimraf_1.default)(this.outputDir);
        await util_1.promisify(fs.mkdir)(this.outputDir);
    }
    async writeReferencesToFile(url, references) {
        const filename = url
            .replace(/^https?:\/\//, '')
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase();
        await util_1.promisify(fs.writeFile)(`${this.outputDir}/${filename}.json`, JSON.stringify(references, null, 2), 'utf-8');
    }
}
exports.Crawler = Crawler;
