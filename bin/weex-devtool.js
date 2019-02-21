#!/usr/bin/env node

'use strict';

const program = require('commander');
const ip = require('ip');
const exit = require('exit');
const path = require('path');
const detect = require('detect-port');
const del = require('del');
const os = require('os');
const packageInfo = require('../package.json');
const config = require('../lib/config');
const devtool = require('../lib/index');
const env = require('../lib/util/env');
const hosts = require('../lib/util/hosts');
const headless = require('../lib/server/headless');
const uuid = require("uuid");
const {
  logger
} =require('../lib/util')

program
.option('-v, --version', 'display version')
.option('-h, --help', 'display help')
.option('-H --host [host]', 'set the host ip of debugger server')
.option('-p, --port [port]', 'set debugger server port', '8088')
.option('-m, --manual', 'manual mode,this mode will not auto open chrome')
.option('-e,--ext [ext]', 'set enabled extname for compiler default is vue')
.option('--min', 'minimize the jsbundle')
.option('--channelid [id]', 'Specify a unique id for communication channel')
.option('--telemetry', 'upload usage data to help us improve the toolkit')
.option('--verbose', 'display all logs of debugger server')
.option('--loglevel [loglevel]', 'set log level silent|error|warn|info|log|debug', 'error')
.option('--remotedebugport [remotedebugport]', 'set the remote debug port', config.REMOTE_DEBUG_PORT)
.option('--bonjour', 'Brodcast the IP and port of this computer via Bonjour');


// Supporting add the file / directory parameter after the command.
program['arguments']('[target]').action(function (target) {
  program.target = target;
});

program.parse(process.argv);

// overwrite the cmdname for weex-toolkit
program._name = `weex debug`;

// Fix tj's commander bug overwrite --help
if (program.help === undefined) {
  program.outputHelp();
  exit(0);
}

// Fix tj's commander bug overwrite --version
if (program.version === undefined) {
  logger.log(packageInfo.version);
  exit(0);
}

if (program.host && !hosts.isValidLocalHost(program.host)) {
  logger.error('[' + program.host + '] is not your local address!');
  exit(0);
}

if (program.loglevel) {
  program.loglevel = program.loglevel.toLowercase && program.loglevel.toLowercase()
  if(logger.LOGLEVELS.indexOf(program.loglevel) > -1) {
    logger.setLevel(program.loglevel)
  }
}

if (program.verbose) {
  logger.setLevel('verbose')
}

if (program.remotedebugport) {
  config.REMOTE_DEBUG_PORT = program.remotedebugport;
}

config.CHANNELID = program.channelid || uuid();

// Get the local environment
env.getVersionOf('weex', (v) => {
  config.weexVersion = v && v.version;
})
env.getVersionOf('npm', (v) => {
  config.npmVersion = v &&  v.version;
})
env.getVersionOf('node', (v) => {
  config.nodeVersion = v && v.version;
})

// Formate config 
config.ip = program.host || ip.address();
config.manual = program.manual;
config.min = program.min;
config.ext = program.ext || 'vue';
config.bonjour = program.bonjour;

process.on('uncaughtException', (err) => {
  try {
    let killTimer;
    const params = Object.assign({
      stack: err && err.stack,
      os: os.platform(),
      node: config.nodeVersion,
      npm: config.npmVersion
    }, config.weexVersion);
    killTimer = setTimeout(function () {
      process.exit(1);
    }, 30000);
    killTimer.unref();
  } catch (e) {
    logger.error('Error Message: ', e.stack);
  }
});

process.on('unhandledRejection', (reason, p) => {logger
  const params = Object.assign({
    stack: reason,
    os: os.platform(),
    node: config.nodeVersion,
    npm: config.npmVersion
  }, config.weexVersion);
  logger.error(reason);
  if (/simctl error/.test(reason)) {
    logger.warn(`The simulator debug need Xcode environment, you can run \`simctl --version\` to check if you have the correct environment.`);
  }
  else if (/Chromium revision is not downloaded/.test(reason)) {
    logger.warn(`You may not have installed chromium properly, you can find solution here https://github.com/weexteam/weex-toolkit/issues/275.`);
  }
  // application specific logging, throwing an error, or other logic here
});

process.on('SIGINT', err => {
  headless.closeHeadless();
  exit(0);
})
// Check whether the port is occupied
detect(program.port).then( (open) => {
  config.inUse = open !== +program.port;
  if (config.inUse) {
    config.inUse = {
      old: program.port,
      open: open
    };
    config.port = open;
  } else {
    config.port = program.port;
  }
  try {
    del.sync(path.join(__dirname, '../frontend/', config.BUNDLE_DIRECTORY, '/*'), {
      force: true
    });
  } catch (e) {}
  devtool.start(program.target, config);
});
