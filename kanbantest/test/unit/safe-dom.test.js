// === test/unit/safe-dom.test.js ===
// Tests for js/utils/safe-dom.js

// ---- Inline copies of functions under test ----

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeCreateElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') { el.className = value; }
    else if (key === 'textContent') { el.textContent = value; }
    else if (key === 'dataset' && typeof value === 'object') { for (const [dk, dv] of Object.entries(value)) { el.dataset[dk] = dv; } }
    else if (key === 'style' && typeof value === 'object') { for (const [sk, sv] of Object.entries(value)) { el.style[sk] = sv; } }
    else { el.setAttribute(key, value); }
  }
  for (const child of children) {
    if (typeof child === 'string') { el.appendChild(document.createTextNode(child)); }
    else if (child instanceof Node) { el.appendChild(child); }
  }
  return el;
}

// ---- Tests ----

TestFramework.describe('escapeHTML', function () {

  it('should return empty string for null input', function () {
    assert.equal(escapeHTML(null), '');
  });

  it('should return empty string for undefined input', function () {
    assert.equal(escapeHTML(undefined), '');
  });

  it('should return empty string for empty string input', function () {
    assert.equal(escapeHTML(''), '');
  });

  it('should leave regular text unchanged', function () {
    assert.equal(escapeHTML('Hello world'), 'Hello world');
  });

  it('should escape < and >', function () {
    assert.equal(escapeHTML('<div>'), '&lt;div&gt;');
  });

  it('should escape &', function () {
    assert.equal(escapeHTML('a & b'), 'a &amp; b');
  });

  it('should escape double quotes', function () {
    assert.equal(escapeHTML('"hello"'), '&quot;hello&quot;');
  });

  it('should escape single quotes', function () {
    assert.equal(escapeHTML("it's"), "it&#039;s");
  });

  it('should escape a full XSS script payload', function () {
    assert.equal(
      escapeHTML('<script>alert(1)</script>'),
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('should escape an img onerror XSS payload', function () {
    assert.equal(
      escapeHTML('<img onerror=alert(1)>'),
      '&lt;img onerror=alert(1)&gt;'
    );
  });

  it('should coerce number input to string', function () {
    assert.equal(escapeHTML(42), '42');
    assert.equal(escapeHTML(0), '0');
    assert.equal(escapeHTML(-3.14), '-3.14');
  });

  it('should escape a string with multiple special characters', function () {
    assert.equal(
      escapeHTML('<a href="x">&test</a>'),
      '&lt;a href=&quot;x&quot;&gt;&amp;test&lt;/a&gt;'
    );
  });

  it('should double-escape an already-escaped string', function () {
    assert.equal(escapeHTML('&amp;'), '&amp;amp;');
    assert.equal(escapeHTML('&lt;'), '&amp;lt;');
  });

  it('should handle mixed content with normal text and HTML', function () {
    assert.equal(
      escapeHTML('Hello <b>world</b> & "friends"'),
      'Hello &lt;b&gt;world&lt;/b&gt; &amp; &quot;friends&quot;'
    );
  });

  it('should return the string representation of boolean input', function () {
    assert.equal(escapeHTML(true), 'true');
    assert.equal(escapeHTML(false), 'false');
  });

});

TestFramework.describe('safeCreateElement', function () {

  it('should create an element with the correct tag name', function () {
    var el = safeCreateElement('div');
    assert.equal(el.tagName, 'DIV');
    var span = safeCreateElement('span');
    assert.equal(span.tagName, 'SPAN');
  });

  it('should set className from attrs', function () {
    var el = safeCreateElement('div', { className: 'my-class foo' });
    assert.equal(el.className, 'my-class foo');
  });

  it('should set textContent without interpreting HTML', function () {
    var el = safeCreateElement('p', { textContent: '<b>bold</b>' });
    assert.equal(el.textContent, '<b>bold</b>');
    assert.equal(el.children.length, 0);
    assert.includes(el.innerHTML, '&lt;b&gt;bold&lt;/b&gt;');
  });

  it('should set dataset attributes', function () {
    var el = safeCreateElement('div', { dataset: { taskId: '42', status: 'open' } });
    assert.equal(el.dataset.taskId, '42');
    assert.equal(el.dataset.status, 'open');
  });

  it('should set style properties from an object', function () {
    var el = safeCreateElement('div', { style: { color: 'red', fontSize: '14px' } });
    assert.equal(el.style.color, 'red');
    assert.equal(el.style.fontSize, '14px');
  });

  it('should set arbitrary attributes via setAttribute', function () {
    var el = safeCreateElement('div', { id: 'main', role: 'navigation' });
    assert.equal(el.getAttribute('id'), 'main');
    assert.equal(el.getAttribute('role'), 'navigation');
  });

  it('should append string children as text nodes', function () {
    var el = safeCreateElement('p', {}, ['Hello', ' world']);
    assert.equal(el.childNodes.length, 2);
    assert.equal(el.textContent, 'Hello world');
    assert.equal(el.childNodes[0].nodeType, Node.TEXT_NODE);
    assert.equal(el.childNodes[1].nodeType, Node.TEXT_NODE);
  });

  it('should append Node children as-is', function () {
    var child = document.createElement('span');
    child.textContent = 'inner';
    var el = safeCreateElement('div', {}, [child]);
    assert.equal(el.children.length, 1);
    assert.equal(el.children[0].tagName, 'SPAN');
    assert.equal(el.children[0].textContent, 'inner');
  });

  it('should handle mixed children of strings and nodes', function () {
    var strong = document.createElement('strong');
    strong.textContent = 'bold';
    var el = safeCreateElement('p', {}, ['Hello ', strong, ' world']);
    assert.equal(el.childNodes.length, 3);
    assert.equal(el.childNodes[0].nodeType, Node.TEXT_NODE);
    assert.equal(el.childNodes[1].tagName, 'STRONG');
    assert.equal(el.childNodes[2].nodeType, Node.TEXT_NODE);
    assert.equal(el.textContent, 'Hello bold world');
  });

  it('should work with empty attrs and children defaults', function () {
    var el = safeCreateElement('section');
    assert.equal(el.tagName, 'SECTION');
    assert.equal(el.childNodes.length, 0);
    assert.equal(el.attributes.length, 0);
  });

});
