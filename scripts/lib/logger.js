/**
 * Structured async logger for Surfaced automation scripts (CommonJS version).
 * See logger.mjs for the ESM version with full documentation.
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];
const IS_CI = !!process.env.CI;

class Logger {
  constructor(context = {}) {
    this.context = {
      workflow: process.env.GITHUB_WORKFLOW || 'local',
      runId: process.env.GITHUB_RUN_ID || 'local',
      ...context,
    };
    this._timers = new Map();
  }

  _emit(level, message, data = {}) {
    if (LOG_LEVELS[level] < MIN_LEVEL) return;

    const entry = {
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...this.context,
      ...data,
    };

    if (IS_CI) {
      const json = JSON.stringify(entry);
      level === 'error' ? console.error(json) : console.log(json);
    } else {
      const icon = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
      const prefix = data.category ? `[${data.category}] ` : '';
      console.log(`${icon} ${prefix}${message}${data.duration ? ` (${data.duration}ms)` : ''}`);
    }
  }

  debug(msg, data) { this._emit('debug', msg, data); }
  info(msg, data) { this._emit('info', msg, data); }
  warn(msg, data) { this._emit('warn', msg, data); }
  error(msg, data) { this._emit('error', msg, data); }

  time(label) { this._timers.set(label, Date.now()); }

  timeEnd(label, data = {}) {
    const start = this._timers.get(label);
    if (start) {
      const duration = Date.now() - start;
      this._timers.delete(label);
      this.info(`${label} completed`, { ...data, duration });
      return duration;
    }
  }

  summary(stats) { this.info('Run summary', { ...stats, type: 'summary' }); }

  child(extraContext) {
    return new Logger({ ...this.context, ...extraContext });
  }
}

function createLogger(context) {
  return new Logger(context);
}

module.exports = { Logger, createLogger };
