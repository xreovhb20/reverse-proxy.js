'use strict';

const {createServer, STATUS_CODES} = require('http');
const {createServer: createSecureServer} = require('https');
const {createProxyServer} = require('http-proxy');
const {Observable, Subject} = require('rxjs');

/**
 * Acts as an intermediary for requests from clients seeking resources from other servers.
 */
exports.Server = class Server {

  /**
   * The default address that the server is listening on.
   * @type {string}
   */
  static get DEFAULT_ADDRESS() {
    return '0.0.0.0';
  }

  /**
   * The default port that the server is listening on.
   * @type {number}
   */
  static get DEFAULT_PORT() {
    return 3000;
  }

  /**
   * Initializes a new instance of the class.
   * @param {object} [options] An object specifying the server settings.
   */
  constructor(options = {}) {

    /**
     * The routing table.
     * @type {Map}
     */
    this.routes = new Map;
    if ('routes' in options) for (let [host, route] of Object.entries(options.routes)) this.routes.set(host, this._normalizeRoute(route));
    if ('target' in options) this.routes.set('*', this._normalizeRoute(options.target));

    /**
     * The underlying HTTP(S) service listening for requests.
     * @type {http~Server|https~Server}
     */
    this._httpService = null;

    /**
     * The handler of "close" events.
     * @type {Subject}
     */
    this._onClose = new Subject;

    /**
     * The handler of "error" events.
     * @type {Subject<Error>}
     */
    this._onError = new Subject;

    /**
     * The handler of "listening" events.
     * @type {Subject}
     */
    this._onListening = new Subject;

    /**
     * The handler of "request" events.
     * @type {Subject<object>}
     */
    this._onRequest = new Subject;

    /**
     * The server settings.
     * @type {object}
     */
    this._options = {
      address: typeof options.address == 'string' ? options.address : Server.DEFAULT_ADDRESS,
      port: Number.isInteger(options.port) ? options.port : Server.DEFAULT_PORT,
      proxy: typeof options.proxy == 'object' && options.proxy ? options.proxy : null,
      ssl: typeof options.ssl == 'object' && options.ssl ? options.ssl : null
    };

    /**
     * The underlying proxy service providing custom application logic.
     * @type {ProxyServer}
     */
    this._proxyService = null;
  }

  /**
   * The class name.
   * @type {string}
   */
  get [Symbol.toStringTag]() {
    return 'Server';
  }

  /**
   * The address that the server is listening on.
   * @type {string}
   */
  get address() {
    return this.listening ? this._httpService.address().address : this._options.address;
  }

  /**
   * Value indicating whether the server is currently listening.
   * @type {boolean}
   */
  get listening() {
    return Boolean(this._httpService && this._httpService.listening);
  }

  /**
   * The stream of "close" events.
   * @type {Observable}
   */
  get onClose() {
    return this._onClose.asObservable();
  }

  /**
   * The stream of "error" events.
   * @type {Observable<Error>}
   */
  get onError() {
    return this._onError.asObservable();
  }

  /**
   * The stream of "listening" events.
   * @type {Observable}
   */
  get onListening() {
    return this._onListening.asObservable();
  }

  /**
   * The stream of "request" events.
   * @type {Observable<object>}
   */
  get onRequest() {
    return this._onRequest.asObservable();
  }

  /**
   * The port that the server is listening on.
   * @type {number}
   */
  get port() {
    return this.listening ? this._httpService.address().port : this._options.port;
  }

  /**
   * Stops the server from accepting new connections. It does nothing if the server is already closed.
   * @return {Observable} Completes when the server is finally closed.
   * @emits {*} The "close" event.
   */
  close() {
    if (!this.listening) return Observable.of(null);

    const close = Observable.bindCallback(this._httpService.close.bind(this._httpService));
    return close().do(() => {
      this._httpService = null;
      this._proxyService = null;
      this._onClose.next();
    });
  }

  /**
   * Begin accepting connections. It does nothing if the server is already started.
   * @param {number} [port] The port that the server should run on.
   * @param {string} [address] The address that the server should run on.
   * @return {Observable<number>} The port that the server is running on.
   * @emits {*} The "listening" event.
   */
  listen(port = this.port, address = this.address) {
    if (this.listening) return Observable.of(this.port);

    let requestHandler = this._onHTTPRequest.bind(this);
    this._httpService = this._options.ssl ? createSecureServer(this._options.ssl, requestHandler) : createServer(requestHandler);
    this._httpService.on('error', error => this._onError.next(error));
    this._httpService.on('upgrade', this._onWSRequest.bind(this));

    this._proxyService = createProxyServer(this._options.proxy);
    this._proxyService.on('error', this._onRequestError.bind(this));

    const listen = Observable.bindCallback(this._httpService.listen.bind(this._httpService));
    return listen(port, address).map(() => {
      this._onListening.next();
      return this.port;
    });
  }

  /**
   * Gets the host name contained in the headers of the specified request.
   * @param {http~IncomingMessage} request The request sent by the client.
   * @return {string} The host name provided by the specified request, or `*` if the host name could not be determined.
   */
  _getHostname(request) {
    let headers = request.headers;
    if (!('host' in headers)) return '*';

    let index = headers.host.indexOf(':');
    return index < 0 ? headers.host : headers.host.substr(0, index);
  }

  /**
   * Normalizes the specified route.
   * @param {*} route The route to normalize.
   * @return {object} The normalized route.
   * @throws {Error} The route has an invalid format.
   */
  _normalizeRoute(route) {
    if (typeof route != 'object' || !route) route = {uri: route};

    switch (typeof route.uri) {
      case 'number':
        route.uri = `http://127.0.0.1:${route.uri}`;
        break;

      case 'string':
        if (!/^https?:/i.test(route.uri)) route.uri = `http://${route.uri}`;
        break;

      default:
        throw new Error('The route has an invalid format.');
    }

    if (typeof route.headers != 'object' || !route.headers) route.headers = {};
    else {
      let map = {};
      for (let [key, value] of Object.entries(route.headers)) map[key.toLowerCase()] = value;
      route.headers = map;
    }

    return route;
  }

  /**
   * Handles an HTTP request to a target.
   * @param {http~IncomingMessage} request The request sent by the client.
   * @param {http~ServerResponse} response The response sent by the server.
   * @emits {object} The "request" event.
   */
  _onHTTPRequest(request, response) {
    this._onRequest.next({request, response});

    let hostname = this._getHostname(request);
    let pattern = this.routes.has(hostname) ? hostname : '*';
    if (!this.routes.has(pattern)) this._sendStatus(response, 404);
    else {
      let target = this.routes.get(pattern);
      Object.assign(request.headers, target.headers);
      this._proxyService.web(request, response, {target: target.uri});
    }
  }

  /**
   * Handles the error emitted if a request to a target fails.
   * @param {Error} error The emitted error event.
   * @param {http~IncomingMessage} request The request sent by the client.
   * @param {http~ServerResponse} response The response sent by the server.
   * @emits {Error} The "error" event.
   */
  _onRequestError(error, request, response) {
    this._onError.next(error);
    this._sendStatus(response, 502);
  }

  /**
   * Handles a WebSocket request to a target.
   * @param {http~IncomingMessage} request The request sent by the client.
   * @param {net~Socket} socket The network socket between the server and client.
   * @param {Buffer} head The first packet of the upgraded stream.
   */
  _onWSRequest(request, socket, head) {
    let hostname = this._getHostname(request);
    let pattern = this.routes.has(hostname) ? hostname : '*';
    if (this.routes.has(pattern)) {
      let target = this.routes.get(pattern);
      Object.assign(request.headers, target.headers);
      this._proxyService.ws(request, socket, head, {target: target.uri});
    }
  }

  /**
   * Sends an HTTP status code and terminates the specified server response.
   * @param {http~ServerResponse} response The server response.
   * @param {number} statusCode The HTTP status code to send.
   */
  _sendStatus(response, statusCode) {
    let message = STATUS_CODES[statusCode];
    response.writeHead(statusCode, {
      'Content-Length': Buffer.byteLength(message),
      'Content-Type': 'text/plain; charset=utf-8'
    });

    response.end(message);
  }
};
