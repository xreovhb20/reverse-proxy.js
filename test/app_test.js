/**
 * Unit tests of the `app` module.
 * @module test.app_test
 */
'use strict';

// Module dependencies.
const Application=require('../lib/app');
const assert=require('assert');
const fs=require('fs');

/**
 * Tests the features of the `Application` class.
 */
class ApplicationTest {

  /**
   * Runs the unit tests.
   */
  run() {
    let self=this;
    describe('Application', function() {
      describe('debug', self.testDebug);
      describe('env', self.testEnv);
      describe('loadConfig()', self.testLoadConfig);
      describe('_parseConfig()', self.testParseConfig);
    });
  }

  /**
   * Tests the `debug` property.
   */
  testDebug() {
    it('should be `false` in production environment', () => {
      process.env.NODE_ENV='production';
      assert.equal(new Application().debug, false);
    });

    it('should be `true` in development environment', () => {
      process.env.NODE_ENV='development';
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
      process.env.NODE_ENV='development';
      assert.equal(new Application().env, 'development');
    });
  }

  /**
   * Tests the `loadConfig` method.
   */
  testLoadConfig() {
    it('should return an array of objects corresponding to the ones specified in the command line arguments', done => {
      let args={port: 80, target: 3000};
      new Application().loadConfig(args).then(
        (config) => {
          assert(Array.isArray(config));
          assert.equal(config.length, 1);
          assert.equal(config[0].port, 80);
          assert.equal(config[0].target, 3000);
          done();
        },
        done
      );
    });

    it('should return an array of objects corresponding to the ones specified in the configuration', done => {
      let args={config: `${__dirname}/../example/basic_standalone.yml`};
      new Application().loadConfig(args).then(
        (config) => {
          assert(Array.isArray(config));
          assert.equal(config.length, 1);
          assert.equal(config[0].port, 80);
          assert.equal(config[0].target, 3000);
          done();
        },
        done
      );
    });
  }

  /**
   * Tests the `_parseConfig` method.
   */
  testParseConfig() {
    it('should throw an error if the parsed configuration has no `routes` and no `target` properties', () =>
      assert.throws(() => new Application()._parseConfig('port: 80'))
    );
  }
}

// Run all tests.
new ApplicationTest().run();
