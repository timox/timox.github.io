// === test/unit/modal-history.test.js ===
// Tests for ModalHistory sub-module

// ---- Inline minimal copy of ModalHistory for testing ----

function ModalHistory(modal) {
  this.modal = modal;
}

ModalHistory.prototype.getActionLabel = function (action) {
  var labels = {
    'comment': 'Commentaire',
    'status_change': 'Changement de statut',
    'update': 'Modification',
    'field_change': 'Modification',
    'jalons_update': 'Jalons modifies',
    'strategies_update': 'Strategies modifiees',
    'create': 'Creation'
  };
  return labels[action] || action || 'Modification';
};

ModalHistory.prototype.parseNotesHistory = function (task) {
  var entries = [];

  if (!task.notes) {
    return entries;
  }

  try {
    var notesData = typeof task.notes === 'string'
      ? JSON.parse(task.notes)
      : task.notes;

    if (notesData && notesData.history && Array.isArray(notesData.history)) {
      notesData.history.forEach(function (entry) {
        var timestamp = entry.timestamp;
        if (typeof timestamp === 'string') {
          timestamp = new Date(timestamp).getTime();
        }
        if (timestamp > 1e12) {
          timestamp = Math.floor(timestamp / 1000);
        }

        entries.push({
          timestamp: timestamp,
          user: entry.user || 'Utilisateur',
          action: entry.action || 'update',
          field: entry.field || '',
          oldValue: entry.oldValue || '',
          newValue: entry.newValue || '',
          details: entry.details || '',
          status: entry.status || ''
        });
      });
    }
  } catch (error) {
    // Invalid JSON, return empty
  }

  entries.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

  return entries;
};

// ---- Tests ----

describe('ModalHistory -- constructor', function () {
  it('stores modal reference', function () {
    var modal = { currentTask: null };
    var mh = new ModalHistory(modal);
    assert.equal(mh.modal, modal);
    assert.isNull(mh.modal.currentTask);
  });
});

describe('ModalHistory -- getActionLabel', function () {
  it('returns correct label for comment', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('comment'), 'Commentaire');
  });

  it('returns correct label for status_change', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('status_change'), 'Changement de statut');
  });

  it('returns correct label for update', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('update'), 'Modification');
  });

  it('returns correct label for field_change', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('field_change'), 'Modification');
  });

  it('returns correct label for jalons_update', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('jalons_update'), 'Jalons modifies');
  });

  it('returns correct label for strategies_update', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('strategies_update'), 'Strategies modifiees');
  });

  it('returns correct label for create', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('create'), 'Creation');
  });

  it('returns the action string itself for unknown actions', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel('custom_action'), 'custom_action');
  });

  it('returns Modification for null/undefined action', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel(null), 'Modification');
    assert.equal(mh.getActionLabel(undefined), 'Modification');
  });

  it('returns Modification for empty string action', function () {
    var mh = new ModalHistory({});
    assert.equal(mh.getActionLabel(''), 'Modification');
  });
});

describe('ModalHistory -- parseNotesHistory', function () {
  it('handles null notes', function () {
    var mh = new ModalHistory({});
    var result = mh.parseNotesHistory({ notes: null });
    assert.deepEqual(result, []);
  });

  it('handles undefined notes', function () {
    var mh = new ModalHistory({});
    var result = mh.parseNotesHistory({});
    assert.deepEqual(result, []);
  });

  it('handles empty string notes', function () {
    var mh = new ModalHistory({});
    var result = mh.parseNotesHistory({ notes: '' });
    assert.deepEqual(result, []);
  });

  it('handles invalid JSON gracefully', function () {
    var mh = new ModalHistory({});
    var result = mh.parseNotesHistory({ notes: '{invalid json}' });
    assert.deepEqual(result, []);
  });

  it('handles valid JSON without history field', function () {
    var mh = new ModalHistory({});
    var result = mh.parseNotesHistory({ notes: '{"content": "some text"}' });
    assert.deepEqual(result, []);
  });

  it('handles valid JSON with empty history array', function () {
    var mh = new ModalHistory({});
    var result = mh.parseNotesHistory({ notes: '{"content": "", "history": []}' });
    assert.deepEqual(result, []);
  });

  it('parses valid history entries from JSON string', function () {
    var mh = new ModalHistory({});
    var notes = JSON.stringify({
      content: 'Note content',
      history: [
        { timestamp: 1706000000, user: 'Alice', action: 'create', details: 'Created task' },
        { timestamp: 1706100000, user: 'Bob', action: 'status_change', details: 'Changed status' }
      ]
    });

    var result = mh.parseNotesHistory({ notes: notes });
    assert.equal(result.length, 2);
    // Sorted by timestamp descending (most recent first)
    assert.equal(result[0].timestamp, 1706100000);
    assert.equal(result[0].user, 'Bob');
    assert.equal(result[0].action, 'status_change');
    assert.equal(result[1].timestamp, 1706000000);
    assert.equal(result[1].user, 'Alice');
    assert.equal(result[1].action, 'create');
  });

  it('parses notes as object (not string)', function () {
    var mh = new ModalHistory({});
    var notesObj = {
      content: 'Test',
      history: [
        { timestamp: 1706000000, user: 'Alice', action: 'update' }
      ]
    };

    var result = mh.parseNotesHistory({ notes: notesObj });
    assert.equal(result.length, 1);
    assert.equal(result[0].user, 'Alice');
  });

  it('defaults user to Utilisateur when missing', function () {
    var mh = new ModalHistory({});
    var notes = JSON.stringify({
      content: '',
      history: [{ timestamp: 1706000000, action: 'update' }]
    });

    var result = mh.parseNotesHistory({ notes: notes });
    assert.equal(result[0].user, 'Utilisateur');
  });

  it('defaults action to update when missing', function () {
    var mh = new ModalHistory({});
    var notes = JSON.stringify({
      content: '',
      history: [{ timestamp: 1706000000, user: 'Alice' }]
    });

    var result = mh.parseNotesHistory({ notes: notes });
    assert.equal(result[0].action, 'update');
  });

  it('converts millisecond timestamps to seconds', function () {
    var mh = new ModalHistory({});
    var msTimestamp = 1706000000000; // milliseconds
    var notes = JSON.stringify({
      content: '',
      history: [{ timestamp: msTimestamp, user: 'Alice', action: 'update' }]
    });

    var result = mh.parseNotesHistory({ notes: notes });
    assert.equal(result[0].timestamp, 1706000000);
  });

  it('handles history with non-array value', function () {
    var mh = new ModalHistory({});
    var notes = JSON.stringify({ content: '', history: 'not an array' });
    var result = mh.parseNotesHistory({ notes: notes });
    assert.deepEqual(result, []);
  });
});
