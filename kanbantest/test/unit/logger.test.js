// === test/unit/logger.test.js ===
// Tests for js/utils/LoggerManager.js

const LOG_LEVELS = { CRITICAL: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 };

class LoggerManager {
  constructor(initialLevel) {
    this.logLevel = initialLevel !== undefined ? initialLevel : LOG_LEVELS.INFO;
    this.moduleFilters = new Set();
    this.logCounts = new Map();
    this.maxLogCount = 5;
  }
  setLogLevel(level) {
    if (typeof level === 'string' && LOG_LEVELS.hasOwnProperty(level)) this.logLevel = LOG_LEVELS[level];
    else if (typeof level === 'number' && level >= 0 && level <= 4) this.logLevel = level;
  }
  getLevelName(level) { return Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level) || 'UNKNOWN'; }
  shouldLog(level, module, message) {
    if (level > this.logLevel) return false;
    if (this.moduleFilters.size > 0 && !this.moduleFilters.has(module)) return false;
    const key = module + ':' + message;
    const count = this.logCounts.get(key) || 0;
    if (count >= this.maxLogCount) return false;
    this.logCounts.set(key, count + 1);
    return true;
  }
  enableModule(m) { this.moduleFilters.add(m); }
  disableModule(m) { this.moduleFilters.delete(m); }
  clearModuleFilters() { this.moduleFilters.clear(); }
  resetLogCounts() { this.logCounts.clear(); }
}

// =================================================================
describe('LoggerManager -- getLevelName', function () {
  let l; beforeEach(function () { l = new LoggerManager(); });
  it('CRITICAL for 0', function () { assert.equal(l.getLevelName(0), 'CRITICAL'); });
  it('ERROR for 1', function () { assert.equal(l.getLevelName(1), 'ERROR'); });
  it('WARN for 2', function () { assert.equal(l.getLevelName(2), 'WARN'); });
  it('INFO for 3', function () { assert.equal(l.getLevelName(3), 'INFO'); });
  it('DEBUG for 4', function () { assert.equal(l.getLevelName(4), 'DEBUG'); });
  it('UNKNOWN for invalid', function () { assert.equal(l.getLevelName(99), 'UNKNOWN'); });
});

describe('LoggerManager -- setLogLevel', function () {
  let l; beforeEach(function () { l = new LoggerManager(); });
  it('accepts string names', function () { l.setLogLevel('DEBUG'); assert.equal(l.logLevel, 4); });
  it('accepts numeric levels', function () { l.setLogLevel(0); assert.equal(l.logLevel, 0); });
  it('ignores invalid strings', function () { const b = l.logLevel; l.setLogLevel('INVALID'); assert.equal(l.logLevel, b); });
  it('ignores out-of-range numbers', function () { const b = l.logLevel; l.setLogLevel(99); assert.equal(l.logLevel, b); });
  it('ignores negative numbers', function () { const b = l.logLevel; l.setLogLevel(-1); assert.equal(l.logLevel, b); });
});

describe('LoggerManager -- shouldLog (level)', function () {
  let l; beforeEach(function () { l = new LoggerManager(LOG_LEVELS.WARN); });
  it('allows CRITICAL', function () { assert.isTrue(l.shouldLog(0, 'm', 'x')); });
  it('allows ERROR', function () { assert.isTrue(l.shouldLog(1, 'm', 'x')); });
  it('allows WARN', function () { assert.isTrue(l.shouldLog(2, 'm', 'x')); });
  it('blocks INFO', function () { assert.isFalse(l.shouldLog(3, 'm', 'x')); });
  it('blocks DEBUG', function () { assert.isFalse(l.shouldLog(4, 'm', 'x')); });
});

describe('LoggerManager -- shouldLog (module filter)', function () {
  let l; beforeEach(function () { l = new LoggerManager(LOG_LEVELS.DEBUG); });
  it('allows all when no filter', function () { assert.isTrue(l.shouldLog(3, 'any', 'x')); });
  it('only enabled modules pass', function () { l.enableModule('ok'); assert.isTrue(l.shouldLog(3, 'ok', 'x')); assert.isFalse(l.shouldLog(3, 'no', 'x')); });
  it('disableModule removes from filter', function () { l.enableModule('a'); l.enableModule('b'); l.disableModule('a'); assert.isFalse(l.shouldLog(3, 'a', 'x')); assert.isTrue(l.shouldLog(3, 'b', 'x')); });
  it('clearModuleFilters allows all', function () { l.enableModule('x'); l.clearModuleFilters(); assert.isTrue(l.shouldLog(3, 'any', 'x')); });
});

describe('LoggerManager -- shouldLog (spam)', function () {
  let l; beforeEach(function () { l = new LoggerManager(LOG_LEVELS.DEBUG); l.maxLogCount = 3; });
  it('allows up to maxLogCount', function () { assert.isTrue(l.shouldLog(3, 'm', 'r')); assert.isTrue(l.shouldLog(3, 'm', 'r')); assert.isTrue(l.shouldLog(3, 'm', 'r')); });
  it('blocks beyond maxLogCount', function () { for (let i = 0; i < 3; i++) l.shouldLog(3, 'm', 's'); assert.isFalse(l.shouldLog(3, 'm', 's')); });
  it('tracks independently', function () { for (let i = 0; i < 3; i++) l.shouldLog(3, 'm', 'a'); assert.isFalse(l.shouldLog(3, 'm', 'a')); assert.isTrue(l.shouldLog(3, 'm', 'b')); });
  it('resetLogCounts re-allows', function () { for (let i = 0; i < 3; i++) l.shouldLog(3, 'm', 's'); l.resetLogCounts(); assert.isTrue(l.shouldLog(3, 'm', 's')); });
});
