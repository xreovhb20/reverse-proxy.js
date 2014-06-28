/**
 * Command line interface.
 * @module cli
 */
'use strict';

// Module dependencies.
var fs=require('fs');
var path=require('path');
var program=require('commander');
var reverseProxy=require('../index');
var util=require('util');
var when=require('when');

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
   * Value indicating whether to silence the log output from the reverse proxy.
   * @property silenceOutput
   * @type Boolean
   */
  silenceOutput: false,

  /**
   * Runs the application.
   * @method run
   * @param {Array} [args] The command line arguments.
   */
  run: function() {
    process.chdir(__dirname+'/..');
    process.title=this.name+'.js';

    var servers=[];
    try {
      // Parse command line arguments.
      program._name=this.name;
      program
        .version(require('../package.json').version)
        .option('-p, --port <port>', 'port that the reverse proxy should run on [80]', function(value) { return parseInt(value, 10); }, 80)
        .option('-h, --host <host>', 'hostname that the reverse proxy should run on [127.0.0.1]', '127.0.0.1')
        .option('-t, --target <target>', 'location of the server the proxy will target', function(value) {
          return /^\d+$/.test(value) ? parseInt(value, 10) : value;
        })
        .option('-c, --config <path>', 'location of the configuration file(s) for the reverse proxy')
        .option('--silent', 'silence the log output from the reverse proxy')
        .option('-u, --user <user>', 'user to drop privileges to once server socket is bound')
        .parse(process.argv);

      if(!program.config && !program.target) throw new Error('You must provide at least a target or a configuration file.');
      this.silenceOutput=program.silent;

      // Parse reverse proxy configuration.
      var config=this._loadConfig();
      if(!config.length) throw new Error('Unable to find any configuration for the reverse proxy.');

      config.forEach(function(options) {
        servers.push(new reverseProxy.Server(options));
      });
    }

    catch(err) {
      console.log('\n  ERROR: %s', err.message);
      program.help();
    }

    // Start the reverse proxy instances.
    var self=this;
    var promises=servers.map(function(server) {
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

      var deferred=when.defer();
      server.listen(function() {
        self._log(util.format('Reverse proxy instance listening on %s:%d', server.host, server.port));
        deferred.resolve();
      });

      return deferred.promise;
    });

    // Drop privileges.
    when.all(promises).then(function() {
      if(program.user) {
        self._log('Drop user privileges to: '+program.user);
        process.setuid(program.user);
      }
    });
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
   * @param {String|Function} message The message to be logged. If it's a function, the message is the result of the function call.
   * @private
   */
  _log: function(message) {
    if(!this.silenceOutput) console.log('[%s] %s', new Date().toUTCString(), message instanceof Function ? message() : message);
  }
};

// Public interface.
if(module===require.main) Application.run();
else module.exports=Application;
