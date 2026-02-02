// === test/unit/dom.test.js ===
// Tests for pure functions from js/utils/dom.js

function createElement(tagName, attributes, content) {
  attributes = attributes || {};
  content = content || '';
  const el = document.createElement(tagName);
  Object.entries(attributes).forEach(function ([key, value]) {
    if (key === 'className') el.className = value;
    else if (key === 'dataset') Object.entries(value).forEach(function ([dk, dv]) { el.dataset[dk] = dv; });
    else el.setAttribute(key, value);
  });
  if (content) el.innerHTML = content;
  return el;
}

function debounce(func, wait) {
  let timeout;
  return function () {
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () { func.apply(null, args); }, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments, ctx = this;
    if (!inThrottle) { func.apply(ctx, args); inThrottle = true; setTimeout(function () { inThrottle = false; }, limit); }
  };
}

// =================================================================
describe('dom.js -- createElement', function () {
  it('creates element with tag', function () { assert.equal(createElement('div').tagName, 'DIV'); });
  it('sets className', function () { assert.equal(createElement('span', { className: 'test' }).className, 'test'); });
  it('sets regular attributes', function () { const el = createElement('input', { type: 'text', id: 'x' }); assert.equal(el.getAttribute('type'), 'text'); assert.equal(el.getAttribute('id'), 'x'); });
  it('sets dataset', function () { const el = createElement('div', { dataset: { taskId: '42' } }); assert.equal(el.dataset.taskId, '42'); });
  it('sets innerHTML', function () { assert.includes(createElement('p', {}, 'Hello <b>world</b>').innerHTML, 'Hello'); });
  it('handles empty', function () { const el = createElement('div'); assert.equal(el.innerHTML, ''); });
  it('handles multiple attribute types', function () {
    const el = createElement('button', { className: 'btn', id: 'save', dataset: { action: 'save' }, type: 'button' }, 'Save');
    assert.equal(el.className, 'btn'); assert.equal(el.id, 'save'); assert.equal(el.dataset.action, 'save'); assert.includes(el.innerHTML, 'Save');
  });
});

describe('dom.js -- debounce', function () {
  it('calls eventually', function () {
    let called = false;
    const fn = debounce(function () { called = true; }, 10);
    fn();
    return new Promise(function (resolve) { setTimeout(function () { assert.isTrue(called); resolve(); }, 60); });
  });
  it('only calls once for rapid calls', function () {
    let count = 0;
    const fn = debounce(function () { count++; }, 50);
    fn(); fn(); fn();
    assert.equal(count, 0);
    return new Promise(function (resolve) { setTimeout(function () { assert.equal(count, 1); resolve(); }, 100); });
  });
});

describe('dom.js -- throttle', function () {
  it('calls immediately first time', function () { let c = 0; const fn = throttle(function () { c++; }, 100); fn(); assert.equal(c, 1); });
  it('blocks within throttle period', function () { let c = 0; const fn = throttle(function () { c++; }, 100); fn(); fn(); fn(); assert.equal(c, 1); });
  it('allows after period', function () {
    let c = 0;
    const fn = throttle(function () { c++; }, 20);
    fn(); assert.equal(c, 1);
    return new Promise(function (resolve) { setTimeout(function () { fn(); assert.equal(c, 2); resolve(); }, 50); });
  });
});
