# Reverse-Proxy.js
Simple reverse proxy server supporting [WebSockets](https://en.wikipedia.org/wiki/WebSocket),
implemented in [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript).

## Command Line Interface
From a command prompt:

```
> reverse-proxy --help

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

## Documentation
- [API Reference](http://dev.belin.io/reverse-proxy.js/api)

## Technologies
This project was developed primarily with these libraries:

#### Console Application
- [Node.js](http://nodejs.org)
- [node-http-proxy](https://github.com/nodejitsu/node-http-proxy)

#### Development Tools
- [DocGen.js](https://github.com/cedx/docgen.js)
- [JSHint](http://jshint.com/about)

## License
[Reverse-Proxy.js](https://www.npmjs.org/package/reverse-proxy-js) is distributed under the MIT License.
