import { executeCrawl } from './crawl';

const START_URL = 'https://kurs.bibel-fuer-alle.net/mod/page/view.php?id=122';
const SCRAPE_WHITELIST = ['https://kurs.bibel-fuer-alle.net/mod/page/view.php'];
const CRAWL_WHITELIST = ['https://kurs.bibel-fuer-alle.net/course/view.php'];

executeCrawl(START_URL, SCRAPE_WHITELIST, CRAWL_WHITELIST)
  .then(() => {
    console.log('Crawling finished successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
