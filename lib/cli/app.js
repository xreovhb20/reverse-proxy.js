/**
 * @module cli
 * @submodule app
 */
'use strict';

// Module dependencies.
var fs=require('fs');
var path=require('path');
var program=require('commander');
var reverseProxy=require('../core');
var util=require('util');

/**
 * Represents an application providing functionalities specific to console requests.
 * @class Application
 * @static
 */
var Application={

  /**
   * The application name.
   * @property NAME
   * @type String
   * @final
   */
  NAME: 'reverse-proxy',

  /**
   * Value indicating whether to silence the log output from the reverse proxy.
   * @property silenceOutput
   * @type Boolean
   */
  silenceOutput: false,

  /**
   * Runs the application.
   * @method run
   */
  run: function() {
    process.chdir(__dirname+'/../..');
    process.title=this.NAME+'.js';

    try {
      // Parse command line arguments.
      program._name=this.NAME;
      program
        .version(require('../../package.json').version)
        .option('-p, --port <port>', 'port that the reverse proxy should run on (defaults to 80)', function(value) { return parseInt(value, 10); }, 80)
        .option('-h, --host <host>', 'hostname that the reverse proxy should run on (defaults to "127.0.0.1")', '127.0.0.1')
        .option('-t, --target <target>', 'location of the server the proxy will target')
        .option('-c, --config <path>', 'location of the configuration file(s) for the reverse proxy (overrides other options)')
        .option('--silent', 'silence the log output from the reverse proxy')
        .option('-u, --user <user>', 'user to drop privileges to once server socket is bound')
        .parse(process.argv);

      if(!program.config && !program.target) throw new Error('You must provide at least a target or a configuration file.');
      this.silenceOutput=program.silent;

      // Start the reverse proxy instances.
      var config=this._loadConfig();
      if(!config.length) throw new Error('Unable to find any configuration for the reverse proxy.');

      var self=this;
      config.forEach(function(options) {
        var server=new reverseProxy.Server(options);
        console.dir(server);
        server.on('request', function(req, res) {
          self._log(util.format(
            '%s - %s - "%s %s HTTP/%s" %d %d "%s" "%s"',
            req.connection.remoteAddress,
            req.headers['host'],
            req.method,
            req.url,
            req.httpVersion,
            res.statusCode,
            req.client.bytesRead,
            req.headers['referer'],
            req.headers['user-agent']
          ));
        });

        return; // TODO

        server.listen(options.port, options.host, function() {
          self._log(util.format('Reverse proxy instance listening on %s:%d', options.host, options.port));
        });
      });
    }

    catch(err) {
      console.log('\n  ERROR: %s', err.message);
      program.help();
    }
  },

  /**
   * TODO Loads the configuration of the specified application from the file system.
   * @method _loadConfig
   * @return {Array} An array of objects containing the configuration of one or several reverse proxy instances.
   * @private
   */
  _loadConfig: function() {
    if(!program.config) return [ {
      host: program.host ? program.host : '127.0.0.1',
      port: program.port ? program.port : 80,
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
      if(!('host' in options)) options.host=(program.host ? program.host : '127.0.0.1');
      if(!('port' in options)) options.port=(program.port ? program.port : 80);
      if(!('router' in options) && !('target' in options)) throw new Error(util.format('You must provide at least a target or a router in "%s"', file));

      config.push(options);
    });

    return config;
  },

  /**
   * Prints the specified message, with a timestamp and a new line, to the standard output.
   * @method _log
   * @param {String} message The message to be logged.
   * @private
   */
  _log: function(message) {
    if(!this.silenceOutput) console.log('[%s] %s', new Date().toUTCString(), message);
  }
};

// Public interface.
module.exports=Application;
