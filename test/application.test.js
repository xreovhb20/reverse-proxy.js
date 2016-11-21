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
    it('should return an array of objects corresponding to the ones specified on the command line arguments', done => {
      let args = {port: 80, target: 3000};
      new Application().loadConfig(args).subscribe(
        config => {
          assert.ok(Array.isArray(config));
          assert.equal(config.length, 1);
          assert.equal(config[0].port, 80);
          assert.equal(config[0].target, 3000);
        },
        done,
        done
      );
    });

    it('should return an array of objects corresponding to the ones specified in the JSON configuration', done => {
      let args = {config: `${__dirname}/../example/json/basic_standalone.json`};
      new Application().loadConfig(args).subscribe(
        config => {
          assert.ok(Array.isArray(config));
          assert.equal(config.length, 1);
          assert.equal(config[0].port, 80);
          assert.equal(config[0].target, 3000);
        },
        done,
        done
      );
    });

    it('should return an array of objects corresponding to the ones specified in the YAML configuration', done => {
      let args = {config: `${__dirname}/../example/yaml/basic_standalone.yml`};
      new Application().loadConfig(args).subscribe(
        config => {
          assert.ok(Array.isArray(config));
          assert.equal(config.length, 1);
          assert.equal(config[0].port, 80);
          assert.equal(config[0].target, 3000);
        },
        done,
        done
      );
    });
  });

  /**
   * @test {Application#_parseConfig}
   */
  describe('#_parseConfig()', () => {
    it('should throw an error if the parsed JSON configuration has no `routes` and no `target` properties', done => {
      new Application()._parseConfig('{"port": 80}').subscribe(
        () => done(new Error('The configuration is invalid.')),
        () => done()
      );
    });

    it('should completes with an array if the parsed JSON configuration is valid', done => {
      new Application()._parseConfig('{"port": 80, "target": 3000}').subscribe(
        config => {
          assert.ok(Array.isArray(config));
          assert.equal(config.length, 1);
          assert.equal(config[0].port, 80);
          assert.equal(config[0].target, 3000);
        },
        done,
        done
      );
    });

    it('should throw an error if the parsed YAML configuration has no `routes` and no `target` properties', done => {
      new Application()._parseConfig('port: 80').subscribe(
        () => done(new Error('The configuration is invalid.')),
        () => done()
      );
    });

    it('should completes with an array if the parsed YAML configuration is valid', done => {
      new Application()._parseConfig('port: 80\ntarget: 3000').subscribe(
        config => {
          assert.ok(Array.isArray(config));
          assert.equal(config.length, 1);
          assert.equal(config[0].port, 80);
          assert.equal(config[0].target, 3000);
        },
        done,
        done
      );
    });
  });
});
