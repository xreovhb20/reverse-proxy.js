#!/usr/bin/env node
process.title = 'reverse-proxy';

const {Application} = require('../lib');
global.app = new Application();
global.app.run();
