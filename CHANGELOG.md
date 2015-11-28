# Changelog
This file contains highlights of what changes on each version of the [Reverse-Proxy.js](https://github.com/cedx/reverse-proxy.js) package.

#### Version 0.5.1
- The `port` parameter of `Server.listen()` method is now optional.
- Added unit tests.
- Added support for code coverage.

#### Version 0.5.0
- Breaking change: using ES6 features, like arrow functions, block-scoped binding constructs, classes and template strings.
- Breaking change: raised the required [Node.js](http://nodejs.org) version.
- Breaking change: changed the whole API of `Application` class.
- Breaking change: changed the format of `Server#request` event.
- Breaking change: changed the format of configuration files to [YAML](http://yaml.org).
- Added support for [SonarQube](http://www.sonarqube.org) code analyzer.
- Changed the documentation system for [JSDoc](http://usejsdoc.org).
- Changed licensing for the [Apache License Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

#### Version 0.4.1
- Upgraded the package dependencies.

#### Version 0.4.0
- Raised the required [Node.js](http://nodejs.org) version.
- Removed the dependency on [`promise`](https://www.npmjs.com/package/promise) module.
- Upgraded the package dependencies.

#### Version 0.3.0
- Breaking change: ported the callback-based API to [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
- Using [Gulp.js](http://gulpjs.com) as build system.
- Fixed [GitHub issue #1](https://github.com/cedx/reverse-proxy.js/issues/1): using a Unix system for publishing the package on [npm](https://www.npmjs.com).
- Upgraded the package dependencies.

#### Version 0.2.1
- Added `Application` class, used in CLI script.
- Added sample configuration files.
- Updated the documentation.

#### Version 0.2.0
- The `Server` class and CLI now uses port 3000 as default.
- Added `Server.listening` event.
- Improved the event handling.
- Updated the package dependencies.
- Breaking change: removed `Server.upgrade` event.
- Using DocGen.js to generate the API reference.

#### Version 0.1.0
- Initial release.
