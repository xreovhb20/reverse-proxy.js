#!/usr/bin/env node
process.title = 'Reverse-Proxy.js';

const {Application} = require('../lib');
global.app = new Application();
global.app.run();
