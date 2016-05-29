#!/usr/bin/env node

/**
 * Command line interface.
 * @module bin/cli
 */
'use strict';

// Module dependencies.
const reverseProxy = require('../lib');

// Run the application.
let application = new reverseProxy.Application();

if(module === require.main) {
  process.title = 'reverse-proxy.js';
  global.app = application;
  global.app.run();
}

// Public interface.
module.exports = application;
