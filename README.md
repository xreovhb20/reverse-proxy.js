# Reverse-Proxy
![Release](http://img.shields.io/npm/v/@cedx/reverse-proxy.svg) ![License](http://img.shields.io/npm/l/@cedx/reverse-proxy.svg) ![Downloads](http://img.shields.io/npm/dt/@cedx/reverse-proxy.svg) ![Dependencies](http://img.shields.io/david/cedx/reverse-proxy.svg) ![Build](http://img.shields.io/travis/cedx/reverse-proxy.svg)

Simple reverse proxy server supporting WebSockets, implemented in [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript).

Let's suppose you were running multiple HTTP application servers, but you only wanted to expose one machine to the Internet. You could setup Reverse-Proxy on that one machine and then reverse-proxy the incoming HTTP requests to locally running services which were not exposed to the outside network.

## Features
- Configuration based on simple [JSON](http://www.json.org) or [YAML](http://yaml.org) files.
- Routing tables based on host names.
- Multiple instances: allows to listen on several ports, with each one having its own target(s).
- Supports HTTPS protocol.
- Supports [WebSockets](https://en.wikipedia.org/wiki/WebSocket) requests.

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

  Options:

    -h, --help             output usage information
    -v, --version          output the version number
    -p, --port <port>      port that the reverse proxy should run on [3000]
    -H, --host <host>      host that the reverse proxy should run on [0.0.0.0]
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

You can also use a configuration file for the same task. See the [`basic_standalone.json`](https://github.com/cedx/reverse-proxy/blob/master/example/json/basic_standalone.json) or [`basic_standalone.yml`](https://github.com/cedx/reverse-proxy/blob/master/example/yaml/basic_standalone.yml) file in the `example` folder of this package:

```shell
$ reverse-proxy --config example/yaml/basic_standalone.yml
```

For more advanced usages, you always need to use configuration files.

#### Using HTTPS
A common use-case for proxying in conjunction with HTTPS is that you have some front-facing HTTPS server, but all of your internal traffic is HTTP. In this way, you can reduce the number of servers to which your CA and other important security files are deployed and reduce the computational overhead from HTTPS traffic.

If you want the proxy server to use HTTPS protocol, you need to provide a `ssl` key in your configuration file.

This object will be used as the first argument to [`https.createServer`](http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener) function when instanciating the proxy server.
Its structure is similar to the `options` parameter of [`tls.createServer`](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener) function.

See the [`https_to_http.json`](https://github.com/cedx/reverse-proxy/blob/master/example/json/https_to_http.json) or [`https_to_http.yml`](https://github.com/cedx/reverse-proxy/blob/master/example/yaml/https_to_http.yml) file in the `example` folder. The `cert` and `key` fields are file paths: the corresponding files are loaded by the CLI script.

#### Proxy requests using a routing table
A routing table is a simple lookup table that maps incoming requests to proxy target locations. The mapping is based on the [HTTP `Host` header](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html).

To use hostname routing, you need to provide a `routes` key in your configuration file, instead of a `target` key. The value of this key is an object where keys are hostnames and values are target locations.
Use an asterisk (`*`) as host name to define the route matched by default when a host name is not found.

See the [`routing_table.json`](https://github.com/cedx/reverse-proxy/blob/master/example/json/routing_table.json) or [`routing_table.yml`](https://github.com/cedx/reverse-proxy/blob/master/example/yaml/routing_table.yml) file in the `example` folder of this package for a concrete example.

```shell
$ reverse-proxy --config example/yaml/routing_table.yml
```

#### Listening on multiple ports
In order to listen on several ports, all you have to do is use a JSON array or a YAML stream containing a different configuration object for each port to listen. Consequently, each port can have its own settings and routing table.

See the [`multiple_ports.json`](https://github.com/cedx/reverse-proxy/blob/master/example/json/multiple_ports.json) or [`multiple_ports.yml`](https://github.com/cedx/reverse-proxy/blob/master/example/yaml/multiple_ports.yml) file in the `example` folder of this package for an example.

```shell
$ reverse-proxy --config example/yaml/multiple_ports.yml
```

## Configuration Schema
The [`defaults.json`](https://github.com/cedx/reverse-proxy/blob/master/example/json/defaults.json) or [`defaults.yml`](https://github.com/cedx/reverse-proxy/blob/master/example/yaml/defaults.yml) file, in the `example` folder of this package, lists all available settings and their default values.

## See Also
- [Code Quality](https://www.codacy.com/app/cedx/reverse-proxy)
- [Continuous Integration](https://travis-ci.org/cedx/reverse-proxy)

## License
[Reverse-Proxy](https://github.com/cedx/reverse-proxy) is distributed under the Apache License, version 2.0.
