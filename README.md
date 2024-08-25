# Patreon Scraper Puppeteer

This project is a web scraper built using Puppeteer to scrape posts, comments, and replies from a specified Patreon creator's page. It takes advantage of the `.mhtml` format to save the scraped data in a single file.

## Disclaimer

This project is for educational purposes only. I am not responsible for any misuse of this project.

## Table of Contents

- [Patreon Scraper Puppeteer](#patreon-scraper-puppeteer)
  - [Disclaimer](#disclaimer)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Usage](#usage)
    - [Configuration](#configuration)
    - [Running the Scraper](#running-the-scraper)
    - [Output](#output)
    - [Limitation](#limitation)
  - [Scripts](#scripts)
  - [Project Structure](#project-structure)
  - [What is MHTML?](#what-is-mhtml)
  - [Maintenance](#maintenance)
  - [Is This Safe?](#is-this-safe)
  - [License](#license)

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- Patreon account language set to English

## Setup

To install the necessary dependencies and login to Patreon, run:

```sh
npm run setup
```

After logging in, you can quit the browser safely.

## Usage

### Configuration

The scraper can be configured by modifying the [`config.ts`](config.ts) file:

```ts
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
```

### Running the Scraper

After logging in and configuring the scraper, you can run the scraper using:

```sh
npm start
```

### Output

The scraper saves the output in the `.mhtml` format. You can find the output files in the `dist` directory under a subdirectory named after the creator and the timestamp. For example, if the creator is `johndoe`, the output files will be located at:

```plaintext
dist /johndoe/<timestamp>/2024(23).mhtml
dist /johndoe/<timestamp>/2023(49).mhtml
dist /johndoe/<timestamp>/2022(42).mhtml
...
```

Each year is saved in a separate file as shown above, if `scrapeByYear` is set to `true`.

To open a `.mhtml` file, you can use a web browser like Google Chrome or Microsoft Edge. Simply drag and drop the file into the browser if clicking on it does not work.

### Limitation

On a 16-gig RAM machine, the scraper can trigger about 90 posts to load (with full comments and replies) and save before the browser crashes due to running out of memory. This is a known issue with Patreon, where users cannot access very old posts because of how it handles pagination (infinite scrolling, which increases RAM consumption the more you scroll back). The scraper simply reaches that limit faster than you would manually. This is not an issue if the creator posts under that limit in a year, as the scraper offers the option to scrape by year. However, if the creator posts more than that in a year, you cannot access the older posts.

## Scripts

The following scripts are available via `npm run`:

- `start`: Runs the main scraper script ([`src/index.ts`](src/index.ts)).
- `login`: Runs the login script ([`src/login.js`](src/index.js)).
- `setup`: Installs dependencies and runs the login script.
- `clean`: Cleans the `dist` directory.
- `logout`: Deletes the `browser-data` directory.

## Project Structure

```plaintext
.
├── config.ts             <- Set creator & other configurations
├── dist
│   └── <creator>
│       └── <timestamp>   <- Output directory
└── src
    ├── index.ts          <- Main scraper script
    └── login.js          <- Login script
```

## What is MHTML?

MHTML, short for MIME HTML, is a web page archive format used to combine resources that are typically represented by external links (such as images, scripts, and stylesheets) into a single file.

This format is useful for saving web pages for offline viewing or archiving purposes because everything that makes up the web page is stored in a single file.

This script takes advantage of the MHTML format so that there's no need to build a new UI to view the scraped data. You can simply open the `.mhtml` file in a web browser to view the content as if you were viewing the Patreon page online.

## Maintenance

Some anticipated issues in the future:

- Patreon changing their website structure.
- Library used for browser stealth no longer working.

If you encounter any issues, feel free to open an issue or help fix it.

## Is This Safe?

Yes. All the script does in essence is trigger dynamic contents to load and then save the page for offline viewing. Just ask AI about the code if you're unsure.

## License

This project is licensed under the ISC License.
