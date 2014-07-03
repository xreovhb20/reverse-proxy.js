/**
 * Provides an implementation of a reverse proxy server.
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
 * @class Server
 * @extends events.EventEmitter
 * @constructor
 * @param {Object} [options] TODO description !!!!
 */
function Server(options) {

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
   * Emitted each time there is a request.
   * @event request
   * @param {http.IncomingMessage} req The request sent by the client.
   * @param {http.ServerResponse} res The response sent by the server.
   */

  /**
   * Emitted each time a client requests an HTTP upgrade.
   * @event upgrade
   * @param {http.IncomingMessage} req The request sent by the client.
   * @param {net.Socket} socket The network socket between the server and client.
   * @param {Buffer} head The first packet of the upgraded stream.
   */
  EventEmitter.call(this);

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
  if(!('router' in this._options)) this._options.router={};
  if('target' in this._options) this._options.router['*']=this._options.target;

  /**
   * The underlying proxy service providing custom application logic.
   * @property _proxyService
   * @type httpProxy.Server
   * @private
   */
  this._proxyService=httpProxy.createProxyServer('proxy' in this._options ? this._options.proxy : {});
  this._proxyService.on('error', this._handleError.bind(this));

  // Normalize the routing table.
  var router=this._options.router;
  for(var host in router) {
    var target=router[host];
    if(typeof target=='number') router[host]='http://127.0.0.1:'+target;
    else if(!/^https?:/i.test(target)) router[host]='http://'+target;
  }
}

// Prototype chain.
util.inherits(Server, EventEmitter);

/**
 * Gets the host that the server run on.
 * @property host
 * @type String
 * @default '0.0.0.0'
 * @final
 */
Object.defineProperty(Server.prototype, 'host', {
  get: function() {
    return 'host' in this._options ? String(this._options.host) : '0.0.0.0';
  }
});

/**
 * Gets the port that the server run on.
 * @property port
 * @type Number
 * @default 80
 * @final
 */
Object.defineProperty(Server.prototype, 'port', {
  get: function() {
    return 'port' in this._options ? Number(this._options.port) : 80;
  }
});

/**
 * Stops the server from accepting new connections.
 * The server is finally closed when all connections are ended and the server emits a `'close'` event.
 * Optionally, you can pass a callback to listen for the `'close'` event.
 * @method close
 * @param {Function} [callback] A callback to invoke when server is finally closed.
 * @async
 */
Server.prototype.close=function(callback) {
  if(this._httpService) {
    var self=this;
    this._httpService.close(function() {
      self._httpService=null;
      self.emit('close');
      if(callback instanceof Function) callback();
    });
  }
};

/**
 * Begin accepting connections.
 * @method listen
 * @param {Function} [callback] A callback to invoke when server is ready to process requests.
 * @async
 */
Server.prototype.listen=function(callback) {
  this._httpService=(
    'ssl' in this._options ?
    https.createServer(this._options.ssl, this._handleHTTPRequest.bind(this)) :
    http.createServer(this._handleHTTPRequest.bind(this))
  );

  this._httpService.on('upgrade', this._handleWebSocketRequest.bind(this));
  this._httpService.listen(this.port, this.host, callback);
};

/**
 * Gets the hostname contained in the headers of the specified request.
 * @method _getHostname
 * @param {http.IncomingMessage} req The request sent by the client.
 * @return {String} The hostname provided by the specified request.
 * @private
 */
Server.prototype._getHostname=function(req) {
  if('*' in this._options.router) return '*';
  var index=req.headers.host.indexOf(':');
  return index<0 ? req.headers.host : req.headers.host.substr(0, index);
};

/**
 * Handles the error emitted if a request to a target fail.
 * @method _handleError
 * @param {Error} err The emitted error event.
 * @param {http.IncomingMessage} req The request sent by the client.
 * @param {http.ServerResponse} res The response sent by the server.
 * @private
 */
Server.prototype._handleError=function(err, req, res) {
  this._sendStatus(res, 500);
  this.emit('error', err);
};

/**
 * Handles an HTTP request to a target.
 * @method _handleHTTPRequest
 * @param {http.IncomingMessage} req The request sent by the client.
 * @param {http.ServerResponse} res The response sent by the server.
 * @private
 */
Server.prototype._handleHTTPRequest=function(req, res) {
  var hostname=this._getHostname(req);
  if(hostname in this._options.router) this._proxyService.web(req, res, { target: this._options.router[hostname] });
  else this._sendStatus(res, 404);

  this.emit('request', req, res);
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
  var hostname=this._getHostname(req);
  if(hostname in this._options.router) this._proxyService.ws(req, socket, head, { target: this._options.router[hostname] });
  this.emit('upgrade', req, socket, head);
};

/**
 * Sends an HTTP status code and terminates the specified server response.
 * @method _sendStatus
 * @param {http.ServerResponse} res The server response.
 * @param {number} statusCode The HTTP status code to send.
 * @private
 */
Server.prototype._sendStatus=function(res, statusCode) {
  var message=statusCode.toString()+' '+http.STATUS_CODES[statusCode];

  res.writeHead(statusCode, {
    'content-length': Buffer.byteLength(message),
    'content-type': 'text/plain'
  });

  res.end(message);
};

// Public interface.
module.exports=Server;
