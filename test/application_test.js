/**
 * Implementation of the `tests.ApplicationTest` class.
 * @module test/applicaton_test
 */
const assert = require('assert');
const {Application} = require('../lib');

/**
 * Tests the features of the `Application` class.
 */
class ApplicationTest {

  /**
   * Runs the unit tests.
   */
  run() {
    describe('Application', () => {
      describe('debug', this.testDebug);
      describe('env', this.testEnv);
      describe('loadConfig()', this.testLoadConfig);
      describe('_parseConfig()', this.testParseConfig);
    });
  }

  /**
   * Tests the `debug` property.
   */
  testDebug() {
    it('should be `false` in production environment', () => {
      process.env.NODE_ENV = 'production';
      assert.equal(new Application().debug, false);
    });

    it('should be `true` in development environment', () => {
      process.env.NODE_ENV = 'development';
      assert.equal(new Application().debug, true);
    });
  }

  /**
   * Tests the `env` property.
   */
  testEnv() {
    it('should be "production" if the NODE_ENV environment variable is not set', () => {
      delete process.env.NODE_ENV;
      assert.equal(new Application().env, 'production');
    });

    it('should equal the value of `NODE_ENV` environment variable when it is set', () => {
      process.env.NODE_ENV = 'development';
      assert.equal(new Application().env, 'development');
    });
  }

  /**
   * Tests the `loadConfig` method.
   */
  testLoadConfig() {
    it('should return an array of objects corresponding to the ones specified in the command line arguments', () => {
      let args = {port: 80, target: 3000};
      return new Application().loadConfig(args).then(config => {
        assert(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      });
    });

    it('should return an array of objects corresponding to the ones specified in the JSON configuration', () => {
      let args = {config: `${__dirname}/../example/json/basic_standalone.json`};
      return new Application().loadConfig(args).then(config => {
        assert(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      });
    });

    it('should return an array of objects corresponding to the ones specified in the YAML configuration', () => {
      let args = {config: `${__dirname}/../example/yaml/basic_standalone.yml`};
      return new Application().loadConfig(args).then(config => {
        assert(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      });
    });
  }

  /**
   * Tests the `_parseConfig` method.
   */
  testParseConfig() {
    it('should throw an error if the parsed JSON configuration has no `routes` and no `target` properties', () =>
      assert.throws(() => new Application()._parseConfig('{"port": 80}'))
    );

    it('should throw an error if the parsed YAML configuration has no `routes` and no `target` properties', () =>
      assert.throws(() => new Application()._parseConfig('port: 80'))
    );
  }
}

// Run all tests.
new ApplicationTest().run();
