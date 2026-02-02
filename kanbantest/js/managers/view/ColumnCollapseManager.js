// === managers/view/ColumnCollapseManager.js ===
// Sous-module de ViewManager : gestion du repliage/depliage des colonnes

import { VIEW_MODES, getStatusAccent } from '../../config/constants.js';

export class ColumnCollapseManager {
  constructor(viewManager) {
    this.manager = viewManager;
    this.collapsedColumns = new Set();
    this.collapsedStack = null;
  }

  /**
   * Initialise le systeme de repliage des colonnes pour le mode detaille
   */
  initColumnCollapse() {
    // NOTE: Evenements .btn-collapse geres par EventCentralizer.js via delegation
    // (pas besoin de removeColumnCollapseListeners car plus d'addEventListener direct)

    setTimeout(() => {
      const collapseButtons = Array.from(document.querySelectorAll('.btn-collapse-column'));

      if (collapseButtons.length === 0) {
        this.teardownCollapsedStack();
        return;
      }

      this.createCollapsedStack({ reset: true });

      // Decorer les boutons (visuel seulement)
      collapseButtons.forEach(btn => {
        this.decorateCollapseButton(btn);
      });

      this.restoreCollapsedColumns();

      this.manager.logger.info(`${collapseButtons.length} boutons de repliage initialises`);
    }, 60);
  }

  /**
   * Gere le repliage/depliage d'une colonne
   * @param {Event} e - Evenement click
   */
  handleColumnCollapse(e) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.currentTarget;
    const statusId = button.dataset.status;
    const column = button.closest('.kanban-board');

    if (!column) return;

    if (this.collapsedColumns.has(statusId)) {
      this.expandColumn(statusId, column, button);
    } else {
      this.collapseColumn(statusId, column, button);
    }
  }

  decorateCollapseButton(button) {
    if (!button) return;
    const statusId = button.dataset.status || '';
    const column = button.closest('.kanban-board');
    const accent = this.resolveAccentColor(statusId, button, column);
    button.dataset.accent = accent;
    button.style.setProperty('--column-accent', accent);
    this.setCollapseButtonState(button, this.collapsedColumns.has(statusId));
  }

  setCollapseButtonState(button, isCollapsed) {
    if (!button) return;
    const statusId = button.dataset.status || '';
    const accent = this.resolveAccentColor(statusId, button, button.closest('.kanban-board'));
    button.dataset.accent = accent;
    button.style.setProperty('--column-accent', accent);
    button.classList.toggle('is-collapsed', Boolean(isCollapsed));
    button.setAttribute('aria-expanded', String(!isCollapsed));
    button.setAttribute('aria-pressed', String(Boolean(isCollapsed)));

    let icon = button.querySelector('i');
    if (!icon) {
      icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      button.prepend(icon);
    }
    icon.className = isCollapsed ? 'bi bi-arrow-bar-right' : 'bi bi-arrow-bar-left';
    icon.setAttribute('aria-hidden', 'true');

    let hiddenLabel = button.querySelector('.visually-hidden');
    if (!hiddenLabel) {
      hiddenLabel = document.createElement('span');
      hiddenLabel.className = 'visually-hidden';
      button.appendChild(hiddenLabel);
    }
    hiddenLabel.textContent = `${isCollapsed ? 'Deplier' : 'Replier'} la colonne ${statusId}`.trim();
    button.title = isCollapsed ? 'Deplier la colonne' : 'Replier la colonne';
  }

  resolveAccentColor(statusId, element, column) {
    if (element && element.dataset.accent) {
      return element.dataset.accent;
    }

    if (element) {
      const inlineAccent = element.style.getPropertyValue('--column-accent');
      if (inlineAccent) {
        return inlineAccent.trim();
      }
    }

    if (column) {
      const columnAccent = column.style?.getPropertyValue('--column-accent');
      if (columnAccent) {
        return columnAccent.trim();
      }
    }

    return getStatusAccent(statusId);
  }

  extractColumnSummary(statusId, column, button) {
    if (!column) {
      return {
        title: statusId,
        count: '0',
        accent: getStatusAccent(statusId)
      };
    }

    const title = column.querySelector('.board-title')?.textContent.trim() || statusId;
    const count = column.querySelector('.board-count')?.textContent.trim() || '0';
    const accent = this.resolveAccentColor(statusId, button, column);

    return { title, count, accent };
  }

  findColumnByStatus(statusId) {
    if (!statusId) return null;
    const container = this.manager.kanban.kanbanContainer;
    if (!container) return null;
    return container.querySelector(`.kanban-board[data-status="${statusId}"]`);
  }

  /**
   * Replie une colonne
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Element colonne
   * @param {HTMLElement} button - Bouton de repliage
   */
  collapseColumn(statusId, column, button, options = {}) {
    if (!column) {
      this.manager.logger.warn(`Impossible de replier la colonne ${statusId} (element introuvable)`);
      return;
    }

    const { skipAnimation = false } = options;

    this.collapsedColumns.add(statusId);
    this.setCollapseButtonState(button, true);

    const summary = this.extractColumnSummary(statusId, column, button);

    const finalizeCollapse = () => {
      column.style.display = 'none';
      column.classList.remove('column-collapsing', 'column-expanding');
      this.addToCollapsedStack(statusId, summary);

      const scheduler = (typeof window !== 'undefined' && window.requestAnimationFrame)
        ? window.requestAnimationFrame.bind(window)
        : (cb) => setTimeout(cb, 0);

      scheduler(() => this.redistributeColumnWidths());
    };

    if (skipAnimation) {
      finalizeCollapse();
    } else {
      column.classList.add('column-collapsing');
      setTimeout(finalizeCollapse, 260);
    }

    this.manager.logger.info(`Colonne ${statusId} repliee`);
  }

  /**
   * Deplie une colonne
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Element colonne
   * @param {HTMLElement} button - Bouton de repliage
   */
  expandColumn(statusId, column, button, options = {}) {
    this.collapsedColumns.delete(statusId);

    // Retirer de la pile
    this.removeFromCollapsedStack(statusId);

    // Reafficher la colonne
    if (column) {
      column.style.display = '';
      column.classList.remove('column-collapsing');
      column.classList.add('column-expanding');

      setTimeout(() => {
        column.classList.remove('column-expanding');
        this.redistributeColumnWidths();
      }, options.skipAnimation ? 0 : 260);
    } else {
      this.manager.logger.warn(`Impossible de deplier la colonne ${statusId} (element introuvable)`);
      this.redistributeColumnWidths();
    }

    if (button) {
      this.setCollapseButtonState(button, false);
    }

    this.manager.logger.info(`Colonne ${statusId} depliee`);
  }

  /**
   * Cree la pile des colonnes repliees
   */
  createCollapsedStack(options = {}) {
    const { reset = false } = options;
    const container = this.manager.kanban.kanbanContainer;
    const wrapper = this.manager.getKanbanWrapper();
    const host = wrapper || container;
    if (!host || !container) return;

    if (!this.collapsedStack) {
      this.collapsedStack = document.createElement('aside');
      this.collapsedStack.className = 'collapsed-columns-stack';
      this.collapsedStack.setAttribute('role', 'complementary');
      this.collapsedStack.setAttribute('aria-label', 'Colonnes repliees');
      this.collapsedStack.innerHTML = `
        <div class="stack-header">
          <div class="stack-title">
            <i class="bi bi-layout-three-columns" aria-hidden="true"></i>
            <span>Colonnes repliees</span>
          </div>
          <span class="collapsed-count badge rounded-pill bg-secondary d-none">0</span>
        </div>
        <div class="stack-content" role="list"></div>
      `;
    }

    if (host === wrapper) {
      if (this.collapsedStack.parentElement !== wrapper) {
        wrapper.insertBefore(this.collapsedStack, container);
      } else if (this.collapsedStack.nextSibling !== container) {
        wrapper.insertBefore(this.collapsedStack, container);
      }
    } else if (this.collapsedStack.parentElement !== host) {
      host.insertBefore(this.collapsedStack, host.firstChild);
    }

    this.manager.stackHost = host;

    if (wrapper) {
      wrapper.classList.add('has-collapsed-stack');
      wrapper.classList.toggle('is-focus-mode', this.manager.currentMode === VIEW_MODES.FOCUS);
      wrapper.classList.toggle('is-compact-mode', this.manager.currentMode === VIEW_MODES.COMPACT);
    }

    if (reset && this.collapsedStack) {
      const stackContent = this.collapsedStack.querySelector('.stack-content');
      if (stackContent) {
        stackContent.innerHTML = '';
      }
    }

    this.manager.syncWrapperLayout();

    this.updateCollapsedStackCounter();
  }

  teardownCollapsedStack() {
    if (!this.collapsedStack) return;

    const stackContent = this.collapsedStack.querySelector('.stack-content');
    if (stackContent) {
      stackContent.innerHTML = '';
    }

    this.collapsedStack.style.display = 'none';
    if (this.collapsedStack.parentElement) {
      this.collapsedStack.parentElement.removeChild(this.collapsedStack);
    }
    this.manager.stackHost = null;

    const wrapper = this.manager.getKanbanWrapper();
    if (wrapper) {
      wrapper.classList.remove('has-collapsed-stack');
    }

    this.updateCollapsedStackCounter();
  }

  /**
   * Ajoute une colonne a la pile repliee
   * @param {string} statusId - ID du statut
   * @param {object} summary - Resume de la colonne
   */
  addToCollapsedStack(statusId, summary) {
    if (!this.collapsedStack) return;

    const stackContent = this.collapsedStack.querySelector('.stack-content');
    if (!stackContent) return;

    const { title, count, accent } = summary;

    const stackItem = document.createElement('div');
    stackItem.className = 'stack-item';
    stackItem.dataset.status = statusId;
    stackItem.setAttribute('role', 'listitem');
    stackItem.dataset.accent = accent;
    stackItem.style.setProperty('--column-accent', accent);

    stackItem.innerHTML = `
      <span class="stack-accent" aria-hidden="true"></span>
      <div class="stack-item-body">
        <span class="stack-item-title">${title}</span>
        <span class="stack-item-count badge text-bg-light">${count}</span>
      </div>
      <button class="btn-expand-from-stack" data-status="${statusId}" title="Deplier la colonne ${title}">
        <span class="visually-hidden">Deplier la colonne ${title}</span>
        <i class="bi bi-arrow-bar-right" aria-hidden="true"></i>
      </button>
    `;

    // NOTE: Evenement .btn-expand-from-stack gere par EventCentralizer.js ligne 414-432
    // (supprime pour eviter l'accumulation de handlers)

    stackContent.appendChild(stackItem);

    this.updateCollapsedStackCounter();
  }

  /**
   * Retire une colonne de la pile repliee
   * @param {string} statusId - ID du statut
   */
  removeFromCollapsedStack(statusId) {
    if (!this.collapsedStack) return;

    const stackItem = this.collapsedStack.querySelector(`[data-status="${statusId}"]`);
    if (stackItem) {
      stackItem.remove();
    }

    this.updateCollapsedStackCounter();
  }

  /**
   * Redistribue la largeur des colonnes visibles
   */
  redistributeColumnWidths() {
    const container = this.manager.kanban.kanbanContainer;
    const visibleColumns = container.querySelectorAll('.kanban-board:not([style*="display: none"])');

    if (visibleColumns.length === 0) return;

    if (this.manager.currentMode === VIEW_MODES.FOCUS) {
      visibleColumns.forEach(column => {
        column.style.flex = '0 0 auto';
        column.style.width = 'min(100%, 620px)';
        column.style.minWidth = 'min(100%, 620px)';
        column.style.maxWidth = '620px';
      });
      return;
    }

    // Calculer la largeur disponible (moins la pile si elle existe)
    let stackWidth = 0;
    if (
      this.collapsedStack &&
      this.collapsedStack.style.display !== 'none' &&
      this.collapsedStack.parentElement === container
    ) {
      const rect = this.collapsedStack.getBoundingClientRect();
      stackWidth = Math.ceil(rect.width + 16); // ajouter un espace de respiration
    }
    const availableWidth = `calc((100% - ${stackWidth}px) / ${visibleColumns.length})`;

    visibleColumns.forEach(column => {
      column.style.flex = '0 0 ' + availableWidth;
      column.style.minWidth = availableWidth;
      column.style.maxWidth = availableWidth;
    });
  }

  updateCollapsedStackCounter() {
    if (!this.collapsedStack) return;

    const stackContent = this.collapsedStack.querySelector('.stack-content');
    const badge = this.collapsedStack.querySelector('.collapsed-count');
    const visibleItems = stackContent ? stackContent.children.length : 0;

    if (badge) {
      badge.textContent = visibleItems;
      badge.classList.toggle('d-none', visibleItems === 0);
    }

    this.collapsedStack.style.display = visibleItems > 0 ? 'flex' : 'none';
    this.manager.syncWrapperLayout();
  }

  restoreCollapsedColumns() {
    if (this.manager.currentMode === VIEW_MODES.COMPACT) {
      this.manager.showAllColumns();
      this.teardownCollapsedStack();
      return;
    }

    if (!this.collapsedColumns || this.collapsedColumns.size === 0) {
      if (this.manager.currentMode === VIEW_MODES.FOCUS) {
        this.teardownCollapsedStack();
      } else {
        this.manager.showAllColumns();
      }
      this.updateCollapsedStackCounter();
      this.redistributeColumnWidths();
      return;
    }

    const statuses = Array.from(this.collapsedColumns);
    this.collapsedColumns.clear();

    if (this.manager.currentMode !== VIEW_MODES.DETAILED) {
      this.createCollapsedStack({ reset: true });
    }

    statuses.forEach(statusId => {
      const column = this.findColumnByStatus(statusId);
      const button = column?.querySelector('.btn-collapse-column');

      if (column && button) {
        this.collapseColumn(statusId, column, button, { skipAnimation: true });
      }
    });

    this.updateCollapsedStackCounter();
    this.redistributeColumnWidths();
  }

  /**
   * Appele apres le rendu du kanban
   */
  onKanbanRendered() {
    if (this.manager.currentMode === VIEW_MODES.DETAILED) {
      this.initColumnCollapse();
    } else {
      this.manager.showAllColumns();
      this.teardownCollapsedStack();
    }
  }
}
