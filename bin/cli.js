#!/usr/bin/env node

/**
 * Command line interface.
 * @module bin/cli
 */
const {Application} = require('../lib');

// Run the application.
let application = new Application();

if(module === require.main) {
  process.title = 'reverse-proxy';
  global.app = application;
  global.app.run();
}

// Public interface.
module.exports = application;
