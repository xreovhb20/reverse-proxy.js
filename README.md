# Reverse-Proxy.js
[![Version](http://img.shields.io/npm/v/reverse-proxy-js.svg?style=flat-square)](https://www.npmjs.org/package/reverse-proxy-js) [![Downloads](http://img.shields.io/npm/dm/reverse-proxy-js.svg?style=flat-square)](https://www.npmjs.org/package/reverse-proxy-js) [![License](http://img.shields.io/npm/l/reverse-proxy-js.svg?style=flat-square)](https://github.com/cedx/reverse-proxy.js/blob/master/LICENSE.txt)

Simple reverse proxy server based on [node-http-proxy](https://github.com/nodejitsu/node-http-proxy).

## Features
- Reverse Proxy based on simple JSON configuration files.
- Routing tables based on hostnames.
- Multiple instances: allows to listen on several ports, with each one having its own target(s).
- Supports HTTPS protocol.
- Supports [WebSockets](https://en.wikipedia.org/wiki/WebSocket) requests.

## When to use Reverse-Proxy.js
Let's suppose you were running multiple HTTP application servers, but you only wanted to expose one machine to the Internet. You could setup Reverse-Proxy.js on that one machine and then reverse-proxy the incoming HTTP requests to locally running services which were not exposed to the outside network.

## Documentation
- [API Reference](http://dev.belin.io/reverse-proxy.js/api)

## Installing via [npm](https://www.npmjs.org)
From a command prompt, run:

```shell
$ npm install -g reverse-proxy-js
```

## Usage
This application provides a command line interface:

```
$ reverse-proxy --help

  Usage: reverse-proxy [options]

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -p, --port <port>      port that the reverse proxy should run on [3000]
    -h, --host <host>      host that the reverse proxy should run on [0.0.0.0]
    -t, --target <target>  location of the server the proxy will target
    -c, --config <path>    location of the configuration file(s) for the reverse proxy
    --silent               silence the log output from the reverse proxy
    -u, --user <user>      user to drop privileges to once server socket is bound
```

#### Setup a basic stand-alone proxy server
From a command prompt:

```shell
$ reverse-proxy --port 80 --target 3000
```

This will proxy all HTTP requests on port 80 on all network interfaces (e.g. `0.0.0.0`) to port 3000 on the same host (e. g. `127.0.0.1`). For a different target host:

```shell
$ reverse-proxy --port 80 --target 192.168.0.1:3000
$ reverse-proxy --port 8080 --target http://another.host:8080 --user www-data
```

You can also use a configuration file for the same task. See the [`basic-standalone.json`](https://github.com/cedx/reverse-proxy.js/blob/master/etc/basic-standalone.json) file in the `etc` folder of this package:

```shell
$ reverse-proxy --config etc/basic-standalone.json
```

For more advanced usages, you always need to use configuration files.

#### Proxy requests using a routing table
A routing table is a simple lookup table that maps incoming requests to proxy target locations. The mapping is based on the [HTTP `Host` header](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html).

To use hostname routing, you need to provide a `router` key in your configuration file, instead of a `target` key. The value of this key is an object where keys are hostnames and values are target locations.

See the [`routing-table.json`](https://github.com/cedx/reverse-proxy.js/blob/master/etc/routing-table.json) file in the `etc` folder of this package for a concrete example.

```shell
$ reverse-proxy --config etc/routing-table.json
```

#### Using HTTPS
A common use-case for proxying in conjunction with HTTPS is that you have some front-facing HTTPS server,
but all of your internal traffic is HTTP. In this way, you can reduce the number of servers to which your CA
and other important security files are deployed and reduce the computational overhead from HTTPS traffic.

If you want the proxy server to use HTTPS protocol, you need to provide a `ssl` key in your configuration file.

This object will be used as the first argument to [`https.createServer`](http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener) function when instanciating the proxy server.
Its structure is similar to the `options` parameter of [`tls.createServer`](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener) function.

See the [`https-to-http.json`](https://github.com/cedx/reverse-proxy.js/blob/master/etc/https-to-http.json) file in the `etc` folder. The `cert` and `key` fields are file paths: the corresponding files are loaded by the CLI script.

## License
[Reverse-Proxy.js](https://www.npmjs.org/package/reverse-proxy-js) is distributed under the MIT License.
