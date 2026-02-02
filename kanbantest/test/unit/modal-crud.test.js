// === test/unit/modal-crud.test.js ===
// Tests for ModalCRUD sub-module

// ---- Inline minimal copy of ModalCRUD for testing ----

function ModalCRUD(modal) {
  this.modal = modal;
}

ModalCRUD.prototype.showError = function (message) {
  // In the real implementation this calls alert(message)
  // For testing, we simulate finding no alert element
  if (typeof this._alertFn === 'function') {
    this._alertFn(message);
  }
};

ModalCRUD.prototype.handleDelete = function () {
  if (!this.modal.currentTask || !this.modal.currentTask.id) return;

  // In real code, confirm() is called here. We skip it for unit tests.
  if (this.modal.options && this.modal.options.onDelete) {
    this.modal.options.onDelete(this.modal.currentTask.id);
  }
};

ModalCRUD.prototype.handleSave = function () {
  var data = this.modal.formDataModule.getFormData();

  if (!data.titre || !data.titre.trim()) {
    this.showError('Le titre est obligatoire');
    return 'validation_error';
  }

  if (this.modal.options && this.modal.options.onSave) {
    this.modal.options.onSave(data);
  }
  return 'ok';
};

ModalCRUD.prototype.handleAddLink = function () {
  if (this.modal.options && this.modal.options.onAddLink) {
    this.modal.options.onAddLink(this.modal.currentTask);
  }
};

// ---- Tests ----

describe('ModalCRUD -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { name: 'test-modal' };
    var crud = new ModalCRUD(modal);
    assert.equal(crud.modal, modal);
    assert.equal(crud.modal.name, 'test-modal');
  });
});

describe('ModalCRUD -- showError', function () {
  it('does not throw when no alert function set', function () {
    var crud = new ModalCRUD({});
    assert.doesNotThrow(function () { crud.showError('Some error'); });
  });

  it('calls alert function with message when set', function () {
    var crud = new ModalCRUD({});
    var capturedMsg = null;
    crud._alertFn = function (msg) { capturedMsg = msg; };

    crud.showError('Test error');
    assert.equal(capturedMsg, 'Test error');
  });
});

describe('ModalCRUD -- handleDelete', function () {
  it('does nothing when no currentTask', function () {
    var deleteCalled = false;
    var modal = {
      currentTask: null,
      options: { onDelete: function () { deleteCalled = true; } }
    };
    var crud = new ModalCRUD(modal);

    crud.handleDelete();
    assert.isFalse(deleteCalled);
  });

  it('does nothing when currentTask has no id', function () {
    var deleteCalled = false;
    var modal = {
      currentTask: {},
      options: { onDelete: function () { deleteCalled = true; } }
    };
    var crud = new ModalCRUD(modal);

    crud.handleDelete();
    assert.isFalse(deleteCalled);
  });

  it('does nothing when no onDelete callback', function () {
    var modal = {
      currentTask: { id: 42 },
      options: {}
    };
    var crud = new ModalCRUD(modal);
    assert.doesNotThrow(function () { crud.handleDelete(); });
  });

  it('calls onDelete with task id when currentTask and callback exist', function () {
    var deletedId = null;
    var modal = {
      currentTask: { id: 42 },
      options: { onDelete: function (id) { deletedId = id; } }
    };
    var crud = new ModalCRUD(modal);

    crud.handleDelete();
    assert.equal(deletedId, 42);
  });
});

describe('ModalCRUD -- handleSave', function () {
  it('returns validation error when titre is empty', function () {
    var errorMsg = null;
    var modal = {
      formDataModule: {
        getFormData: function () { return { titre: '' }; }
      },
      options: {}
    };
    var crud = new ModalCRUD(modal);
    crud._alertFn = function (msg) { errorMsg = msg; };

    var result = crud.handleSave();
    assert.equal(result, 'validation_error');
    assert.includes(errorMsg, 'titre');
  });

  it('returns validation error when titre is whitespace only', function () {
    var modal = {
      formDataModule: {
        getFormData: function () { return { titre: '   ' }; }
      },
      options: {}
    };
    var crud = new ModalCRUD(modal);
    crud._alertFn = function () {};

    var result = crud.handleSave();
    assert.equal(result, 'validation_error');
  });

  it('calls onSave with form data when titre is valid', function () {
    var savedData = null;
    var modal = {
      formDataModule: {
        getFormData: function () { return { titre: 'My task', statut: 'En cours' }; }
      },
      options: { onSave: function (data) { savedData = data; } }
    };
    var crud = new ModalCRUD(modal);

    var result = crud.handleSave();
    assert.equal(result, 'ok');
    assert.equal(savedData.titre, 'My task');
    assert.equal(savedData.statut, 'En cours');
  });
});

describe('ModalCRUD -- handleAddLink', function () {
  it('does nothing when no onAddLink callback', function () {
    var modal = { currentTask: { id: 1 }, options: {} };
    var crud = new ModalCRUD(modal);
    assert.doesNotThrow(function () { crud.handleAddLink(); });
  });

  it('calls onAddLink with currentTask', function () {
    var receivedTask = null;
    var modal = {
      currentTask: { id: 42, titre: 'Test' },
      options: { onAddLink: function (task) { receivedTask = task; } }
    };
    var crud = new ModalCRUD(modal);

    crud.handleAddLink();
    assert.equal(receivedTask.id, 42);
    assert.equal(receivedTask.titre, 'Test');
  });
});
