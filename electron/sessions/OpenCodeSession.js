'use strict';

const AgentSession = require('./AgentSession');

/**
 * OpenCode CLI session.
 * Spawns the OpenCode CLI for open-source code assistance.
 */
class OpenCodeSession extends AgentSession {
  /**
   * @param {Object} options
   * @param {string} [options.model='opencode'] - Model to use
   * @param {string[]} [options.args] - Additional CLI arguments
   * @param {Object} [options.env] - Environment variables
   */
  constructor(options = {}) {
    super({
      command: 'opencode',
      args: options.args || ['--output-format', 'json'],
      env: options.env,
      name: 'OpenCodeSession'
    });

    this.apiEndpoint = options.apiEndpoint || process.env.OPENCODE_API_ENDPOINT;
    this.model = options.model || 'opencode';
  }

  async start() {
    if (this.apiEndpoint) {
      this.env.OPENCODE_API_ENDPOINT = this.apiEndpoint;
    }
    
    this.args = [
      '--model', this.model,
      ...this.args
    ];

    return super.start();
  }

  handleOutput(data) {
    // Parse JSON responses from OpenCode CLI
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
    const message = typeof msg === 'string' 
      ? { prompt: msg } 
      : msg;

    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('OpenCode session not started'));
        return;
      }

      this.once('response', (response) => {
        resolve(response);
      });

      this.process.stdin.write(JSON.stringify(message) + '\n', (err) => {
        if (err) reject(err);
      });
    });
  }
}

module.exports = OpenCodeSession;
