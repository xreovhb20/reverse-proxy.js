import fs from 'fs';
import {Observable} from 'rxjs';
import path from 'path';
import * as pkg from '../package.json';
import program from 'commander';
import {Server} from './server';
import yaml from 'js-yaml';

/**
 * Represents an application providing functionalities specific to console requests.
 */
export class Application {

  /**
   * Value indicating whether the application runs in debug mode.
   * @type {boolean}
   */
  get debug() {
    return this.env == 'development' || this.env == 'test';
  }

  /**
   * The application environment.
   * @type {string}
   */
  get env() {
    return 'NODE_ENV' in process.env ? process.env.NODE_ENV : 'production';
  }

  /**
   * Loads the application configuration from the file system.
   * @param {object} args The command line arguments.
   * @return {Observable<Array>} An array of objects containing the settings of one or several reverse proxy instances.
   */
  loadConfig(args) {
    if (!args.config) return Observable.of([{
      address: args.address,
      port: args.port,
      target: args.target
    }]);

    let readFile = Observable.bindNodeCallback(fs.readFile);
    return readFile(path.resolve(args.config), 'utf8').flatMap(data => this._parseConfig(data));
  }

  /**
   * Prints the specified message, with a timestamp and a new line, to the standard output.
   * @param {string|function} message The message to be logged. If it's a function, the message is the result of the function call.
   */
  log(message) {
    if (!program.silent) {
      let now = new Date().toUTCString();
      let text = typeof message == 'function' ? message() : message;
      console.log(`[${now}] ${text}`);
    }
  }

  /**
   * Runs the application.
   */
  run() {
    // Parse the command line arguments.
    const format = {
      asInteger: value => parseInt(value, 10),
      asIntegerIfNumeric: value => /^\d+$/.test(value) ? parseInt(value, 10) : value
    };

    program._name = 'reverse-proxy';
    program
      .version(pkg.version, '-v, --version')
      .option('-a, --address <address>', `address that the reverse proxy should run on [${Server.DEFAULT_ADDRESS}]`, Server.DEFAULT_ADDRESS)
      .option('-p, --port <port>', `port that the reverse proxy should run on [${Server.DEFAULT_PORT}]`, format.asInteger, Server.DEFAULT_PORT)
      .option('-t, --target <target>', 'location of the server the proxy will target', format.asIntegerIfNumeric)
      .option('-c, --config <path>', 'location of the configuration file for the reverse proxy')
      .option('-u, --user <user>', 'user to drop privileges to once server socket is bound', format.asIntegerIfNumeric)
      .option('--silent', 'silence the log output from the reverse proxy');

    program.parse(process.argv);
    if (!program.config && !program.target) program.help();

    // Start the proxy server.
    this.loadConfig(program)
      .map(config => {
        if (!config.length) throw new Error('Unable to find any configuration for the reverse proxy.');
        return config.map(options => new Server(options));
      })
      .flatMap(servers => this.startServers(servers))
      .subscribe({
        complete: () => {
          if (program.user) this.setUser(program.user);
        },
        error: err => {
          console.error(this.debug ? err.stack : err.message);
          process.exit(1);
        }
      });
  }

  /**
   * Sets the user identity of the application process.
   * @param {number|string} userId The user identifier.
   */
  setUser(userId) {
    if (typeof process.setuid != 'function') this.log('Changing the process user is not supported on this platform.');
    else {
      this.log(`Drop user privileges to: ${userId}`);
      process.setuid(userId);
    }
  }

  /**
   * Starts the specified reverse proxy instances.
   * @param {Server[]} servers The list of servers to start.
   * @return {Observable} Completes when all servers have been started.
   */
  startServers(servers) {
    return Observable.merge(...servers.map(server => {
      server.onClose.subscribe(() => this.log(`Reverse proxy instance on ${server.address}:${server.port} closed`));
      server.onError.subscribe(err => this.log(this.debug ? err.stack : err.message));
      server.onListen.subscribe(() => this.log(`Reverse proxy instance listening on ${server.address}:${server.port}`));

      server.onRequest.subscribe(req => {
        let ipAddress = req.connection.remoteAddress;
        let userAgent = req.headers['user-agent'];
        this.log(`${ipAddress} - ${req.headers.host} - "${req.method} ${req.url} HTTP/${req.httpVersion}" "${userAgent}"`);
      });

      return server.listen();
    }));
  }

  /**
   * Parses the specified configuration.
   * @param {string} data A string specifying the application configuration.
   * @return {Observable<Array>} An array of objects corresponding to the parsed configuration.
   */
  _parseConfig(data) {
    data = data.trim();
    if (!data.length) return Observable.throw(new Error('Invalid configuration data.'));

    return new Observable(observer => {
      let config = [];
      let parser = options => {
        if (!('routes' in options) && !('target' in options))
          throw new Error('You must provide at least a target or a route table.');

        if (!('address' in options)) options.address = program.address;
        if (!('port' in options)) options.port = program.port;

        if ('ssl' in options) {
          /* eslint-disable no-sync */
          if ('ca' in options.ssl) options.ssl.ca = fs.readFileSync(options.ssl.ca);
          if ('cert' in options.ssl) options.ssl.cert = fs.readFileSync(options.ssl.cert);
          if ('key' in options.ssl) options.ssl.key = fs.readFileSync(options.ssl.key);
          if ('pfx' in options.ssl) options.ssl.pfx = fs.readFileSync(options.ssl.pfx);
          /* eslint-enable no-sync */
        }

        config.push(options);
      };

      try {
        let firstChar = data[0];
        let lastChar = data[data.length - 1];

        let isJson = (firstChar == '[' || firstChar == '{') && (lastChar == ']' || lastChar == '}');
        if (!isJson) yaml.safeLoadAll(data, parser);
        else {
          let options = JSON.parse(data);
          if (!Array.isArray(options)) options = [options];
          options.forEach(parser);
        }

        observer.next(config);
        observer.complete();
      }

      catch (err) {
        observer.error(err);
      }
    });
  }
}
