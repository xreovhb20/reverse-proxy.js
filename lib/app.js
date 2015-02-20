/**
 * Implementation of the `reverseProxy.Application` class.
 * @module app
 */
'use strict';

// Module dependencies.
var fs=require('fs');
var path=require('path');
var program=require('commander');
var Server=require('./server');
var util=require('util');

/**
 * Represents an application providing functionalities specific to console requests.
 * @class reverseProxy.Application
 * @static
 */
var Application={

  /**
   * The application settings.
   * @property _settings
   * @type Object
   * @private
   */
  _settings: {},

  /**
   * Sets an application setting to `false`.
   * @method disable
   * @param {String} name The name of the setting to disable.
   */
  disable: function(name) {
    this.set(name, false);
  },

  /**
   * Gets a value indicating whether an application setting is disabled.
   * @method disabled
   * @param {String} name The name of the setting to check.
   * @return {Boolean} `true` if the application setting with the specified name is disabled, otherwise `false`.
   */
  disabled: function(name) {
    return !this.enabled(name);
  },

  /**
   * Sets an application setting to `true`.
   * @method enable
   * @param {String} name The name of the setting to enable.
   */
  enable: function(name) {
    this.set(name, true);
  },

  /**
   * Gets a value indicating whether an application setting is enabled.
   * @method enabled
   * @param {String} name The name of the setting to check.
   * @return {Boolean} `true` if the application setting with the specified name is enabled, otherwise `false`.
   */
  enabled: function(name) {
    return Boolean(this.get(name));
  },

  /**
   * Gets the value of an application setting.
   * @method get
   * @param {String} name The name of the setting to get.
   * @return {Object} The setting value, or `null` if there is no setting with the specified name.
   */
  get: function(name) {
    return name in this._settings ? this._settings[name] : null;
  },

  /**
   * Initializes the application.
   * @method init
   */
  init: function() {
    var settings=require('../package.json');
    for(var key in settings) this.set(key, settings[key]);

    this.set('basePath', path.join(__dirname, '../..'));
    this.set('debug', ('NODE_ENV' in process.env) && process.env.NODE_ENV=='development');
    this.set('name', 'reverse-proxy');
  },

  /**
   * Runs the application.
   * @method run
   */
  run: function() {
    process.chdir(__dirname+'/..');

    // Initialize the application.
    this.init();
    process.title=this.get('name')+'.js';

    program._name=this.get('name');
    program
      .version(this.get('version'))
      .option('-p, --port <port>', 'port that the reverse proxy should run on [3000]', function(value) { return parseInt(value, 10); }, 3000)
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
    var self=this;
    this._loadConfig()
      .then(function(config) {
        // Start the server instances.
        if(!config.length) throw new Error('Unable to find any configuration for the reverse proxy.');
        return self._start(config.map(function(options) {
          return new Server(options);
        }));
      })
      .then(function() {
        // Drop privileges.
        if(program.user && ('setuid' in process)) {
          self._log('Drop user privileges to: '+program.user);
          process.setuid(program.user);
        }
      })
      .catch(function(err) {
        // Gracefully handle errors.
        console.log(err.message);
        process.exit(1);
      });
  },

  /**
   * Sets the value of an application setting.
   * @method set
   * @param {String} name The name of the setting to set.
   * @param {Object} value The new setting value. Use `undefined` to remove the setting.
   */
  set: function(name, value) {
    if(typeof value=='undefined') delete this._settings[name];
    else this._settings[name]=value;
  },

  /**
   * Loads the application configuration from the file system.
   * @method _loadConfig
   * @return {Promise} An array of objects containing the settings of one or several reverse proxy instances.
   * @async
   * @private
   */
  _loadConfig: function() {
    if(!program.config) return Promise.resolve([{
      host: program.host,
      port: program.port,
      target: program.target
    }]);

    var readdir=function(dirPath) {
      return new Promise(function(resolve, reject) {
        fs.readdir(dirPath, function(err, files) {
          if(err) reject(err);
          else resolve(files);
        });
      });
    };

    var stat=function(filePath) {
      return new Promise(function(resolve, reject) {
        fs.stat(filePath, function(err, stats) {
          if(err) reject(err);
          else resolve(stats);
        });
      });
    };

    var fullPath=path.resolve(program.config);
    return stat(fullPath)
      .then(function(stats) {
        // Build the list of files to parse.
        if(stats.isFile()) return [ fullPath ];

        if(stats.isDirectory()) return readdir(fullPath).then(function(files) {
          return files.filter(function(file) {
            return path.extname(file)=='.json';
          }).map(function(file) {
            return path.join(fullPath, file);
          });
        });

        throw new Error(util.format('No such file or directory "%s"', fullPath));
      })
      .then(function(paths) {
        // Parse the file content.
        return Promise.all(paths.map(function(file) {
          return new Promise(function(resolve, reject) {
            var options=require(file);
            if(!('host' in options)) options.host=program.host;
            if(!('port' in options)) options.port=program.port;
            if(!('router' in options) && !('target' in options))
              reject(new Error(util.format('You must provide at least a target or a router in "%s"', file)));
            else {
              if('ssl' in options) {
                if('cert' in options.ssl) options.ssl.cert=fs.readFileSync(options.ssl.cert);
                if('key' in options.ssl) options.ssl.key=fs.readFileSync(options.ssl.key);
              }

              resolve(options);
            }
          });
        }));
      });
  },

  /**
   * Prints the specified message, with a timestamp and a new line, to the standard output.
   * @method _log
   * @param {String|Function} message The message to be logged. If it's a function, the message is the result of the function call.
   * @private
   */
  _log: function(message) {
    if(!program.silent)
      console.log(util.format('[%s]', new Date().toUTCString()), typeof message=='function' ? message() : message);
  },

  /**
   * Starts the specified reverse proxy instances.
   * @method _start
   * @param {Array} servers The list of servers to start.
   * @return {Promise} Completes when all servers have been started.
   * @async
   * @private
   */
  _start: function(servers) {
    var self=this;
    return Promise.all(servers.map(function(server) {
      server.on('error', function(err) {
        self._log(util.format('ERROR - %s', err));
      });

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

      return server.listen(server.port, server.host).then(function() {
        self._log(util.format('Reverse proxy instance listening on %s:%d', server.host, server.port));
      });
    }));
  }
};

// Public interface.
module.exports=Application;
