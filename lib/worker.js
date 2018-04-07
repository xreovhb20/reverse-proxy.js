'use strict';

const cluster = require('cluster');
const {Server} = require('./server.js');

/**
 * Contains all public information and methods about a request worker.
 */
class Worker {

  /**
   * Creates a new worker.
   */
  constructor() {

    /**
     * The proxy servers managed by this worker.
     * @type {Server[]}
     */
    this._servers = [];
  }

  /**
   * The class name.
   * @type {string}
   */
  get [Symbol.toStringTag]() {
    return 'Worker';
  }

  /**
   * Terminates the worker.
   * @return {Promise} Completes when all the servers are closed.
   */
  async end() {
    return Promise.all(this._servers.map(server => server.close()));
  }

  /**
   * Runs the worker.
   * @param {object[]} servers The settings of the servers managed by this worker.
   * @return {Promise} Completes when all the servers are listening.
   */
  async run(servers) {
    this._servers = servers.map(options => new Server(options));

    let console = global.$app.logger;
    let id = cluster.worker.id;

    return Promise.all(this._servers.map(server => server
      .on('close', () => console.log(`#${id}: ${server.address}:${server.port} closed`))
      .on('error', err => console.error(`#${id}: ${global.$app.debug ? err : err.message}`))
      .on('listening', () => console.log(`#${id}: listening on ${server.address}:${server.port}`))
      .on('request', (request, response) => console.log(`#${id}: TODO ${request}, ${response}`)) // TODO format response
      .listen()
    ));
  }
}

// Module exports.
exports.Worker = Worker;
