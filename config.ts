const config = {
  // Set the creator to scrape (https://www.patreon.com/johndoe -> johndoe)
  creator: 'johndoe',

  // Each year will be saved in a separate file to prevent memory issues
  scrapeByYear: true,

  // Set the number of posts to scrape in total / per year if scrapeByYear is true
  // Beware that browser will crash if set too high (>90) because of insufficient memory
  numPostsToScrape: 90,

  // Load all comments/replies for each post if true
  scrapeComments: true,
  scrapeReplies: true,
};

export default config;
