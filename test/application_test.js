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
      expect(new Application().debug).to.be.false;
    });

    it('should be `true` in development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(new Application().debug).to.be.true;
    });
  });

  /**
   * @test {Application#env}
   */
  describe('#env', () => {
    it('should be "development" if the NODE_ENV environment variable is not set', () => {
      delete process.env.NODE_ENV;
      expect(new Application().env).to.equal('development');
    });

    it('should equal the value of `NODE_ENV` environment variable when it is set', () => {
      process.env.NODE_ENV = 'production';
      expect(new Application().env).to.equal('production');
    });
  });

  /**
   * @test {Application#init}
   */
  describe('#init()', () => {
    it('should initialize the `servers` property from the command line arguments', async () => {
      let app = new Application();
      await app.init({port: 80, target: 3000});
      expect(app.servers).to.be.an('array').and.have.lengthOf(1);
      expect(app.servers[0].port).to.equal(80);
    });

    it('should initialize the `servers` property from the JSON configuration', async () => {
      let app = new Application();
      await app.init({config: `${__dirname}/../example/json/basic_standalone.json`});
      expect(app.servers).to.be.an('array').and.have.lengthOf(1);
      expect(app.servers[0].port).to.equal(80);
    });

    it('should initialize the `servers` property from the YAML configuration', async () => {
      let app = new Application();
      await app.init({config: `${__dirname}/../example/yaml/basic_standalone.yaml`});
      expect(app.servers).to.be.an('array').and.have.lengthOf(1);
      expect(app.servers[0].port).to.equal(80);
    });
  });

  /**
   * @test {Application#_parseConfig}
   */
  describe('#_parseConfig()', () => {
    it('should throw an error if the parsed JSON configuration has no `routes` and no `target` properties', async () => {
      try {
        await new Application()._parseConfig('{"port": 80}');
        expect(true).to.not.be.ok;
      }

      catch (err) {
        expect(true).to.be.ok;
      }
    });

    it('should completes with an array if the parsed JSON configuration is valid', async () => {
      let config = await new Application()._parseConfig('{"port": 80, "target": 3000}');
      expect(config).to.be.an('array').and.have.lengthOf(1);
      expect(config[0]).to.be.instanceOf(Server);
      expect(config[0].port).to.equal(80);
    });

    it('should throw an error if the parsed YAML configuration has no `routes` and no `target` properties', async () => {
      try {
        await new Application()._parseConfig('port: 80');
        expect(true).to.not.be.ok;
      }

      catch (err) {
        expect(true).to.be.ok;
      }
    });

    it('should completes with an array if the parsed YAML configuration is valid', async () => {
      let config = await new Application()._parseConfig('port: 80\ntarget: 3000');
      expect(config).to.be.an('array').and.have.lengthOf(1);
      expect(config[0]).to.be.instanceOf(Server);
      expect(config[0].port).to.equal(80);
    });
  });
});
