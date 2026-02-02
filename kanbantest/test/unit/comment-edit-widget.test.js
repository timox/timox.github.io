// === test/unit/comment-edit-widget.test.js ===
// Tests for js/managers/history/CommentEditWidget.js

// ---- Inline minimal copy of CommentEditWidget ----

function CommentEditWidget(historyManager) {
  this.manager = historyManager;
}

CommentEditWidget.prototype.isOpen = function () {
  var widget = document.getElementById('accordion-comment-edit-widget');
  if (!widget) {
    return false;
  }

  var style = window.getComputedStyle(widget);
  return style.display !== 'none' && widget.getAttribute('aria-hidden') !== 'true';
};

CommentEditWidget.prototype.close = function () {
  var widget = document.getElementById('accordion-comment-edit-widget');
  if (widget) {
    widget.style.display = 'none';
  }

  this.manager.currentEditingComment = null;

  var textArea = document.getElementById('accordion-comment-edit-text');
  var dateSpan = document.getElementById('accordion-comment-edit-date');

  if (textArea) textArea.value = '';
  if (dateSpan) dateSpan.textContent = '';
};

// ---- Tests ----

TestFramework.describe('CommentEditWidget', function () {

  it('Constructor stores manager reference', function () {
    var mockManager = { logger: { debug: function () {} } };
    var widget = new CommentEditWidget(mockManager);
    assert.equal(widget.manager, mockManager);
  });

  it('isOpen returns false when widget not found', function () {
    var mockManager = { logger: { debug: function () {} } };
    var widget = new CommentEditWidget(mockManager);

    // Ensure no widget exists in DOM
    var existing = document.getElementById('accordion-comment-edit-widget');
    if (existing) existing.remove();

    assert.equal(widget.isOpen(), false);
  });

  it('isOpen returns false when widget is hidden', function () {
    var mockManager = { logger: { debug: function () {} } };
    var widget = new CommentEditWidget(mockManager);

    // Create a hidden widget in the DOM
    var el = document.createElement('div');
    el.id = 'accordion-comment-edit-widget';
    el.style.display = 'none';
    document.body.appendChild(el);

    assert.equal(widget.isOpen(), false);

    // Cleanup
    el.remove();
  });

  it('isOpen returns false when widget has aria-hidden true', function () {
    var mockManager = { logger: { debug: function () {} } };
    var widget = new CommentEditWidget(mockManager);

    var el = document.createElement('div');
    el.id = 'accordion-comment-edit-widget';
    el.style.display = 'block';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);

    assert.equal(widget.isOpen(), false);

    // Cleanup
    el.remove();
  });

  it('isOpen returns true when widget is visible', function () {
    var mockManager = { logger: { debug: function () {} } };
    var widget = new CommentEditWidget(mockManager);

    var el = document.createElement('div');
    el.id = 'accordion-comment-edit-widget';
    el.style.display = 'block';
    document.body.appendChild(el);

    assert.isTrue(widget.isOpen());

    // Cleanup
    el.remove();
  });

  it('close hides the widget and clears editing state', function () {
    var mockManager = {
      logger: { debug: function () {} },
      currentEditingComment: { id: 'comment-123', originalContent: 'text' }
    };
    var widget = new CommentEditWidget(mockManager);

    // Create widget and form elements in DOM
    var el = document.createElement('div');
    el.id = 'accordion-comment-edit-widget';
    el.style.display = 'block';
    document.body.appendChild(el);

    var textArea = document.createElement('textarea');
    textArea.id = 'accordion-comment-edit-text';
    textArea.value = 'some text';
    document.body.appendChild(textArea);

    var dateSpan = document.createElement('span');
    dateSpan.id = 'accordion-comment-edit-date';
    dateSpan.textContent = '2024-01-01';
    document.body.appendChild(dateSpan);

    widget.close();

    assert.equal(el.style.display, 'none');
    assert.isNull(mockManager.currentEditingComment);
    assert.equal(textArea.value, '');
    assert.equal(dateSpan.textContent, '');

    // Cleanup
    el.remove();
    textArea.remove();
    dateSpan.remove();
  });

});
