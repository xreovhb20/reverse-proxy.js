'use strict';

import {expect} from 'chai';
import {describe, it} from 'mocha';
import {Application, Server} from '../src/index';

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
      expect((new Application).debug).to.be.false;
    });

    it('should be `true` in development environment', () => {
      process.env.NODE_ENV = 'development';
      expect((new Application).debug).to.be.true;
    });
  });

  /**
   * @test {Application#env}
   */
  describe('#env', () => {
    it('should be "development" if the NODE_ENV environment variable is not set', () => {
      delete process.env.NODE_ENV;
      expect((new Application).env).to.equal('development');
    });

    it('should equal the value of `NODE_ENV` environment variable when it is set', () => {
      process.env.NODE_ENV = 'production';
      expect((new Application).env).to.equal('production');
    });
  });

  /**
   * @test {Application#init}
   */
  describe('#init()', () => {
    it.skip('should initialize the `servers` property from the command line arguments', done => {
      let app = new Application;
      app.init({port: 80, target: 3000}).subscribe(() => {
        expect(app.servers).to.be.an('array').and.have.lengthOf(1);
        expect(app.servers[0].port).to.equal(80);
      }, done, done);
    });

    it.skip('should initialize the `servers` property from the JSON configuration', done => {
      let app = new Application;
      app.init({config: `${__dirname}/../example/json/basic_standalone.json`}).subscribe(() => {
        expect(app.servers).to.be.an('array').and.have.lengthOf(1);
        expect(app.servers[0].port).to.equal(80);
      }, done, done);
    });

    it.skip('should initialize the `servers` property from the YAML configuration', done => {
      let app = new Application;
      app.init({config: `${__dirname}/../example/yaml/basic_standalone.yaml`}).subscribe(() => {
        expect(app.servers).to.be.an('array').and.have.lengthOf(1);
        expect(app.servers[0].port).to.equal(80);
      }, done, done);
    });
  });

  /**
   * @test {Application#_parseConfig}
   */
  describe('#_parseConfig()', () => {
    it('should throw an error if the parsed JSON configuration has no `routes` and no `target` properties', done => {
      (new Application)._parseConfig('{"port": 80}').subscribe({
        complete: () => done(new Error('Error not thrown.')),
        error: () => done()
      });
    });

    it('should completes with an array if the parsed JSON configuration is valid', done => {
      (new Application)._parseConfig('{"port": 80, "target": 3000}').subscribe(config => {
        console.dir(config);
        expect(config).to.be.an('array').and.have.lengthOf(1);
        expect(config[0]).to.be.instanceof(Server);
        expect(config[0].port).to.equal(80);
      }, done, done);
    });

    it('should throw an error if the parsed YAML configuration has no `routes` and no `target` properties', done => {
      (new Application)._parseConfig('port: 80').subscribe({
        complete: () => done(new Error('Error not thrown.')),
        error: () => done()
      });
    });

    it.skip('should completes with an array if the parsed YAML configuration is valid', done => {
      (new Application)._parseConfig('port: 80\ntarget: 3000').subscribe(config => {
        console.dir(config);
        expect(config).to.be.an('array').and.have.lengthOf(1);
        expect(config[0]).to.be.instanceof(Server);
        expect(config[0].port).to.equal(80);
      }, done, done);
    });
  });
});
