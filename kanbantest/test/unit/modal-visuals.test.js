// === test/unit/modal-visuals.test.js ===
// Tests for ModalVisuals sub-module

// ---- Inline minimal copy of ModalVisuals for testing ----

function ModalVisuals(modal) {
  this.modal = modal;
}

ModalVisuals.prototype.updateAvancementDisplay = function (value) {
  var badge = document.getElementById('stm-avancement-badge');
  var bar = document.getElementById('stm-avancement-bar');

  if (badge) badge.textContent = value + '%';
  if (bar) {
    bar.style.width = value + '%';
    bar.className = 'progress-bar';
    if (value === 100) {
      bar.classList.add('bg-success');
    } else if (value >= 75) {
      bar.classList.add('bg-info');
    } else if (value >= 50) {
      bar.classList.add('bg-primary');
    } else if (value >= 25) {
      bar.classList.add('bg-warning');
    }
  }
};

ModalVisuals.prototype.updateStatusBadge = function () {
  var badge = document.getElementById('stm-status-badge');
  var select = document.getElementById('stm-statut');

  if (!badge || !select) return;

  var statut = select.value;
  var option = select.options[select.selectedIndex];
  var color = (option && option.dataset && option.dataset.color) || 'secondary';

  badge.className = 'badge bg-' + color;
  badge.textContent = statut;
};

ModalVisuals.prototype.setPriorityButtonValue = function (containerId, value) {
  var mapping = {
    'stm-urgence-buttons': 'stm-urgence',
    'stm-impact-buttons': 'stm-impact'
  };
  var selectId = mapping[containerId] || containerId;
  this.modal.setFieldValue(selectId, value);
};

ModalVisuals.prototype.updateDureeEcart = function () {
  var estimeeEl = document.getElementById('stm-duree-estimee');
  var reelleEl = document.getElementById('stm-duree-reelle');
  var ecartDiv = document.getElementById('stm-duree-ecart');

  var estimee = estimeeEl ? parseFloat(estimeeEl.value) || 0 : 0;
  var reelle = reelleEl ? parseFloat(reelleEl.value) || 0 : 0;

  if (!ecartDiv || estimee === 0) {
    if (ecartDiv) ecartDiv.textContent = '';
    return;
  }

  var ecart = reelle - estimee;
  if (ecart > 0) {
    ecartDiv.textContent = '+' + ecart.toFixed(1);
  } else if (ecart < 0) {
    ecartDiv.textContent = ecart.toFixed(1);
  } else {
    ecartDiv.textContent = 'Dans les temps';
  }
};

// ---- Tests ----

describe('ModalVisuals -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { name: 'test-modal' };
    var mv = new ModalVisuals(modal);
    assert.equal(mv.modal, modal);
    assert.equal(mv.modal.name, 'test-modal');
  });
});

describe('ModalVisuals -- updateAvancementDisplay', function () {
  it('does not throw when DOM elements are missing', function () {
    var mv = new ModalVisuals({});
    assert.doesNotThrow(function () { mv.updateAvancementDisplay(50); });
  });

  it('handles value 0', function () {
    var mv = new ModalVisuals({});

    var badge = document.createElement('span');
    badge.id = 'stm-avancement-badge';
    var bar = document.createElement('div');
    bar.id = 'stm-avancement-bar';

    document.body.appendChild(badge);
    document.body.appendChild(bar);

    mv.updateAvancementDisplay(0);
    assert.equal(badge.textContent, '0%');
    assert.equal(bar.style.width, '0%');
    assert.equal(bar.className, 'progress-bar');

    document.body.removeChild(badge);
    document.body.removeChild(bar);
  });

  it('handles value 100 with bg-success class', function () {
    var mv = new ModalVisuals({});

    var badge = document.createElement('span');
    badge.id = 'stm-avancement-badge';
    var bar = document.createElement('div');
    bar.id = 'stm-avancement-bar';

    document.body.appendChild(badge);
    document.body.appendChild(bar);

    mv.updateAvancementDisplay(100);
    assert.equal(badge.textContent, '100%');
    assert.equal(bar.style.width, '100%');
    assert.isTrue(bar.classList.contains('bg-success'));

    document.body.removeChild(badge);
    document.body.removeChild(bar);
  });

  it('applies bg-info class for value >= 75', function () {
    var mv = new ModalVisuals({});

    var badge = document.createElement('span');
    badge.id = 'stm-avancement-badge';
    var bar = document.createElement('div');
    bar.id = 'stm-avancement-bar';

    document.body.appendChild(badge);
    document.body.appendChild(bar);

    mv.updateAvancementDisplay(80);
    assert.equal(badge.textContent, '80%');
    assert.isTrue(bar.classList.contains('bg-info'));

    document.body.removeChild(badge);
    document.body.removeChild(bar);
  });

  it('applies bg-primary class for value >= 50', function () {
    var mv = new ModalVisuals({});

    var bar = document.createElement('div');
    bar.id = 'stm-avancement-bar';
    var badge = document.createElement('span');
    badge.id = 'stm-avancement-badge';

    document.body.appendChild(badge);
    document.body.appendChild(bar);

    mv.updateAvancementDisplay(60);
    assert.isTrue(bar.classList.contains('bg-primary'));

    document.body.removeChild(badge);
    document.body.removeChild(bar);
  });

  it('applies bg-warning class for value >= 25', function () {
    var mv = new ModalVisuals({});

    var bar = document.createElement('div');
    bar.id = 'stm-avancement-bar';
    var badge = document.createElement('span');
    badge.id = 'stm-avancement-badge';

    document.body.appendChild(badge);
    document.body.appendChild(bar);

    mv.updateAvancementDisplay(30);
    assert.isTrue(bar.classList.contains('bg-warning'));

    document.body.removeChild(badge);
    document.body.removeChild(bar);
  });
});

describe('ModalVisuals -- updateStatusBadge', function () {
  it('does not throw when badge or select are missing', function () {
    var mv = new ModalVisuals({});
    assert.doesNotThrow(function () { mv.updateStatusBadge(); });
  });

  it('handles status with default color', function () {
    var mv = new ModalVisuals({});

    var badge = document.createElement('span');
    badge.id = 'stm-status-badge';

    var select = document.createElement('select');
    select.id = 'stm-statut';
    var option = document.createElement('option');
    option.value = 'En cours';
    option.textContent = 'En cours';
    select.appendChild(option);

    document.body.appendChild(badge);
    document.body.appendChild(select);

    mv.updateStatusBadge();
    assert.equal(badge.textContent, 'En cours');
    assert.includes(badge.className, 'bg-secondary');

    document.body.removeChild(badge);
    document.body.removeChild(select);
  });

  it('handles status with custom data-color', function () {
    var mv = new ModalVisuals({});

    var badge = document.createElement('span');
    badge.id = 'stm-status-badge';

    var select = document.createElement('select');
    select.id = 'stm-statut';
    var option = document.createElement('option');
    option.value = 'Termine';
    option.textContent = 'Termine';
    option.dataset.color = 'success';
    select.appendChild(option);

    document.body.appendChild(badge);
    document.body.appendChild(select);

    mv.updateStatusBadge();
    assert.equal(badge.textContent, 'Termine');
    assert.includes(badge.className, 'bg-success');

    document.body.removeChild(badge);
    document.body.removeChild(select);
  });

  it('handles empty status select', function () {
    var mv = new ModalVisuals({});

    var badge = document.createElement('span');
    badge.id = 'stm-status-badge';

    var select = document.createElement('select');
    select.id = 'stm-statut';
    var option = document.createElement('option');
    option.value = '';
    option.textContent = '';
    select.appendChild(option);

    document.body.appendChild(badge);
    document.body.appendChild(select);

    mv.updateStatusBadge();
    assert.equal(badge.textContent, '');
    assert.includes(badge.className, 'bg-secondary');

    document.body.removeChild(badge);
    document.body.removeChild(select);
  });
});

describe('ModalVisuals -- setPriorityButtonValue', function () {
  it('maps container IDs to select IDs', function () {
    var setValues = [];
    var modal = {
      setFieldValue: function (id, val) { setValues.push({ id: id, val: val }); }
    };
    var mv = new ModalVisuals(modal);

    mv.setPriorityButtonValue('stm-urgence-buttons', 'Haute');
    assert.equal(setValues[0].id, 'stm-urgence');
    assert.equal(setValues[0].val, 'Haute');

    mv.setPriorityButtonValue('stm-impact-buttons', 'Critique');
    assert.equal(setValues[1].id, 'stm-impact');
    assert.equal(setValues[1].val, 'Critique');
  });

  it('passes through unknown container IDs', function () {
    var setValues = [];
    var modal = {
      setFieldValue: function (id, val) { setValues.push({ id: id, val: val }); }
    };
    var mv = new ModalVisuals(modal);

    mv.setPriorityButtonValue('stm-custom', 'Value');
    assert.equal(setValues[0].id, 'stm-custom');
  });
});

describe('ModalVisuals -- updateDureeEcart', function () {
  it('does not throw when DOM elements are missing', function () {
    var mv = new ModalVisuals({});
    assert.doesNotThrow(function () { mv.updateDureeEcart(); });
  });

  it('shows empty text when estimee is 0', function () {
    var mv = new ModalVisuals({});

    var estimee = document.createElement('input');
    estimee.id = 'stm-duree-estimee';
    estimee.value = '0';
    var reelle = document.createElement('input');
    reelle.id = 'stm-duree-reelle';
    reelle.value = '5';
    var ecartDiv = document.createElement('div');
    ecartDiv.id = 'stm-duree-ecart';

    document.body.appendChild(estimee);
    document.body.appendChild(reelle);
    document.body.appendChild(ecartDiv);

    mv.updateDureeEcart();
    assert.equal(ecartDiv.textContent, '');

    document.body.removeChild(estimee);
    document.body.removeChild(reelle);
    document.body.removeChild(ecartDiv);
  });
});
