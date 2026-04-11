'use strict';

const AgentSession = require('./AgentSession');

/**
 * Gemini CLI session.
 * Spawns the Gemini CLI for Google Gemini interactions.
 */
class GeminiSession extends AgentSession {
  /**
   * @param {Object} options
   * @param {string} [options.model='gemini-2.5-flash'] - Model to use
   * @param {string[]} [options.args] - Additional CLI arguments
   * @param {Object} [options.env] - Environment variables
   */
  constructor(options = {}) {
    super({
      command: 'gemini',
      args: options.args || [],
      env: options.env,
      name: 'GeminiSession'
    });

    this.apiKey = options.apiKey || process.env.GOOGLE_API_KEY;
    this.model = options.model || 'gemini-2.5-flash';
  }

  async start() {
    // Set up API key
    this.env.GOOGLE_API_KEY = this.apiKey;
    
    this.args = [
      '--model', this.model,
      '--no-web-search',
      ...this.args
    ];

    return super.start();
  }

  handleOutput(data) {
    // Parse responses from Gemini CLI
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
      if (!this.process) {
        reject(new Error('Gemini session not started'));
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

module.exports = GeminiSession;
