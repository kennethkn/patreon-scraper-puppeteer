// import path from 'path';
// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// puppeteer.use(StealthPlugin());

// (async () => {
//   const browser = await puppeteer.launch({
//     headless: false,
//     userDataDir: path.join(__dirname, '../browser-data'),
//   });

//   try {
//     const page = await browser.newPage();
//     await page.setViewport({ width: 1080, height: 1024 });
//     page.setDefaultTimeout(0);
//     await page.goto('https://www.patreon.com/login');
//     await page.waitForFunction(() => {
//       return window.location.href.includes('https://www.patreon.com/home');
//     });
//   } catch (error) {
//     console.error('Error during login:', error);
//   } finally {
//     await browser.close();
//   }
// })();

// New approach since cloudflare is blocking puppeteer even with stealth plugin as of writing this
const { connect } = require('puppeteer-real-browser');
const path = require('path');

(async () => {
  const { page } = await connect({
    headless: false,
    args: [`--user-data-dir=${path.join(__dirname, '../browser-data')}`],
    customConfig: {},
    turnstile: true,
    connectOption: {},
    disableXvfb: false,
  });
  await page.goto('https://www.patreon.com/login');
})();
