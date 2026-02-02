// === test/unit/card-renderer.test.js ===
// Tests for js/managers/view/CardRenderer.js

// ---- Inline minimal copy of CardRenderer ----

function CardRenderer(viewManager) {
  this.manager = viewManager;
}

CardRenderer.prototype.calculatePriority = function (urgence, impact) {
  var imp = String(impact || '').trim().toLowerCase();
  var urg = String(urgence || '').trim().toLowerCase();

  if (imp === 'critique') return 1;
  if (imp === 'important') return (urg === 'imm\u00e9diate' || urg === 'courte') ? 1 : 2;
  if (imp === 'mod\u00e9r\u00e9') return (urg === 'imm\u00e9diate') ? 2 : 3;
  if (imp === 'mineur') return 4;
  return 3;
};

CardRenderer.prototype.extractReferences = function (text) {
  if (!text) return [];
  var references = [];
  var networkPaths = text.match(/\\\\[^\s]+/g) || [];
  references.push.apply(references, networkPaths);
  var urls = text.match(/https?:\/\/[^\s]+/g) || [];
  references.push.apply(references, urls);
  var localPaths = text.match(/[A-Z]:[^\s]+/g) || [];
  references.push.apply(references, localPaths);
  // Deduplicate
  var seen = {};
  var unique = [];
  for (var i = 0; i < references.length; i++) {
    if (!seen[references[i]]) {
      seen[references[i]] = true;
      unique.push(references[i]);
    }
  }
  return unique;
};

// ---- Tests ----

TestFramework.describe('CardRenderer', function () {

  it('Constructor stores manager reference', function () {
    var mockManager = { logger: { warn: function () {} } };
    var renderer = new CardRenderer(mockManager);
    assert.equal(renderer.manager, mockManager);
  });

  it('calculatePriority returns 1 for critique impact', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority('Longue', 'Critique'), 1);
    assert.equal(renderer.calculatePriority('Immédiate', 'Critique'), 1);
    assert.equal(renderer.calculatePriority(null, 'Critique'), 1);
  });

  it('calculatePriority returns 1 for important impact with immediate urgence', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority('Immédiate', 'Important'), 1);
  });

  it('calculatePriority returns 1 for important impact with courte urgence', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority('Courte', 'Important'), 1);
  });

  it('calculatePriority returns 2 for important impact with moyenne urgence', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority('Moyenne', 'Important'), 2);
  });

  it('calculatePriority returns 2 for modere impact with immediate urgence', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority('Immédiate', 'Modéré'), 2);
  });

  it('calculatePriority returns 3 for modere impact with moyenne urgence', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority('Moyenne', 'Modéré'), 3);
  });

  it('calculatePriority returns 4 for mineur impact', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority('Immédiate', 'Mineur'), 4);
    assert.equal(renderer.calculatePriority('Longue', 'Mineur'), 4);
  });

  it('calculatePriority returns 3 as default', function () {
    var renderer = new CardRenderer({});
    assert.equal(renderer.calculatePriority(null, null), 3);
    assert.equal(renderer.calculatePriority('', ''), 3);
    assert.equal(renderer.calculatePriority('Moyenne', 'Unknown'), 3);
  });

  it('extractReferences returns empty array for null', function () {
    var renderer = new CardRenderer({});
    var result = renderer.extractReferences(null);
    assert.deepEqual(result, []);
  });

  it('extractReferences returns empty array for empty string', function () {
    var renderer = new CardRenderer({});
    var result = renderer.extractReferences('');
    assert.deepEqual(result, []);
  });

  it('extractReferences extracts URLs from text', function () {
    var renderer = new CardRenderer({});
    var text = 'See https://example.com/page and http://test.org/doc for details';
    var result = renderer.extractReferences(text);
    assert.equal(result.length, 2);
    assert.includes(result[0], 'https://example.com/page');
    assert.includes(result[1], 'http://test.org/doc');
  });

  it('extractReferences extracts network paths', function () {
    var renderer = new CardRenderer({});
    var text = 'File at \\\\server\\share\\file.txt';
    var result = renderer.extractReferences(text);
    assert.equal(result.length, 1);
    assert.includes(result[0], '\\\\server\\share\\file.txt');
  });

  it('extractReferences extracts local drive paths', function () {
    var renderer = new CardRenderer({});
    var text = 'Open C:\\Users\\doc.txt and D:\\Data\\file.csv';
    var result = renderer.extractReferences(text);
    assert.equal(result.length, 2);
    assert.includes(result[0], 'C:\\Users\\doc.txt');
    assert.includes(result[1], 'D:\\Data\\file.csv');
  });

  it('extractReferences deduplicates references', function () {
    var renderer = new CardRenderer({});
    var text = 'https://example.com https://example.com';
    var result = renderer.extractReferences(text);
    assert.equal(result.length, 1);
  });

  it('extractReferences returns empty for text with no references', function () {
    var renderer = new CardRenderer({});
    var text = 'Just some plain text without any links or paths';
    var result = renderer.extractReferences(text);
    assert.deepEqual(result, []);
  });

});
