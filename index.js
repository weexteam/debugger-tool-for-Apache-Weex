const devtool = require('./lib/index');
const config = require('./lib/config');
const IP = require('ip');

/**
 * Start server and lanunch chrome.
 * @param {string} entry filename/floder
 * @param {Object} config
 * - ip ip of node server.
 * - port port of node server
 * - remoteDebugPort remote-debug-port of headless.
 * - enableHeadless enable to start headless chromium or not.
 * @param {Function} cb
 */
const startServerAndLaunchDevtool = (entry, options, cb) => {
  if (options) {
    config.ip = options.ip || IP.address();
    config.port = options.port || 8088;
    config.manual = options.manual || false;
    config.CHANNELID = options.CHANNELID || options.channelId;
    config.REMOTE_DEBUG_PORT = options.REMOTE_DEBUG_PORT || options.remoteDebugPort || 9222;
    config.ENABLE_HEADLESS = typeof options.ENABLE_HEADLESS === 'boolean' ? options.ENABLE_HEADLESS : typeof options.enableHeadless === 'boolean' ? options.enableHeadless : true;
  }
  devtool.start(entry, config, cb);
};

const api = {
  startServerAndLaunchDevtool: startServerAndLaunchDevtool,
  reload: devtool.reload,
  refresh: devtool.refresh,
  renderPage: devtool.renderPage
};

module.exports = {
  api
};
