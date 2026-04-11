'use strict';

const AgentSession = require('./AgentSession');

/**
 * Claude CLI session.
 * Spawns the 'claude' CLI for Anthropic Claude interactions.
 */
class ClaudeSession extends AgentSession {
  /**
   * @param {Object} options
   * @param {string[]} [options.args] - Additional CLI arguments
   * @param {Object} [options.env] - Environment variables
   */
  constructor(options = {}) {
    super({
      command: 'claude',
      args: options.args || ['--print'],
      env: options.env,
      name: 'ClaudeSession'
    });
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = options.model || 'claude-3-5-sonnet-20241022';
  }

  async start() {
    // Prepend API key and model options
    const args = [
      '--api-key', this.apiKey,
      '--model', this.model,
      ...this.args
    ];
    
    this.args = args;
    return super.start();
  }

  handleOutput(data) {
    // Parse Claude's JSON responses
    try {
      const lines = this.buffer.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          this.emit('response', parsed);
          this.buffer = '';
        } catch {
          // Accumulate buffer until we get valid JSON
        }
      }
    } catch (err) {
      this.emit('output', data);
    }
  }

  async send(msg) {
    const message = typeof msg === 'string' ? { text: msg } : msg;
    
    if (!this.process) {
      throw new Error('Claude session not started');
    }

    return new Promise((resolve, reject) => {
      this.once('response', (response) => {
        resolve(response);
      });

      this.process.stdin.write(JSON.stringify(message) + '\n', (err) => {
        if (err) reject(err);
      });
    });
  }
}

module.exports = ClaudeSession;
