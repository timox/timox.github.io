// === test/unit/modal-selects.test.js ===
// Tests for ModalSelects sub-module

// ---- Inline minimal copy of ModalSelects for testing ----

function ModalSelects(modal) {
  this.modal = modal;
}

ModalSelects.prototype.populateProgrammeSelect = function () {
  var select = document.getElementById('stm-programme');
  if (!select) return;

  select.innerHTML = '<option value="">-- Aucun programme --</option>';
  for (var i = 0; i < this.modal.programmes.length; i++) {
    var prog = this.modal.programmes[i];
    var option = document.createElement('option');
    option.value = prog.id;
    option.textContent = prog.code + ' - ' + prog.nom;
    select.appendChild(option);
  }
};

ModalSelects.prototype.populateAgentSelect = function () {
  var select = document.getElementById('stm-responsable');
  if (!select) return;

  select.innerHTML = '<option value="">-- Selectionner --</option>';

  var bureaux = [];
  var seen = {};
  for (var i = 0; i < this.modal.agents.length; i++) {
    var b = this.modal.agents[i].bureau;
    if (!seen[b]) { seen[b] = true; bureaux.push(b); }
  }

  for (var j = 0; j < bureaux.length; j++) {
    var bureau = bureaux[j];
    var optgroup = document.createElement('optgroup');
    optgroup.label = bureau || 'Sans bureau';

    var agentsBureau = this.modal.agents.filter(function (a) { return a.bureau === bureau; });
    for (var k = 0; k < agentsBureau.length; k++) {
      var agent = agentsBureau[k];
      var option = document.createElement('option');
      option.value = agent.id;
      option.textContent = agent.fullName;
      optgroup.appendChild(option);
    }

    select.appendChild(optgroup);
  }
};

ModalSelects.prototype.populateStrategySelect = function () {
  var select = document.getElementById('stm-strategie');
  if (!select) return;

  select.innerHTML = '<option value="">-- Aucune strategie --</option>';
};

ModalSelects.prototype.populateMeoSelect = function () {
  var select = document.getElementById('stm-meo');
  if (!select) return;

  select.innerHTML = '<option value="">-- Selectionner une mise en oeuvre --</option>';
};

// ---- Tests ----

describe('ModalSelects -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { name: 'test-modal' };
    var ms = new ModalSelects(modal);
    assert.equal(ms.modal, modal);
    assert.equal(ms.modal.name, 'test-modal');
  });
});

describe('ModalSelects -- populateProgrammeSelect', function () {
  it('returns gracefully when no select element found', function () {
    var modal = { programmes: [{ id: 1, code: 'P01', nom: 'Test' }] };
    var ms = new ModalSelects(modal);
    // document.getElementById returns null for 'stm-programme' in test env
    assert.doesNotThrow(function () { ms.populateProgrammeSelect(); });
  });

  it('handles empty programmes array', function () {
    var modal = { programmes: [] };
    var ms = new ModalSelects(modal);

    var origGetById = document.getElementById;
    var mockSelect = document.createElement('select');
    document.getElementById = function (id) {
      if (id === 'stm-programme') return mockSelect;
      return null;
    };

    ms.populateProgrammeSelect();
    // Should only have the default option
    assert.equal(mockSelect.children.length, 1);
    assert.includes(mockSelect.innerHTML, 'Aucun programme');

    document.getElementById = origGetById;
  });

  it('populates options from programmes array', function () {
    var modal = {
      programmes: [
        { id: 1, code: 'P01', nom: 'Programme A' },
        { id: 2, code: 'P02', nom: 'Programme B' }
      ]
    };
    var ms = new ModalSelects(modal);

    var origGetById = document.getElementById;
    var mockSelect = document.createElement('select');
    document.getElementById = function (id) {
      if (id === 'stm-programme') return mockSelect;
      return null;
    };

    ms.populateProgrammeSelect();
    // Default option + 2 programme options
    assert.equal(mockSelect.children.length, 3);
    assert.equal(mockSelect.children[1].value, '1');
    assert.equal(mockSelect.children[1].textContent, 'P01 - Programme A');
    assert.equal(mockSelect.children[2].value, '2');
    assert.equal(mockSelect.children[2].textContent, 'P02 - Programme B');

    document.getElementById = origGetById;
  });
});

describe('ModalSelects -- populateAgentSelect', function () {
  it('returns gracefully when no select element found', function () {
    var modal = { agents: [] };
    var ms = new ModalSelects(modal);
    assert.doesNotThrow(function () { ms.populateAgentSelect(); });
  });

  it('handles empty agents array', function () {
    var modal = { agents: [] };
    var ms = new ModalSelects(modal);

    var origGetById = document.getElementById;
    var mockSelect = document.createElement('select');
    document.getElementById = function (id) {
      if (id === 'stm-responsable') return mockSelect;
      return null;
    };

    ms.populateAgentSelect();
    // Should only have the default option
    assert.equal(mockSelect.children.length, 1);
    assert.includes(mockSelect.innerHTML, 'Selectionner');

    document.getElementById = origGetById;
  });

  it('populates grouped options from agents array', function () {
    var modal = {
      agents: [
        { id: 1, fullName: 'Alice Dupont', nom: 'Dupont', bureau: 'BDD' },
        { id: 2, fullName: 'Bob Martin', nom: 'Martin', bureau: 'BDD' },
        { id: 3, fullName: 'Claire Petit', nom: 'Petit', bureau: 'Reseaux' }
      ]
    };
    var ms = new ModalSelects(modal);

    var origGetById = document.getElementById;
    var mockSelect = document.createElement('select');
    document.getElementById = function (id) {
      if (id === 'stm-responsable') return mockSelect;
      return null;
    };

    ms.populateAgentSelect();
    // Default option + 2 optgroups (BDD, Reseaux)
    assert.equal(mockSelect.children.length, 3);
    // First child is default option
    assert.equal(mockSelect.children[0].tagName, 'OPTION');
    // Next children are optgroups
    assert.equal(mockSelect.children[1].tagName, 'OPTGROUP');
    assert.equal(mockSelect.children[1].label, 'BDD');
    assert.equal(mockSelect.children[2].tagName, 'OPTGROUP');
    assert.equal(mockSelect.children[2].label, 'Reseaux');

    document.getElementById = origGetById;
  });
});

describe('ModalSelects -- populateStrategySelect', function () {
  it('returns gracefully when no select element found', function () {
    var modal = { strategies: [] };
    var ms = new ModalSelects(modal);
    assert.doesNotThrow(function () { ms.populateStrategySelect(); });
  });
});

describe('ModalSelects -- populateMeoSelect', function () {
  it('returns gracefully when no select element found', function () {
    var modal = { meos: [] };
    var ms = new ModalSelects(modal);
    assert.doesNotThrow(function () { ms.populateMeoSelect(); });
  });
});
