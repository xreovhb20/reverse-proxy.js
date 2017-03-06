'use strict';

import {expect} from 'chai';
import {Application} from '../src/index';

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
    it('should be "production" if the NODE_ENV environment variable is not set', () => {
      delete process.env.NODE_ENV;
      expect(new Application().env).to.equal('production');
    });

    it('should equal the value of `NODE_ENV` environment variable when it is set', () => {
      process.env.NODE_ENV = 'development';
      expect(new Application().env).to.equal('development');
    });
  });

  /**
   * @test {Application#loadConfig}
   */
  describe('#loadConfig()', () => {
    it('should return an array of objects corresponding to the ones specified on the command line arguments', async () => {
      let config = await new Application().loadConfig({port: 80, target: 3000});
      expect(config).to.be.an('array').and.have.lengthOf(1);
      expect(config[0].port).to.equal(80);
      expect(config[0].target).to.equal(3000);
    });

    it('should return an array of objects corresponding to the ones specified in the JSON configuration', async () => {
      let config = await new Application().loadConfig({config: `${__dirname}/../example/json/basic_standalone.json`});
      expect(config).to.be.an('array').and.have.lengthOf(1);
      expect(config[0].port).to.equal(80);
      expect(config[0].target).to.equal(3000);
    });

    it('should return an array of objects corresponding to the ones specified in the YAML configuration', async () => {
      let config = await new Application().loadConfig({config: `${__dirname}/../example/yaml/basic_standalone.yaml`});
      expect(config).to.be.an('array').and.have.lengthOf(1);
      expect(config[0].port).to.equal(80);
      expect(config[0].target).to.equal(3000);
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
      expect(config[0]).to.be.an('object');
      expect(config[0].port).to.equal(80);
      expect(config[0].target).to.equal(3000);
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
      expect(config[0]).to.be.an('object');
      expect(config[0].port).to.equal(80);
      expect(config[0].target).to.equal(3000);
    });
  });
});
