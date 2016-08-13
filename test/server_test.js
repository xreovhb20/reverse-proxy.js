/**
 * Unit tests of the `server` module.
 * @module test/server_test
 */
const assert = require('assert');
const {Server} = require('../lib');

/**
 * Tests the features of the `Server` class.
 */
class ServerTest {

  /**
   * Runs the unit tests.
   */
  run() {
    let self = this;
    describe('Server', function() {
      describe('address', self.testAddress);
      describe('port', self.testPort);
      describe('_getHostName()', self.testGetHostName);
    });
  }

  /**
   * Tests the `_getHostName` method.
   */
  testGetHostName() {
    it('it should return "*" if there is no "Host" header in the request', () =>
      assert.equal(new Server()._getHostName({headers: {}}), '*')
    );

    it('it should return the "Host" header found in the request, without the port number', () =>
      assert.equal(new Server()._getHostName({headers: {host: 'www.belin.io:8080'}}), 'www.belin.io')
    );
  }

  /**
   * Tests the `address` property.
   */
  testAddress() {
    it('should have an "any IPv4" address as the default address', () =>
      assert.equal(new Server().address, Server.DEFAULT_ADDRESS)
    );

    it('should have the same host as the specified one', () =>
      assert.equal(new Server({address: 'localhost'}).address, 'localhost')
    );
  }

  /**
   * Tests the `port` property.
   */
  testPort() {
    it('should have 3000 as the default port', () =>
      assert.equal(new Server().port, Server.DEFAULT_PORT)
    );

    it('should have the same port as the specified one', () =>
      assert.equal(new Server({port: 8080}).port, 8080)
    );
  }
}

// Run all tests.
new ServerTest().run();
