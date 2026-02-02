// === test/unit/modal-references.test.js ===
// Tests for ModalReferences sub-module

// ---- Inline minimal copy of ModalReferences for testing ----

function ModalReferences(modal) {
  this.modal = modal;
}

ModalReferences.prototype.truncate = function (str, len) {
  return str.length > len ? str.substring(0, len) + '...' : str;
};

ModalReferences.prototype.updateReferencesPreview = function () {
  var textarea = document.getElementById('stm-references');
  var preview = document.getElementById('stm-references-preview');
  if (!textarea || !preview) return;

  var lines = textarea.value.split('\n').filter(function (l) { return l.trim(); });
  if (lines.length === 0) {
    preview.innerHTML = '';
    return;
  }

  var self = this;
  preview.innerHTML = lines.map(function (line) {
    line = line.trim();
    if (line.match(/^https?:\/\//)) {
      return '<a href="' + line + '" class="badge bg-info">' + self.truncate(line, 40) + '</a>';
    }
    if (line.startsWith('\\\\')) {
      return '<span class="badge bg-secondary">' + self.truncate(line, 40) + '</span>';
    }
    if (line.includes('@')) {
      return '<a href="mailto:' + line + '" class="badge bg-success">' + line + '</a>';
    }
    if (line.match(/^[A-Z]+-\d+/)) {
      return '<span class="badge bg-warning">' + line + '</span>';
    }
    return '<span class="badge bg-light">' + self.truncate(line, 50) + '</span>';
  }).join('');
};

// ---- Tests ----

describe('ModalReferences -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { name: 'test-modal' };
    var mr = new ModalReferences(modal);
    assert.equal(mr.modal, modal);
    assert.equal(mr.modal.name, 'test-modal');
  });
});

describe('ModalReferences -- truncate', function () {
  it('returns original string for short strings', function () {
    var mr = new ModalReferences({});
    assert.equal(mr.truncate('hello', 10), 'hello');
  });

  it('returns original string when length equals limit', function () {
    var mr = new ModalReferences({});
    assert.equal(mr.truncate('12345', 5), '12345');
  });

  it('truncates long strings with ellipsis', function () {
    var mr = new ModalReferences({});
    assert.equal(mr.truncate('Hello World!', 5), 'Hello...');
  });

  it('handles empty string', function () {
    var mr = new ModalReferences({});
    assert.equal(mr.truncate('', 10), '');
  });

  it('truncates to 0 length correctly', function () {
    var mr = new ModalReferences({});
    assert.equal(mr.truncate('Hello', 0), '...');
  });

  it('handles very long URL', function () {
    var mr = new ModalReferences({});
    var longUrl = 'https://example.com/' + 'a'.repeat(100);
    var result = mr.truncate(longUrl, 40);
    assert.equal(result.length, 43); // 40 chars + '...'
    assert.includes(result, '...');
  });
});

describe('ModalReferences -- updateReferencesPreview', function () {
  it('does not throw when DOM elements are missing', function () {
    var mr = new ModalReferences({});
    assert.doesNotThrow(function () { mr.updateReferencesPreview(); });
  });

  it('handles empty textarea', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = '';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';
    preview.innerHTML = 'old content';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.equal(preview.innerHTML, '');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });

  it('handles whitespace-only textarea', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = '  \n  \n  ';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.equal(preview.innerHTML, '');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });

  it('creates info badge for URLs', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = 'https://example.com';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.includes(preview.innerHTML, 'bg-info');
    assert.includes(preview.innerHTML, 'https://example.com');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });

  it('creates success badge for emails', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = 'user@example.com';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.includes(preview.innerHTML, 'bg-success');
    assert.includes(preview.innerHTML, 'mailto:user@example.com');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });

  it('creates secondary badge for network paths', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = '\\\\server\\share';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.includes(preview.innerHTML, 'bg-secondary');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });

  it('creates warning badge for ticket references', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = 'GLPI-12345';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.includes(preview.innerHTML, 'bg-warning');
    assert.includes(preview.innerHTML, 'GLPI-12345');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });

  it('creates light badge for plain text', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = 'some plain text reference';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.includes(preview.innerHTML, 'bg-light');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });

  it('handles multiple lines of different types', function () {
    var mr = new ModalReferences({});

    var textarea = document.createElement('textarea');
    textarea.id = 'stm-references';
    textarea.value = 'https://example.com\nuser@test.com\nGLPI-999';
    var preview = document.createElement('div');
    preview.id = 'stm-references-preview';

    document.body.appendChild(textarea);
    document.body.appendChild(preview);

    mr.updateReferencesPreview();
    assert.includes(preview.innerHTML, 'bg-info');
    assert.includes(preview.innerHTML, 'bg-success');
    assert.includes(preview.innerHTML, 'bg-warning');

    document.body.removeChild(textarea);
    document.body.removeChild(preview);
  });
});
