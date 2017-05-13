#!/usr/bin/env node
'use strict';

const {Application} = require('../lib');

/**
 * Application entry point.
 * @return {Promise} Completes when the program is started.
 */
async function main() {
  process.title = 'Reverse-Proxy.js';
  return (new Application).run();
}

// Run the application.
if (module === require.main) main().catch(err => {
  console.error(err);
  process.exit(1);
});
