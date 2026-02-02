// === test/unit/modal-tasklinks.test.js ===
// Tests for ModalTaskLinks sub-module

describe('ModalTaskLinks -- constructor', function () {
  it('initializes with empty arrays', function () {
    var modal = { truncate: function (s, l) { return s; } };
    var tl = new ModalTaskLinks(modal);
    assert.deepEqual(tl.links, []);
    assert.deepEqual(tl.allTasks, []);
    assert.equal(tl.modal, modal);
  });
});

describe('ModalTaskLinks -- setData', function () {
  it('accepts an array', function () {
    var tl = new ModalTaskLinks({ truncate: function (s) { return s; } });
    tl.render = function () {};
    tl.setData([{ taskId: 1, type: 'bloque', titre: 'T1', statut: 'En cours' }]);
    assert.equal(tl.links.length, 1);
    assert.equal(tl.links[0].taskId, 1);
  });

  it('parses a JSON string', function () {
    var tl = new ModalTaskLinks({ truncate: function (s) { return s; } });
    tl.render = function () {};
    tl.setData('[{"taskId":2,"type":"lie","titre":"T2","statut":"Terminé"}]');
    assert.equal(tl.links.length, 1);
    assert.equal(tl.links[0].type, 'lie');
  });

  it('handles invalid JSON gracefully', function () {
    var tl = new ModalTaskLinks({ truncate: function (s) { return s; } });
    tl.render = function () {};
    tl.setData('{bad json}');
    assert.deepEqual(tl.links, []);
  });

  it('handles null/undefined', function () {
    var tl = new ModalTaskLinks({ truncate: function (s) { return s; } });
    tl.render = function () {};
    tl.setData(null);
    assert.deepEqual(tl.links, []);
  });

  it('handles empty string', function () {
    var tl = new ModalTaskLinks({ truncate: function (s) { return s; } });
    tl.render = function () {};
    tl.setData('');
    assert.deepEqual(tl.links, []);
  });

  it('makes a copy of the array (no mutation)', function () {
    var tl = new ModalTaskLinks({ truncate: function (s) { return s; } });
    tl.render = function () {};
    var original = [{ taskId: 1, type: 'bloque', titre: 'T1', statut: '' }];
    tl.setData(original);
    tl.links.push({ taskId: 2, type: 'lie', titre: 'T2', statut: '' });
    assert.equal(original.length, 1);
    assert.equal(tl.links.length, 2);
  });
});

describe('ModalTaskLinks -- getData', function () {
  it('returns the links array', function () {
    var tl = new ModalTaskLinks({});
    tl.links = [{ taskId: 1 }, { taskId: 2 }];
    assert.equal(tl.getData().length, 2);
  });

  it('returns empty array when no links', function () {
    var tl = new ModalTaskLinks({});
    assert.deepEqual(tl.getData(), []);
  });
});

describe('ModalTaskLinks -- clear', function () {
  it('empties links and calls render', function () {
    var tl = new ModalTaskLinks({});
    var renderCalled = false;
    tl.render = function () { renderCalled = true; };
    tl.links = [{ taskId: 1 }];
    tl.clear();
    assert.deepEqual(tl.links, []);
    assert.isTrue(renderCalled);
  });
});

describe('ModalTaskLinks -- getStatusBadgeClass', function () {
  it('returns bg-secondary for Backlog', function () {
    assert.equal(ModalTaskLinks.getStatusBadgeClass('Backlog'), 'bg-secondary');
  });

  it('returns bg-info for "À faire"', function () {
    assert.equal(ModalTaskLinks.getStatusBadgeClass('À faire'), 'bg-info');
  });

  it('returns bg-primary for "En cours"', function () {
    assert.equal(ModalTaskLinks.getStatusBadgeClass('En cours'), 'bg-primary');
  });

  it('returns bg-warning for "En attente"', function () {
    assert.equal(ModalTaskLinks.getStatusBadgeClass('En attente'), 'bg-warning text-dark');
  });

  it('returns bg-purple for Validation', function () {
    assert.equal(ModalTaskLinks.getStatusBadgeClass('Validation'), 'bg-purple');
  });

  it('returns bg-success for "Terminé"', function () {
    assert.equal(ModalTaskLinks.getStatusBadgeClass('Terminé'), 'bg-success');
  });

  it('returns bg-secondary for unknown status', function () {
    assert.equal(ModalTaskLinks.getStatusBadgeClass('Unknown'), 'bg-secondary');
    assert.equal(ModalTaskLinks.getStatusBadgeClass(''), 'bg-secondary');
    assert.equal(ModalTaskLinks.getStatusBadgeClass(undefined), 'bg-secondary');
  });
});

describe('ModalTaskLinks -- add', function () {
  it('does nothing when selects not found', function () {
    var tl = new ModalTaskLinks({});
    assert.doesNotThrow(function () { tl.add(); });
    assert.equal(tl.links.length, 0);
  });

  it('adds a link with correct structure', function () {
    var tl = new ModalTaskLinks({});
    tl.render = function () {};

    var origGetById = document.getElementById;
    var typeSelect = { value: 'bloque' };
    var selectedOption = { dataset: { titre: 'Ma tache', statut: 'En cours' } };
    var taskSelect = {
      value: '42',
      selectedIndex: 1,
      options: { 1: selectedOption }
    };
    document.getElementById = function (id) {
      if (id === 'stm-link-type') return typeSelect;
      if (id === 'stm-link-task') return taskSelect;
      return null;
    };

    tl.add();
    assert.equal(tl.links.length, 1);
    assert.equal(tl.links[0].taskId, 42);
    assert.equal(tl.links[0].type, 'bloque');
    assert.equal(tl.links[0].titre, 'Ma tache');

    document.getElementById = origGetById;
  });

  it('prevents duplicate links', function () {
    var tl = new ModalTaskLinks({});
    tl.render = function () {};
    tl.links = [{ taskId: 42, type: 'bloque', titre: 'T', statut: '' }];

    var origGetById = document.getElementById;
    var origAlert = window.alert;
    var alerted = false;
    window.alert = function () { alerted = true; };

    var selectedOption = { dataset: { titre: 'T', statut: '' } };
    document.getElementById = function (id) {
      if (id === 'stm-link-type') return { value: 'bloque' };
      if (id === 'stm-link-task') return { value: '42', selectedIndex: 0, options: { 0: selectedOption } };
      return null;
    };

    tl.add();
    assert.equal(tl.links.length, 1);
    assert.isTrue(alerted);

    document.getElementById = origGetById;
    window.alert = origAlert;
  });
});

describe('ModalTaskLinks -- remove', function () {
  it('removes a link by taskId and type', function () {
    var tl = new ModalTaskLinks({});
    tl.render = function () {};
    tl.links = [
      { taskId: 1, type: 'bloque', titre: 'T1', statut: '' },
      { taskId: 2, type: 'lie', titre: 'T2', statut: '' },
      { taskId: 1, type: 'lie', titre: 'T3', statut: '' }
    ];

    tl.remove(1, 'bloque');
    assert.equal(tl.links.length, 2);
    assert.equal(tl.links[0].taskId, 2);
    assert.equal(tl.links[1].taskId, 1);
    assert.equal(tl.links[1].type, 'lie');
  });

  it('does nothing when link not found', function () {
    var tl = new ModalTaskLinks({});
    tl.render = function () {};
    tl.links = [{ taskId: 1, type: 'bloque', titre: 'T', statut: '' }];

    tl.remove(99, 'bloque');
    assert.equal(tl.links.length, 1);
  });
});
