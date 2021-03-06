const {fork, spawn} = require('child_process');
const del = require('del');
const {promises} = require('fs');
const {dest, series, src, task, watch} = require('gulp');
const replace = require('gulp-replace');
const {EOL} = require('os');
const {delimiter, normalize, resolve} = require('path');

// Initialize the build system.
const _path = 'PATH' in process.env ? process.env.PATH : '';
const _vendor = resolve('node_modules/.bin');
if (!_path.includes(_vendor)) process.env.PATH = `${_vendor}${delimiter}${_path}`;

/** Builds the project. */
const esmRegex = /(export|import)\s+(.+)\s+from\s+'(\.[^']+)'/g;
task('build:fix', () => src('lib/**/*.js').pipe(replace(esmRegex, "$1 $2 from '$3.js'")).pipe(dest('lib')));
task('build:js', () => _exec('tsc', ['--project', 'src/tsconfig.json']));
task('build', series('build:js', 'build:fix'));

/** Deletes all generated files and reset any saved state. */
task('clean', () => del(['doc/api', 'lib', 'var/**/*', 'web']));

/** Uploads the results of the code coverage. */
task('coverage', () => _exec('coveralls', ['var/lcov.info']));

/** Builds the documentation. */
task('doc', async () => {
  for (const path of ['CHANGELOG.md', 'LICENSE.md']) await promises.copyFile(path, `doc/about/${path.toLowerCase()}`);
  await _exec('typedoc', ['--gaID', process.env.GOOGLE_ANALYTICS_ID, '--options', 'etc/typedoc.json']);
  await _exec('mkdocs', ['build', '--config-file=doc/mkdocs.yaml']);
  return del(['doc/about/changelog.md', 'doc/about/license.md', 'web/mkdocs.yaml']);
});

/** Fixes the coding standards issues. */
task('fix', () => _exec('eslint', ['--config=etc/eslint.yaml', '--fix', 'src/**/*.ts']));

/** Performs the static analysis of source code. */
task('lint', () => _exec('eslint', ['--config=etc/eslint.yaml', 'src/**/*.ts']));

/** Publishes the package to the registry. */
task('publish:github', () => _exec('npm', ['publish', '--registry=https://npm.pkg.github.com']));
task('publish:npm', () => _exec('npm', ['publish', '--registry=https://registry.npmjs.org']));
task('publish', series('clean', 'publish:github', 'publish:npm'));

/** TODO Starts the development server. */
task('serve', done => {
  fork('bin/reverse_proxy.js', ['--address=127.0.0.1', '--target=8080'], {stdio: 'inherit'});
  done();
});

/** Runs the test suites. */
const mocha = ['node_modules/.bin/mocha', '--recursive'];
task('test:run', () => _exec('c8', ['--all', '--include=lib/**/*.js', '--report-dir=var', '--reporter=lcovonly', ...mocha]));
task('test', series('build', 'test:run'));

/** Upgrades the project to the latest revision. */
task('upgrade', async () => {
  await _exec('git', ['reset', '--hard']);
  await _exec('git', ['fetch', '--all', '--prune']);
  await _exec('git', ['pull', '--rebase']);
  await _exec('npm', ['install', '--ignore-scripts', '--production=false']);
  return _exec('npm', ['update', '--dev']);
});

/** Builds the version file. */
task('version', async () => {
  const {version} = JSON.parse(await promises.readFile('package.json', 'utf8'));
  return promises.writeFile('src/cli/version.g.ts', [
    '/** The version number of the package. */',
    `export const packageVersion: string = '${version}';`, ''
  ].join(EOL));
});

/** Watches for file changes. */
task('watch', () => {
  watch('src/**/*.ts', {ignoreInitial: false}, task('build'));
  watch('test/**/*.js', task('test'));
});

/** Runs the default tasks. */
task('default', series('version', 'build'));

/**
 * Spawns a new process using the specified command.
 * @param {string} command The command to run.
 * @param {string[]} args The command arguments.
 * @param {object} options The settings to customize how the process is spawned.
 * @return {Promise<void>} Completes when the command is finally terminated.
 */
function _exec(command, args = [], options = {}) {
  return new Promise((fulfill, reject) => spawn(normalize(command), args, {shell: true, stdio: 'inherit', ...options})
    .on('close', code => code ? reject(new Error(`${command}: ${code}`)) : fulfill())
  );
}
