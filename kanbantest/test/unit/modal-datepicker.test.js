// === test/unit/modal-datepicker.test.js ===
// Tests for ModalDatePicker sub-module

describe('ModalDatePicker -- constructor', function () {
  it('initializes with null instance', function () {
    var modal = { updateTimelineVisual: function () {}, updateCompletionRing: function () {} };
    var dp = new ModalDatePicker(modal);
    assert.isNull(dp.instance);
    assert.equal(dp.modal, modal);
  });
});

describe('ModalDatePicker -- updateStatus', function () {
  var origGetById;

  beforeEach(function () {
    origGetById = document.getElementById;
  });

  afterEach(function () {
    document.getElementById = origGetById;
  });

  it('shows "Aucune date" when date is null', function () {
    var statusSpan = { className: '', textContent: '' };
    var btnClear = { style: { display: '' } };
    document.getElementById = function (id) {
      if (id === 'stm-date-status') return statusSpan;
      if (id === 'stm-btn-clear-date') return btnClear;
      return null;
    };

    var dp = new ModalDatePicker({});
    dp.updateStatus(null);

    assert.equal(statusSpan.textContent, 'Aucune date définie');
    assert.includes(statusSpan.className, 'text-muted');
    assert.equal(btnClear.style.display, 'none');
  });

  it('shows "En retard" for past dates', function () {
    var statusSpan = { className: '', textContent: '' };
    var btnClear = { style: { display: '' } };
    document.getElementById = function (id) {
      if (id === 'stm-date-status') return statusSpan;
      if (id === 'stm-btn-clear-date') return btnClear;
      return null;
    };

    var dp = new ModalDatePicker({});
    var pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    dp.updateStatus(pastDate);

    assert.includes(statusSpan.textContent, 'En retard');
    assert.includes(statusSpan.className, 'text-danger');
    assert.equal(btnClear.style.display, 'block');
  });

  it('shows warning for dates within 7 days', function () {
    var statusSpan = { className: '', textContent: '' };
    var btnClear = { style: { display: '' } };
    document.getElementById = function (id) {
      if (id === 'stm-date-status') return statusSpan;
      if (id === 'stm-btn-clear-date') return btnClear;
      return null;
    };

    var dp = new ModalDatePicker({});
    var soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    dp.updateStatus(soonDate);

    assert.includes(statusSpan.textContent, 'Dans');
    assert.includes(statusSpan.className, 'text-warning');
  });

  it('shows muted for dates more than 7 days away', function () {
    var statusSpan = { className: '', textContent: '' };
    var btnClear = { style: { display: '' } };
    document.getElementById = function (id) {
      if (id === 'stm-date-status') return statusSpan;
      if (id === 'stm-btn-clear-date') return btnClear;
      return null;
    };

    var dp = new ModalDatePicker({});
    var farDate = new Date();
    farDate.setDate(farDate.getDate() + 30);
    dp.updateStatus(farDate);

    assert.includes(statusSpan.textContent, 'Dans');
    assert.includes(statusSpan.className, 'text-muted');
  });
});

describe('ModalDatePicker -- setDate', function () {
  it('calls instance.setDate when flatpickr is active', function () {
    var dp = new ModalDatePicker({});
    var receivedDate = null;
    dp.instance = { setDate: function (d) { receivedDate = d; } };

    var date = new Date(2025, 5, 15);
    dp.setDate(date);
    assert.equal(receivedDate, date);
  });

  it('sets input value when no flatpickr instance', function () {
    var dp = new ModalDatePicker({});
    var origGetById = document.getElementById;
    var inputEl = { value: '' };
    document.getElementById = function (id) {
      if (id === 'stm-echeance') return inputEl;
      return null;
    };

    var date = new Date(2025, 5, 15);
    dp.setDate(date);
    assert.ok(inputEl.value.length > 0);

    document.getElementById = origGetById;
  });
});

describe('ModalDatePicker -- getDate', function () {
  it('returns date from flatpickr instance', function () {
    var dp = new ModalDatePicker({});
    var expected = new Date(2025, 5, 15);
    dp.instance = { selectedDates: [expected] };

    var result = dp.getDate();
    assert.equal(result, expected);
  });

  it('returns null when flatpickr has no dates', function () {
    var dp = new ModalDatePicker({});
    dp.instance = { selectedDates: [] };

    assert.isNull(dp.getDate());
  });

  it('returns null when no instance and empty input', function () {
    var dp = new ModalDatePicker({});
    var origGetById = document.getElementById;
    document.getElementById = function (id) {
      if (id === 'stm-echeance') return { value: '' };
      return null;
    };

    assert.isNull(dp.getDate());

    document.getElementById = origGetById;
  });

  it('returns date from native input fallback', function () {
    var dp = new ModalDatePicker({});
    var origGetById = document.getElementById;
    document.getElementById = function (id) {
      if (id === 'stm-echeance') return { value: '2025-06-15' };
      return null;
    };

    var result = dp.getDate();
    assert.isNotNull(result);
    assert.equal(result.getFullYear(), 2025);

    document.getElementById = origGetById;
  });
});

describe('ModalDatePicker -- clear', function () {
  it('clears flatpickr instance and updates status', function () {
    var dp = new ModalDatePicker({});
    var clearCalled = false;
    dp.instance = { clear: function () { clearCalled = true; } };

    var origGetById = document.getElementById;
    var statusSpan = { className: '', textContent: '' };
    var btnClear = { style: { display: '' } };
    document.getElementById = function (id) {
      if (id === 'stm-date-status') return statusSpan;
      if (id === 'stm-btn-clear-date') return btnClear;
      return null;
    };

    dp.clear();
    assert.isTrue(clearCalled);
    assert.equal(statusSpan.textContent, 'Aucune date définie');

    document.getElementById = origGetById;
  });

  it('clears native input when no flatpickr', function () {
    var dp = new ModalDatePicker({});
    var origGetById = document.getElementById;
    var inputEl = { value: '2025-06-15' };
    var statusSpan = { className: '', textContent: '' };
    var btnClear = { style: { display: '' } };
    document.getElementById = function (id) {
      if (id === 'stm-echeance') return inputEl;
      if (id === 'stm-date-status') return statusSpan;
      if (id === 'stm-btn-clear-date') return btnClear;
      return null;
    };

    dp.clear();
    assert.equal(inputEl.value, '');

    document.getElementById = origGetById;
  });
});

describe('ModalDatePicker -- destroy', function () {
  it('destroys instance and sets to null', function () {
    var dp = new ModalDatePicker({});
    var destroyCalled = false;
    dp.instance = { destroy: function () { destroyCalled = true; } };

    dp.destroy();
    assert.isTrue(destroyCalled);
    assert.isNull(dp.instance);
  });

  it('handles null instance gracefully', function () {
    var dp = new ModalDatePicker({});
    assert.doesNotThrow(function () { dp.destroy(); });
  });
});
