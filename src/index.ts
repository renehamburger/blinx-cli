import { Crawler, CrawlConfig } from './crawl';

const config: CrawlConfig = {
  url: 'https://kurs.bibel-fuer-alle.net/mod/page/view.php?id=122',
  scrapingWhitelist: ['https://kurs.bibel-fuer-alle.net/mod/page/view.php'],
  crawlingWhitelist: ['https://kurs.bibel-fuer-alle.net/course/view.php'],
  queryParamWhitelist: ['id'],
  onLaunch: async (browser) => {
    if (process.env.BFA_USERNAME || !process.env.BFA_PASSWORD) {
      const page = await browser.newPage();
      await page.goto('https://kurs.bibel-fuer-alle.net/login/index.php');
      await page.type('#username', process.env.BFA_USERNAME!);
      await page.type('#password', process.env.BFA_PASSWORD!);
      await page.keyboard.press('Enter');
      await page.waitForNavigation();
    }
  },
  concurrency: 5,
  debug: false
};

new Crawler(config)
  .execute()
  .then(() => {
    console.log('Crawling finished successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
