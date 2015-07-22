# Reverse-Proxy.js
[![Release](http://img.shields.io/npm/v/reverse-proxy-js.svg)](https://www.npmjs.com/package/reverse-proxy-js) [![License](http://img.shields.io/npm/l/reverse-proxy-js.svg)](https://bitbucket.org/cedx/reverse-proxy.js/src/master/LICENSE.txt) [![Downloads](http://img.shields.io/npm/dm/reverse-proxy-js.svg)](https://www.npmjs.com/package/reverse-proxy-js) [![Dependencies](http://img.shields.io/david/cedx/reverse-proxy.js.svg)](https://david-dm.org/cedx/reverse-proxy.js)

Simple reverse proxy server supporting WebSockets, implemented in [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript).

Let's suppose you were running multiple HTTP application servers, but you only wanted to expose one machine to the Internet. You could setup Reverse-Proxy.js on that one machine and then reverse-proxy the incoming HTTP requests to locally running services which were not exposed to the outside network.

## Features
- Configuration based on simple [YAML](http://yaml.org) files.
- Routing tables based on host names.
- Multiple instances: allows to listen on several ports, with each one having its own target(s).
- Supports HTTPS protocol.
- Supports [WebSockets](https://en.wikipedia.org/wiki/WebSocket) requests.

## Documentation
- [API Reference](http://api.belin.io/reverse-proxy.js)

## Installing via [npm](https://www.npmjs.com)
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

You can also use a configuration file for the same task. See the [`basic_standalone.yaml`](https://bitbucket.org/cedx/reverse-proxy.js/src/master/example/basic_standalone.yaml) file in the `etc` folder of this package:

```shell
$ reverse-proxy --config example/basic_standalone.yaml
```

For more advanced usages, you always need to use configuration files.

#### Using HTTPS
A common use-case for proxying in conjunction with HTTPS is that you have some front-facing HTTPS server, but all of your internal traffic is HTTP. In this way, you can reduce the number of servers to which your CA and other important security files are deployed and reduce the computational overhead from HTTPS traffic.

If you want the proxy server to use HTTPS protocol, you need to provide a `ssl` key in your configuration file.

This object will be used as the first argument to [`https.createServer`](http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener) function when instanciating the proxy server.
Its structure is similar to the `options` parameter of [`tls.createServer`](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener) function.

See the [`https_to_http.yaml`](https://bitbucket.org/cedx/reverse-proxy.js/src/master/example/https_to_http.yaml) file in the `etc` folder. The `cert` and `key` fields are file paths: the corresponding files are loaded by the CLI script.

#### Proxy requests using a routing table
A routing table is a simple lookup table that maps incoming requests to proxy target locations. The mapping is based on the [HTTP `Host` header](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html).

To use hostname routing, you need to provide a `routes` key in your configuration file, instead of a `target` key. The value of this key is an object where keys are hostnames and values are target locations.
Use an asterisk (`*`) as host name to define the route matched by default when a host name is not found.

See the [`routing_table.yaml`](https://bitbucket.org/cedx/reverse-proxy.js/src/master/example/routing_table.yaml) file in the `etc` folder of this package for a concrete example.

```shell
$ reverse-proxy --config example/routing_table.yaml
```

#### Listening on multiple ports
In order to listen on several ports, all you have to do is use a YAML stream containing a different document for each port to listen. Consequently, each port can have its own settings and routing table.

See the [`multiple_ports.yaml`](https://bitbucket.org/cedx/reverse-proxy.js/src/master/example/multiple_ports.yaml) file in the `etc` folder of this package for an example.

```shell
$ reverse-proxy --config example/multiple_ports.yaml
```

## Configuration Schema
The [`defaults.yaml`](https://bitbucket.org/cedx/reverse-proxy.js/src/master/example/defaults.yaml) file, in the `etc` folder of this package, lists all available settings and their default values.

## License
[Reverse-Proxy.js](https://www.npmjs.com/package/reverse-proxy-js) is distributed under the MIT License.
