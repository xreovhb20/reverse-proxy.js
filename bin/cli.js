#!/usr/bin/env node

/**
 * Command line interface.
 * @module bin/cli
 */
const {Application} = require('../lib');

// Run the application.
process.title = 'reverse-proxy';
global.app = new Application();
global.app.run();
