# Reverse-Proxy.js

## Simple reverse proxy server supporting WebSockets

Let's suppose you were running multiple HTTP application servers, but you only wanted to expose one machine to the Internet. You could setup **Reverse-Proxy.js** on that one machine and then reverse-proxy the incoming HTTP requests to locally running services which were not exposed to the outside network.

## Features
- Configuration based on simple [JSON](http://www.json.org) or [YAML](http://yaml.org) files.
- Routing tables based on host names.
- Multiple instances: allows to listen on several ports, with each one having its own target(s).
- Supports HTTPS protocol.
- Supports [WebSockets](https://en.wikipedia.org/wiki/WebSocket) requests.
- Supports custom HTTP headers.

## Quick start
Install the latest version of **Reverse-Proxy.js** with [npm](https://www.npmjs.com):

```shell
npm install --global @cedx/reverse-proxy
```

For detailed instructions, see the [installation guide](installation.md).
