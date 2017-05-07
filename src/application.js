import program from 'commander';
import {readFile} from 'fs';
import {safeLoadAll as loadYAML} from 'js-yaml';
import morgan from 'morgan';
import {resolve} from 'path';

import {version as pkgVersion} from '../package.json';
import {Server} from './server';


/**
 * Represents an application providing functionalities specific to console requests.
 */
export class Application {

  /**
   * The format used for logging the requests.
   * @type {string}
   */
  static get LOG_FORMAT() {
    return ':req[host] :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
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
   * Loads the application configuration from the file system.
   * @param {object} args The command line arguments.
   * @return {Promise<Array>} An array of objects containing the settings of one or several reverse proxy instances.
   */
  async loadConfig(args) {
    if (!args.config) return [{
      address: args.address,
      port: args.port,
      target: args.target
    }];

    const loadConfig = file => new Promise(resolve => readFile(file, 'utf8', (err, data) => resolve(err ? '' : data)));
    return this._parseConfig(await loadConfig(resolve(args.config)));
  }

  /**
   * Runs the application.
   * @return {Promise} Completes when the reverse proxy has been started.
   */
  async run() {
    // Parse the command line arguments.
    const format = {
      asInteger: value => parseInt(value, 10),
      asIntegerIfNumeric: value => /^\d+$/.test(value) ? parseInt(value, 10) : value
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
    try {
      let config = await this.loadConfig(program);
      if (!config.length) throw new Error('Unable to find any configuration for the reverse proxy.');

      await this.startServers(config.map(options => new Server(options)));
      if (program.user) this.setUser(program.user);
    }

    catch (err) {
      console.error(this.debug ? err.stack : err.message);
      process.exit(1);
    }

    return null;
  }

  /**
   * Sets the user identity of the application process.
   * @param {number|string} userId The user identifier.
   */
  setUser(userId) {
    if (typeof process.setuid != 'function')
      console.error('Changing the process user is not supported on this platform.');
    else {
      console.log(`Drop user privileges to "${userId}"`);
      process.setuid(userId);
    }
  }

  /**
   * Starts the specified reverse proxy instances.
   * @param {Server[]} servers The list of servers to start.
   * @return {Promise} Completes when all servers have been started.
   */
  async startServers(servers) {
    let done = () => {};
    let logger = morgan(this.debug ? 'dev' : Application.LOG_FORMAT);

    return Promise.all(servers.map(server => {
      server.on('close', () => console.log(`Reverse proxy instance on ${server.address}:${server.port} closed`));
      server.on('error', error => console.error(this.debug ? error.stack : error.message));
      server.on('listening', () => console.log(`Reverse proxy instance listening on ${server.address}:${server.port}`));
      if (!program.silent) server.on('request', (request, response) => logger(request, response, done));

      return server.listen();
    }));
  }

  /**
   * Parses the specified configuration.
   * @param {string} data A string specifying the application configuration.
   * @return {Promise<Array>} An array of objects corresponding to the parsed configuration.
   */
  async _parseConfig(data) {
    data = data.trim();
    if (!data.length) throw new Error('Invalid configuration data.');

    /* eslint-disable no-extra-parens */
    let firstChar = data[0];
    let lastChar = data[data.length - 1];
    let isJson = (firstChar == '[' && lastChar == ']') || (firstChar == '{' && lastChar == '}');
    /* eslint-enable no-extra-parens */

    let config;
    if (!isJson) {
      config = [];
      loadYAML(data, options => config.push(options));
    }
    else {
      config = JSON.parse(data);
      if (!Array.isArray(config)) config = [config];
    }

    const loadCert = file => new Promise((resolve, reject) => readFile(file, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    }));

    for (let options of config) {
      if (!('routes' in options) && !('target' in options))
        throw new Error('You must provide at least a target or a routing table.');

      if (!('address' in options)) options.address = program.address;
      if (!('port' in options)) options.port = program.port;

      if ('ssl' in options) {
        let keys = ['ca', 'cert', 'key', 'pfx'].filter(cert => cert in options.ssl);
        let certs = await Promise.all(keys.map(cert => loadCert(options.ssl[cert])));
        for (let i = 0; i < keys.length; i++) options.ssl[keys[i]] = certs[i];
      }
    }

    return config;
  }
}
