/**
 * Build system.
 * @module gulpfile
 */
'use strict';

// Module dependencies.
const child=require('child_process');
const del=require('del');
const gulp=require('gulp');
const plugins=require('gulp-load-plugins')();
const pkg=require('./package.json');

/**
 * The task settings.
 * @var {object}
 */
const config={
  output: `${pkg.name}-${pkg.version}.zip`,
  sources: [
    'index.js',
    '*.json',
    '*.md',
    '*.txt',
    'bin/*',
    'etc/*.json',
    'lib/*.js',
    'var/.gitkeep'
  ]
};

/**
 * Runs the default tasks.
 */
gulp.task('default', ['dist']);

/**
 * Checks the package dependencies.
 */
gulp.task('check', () => gulp.src('package.json')
  .pipe(plugins.david())
  .pipe(plugins.david.reporter));

/**
 * Deletes all generated files and reset any saved state.
 */
gulp.task('clean', callback => del(`var/${config.output}`, callback));

/**
 * Creates a distribution file for this program.
 */
gulp.task('dist', () => gulp.src(config.sources, { base: '.' })
  .pipe(plugins.zip(config.output))
  .pipe(gulp.dest('var')));

/**
 * Builds the documentation.
 */
gulp.task('doc', ['doc:assets']);

gulp.task('doc:assets', ['doc:rename'], () => gulp.src(['web/apple-touch-icon.png', 'web/favicon.ico'])
  .pipe(gulp.dest('doc/api')));

gulp.task('doc:build', callback => _exec('jsdoc --configure doc/conf.json', callback));

gulp.task('doc:rename', ['doc:build'], callback => fs.rename(`doc/${pkg.name}/${pkg.version}`, 'doc/api', callback));

/**
 * Performs static analysis of source code.
 */
gulp.task('lint', () => gulp.src(['*.js', 'bin/*.js', 'lib/*.js'])
  .pipe(plugins.jshint(pkg.jshintConfig))
  .pipe(plugins.jshint.reporter('default', { verbose: true })));

/**
 * Starts the proxy server.
 */
gulp.task('serve', callback => {
  if('_server' in config) {
    config._server.kill();
    delete config._server;
  }

  config._server=child.fork('bin/cli.js', ['--target', '8080']);
  callback();
});

/**
 * Watches for file changes.
 */
gulp.task('watch', ['serve'], () => gulp.watch('lib/*.js', ['serve']));

/**
 * Runs a command and prints its output.
 * @param {string} command The command to run, with space-separated arguments.
 * @param {function} callback The function to invoke when the task is over.
 * @private
 */
function _exec(command, callback) {
  child.exec(command, (err, stdout) => {
    let output=stdout.trim();
    if(output.length) console.log(output);
    if(err) console.error(err);
    callback();
  });
}
