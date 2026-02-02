// === test/unit/modal-tabindicators.test.js ===
// Tests for ModalTabIndicators sub-module

// ---- Inline minimal copy of ModalTabIndicators for testing ----

function ModalTabIndicators(modal) {
  this.modal = modal;
}

ModalTabIndicators.prototype.checkEssentialFields = function () {
  return !!this.modal.getFieldValue('stm-titre') ||
         !!this.modal.getFieldValue('stm-description') ||
         !!this.modal.getFieldValue('stm-urgence') ||
         !!this.modal.getFieldValue('stm-impact');
};

ModalTabIndicators.prototype.checkAffectationFields = function () {
  return this.modal.affectationModule.getSelectedQui().length > 0 ||
         this.modal.affectationModule.getSelectedBureaux().length > 0 ||
         !!this.modal.getFieldValue('stm-equipe');
};

ModalTabIndicators.prototype.checkPlanningFields = function () {
  var hasDate = this.modal.datePicker ?
    this.modal.datePicker.selectedDates.length > 0 :
    !!this.modal.getFieldValue('stm-echeance');

  return hasDate ||
         !!this.modal.getFieldValue('stm-date-debut') ||
         !!this.modal.getFieldValue('stm-duree-estimee') ||
         !!this.modal.getFieldValue('stm-duree-reelle') ||
         this.modal.jalons.length > 0;
};

ModalTabIndicators.prototype.checkOrganizationFields = function () {
  return !!this.modal.getFieldValue('stm-meo') ||
         !!this.modal.getFieldValue('stm-projet') ||
         this.modal.selectedStrategies.length > 0 ||
         this.modal.taskLinks.length > 0;
};

ModalTabIndicators.prototype.checkAdvancedFields = function () {
  return !!this.modal.getFieldValue('stm-nature') ||
         !!this.modal.getFieldValue('stm-genre') ||
         !!this.modal.getFieldValue('stm-etape') ||
         !!this.modal.getFieldValue('stm-references');
};

ModalTabIndicators.prototype.updateTabIndicator = function (tabName, hasContent) {
  var indicator = document.getElementById('indicator-' + tabName);
  if (!indicator) return;

  indicator.className = 'tab-indicator';
  if (hasContent) {
    indicator.classList.add('has-content');
  }
};

// ---- Tests ----

describe('ModalTabIndicators -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { name: 'test-modal' };
    var ti = new ModalTabIndicators(modal);
    assert.equal(ti.modal, modal);
    assert.equal(ti.modal.name, 'test-modal');
  });
});

describe('ModalTabIndicators -- checkEssentialFields', function () {
  it('returns false when all fields are empty', function () {
    var modal = {
      getFieldValue: function () { return ''; }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isFalse(ti.checkEssentialFields());
  });

  it('returns true when titre is filled', function () {
    var modal = {
      getFieldValue: function (id) {
        if (id === 'stm-titre') return 'My task';
        return '';
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkEssentialFields());
  });

  it('returns true when only urgence is filled', function () {
    var modal = {
      getFieldValue: function (id) {
        if (id === 'stm-urgence') return 'Haute';
        return '';
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkEssentialFields());
  });

  it('returns true when only impact is filled', function () {
    var modal = {
      getFieldValue: function (id) {
        if (id === 'stm-impact') return 'Critique';
        return '';
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkEssentialFields());
  });
});

describe('ModalTabIndicators -- checkAffectationFields', function () {
  it('returns false when no qui, no bureaux, no equipe', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      affectationModule: {
        getSelectedQui: function () { return []; },
        getSelectedBureaux: function () { return []; }
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isFalse(ti.checkAffectationFields());
  });

  it('returns true when qui is selected', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      affectationModule: {
        getSelectedQui: function () { return ['Alice']; },
        getSelectedBureaux: function () { return []; }
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkAffectationFields());
  });

  it('returns true when bureaux is selected', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      affectationModule: {
        getSelectedQui: function () { return []; },
        getSelectedBureaux: function () { return ['BDD']; }
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkAffectationFields());
  });
});

describe('ModalTabIndicators -- checkPlanningFields', function () {
  it('returns false when all planning fields are empty', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      datePicker: null,
      jalons: []
    };
    var ti = new ModalTabIndicators(modal);
    assert.isFalse(ti.checkPlanningFields());
  });

  it('returns true when datePicker has selected dates', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      datePicker: { selectedDates: [new Date()] },
      jalons: []
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkPlanningFields());
  });

  it('returns true when date-debut is filled', function () {
    var modal = {
      getFieldValue: function (id) {
        if (id === 'stm-date-debut') return '2025-01-15';
        return '';
      },
      datePicker: null,
      jalons: []
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkPlanningFields());
  });

  it('returns true when jalons is not empty', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      datePicker: null,
      jalons: [{ id: 1, titre: 'J1' }]
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkPlanningFields());
  });
});

describe('ModalTabIndicators -- checkOrganizationFields', function () {
  it('returns false when all organization fields are empty', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      selectedStrategies: [],
      taskLinks: []
    };
    var ti = new ModalTabIndicators(modal);
    assert.isFalse(ti.checkOrganizationFields());
  });

  it('returns true when meo is filled', function () {
    var modal = {
      getFieldValue: function (id) {
        if (id === 'stm-meo') return 'MEO01';
        return '';
      },
      selectedStrategies: [],
      taskLinks: []
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkOrganizationFields());
  });

  it('returns true when selectedStrategies is not empty', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      selectedStrategies: [{ id: 1 }],
      taskLinks: []
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkOrganizationFields());
  });

  it('returns true when taskLinks is not empty', function () {
    var modal = {
      getFieldValue: function () { return ''; },
      selectedStrategies: [],
      taskLinks: [{ taskId: 1 }]
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkOrganizationFields());
  });
});

describe('ModalTabIndicators -- checkAdvancedFields', function () {
  it('returns false when all advanced fields are empty', function () {
    var modal = {
      getFieldValue: function () { return ''; }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isFalse(ti.checkAdvancedFields());
  });

  it('returns true when nature is filled', function () {
    var modal = {
      getFieldValue: function (id) {
        if (id === 'stm-nature') return 'Projet';
        return '';
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkAdvancedFields());
  });

  it('returns true when references is filled', function () {
    var modal = {
      getFieldValue: function (id) {
        if (id === 'stm-references') return 'https://example.com';
        return '';
      }
    };
    var ti = new ModalTabIndicators(modal);
    assert.isTrue(ti.checkAdvancedFields());
  });
});

describe('ModalTabIndicators -- updateTabIndicator', function () {
  it('does not throw when indicator element is missing', function () {
    var ti = new ModalTabIndicators({});
    assert.doesNotThrow(function () { ti.updateTabIndicator('essential', true); });
  });

  it('adds has-content class when hasContent is true', function () {
    var ti = new ModalTabIndicators({});

    var indicator = document.createElement('span');
    indicator.id = 'indicator-essential';
    document.body.appendChild(indicator);

    ti.updateTabIndicator('essential', true);
    assert.isTrue(indicator.classList.contains('has-content'));
    assert.isTrue(indicator.classList.contains('tab-indicator'));

    document.body.removeChild(indicator);
  });

  it('does not add has-content class when hasContent is false', function () {
    var ti = new ModalTabIndicators({});

    var indicator = document.createElement('span');
    indicator.id = 'indicator-planning';
    indicator.className = 'tab-indicator has-content';
    document.body.appendChild(indicator);

    ti.updateTabIndicator('planning', false);
    assert.isFalse(indicator.classList.contains('has-content'));
    assert.isTrue(indicator.classList.contains('tab-indicator'));

    document.body.removeChild(indicator);
  });
});
