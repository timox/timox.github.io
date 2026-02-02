// === test/unit/history-exporter.test.js ===
// Tests for js/managers/history/HistoryExporter.js

// ---- Inline minimal copy of HistoryExporter ----

function HistoryExporter(historyManager) {
  this.manager = historyManager;
}

HistoryExporter.prototype.generateTaskHistoryCSV = function (historyData) {
  var task = historyData.task;
  var timeline = historyData.timeline;
  var stats = historyData.stats;

  var csv = 'Type,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';

  csv += '"Tâche","' + task.titre + '","' + (stats.creationDate ? stats.creationDate.toISOString() : '') + '","","","ID: ' + task.id + '"\n';
  csv += '"Statistiques","Total","","","' + stats.totalDuration + '","' + stats.totalSteps + ' étapes, ' + stats.totalComments + ' commentaires"\n';

  timeline.forEach(function (entry) {
    var date = entry.timestamp.toISOString();
    var user = entry.user || entry.utilisateur || '';
    var duration = entry.duration || '';
    var content = '';

    if (entry.type === 'status_change') {
      content = entry.note || 'Changement de statut';
      csv += '"Statut","' + entry.statut + '","' + date + '","' + user + '","' + duration + '","' + content.replace(/"/g, '""') + '"\n';
    } else if (entry.type === 'comment') {
      content = entry.content || '';
      csv += '"Commentaire","","' + date + '","' + user + '","","' + content.replace(/"/g, '""') + '"\n';
    }
  });

  return csv;
};

HistoryExporter.prototype.generateFullHistoryCSV = function () {
  var self = this;
  var csv = 'ID_Tache,Titre,Projet,Statut_Actuel,Type_Entree,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';

  this.manager.kanban.currentRecords.forEach(function (task) {
    var historyData = self.manager.parseTaskHistory(task);
    var timeline = historyData.timeline;

    if (timeline.length === 0) {
      csv += '"' + task.id + '","' + task.titre + '","' + (task.projet || '') + '","' + task.statut + '","Info","","","","","Pas d\'historique disponible"\n';
      return;
    }

    timeline.forEach(function (entry) {
      var date = entry.timestamp.toISOString();
      var user = entry.user || entry.utilisateur || '';
      var duration = entry.duration || '';
      var content = '';

      if (entry.type === 'status_change') {
        content = entry.note || 'Changement de statut';
        csv += '"' + task.id + '","' + task.titre + '","' + (task.projet || '') + '","' + task.statut + '","Statut","' + entry.statut + '","' + date + '","' + user + '","' + duration + '","' + content.replace(/"/g, '""') + '"\n';
      } else if (entry.type === 'comment') {
        content = entry.content || '';
        csv += '"' + task.id + '","' + task.titre + '","' + (task.projet || '') + '","' + task.statut + '","Commentaire","","' + date + '","' + user + '","","' + content.replace(/"/g, '""') + '"\n';
      }
    });
  });

  return csv;
};

// ---- Tests ----

TestFramework.describe('HistoryExporter', function () {

  it('Constructor stores manager reference', function () {
    var mockManager = { kanban: {} };
    var exporter = new HistoryExporter(mockManager);
    assert.equal(exporter.manager, mockManager);
  });

  it('generateTaskHistoryCSV returns CSV header for empty data', function () {
    var mockManager = { kanban: {} };
    var exporter = new HistoryExporter(mockManager);

    var historyData = {
      task: { id: 1, titre: 'Test Task' },
      timeline: [],
      stats: {
        creationDate: null,
        totalDuration: 0,
        totalSteps: 0,
        totalComments: 0
      }
    };

    var csv = exporter.generateTaskHistoryCSV(historyData);
    assert.includes(csv, 'Type,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu');
    assert.includes(csv, 'Test Task');
    assert.includes(csv, 'ID: 1');
  });

  it('generateTaskHistoryCSV includes status change entries', function () {
    var mockManager = { kanban: {} };
    var exporter = new HistoryExporter(mockManager);

    var historyData = {
      task: { id: 5, titre: 'Task Five' },
      timeline: [
        {
          type: 'status_change',
          statut: 'En cours',
          timestamp: new Date('2024-06-15T10:00:00.000Z'),
          user: 'Alice',
          duration: 120,
          note: 'Started work'
        }
      ],
      stats: {
        creationDate: new Date('2024-06-14T08:00:00.000Z'),
        totalDuration: 120,
        totalSteps: 1,
        totalComments: 0
      }
    };

    var csv = exporter.generateTaskHistoryCSV(historyData);
    assert.includes(csv, '"Statut"');
    assert.includes(csv, '"En cours"');
    assert.includes(csv, '"Alice"');
    assert.includes(csv, 'Started work');
  });

  it('generateTaskHistoryCSV includes comment entries', function () {
    var mockManager = { kanban: {} };
    var exporter = new HistoryExporter(mockManager);

    var historyData = {
      task: { id: 7, titre: 'Task Seven' },
      timeline: [
        {
          type: 'comment',
          timestamp: new Date('2024-06-15T12:00:00.000Z'),
          user: 'Bob',
          content: 'This is a comment'
        }
      ],
      stats: {
        creationDate: null,
        totalDuration: 0,
        totalSteps: 0,
        totalComments: 1
      }
    };

    var csv = exporter.generateTaskHistoryCSV(historyData);
    assert.includes(csv, '"Commentaire"');
    assert.includes(csv, '"Bob"');
    assert.includes(csv, 'This is a comment');
  });

  it('generateFullHistoryCSV returns CSV header for empty data', function () {
    var mockManager = {
      kanban: { currentRecords: [] },
      parseTaskHistory: function () {
        return { timeline: [] };
      }
    };
    var exporter = new HistoryExporter(mockManager);
    var csv = exporter.generateFullHistoryCSV();
    assert.includes(csv, 'ID_Tache,Titre,Projet,Statut_Actuel,Type_Entree,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu');
  });

  it('generateFullHistoryCSV handles tasks without history', function () {
    var mockManager = {
      kanban: {
        currentRecords: [
          { id: 10, titre: 'No History Task', projet: 'Proj', statut: 'Backlog' }
        ]
      },
      parseTaskHistory: function () {
        return { timeline: [] };
      }
    };
    var exporter = new HistoryExporter(mockManager);
    var csv = exporter.generateFullHistoryCSV();
    assert.includes(csv, 'No History Task');
    assert.includes(csv, "Pas d'historique disponible");
  });

});
