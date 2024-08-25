import fs from 'fs-extra';
import path from 'path';
import { ElementHandle, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import config from '../config';

const CREATOR: string = config.creator;
const SCRAPE_BY_YEAR: boolean = config.scrapeByYear;
const STOP_SCRAPE_INDEX: number = config.numPostsToScrape - 1;
const SCRAPE_COMMENTS: boolean = config.scrapeComments;
const SCRAPE_REPLIES: boolean = config.scrapeReplies;
const BTN_CLICK_MAX_RETRIES = 5;

const FILTER_BTN_LABEL = 'post feed filters toggle';
const APPLY_FILTER_BTN_LABEL = 'Apply filter';
const LOAD_REPLIES_LABEL = 'Load replies';

// const FILTER_BTN_LABEL = '文章摘要篩選條件切換按鈕';
// const APPLY_FILTER_BTN_LABEL = '套用篩選條件';
// const LOAD_REPLIES_LABEL = '載入回覆';

// Debugging options below

// Log debug information if true
const DEBUG = true;

// Process posts if true. Set to false to test pagination without processing posts
const PROCESS_POSTS = true;

// Only process posts with the following indices.
// Leave empty to process all posts
const WHITELISTED_POSTS: number[] = [];

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: path.join(__dirname, '../browser-data'),
  });

  try {
    if (!CREATOR || CREATOR === 'johndoe')
      throw new Error("Please set the creator's name in the config file.");
    if (!STOP_SCRAPE_INDEX || STOP_SCRAPE_INDEX < 0)
      throw new Error(
        'Please set a valid numPostsToScrape in the config file.'
      );
    const page = await browser.newPage();
    const baseDir = path.join(
      __dirname,
      '../dist',
      CREATOR,
      new Date().toISOString()
    );
    page.setDefaultTimeout(0);

    // await fs.remove(baseDir);
    await fs.ensureDir(baseDir);
    console.log(`Created directory: ${baseDir}`);

    console.log(`Navigating to ${CREATOR} posts...`);
    await page.goto(`https://www.patreon.com/${CREATOR}/posts`);
    await page.waitForSelector('div[data-tag="post-card"]');

    const years: string[] = [];
    if (SCRAPE_BY_YEAR) {
      const filterBtn = await page.$(
        `button[aria-disabled="false"][aria-label="${FILTER_BTN_LABEL}"]`
      );
      if (!filterBtn) throw new Error('Could not find filter button');
      await (filterBtn as ElementHandle<HTMLButtonElement>).evaluate(el =>
        el.click()
      );
      await page.waitForSelector('#post-feed-filter-dialog');
      const yearBtns = await page.$$('input[name="consolidated-date-filter"]');
      if (!yearBtns) throw new Error('Could not find year buttons');
      for (let i = 2; i < yearBtns.length; i++) {
        const yearBtn = yearBtns[i];
        const year = await yearBtn.evaluate(
          el => el.parentElement?.textContent
        );
        if (!year) throw new Error('Could not find year value');
        years.push(year);
      }
    }
    if (years.length === 0) {
      years.push('all');
    }

    let filterCount = 0;
    while (years.length > 0) {
      const year = years.shift();
      if (!year) throw new Error('Could not pop year');
      if (year !== 'all') {
        const filterBtn = await page.$(
          `button[aria-disabled="false"][aria-label="${FILTER_BTN_LABEL}"]`
        );
        if (!filterBtn) throw new Error('Could not find filter button');
        filterBtn.evaluate(el => el.scrollIntoView());
        await (filterBtn as ElementHandle<HTMLButtonElement>).evaluate(el =>
          el.click()
        );
        await page.waitForSelector('#post-feed-filter-dialog');
        const yearBtn = await page.$(
          `input[name="consolidated-date-filter"][value="${1 + filterCount++}"]`
        );
        if (!yearBtn) throw new Error('Could not find year button');
        await yearBtn.evaluate(el => el.click());
        console.log(`Clicked filter for year ${year}.`);
        const applyBtn = await page.$(
          `button[label="${APPLY_FILTER_BTN_LABEL}"]`
        );
        if (!applyBtn) throw new Error('Could not find apply button');
        await applyBtn.evaluate(el => el.click());
        await page.waitForSelector('div[data-tag="post-card"]');
      }

      let hasMorePosts = true;
      let postIndexInCurrPage: number = 0;
      while (hasMorePosts) {
        const postFeed = await page.$('ul[data-cardlayout-edgeless]');
        if (!postFeed) throw new Error('Could not find post feed');

        const posts = (
          await page.$$('ul[data-cardlayout-edgeless] > li')
        ).slice(postIndexInCurrPage);
        console.log(`Found ${posts.length} posts.`);
        console.log(
          `Processing post ${postIndexInCurrPage} to ${
            postIndexInCurrPage + posts.length - 1
          }...`
        );
        if (PROCESS_POSTS) {
          for (let i = 0; i < posts.length; i++) {
            if (
              WHITELISTED_POSTS.length === 0 ||
              WHITELISTED_POSTS.includes(postIndexInCurrPage)
            ) {
              await processPost(page, postIndexInCurrPage);
            } else {
              console.log(`post ${postIndexInCurrPage}: Skipped.`);
            }
            postIndexInCurrPage++;
          }
        } else {
          postIndexInCurrPage += posts.length;
        }

        if (postIndexInCurrPage > STOP_SCRAPE_INDEX) {
          hasMorePosts = false;
          console.log(`Reached STOP_SCRAPE_INDEX of ${STOP_SCRAPE_INDEX}.`);
          break;
        }

        const postFeedParent = await postFeed.evaluateHandle(
          el => el.parentElement
        );
        if (!(postFeedParent instanceof ElementHandle))
          throw new Error('Could not find ul parent');

        const loadMoreButton = await (
          (await (postFeedParent as ElementHandle).evaluateHandle(
            el => el.lastElementChild
          )) as ElementHandle
        ).$('button');
        if (!loadMoreButton) {
          hasMorePosts = false;
          console.log('All posts loaded.');
          break;
        }

        console.log('Clicking button to load more posts...');
        await loadMoreButton.click();

        await page.waitForFunction(
          previousLength => {
            const postFeed = document.querySelector(
              'ul[data-cardlayout-edgeless]'
            );
            if (!postFeed)
              throw new Error(
                'Could not find post feed after clicking load more'
              );
            return postFeed.children.length > previousLength + 1;
          },
          {},
          postIndexInCurrPage
        );
      }

      await captureSnapshot(page, baseDir, year);
    }
  } catch (error) {
    console.error(error);
    await new Promise(() => {}); // Keep browser open for debugging
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();

async function processPost(page: Page, index: number): Promise<void> {
  try {
    const post = (await page.$$('ul[data-cardlayout-edgeless] > li'))[index];
    if (!post) throw new Error('Could not find post');
    await post.evaluate(el => el.scrollIntoView());

    const cid = await post.evaluate(el => {
      console.log(el.querySelector('div[id^="cid-"]'));
      return el.querySelector('div[id^="cid-"]')?.id;
    });
    if (!cid) throw new Error('Could not find comment id');
    const showMoreBtn = await page.$(
      `button[aria-expanded="false"][aria-controls=${cid}]`
    );
    if (showMoreBtn) {
      showMoreBtn.evaluate(el => el.click());
      console.log(`Post ${index}: Clicked show more on post.`);
      await page.waitForFunction(
        (cid: string) =>
          document.querySelector(
            `button[aria-controls="${cid}"][aria-expanded="true"]`
          ) !== null,
        {},
        cid
      );
    }
    console.log(`Post ${index}: Full post loaded.`);

    if (SCRAPE_COMMENTS) {
      await loadMoreComments(page, index);
    }
    if (SCRAPE_REPLIES) {
      await loadReplies(page, index);
    }
  } catch (error) {
    throw new Error(`Error occurred while processing post ${index}: ${error}`);
  }
}

async function loadMoreComments(page: Page, index: number): Promise<void> {
  let hasMoreComments = true;
  while (hasMoreComments) {
    try {
      const post = await getPostHandle(page, index);
      const loadMoreCommentsBtn = await post.$(
        'button[data-tag="loadMoreCommentsCta"]'
      );
      if (!loadMoreCommentsBtn) {
        hasMoreComments = false;
        console.log(`Post ${index}: All comments loaded.`);
        break;
      }

      await loadMoreCommentsBtn.evaluate(el => el.click());
      console.log(`Post ${index}: Clicked load more comments.`);

      await page.waitForFunction(
        (index: number) => {
          const post = document.querySelectorAll(
            'ul[data-cardlayout-edgeless] > li'
          )[index];
          return (
            post.querySelector(
              'button[data-tag="loadMoreCommentsCta"][aria-disabled="true"]'
            ) === null
          );
        },
        {},
        index
      );
    } catch (error) {
      throw new Error(`Error occurred while loading comments: ${error}`);
    }
  }
}

async function loadReplies(page: Page, index: number): Promise<void> {
  let hasMoreReplies = true;
  const lastReplyCounts: Map<string, number> = new Map(); // Keep counts of how many times the same last reply appears to prevent infinite loops due to phoney load replies buttons

  while (hasMoreReplies) {
    try {
      const post = await getPostHandle(page, index);
      const btns = await post.$$(
        'div[data-tag="content-card-comment-thread-container"] button'
      );
      const loadRepliesBtns: ElementHandle<HTMLButtonElement>[] = [];

      const lastReplies = [];
      for (const btn of btns) {
        const textContent = await btn.evaluate(el => el.textContent);

        if (textContent === LOAD_REPLIES_LABEL) {
          const replyThread = await btn.evaluateHandle(
            el => el.parentElement?.parentElement
          );
          if (!(replyThread instanceof ElementHandle))
            throw new Error('Could not find reply thread');
          let lastReply = await (
            replyThread as ElementHandle<HTMLElement>
          ).evaluate(el => {
            const children = el.children;
            console.log(children);
            console.log(children[children.length - 2]);
            console.log(children[children.length - 2]?.textContent);
            return children[children.length - 2]?.textContent || '';
          });
          if (!lastReply) {
            console.info(
              `post ${index}: Could not find last reply of the reply thread - using the parent of the reply thread`
            );
            lastReply = await (
              replyThread as ElementHandle<HTMLElement>
            ).evaluate(el => {
              const parent = el.parentElement;
              return parent?.firstElementChild?.textContent || '';
            });
            if (!lastReply)
              throw new Error('Could not find text to be a reference point.');
          }

          lastReplies.push(lastReply);
          lastReplyCounts.set(
            lastReply,
            (lastReplyCounts.get(lastReply) || 0) + 1
          );

          if (lastReplyCounts.get(lastReply)! < BTN_CLICK_MAX_RETRIES) {
            loadRepliesBtns.push(btn);
          } else {
            console.log(
              `Post ${index}: Load replies button reached max retries, skipping.${
                DEBUG ? ' Last reply: ' + lastReply : ''
              }`
            );
          }
        }
      }

      if (loadRepliesBtns.length === 0) {
        hasMoreReplies = false;
        console.log(`Post ${index}: All replies loaded.`);
        break;
      }

      for (const [i, btn] of loadRepliesBtns.entries()) {
        await btn.evaluate(el => el.click());
        const lastReply = lastReplies[i];
        lastReplyCounts.set(lastReply, lastReplyCounts.get(lastReply)! + 1);
        console.log(
          `Post ${index}: Clicked load replies.${
            DEBUG ? ` Last reply: ${lastReply}` : ''
          }.`
        );

        await page.waitForFunction(
          (index: number) => {
            const post = document.querySelectorAll(
              'ul[data-cardlayout-edgeless] > li'
            )[index];
            return post.querySelector('svg[aria-label="Loading"]') === null;
          },
          {},
          index
        );
      }
    } catch (error) {
      throw new Error(`Error occurred while loading replies: ${error}`);
    }
  }
}

async function getPostHandle(
  page: Page,
  index: number
): Promise<ElementHandle> {
  try {
    const ul = await page.$('ul[data-cardlayout-edgeless]');
    if (!ul) throw new Error('Could not find ul');
    const post = (await ul.$$('li'))[index];
    if (!post) throw new Error('Could not find post');
    post.evaluate(el => el.scrollIntoView());
    return post;
  } catch (error) {
    throw new Error(`Error occurred while getting post handle: ${error}`);
  }
}

async function captureSnapshot(page: Page, baseDir: string, year: string) {
  const cdp = await page.createCDPSession();
  const { data } = await cdp.send('Page.captureSnapshot', {
    format: 'mhtml',
  });
  const distLoc = path.join(baseDir, `${year.replace(/\s+/g, '')}.mhtml`);
  await fs.outputFile(distLoc, data);
  console.log(`Snapshot saved to ${distLoc}`);
}
