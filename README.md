# Reverse-Proxy.js
![Release](https://img.shields.io/npm/v/@cedx/reverse-proxy.svg) ![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg) ![Dependencies](https://david-dm.org/cedx/reverse-proxy.js.svg) ![Coverage](https://coveralls.io/repos/github/cedx/reverse-proxy.js/badge.svg) ![Build](https://travis-ci.org/cedx/reverse-proxy.js.svg)

Simple reverse proxy server supporting WebSockets, implemented in [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript).

Let's suppose you were running multiple HTTP application servers, but you only wanted to expose one machine to the Internet. You could setup Reverse-Proxy.js on that one machine and then reverse-proxy the incoming HTTP requests to locally running services which were not exposed to the outside network.

## Features
- Configuration based on simple [JSON](http://www.json.org) or [YAML](http://yaml.org) files.
- Routing tables based on host names.
- Multiple instances: allows to listen on several ports, with each one having its own target(s).
- Supports HTTPS protocol.
- Supports [WebSockets](https://en.wikipedia.org/wiki/WebSocket) requests.

## Requirements
The latest [Node.js](https://nodejs.org) and [npm](https://www.npmjs.com) versions.
If you plan to play with the sources, you will also need the latest [Gulp.js](http://gulpjs.com) version.

## Installing via [npm](https://www.npmjs.com)
From a command prompt with administrator privileges, run:

```shell
$ npm install --global @cedx/reverse-proxy
```

## Usage
This application provides a command line interface:

```
$ reverse-proxy --help

  Usage: reverse-proxy [options]
  
  Simple reverse proxy server supporting WebSockets.

  Options:

    -h, --help               output usage information
    -v, --version            output the version number
    -a, --address <address>  address that the reverse proxy should run on [0.0.0.0]
    -p, --port <port>        port that the reverse proxy should run on [3000]
    -t, --target <target>    location of the server the proxy will target
    -c, --config <path>      location of the configuration file for the reverse proxy
    -u, --user <user>        user to drop privileges to once server socket is bound
    --silent                 silence the log output from the reverse proxy
```

### Setup a basic stand-alone proxy server
From a command prompt:

```shell
$ reverse-proxy --port 80 --target 3000
```

This will proxy all HTTP requests on port 80 on all network interfaces (e.g. `0.0.0.0`) to port 3000 on the same host (e. g. `127.0.0.1`). For a different target host:

```shell
$ reverse-proxy --port 80 --target 192.168.0.1:3000
$ reverse-proxy --port 8080 --target http://another.host:8080 --user www-data
```

You can also use a configuration file for the same task. See the [`basic_standalone.json`](https://github.com/cedx/reverse-proxy.js/blob/master/example/json/basic_standalone.json) or [`basic_standalone.yaml`](https://github.com/cedx/reverse-proxy.js/blob/master/example/yaml/basic_standalone.yaml) file in the `example` folder of this package:

```shell
$ reverse-proxy --config example/yaml/basic_standalone.yaml
```

For more advanced usages, you **always** need to use configuration files.

> A target server can be expressed in two possible ways in the configuration file:
> - a string or a number representing an URI: `3000` (a port of the local host), `"domain.com:8080"` (an authority) or `"http://domain.com:8080"` (an origin).
> - an object with a `uri` property having the same format: `{"uri": 3000}`, `{"uri": "domain.com:8080"}` or `{"uri": "http://domain.com:8080"}`.

### Using HTTPS
A common use-case for proxying in conjunction with HTTPS is that you have some front-facing HTTPS server, but all of your internal traffic is HTTP. In this way, you can reduce the number of servers to which your CA and other important security files are deployed and reduce the computational overhead from HTTPS traffic.

If you want the proxy server to use HTTPS protocol, you need to provide a `ssl` key in your configuration file.

This object will be used as the first argument to [`https.createServer`](http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener) function when instanciating the proxy server.
Its structure is similar to the `options` parameter of [`tls.createServer`](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener) function.

See the [`https_to_http.json`](https://github.com/cedx/reverse-proxy.js/blob/master/example/json/https_to_http.json) or [`https_to_http.yaml`](https://github.com/cedx/reverse-proxy.js/blob/master/example/yaml/https_to_http.yaml) file in the `example` folder. The `cert` and `key` fields are file paths: the corresponding files are loaded by the CLI script.

### Proxy requests using a routing table
A routing table is a simple lookup table that maps incoming requests to proxy target locations. The mapping is based on the [HTTP `Host` header](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html).

To use hostname routing, you need to provide a `routes` key in your configuration file, instead of a `target` key. The value of this key is an object where keys are hostnames and values are target locations.
Use an asterisk (`*`) as host name to define the route matched by default when a host name is not found.

See the [`routing_table.json`](https://github.com/cedx/reverse-proxy.js/blob/master/example/json/routing_table.json) or [`routing_table.yaml`](https://github.com/cedx/reverse-proxy.js/blob/master/example/yaml/routing_table.yaml) file in the `example` folder of this package for a concrete example.

```shell
$ reverse-proxy --config example/yaml/routing_table.yaml
```

### Listening on multiple ports
In order to listen on several ports, all you have to do is use a JSON array or a YAML stream containing a different configuration object for each port to listen. Consequently, each port can have its own settings and routing table.

See the [`multiple_ports.json`](https://github.com/cedx/reverse-proxy.js/blob/master/example/json/multiple_ports.json) or [`multiple_ports.yaml`](https://github.com/cedx/reverse-proxy.js/blob/master/example/yaml/multiple_ports.yaml) file in the `example` folder of this package for an example.

```shell
$ reverse-proxy --config example/yaml/multiple_ports.yaml
```

### Adding HTTP headers to the proxied requests
It can sometimes be useful to add some HTTP headers to the requests sent to the target servers.

Let say that you have a remote service that needs basic authentication, but that you want to expose publicly (!). You could add an `Authorization` header to the proxied requests in order to let the remote service accept these requests.

TODO

## Configuration schema
The [`defaults.json`](https://github.com/cedx/reverse-proxy.js/blob/master/example/json/defaults.json) or [`defaults.yaml`](https://github.com/cedx/reverse-proxy.js/blob/master/example/yaml/defaults.yaml) file, in the `example` folder of this package, lists all available settings and their default values.

## See also
- [API reference](https://cedx.github.io/reverse-proxy.js)
- [Code coverage](https://coveralls.io/github/cedx/reverse-proxy.js)
- [Continuous integration](https://travis-ci.org/cedx/reverse-proxy.js)

## License
[Reverse-Proxy.js](https://github.com/cedx/reverse-proxy.js) is distributed under the Apache License, version 2.0.
