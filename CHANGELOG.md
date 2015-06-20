# Changelog
This file contains highlights of what changes on each version of the [Reverse-Proxy.js](https://www.npmjs.com/package/reverse-proxy-js) package.

#### Version 0.4.0
- Raised the required [Node.js](http://nodejs.org) version.
- Removed the dependency on [`promise`](https://www.npmjs.com/package/promise) module.
- Upgraded the package dependencies.

#### Version 0.3.0
- Breaking change: ported the callback-based API to [Promises/A+](https://www.promisejs.org).
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
- Using [DocGen.js](https://bitbucket.org/cedx/docgen.js) to generate the API reference.

#### Version 0.1.0
- Initial release.
