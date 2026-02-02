// === test/unit/kanban-renderer.test.js ===
// Tests for js/managers/view/KanbanRenderer.js

// ---- Inline minimal copy of KanbanRenderer ----

function KanbanRenderer(viewManager) {
  this.manager = viewManager;
}

KanbanRenderer.prototype.filterRecordsByStatus = function (records, statusId) {
  return records.filter(function (record) { return record.statut === statusId; });
};

KanbanRenderer.prototype.sortRecords = function (records) {
  var self = this;
  records.sort(function (a, b) {
    var prioA = self.manager.cardRenderer.calculatePriority(a.urgence, a.impact);
    var prioB = self.manager.cardRenderer.calculatePriority(b.urgence, b.impact);

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    if (a.date_echeance && b.date_echeance) {
      return new Date(a.date_echeance) - new Date(b.date_echeance);
    }

    if (a.date_echeance && !b.date_echeance) return -1;
    if (!a.date_echeance && b.date_echeance) return 1;

    return b.id - a.id;
  });
};

KanbanRenderer.prototype.calculateColumnStats = function (records) {
  var stats = {
    totalTasks: records.length,
    urgentTasks: 0,
    overdueTasks: 0,
    highPriorityTasks: 0,
    priorityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
    averagePriority: 0
  };

  if (records.length === 0) {
    return stats;
  }

  var self = this;
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var totalPriority = 0;

  records.forEach(function (record) {
    var priority = self.manager.cardRenderer.calculatePriority(record.urgence, record.impact);
    stats.priorityDistribution[priority]++;
    totalPriority += priority;

    if (priority <= 2) {
      stats.highPriorityTasks++;
    }

    if (record.date_echeance) {
      var echeance = new Date(record.date_echeance);
      echeance.setHours(0, 0, 0, 0);

      if (echeance < today) {
        stats.overdueTasks++;
      }

      var diffDays = Math.ceil((echeance - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        stats.urgentTasks++;
      }
    }
  });

  stats.averagePriority = Math.round(totalPriority / records.length * 10) / 10;
  return stats;
};

KanbanRenderer.prototype.getStatusIcon = function (statusId) {
  var icons = {
    'Backlog': '<i class="bi bi-list-ul"></i>',
    '\u00c0 faire': '<i class="bi bi-calendar-plus"></i>',
    'En cours': '<i class="bi bi-play-circle"></i>',
    'En attente': '<i class="bi bi-pause-circle"></i>',
    'Bloqu\u00e9': '<i class="bi bi-x-octagon"></i>',
    'Validation': '<i class="bi bi-check-circle"></i>',
    'Termin\u00e9': '<i class="bi bi-check-circle-fill"></i>'
  };

  return icons[statusId] || '<i class="bi bi-circle"></i>';
};

KanbanRenderer.prototype.getStatusClass = function (statusId) {
  var classes = {
    'Backlog': 'status-backlog',
    '\u00c0 faire': 'status-todo',
    'En cours': 'status-progress',
    'En attente': 'status-waiting',
    'Bloqu\u00e9': 'status-blocked',
    'Validation': 'status-validation',
    'Termin\u00e9': 'status-done'
  };

  return classes[statusId] || 'status-unknown';
};

// ---- Helper: simple calculatePriority for mock cardRenderer ----

function mockCalculatePriority(urgence, impact) {
  var imp = String(impact || '').trim().toLowerCase();
  var urg = String(urgence || '').trim().toLowerCase();

  if (imp === 'critique') return 1;
  if (imp === 'important') return (urg === 'imm\u00e9diate' || urg === 'courte') ? 1 : 2;
  if (imp === 'mod\u00e9r\u00e9') return (urg === 'imm\u00e9diate') ? 2 : 3;
  if (imp === 'mineur') return 4;
  return 3;
}

// ---- Tests ----

TestFramework.describe('KanbanRenderer', function () {

  it('Constructor stores manager reference', function () {
    var mockManager = { logger: { error: function () {} } };
    var renderer = new KanbanRenderer(mockManager);
    assert.equal(renderer.manager, mockManager);
  });

  it('filterRecordsByStatus filters correctly', function () {
    var renderer = new KanbanRenderer({});
    var records = [
      { id: 1, statut: 'Backlog' },
      { id: 2, statut: 'En cours' },
      { id: 3, statut: 'Backlog' },
      { id: 4, statut: 'Terminé' }
    ];

    var backlog = renderer.filterRecordsByStatus(records, 'Backlog');
    assert.equal(backlog.length, 2);
    assert.equal(backlog[0].id, 1);
    assert.equal(backlog[1].id, 3);

    var enCours = renderer.filterRecordsByStatus(records, 'En cours');
    assert.equal(enCours.length, 1);
    assert.equal(enCours[0].id, 2);
  });

  it('filterRecordsByStatus returns empty array for no matches', function () {
    var renderer = new KanbanRenderer({});
    var records = [
      { id: 1, statut: 'Backlog' }
    ];

    var result = renderer.filterRecordsByStatus(records, 'Terminé');
    assert.deepEqual(result, []);
  });

  it('sortRecords sorts by urgence priority', function () {
    var mockManager = {
      cardRenderer: { calculatePriority: mockCalculatePriority }
    };
    var renderer = new KanbanRenderer(mockManager);

    var records = [
      { id: 1, urgence: 'Longue', impact: 'Mineur' },
      { id: 2, urgence: 'Immédiate', impact: 'Critique' },
      { id: 3, urgence: 'Moyenne', impact: 'Modéré' }
    ];

    renderer.sortRecords(records);

    // Priority 1 (Critique) first, then 3 (Modere), then 4 (Mineur)
    assert.equal(records[0].id, 2);
    assert.equal(records[1].id, 3);
    assert.equal(records[2].id, 1);
  });

  it('sortRecords uses date_echeance as secondary sort', function () {
    var mockManager = {
      cardRenderer: { calculatePriority: mockCalculatePriority }
    };
    var renderer = new KanbanRenderer(mockManager);

    var records = [
      { id: 1, urgence: 'Moyenne', impact: 'Modéré', date_echeance: '2024-12-31' },
      { id: 2, urgence: 'Moyenne', impact: 'Modéré', date_echeance: '2024-01-15' }
    ];

    renderer.sortRecords(records);

    // Same priority, earlier date first
    assert.equal(records[0].id, 2);
    assert.equal(records[1].id, 1);
  });

  it('sortRecords puts records with echeance before those without', function () {
    var mockManager = {
      cardRenderer: { calculatePriority: mockCalculatePriority }
    };
    var renderer = new KanbanRenderer(mockManager);

    var records = [
      { id: 1, urgence: 'Moyenne', impact: 'Modéré' },
      { id: 2, urgence: 'Moyenne', impact: 'Modéré', date_echeance: '2024-06-01' }
    ];

    renderer.sortRecords(records);

    assert.equal(records[0].id, 2);
    assert.equal(records[1].id, 1);
  });

  it('calculateColumnStats returns correct counts', function () {
    var mockManager = {
      cardRenderer: { calculatePriority: mockCalculatePriority }
    };
    var renderer = new KanbanRenderer(mockManager);

    var records = [
      { id: 1, urgence: 'Immédiate', impact: 'Critique' },
      { id: 2, urgence: 'Longue', impact: 'Mineur' },
      { id: 3, urgence: 'Moyenne', impact: 'Modéré' }
    ];

    var stats = renderer.calculateColumnStats(records);

    assert.equal(stats.totalTasks, 3);
    assert.equal(stats.priorityDistribution[1], 1);
    assert.equal(stats.priorityDistribution[3], 1);
    assert.equal(stats.priorityDistribution[4], 1);
    assert.equal(stats.highPriorityTasks, 1);
  });

  it('calculateColumnStats returns zeros for empty records', function () {
    var mockManager = {
      cardRenderer: { calculatePriority: mockCalculatePriority }
    };
    var renderer = new KanbanRenderer(mockManager);

    var stats = renderer.calculateColumnStats([]);

    assert.equal(stats.totalTasks, 0);
    assert.equal(stats.urgentTasks, 0);
    assert.equal(stats.overdueTasks, 0);
    assert.equal(stats.highPriorityTasks, 0);
    assert.equal(stats.averagePriority, 0);
  });

  it('calculateColumnStats detects overdue tasks', function () {
    var mockManager = {
      cardRenderer: { calculatePriority: mockCalculatePriority }
    };
    var renderer = new KanbanRenderer(mockManager);

    var records = [
      { id: 1, urgence: 'Moyenne', impact: 'Modéré', date_echeance: '2020-01-01' }
    ];

    var stats = renderer.calculateColumnStats(records);
    assert.equal(stats.overdueTasks, 1);
  });

  it('getStatusIcon returns icon for known statuses', function () {
    var renderer = new KanbanRenderer({});

    assert.includes(renderer.getStatusIcon('Backlog'), 'bi-list-ul');
    assert.includes(renderer.getStatusIcon('En cours'), 'bi-play-circle');
    assert.includes(renderer.getStatusIcon('Terminé'), 'bi-check-circle-fill');
  });

  it('getStatusIcon returns default icon for unknown status', function () {
    var renderer = new KanbanRenderer({});
    assert.includes(renderer.getStatusIcon('Unknown'), 'bi-circle');
  });

  it('getStatusClass returns class for known statuses', function () {
    var renderer = new KanbanRenderer({});

    assert.equal(renderer.getStatusClass('Backlog'), 'status-backlog');
    assert.equal(renderer.getStatusClass('En cours'), 'status-progress');
    assert.equal(renderer.getStatusClass('Terminé'), 'status-done');
    assert.equal(renderer.getStatusClass('Bloqué'), 'status-blocked');
  });

  it('getStatusClass returns status-unknown for unknown status', function () {
    var renderer = new KanbanRenderer({});
    assert.equal(renderer.getStatusClass('Inexistant'), 'status-unknown');
  });

});
