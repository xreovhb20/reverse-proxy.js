'use strict';

const program = require('commander');
const {readFile} = require('fs');
const {safeLoadAll: loadYAML} = require('js-yaml');
const morgan = require('morgan');
const {Observable} = require('rxjs');

const {version: pkgVersion} = require('../package.json');
const {Server} = require('./server');

/**
 * Represents an application providing functionalities specific to console requests.
 */
exports.Application = class Application {

  /**
   * The format used for logging the requests.
   * @type {string}
   */
  static get LOG_FORMAT() {
    return ':req[host] :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
  }

  /**
   * Initializes a new instance of the class.
   */
  constructor() {

    /**
     * The proxy servers managed by this application.
     * @type {Server[]}
     */
    this.servers = [];
  }

  /**
   * Value indicating whether the application runs in debug mode.
   * @type {boolean}
   */
  get debug() {
    return ['development', 'test'].includes(this.env);
  }

  /**
   * The application environment.
   * @type {string}
   */
  get env() {
    return 'NODE_ENV' in process.env ? process.env.NODE_ENV : 'development';
  }

  /**
   * Initializes the application.
   * @param {object} [args] The command line arguments.
   * @return {Observable} Completes when the initialization is over.
   */
  init(args = {}) {
    let observable;
    if (typeof args.config == 'string') {
      const loadConfig = Observable.bindNodeCallback(readFile);
      observable = loadConfig(args.config, 'utf8').mergeMap(data => this._parseConfig(data));
    }
    else observable = Observable.of([new Server({
      address: args.address,
      port: args.port,
      target: args.target
    })]);

    return observable.map(servers => this.servers = servers);
  }

  /**
   * Runs the application.
   * @return {Observable} Completes when the reverse proxy has been started.
   */
  run() {
    // Parse the command line arguments.
    const format = {
      asInteger: value => Number.parseInt(value, 10),
      asIntegerIfNumeric: value => /^\d+$/.test(value) ? Number.parseInt(value, 10) : value
    };

    program._name = 'reverse-proxy';
    program
      .description('Simple reverse proxy server supporting WebSockets.')
      .version(pkgVersion, '-v, --version')
      .option('-a, --address <address>', `address that the reverse proxy should run on [${Server.DEFAULT_ADDRESS}]`, Server.DEFAULT_ADDRESS)
      .option('-p, --port <port>', `port that the reverse proxy should run on [${Server.DEFAULT_PORT}]`, format.asInteger, Server.DEFAULT_PORT)
      .option('-t, --target <target>', 'location of the server the proxy will target', format.asIntegerIfNumeric)
      .option('-c, --config <path>', 'location of the configuration file for the reverse proxy')
      .option('-u, --user <user>', 'user to drop privileges to once server socket is bound', format.asIntegerIfNumeric)
      .option('--silent', 'silence the log output from the reverse proxy');

    program.parse(process.argv);
    if (!program.config && !program.target) program.help();

    // Start the proxy server.
    return this.init(program)
      .mergeMap(() => {
        if (!this.servers.length) return Observable.throw(new Error('Unable to find any configuration for the reverse proxy.'));
        return this._startServers();
      })
      .do({complete: () => {
        if (program.user) this._setUser(program.user);
      }});
  }

  /**
   * Parses the specified configuration.
   * @param {string} data A string specifying the application configuration.
   * @return {Observable<Server[]>} The server instances corresponding to the parsed configuration.
   */
  _parseConfig(data) {
    data = data.trim();
    if (!data.length) return Observable.throw(new Error('Invalid configuration data.'));

    /* eslint-disable no-extra-parens */
    let config;
    let firstChar = data[0];
    let lastChar = data[data.length - 1];
    let isJson = (firstChar == '[' && lastChar == ']') || (firstChar == '{' && lastChar == '}');
    /* eslint-enable no-extra-parens */

    try {
      if (!isJson) {
        config = [];
        loadYAML(data, options => config.push(options));
      }
      else {
        config = JSON.parse(data);
        if (!Array.isArray(config)) config = [config];
      }

      if (!config.every(value => typeof value == 'object' && value))
        throw new Error('Invalid configuration format.');
    }

    catch (err) {
      return Observable.throw(err);
    }

    const loadCert = Observable.bindNodeCallback(readFile);
    return Observable.from(config).mergeMap(options => {
      if (!('routes' in options) && !('target' in options))
        return Observable.throw(new Error('You must provide at least a target or a routing table.'));

      if (!('address' in options)) options.address = program.address;
      if (!('port' in options)) options.port = program.port;
      if (!('ssl' in options)) return Observable.of(new Server(options));

      let keys = ['ca', 'cert', 'key', 'pfx'].filter(key => key in options.ssl);
      let observables = keys.map(key => loadCert(options.ssl[key]));
      return Observable.zip(...observables)
        .do(certs => { for (let i = 0; i < keys.length; i++) options.ssl[keys[i]] = certs[i]; })
        .map(() => new Server(options));
    }).toArray();
  }

  /**
   * Sets the user identity of the application process.
   * @param {number|string} userId The user identifier.
   */
  _setUser(userId) {
    if (typeof process.setuid != 'function')
      console.error('Changing the process user is not supported on this platform.');
    else {
      console.log(`Drop user privileges to "${userId}"`);
      process.setuid(userId);
    }
  }

  /**
   * Starts the reverse proxy instances.
   * @return {Observable} Completes when all servers have been started.
   */
  _startServers() {
    let done = () => {};
    let logger = morgan(this.debug ? 'dev' : Application.LOG_FORMAT);

    return Observable.merge(...this.servers.map(server => {
      server.onClose.subscribe(() => console.log(`Reverse proxy instance on ${server.address}:${server.port} closed`));
      server.onError.subscribe(error => console.error(this.debug ? error : error.message));
      server.onListening.subscribe(() => console.log(`Reverse proxy instance listening on ${server.address}:${server.port}`));
      if (!program.silent) server.onRequest.subscribe(({request, response}) => logger(request, response, done));

      return server.listen();
    }));
  }
};
