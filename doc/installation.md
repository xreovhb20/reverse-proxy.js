# Installation

## Requirements
Before installing **Reverse-Proxy.js**, you need to make sure you have [Node.js](https://nodejs.org) and [npm](https://www.npmjs.com), the Node.js package manager, up and running.

!!! warning
    Reverse-Proxy.js requires Node.js >= **8.9.0**.
    
You can verify if you're already good to go with the following commands:

```shell
node --version
# v9.5.0

npm --version
# 5.6.0
```

!!! info
    If you plan to play with the package sources, you will also need
    [Gulp](https://gulpjs.com) and [Material for MkDocs](https://squidfunk.github.io/mkdocs-material).

## Installing with npm package manager
From a command prompt with administrator privileges, run:

```shell
npm install --global @cedx/reverse-proxy
```

!!! info
    On Linux and MacOS systems,
    use the `sudo` command to run `npm` with elevated privileges.

Now you should be able to use the `reverse-proxy` executable:

```shell
reverse-proxy --version
# 9.1.0
```

!!! tip
    Consider adding the [`npm install --global`](https://docs.npmjs.com/files/folders) executables directory to your system path.
