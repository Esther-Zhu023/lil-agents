'use strict';

const http = require('http');
const { EventEmitter } = require('events');

/**
 * OpenClaw HTTP session.
 * Communicates via HTTP POST to localhost:18789
 */
class OpenClawSession extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.host='localhost'] - HTTP host
   * @param {number} [options.port=18789] - HTTP port
   * @param {Object} [options.headers] - Additional HTTP headers
   */
  constructor(options = {}) {
    super();
    this.host = options.host || 'localhost';
    this.port = options.port || 18789;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    this.isRunning = false;
    this.sessionId = null;
  }

  /**
   * Start the OpenClaw session (initialize HTTP connection).
   * @returns {Promise<void>}
   */
  async start() {
    return new Promise((resolve, reject) => {
      // Test connection
      const req = http.request({
        hostname: this.host,
        port: this.port,
        path: '/session/start',
        method: 'POST',
        headers: this.headers
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            this.sessionId = parsed.sessionId;
            this.isRunning = true;
            this.emit('start', parsed);
            resolve();
          } catch (err) {
            reject(new Error(`Failed to parse OpenClaw response: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`OpenClaw connection failed: ${err.message}`));
      });

      req.write(JSON.stringify({ type: 'start' }));
      req.end();
    });
  }

  /**
   * Send a message via HTTP POST.
   * @param {string|Object} msg - Message to send
   * @returns {Promise<any>}
   */
  async send(msg) {
    if (!this.isRunning) {
      throw new Error('OpenClaw session not started');
    }

    return new Promise((resolve, reject) => {
      const message = typeof msg === 'string' ? { text: msg } : msg;
      const body = JSON.stringify({
        sessionId: this.sessionId,
        message
      });

      const req = http.request({
        hostname: this.host,
        port: this.port,
        path: '/session/send',
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            this.emit('response', parsed);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse OpenClaw response: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Terminate the OpenClaw session.
   * @returns {Promise<void>}
   */
  async terminate() {
    return new Promise((resolve, reject) => {
      if (!this.sessionId) {
        this.isRunning = false;
        resolve();
        return;
      }

      const body = JSON.stringify({ sessionId: this.sessionId });

      const req = http.request({
        hostname: this.host,
        port: this.port,
        path: '/session/end',
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        this.isRunning = false;
        this.sessionId = null;
        this.emit('terminate');
        resolve();
      });

      req.on('error', (err) => {
        // Force terminate even on error
        this.isRunning = false;
        this.sessionId = null;
        this.emit('terminate');
        resolve();
      });

      req.write(body);
      req.end();
    });
  }
}

module.exports = OpenClawSession;
