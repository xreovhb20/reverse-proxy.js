'use strict';

import assert from 'assert';
import {Observable, Subject} from 'rxjs';
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
   * @test {Server#listening}
   */
  describe('#listening', () => {
    let server = new Server({address: '127.0.0.1', port: 0});

    it('should return `true` when the server is listening', () => {
      assert.ok(!server.listening);
      return server.listen().then(() => assert.ok(server.listening));
    });

    it('should return `false` when the server is not listening', () => {
      assert.ok(server.listening);
      return server.close().then(() => assert.ok(!server.listening));
    });
  });

  /**
   * @test {Server#onClose}
   */
  describe('#onClose', () => {
    it('should return an Observable instead of the underlying Subject', () => {
      let stream = new Server().onClose;
      assert.ok(stream instanceof Observable);
      assert.ok(!(stream instanceof Subject));
    });
  });

  /**
   * @test {Server#onError}
   */
  describe('#onError', () => {
    it('should return an Observable instead of the underlying Subject', () => {
      let stream = new Server().onError;
      assert.ok(stream instanceof Observable);
      assert.ok(!(stream instanceof Subject));
    });
  });

  /**
   * @test {Server#onListen}
   */
  describe('#onListen', () => {
    it('should return an Observable instead of the underlying Subject', () => {
      let stream = new Server().onListen;
      assert.ok(stream instanceof Observable);
      assert.ok(!(stream instanceof Subject));
    });
  });

  /**
   * @test {Server#onRequest}
   */
  describe('#onRequest', () => {
    it('should return an Observable instead of the underlying Subject', () => {
      let stream = new Server().onRequest;
      assert.ok(stream instanceof Observable);
      assert.ok(!(stream instanceof Subject));
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
      assert.equal(new Server()._getHostName({headers: {host: 'belin.io:8080'}}), 'belin.io');
    });
  });
});
