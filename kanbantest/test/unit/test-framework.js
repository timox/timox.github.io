// === test/unit/test-framework.js ===
// Lightweight test framework for vanilla JS browser-based testing.
// No npm, no build tools -- just open test-runner.html in a browser.

const TestFramework = (function () {
  'use strict';
  const suites = [];
  let currentSuite = null;

  function describe(name, fn) {
    const suite = {
      name, tests: [], beforeEachFn: null, afterEachFn: null,
      passed: 0, failed: 0, skipped: 0, errors: []
    };
    suites.push(suite);
    currentSuite = suite;
    try { fn(); } catch (err) {
      suite.errors.push({ test: '(suite setup)', error: err });
    }
    currentSuite = null;
  }

  function it(name, fn) {
    if (!currentSuite) throw new Error('it() must be called inside describe()');
    currentSuite.tests.push({ name, fn, skip: false });
  }
  it.skip = function (name, fn) {
    if (!currentSuite) throw new Error('it.skip() must be called inside describe()');
    currentSuite.tests.push({ name, fn, skip: true });
  };

  function beforeEach(fn) { if (currentSuite) currentSuite.beforeEachFn = fn; }
  function afterEach(fn) { if (currentSuite) currentSuite.afterEachFn = fn; }

  class AssertionError extends Error {
    constructor(message) { super(message); this.name = 'AssertionError'; }
  }

  const assert = {
    equal(actual, expected, msg) {
      if (actual !== expected)
        throw new AssertionError(msg || 'Expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    },
    deepEqual(actual, expected, msg) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new AssertionError(msg || 'Deep equal failed.\n  Expected: ' + JSON.stringify(expected) + '\n  Actual:   ' + JSON.stringify(actual));
    },
    ok(value, msg) {
      if (!value) throw new AssertionError(msg || 'Expected truthy value, got ' + JSON.stringify(value));
    },
    notOk(value, msg) {
      if (value) throw new AssertionError(msg || 'Expected falsy value, got ' + JSON.stringify(value));
    },
    strictEqual(actual, expected, msg) {
      if (actual !== expected)
        throw new AssertionError(msg || 'Strict equal: expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    },
    notEqual(actual, expected, msg) {
      if (actual === expected)
        throw new AssertionError(msg || 'Expected different values, both are ' + JSON.stringify(actual));
    },
    throws(fn, msg) {
      let threw = false;
      try { fn(); } catch (e) { threw = true; }
      if (!threw) throw new AssertionError(msg || 'Expected function to throw');
    },
    doesNotThrow(fn, msg) {
      try { fn(); } catch (e) {
        throw new AssertionError(msg || 'Unexpected throw: ' + e.message);
      }
    },
    isNull(value, msg) {
      if (value !== null) throw new AssertionError(msg || 'Expected null, got ' + JSON.stringify(value));
    },
    isNotNull(value, msg) {
      if (value === null) throw new AssertionError(msg || 'Expected non-null value');
    },
    isTrue(value, msg) {
      if (value !== true) throw new AssertionError(msg || 'Expected true, got ' + JSON.stringify(value));
    },
    isFalse(value, msg) {
      if (value !== false) throw new AssertionError(msg || 'Expected false, got ' + JSON.stringify(value));
    },
    includes(haystack, needle, msg) {
      const found = typeof haystack === 'string'
        ? haystack.includes(needle)
        : Array.isArray(haystack) && haystack.includes(needle);
      if (!found)
        throw new AssertionError(msg || 'Expected to include ' + JSON.stringify(needle));
    },
    match(value, regex, msg) {
      if (!regex.test(value))
        throw new AssertionError(msg || JSON.stringify(value) + ' does not match ' + regex);
    },
    typeOf(value, expectedType, msg) {
      if (typeof value !== expectedType)
        throw new AssertionError(msg || 'Expected type "' + expectedType + '", got "' + typeof value + '"');
    },
    instanceOf(value, constructor, msg) {
      if (!(value instanceof constructor))
        throw new AssertionError(msg || 'Expected instance of ' + constructor.name);
    },
    closeTo(actual, expected, delta, msg) {
      if (Math.abs(actual - expected) > delta)
        throw new AssertionError(msg || actual + ' not within ' + delta + ' of ' + expected);
    },
    lengthOf(value, expectedLength, msg) {
      const len = value && value.length !== undefined ? value.length : -1;
      if (len !== expectedLength)
        throw new AssertionError(msg || 'Expected length ' + expectedLength + ', got ' + len);
    },
    greaterThan(actual, expected, msg) {
      if (!(actual > expected))
        throw new AssertionError(msg || actual + ' not > ' + expected);
    },
    lessThan(actual, expected, msg) {
      if (!(actual < expected))
        throw new AssertionError(msg || actual + ' not < ' + expected);
    }
  };

  async function runAll() {
    let totalPassed = 0, totalFailed = 0, totalSkipped = 0;
    const startTime = performance.now();
    const results = [];

    for (const suite of suites) {
      suite.passed = 0; suite.failed = 0; suite.skipped = 0; suite.errors = [];
      for (const test of suite.tests) {
        if (test.skip) {
          suite.skipped++; totalSkipped++;
          results.push({ suite: suite.name, test: test.name, status: 'skipped', error: null, duration: 0 });
          continue;
        }
        const t0 = performance.now();
        try {
          if (suite.beforeEachFn) await suite.beforeEachFn();
          await test.fn();
          if (suite.afterEachFn) await suite.afterEachFn();
          suite.passed++; totalPassed++;
          results.push({ suite: suite.name, test: test.name, status: 'passed', error: null, duration: performance.now() - t0 });
        } catch (err) {
          if (suite.afterEachFn) { try { await suite.afterEachFn(); } catch (_) {} }
          suite.failed++; totalFailed++;
          suite.errors.push({ test: test.name, error: err });
          results.push({ suite: suite.name, test: test.name, status: 'failed', error: err.message, duration: performance.now() - t0 });
        }
      }
    }

    return {
      suites: suites.map(s => ({
        name: s.name, passed: s.passed, failed: s.failed, skipped: s.skipped,
        errors: s.errors.map(e => ({ test: e.test, message: e.error.message }))
      })),
      results,
      summary: {
        total: totalPassed + totalFailed + totalSkipped,
        passed: totalPassed, failed: totalFailed, skipped: totalSkipped,
        duration: Math.round(performance.now() - startTime)
      }
    };
  }

  function reset() { suites.length = 0; }

  function renderResults(results, container) {
    if (!container) return;
    container.innerHTML = '';

    const allGood = results.summary.failed === 0;
    const banner = document.createElement('div');
    banner.className = 'test-summary ' + (allGood ? 'test-summary-pass' : 'test-summary-fail');
    banner.innerHTML = '<strong>' + (allGood ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED') +
      '</strong> &mdash; ' + results.summary.passed + ' passed, ' +
      results.summary.failed + ' failed, ' + results.summary.skipped + ' skipped (' +
      results.summary.total + ' total in ' + results.summary.duration + 'ms)';
    container.appendChild(banner);

    for (const suite of results.suites) {
      const section = document.createElement('div');
      section.className = 'test-suite';
      const header = document.createElement('h3');
      header.className = 'test-suite-header';
      const cls = suite.failed > 0 ? 'suite-fail' : 'suite-pass';
      const icon = suite.failed > 0 ? 'FAIL' : 'PASS';
      header.innerHTML = '<span class="' + cls + '">[' + icon + ']</span> ' +
        suite.name + ' <small>(' + suite.passed + '/' +
        (suite.passed + suite.failed + suite.skipped) + ')</small>';
      section.appendChild(header);

      const list = document.createElement('ul');
      list.className = 'test-list';
      const suiteResults = results.results.filter(r => r.suite === suite.name);
      for (const r of suiteResults) {
        const li = document.createElement('li');
        li.className = 'test-item test-' + r.status;
        const si = r.status === 'passed' ? 'PASS' : r.status === 'failed' ? 'FAIL' : 'SKIP';
        let html = '<span class="test-status-' + r.status + '">[' + si + ']</span> ' + r.test;
        if (r.duration > 0) html += ' <small class="test-duration">(' + r.duration.toFixed(1) + 'ms)</small>';
        if (r.error) html += '<pre class="test-error">' +
          r.error.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
        li.innerHTML = html;
        list.appendChild(li);
      }
      section.appendChild(list);
      container.appendChild(section);
    }
  }

  return { describe, it, beforeEach, afterEach, assert, runAll, reset, renderResults };
})();

if (typeof window !== 'undefined') {
  window.TestFramework = TestFramework;
  window.describe = TestFramework.describe;
  window.it = TestFramework.it;
  window.beforeEach = TestFramework.beforeEach;
  window.afterEach = TestFramework.afterEach;
  window.assert = TestFramework.assert;
}
