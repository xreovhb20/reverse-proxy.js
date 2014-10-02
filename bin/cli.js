#!/usr/bin/env node

/**
 * Command line interface.
 * @module bin.cli
 */
'use strict';

// Module dependencies.
var Application=require('../lib/app');

// Public interface.
if(module===require.main) Application.run();
else module.exports=Application;
