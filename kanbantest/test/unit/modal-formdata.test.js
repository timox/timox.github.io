// === test/unit/modal-formdata.test.js ===
// Tests for ModalFormData sub-module

// ---- Inline minimal copy of ModalFormData for testing ----

function ModalFormData(modal) {
  this.modal = modal;
}

ModalFormData.prototype.setFieldValue = function (id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.value = value || '';
  }
};

ModalFormData.prototype.getFieldValue = function (id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
};

ModalFormData.prototype.clearForm = function () {
  var form = document.getElementById('shared-task-form');
  if (form) {
    form.reset();
  }
  this.setFieldValue('stm-task-id', '');

  this.modal.affectationModule.setSelectedBureaux([]);
  this.modal.affectationModule.setSelectedQui([]);
  this.modal.strategyModule.setSelectedStrategies([]);
  this.modal.jalonModule.clear();
  this.modal.datePickerModule.clear();

  this.setFieldValue('stm-references', '');
  this.modal.referencesModule.updateReferencesPreview();

  this.setFieldValue('stm-date-debut', '');
  this.setFieldValue('stm-duree-estimee', '');
  this.setFieldValue('stm-duree-reelle', '');

  this.modal.taskLinksModule.clear();

  this.modal.visualsModule.setPriorityButtonValue('stm-urgence-buttons', '');
  this.modal.visualsModule.setPriorityButtonValue('stm-impact-buttons', '');
  this.modal.visualsModule.updateCompletionRing();
  this.modal.visualsModule.updateTimelineVisual();
  this.modal.visualsModule.updateStatusBadge();
};

ModalFormData.prototype.getFormData = function () {
  var selectedBureaux = this.modal.affectationModule.getSelectedBureaux();
  var selectedQui = this.modal.affectationModule.getSelectedQui();

  var data = {
    titre: this.getFieldValue('stm-titre'),
    description: this.getFieldValue('stm-description'),
    statut: this.getFieldValue('stm-statut'),
    qui: selectedQui.join(', '),
    bureau: selectedBureaux.join(', '),
    projet: this.getFieldValue('stm-projet'),
    urgence: this.getFieldValue('stm-urgence'),
    impact: this.getFieldValue('stm-impact'),
    nature_activite: this.getFieldValue('stm-nature'),
    genre_action: this.getFieldValue('stm-genre'),
    etape_cycle: this.getFieldValue('stm-etape'),
    previsibilite: this.getFieldValue('stm-previsibilite'),
    reference: this.getFieldValue('stm-references')
  };

  var taskId = this.getFieldValue('stm-task-id');
  if (taskId) {
    data.id = parseInt(taskId, 10);
  }

  data.mise_en_oeuvre_code = this.getFieldValue('stm-meo-code');
  data.mise_en_oeuvre_nom = this.getFieldValue('stm-meo-nom');

  if (this.modal.selectedStrategies && this.modal.selectedStrategies.length > 0) {
    data.strategie_ids = this.modal.selectedStrategies.map(function (s) { return s.id; });
    data.est_classifiee = true;
  } else {
    var strategieIdStr = this.getFieldValue('stm-strategie');
    if (strategieIdStr) {
      data.strategie_ids = [parseInt(strategieIdStr, 10)];
      data.est_classifiee = true;
    } else {
      data.strategie_id = null;
      data.est_classifiee = false;
    }
  }

  // Echeance - toujours envoyer pour permettre le vidage
  var echeanceDate = this.modal.datePickerModule ? this.modal.datePickerModule.getDate() : null;
  if (echeanceDate && !isNaN(echeanceDate.getTime())) {
    data.date_echeance = Math.floor(echeanceDate.getTime() / 1000);
  } else {
    data.date_echeance = null;
  }

  // Jalons - toujours envoyer pour permettre le vidage
  data.jalons = this.modal.jalonModule ? this.modal.jalonModule.getData() : [];

  var avancement = parseInt(this.getFieldValue('stm-avancement')) || 0;
  data.avancement = avancement;

  // Date de debut - toujours envoyer pour permettre le vidage
  var dateDebut = this.getFieldValue('stm-date-debut');
  if (dateDebut) {
    data.date_debut = Math.floor(new Date(dateDebut).getTime() / 1000);
  } else {
    data.date_debut = null;
  }

  // Liens - toujours envoyer pour permettre le vidage
  data.liens = this.modal.taskLinksModule ? this.modal.taskLinksModule.getData() : [];

  return data;
};

// ---- Tests ----

describe('ModalFormData -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { name: 'test-modal' };
    var fd = new ModalFormData(modal);
    assert.equal(fd.modal, modal);
    assert.equal(fd.modal.name, 'test-modal');
  });
});

describe('ModalFormData -- setFieldValue / getFieldValue', function () {
  it('sets and gets field value via DOM', function () {
    var fd = new ModalFormData({});

    var origGetById = document.getElementById;
    var mockInput = document.createElement('input');
    document.getElementById = function (id) {
      if (id === 'test-field') return mockInput;
      return null;
    };

    fd.setFieldValue('test-field', 'Hello');
    assert.equal(mockInput.value, 'Hello');

    var val = fd.getFieldValue('test-field');
    assert.equal(val, 'Hello');

    document.getElementById = origGetById;
  });

  it('sets empty string when value is null/undefined', function () {
    var fd = new ModalFormData({});

    var origGetById = document.getElementById;
    var mockInput = document.createElement('input');
    mockInput.value = 'old';
    document.getElementById = function (id) {
      if (id === 'test-field') return mockInput;
      return null;
    };

    fd.setFieldValue('test-field', null);
    assert.equal(mockInput.value, '');

    fd.setFieldValue('test-field', undefined);
    assert.equal(mockInput.value, '');

    document.getElementById = origGetById;
  });

  it('getFieldValue returns empty string when element not found', function () {
    var fd = new ModalFormData({});
    var val = fd.getFieldValue('nonexistent-id');
    assert.equal(val, '');
  });

  it('setFieldValue does not throw when element not found', function () {
    var fd = new ModalFormData({});
    assert.doesNotThrow(function () { fd.setFieldValue('nonexistent-id', 'value'); });
  });
});

describe('ModalFormData -- clearForm', function () {
  it('calls all reset methods on sub-modules', function () {
    var calls = [];
    var modal = {
      affectationModule: {
        setSelectedBureaux: function (a) { calls.push('bureaux:' + a.length); },
        setSelectedQui: function (a) { calls.push('qui:' + a.length); }
      },
      strategyModule: {
        setSelectedStrategies: function (a) { calls.push('strategies:' + a.length); }
      },
      jalonModule: {
        clear: function () { calls.push('jalonClear'); }
      },
      datePickerModule: {
        clear: function () { calls.push('dateClear'); }
      },
      referencesModule: {
        updateReferencesPreview: function () { calls.push('refPreview'); }
      },
      taskLinksModule: {
        clear: function () { calls.push('linksClear'); }
      },
      visualsModule: {
        setPriorityButtonValue: function () { calls.push('priority'); },
        updateCompletionRing: function () { calls.push('ring'); },
        updateTimelineVisual: function () { calls.push('timeline'); },
        updateStatusBadge: function () { calls.push('badge'); },
        updateAvancementDisplay: function () {}
      }
    };

    var fd = new ModalFormData(modal);
    fd.clearForm();

    assert.includes(calls, 'bureaux:0');
    assert.includes(calls, 'qui:0');
    assert.includes(calls, 'strategies:0');
    assert.includes(calls, 'jalonClear');
    assert.includes(calls, 'dateClear');
    assert.includes(calls, 'refPreview');
    assert.includes(calls, 'linksClear');
    assert.includes(calls, 'ring');
    assert.includes(calls, 'timeline');
    assert.includes(calls, 'badge');
  });

  it('does not throw when form element is missing', function () {
    var modal = {
      affectationModule: { setSelectedBureaux: function () {}, setSelectedQui: function () {} },
      strategyModule: { setSelectedStrategies: function () {} },
      jalonModule: { clear: function () {} },
      datePickerModule: { clear: function () {} },
      referencesModule: { updateReferencesPreview: function () {} },
      taskLinksModule: { clear: function () {} },
      visualsModule: {
        setPriorityButtonValue: function () {},
        updateCompletionRing: function () {},
        updateTimelineVisual: function () {},
        updateStatusBadge: function () {},
        updateAvancementDisplay: function () {}
      }
    };

    var fd = new ModalFormData(modal);
    assert.doesNotThrow(function () { fd.clearForm(); });
  });
});

// Helper: create a mock modal with all required sub-modules
function createMockModal(overrides) {
  var defaults = {
    affectationModule: {
      getSelectedBureaux: function () { return []; },
      getSelectedQui: function () { return []; }
    },
    selectedStrategies: [],
    options: {},
    datePickerModule: {
      getDate: function () { return null; }
    },
    jalonModule: {
      getData: function () { return []; }
    },
    taskLinksModule: {
      getData: function () { return []; }
    }
  };
  return Object.assign(defaults, overrides || {});
}

describe('ModalFormData -- getFormData', function () {
  it('returns object with correct keys', function () {
    var modal = createMockModal({
      affectationModule: {
        getSelectedBureaux: function () { return ['BDD']; },
        getSelectedQui: function () { return ['Alice', 'Bob']; }
      },
      selectedStrategies: [{ id: 42 }]
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();

    assert.ok(data.hasOwnProperty('titre'));
    assert.ok(data.hasOwnProperty('description'));
    assert.ok(data.hasOwnProperty('statut'));
    assert.ok(data.hasOwnProperty('qui'));
    assert.ok(data.hasOwnProperty('bureau'));
    assert.ok(data.hasOwnProperty('projet'));
    assert.ok(data.hasOwnProperty('urgence'));
    assert.ok(data.hasOwnProperty('impact'));
    assert.ok(data.hasOwnProperty('nature_activite'));
    assert.ok(data.hasOwnProperty('genre_action'));
    assert.ok(data.hasOwnProperty('etape_cycle'));
    assert.ok(data.hasOwnProperty('previsibilite'));
    assert.ok(data.hasOwnProperty('reference'));
    assert.ok(data.hasOwnProperty('mise_en_oeuvre_code'));
    assert.ok(data.hasOwnProperty('mise_en_oeuvre_nom'));
    assert.ok(data.hasOwnProperty('avancement'));
  });

  it('joins selected bureaux and qui as comma-separated strings', function () {
    var modal = createMockModal({
      affectationModule: {
        getSelectedBureaux: function () { return ['BDD', 'Reseaux']; },
        getSelectedQui: function () { return ['Alice', 'Bob']; }
      }
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.equal(data.bureau, 'BDD, Reseaux');
    assert.equal(data.qui, 'Alice, Bob');
  });

  it('includes strategie_ids when selectedStrategies is not empty', function () {
    var modal = createMockModal({
      selectedStrategies: [{ id: 10 }, { id: 20 }]
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.deepEqual(data.strategie_ids, [10, 20]);
    assert.isTrue(data.est_classifiee);
  });

  it('sets est_classifiee to false when no strategies selected', function () {
    var modal = createMockModal({ selectedStrategies: [] });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.isFalse(data.hasOwnProperty('strategie_ids'));
    assert.isFalse(data.est_classifiee);
    assert.isNull(data.strategie_id);
  });

  it('returns avancement as 0 when field is empty', function () {
    var modal = createMockModal();

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.equal(data.avancement, 0);
  });
});

describe('ModalFormData -- getFormData always sends clearable fields', function () {
  it('always includes date_echeance (null when empty)', function () {
    var modal = createMockModal({
      datePickerModule: { getDate: function () { return null; } }
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.ok(data.hasOwnProperty('date_echeance'));
    assert.isNull(data.date_echeance);
  });

  it('sends date_echeance as seconds timestamp when set', function () {
    var testDate = new Date('2025-06-15T12:00:00Z');
    var modal = createMockModal({
      datePickerModule: { getDate: function () { return testDate; } }
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.typeOf(data.date_echeance, 'number');
    assert.equal(data.date_echeance, Math.floor(testDate.getTime() / 1000));
  });

  it('always includes date_debut (null when empty)', function () {
    var modal = createMockModal();

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.ok(data.hasOwnProperty('date_debut'));
    assert.isNull(data.date_debut);
  });

  it('always includes jalons (empty array when none)', function () {
    var modal = createMockModal({
      jalonModule: { getData: function () { return []; } }
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.ok(data.hasOwnProperty('jalons'));
    assert.deepEqual(data.jalons, []);
  });

  it('includes jalons data when present', function () {
    var jalons = [{ titre: 'J1', date: '2025-06-15' }];
    var modal = createMockModal({
      jalonModule: { getData: function () { return jalons; } }
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.deepEqual(data.jalons, jalons);
  });

  it('always includes liens (empty array when none)', function () {
    var modal = createMockModal({
      taskLinksModule: { getData: function () { return []; } }
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.ok(data.hasOwnProperty('liens'));
    assert.deepEqual(data.liens, []);
  });

  it('includes liens data when present', function () {
    var liens = [{ targetId: 42, type: 'depends_on' }];
    var modal = createMockModal({
      taskLinksModule: { getData: function () { return liens; } }
    });

    var fd = new ModalFormData(modal);
    var data = fd.getFormData();
    assert.deepEqual(data.liens, liens);
  });
});
