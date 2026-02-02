// === test/unit/modal-reference-data.test.js ===
// Tests for ModalReferenceData sub-module

// ---- Inline minimal copy of ModalReferenceData for testing ----

function ModalReferenceData(modal) {
  this.modal = modal;
}

ModalReferenceData.prototype.loadReferenceData = function () {
  // Peupler les checkboxes de bureaux (statique)
  this.modal.affectationModule.populateBureauCheckboxes();

  if (typeof grist === 'undefined') {
    return;
  }
};

ModalReferenceData.prototype.loadProgrammes = function () {
  var self = this;
  var data = self._testData;
  self.modal.programmes = [];
  var count = data && data.id ? data.id.length : 0;

  for (var i = 0; i < count; i++) {
    self.modal.programmes.push({
      id: data.id[i],
      code: (data.code && data.code[i]) || '',
      nom: (data.nom && data.nom[i]) || ''
    });
  }
  if (self.modal.selectsModule) {
    self.modal.selectsModule.populateProgrammeSelect();
  }
};

ModalReferenceData.prototype.loadAgents = function () {
  this.modal.agents.sort(function (a, b) {
    return (a.nom || '').localeCompare(b.nom || '', 'fr');
  });
  if (this.modal.selectsModule) {
    this.modal.selectsModule.populateAgentSelect();
  }
};

ModalReferenceData.prototype.loadStrategies = function () {
  var self = this;
  var data = self._testData;
  self.modal.strategies = [];
  var count = data && data.id2 ? data.id2.length : 0;

  for (var i = 0; i < count; i++) {
    self.modal.strategies.push({
      id: data.id2[i],
      objectif: (data.objectif && data.objectif[i]) || '',
      sous_objectif: (data.sous_objectif && data.sous_objectif[i]) || '',
      axe_strategique: (data.axe_strategique && data.axe_strategique[i]) || ''
    });
  }
  if (self.modal.selectsModule) {
    self.modal.selectsModule.populateStrategySelect();
  }
};

ModalReferenceData.prototype.loadMeos = function () {
  var self = this;
  var data = self._testData;
  var meoMap = {};
  self.modal.meos = [];

  var count = data && data.id ? data.id.length : 0;
  for (var i = 0; i < count; i++) {
    var meoCode = data.mise_en_oeuvre_code ? data.mise_en_oeuvre_code[i] : null;
    var strategieId = data.strategie_id ? data.strategie_id[i] : null;

    if (meoCode && strategieId && !meoMap[meoCode]) {
      meoMap[meoCode] = {
        code: meoCode,
        nom: (data.mise_en_oeuvre_nom && data.mise_en_oeuvre_nom[i]) || 'Sans nom',
        categorie: (data.categorie && data.categorie[i]) || 'Projet',
        strategie_id: strategieId
      };
    }
  }

  var keys = Object.keys(meoMap);
  for (var k = 0; k < keys.length; k++) {
    self.modal.meos.push(meoMap[keys[k]]);
  }
};

// ---- Tests ----

describe('ModalReferenceData -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { name: 'test-modal' };
    var rd = new ModalReferenceData(modal);
    assert.equal(rd.modal, modal);
    assert.equal(rd.modal.name, 'test-modal');
  });
});

describe('ModalReferenceData -- loadReferenceData', function () {
  it('returns gracefully when grist is undefined', function () {
    var populateCalled = false;
    var modal = {
      affectationModule: {
        populateBureauCheckboxes: function () { populateCalled = true; }
      }
    };
    var rd = new ModalReferenceData(modal);

    // grist is not defined globally in test env, so it should return early
    assert.doesNotThrow(function () { rd.loadReferenceData(); });
    assert.isTrue(populateCalled);
  });

  it('calls populateBureauCheckboxes before checking grist', function () {
    var callOrder = [];
    var modal = {
      affectationModule: {
        populateBureauCheckboxes: function () { callOrder.push('bureaux'); }
      }
    };
    var rd = new ModalReferenceData(modal);
    rd.loadReferenceData();
    assert.deepEqual(callOrder, ['bureaux']);
  });
});

describe('ModalReferenceData -- loadProgrammes', function () {
  it('stores programmes on modal from data', function () {
    var selectsCalled = false;
    var modal = {
      programmes: [],
      selectsModule: { populateProgrammeSelect: function () { selectsCalled = true; } }
    };
    var rd = new ModalReferenceData(modal);
    rd._testData = {
      id: [1, 2],
      code: ['P01', 'P02'],
      nom: ['Programme A', 'Programme B']
    };

    rd.loadProgrammes();
    assert.equal(modal.programmes.length, 2);
    assert.equal(modal.programmes[0].id, 1);
    assert.equal(modal.programmes[0].code, 'P01');
    assert.equal(modal.programmes[0].nom, 'Programme A');
    assert.equal(modal.programmes[1].id, 2);
    assert.isTrue(selectsCalled);
  });

  it('handles empty data', function () {
    var modal = {
      programmes: [],
      selectsModule: { populateProgrammeSelect: function () {} }
    };
    var rd = new ModalReferenceData(modal);
    rd._testData = { id: [] };

    rd.loadProgrammes();
    assert.deepEqual(modal.programmes, []);
  });

  it('handles missing optional fields', function () {
    var modal = {
      programmes: [],
      selectsModule: { populateProgrammeSelect: function () {} }
    };
    var rd = new ModalReferenceData(modal);
    rd._testData = { id: [10] };

    rd.loadProgrammes();
    assert.equal(modal.programmes.length, 1);
    assert.equal(modal.programmes[0].id, 10);
    assert.equal(modal.programmes[0].code, '');
    assert.equal(modal.programmes[0].nom, '');
  });
});

describe('ModalReferenceData -- loadAgents', function () {
  it('sorts agents by nom and stores on modal', function () {
    var selectsCalled = false;
    var modal = {
      agents: [
        { nom: 'Zoe', bureau: 'B1' },
        { nom: 'Alice', bureau: 'B2' },
        { nom: 'Martin', bureau: 'B1' }
      ],
      selectsModule: { populateAgentSelect: function () { selectsCalled = true; } }
    };
    var rd = new ModalReferenceData(modal);

    rd.loadAgents();
    assert.equal(modal.agents[0].nom, 'Alice');
    assert.equal(modal.agents[1].nom, 'Martin');
    assert.equal(modal.agents[2].nom, 'Zoe');
    assert.isTrue(selectsCalled);
  });

  it('handles empty agents list', function () {
    var modal = {
      agents: [],
      selectsModule: { populateAgentSelect: function () {} }
    };
    var rd = new ModalReferenceData(modal);
    assert.doesNotThrow(function () { rd.loadAgents(); });
    assert.deepEqual(modal.agents, []);
  });
});

describe('ModalReferenceData -- loadStrategies', function () {
  it('stores strategies on modal from data', function () {
    var selectsCalled = false;
    var modal = {
      strategies: [],
      selectsModule: { populateStrategySelect: function () { selectsCalled = true; } }
    };
    var rd = new ModalReferenceData(modal);
    rd._testData = {
      id2: [100, 200],
      objectif: ['Obj1', 'Obj2'],
      sous_objectif: ['SO1', 'SO2'],
      axe_strategique: ['Axe1', 'Axe2']
    };

    rd.loadStrategies();
    assert.equal(modal.strategies.length, 2);
    assert.equal(modal.strategies[0].id, 100);
    assert.equal(modal.strategies[0].objectif, 'Obj1');
    assert.equal(modal.strategies[0].sous_objectif, 'SO1');
    assert.equal(modal.strategies[0].axe_strategique, 'Axe1');
    assert.isTrue(selectsCalled);
  });

  it('handles empty data', function () {
    var modal = {
      strategies: [],
      selectsModule: { populateStrategySelect: function () {} }
    };
    var rd = new ModalReferenceData(modal);
    rd._testData = { id2: [] };

    rd.loadStrategies();
    assert.deepEqual(modal.strategies, []);
  });
});

describe('ModalReferenceData -- loadMeos', function () {
  it('stores MEOs on modal from task data', function () {
    var modal = { meos: [], strategies: [] };
    var rd = new ModalReferenceData(modal);
    rd._testData = {
      id: [1, 2],
      mise_en_oeuvre_code: ['MEO01', 'MEO02'],
      mise_en_oeuvre_nom: ['Mise 1', 'Mise 2'],
      categorie: ['Projet', 'Service'],
      strategie_id: [10, 20]
    };

    rd.loadMeos();
    assert.equal(modal.meos.length, 2);
    assert.equal(modal.meos[0].code, 'MEO01');
    assert.equal(modal.meos[0].nom, 'Mise 1');
    assert.equal(modal.meos[0].strategie_id, 10);
  });

  it('deduplicates MEOs by code', function () {
    var modal = { meos: [], strategies: [] };
    var rd = new ModalReferenceData(modal);
    rd._testData = {
      id: [1, 2, 3],
      mise_en_oeuvre_code: ['MEO01', 'MEO01', 'MEO02'],
      mise_en_oeuvre_nom: ['Mise 1', 'Mise 1 bis', 'Mise 2'],
      categorie: ['Projet', 'Projet', 'Service'],
      strategie_id: [10, 10, 20]
    };

    rd.loadMeos();
    assert.equal(modal.meos.length, 2);
  });

  it('handles empty data', function () {
    var modal = { meos: [], strategies: [] };
    var rd = new ModalReferenceData(modal);
    rd._testData = { id: [] };

    rd.loadMeos();
    assert.deepEqual(modal.meos, []);
  });

  it('skips entries without meoCode or strategieId', function () {
    var modal = { meos: [], strategies: [] };
    var rd = new ModalReferenceData(modal);
    rd._testData = {
      id: [1, 2, 3],
      mise_en_oeuvre_code: ['MEO01', null, 'MEO03'],
      mise_en_oeuvre_nom: ['N1', 'N2', 'N3'],
      categorie: ['Projet', 'Projet', 'Projet'],
      strategie_id: [10, 20, null]
    };

    rd.loadMeos();
    assert.equal(modal.meos.length, 1);
    assert.equal(modal.meos[0].code, 'MEO01');
  });
});
