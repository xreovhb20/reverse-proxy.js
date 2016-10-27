#!/usr/bin/env node

/**
 * Command line interface.
 */
const {Application} = require('../lib');

// Run the application.
process.title = 'reverse-proxy';
global.app = new Application();
global.app.run();
