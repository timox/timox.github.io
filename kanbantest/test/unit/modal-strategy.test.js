// === test/unit/modal-strategy.test.js ===
// Tests for ModalStrategy sub-module

// ---- Inline minimal copy of ModalStrategy for testing ----

function ModalStrategy(modal) {
  this.modal = modal;
}

ModalStrategy.prototype.updateStrategyTags = function () {
  var tagsContainer = document.getElementById('stm-strategy-tags');
  var countBadge = document.getElementById('stm-strategy-count');
  var selectedSection = document.getElementById('stm-selected-strategies');

  if (!tagsContainer) return;

  var checked = document.querySelectorAll('#stm-strategy-browser .strategy-checkbox:checked');
  this.modal.selectedStrategies = Array.from(checked).map(function (cb) {
    return {
      id: parseInt(cb.value),
      objectif: cb.dataset.objectif,
      sousObjectif: cb.dataset.sousObjectif,
      axe: cb.dataset.axe
    };
  });

  if (this.modal.selectedStrategies.length === 0) {
    if (selectedSection) selectedSection.style.display = 'none';
    return;
  }

  if (selectedSection) selectedSection.style.display = 'block';
  if (countBadge) countBadge.textContent = this.modal.selectedStrategies.length;
};

ModalStrategy.prototype.setSelectedStrategies = function (ids) {
  document.querySelectorAll('#stm-strategy-browser .strategy-checkbox').forEach(function (cb) {
    cb.checked = ids.includes(parseInt(cb.value));
  });
  this.updateStrategyTags();
};

// ---- Tests ----

describe('ModalStrategy -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { selectedStrategies: [], strategies: [] };
    var ms = new ModalStrategy(modal);
    assert.equal(ms.modal, modal);
    assert.equal(ms.modal.selectedStrategies.length, 0);
  });
});

describe('ModalStrategy -- updateStrategyTags', function () {
  it('returns gracefully when tagsContainer not found', function () {
    var modal = { selectedStrategies: [] };
    var ms = new ModalStrategy(modal);
    // No DOM element for stm-strategy-tags
    assert.doesNotThrow(function () { ms.updateStrategyTags(); });
  });

  it('handles empty selectedStrategies', function () {
    var modal = { selectedStrategies: [{ id: 1 }] };
    var ms = new ModalStrategy(modal);

    // Create mock DOM elements
    var tagsContainer = document.createElement('div');
    tagsContainer.id = 'stm-strategy-tags';
    var selectedSection = document.createElement('div');
    selectedSection.id = 'stm-selected-strategies';
    selectedSection.style.display = 'block';
    var browser = document.createElement('div');
    browser.id = 'stm-strategy-browser';

    document.body.appendChild(tagsContainer);
    document.body.appendChild(selectedSection);
    document.body.appendChild(browser);

    ms.updateStrategyTags();

    // No checkboxes checked, so selectedStrategies should be empty
    assert.deepEqual(modal.selectedStrategies, []);
    assert.equal(selectedSection.style.display, 'none');

    document.body.removeChild(tagsContainer);
    document.body.removeChild(selectedSection);
    document.body.removeChild(browser);
  });

  it('populates selectedStrategies from checked checkboxes', function () {
    var modal = { selectedStrategies: [] };
    var ms = new ModalStrategy(modal);

    var tagsContainer = document.createElement('div');
    tagsContainer.id = 'stm-strategy-tags';
    var selectedSection = document.createElement('div');
    selectedSection.id = 'stm-selected-strategies';
    var countBadge = document.createElement('span');
    countBadge.id = 'stm-strategy-count';
    var browser = document.createElement('div');
    browser.id = 'stm-strategy-browser';

    var cb1 = document.createElement('input');
    cb1.type = 'checkbox';
    cb1.className = 'strategy-checkbox';
    cb1.value = '42';
    cb1.checked = true;
    cb1.dataset.objectif = 'Obj1';
    cb1.dataset.sousObjectif = 'SO1';
    cb1.dataset.axe = 'Axe1';
    browser.appendChild(cb1);

    document.body.appendChild(tagsContainer);
    document.body.appendChild(selectedSection);
    document.body.appendChild(countBadge);
    document.body.appendChild(browser);

    ms.updateStrategyTags();

    assert.equal(modal.selectedStrategies.length, 1);
    assert.equal(modal.selectedStrategies[0].id, 42);
    assert.equal(modal.selectedStrategies[0].objectif, 'Obj1');
    assert.equal(modal.selectedStrategies[0].axe, 'Axe1');
    assert.equal(selectedSection.style.display, 'block');
    assert.equal(countBadge.textContent, '1');

    document.body.removeChild(tagsContainer);
    document.body.removeChild(selectedSection);
    document.body.removeChild(countBadge);
    document.body.removeChild(browser);
  });
});

describe('ModalStrategy -- setSelectedStrategies', function () {
  it('sets modal.selectedStrategies to empty when no checkboxes match', function () {
    var modal = { selectedStrategies: [{ id: 99 }] };
    var ms = new ModalStrategy(modal);

    var tagsContainer = document.createElement('div');
    tagsContainer.id = 'stm-strategy-tags';
    var selectedSection = document.createElement('div');
    selectedSection.id = 'stm-selected-strategies';
    var browser = document.createElement('div');
    browser.id = 'stm-strategy-browser';

    document.body.appendChild(tagsContainer);
    document.body.appendChild(selectedSection);
    document.body.appendChild(browser);

    ms.setSelectedStrategies([]);
    assert.deepEqual(modal.selectedStrategies, []);

    document.body.removeChild(tagsContainer);
    document.body.removeChild(selectedSection);
    document.body.removeChild(browser);
  });

  it('checks matching checkboxes by id', function () {
    var modal = { selectedStrategies: [] };
    var ms = new ModalStrategy(modal);

    var tagsContainer = document.createElement('div');
    tagsContainer.id = 'stm-strategy-tags';
    var selectedSection = document.createElement('div');
    selectedSection.id = 'stm-selected-strategies';
    var countBadge = document.createElement('span');
    countBadge.id = 'stm-strategy-count';
    var browser = document.createElement('div');
    browser.id = 'stm-strategy-browser';

    var cb1 = document.createElement('input');
    cb1.type = 'checkbox';
    cb1.className = 'strategy-checkbox';
    cb1.value = '10';
    cb1.dataset.objectif = 'O1';
    cb1.dataset.sousObjectif = 'SO1';
    cb1.dataset.axe = 'A1';
    browser.appendChild(cb1);

    var cb2 = document.createElement('input');
    cb2.type = 'checkbox';
    cb2.className = 'strategy-checkbox';
    cb2.value = '20';
    cb2.dataset.objectif = 'O2';
    cb2.dataset.sousObjectif = 'SO2';
    cb2.dataset.axe = 'A2';
    browser.appendChild(cb2);

    document.body.appendChild(tagsContainer);
    document.body.appendChild(selectedSection);
    document.body.appendChild(countBadge);
    document.body.appendChild(browser);

    ms.setSelectedStrategies([20]);
    assert.isFalse(cb1.checked);
    assert.isTrue(cb2.checked);
    assert.equal(modal.selectedStrategies.length, 1);
    assert.equal(modal.selectedStrategies[0].id, 20);

    document.body.removeChild(tagsContainer);
    document.body.removeChild(selectedSection);
    document.body.removeChild(countBadge);
    document.body.removeChild(browser);
  });
});
