'use strict';

const AgentSession = require('./AgentSession');

/**
 * Codex CLI session.
 * Spawns the Codex CLI for OpenAI Codex interactions.
 */
class CodexSession extends AgentSession {
  /**
   * @param {Object} options
   * @param {string} [options.model='gpt-4o'] - Model to use
   * @param {string[]} [options.args] - Additional CLI arguments
   * @param {Object} [options.env] - Environment variables
   */
  constructor(options = {}) {
    super({
      command: 'codex',
      args: options.args || [],
      env: options.env,
      name: 'CodexSession'
    });

    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.model = options.model || 'gpt-4o';
    this.systemPrompt = options.systemPrompt || 'You are a helpful coding assistant.';
  }

  async start() {
    // Set up API key and model
    this.env.OPENAI_API_KEY = this.apiKey;
    
    this.args = [
      '--model', this.model,
      '--no-interactive',
      ...this.args
    ];

    return super.start();
  }

  handleOutput(data) {
    // Parse JSON responses from Codex
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
      ? { role: 'user', content: msg } 
      : msg;

    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('Codex session not started'));
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

module.exports = CodexSession;
