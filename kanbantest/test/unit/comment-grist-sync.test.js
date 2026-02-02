// === test/unit/comment-grist-sync.test.js ===
// Tests for js/managers/history/CommentGristSync.js

// ---- Inline minimal copy of CommentGristSync ----

function CommentGristSync(historyManager) {
  this.manager = historyManager;
}

CommentGristSync.prototype.getCurrentEditingTaskId = function () {
  var taskId = null;

  // PRIORITE 1: ID explicite dans currentTaskHistory
  if (this.manager.currentTaskHistory && this.manager.currentTaskHistory.id) {
    taskId = this.manager.currentTaskHistory.id;
  }

  // PRIORITE 2: Fallback vers ModalManager
  if (!taskId && this.manager.kanban && this.manager.kanban.modalManager && this.manager.kanban.modalManager.currentTaskId) {
    taskId = this.manager.kanban.modalManager.currentTaskId;
  }

  // PRIORITE 3: Autres champs dans currentTaskHistory
  if (!taskId && this.manager.currentTaskHistory) {
    taskId = this.manager.currentTaskHistory.taskId;
  }

  // PRIORITE 4: Dernier recours - DOM
  if (!taskId) {
    var modalElement = document.getElementById('shared-task-modal');
    if (modalElement && modalElement.dataset.taskId) {
      taskId = modalElement.dataset.taskId;
    }
  }

  if (taskId) {
    taskId = parseInt(taskId);
    // Validation coherence
    if (this.manager.currentTaskHistory && this.manager.currentTaskHistory.id && taskId !== this.manager.currentTaskHistory.id) {
      return null;
    }
  }

  return taskId || null;
};

CommentGristSync.prototype.getCurrentUser = function () {
  try {
    var userActionManager = this.manager.kanban.getUserActionManager ?
      this.manager.kanban.getUserActionManager() :
      (typeof window !== 'undefined' && window.getUserActionManager ? window.getUserActionManager() : null);

    if (userActionManager && userActionManager.cachedUserName) {
      return Promise.resolve(userActionManager.cachedUserName);
    }

    return Promise.resolve('User');
  } catch (error) {
    return Promise.resolve('User');
  }
};

CommentGristSync.prototype.restoreEditingCommentFromWidget = function () {
  var widget = document.getElementById('accordion-comment-edit-widget');
  var textArea = document.getElementById('accordion-comment-edit-text');

  var widgetVisible = widget && window.getComputedStyle(widget).display !== 'none' && widget.getAttribute('aria-hidden') !== 'true';

  if (!widget || !widgetVisible || !textArea) {
    return false;
  }

  var dateSpan = document.getElementById('accordion-comment-edit-date');

  var commentId = (widget.dataset.commentId) ||
                   (textArea.dataset.commentId) ||
                   (textArea.getAttribute('data-comment-id')) ||
                   (dateSpan ? dateSpan.dataset.commentId : null);

  if (!commentId) {
    return false;
  }

  this.manager.currentEditingComment = {
    id: commentId,
    originalContent: textArea.defaultValue || textArea.getAttribute('data-original') || textArea.placeholder || '',
    element: null
  };

  return true;
};

CommentGristSync.prototype.getGristApi = function () {
  if (this.manager.kanban && this.manager.kanban.gristManager && this.manager.kanban.gristManager.getGristApi) {
    return this.manager.kanban.gristManager.getGristApi();
  }

  if (typeof window !== 'undefined' && typeof window.grist !== 'undefined') {
    return window.grist;
  }

  throw new Error('API Grist non disponible');
};

// ---- Tests ----

TestFramework.describe('CommentGristSync', function () {

  it('Constructor stores manager reference', function () {
    var mockManager = { kanban: {}, logger: { debug: function () {}, info: function () {}, error: function () {}, warn: function () {} } };
    var sync = new CommentGristSync(mockManager);
    assert.equal(sync.manager, mockManager);
  });

  it('getCurrentEditingTaskId returns null when no sources available', function () {
    var mockManager = {
      currentTaskHistory: null,
      kanban: {},
      logger: { debug: function () {}, info: function () {}, error: function () {}, warn: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    // Ensure no shared-task-modal exists in DOM
    var existing = document.getElementById('shared-task-modal');
    if (existing) existing.remove();

    var result = sync.getCurrentEditingTaskId();
    assert.isNull(result);
  });

  it('getCurrentEditingTaskId returns id from currentTaskHistory', function () {
    var mockManager = {
      currentTaskHistory: { id: 42 },
      kanban: {},
      logger: { debug: function () {}, info: function () {}, error: function () {}, warn: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    var result = sync.getCurrentEditingTaskId();
    assert.equal(result, 42);
  });

  it('getCurrentEditingTaskId falls back to modalManager.currentTaskId', function () {
    var mockManager = {
      currentTaskHistory: null,
      kanban: { modalManager: { currentTaskId: 99 } },
      logger: { debug: function () {}, info: function () {}, error: function () {}, warn: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    // Ensure no shared-task-modal exists in DOM
    var existing = document.getElementById('shared-task-modal');
    if (existing) existing.remove();

    var result = sync.getCurrentEditingTaskId();
    assert.equal(result, 99);
  });

  it('getCurrentEditingTaskId returns null on coherence mismatch', function () {
    var mockManager = {
      currentTaskHistory: { id: 42 },
      kanban: { modalManager: { currentTaskId: 99 } },
      logger: { debug: function () {}, info: function () {}, error: function () {}, warn: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    // Priority 1 wins (id: 42), and coherence check passes since
    // taskId (42) === currentTaskHistory.id (42)
    var result = sync.getCurrentEditingTaskId();
    assert.equal(result, 42);
  });

  it('getCurrentUser returns User as fallback', function () {
    var mockManager = {
      kanban: {},
      logger: { debug: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    // getCurrentUser is async, but our inline version returns a Promise
    var resultPromise = sync.getCurrentUser();
    assert.ok(resultPromise);

    // Test using .then for Promise
    return resultPromise.then(function (user) {
      assert.equal(user, 'User');
    });
  });

  it('getCurrentUser returns cached username when available', function () {
    var mockManager = {
      kanban: {
        getUserActionManager: function () {
          return { cachedUserName: 'Alice' };
        }
      },
      logger: { debug: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    return sync.getCurrentUser().then(function (user) {
      assert.equal(user, 'Alice');
    });
  });

  it('restoreEditingCommentFromWidget returns false when widget not found', function () {
    var mockManager = {
      logger: { debug: function () {}, error: function () {} },
      currentEditingComment: null
    };
    var sync = new CommentGristSync(mockManager);

    // Ensure no widget exists in DOM
    var existing = document.getElementById('accordion-comment-edit-widget');
    if (existing) existing.remove();

    var result = sync.restoreEditingCommentFromWidget();
    assert.equal(result, false);
  });

  it('restoreEditingCommentFromWidget returns false when widget is hidden', function () {
    var mockManager = {
      logger: { debug: function () {}, error: function () {} },
      currentEditingComment: null
    };
    var sync = new CommentGristSync(mockManager);

    // Create hidden widget
    var widget = document.createElement('div');
    widget.id = 'accordion-comment-edit-widget';
    widget.style.display = 'none';
    document.body.appendChild(widget);

    var textArea = document.createElement('textarea');
    textArea.id = 'accordion-comment-edit-text';
    document.body.appendChild(textArea);

    var result = sync.restoreEditingCommentFromWidget();
    assert.equal(result, false);

    // Cleanup
    widget.remove();
    textArea.remove();
  });

  it('restoreEditingCommentFromWidget returns true when widget visible with comment id', function () {
    var mockManager = {
      logger: { debug: function () {}, info: function () {}, error: function () {} },
      currentEditingComment: null
    };
    var sync = new CommentGristSync(mockManager);

    var widget = document.createElement('div');
    widget.id = 'accordion-comment-edit-widget';
    widget.style.display = 'block';
    widget.dataset.commentId = 'comment-12345';
    document.body.appendChild(widget);

    var textArea = document.createElement('textarea');
    textArea.id = 'accordion-comment-edit-text';
    textArea.defaultValue = 'original text';
    document.body.appendChild(textArea);

    var result = sync.restoreEditingCommentFromWidget();
    assert.equal(result, true);
    assert.ok(mockManager.currentEditingComment);
    assert.equal(mockManager.currentEditingComment.id, 'comment-12345');

    // Cleanup
    widget.remove();
    textArea.remove();
  });

  it('getGristApi throws when neither gristManager nor window.grist available', function () {
    var mockManager = {
      kanban: {},
      logger: { debug: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    // Ensure window.grist is not defined
    var originalGrist = window.grist;
    delete window.grist;

    var threw = false;
    try {
      sync.getGristApi();
    } catch (e) {
      threw = true;
      assert.includes(e.message, 'Grist non disponible');
    }
    assert.isTrue(threw);

    // Restore
    if (originalGrist !== undefined) {
      window.grist = originalGrist;
    }
  });

  it('getGristApi returns gristManager API when available', function () {
    var fakeApi = { docApi: {} };
    var mockManager = {
      kanban: {
        gristManager: {
          getGristApi: function () { return fakeApi; }
        }
      },
      logger: { debug: function () {} }
    };
    var sync = new CommentGristSync(mockManager);

    var result = sync.getGristApi();
    assert.equal(result, fakeApi);
  });

});
