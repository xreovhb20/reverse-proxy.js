/**
 * Implementation of the `reverseProxy.Server` class.
 * @module server
 */
'use strict';

// Module dependencies.
var EventEmitter=require('events').EventEmitter;
var http=require('http');
var https=require('https');
var httpProxy=require('http-proxy');
var util=require('util');

/**
 * Acts as an intermediary for requests from clients seeking resources from other servers.
 * @class reverseProxy.Server
 * @extends events.EventEmitter
 * @constructor
 * @param {Object} [options] An object specifying the server settings.
 */
function Server(options) {
  EventEmitter.call(this);

  /**
   * Emitted when the server closes.
   * @event close
   */

  /**
   * Emitted each time the server experiences an error.
   * @event error
   * @param {Error} err The emitted error event.
   */

  /**
   * Emitted when the server has been bound after calling `listen` method.
   * @event listening
   */

  /**
   * Emitted each time there is a request.
   * @event request
   * @param {http.IncomingMessage} req The request sent by the client.
   * @param {http.ServerResponse} res The response sent by the server.
   */

  /**
   * The underlying HTTP(S) service listening for requests.
   * @property _httpService
   * @type {http.Server|https.Server}
   * @private
   */
  this._httpService=null;

  /**
   * The server settings.
   * @property _options
   * @type Object
   * @private
   */
  this._options=(options || {});
  if(!('routes' in this._options)) this._options.routes={};
  if('target' in this._options) this._options.routes['*']=this._options.target;

  /**
   * The underlying proxy service providing custom application logic.
   * @property _proxyService
   * @type httpProxy.Server
   * @private
   */
  this._proxyService=httpProxy.createProxyServer('proxy' in this._options ? this._options.proxy : {});
  this._proxyService.on('error', this._handleError.bind(this));

  // Normalize the routing table.
  var routes=this._options.routes;
  for(var host in routes) {
    var target=routes[host];
    if(typeof target=='number') routes[host]='http://127.0.0.1:'+target;
    else if(!/^https?:/i.test(target)) routes[host]='http://'+target;
  }
}

// Prototype chain.
util.inherits(Server, EventEmitter);

/**
 * The host that the server is listening on.
 * @property host
 * @type String
 * @final
 * @default "0.0.0.0"
 */
Object.defineProperty(Server.prototype, 'host', {
  get: function() {
    return typeof this._options.host=='string' ? this._options.host : '0.0.0.0';
  }
});

/**
 * The port that the server is listening on.
 * @property port
 * @type Number
 * @final
 * @default 3000
 */
Object.defineProperty(Server.prototype, 'port', {
  get: function() {
    return typeof this._options.port=='number' ? this._options.port : 3000;
  }
});

/**
 * Stops the server from accepting new connections.
 * @method close
 * @return {Promise} Completes when the server is finally closed.
 * @async
 */
Server.prototype.close=function() {
  if(!this._httpService) return Promise.resolve();

  var self=this;
  return new Promise(function(resolve) {
    self._httpService.close(function() {
      self._httpService=null;
      self.emit('close');
      resolve();
    });
  });
};

/**
 * Begin accepting connections.
 * @method listen
 * @param {Number} port The port that the server should run on.
 * @param {String} [host] The host that the server should run on.
 * @return {Promise} Completes when the server has been started.
 * @async
 */
Server.prototype.listen=function(port, host) {
  this._httpService=(
    'ssl' in this._options ?
    https.createServer(this._options.ssl, this._handleHTTPRequest.bind(this)) :
    http.createServer(this._handleHTTPRequest.bind(this))
  );

  var self=this;
  this._httpService.on('clientError', function(err) { self.emit('error', err); });
  this._httpService.on('upgrade', this._handleWebSocketRequest.bind(this));

  return new Promise(function(resolve) {
    self._httpService.listen(port, host, function() {
      self._options.host=host;
      self._options.port=port;
      self.emit('listening');
      resolve();
    });
  });
};

/**
 * Gets the host name contained in the headers of the specified request.
 * @method _getHostName
 * @param {http.IncomingMessage} req The request sent by the client.
 * @return {String} The host name provided by the specified request, or `*` if the host name could not be determined.
 * @private
 */
Server.prototype._getHostName=function(req) {
  var headers=req.headers;
  if(!('host' in headers)) return '*';

  var index=headers.host.indexOf(':');
  return index<0 ? headers.host : headers.host.substr(0, index);
};

/**
 * Handles the error emitted if a request to a target fails.
 * @method _handleError
 * @param {Error} err The emitted error event.
 * @param {http.IncomingMessage} req The request sent by the client.
 * @param {http.ServerResponse} res The response sent by the server.
 * @private
 */
Server.prototype._handleError=function(err, req, res) {
  this.emit('error', err);
  this._sendStatus(res, 500);
};

/**
 * Handles an HTTP request to a target.
 * @method _handleHTTPRequest
 * @param {http.IncomingMessage} req The request sent by the client.
 * @param {http.ServerResponse} res The response sent by the server.
 * @private
 */
Server.prototype._handleHTTPRequest=function(req, res) {
  this.emit('request', req, res);

  var hostName=this._getHostName(req);
  var host=(hostName in this._options.routes ? hostName : '*');

  if(host in this._options.routes) this._proxyService.web(req, res, { target: this._options.routes[host] });
  else this._sendStatus(res, 404);
};

/**
 * Handles a WebSocket request to a target.
 * @method _handleWebSocketRequest
 * @param {http.IncomingMessage} req The request sent by the client.
 * @param {net.Socket} socket The network socket between the server and client.
 * @param {Buffer} head The first packet of the upgraded stream.
 * @private
 */
Server.prototype._handleWebSocketRequest=function(req, socket, head) {
  var hostName=this._getHostName(req);
  var host=(hostName in this._options.routes ? hostName : '*');

  if(host in this._options.routes) this._proxyService.ws(req, socket, head, { target: this._options.routes[host] });
};

/**
 * Sends an HTTP status code and terminates the specified server response.
 * @method _sendStatus
 * @param {http.ServerResponse} res The server response.
 * @param {number} statusCode The HTTP status code to send.
 * @private
 */
Server.prototype._sendStatus=function(res, statusCode) {
  var message=http.STATUS_CODES[statusCode];
  res.writeHead(statusCode, {
    'content-length': Buffer.byteLength(message),
    'content-type': 'text/plain'
  });

  res.end(message);
};

// Public interface.
module.exports=Server;
