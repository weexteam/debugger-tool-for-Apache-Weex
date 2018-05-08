const puppeteer = require('puppeteer');
let page;
let browser = null;
const config = require('../lib/config');
const {
  logger
} = require('../util/logger');

exports.launchHeadless = async (host, remotePort) => {
  const options = {
    args: [`--remote-debugging-port=${remotePort}`, `--disable-gpu`]
  };
  if (config.chromePath) {
    options.executablePath = config.chromePath;
  }
  browser = await puppeteer.launch(options);
  logger.verbose(`Headless has been launched`);
  page = await browser.newPage();
  await page.goto(`http://${host}/runtime.html`);
  logger.verbose(`Headless page goto http://${host}/runtime.html`);
};

exports.closeHeadless = async () => {
  if (page) {
    await page.close();
  }
  if (browser) {
    await browser.close();
  }
  browser = null;
  logger.verbose(`Cloased headless`);
};
