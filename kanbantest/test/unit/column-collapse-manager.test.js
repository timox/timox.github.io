// === test/unit/column-collapse-manager.test.js ===
// Tests for js/managers/view/ColumnCollapseManager.js

// ---- Inline minimal copy of ColumnCollapseManager ----

function ColumnCollapseManager(viewManager) {
  this.manager = viewManager;
  this.collapsedColumns = new Set();
  this.collapsedStack = null;
}

ColumnCollapseManager.prototype.resolveAccentColor = function (statusId, element, column) {
  if (element && element.dataset && element.dataset.accent) {
    return element.dataset.accent;
  }

  if (element && element.style) {
    var inlineAccent = element.style.getPropertyValue('--column-accent');
    if (inlineAccent) {
      return inlineAccent.trim();
    }
  }

  if (column && column.style) {
    var columnAccent = column.style.getPropertyValue('--column-accent');
    if (columnAccent) {
      return columnAccent.trim();
    }
  }

  // Fallback: return a default based on statusId
  return ColumnCollapseManager._getStatusAccent(statusId);
};

// Simplified getStatusAccent fallback for testing (mirrors constants.js behavior)
ColumnCollapseManager._getStatusAccent = function (statusId) {
  var accents = {
    'Backlog': '#6c757d',
    '\u00c0 faire': '#0d6efd',
    'En cours': '#0dcaf0',
    'En attente': '#ffc107',
    'Bloqu\u00e9': '#dc3545',
    'Validation': '#198754',
    'Termin\u00e9': '#20c997'
  };
  return accents[statusId] || '#6c757d';
};

ColumnCollapseManager.prototype.extractColumnSummary = function (statusId, column, button) {
  if (!column) {
    return {
      title: statusId,
      count: '0',
      accent: ColumnCollapseManager._getStatusAccent(statusId)
    };
  }

  var titleEl = column.querySelector('.board-title');
  var title = titleEl ? titleEl.textContent.trim() : statusId;
  var countEl = column.querySelector('.board-count');
  var count = countEl ? countEl.textContent.trim() : '0';
  var accent = this.resolveAccentColor(statusId, button, column);

  return { title: title, count: count, accent: accent };
};

// ---- Tests ----

TestFramework.describe('ColumnCollapseManager', function () {

  it('Constructor stores manager reference and initializes empty state', function () {
    var mockManager = { logger: { info: function () {} } };
    var ccm = new ColumnCollapseManager(mockManager);
    assert.equal(ccm.manager, mockManager);
    assert.equal(ccm.collapsedColumns.size, 0);
    assert.isNull(ccm.collapsedStack);
  });

  it('resolveAccentColor returns color from element dataset', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    var element = document.createElement('button');
    element.dataset.accent = '#ff0000';

    var result = ccm.resolveAccentColor('Backlog', element, null);
    assert.equal(result, '#ff0000');
  });

  it('resolveAccentColor returns color from element inline style', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    var element = document.createElement('button');
    element.style.setProperty('--column-accent', '#00ff00');

    var result = ccm.resolveAccentColor('Backlog', element, null);
    assert.equal(result, '#00ff00');
  });

  it('resolveAccentColor returns color from column inline style', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    var column = document.createElement('div');
    column.style.setProperty('--column-accent', '#0000ff');

    var result = ccm.resolveAccentColor('Backlog', null, column);
    assert.equal(result, '#0000ff');
  });

  it('resolveAccentColor returns default for known statuses', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    assert.equal(ccm.resolveAccentColor('Backlog', null, null), '#6c757d');
    assert.equal(ccm.resolveAccentColor('En cours', null, null), '#0dcaf0');
    assert.equal(ccm.resolveAccentColor('Terminé', null, null), '#20c997');
  });

  it('resolveAccentColor returns default gray for unknown status', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    assert.equal(ccm.resolveAccentColor('Unknown', null, null), '#6c757d');
  });

  it('extractColumnSummary returns default values for missing elements', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    var result = ccm.extractColumnSummary('En cours', null, null);
    assert.equal(result.title, 'En cours');
    assert.equal(result.count, '0');
    assert.ok(result.accent);
  });

  it('extractColumnSummary extracts title and count from DOM', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    var column = document.createElement('div');
    var titleEl = document.createElement('span');
    titleEl.className = 'board-title';
    titleEl.textContent = 'En cours';
    column.appendChild(titleEl);

    var countEl = document.createElement('span');
    countEl.className = 'board-count';
    countEl.textContent = '5';
    column.appendChild(countEl);

    var button = document.createElement('button');
    button.dataset.accent = '#0dcaf0';

    var result = ccm.extractColumnSummary('En cours', column, button);
    assert.equal(result.title, 'En cours');
    assert.equal(result.count, '5');
    assert.equal(result.accent, '#0dcaf0');
  });

  it('collapsedColumns tracks added statuses', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    ccm.collapsedColumns.add('Backlog');
    ccm.collapsedColumns.add('Terminé');

    assert.equal(ccm.collapsedColumns.size, 2);
    assert.isTrue(ccm.collapsedColumns.has('Backlog'));
    assert.isTrue(ccm.collapsedColumns.has('Terminé'));
    assert.equal(ccm.collapsedColumns.has('En cours'), false);
  });

  it('collapsedColumns delete removes status', function () {
    var mockManager = {};
    var ccm = new ColumnCollapseManager(mockManager);

    ccm.collapsedColumns.add('Backlog');
    assert.isTrue(ccm.collapsedColumns.has('Backlog'));

    ccm.collapsedColumns.delete('Backlog');
    assert.equal(ccm.collapsedColumns.has('Backlog'), false);
    assert.equal(ccm.collapsedColumns.size, 0);
  });

});
