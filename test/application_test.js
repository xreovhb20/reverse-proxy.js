import chai from 'chai';
import {Application, Server} from '../lib/index.js';

/** Tests the features of the {@link Application} class. */
describe('Application', () => {
  describe('.debug', () => {
    it('should be `false` in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(new Application().debug).to.be.false;
    });

    it('should be `true` in development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(new Application().debug).to.be.true;
    });
  });

  describe('.environment', () => {
    it('should be "development" if the `NODE_ENV` environment variable is not set', () => {
      delete process.env.NODE_ENV;
      expect(new Application().environment).to.equal('development');
    });

    it('should equal the value of `NODE_ENV` environment variable when it is set', () => {
      process.env.NODE_ENV = 'production';
      expect(new Application().environment).to.equal('production');
    });
  });

  describe('.init()', () => {
    it('should initialize the `servers` property from the command line arguments', async () => {
      const app = new Application;
      await app.init({port: 80, target: 3000});
      expect(app.servers).to.be.an('array').and.have.lengthOf(1);
      expect(app.servers[0].port).to.equal(80);
    });

    it('should initialize the `servers` property from the JSON configuration', async () => {
      const app = new Application;
      await app.init({config: `${__dirname}/fixtures/config.json`});
      expect(app.servers).to.be.an('array').and.have.lengthOf(1);
      expect(app.servers[0].port).to.equal(80);
    });

    it('should initialize the `servers` property from the YAML configuration', async () => {
      const app = new Application;
      await app.init({config: `${__dirname}/fixtures/config.yaml`});
      expect(app.servers).to.be.an('array').and.have.lengthOf(1);
      expect(app.servers[0].port).to.equal(80);
    });
  });

  describe('._parseConfiguration()', () => {
    it('should throw an error if the configuration has an invalid format', async () => {
      try {
        await Application._parseConfig('"FooBar"');
        expect.fail('Error not thrown');
      }

      catch (err) {
        expect(true).to.be.ok;
      }
    });

    it('should throw an error if the parsed JSON configuration has no `routes` and no `target` properties', async () => {
      try {
        await Application._parseConfig('{"port": 80}');
        expect.fail('Error not thrown');
      }

      catch (err) {
        expect(true).to.be.ok;
      }
    });

    it('should throw an error if the parsed YAML configuration has no `routes` and no `target` properties', async () => {
      try {
        await Application._parseConfig('port: 80');
        expect.fail('Error not thrown');
      }

      catch (err) {
        expect(true).to.be.ok;
      }
    });

    it('should completes with an array if the parsed JSON configuration is valid', async () => {
      const configuration = await Application._parseConfig('{"port": 80, "target": 3000}');
      expect(configuration).to.be.an('array').and.have.lengthOf(1);
      expect(configuration[0]).to.be.an.instanceof(Server);
      expect(configuration[0].port).to.equal(80);
    });

    it('should completes with an array if the parsed YAML configuration is valid', async () => {
      const configuration = await Application._parseConfig('port: 80\ntarget: 3000');
      expect(configuration).to.be.an('array').and.have.lengthOf(1);
      expect(configuration[0]).to.be.an.instanceof(Server);
      expect(configuration[0].port).to.equal(80);
    });

    it('should handle the loading of certificate files', async () => {
      const settings = `{
        "target": 3000,
        "ssl": {
          "cert": "test/fixtures/cert.pem",
          "key": "test/fixtures/key.pem"
        }
      }`;

      const configuration = await Application._parseConfig(settings);
      expect(configuration).to.be.an('array').and.have.lengthOf(1);
      expect(configuration[0]).to.be.an.instanceof(Server);

      const cert = configuration[0]._options.ssl.cert;
      expect(cert).to.be.an.instanceof(Buffer);
      expect(cert.toString()).to.contain('-----BEGIN CERTIFICATE-----');

      const key = configuration[0]._options.ssl.key;
      expect(key).to.be.an.instanceof(Buffer);
      expect(key.toString()).to.contain('-----BEGIN ENCRYPTED PRIVATE KEY-----');
    });
  });
});
