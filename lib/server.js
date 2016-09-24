/**
 * Implementation of the `reverseProxy.Server` class.
 * @module server
 */
const {EventEmitter} = require('events');
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');

/**
 * Acts as an intermediary for requests from clients seeking resources from other servers.
 * @augments events.EventEmitter
 */
module.exports = class Server extends EventEmitter {

  /**
   * Emitted when the server closes.
   * @event close
   */

  /**
   * Emitted each time the server experiences an error.
   * @event error
   * @type {Error}
   */

  /**
   * Emitted when the server has been bound after calling `listen` method.
   * @event listening
   */

  /**
   * Emitted each time there is a request.
   * @event request
   * @type {http.IncomingMessage}
   */

  /**
   * Initializes a new instance of the class.
   * @param {object} [options] An object specifying the server settings.
   */
  constructor(options = {}) {
    super();

    /**
     * The underlying HTTP(S) service listening for requests.
     * @type {(http.Server|https.Server)}
     * @private
     */
    this._httpService = null;

    /**
     * The server settings.
     * @type {object}
     * @private
     */
    this._options = options;
    if(!('routes' in this._options)) this._options.routes = {};
    if('target' in this._options) this._options.routes['*'] = this._options.target;

    /**
     * The underlying proxy service providing custom application logic.
     * @type {httpProxy.Server}
     * @private
     */
    this._proxyService = httpProxy.createProxyServer(this._options.proxy || {});
    this._proxyService.on('error', this._handleError.bind(this));

    // Normalize the routing table.
    let routes = this._options.routes;
    for(let host in routes) {
      let target = routes[host];
      if(typeof target == 'number') routes[host] = `http://127.0.0.1:${target}`;
      else if(!/^https?:/i.test(target)) routes[host] = `http://${target}`;
    }
  }

  /**
   * The default address that the server is listening on.
   * @type {string}
   * @readonly
   */
  static get DEFAULT_ADDRESS() {
    return '0.0.0.0';
  }

  /**
   * The default port that the server is listening on.
   * @type {number}
   * @readonly
   */
  static get DEFAULT_PORT() {
    return 3000;
  }

  /**
   * The address that the server is listening on.
   * @type {string}
   * @readonly
   */
  get address() {
    return typeof this._options.address == 'string' ? this._options.address : Server.DEFAULT_ADDRESS;
  }

  /**
   * The port that the server is listening on.
   * @type {number}
   * @readonly
   */
  get port() {
    return typeof this._options.port == 'number' ? this._options.port : Server.DEFAULT_PORT;
  }

  /**
   * Stops the server from accepting new connections.
   * @returns {Promise} Completes when the server is finally closed.
   */
  close() {
    if(!this._httpService) return Promise.reject(new Error('The server is not started.'));

    return new Promise(resolve => this._httpService.close(() => {
      this._httpService = null;
      this.emit('close');
      resolve();
    }));
  }

  /**
   * Begin accepting connections.
   * @param {number} [port] The port that the server should run on.
   * @param {string} [address] The address that the server should run on.
   * @returns {Promise} Completes when the server has been started.
   */
  listen(port = -1, address = '') {
    if(this._httpService) return Promise.reject(new Error('The server is already started.'));

    this._httpService =
      'ssl' in this._options ?
      https.createServer(this._options.ssl, this._handleHTTPRequest.bind(this)) :
      http.createServer(this._handleHTTPRequest.bind(this));

    this._httpService.on('error', err => this.emit('error', err));
    this._httpService.on('upgrade', this._handleWebSocketRequest.bind(this));

    return new Promise(resolve => this._httpService.listen(port > 0 ? port : this.port, address.length ? address : this.address, () => {
      let socket = this._httpService.address();
      this._options.address = socket.address;
      this._options.port = socket.port;

      this.emit('listening');
      resolve();
    }));
  }

  /**
   * Gets the host name contained in the headers of the specified request.
   * @param {http.IncomingMessage} req The request sent by the client.
   * @returns {string} The host name provided by the specified request, or `*` if the host name could not be determined.
   * @private
   */
  _getHostName(req) {
    if(!('Host' in req.headers)) return '*';

    let headers = req.headers;
    let index = headers['Host'].indexOf(':');
    return index < 0 ? headers['Host']: headers['Host'].substr(0, index);
  }

  /**
   * Handles the error emitted if a request to a target fails.
   * @param {Error} err The emitted error event.
   * @param {http.IncomingMessage} req The request sent by the client.
   * @param {http.ServerResponse} res The response sent by the server.
   * @private
   */
  _handleError(err, req, res) {
    this.emit('error', err);
    this._sendStatus(res, 502);
  }

  /**
   * Handles an HTTP request to a target.
   * @param {http.IncomingMessage} req The request sent by the client.
   * @param {http.ServerResponse} res The response sent by the server.
   * @private
   */
  _handleHTTPRequest(req, res) {
    this.emit('request', req);

    let hostName = this._getHostName(req);
    let host = hostName in this._options.routes ? hostName : '*';

    if(host in this._options.routes) this._proxyService.web(req, res, {target: this._options.routes[host]});
    else this._sendStatus(res, 404);
  }

  /**
   * Handles a WebSocket request to a target.
   * @param {http.IncomingMessage} req The request sent by the client.
   * @param {net.Socket} socket The network socket between the server and client.
   * @param {Buffer} head The first packet of the upgraded stream.
   * @private
   */
  _handleWebSocketRequest(req, socket, head) {
    let hostName = this._getHostName(req);
    let host = hostName in this._options.routes ? hostName : '*';
    if(host in this._options.routes) this._proxyService.ws(req, socket, head, {target: this._options.routes[host]});
  }

  /**
   * Sends an HTTP status code and terminates the specified server response.
   * @param {http.ServerResponse} res The server response.
   * @param {number} statusCode The HTTP status code to send.
   * @private
   */
  _sendStatus(res, statusCode) {
    let message = http.STATUS_CODES[statusCode];
    res.writeHead(statusCode, {
      'content-length': Buffer.byteLength(message),
      'content-type': 'text/plain'
    });

    res.end(message);
  }
};
