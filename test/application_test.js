'use strict';

import assert from 'assert';
import {Application} from '../src';

/**
 * @test {Application}
 */
describe('Application', () => {

  /**
   * @test {Application#debug}
   */
  describe('#debug', () => {
    it('should be `false` in production environment', () => {
      process.env.NODE_ENV = 'production';
      assert.equal(new Application().debug, false);
    });

    it('should be `true` in development environment', () => {
      process.env.NODE_ENV = 'development';
      assert.equal(new Application().debug, true);
    });
  });

  /**
   * @test {Application#env}
   */
  describe('#env', () => {
    it('should be "production" if the NODE_ENV environment variable is not set', () => {
      delete process.env.NODE_ENV;
      assert.equal(new Application().env, 'production');
    });

    it('should equal the value of `NODE_ENV` environment variable when it is set', () => {
      process.env.NODE_ENV = 'development';
      assert.equal(new Application().env, 'development');
    });
  });

  /**
   * @test {Application#loadConfig}
   */
  describe('#loadConfig()', () => {
    it('should return an array of objects corresponding to the ones specified on the command line arguments', () => {
      let args = {port: 80, target: 3000};
      return new Application().loadConfig(args).then(config => {
        assert.ok(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      });
    });

    it('should return an array of objects corresponding to the ones specified in the JSON configuration', () => {
      let args = {config: `${__dirname}/../example/json/basic_standalone.json`};
      return new Application().loadConfig(args).then(config => {
        assert.ok(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      });
    });

    it('should return an array of objects corresponding to the ones specified in the YAML configuration', () => {
      let args = {config: `${__dirname}/../example/yaml/basic_standalone.yaml`};
      return new Application().loadConfig(args).then(config => {
        assert.ok(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      });
    });
  });

  /**
   * @test {Application#_parseConfig}
   */
  describe('#_parseConfig()', () => {
    it('should throw an error if the parsed JSON configuration has no `routes` and no `target` properties', () =>
      new Application()._parseConfig('{"port": 80}').then(
        () => assert.ifError(new Error('The configuration is invalid.')),
        () => assert.ok(true)
      )
    );

    it('should completes with an array if the parsed JSON configuration is valid', () =>
      new Application()._parseConfig('{"port": 80, "target": 3000}').then(config => {
        assert.ok(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      })
    );

    it('should throw an error if the parsed YAML configuration has no `routes` and no `target` properties', () =>
      new Application()._parseConfig('port: 80').then(
        () => assert.ifError(new Error('The configuration is invalid.')),
        () => assert.ok(true)
      )
    );

    it('should completes with an array if the parsed YAML configuration is valid', () =>
      new Application()._parseConfig('port: 80\ntarget: 3000').then(config => {
        assert.ok(Array.isArray(config));
        assert.equal(config.length, 1);
        assert.equal(config[0].port, 80);
        assert.equal(config[0].target, 3000);
      })
    );
  });
});
