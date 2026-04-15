/**
 * Structured async logger for Surfaced automation scripts.
 * 
 * Features:
 * - JSON-formatted log lines for machine parsing in CI
 * - Severity levels: debug, info, warn, error
 * - Automatic timing for operations
 * - Run context (workflow, timestamp, category)
 * - Async-safe: buffers writes, flushes on process exit
 * - Falls back to console in non-CI environments
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
    this._buffer = [];
    this._timers = new Map();

    // Flush on exit
    process.on('exit', () => this.flush());
    process.on('SIGINT', () => { this.flush(); process.exit(1); });
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
      // Structured JSON for CI log parsing
      const json = JSON.stringify(entry);
      if (level === 'error') {
        console.error(json);
      } else {
        console.log(json);
      }
    } else {
      // Human-readable for local dev
      const icon = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
      const prefix = data.category ? `[${data.category}] ` : '';
      console.log(`${icon} ${prefix}${message}${data.duration ? ` (${data.duration}ms)` : ''}`);
    }

    this._buffer.push(entry);
  }

  debug(msg, data) { this._emit('debug', msg, data); }
  info(msg, data) { this._emit('info', msg, data); }
  warn(msg, data) { this._emit('warn', msg, data); }
  error(msg, data) { this._emit('error', msg, data); }

  /** Start a named timer */
  time(label) {
    this._timers.set(label, Date.now());
  }

  /** End a named timer and log the duration */
  timeEnd(label, data = {}) {
    const start = this._timers.get(label);
    if (start) {
      const duration = Date.now() - start;
      this._timers.delete(label);
      this.info(`${label} completed`, { ...data, duration });
      return duration;
    }
  }

  /** Log a summary of the run */
  summary(stats) {
    this.info('Run summary', { ...stats, type: 'summary' });
  }

  /** Flush buffer (no-op for console, but extensible for file/remote logging) */
  flush() {
    // Future: write this._buffer to a log file or send to a logging service
    this._buffer = [];
  }

  /** Create a child logger with additional context */
  child(extraContext) {
    const child = new Logger({ ...this.context, ...extraContext });
    child._buffer = this._buffer; // Share buffer with parent
    return child;
  }
}

export function createLogger(context) {
  return new Logger(context);
}

export default Logger;
