#!/usr/bin/env node
/* global cd, config, echo, exec, target */

/**
 * Build system.
 * @module bin.make
 */
'use strict';

// Module dependencies.
require('shelljs/make');

/**
 * Provides tasks for [ShellJS](http://shelljs.org) make tool.
 * @class cli.Makefile
 * @static
 */
cd(__dirname+'/..');

/**
 * The application settings.
 * @property config
 * @type Object
 */
config.fatal=true;

/**
 * Runs the default tasks.
 * @method all
 */
target.all=function() {
  echo('Please specify a target. Available targets:');
  for(var task in target) {
    if(task!='all') echo(' ', task);
  }
};

/**
 * Builds the documentation.
 * @method doc
 */
target.doc=function() {
  echo('Build the documentation...');
  exec('docgen');
};

/**
 * Performs static analysis of source code.
 * @method lint
 */
target.lint=function() {
  config.fatal=false;

  echo('Static analysis of source code...');
  exec('jshint --verbose bin lib');

  echo('Static analysis of documentation comments...');
  exec('docgen --lint');

  config.fatal=true;
};

/**
 * Watches for file changes.
 * @method watch
 */
target.watch=function() {
  var nodemon=require('nodemon');
  nodemon({
    args: [ '--config', 'etc' ],
    ext: 'js json',
    script: 'bin/cli.js',
    watch: [ 'etc', 'lib' ]
  });

  nodemon.on('restart', function(files) {
    echo('Change:', Array.isArray(files) ? files : 'manual restarting.');
  });
};
