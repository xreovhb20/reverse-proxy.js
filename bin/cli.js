#!/usr/bin/env node

/**
 * Command line interface.
 * @module cli
 */
'use strict';

// Module dependencies.
var async=require('async');
var fs=require('fs');
var path=require('path');
var program=require('commander');
var reverseProxy=require('../index');
var util=require('util');

/**
 * Represents an application providing functionalities specific to console requests.
 * @class Application
 * @static
 */
var Application={

  /**
   * The application name.
   * @property name
   * @type String
   */
  name: 'reverse-proxy',

  /**
   * Runs the application.
   * @method run
   * @param {Array} [args] The command line arguments.
   */
  run: function() {
    process.chdir(__dirname+'/..');
    process.title=this.name+'.js';

    // Parse command line arguments.
    program._name=this.name;
    program
      .version(require('../package.json').version)
      .option('-p, --port <port>', 'port that the reverse proxy should run on [80]', function(value) { return parseInt(value, 10); }, 80)
      .option('-h, --host <host>', 'host that the reverse proxy should run on [0.0.0.0]', '0.0.0.0')
      .option('-t, --target <target>', 'location of the server the proxy will target', function(value) {
        return /^\d+$/.test(value) ? parseInt(value, 10) : value;
      })
      .option('-c, --config <path>', 'location of the configuration file(s) for the reverse proxy')
      .option('--silent', 'silence the log output from the reverse proxy')
      .option('-u, --user <user>', 'user to drop privileges to once server socket is bound')
      .parse(process.argv);

    if(!program.config && !program.target) program.help();

    // Parse reverse proxy configuration.
    var servers=[];
    try {
      var config=this._loadConfig();
      if(!config.length) throw new Error('Unable to find any configuration for the reverse proxy.');
      config.forEach(function(options) {
        servers.push(new reverseProxy.Server(options));
      });
    }

    catch(err) {
      console.log(err.message);
      process.exit(1);
    }

    // Start the reverse proxy instances.
    var self=this;
    async.each(
      servers,
      function(server, callback) {
        server.on('request', function(req) {
          self._log(util.format(
            '%s - %s - "%s %s HTTP/%s" "%s"',
            req.connection.remoteAddress,
            req.headers.host,
            req.method,
            req.url,
            req.httpVersion,
            req.headers['user-agent']
          ));
        });

        server.listen(function() {
          self._log(util.format('Reverse proxy instance listening on %s:%d', server.host, server.port));
          callback();
        });
      },
      function(err) {
        if(err) {
          console.log(err.message);
          process.exit(2);
        }

        // Drop privileges.
        if(program.user && ('setuid' in process)) {
          self._log('Drop user privileges to: '+program.user);
          process.setuid(program.user);
        }
      }
    );
  },

  /**
   * TODO Loads the configuration of the specified application from the file system.
   * @method _loadConfig
   * @return {Array} An array of objects containing the configuration of one or several reverse proxy instances.
   * @private
   */
  _loadConfig: function() {
    if(!program.config) return [ {
      host: program.host,
      port: program.port,
      target: program.target
    } ];

    var fullPath=path.resolve(program.config);
    var stats=fs.statSync(fullPath);
    if(!stats.isDirectory() && !stats.isFile()) throw new Error(util.format('No such file or directory "%s"', fullPath));

    var paths=(
      stats.isFile() ?
      [ fullPath ] :
      fs.readdirSync(fullPath).map(function(file) {
        return path.join(fullPath, file);
      })
    );

    var config=[];
    paths.forEach(function(file) {
      if(path.extname(file)!='.json') return;

      var options=require(file);
      if(!('host' in options)) options.host=program.host;
      if(!('port' in options)) options.port=program.port;
      if(!('router' in options) && !('target' in options)) throw new Error(util.format('You must provide at least a target or a router in "%s"', file));

      if('ssl' in options) {
        if('cert' in options.ssl) options.ssl.cert=fs.readFileSync(options.ssl.cert);
        if('key' in options.ssl) options.ssl.key=fs.readFileSync(options.ssl.key);
      }

      config.push(options);
    });

    return config;
  },

  /**
   * Prints the specified message, with a timestamp and a new line, to the standard output.
   * @method _log
   * @param {String|Function} message The message to be logged. If it's a function, the message is the result of the function call.
   * @private
   */
  _log: function(message) {
    if(!program.silent) console.log('[%s] %s', new Date().toUTCString(), message instanceof Function ? message() : message);
  }
};

// Public interface.
if(module===require.main) Application.run();
else module.exports=Application;
