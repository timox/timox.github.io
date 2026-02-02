// === test/unit/modal-affectation.test.js ===
// Tests for ModalAffectation sub-module

// ---- Inline minimal copy of ModalAffectation for testing ----

function ModalAffectation(modal) {
  this.modal = modal;
}

ModalAffectation.prototype.getSelectedBureaux = function () {
  var buttons = document.querySelectorAll('#stm-bureau-checkboxes .toggle-btn.active');
  return Array.from(buttons).map(function (btn) { return btn.dataset.value; });
};

ModalAffectation.prototype.getSelectedQui = function () {
  var buttons = document.querySelectorAll('#stm-qui-checkboxes .toggle-btn.active');
  return Array.from(buttons).map(function (btn) { return btn.dataset.value; });
};

ModalAffectation.prototype.setSelectedBureaux = function (bureaux) {
  document.querySelectorAll('#stm-bureau-checkboxes .toggle-btn').forEach(function (btn) {
    btn.classList.toggle('active', bureaux.includes(btn.dataset.value));
  });
  this.updateAffectationSummary();
};

ModalAffectation.prototype.setSelectedQui = function (noms) {
  document.querySelectorAll('#stm-qui-checkboxes .toggle-btn').forEach(function (btn) {
    btn.classList.toggle('active', noms.includes(btn.dataset.value));
  });
  this.updateAffectationSummary();
};

ModalAffectation.prototype.updateAffectationSummary = function () {
  // no-op in tests without DOM
};

// ---- Tests ----

describe('ModalAffectation -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { bureaux: ['B1', 'B2'] };
    var ma = new ModalAffectation(modal);
    assert.equal(ma.modal, modal);
    assert.deepEqual(ma.modal.bureaux, ['B1', 'B2']);
  });
});

describe('ModalAffectation -- getSelectedBureaux', function () {
  it('returns empty array when no checkboxes exist', function () {
    var ma = new ModalAffectation({});
    // In test env, querySelectorAll returns empty NodeList
    var result = ma.getSelectedBureaux();
    assert.deepEqual(result, []);
  });

  it('returns values from active buttons', function () {
    var ma = new ModalAffectation({});

    // Create a temporary container in the real DOM
    var container = document.createElement('div');
    container.id = 'stm-bureau-checkboxes';

    var btn1 = document.createElement('button');
    btn1.className = 'toggle-btn active';
    btn1.dataset.value = 'BDD';
    container.appendChild(btn1);

    var btn2 = document.createElement('button');
    btn2.className = 'toggle-btn';
    btn2.dataset.value = 'Reseaux';
    container.appendChild(btn2);

    var btn3 = document.createElement('button');
    btn3.className = 'toggle-btn active';
    btn3.dataset.value = 'Systemes';
    container.appendChild(btn3);

    document.body.appendChild(container);

    var result = ma.getSelectedBureaux();
    assert.deepEqual(result, ['BDD', 'Systemes']);

    document.body.removeChild(container);
  });
});

describe('ModalAffectation -- getSelectedQui', function () {
  it('returns empty array when no checkboxes exist', function () {
    var ma = new ModalAffectation({});
    var result = ma.getSelectedQui();
    assert.deepEqual(result, []);
  });

  it('returns values from active buttons', function () {
    var ma = new ModalAffectation({});

    var container = document.createElement('div');
    container.id = 'stm-qui-checkboxes';

    var btn1 = document.createElement('button');
    btn1.className = 'toggle-btn active';
    btn1.dataset.value = 'Alice';
    container.appendChild(btn1);

    var btn2 = document.createElement('button');
    btn2.className = 'toggle-btn';
    btn2.dataset.value = 'Bob';
    container.appendChild(btn2);

    document.body.appendChild(container);

    var result = ma.getSelectedQui();
    assert.deepEqual(result, ['Alice']);

    document.body.removeChild(container);
  });
});

describe('ModalAffectation -- setSelectedBureaux', function () {
  it('handles empty array without throwing', function () {
    var ma = new ModalAffectation({});
    // No DOM elements, querySelectorAll returns empty list
    assert.doesNotThrow(function () { ma.setSelectedBureaux([]); });
  });

  it('activates matching buttons and deactivates others', function () {
    var ma = new ModalAffectation({});

    var container = document.createElement('div');
    container.id = 'stm-bureau-checkboxes';

    var btn1 = document.createElement('button');
    btn1.className = 'toggle-btn';
    btn1.dataset.value = 'BDD';
    container.appendChild(btn1);

    var btn2 = document.createElement('button');
    btn2.className = 'toggle-btn active';
    btn2.dataset.value = 'Reseaux';
    container.appendChild(btn2);

    document.body.appendChild(container);

    ma.setSelectedBureaux(['BDD']);
    assert.isTrue(btn1.classList.contains('active'));
    assert.isFalse(btn2.classList.contains('active'));

    document.body.removeChild(container);
  });
});

describe('ModalAffectation -- setSelectedQui', function () {
  it('handles empty array without throwing', function () {
    var ma = new ModalAffectation({});
    assert.doesNotThrow(function () { ma.setSelectedQui([]); });
  });

  it('activates matching buttons', function () {
    var ma = new ModalAffectation({});

    var container = document.createElement('div');
    container.id = 'stm-qui-checkboxes';

    var btn1 = document.createElement('button');
    btn1.className = 'toggle-btn';
    btn1.dataset.value = 'Alice';
    container.appendChild(btn1);

    var btn2 = document.createElement('button');
    btn2.className = 'toggle-btn';
    btn2.dataset.value = 'Bob';
    container.appendChild(btn2);

    document.body.appendChild(container);

    ma.setSelectedQui(['Bob']);
    assert.isFalse(btn1.classList.contains('active'));
    assert.isTrue(btn2.classList.contains('active'));

    document.body.removeChild(container);
  });
});
