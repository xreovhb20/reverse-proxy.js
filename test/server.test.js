import assert from 'assert';
import {Server} from '../src';

/**
 * @test {Server}
 */
describe('Server', () => {

  /**
   * @test {Server#address}
   */
  describe('#address', () => {
    it('should have an "any IPv4" address as the default address', () => {
      assert.equal(new Server().address, Server.DEFAULT_ADDRESS);
    });

    it('should have the same host as the specified one', () => {
      assert.equal(new Server({address: 'localhost'}).address, 'localhost');
    });
  });

  /**
   * @test {Server#port}
   */
  describe('#port', () => {
    it('should have 3000 as the default port', () => {
      assert.equal(new Server().port, Server.DEFAULT_PORT);
    });

    it('should have the same port as the specified one', () => {
      assert.equal(new Server({port: 8080}).port, 8080);
    });
  });

  /**
   * @test {Server#_getHostName}
   */
  describe('#_getHostName()', () => {
    it('it should return "*" if there is no "Host" header in the request', () => {
      assert.equal(new Server()._getHostName({headers: {}}), '*');
    });

    it('it should return the "Host" header found in the request, without the port number', () => {
      assert.equal(new Server()._getHostName({headers: {host: 'www.belin.io:8080'}}), 'www.belin.io');
    });
  });
});
