'use strict';

const { spawn } = require('child_process');
const { EventEmitter } = require('events');

/**
 * Base class for all agent sessions.
 * Provides spawn/stdio pattern for CLI-based agents.
 */
class AgentSession extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} options.command - The CLI command to spawn
   * @param {string[]} options.args - Arguments to pass to the CLI
   * @param {Object} options.env - Environment variables
   * @param {string} options.name - Session name for logging
   */
  constructor(options = {}) {
    super();
    this.command = options.command || '';
    this.args = options.args || [];
    this.env = { ...process.env, ...options.env };
    this.name = options.name || 'AgentSession';
    this.process = null;
    this.isRunning = false;
    this.buffer = '';
  }

  /**
   * Start the agent process. Override in subclasses.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      throw new Error(`${this.name} is already running`);
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.command, this.args, {
          env: this.env,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
          this.buffer += data.toString();
          this.handleOutput(this.buffer);
        });

        this.process.stderr.on('data', (data) => {
          this.emit('error', data.toString());
        });

        this.process.on('error', (err) => {
          this.isRunning = false;
          this.emit('error', err);
          reject(err);
        });

        this.process.on('exit', (code, signal) => {
          this.isRunning = false;
          if (code !== 0) {
            this.emit('exit', code, signal);
          }
        });

        this.isRunning = true;
        this.emit('start');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Handle output from the process. Override for custom parsing.
   * @param {string} data - Raw output data
   */
  handleOutput(data) {
    // Default: emit raw output
    this.emit('output', data);
  }

  /**
   * Send a message to the agent. Override in subclasses.
   * @param {string|Object} msg - Message to send
   * @returns {Promise<any>}
   */
  async send(msg) {
    if (!this.isRunning || !this.process) {
      throw new Error(`${this.name} is not running`);
    }

    return new Promise((resolve, reject) => {
      const message = typeof msg === 'string' ? msg : JSON.stringify(msg);
      
      this.once('response', (response) => {
        resolve(response);
      });

      this.process.stdin.write(message + '\n', (err) => {
        if (err) reject(err);
      });
    });
  }

  /**
   * Terminate the agent process.
   * @param {number} signal - Signal to send (default: SIGTERM)
   * @returns {Promise<void>}
   */
  async terminate(signal = 'SIGTERM') {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.isRunning = false;
        this.emit('terminate');
        resolve();
      });

      this.process.kill(signal);
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.isRunning) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }
}

module.exports = AgentSession;
