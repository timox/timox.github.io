// === test/unit/history-modal-manager.test.js ===
// Tests for js/managers/history/HistoryModalManager.js

// ---- Inline minimal copy of HistoryModalManager ----

function HistoryModalManager(historyManager) {
  this.manager = historyManager;
}

HistoryModalManager.prototype.cleanupOrphanBackdrops = function () {
  var backdrops = document.querySelectorAll('.modal-backdrop');
  var cleaned = 0;

  backdrops.forEach(function (backdrop) {
    var visibleModals = document.querySelectorAll('.modal.show');

    if (visibleModals.length === 0) {
      backdrop.remove();
      cleaned++;
    }
  });

  if (cleaned > 0) {
    document.body.classList.remove('modal-open');
    this.manager.logger.info(cleaned + ' backdrop(s) orphelin(s) nettoyé(s)');
  }
};

HistoryModalManager.prototype.closeHistoryModal = function () {
  var historyModalEl = document.getElementById('task-history-modal');
  if (historyModalEl) {
    historyModalEl.style.display = 'none';
    historyModalEl.classList.remove('show');
    historyModalEl.removeAttribute('aria-modal');
    historyModalEl.setAttribute('aria-hidden', 'true');
  }

  var backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.remove();
  }

  document.body.classList.remove('modal-open');

  this.manager.logger.info('Modal d\'historique fermée manuellement');
};

// ---- Tests ----

TestFramework.describe('HistoryModalManager', function () {

  it('Constructor stores manager reference', function () {
    var mockManager = { logger: { info: function () {}, debug: function () {} } };
    var modal = new HistoryModalManager(mockManager);
    assert.equal(modal.manager, mockManager);
  });

  it('cleanupOrphanBackdrops handles no backdrops gracefully', function () {
    var logMessages = [];
    var mockManager = {
      logger: {
        info: function (msg) { logMessages.push(msg); },
        debug: function () {}
      }
    };
    var modal = new HistoryModalManager(mockManager);

    // Should not throw when no .modal-backdrop elements exist
    assert.doesNotThrow(function () {
      modal.cleanupOrphanBackdrops();
    });
    // No backdrops means no cleanup message logged
    assert.equal(logMessages.length, 0);
  });

  it('cleanupOrphanBackdrops removes backdrops when no modal is visible', function () {
    var mockManager = {
      logger: { info: function () {}, debug: function () {} }
    };
    var modal = new HistoryModalManager(mockManager);

    // Create an orphan backdrop
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    modal.cleanupOrphanBackdrops();

    // Backdrop should be removed
    var remaining = document.querySelectorAll('.modal-backdrop');
    assert.equal(remaining.length, 0);
    assert.equal(document.body.classList.contains('modal-open'), false);
  });

  it('closeHistoryModal handles missing elements', function () {
    var logMessages = [];
    var mockManager = {
      logger: {
        info: function (msg) { logMessages.push(msg); },
        debug: function () {}
      }
    };
    var modal = new HistoryModalManager(mockManager);

    // Should not throw when #task-history-modal does not exist
    assert.doesNotThrow(function () {
      modal.closeHistoryModal();
    });
    // The info log should still be called
    assert.isTrue(logMessages.length > 0);
  });

  it('closeHistoryModal hides existing modal element', function () {
    var mockManager = {
      logger: { info: function () {}, debug: function () {} }
    };
    var modal = new HistoryModalManager(mockManager);

    // Create a mock modal element
    var modalEl = document.createElement('div');
    modalEl.id = 'task-history-modal';
    modalEl.classList.add('show');
    modalEl.setAttribute('aria-modal', 'true');
    document.body.appendChild(modalEl);

    modal.closeHistoryModal();

    assert.equal(modalEl.style.display, 'none');
    assert.equal(modalEl.classList.contains('show'), false);
    assert.equal(modalEl.getAttribute('aria-hidden'), 'true');
    assert.isNull(modalEl.getAttribute('aria-modal'));

    // Cleanup
    modalEl.remove();
  });

});
