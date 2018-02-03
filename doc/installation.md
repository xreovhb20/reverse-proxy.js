# Installation

## Requirements
Before installing **Reverse-Proxy.js**, you need to make sure you have [Node.js](https://nodejs.org) and [npm](https://www.npmjs.com), the Node.js package manager, up and running.

!!! warning
    Reverse-Proxy.js requires Node.js >= **8.9.0**.

!!! info
    If you plan to play with the library sources, you will also need
    [Gulp](https://gulpjs.com) and [Material for MkDocs](https://squidfunk.github.io/mkdocs-material).
    
You can verify if you're already good to go with the following commands:

```shell
node --version
# v9.5.0

npm --version
# 5.6.0
```

## Installing with npm package manager
TODO Two possible usages.

### Global installation
From a command prompt with administrator privileges, run:

```shell
npm install --global @cedx/reverse-proxy
```

!!! info
    TO do

Now you can use the `reverse-proxy` executable:

```shell
reverse-proxy --version
# 9.1.0
```

### Local installation

#### 1. Install it
From a command prompt, run:

```shell
npm install --global @cedx/reverse-proxy
```

#### 2. Import it
Now in your [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) code, you can use:

```js
const reverseProxy = require('@cedx/reverse-proxy');
```
