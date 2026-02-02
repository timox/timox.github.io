// === managers/view/KanbanRenderer.js ===
// Sous-module de ViewManager : rendu du kanban (colonnes, focus, drag & drop)

import { STATUTS, VIEW_MODES, getStatusAccent } from '../../config/constants.js';

export class KanbanRenderer {
  constructor(viewManager) {
    this.manager = viewManager;
  }

  renderKanban(viewMode, records = [], options = {}) {
    const {
      showTermine = true,
      focusColumn = null,
      container = null
    } = options;

    const kanbanContainer = container || this.manager.kanban.kanbanContainer;
    if (!kanbanContainer) {
      this.manager.logger.error('Impossible de rendre le Kanban: container introuvable');
      return;
    }

    this.destroySortableInstances();

    const statutsToShow = showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Termin\u00e9');

    switch (viewMode) {
      case VIEW_MODES.FOCUS:
        this.renderFocusMode(kanbanContainer, statutsToShow, records, focusColumn || this.manager.focusColumn);
        break;
      case VIEW_MODES.DETAILED:
        this.renderColumnMode(kanbanContainer, statutsToShow, records, VIEW_MODES.DETAILED);
        break;
      case VIEW_MODES.COMPACT:
      default:
        this.renderColumnMode(kanbanContainer, statutsToShow, records, VIEW_MODES.COMPACT);
        break;
    }

    this.manager.attachEventListeners(kanbanContainer);
    this.initializeScrollArrows();
  }

  renderColumnMode(container, statuts, records, mode) {
    const modeClass = mode === VIEW_MODES.COMPACT ? 'kanban-compact' : 'kanban-detailed';
    container.className = `kanban-container ${modeClass}`;

    let kanbanHTML = '';

    statuts.forEach(statut => {
      const boardId = statut.classe;
      const boardRecords = this.filterRecordsByStatus(records, statut.id);

      this.sortRecords(boardRecords);

      const itemsHTML = boardRecords
        .map(record => this.manager.cardRenderer.renderTaskCard(record, mode))
        .join('');

      const stats = this.calculateColumnStats(boardRecords);
      const count = boardRecords.length;
      const isHidden = count === 0;
      const hiddenClass = isHidden ? ' board-hidden' : '';
      const statusClass = this.getStatusClass(statut.id);

      kanbanHTML += this.generateColumnHTML({
        boardId,
        statut,
        count,
        stats,
        itemsHTML,
        hiddenClass,
        statusClass,
        mode
      });
    });

    container.innerHTML = kanbanHTML;
    this.initializeSortable(statuts, mode);
  }

  renderFocusMode(container, statuts, records, focusColumn) {
    const activeColumn = focusColumn || statuts[0]?.id || 'Backlog';
    this.manager.focusColumn = activeColumn;

    const navigationHTML = this.generateFocusNavigation(statuts, records, activeColumn);
    const activeStatus = statuts.find(s => s.id === activeColumn);
    const boardRecords = this.filterRecordsByStatus(records, activeColumn);

    this.sortRecords(boardRecords);

    const itemsHTML = boardRecords
      .map(record => this.manager.cardRenderer.renderTaskCard(record, VIEW_MODES.FOCUS))
      .join('');

    const stats = this.calculateColumnStats(boardRecords);
    const columnHTML = this.generateFocusColumnHTML({
      activeStatus,
      boardRecords,
      itemsHTML,
      stats,
      activeColumn
    });

    container.className = 'kanban-container kanban-focus';
    container.innerHTML = navigationHTML + columnHTML;
    this.initializeFocusSortable(activeColumn);
  }

  generateColumnHTML({ boardId, statut, count, stats, itemsHTML, hiddenClass, statusClass, mode }) {
    const statusIcon = this.getStatusIcon(statut.id);
    const accentColor = getStatusAccent(statut.id);
    const performanceIndicators = this.generatePerformanceIndicators(stats);

    return `
      <div id="board-${boardId}"
           class="kanban-board board-${boardId} ${statusClass}${hiddenClass}"
           style="--column-accent: ${accentColor};"
           data-status="${statut.id}"
           role="region"
           aria-label="Colonne ${statut.libelle}">

        <div class="kanban-board-header">
          <span class="board-title">
            ${statusIcon}
            ${statut.libelle}
          </span>
          <div class="board-meta">
            ${mode === VIEW_MODES.DETAILED ? this.generateCollapseButton(statut.id, accentColor) : ''}
            <button class="board-count"
                    data-status="${statut.id}"
                    title="Filtrer par ${statut.libelle} (${count} tache${count !== 1 ? 's' : ''})"
                    aria-label="Filtrer par ${statut.libelle}">
              ${count}
            </button>
            ${performanceIndicators}
          </div>
        </div>

        <div class="kanban-board-body"
             id="items-${boardId}"
             data-status="${statut.id}"
             role="list"
             aria-label="Liste des taches ${statut.libelle}">
          ${itemsHTML}
          ${count === 0 ? this.generateEmptyDropZone(statut) : ''}
        </div>

        ${this.generateColumnFooter(stats, mode)}
      </div>
    `;
  }

  generateFocusNavigation(statuts, records, activeColumn) {
    const navItems = statuts.map(statut => {
      const count = this.filterRecordsByStatus(records, statut.id).length;
      const isActive = activeColumn === statut.id;
      const icon = this.getStatusIcon(statut.id);

      return `
        <button class="btn btn-outline-secondary ${isActive ? 'active' : ''}"
                data-status="${statut.id}"
                title="Voir les taches ${statut.libelle}"
                aria-pressed="${isActive}">
          ${icon}
          ${statut.libelle}
          <span class="badge bg-secondary">${count}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="focus-navigation" role="tablist" aria-label="Navigation des statuts">
        ${navItems}
      </div>
    `;
  }

  generateFocusColumnHTML({ activeStatus, boardRecords, itemsHTML, stats, activeColumn }) {
    const statusIcon = this.getStatusIcon(activeStatus?.id || '');
    const performanceIndicators = this.generatePerformanceIndicators(stats);
    const accentColor = activeStatus ? getStatusAccent(activeStatus.id) : getStatusAccent();

    return `
      <div class="focus-column" role="tabpanel" aria-label="Taches ${activeStatus?.libelle || ''}" style="--column-accent: ${accentColor};">
        <div class="kanban-board-header">
          <span class="board-title">
            ${statusIcon}
            ${activeStatus?.libelle || 'Statut inconnu'}
          </span>
          <div class="board-meta">
            <span class="board-count">${boardRecords.length}</span>
            ${performanceIndicators}
          </div>
        </div>

        <div class="kanban-board-body"
             id="items-focus"
             data-status="${activeColumn}"
             role="list"
             aria-label="Liste des taches">
          ${itemsHTML}
          ${boardRecords.length === 0 ? this.generateEmptyDropZone(activeStatus) : ''}
        </div>

        ${this.generateColumnFooter(stats, VIEW_MODES.FOCUS)}
      </div>
    `;
  }

  generateEmptyDropZone(statut) {
    const encouragementText = this.getEncouragementText(statut?.id);

    return `
      <div class="empty-drop-zone" role="region" aria-label="Zone de depot vide">
        <div class="empty-zone-content">
          <i class="bi bi-plus-circle-dotted text-muted"></i>
          <p class="text-muted small mt-2">${encouragementText}</p>
        </div>
      </div>
    `;
  }

  generateColumnFooter(stats, mode) {
    if (mode === VIEW_MODES.COMPACT || !stats.totalTasks) {
      return '';
    }

    const priorityDistribution = this.generatePriorityDistribution(stats);
    return `
      <div class="kanban-board-footer">
        ${priorityDistribution}
      </div>
    `;
  }

  generatePerformanceIndicators(stats) {
    const indicators = [];

    if (stats.urgentTasks > 0) {
      indicators.push(`
        <span class="indicator urgent" title="${stats.urgentTasks} tache${stats.urgentTasks > 1 ? 's' : ''} urgente${stats.urgentTasks > 1 ? 's' : ''}">
          <i class="bi bi-exclamation-triangle text-danger"></i>
          ${stats.urgentTasks}
        </span>
      `);
    }

    if (stats.overdueTasks > 0) {
      indicators.push(`
        <span class="indicator overdue" title="${stats.overdueTasks} tache${stats.overdueTasks > 1 ? 's' : ''} en retard">
          <i class="bi bi-clock text-warning"></i>
          ${stats.overdueTasks}
        </span>
      `);
    }

    return indicators.length > 0 ? `<div class="performance-indicators">${indicators.join('')}</div>` : '';
  }

  generateCollapseButton(statusId, accentColor = getStatusAccent(statusId)) {
    return `
      <button class="btn-collapse-column"
              data-status="${statusId}"
              data-accent="${accentColor}"
              style="--column-accent: ${accentColor};"
              title="Replier/Deplier la colonne"
              aria-label="Replier ou deplier la colonne">
        <i class="bi bi-arrow-bar-left" aria-hidden="true"></i>
        <span class="visually-hidden">Replier la colonne ${statusId}</span>
      </button>
    `;
  }

  generatePriorityDistribution(stats) {
    if (!stats.priorityDistribution) return '';

    const { priorityDistribution } = stats;
    const total = stats.totalTasks;

    const priorityBars = [1, 2, 3, 4].map(priority => {
      const count = priorityDistribution[priority] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      if (!count) return '';

      return `
        <div class="priority-bar priority-${priority}"
             style="width: ${percentage}%"
             title="P${priority}: ${count} tache${count > 1 ? 's' : ''} (${percentage}%)">
        </div>
      `;
    }).filter(Boolean);

    if (priorityBars.length === 0) return '';

    return `
      <div class="priority-distribution" title="Distribution des priorites">
        ${priorityBars.join('')}
      </div>
    `;
  }

  filterRecordsByStatus(records, statusId) {
    return records.filter(record => record.statut === statusId);
  }

  sortRecords(records) {
    records.sort((a, b) => {
      const prioA = this.manager.cardRenderer.calculatePriority(a.urgence, a.impact);
      const prioB = this.manager.cardRenderer.calculatePriority(b.urgence, b.impact);

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
  }

  calculateColumnStats(records) {
    const stats = {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalPriority = 0;

    records.forEach(record => {
      const priority = this.manager.cardRenderer.calculatePriority(record.urgence, record.impact);
      stats.priorityDistribution[priority]++;
      totalPriority += priority;

      if (priority <= 2) {
        stats.highPriorityTasks++;
      }

      if (record.date_echeance) {
        const echeance = new Date(record.date_echeance);
        echeance.setHours(0, 0, 0, 0);

        if (echeance < today) {
          stats.overdueTasks++;
        }

        const diffDays = Math.ceil((echeance - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          stats.urgentTasks++;
        }
      }
    });

    stats.averagePriority = Math.round(totalPriority / records.length * 10) / 10;
    return stats;
  }

  getStatusIcon(statusId) {
    const icons = {
      'Backlog': '<i class="bi bi-list-ul"></i>',
      '\u00c0 faire': '<i class="bi bi-calendar-plus"></i>',
      'En cours': '<i class="bi bi-play-circle"></i>',
      'En attente': '<i class="bi bi-pause-circle"></i>',
      'Bloqu\u00e9': '<i class="bi bi-x-octagon"></i>',
      'Validation': '<i class="bi bi-check-circle"></i>',
      'Termin\u00e9': '<i class="bi bi-check-circle-fill"></i>'
    };

    return icons[statusId] || '<i class="bi bi-circle"></i>';
  }

  getStatusClass(statusId) {
    const classes = {
      'Backlog': 'status-backlog',
      '\u00c0 faire': 'status-todo',
      'En cours': 'status-progress',
      'En attente': 'status-waiting',
      'Bloqu\u00e9': 'status-blocked',
      'Validation': 'status-validation',
      'Termin\u00e9': 'status-done'
    };

    return classes[statusId] || 'status-unknown';
  }

  getEncouragementText(statusId) {
    const messages = {
      'Backlog': 'Glissez des t\u00e2ches ici pour les planifier',
      '\u00c0 faire': 'Pr\u00eat \u00e0 d\u00e9marrer de nouvelles t\u00e2ches ?',
      'En cours': 'Aucune t\u00e2che en cours pour le moment',
      'En attente': 'Pas de t\u00e2ches en attente actuellement',
      'Bloqu\u00e9': 'Heureusement, rien n\'est bloqu\u00e9 !',
      'Validation': 'Rien \u00e0 valider pour l\'instant',
      'Termin\u00e9': 'Aucune t\u00e2che termin\u00e9e r\u00e9cemment'
    };

    return messages[statusId] || 'Glissez des t\u00e2ches ici';
  }

  initializeSortable(statuts, mode) {
    statuts.forEach(statut => {
      const boardId = statut.classe;
      const element = document.getElementById(`items-${boardId}`);

      if (element) {
        const sortable = new Sortable(element, {
          group: 'kanban',
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          onEnd: (evt) => this.handleDragEnd(evt, statut.id),
          onStart: (evt) => this.handleDragStart(evt),
          onMove: (evt) => this.handleDragMove(evt)
        });

        this.manager.sortableInstances.push(sortable);
      }
    });
  }

  initializeFocusSortable(activeColumn) {
    const element = document.getElementById('items-focus');

    if (element) {
      const sortable = new Sortable(element, {
        group: 'kanban-focus',
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: (evt) => this.handleDragEnd(evt, activeColumn),
        onStart: (evt) => this.handleDragStart(evt)
      });

      this.manager.sortableInstances.push(sortable);
    }
  }

  handleDragStart(evt) {
    if (evt.item) {
      evt.item.classList.add('dragging');
      document.querySelectorAll('.kanban-board-body').forEach(zone => {
        zone.classList.add('drop-zone-active');
      });
    }
  }

  handleDragMove(evt) {
    const fromStatus = evt.from?.dataset?.status;
    const toStatus = evt.to?.dataset?.status;

    if (fromStatus === 'Termin\u00e9' && toStatus !== 'Termin\u00e9') {
      return true;
    }

    return true;
  }

  handleDragEnd(evt, targetStatus) {
    if (evt.item) {
      evt.item.classList.remove('dragging');
    }

    document.querySelectorAll('.kanban-board-body').forEach(zone => {
      zone.classList.remove('drop-zone-active');
    });

    if (typeof this.manager.kanban.handleDragEnd === 'function') {
      this.manager.kanban.handleDragEnd(evt, targetStatus);
    }
  }

  initializeScrollArrows() {
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');
    const kanbanContainer = this.manager.kanban.kanbanContainer;

    if (!leftArrow || !rightArrow || !kanbanContainer) return;

    const updateArrows = () => {
      const scrollLeft = kanbanContainer.scrollLeft;
      const scrollWidth = kanbanContainer.scrollWidth;
      const clientWidth = kanbanContainer.clientWidth;

      if (scrollLeft <= 0) {
        leftArrow.classList.add('hidden');
      } else {
        leftArrow.classList.remove('hidden');
      }

      if (scrollLeft >= scrollWidth - clientWidth - 10) {
        rightArrow.classList.add('hidden');
      } else {
        rightArrow.classList.remove('hidden');
      }
    };

    // NOTE: Evenements de scroll et click sur fleches geres par EventCentralizer.js
    // (supprimes pour eviter les doublons)

    const resizeObserver = new ResizeObserver(updateArrows);
    resizeObserver.observe(kanbanContainer);

    setTimeout(updateArrows, 100);
  }

  destroySortableInstances() {
    this.manager.sortableInstances.forEach(instance => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    this.manager.sortableInstances = [];
  }
}
