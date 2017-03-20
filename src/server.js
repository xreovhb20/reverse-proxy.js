import http from 'http';
import https from 'https';
import httpProxy from 'http-proxy';
import {Subject} from 'rxjs';

/**
 * Acts as an intermediary for requests from clients seeking resources from other servers.
 */
export class Server {

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
     * The underlying HTTP(S) service listening for requests.
     * @type {http.Server|https.Server}
     */
    this._httpService = null;

    /**
     * The handler of "close" events.
     * @type {Subject}
     */
    this._onClose = new Subject();

    /**
     * The handler of "error" events.
     * @type {Subject<Error>}
     */
    this._onError = new Subject();

    /**
     * The handler of "listen" events.
     * @type {Subject}
     */
    this._onListen = new Subject();

    /**
     * The handler of "request" events.
     * @type {Subject<http.IncomingMessage>}
     */
    this._onRequest = new Subject();

    /**
     * The server settings.
     * @type {object}
     */
    this._options = options;
    if (!('routes' in this._options)) this._options.routes = {};
    if ('target' in this._options) this._options.routes['*'] = this._options.target;

    /**
     * The underlying proxy service providing custom application logic.
     * @type {httpProxy.Server}
     */
    this._proxyService = httpProxy.createProxyServer(this._options.proxy || {});
    this._proxyService.on('error', this._onRequestError.bind(this));

    // Normalize the routing table.
    let routes = this._options.routes;
    for (let host in routes) routes[host] = this._normalizeRoute(routes[host]);
  }

  /**
   * The address that the server is listening on.
   * @type {string}
   */
  get address() {
    if (this.listening) return this._httpService.address().address;
    return typeof this._options.address == 'string' ? this._options.address : Server.DEFAULT_ADDRESS;
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
   * The stream of "listen" events.
   * @type {Observable}
   */
  get onListen() {
    return this._onListen.asObservable();
  }

  /**
   * The stream of "request" events.
   * @type {Observable<http.IncomingMessage>}
   */
  get onRequest() {
    return this._onRequest.asObservable();
  }

  /**
   * The port that the server is listening on.
   * @type {number}
   */
  get port() {
    if (this.listening) return this._httpService.address().port;
    return typeof this._options.port == 'number' ? this._options.port : Server.DEFAULT_PORT;
  }

  /**
   * Stops the server from accepting new connections. It does nothing if the server is already closed.
   * @return {Promise} Completes when the server is finally closed.
   * @emits {*} The "close" event.
   */
  async close() {
    if (this.listening) await new Promise(resolve => this._httpService.close(() => {
      this._httpService = null;
      this._onClose.next();
      resolve();
    }));

    return null;
  }

  /**
   * Begin accepting connections. It does nothing if the server is already started.
   * @param {number} [port] The port that the server should run on.
   * @param {string} [address] The address that the server should run on.
   * @return {Promise<number>} The port that the server is running on.
   * @emits {*} The "listen" event.
   */
  async listen(port = -1, address = '') {
    if (!this.listening) {
      this._httpService = 'ssl' in this._options ?
        https.createServer(this._options.ssl, this._onHTTPRequest.bind(this)) :
        http.createServer(this._onHTTPRequest.bind(this));

      this._httpService.on('error', err => this._onError.next(err));
      this._httpService.on('upgrade', this._onWSRequest.bind(this));


      await new Promise(resolve => this._httpService.listen(port >= 0 ? port : this.port, address.length ? address : this.address, () => {
        this._onListen.next();
        resolve();
      }));
    }

    return this.port;
  }

  /**
   * Gets the host name contained in the headers of the specified request.
   * @param {http.IncomingMessage} request The request sent by the client.
   * @return {string} The host name provided by the specified request, or `*` if the host name could not be determined.
   */
  _getHostName(request) {
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
    let value = Object.assign({}, route && typeof route == 'object' ? route : {uri: route});
    switch (typeof value.uri) {
      case 'number':
        value.uri = `http://127.0.0.1:${value.uri}`;
        break;

      case 'string':
        if (!/^https?:/i.test(value.uri)) value.uri = `http://${value.uri}`;
        break;

      default:
        throw new Error('The route has an invalid format.');
    }

    return value;
  }

  /**
   * Handles an HTTP request to a target.
   * @param {http.IncomingMessage} request The request sent by the client.
   * @param {http.ServerResponse} response The response sent by the server.
   * @emits {http.IncomingMessage} The "request" event.
   */
  _onHTTPRequest(request, response) {
    this._onRequest.next(request);

    let hostName = this._getHostName(request);
    let host = hostName in this._options.routes ? hostName : '*';
    if (!(host in this._options.routes)) this._sendStatus(response, 404);
    else {
      let target = this._options.routes[host];
      if (target.headers && typeof target.headers == 'object') Object.assign(request.headers, target.headers);
      this._proxyService.web(request, response, {target: target.uri});
    }
  }

  /**
   * Handles the error emitted if a request to a target fails.
   * @param {Error} error The emitted error event.
   * @param {http.IncomingMessage} request The request sent by the client.
   * @param {http.ServerResponse} response The response sent by the server.
   * @emits {Error} The "error" event.
   */
  _onRequestError(error, request, response) {
    this._onError.next(error);
    this._sendStatus(response, 502);
  }

  /**
   * Handles a WebSocket request to a target.
   * @param {http.IncomingMessage} request The request sent by the client.
   * @param {net.Socket} socket The network socket between the server and client.
   * @param {Buffer} head The first packet of the upgraded stream.
   */
  _onWSRequest(request, socket, head) {
    let hostName = this._getHostName(request);
    let host = hostName in this._options.routes ? hostName : '*';
    if (host in this._options.routes) {
      let target = this._options.routes[host];
      if (target.headers && typeof target.headers == 'object') Object.assign(request.headers, target.headers);
      this._proxyService.ws(request, socket, head, {target: target.uri});
    }
  }

  /**
   * Sends an HTTP status code and terminates the specified server response.
   * @param {http.ServerResponse} response The server response.
   * @param {number} statusCode The HTTP status code to send.
   */
  _sendStatus(response, statusCode) {
    let message = http.STATUS_CODES[statusCode];
    response.writeHead(statusCode, {
      'Content-Length': Buffer.byteLength(message),
      'Content-Type': 'text/plain'
    });

    response.end(message);
  }
}
