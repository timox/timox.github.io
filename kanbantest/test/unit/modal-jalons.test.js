// === test/unit/modal-jalons.test.js ===
// Tests for ModalJalons sub-module

// Mock DOM helpers
function mockElement(tag, attrs) {
  var el = { tagName: tag, value: '', textContent: '', className: '', style: { display: '' }, children: [], dataset: {} };
  el.classList = {
    _classes: [],
    add: function (c) { this._classes.push(c); },
    remove: function (c) { this._classes = this._classes.filter(function (x) { return x !== c; }); },
    contains: function (c) { return this._classes.indexOf(c) >= 0; }
  };
  el.querySelectorAll = function () { return { forEach: function () {} }; };
  el.querySelector = function () { return null; };
  el.appendChild = function (child) { el.children.push(child); };
  el.addEventListener = function () {};
  el.focus = function () {};
  el.remove = function () {};
  if (attrs) { Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; }); }
  return el;
}

// ---- ModalJalons class inline for testing (no DOM loading) ----
// We test the class loaded via script in test-runner.html

describe('ModalJalons -- constructor', function () {
  it('initializes with empty jalons array', function () {
    var modal = {};
    var mj = new ModalJalons(modal);
    assert.deepEqual(mj.jalons, []);
    assert.equal(mj.modal, modal);
  });
});

describe('ModalJalons -- setData', function () {
  it('accepts an array', function () {
    var mj = new ModalJalons({});
    mj.render = function () {}; // stub render (no DOM)
    mj.setData([{ id: 1, titre: 'J1', date: '', statut: 'pending' }]);
    assert.equal(mj.jalons.length, 1);
    assert.equal(mj.jalons[0].titre, 'J1');
  });

  it('parses a JSON string', function () {
    var mj = new ModalJalons({});
    mj.render = function () {};
    mj.setData('[{"id":1,"titre":"Test","date":"01/01/2025","statut":"done"}]');
    assert.equal(mj.jalons.length, 1);
    assert.equal(mj.jalons[0].statut, 'done');
  });

  it('handles invalid JSON gracefully', function () {
    var mj = new ModalJalons({});
    mj.render = function () {};
    mj.setData('{invalid}');
    assert.deepEqual(mj.jalons, []);
  });

  it('handles null/undefined', function () {
    var mj = new ModalJalons({});
    mj.render = function () {};
    mj.setData(null);
    assert.deepEqual(mj.jalons, []);
  });

  it('handles empty string', function () {
    var mj = new ModalJalons({});
    mj.render = function () {};
    mj.setData('');
    assert.deepEqual(mj.jalons, []);
  });

  it('makes a copy of the array (no mutation)', function () {
    var mj = new ModalJalons({});
    mj.render = function () {};
    var original = [{ id: 1, titre: 'A', date: '', statut: 'pending' }];
    mj.setData(original);
    mj.jalons.push({ id: 2, titre: 'B', date: '', statut: 'pending' });
    assert.equal(original.length, 1);
    assert.equal(mj.jalons.length, 2);
  });
});

describe('ModalJalons -- getData', function () {
  it('returns the jalons array', function () {
    var mj = new ModalJalons({});
    mj.jalons = [{ id: 1, titre: 'J1' }, { id: 2, titre: 'J2' }];
    var data = mj.getData();
    assert.equal(data.length, 2);
    assert.equal(data[0].titre, 'J1');
  });

  it('returns empty array when no jalons', function () {
    var mj = new ModalJalons({});
    assert.deepEqual(mj.getData(), []);
  });
});

describe('ModalJalons -- clear', function () {
  it('empties jalons and calls render', function () {
    var mj = new ModalJalons({});
    var renderCalled = false;
    mj.render = function () { renderCalled = true; };
    mj.jalons = [{ id: 1, titre: 'J1' }];
    mj.clear();
    assert.deepEqual(mj.jalons, []);
    assert.isTrue(renderCalled);
  });
});

describe('ModalJalons -- add', function () {
  it('does nothing when titre input not found', function () {
    var mj = new ModalJalons({});
    // getElementById returns null (no DOM), should not throw
    assert.doesNotThrow(function () { mj.add(); });
  });

  it('adds a jalon with correct structure', function () {
    var mj = new ModalJalons({});
    mj.render = function () {};

    // Mock getElementById
    var origGetById = document.getElementById;
    var mockInputs = {
      'stm-jalon-titre': mockElement('input', { value: 'Mon jalon' }),
      'stm-jalon-date': mockElement('input', { value: '2025-06-15' })
    };
    document.getElementById = function (id) { return mockInputs[id] || null; };

    mj.add();

    assert.equal(mj.jalons.length, 1);
    assert.equal(mj.jalons[0].titre, 'Mon jalon');
    assert.equal(mj.jalons[0].statut, 'pending');
    assert.ok(mj.jalons[0].id > 0);

    // Restore
    document.getElementById = origGetById;
  });

  it('rejects empty titre', function () {
    var mj = new ModalJalons({});
    mj.render = function () {};

    var origGetById = document.getElementById;
    var titreEl = mockElement('input', { value: '  ' });
    document.getElementById = function (id) {
      if (id === 'stm-jalon-titre') return titreEl;
      return null;
    };

    mj.add();
    assert.equal(mj.jalons.length, 0);
    assert.isTrue(titreEl.classList.contains('is-invalid'));

    document.getElementById = origGetById;
  });
});
