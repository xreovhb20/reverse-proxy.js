import EventEmitter from 'events';
import {createServer, STATUS_CODES} from 'http';
import {createServer as createSecureServer} from 'https';
import {createProxyServer} from 'http-proxy';

/**
 * Acts as an intermediary for requests from clients seeking resources from other servers.
 */
export class Server extends EventEmitter {

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
    super();

    /**
     * The routing table.
     * @type {Map}
     */
    this.routes = new Map;
    if ('routes' in options) for (let host in options.routes) this.routes.set(host, this._normalizeRoute(options.routes[host]));
    if ('target' in options) this.routes.set('*', this._normalizeRoute(options.target));

    /**
     * The underlying HTTP(S) service listening for requests.
     * @type {http.Server|https.Server}
     */
    this._httpService = null;

    /**
     * The server settings.
     * @type {object}
     */
    this._options = {
      address: typeof options.address == 'string' ? options.address : Server.DEFAULT_ADDRESS,
      port: typeof options.port == 'number' ? options.port : Server.DEFAULT_PORT,
      proxy: typeof options.proxy == 'object' && options.proxy ? options.proxy : null,
      ssl: typeof options.ssl == 'object' && options.ssl ? options.ssl : null
    };

    /**
     * The underlying proxy service providing custom application logic.
     * @type {httpProxy.Server}
     */
    this._proxyService = null;
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
   * The port that the server is listening on.
   * @type {number}
   */
  get port() {
    return this.listening ? this._httpService.address().port : this._options.port;
  }

  /**
   * Stops the server from accepting new connections. It does nothing if the server is already closed.
   * @return {Promise} Completes when the server is finally closed.
   * @emits {*} The "close" event.
   */
  async close() {
    return !this.listening ? null : new Promise(resolve => this._httpService.close(() => {
      this._httpService = null;
      this._proxyService = null;
      this.emit('close');
      resolve(null);
    }));
  }

  /**
   * Begin accepting connections. It does nothing if the server is already started.
   * @param {number} [port] The port that the server should run on.
   * @param {string} [address] The address that the server should run on.
   * @return {Promise<number>} The port that the server is running on.
   * @emits {*} The "listening" event.
   */
  async listen(port = -1, address = '') {
    if (this.listening) return this.port;

    let requestHandler = this._onHTTPRequest.bind(this);
    this._httpService = this._options.ssl ? createSecureServer(this._options.ssl, requestHandler) : createServer(requestHandler);
    this._httpService.on('error', error => this.emit('error', error));
    this._httpService.on('upgrade', this._onWSRequest.bind(this));

    this._proxyService = createProxyServer(this._options.proxy);
    this._proxyService.on('error', this._onRequestError.bind(this));

    return new Promise(resolve => this._httpService.listen(port >= 0 ? port : this.port, address.length ? address : this.address, () => {
      this.emit('listening');
      resolve(this.port);
    }));
  }

  /**
   * Gets the host name contained in the headers of the specified request.
   * @param {http.IncomingMessage} request The request sent by the client.
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
    let value = typeof route == 'object' && route ? route : {uri: route};

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

    if (typeof value.headers != 'object' || !value.headers) value.headers = {};
    else {
      let map = {};
      for (let key in value.headers) map[key.toLowerCase()] = value.headers[key];
      value.headers = map;
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
    this.emit('request', request, response);

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
   * @param {http.IncomingMessage} request The request sent by the client.
   * @param {http.ServerResponse} response The response sent by the server.
   * @emits {Error} The "error" event.
   */
  _onRequestError(error, request, response) {
    this.emit('error', error);
    this._sendStatus(response, 502);
  }

  /**
   * Handles a WebSocket request to a target.
   * @param {http.IncomingMessage} request The request sent by the client.
   * @param {net.Socket} socket The network socket between the server and client.
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
   * @param {http.ServerResponse} response The server response.
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
}
