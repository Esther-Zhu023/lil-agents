'use strict';

const AgentSession = require('./AgentSession');
const path = require('path');
const fs = require('fs');

/**
 * Hermes Python wrapper session.
 * Uses the hermes-json-wrapper.py Python script at ~/.local/bin/hermes-json-wrapper.py
 */
class HermesSession extends AgentSession {
  /**
   * @param {Object} options
   * @param {string} [options.pythonPath] - Path to Python interpreter
   * @param {string} [options.wrapperPath] - Path to hermes-json-wrapper.py
   * @param {Object} [options.env] - Environment variables
   */
  constructor(options = {}) {
    const wrapperPath = options.wrapperPath || 
      path.join(process.env.HOME || '', '.local/bin/hermes-json-wrapper.py');
    
    // Verify wrapper exists
    if (!fs.existsSync(wrapperPath)) {
      console.warn(`Hermes wrapper not found at ${wrapperPath}, will attempt to use anyway`);
    }

    super({
      command: options.pythonPath || 'python3',
      args: [wrapperPath],
      env: options.env,
      name: 'HermesSession'
    });

    this.wrapperPath = wrapperPath;
    this.pythonPath = options.pythonPath || 'python3';
  }

  async start() {
    this.args = [this.wrapperPath];
    return super.start();
  }

  handleOutput(data) {
    // Hermes wrapper outputs JSON lines
    try {
      const lines = this.buffer.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          this.emit('response', parsed);
          this.buffer = '';
        } catch {
          // Accumulate until complete JSON
        }
      }
    } catch {
      this.emit('output', data);
    }
  }

  async send(msg) {
    const message = typeof msg === 'string' ? { text: msg } : msg;
    
    return new Promise((resolve, reject) => {
      this.once('response', (response) => {
        resolve(response);
      });

      if (!this.process || !this.process.stdin) {
        reject(new Error('Hermes process not available'));
        return;
      }

      this.process.stdin.write(JSON.stringify(message) + '\n', (err) => {
        if (err) reject(err);
      });
    });
  }
}

module.exports = HermesSession;
