'use strict';

const AgentSession = require('./AgentSession');

/**
 * Copilot CLI session.
 * Spawns the GitHub Copilot CLI for Copilot interactions.
 */
class CopilotSession extends AgentSession {
  /**
   * @param {Object} options
   * @param {string[]} [options.args] - Additional CLI arguments
   * @param {Object} [options.env] - Environment variables
   */
  constructor(options = {}) {
    super({
      command: 'gh',
      args: ['copilot', 'suggest', '--print'],
      env: options.env,
      name: 'CopilotSession'
    });

    this.token = options.token || process.env.GITHUB_TOKEN;
  }

  async start() {
    // Set up GitHub token
    this.env.GITHUB_TOKEN = this.token;
    
    return super.start();
  }

  handleOutput(data) {
    // Parse responses from Copilot CLI
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
    const message = typeof msg === 'string' ? msg : JSON.stringify(msg);

    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('Copilot session not started'));
        return;
      }

      this.once('response', (response) => {
        resolve(response);
      });

      this.process.stdin.write(message + '\n', (err) => {
        if (err) reject(err);
      });
    });
  }
}

module.exports = CopilotSession;
