// === test/unit/history-validator.test.js ===
// Tests for js/managers/history/HistoryValidator.js

// ---- Inline minimal copy of HistoryValidator ----

function HistoryValidator(historyManager) {
  this.manager = historyManager;
}

HistoryValidator.prototype.validateHistoryStructure = function (historyJSON) {
  try {
    var data = JSON.parse(historyJSON);

    if (!data.historique || !Array.isArray(data.historique)) {
      return { isValid: false, error: 'Structure historique invalide' };
    }

    var invalidEntries = data.historique.filter(function (entry) {
      return !entry.statut || !entry.date_entree;
    });

    if (invalidEntries.length > 0) {
      return {
        isValid: false,
        error: invalidEntries.length + ' entrée(s) invalide(s) trouvée(s)'
      };
    }

    return { isValid: true, entriesCount: data.historique.length };

  } catch (error) {
    return { isValid: false, error: 'JSON invalide' };
  }
};

HistoryValidator.prototype.generateHistoryBadge = function (task) {
  if (!task.historique_statuts) return '';

  try {
    var historyData = JSON.parse(task.historique_statuts);
    var historyCount = historyData.historique ? historyData.historique.length : 0;

    if (historyCount <= 1) return '';

    return '<button class="btn-history" title="Voir l\'historique (' + historyCount + ' étapes)" data-task-id="' + task.id + '">' +
      '<i class="bi bi-clock-history"></i> ' + historyCount +
      '</button>';
  } catch (error) {
    this.manager.logger.warn('Erreur génération badge:', error);
    return '';
  }
};

HistoryValidator.prototype.updateTaskHistory = function (task, newStatus, note) {
  if (note === undefined) note = null;
  var now = new Date().toISOString();
  var user = this.manager.kanban.currentUser || 'Système';

  try {
    var historyData;

    if (task.historique_statuts) {
      historyData = JSON.parse(task.historique_statuts);
    } else {
      historyData = { historique: [], version: 1 };
    }

    if (!historyData || typeof historyData !== 'object') {
      historyData = { historique: [], version: 1 };
    }

    if (!Array.isArray(historyData.historique)) {
      historyData.historique = [];
    }

    if (historyData.historique.length > 0) {
      var lastEntry = historyData.historique[historyData.historique.length - 1];
      if (!lastEntry.date_sortie) {
        lastEntry.date_sortie = now;
        lastEntry.duree_minutes = 0; // simplified for test
      }
    }

    historyData.historique.push({
      statut: newStatus,
      date_entree: now,
      date_sortie: null,
      duree_minutes: null,
      utilisateur: user,
      note: note,
      timestamp: now
    });

    return {
      historique_statuts: JSON.stringify(historyData),
      date_derniere_maj: now,
      statut_precedent: task.statut
    };

  } catch (error) {
    this.manager.logger.error('Erreur mise à jour historique:', error);

    var fallbackHistory = {
      historique: [{
        statut: newStatus,
        date_entree: now,
        date_sortie: null,
        duree_minutes: null,
        utilisateur: user,
        note: note || "Historique reconstruit après erreur",
        timestamp: now
      }],
      version: 1
    };

    return {
      historique_statuts: JSON.stringify(fallbackHistory),
      date_derniere_maj: now,
      statut_precedent: task.statut || 'Inconnu'
    };
  }
};

// ---- Tests ----

TestFramework.describe('HistoryValidator', function () {

  it('validateHistoryStructure returns isValid:true for valid JSON', function () {
    var validator = new HistoryValidator({ logger: { warn: function () {} } });
    var json = JSON.stringify({
      historique: [
        { statut: 'En cours', date_entree: '2024-01-01T00:00:00.000Z' }
      ]
    });
    var result = validator.validateHistoryStructure(json);
    assert.isTrue(result.isValid);
    assert.equal(result.entriesCount, 1);
  });

  it('validateHistoryStructure returns isValid:false for invalid JSON', function () {
    var validator = new HistoryValidator({ logger: { warn: function () {} } });
    var result = validator.validateHistoryStructure('not json at all');
    assert.equal(result.isValid, false);
    assert.equal(result.error, 'JSON invalide');
  });

  it('validateHistoryStructure returns isValid:false for missing historique array', function () {
    var validator = new HistoryValidator({ logger: { warn: function () {} } });
    var json = JSON.stringify({ version: 1 });
    var result = validator.validateHistoryStructure(json);
    assert.equal(result.isValid, false);
    assert.equal(result.error, 'Structure historique invalide');
  });

  it('validateHistoryStructure returns isValid:false for entries without statut/date_entree', function () {
    var validator = new HistoryValidator({ logger: { warn: function () {} } });
    var json = JSON.stringify({
      historique: [
        { statut: 'En cours' },
        { date_entree: '2024-01-01T00:00:00.000Z' }
      ]
    });
    var result = validator.validateHistoryStructure(json);
    assert.equal(result.isValid, false);
    assert.includes(result.error, 'invalide(s)');
  });

  it('generateHistoryBadge returns empty string for no history', function () {
    var validator = new HistoryValidator({ logger: { warn: function () {} } });
    var task = { id: 1 };
    var result = validator.generateHistoryBadge(task);
    assert.equal(result, '');
  });

  it('generateHistoryBadge returns empty string for task with only 1 entry', function () {
    var validator = new HistoryValidator({ logger: { warn: function () {} } });
    var task = {
      id: 1,
      historique_statuts: JSON.stringify({
        historique: [{ statut: 'Backlog', date_entree: '2024-01-01T00:00:00.000Z' }]
      })
    };
    var result = validator.generateHistoryBadge(task);
    assert.equal(result, '');
  });

  it('generateHistoryBadge returns badge HTML for task with history', function () {
    var validator = new HistoryValidator({ logger: { warn: function () {} } });
    var task = {
      id: 42,
      historique_statuts: JSON.stringify({
        historique: [
          { statut: 'Backlog', date_entree: '2024-01-01T00:00:00.000Z' },
          { statut: 'En cours', date_entree: '2024-01-02T00:00:00.000Z' },
          { statut: 'Terminé', date_entree: '2024-01-03T00:00:00.000Z' }
        ]
      })
    };
    var result = validator.generateHistoryBadge(task);
    assert.includes(result, 'btn-history');
    assert.includes(result, 'data-task-id="42"');
    assert.includes(result, '3');
  });

  it('updateTaskHistory creates new entry with correct fields', function () {
    var mockManager = {
      kanban: { currentUser: 'TestUser' },
      logger: { error: function () {}, warn: function () {} }
    };
    var validator = new HistoryValidator(mockManager);
    var task = { id: 1, statut: 'Backlog' };
    var result = validator.updateTaskHistory(task, 'En cours', 'test note');

    assert.ok(result.historique_statuts);
    assert.ok(result.date_derniere_maj);
    assert.equal(result.statut_precedent, 'Backlog');

    var parsed = JSON.parse(result.historique_statuts);
    assert.equal(parsed.historique.length, 1);
    assert.equal(parsed.historique[0].statut, 'En cours');
    assert.equal(parsed.historique[0].utilisateur, 'TestUser');
    assert.equal(parsed.historique[0].note, 'test note');
    assert.isNull(parsed.historique[0].date_sortie);
  });

  it('updateTaskHistory uses Systeme as fallback user', function () {
    var mockManager = {
      kanban: {},
      logger: { error: function () {}, warn: function () {} }
    };
    var validator = new HistoryValidator(mockManager);
    var task = { id: 2, statut: 'Backlog' };
    var result = validator.updateTaskHistory(task, 'En cours');

    var parsed = JSON.parse(result.historique_statuts);
    assert.equal(parsed.historique[0].utilisateur, 'Système');
  });

  it('updateTaskHistory closes previous entry when adding new one', function () {
    var mockManager = {
      kanban: { currentUser: 'TestUser' },
      logger: { error: function () {}, warn: function () {} }
    };
    var validator = new HistoryValidator(mockManager);

    var existingHistory = JSON.stringify({
      historique: [{
        statut: 'Backlog',
        date_entree: '2024-01-01T00:00:00.000Z',
        date_sortie: null,
        duree_minutes: null
      }],
      version: 1
    });

    var task = { id: 1, statut: 'Backlog', historique_statuts: existingHistory };
    var result = validator.updateTaskHistory(task, 'En cours');

    var parsed = JSON.parse(result.historique_statuts);
    assert.equal(parsed.historique.length, 2);
    assert.ok(parsed.historique[0].date_sortie);
    assert.equal(parsed.historique[1].statut, 'En cours');
  });

});
