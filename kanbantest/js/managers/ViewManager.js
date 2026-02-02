// === managers/ViewManager.js ===
// Orchestrateur centralisé pour les modes de vue et le rendu du Kanban
// Délègue le rendu aux sous-modules : CardRenderer, KanbanRenderer, ColumnCollapseManager

import { VIEW_MODES } from '../config/constants.js';
import { createModuleLogger } from '../utils/LoggerManager.js';
import { CardRenderer } from './view/CardRenderer.js';
import { KanbanRenderer } from './view/KanbanRenderer.js';
import { ColumnCollapseManager } from './view/ColumnCollapseManager.js';

/**
 * Gestionnaire pour les modes de vue du Kanban
 */
export class ViewManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentMode = VIEW_MODES.COMPACT;
    this.focusColumn = null;
    this.logger = createModuleLogger('ViewManager');
    this.wrapper = null;
    this.stackHost = null;
    this.sortableInstances = [];

    // Sous-modules
    this.cardRenderer = new CardRenderer(this);
    this.kanbanRenderer = new KanbanRenderer(this);
    this.collapseManager = new ColumnCollapseManager(this);

    this.init();
  }

  // --- Getter de compatibilité : collapsedColumns vit dans collapseManager ---
  get collapsedColumns() { return this.collapseManager.collapsedColumns; }

  // --- Getter de compatibilité : collapsedStack vit dans collapseManager ---
  get collapsedStack() { return this.collapseManager.collapsedStack; }
  set collapsedStack(value) { this.collapseManager.collapsedStack = value; }

  // ─── Initialisation ────────────────────────────────────────────────

  init() {
    this.createViewModeControls();
    this.setupEventListeners();
    this.loadSavedViewMode();
    this.wrapper = this.getKanbanWrapper();

    // Aligner immédiatement l'affichage sur le mode courant (compact par défaut)
    this.initializeViewMode();

    this.logger.info('Gestionnaire de modes de vue initialisé');
  }

  createViewModeControls() {
    const buttonsContainer = document.querySelector('.kanban-header .d-flex .d-flex.gap-2');
    if (!buttonsContainer) {
      this.logger.error('Conteneur des boutons introuvable');
      this.logger.debug('Structures disponibles:', document.querySelectorAll('.kanban-header .d-flex'));
      return;
    }

    if (document.getElementById('view-mode-controls')) {
      this.logger.debug('Contrôles de vue déjà créés');
      return;
    }

    const viewModeContainer = document.createElement('div');
    viewModeContainer.id = 'view-mode-controls';
    viewModeContainer.className = 'd-flex align-items-center gap-2';

    viewModeContainer.innerHTML = `
      <div class="btn-group btn-group-sm" role="group" aria-label="Modes de vue">
        <button type="button" class="btn btn-outline-secondary active" data-mode="compact" title="Mode compact (1)">
          <i class="bi bi-grid-3x2"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary" data-mode="detailed" title="Mode détaillé (2)">
          <i class="bi bi-card-list"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary" data-mode="focus" title="Mode focus (3)">
          <i class="bi bi-zoom-in"></i>
        </button>
      </div>
    `;

    const newTaskButton = buttonsContainer.querySelector('#btn-nouvelle-tache');
    if (newTaskButton && buttonsContainer.contains(newTaskButton)) {
      buttonsContainer.insertBefore(viewModeContainer, newTaskButton);
    } else {
      buttonsContainer.appendChild(viewModeContainer);
    }

    this.logger.info('Contrôles de vue créés et insérés dans le bandeau haut');
  }

  setupEventListeners() {
    // NOTE: Les événements suivants sont gérés dans EventCentralizer.js :
    // - [data-mode] (click) - boutons de mode de vue (DOUBLON SUPPRIMÉ)
    // - document keydown (1,2,3) - raccourcis clavier modes (DOUBLON SUPPRIMÉ)
    // - #kanban-container (scroll) - navigation horizontale
    // - .scroll-arrow-left, .scroll-arrow-right (click) - flèches navigation
    // - .board-count (click) - badges (via délégation)
    //
    // Les addEventListener sur éléments créés dynamiquement restent dans les méthodes
    // de rendu (ex: renderFocusMode, attachCardEventListeners)
  }

  // ─── Layout / Wrapper ──────────────────────────────────────────────

  getKanbanWrapper() {
    if (!this.kanban || !this.kanban.kanbanContainer) {
      return this.wrapper;
    }

    const wrapper = this.kanban.kanbanContainer.closest('.kanban-wrapper');
    if (wrapper) {
      this.wrapper = wrapper;
    }
    return wrapper || this.wrapper;
  }

  syncWrapperLayout() {
    const wrapper = this.getKanbanWrapper();
    if (!wrapper) {
      return;
    }

    wrapper.classList.toggle('is-focus-mode', this.currentMode === VIEW_MODES.FOCUS);
    wrapper.classList.toggle('is-compact-mode', this.currentMode === VIEW_MODES.COMPACT);
    wrapper.classList.toggle('is-detailed-mode', this.currentMode === VIEW_MODES.DETAILED);

    const stackContent = this.collapsedStack?.querySelector('.stack-content');
    const hasItems = Boolean(stackContent && stackContent.children.length > 0);
    const shouldShowStack = hasItems && this.collapsedStack?.style.display !== 'none';
    wrapper.classList.toggle('has-collapsed-stack', shouldShowStack);
  }

  // ─── Mode de vue ───────────────────────────────────────────────────

  setViewMode(mode) {
    if (!Object.values(VIEW_MODES).includes(mode)) {
      this.logger.warn(`Invalid view mode: ${mode}`);
      return;
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;

    this.resetAllFilters();
    this.updateViewModeButtons();
    this.applyViewMode(mode, previousMode);
    this.saveViewMode();

    this.logger.info(`View mode changed to "${mode}" - filtres réinitialisés`);
  }

  updateViewModeButtons() {
    document.querySelectorAll('#view-mode-controls .btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === this.currentMode) {
        btn.classList.add('active');
      }
    });
  }

  applyViewMode(mode, previousMode) {
    const container = this.kanban.kanbanContainer;
    if (!container) {
      this.logger.error('Conteneur kanban introuvable pour appliquer le mode de vue');
      return;
    }

    this.logger.info(`Application du mode de vue: ${mode}`);

    container.classList.remove('kanban-compact', 'kanban-detailed', 'kanban-focus');

    switch (mode) {
      case VIEW_MODES.COMPACT:
        this.applyCompactMode();
        break;
      case VIEW_MODES.DETAILED:
        this.applyDetailedMode();
        break;
      case VIEW_MODES.FOCUS:
        this.applyFocusMode(previousMode);
        break;
      default:
        this.logger.error(`Mode de vue inconnu: ${mode}`);
    }

    this.syncWrapperLayout();

    if (this.kanban.refreshKanban) {
      this.kanban.viewMode = mode;

      if (this.kanban.filterManager && this.kanban.filterManager.updateForViewMode) {
        this.kanban.filterManager.updateForViewMode();
      }

      this.refreshWithSync();
    }
  }

  applyCompactMode() {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-compact');

    this.hideFocusNavigation();

    container.style.gridTemplateColumns = '';
    container.style.gap = '';
    container.style.height = '';

    setTimeout(() => {
      this.hideEmptyColumns();
    }, 100);

    this.logger.info('Mode compact appliqué - colonnes vides masquées');
  }

  applyDetailedMode() {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-detailed');

    this.hideFocusNavigation();

    container.style.gridTemplateColumns = '';
    container.style.gap = '';
    container.style.height = '';

    this.initColumnCollapse();

    setTimeout(() => {
      this.hideEmptyColumns();
    }, 100);

    this.logger.info('Mode détaillé appliqué - système de repliage initialisé');
  }

  applyFocusMode(previousMode) {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-focus');

    this.logger.debug('Application du mode focus simplifié...');

    this.hideFocusNavigation();

    if (!this.focusColumn) {
      this.focusColumn = this.findFirstColumnWithTasks() || 'À faire';
      this.logger.debug(`Colonne focus automatique: ${this.focusColumn}`);
    }

    if (this.kanban.focusColumn !== this.focusColumn) {
      this.kanban.focusColumn = this.focusColumn;
      this.logger.debug(`Synchronisation focusColumn: ${this.focusColumn}`);
    }

    if (this.kanban.filterManager) {
      this.kanban.filterManager.setFilter('statut', this.focusColumn);
      this.logger.debug(`Filtre statut appliqué: ${this.focusColumn}`);
    }

    this.logger.debug(`Focus mode configuré pour colonne: ${this.focusColumn}`);

    container.style.gridTemplateColumns = '';
    container.style.gap = '';
    container.style.height = '';
    container.style.justifyContent = '';

    this.logger.info(`Mode focus simplifié appliqué - statut "${this.focusColumn}" filtré`);
  }

  // ─── Focus utilities ───────────────────────────────────────────────

  setFocusColumn(columnId) {
    this.focusColumn = columnId;
    this.kanban.focusColumn = columnId;

    if (this.currentMode === VIEW_MODES.FOCUS) {
      if (this.kanban.filterManager) {
        this.kanban.filterManager.setFilter('statut', columnId);
        this.logger.info(`Filtre statut appliqué en mode focus: ${columnId}`);
      }
    }
  }

  getTaskCountForStatus(status) {
    if (!this.kanban.currentRecords) return 0;
    return this.kanban.currentRecords.filter(record => record.statut === status).length;
  }

  findFirstColumnWithTasks() {
    if (!this.kanban.currentRecords) return null;

    const statusOrder = ['Backlog', 'À faire', 'En cours', 'Bloqué', 'En test', 'Terminé'];

    for (const status of statusOrder) {
      if (this.getTaskCountForStatus(status) > 0) {
        return status;
      }
    }

    return null;
  }

  hideFocusNavigation() {
    const navigation = document.getElementById('focus-navigation');
    if (navigation) {
      navigation.remove();
    }
  }

  createFocusNavigation() {
    // Navigation supprimée - le mode focus utilise maintenant directement le filtre statut
    this.logger.debug('Navigation focus désactivée - utilise le filtre statut');
  }

  showOnlyFocusColumn(focusColumnName) {
    const container = this.kanban.kanbanContainer;
    if (!container) {
      this.logger.error('Container kanban introuvable pour le mode focus');
      return;
    }

    const columns = container.querySelectorAll('.kanban-board');
    this.logger.debug(`Mode focus: recherche colonne "${focusColumnName}" parmi ${columns.length} colonnes`);

    let foundColumn = false;

    columns.forEach(column => {
      const titleElement = column.querySelector('.kanban-board-title');
      const columnName = titleElement ? titleElement.textContent.trim() : '';

      this.logger.debug(`Comparaison: "${columnName}" === "${focusColumnName}" ?`, columnName === focusColumnName);

      if (columnName === focusColumnName) {
        column.style.display = 'block';
        column.style.maxWidth = '600px';
        column.style.margin = '0 auto';
        foundColumn = true;
        this.logger.debug(`Colonne "${columnName}" affichée en mode focus`);
      } else {
        column.style.display = 'none';
        this.logger.debug(`Colonne "${columnName}" masquée`);
      }
    });

    if (!foundColumn) {
      this.logger.warn(`Colonne focus "${focusColumnName}" non trouvée! Affichage de toutes les colonnes.`);
      columns.forEach(column => {
        column.style.display = 'block';
      });
    }
  }

  // ─── Persistence ───────────────────────────────────────────────────

  saveViewMode() {
    try {
      localStorage.setItem('kanban-view-mode', this.currentMode);
      localStorage.setItem('kanban-focus-column', this.focusColumn || '');
    } catch (error) {
      this.logger.warn('Cannot save view mode to localStorage');
    }
  }

  loadSavedViewMode() {
    try {
      const savedMode = localStorage.getItem('kanban-view-mode');
      const savedFocusColumn = localStorage.getItem('kanban-focus-column');

      if (savedMode && Object.values(VIEW_MODES).includes(savedMode)) {
        this.currentMode = savedMode;
      }

      if (savedFocusColumn) {
        this.focusColumn = savedFocusColumn;
      }

    } catch (error) {
      this.logger.warn('Error loading saved view mode from localStorage');
    }
  }

  // ─── State ─────────────────────────────────────────────────────────

  getCurrentMode() {
    return this.currentMode;
  }

  getFocusColumn() {
    return this.focusColumn;
  }

  isMode(mode) {
    return this.currentMode === mode;
  }

  cycleViewMode() {
    const modes = Object.values(VIEW_MODES);
    const currentIndex = modes.indexOf(this.currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setViewMode(modes[nextIndex]);
  }

  reset() {
    this.setViewMode(VIEW_MODES.COMPACT);
    this.focusColumn = null;
  }

  exportState() {
    return {
      currentMode: this.currentMode,
      focusColumn: this.focusColumn,
      timestamp: Date.now()
    };
  }

  importState(state) {
    if (state && state.currentMode && Object.values(VIEW_MODES).includes(state.currentMode)) {
      this.setViewMode(state.currentMode);
    }

    if (state && state.focusColumn) {
      this.setFocusColumn(state.focusColumn);
    }
  }

  // ─── Display ───────────────────────────────────────────────────────

  hideEmptyColumns() {
    const container = this.kanban.kanbanContainer;
    if (!container) return;

    const columns = container.querySelectorAll('.kanban-board');
    let visibleCount = 0;
    let totalCount = 0;

    columns.forEach(column => {
      const titleElement = column.querySelector('.kanban-board-title');
      const columnName = titleElement ? titleElement.textContent.trim() : '';
      const taskCount = this.getTaskCountForStatus(columnName);

      totalCount++;

      if (taskCount > 0) {
        column.style.display = '';
        visibleCount++;
      } else {
        column.style.display = 'none';
      }
    });

    if (visibleCount === 0 && totalCount > 0) {
      columns.forEach(column => {
        column.style.display = '';
      });
    }

    this.logger.debug(`Colonnes visibles: ${visibleCount}/${totalCount}`);
  }

  showAllColumns() {
    const columns = this.kanban.kanbanContainer.querySelectorAll('.kanban-board');
    columns.forEach(column => {
      column.style.display = '';
    });
    this.logger.debug('Toutes les colonnes affichées');
  }

  resetAllFilters() {
    if (!this.kanban.filterManager) return;

    try {
      this.kanban.filterManager.clearAllFilters();
      this.logger.info('Tous les filtres réinitialisés');
    } catch (error) {
      this.logger.error('Erreur lors de la réinitialisation des filtres:', error);
    }
  }

  refreshWithSync() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(() => {
      if (this.kanban.filterManager && this.kanban.filterManager.applyFilters) {
        this.kanban.filterManager.applyFilters();
      } else if (this.kanban.refreshKanban) {
        this.kanban.refreshKanban();
      }

      if (this.currentMode === VIEW_MODES.FOCUS && this.focusColumn) {
        setTimeout(() => {
          this.showOnlyFocusColumn(this.focusColumn);
        }, 100);
      }

      this.refreshTimeout = null;
    }, 50);
  }

  initializeViewMode() {
    this.updateViewModeButtons();
    this.applyViewMode(this.currentMode);
  }

  // ─── Délégation publique : CardRenderer ────────────────────────────

  renderTaskCard(record, viewMode) {
    return this.cardRenderer.renderTaskCard(record, viewMode);
  }

  calculatePriority(urgence, impact) {
    return this.cardRenderer.calculatePriority(urgence, impact);
  }

  getMultipleStrategiesInfo(strategieId) {
    return this.cardRenderer.getMultipleStrategiesInfo(strategieId);
  }

  generateTimelineButton(record) {
    return this.cardRenderer.generateTimelineButton(record);
  }

  generateReferenceIcon(record, viewMode) {
    return this.cardRenderer.generateReferenceIcon(record, viewMode);
  }

  generateJalonIcon(record, viewMode) {
    return this.cardRenderer.generateJalonIcon(record, viewMode);
  }

  generateExpandedContent(record, viewMode) {
    return this.cardRenderer.generateExpandedContent(record, viewMode);
  }

  extractReferences(text) {
    return this.cardRenderer.extractReferences(text);
  }

  handleKeyboardNavigation(e) {
    return this.cardRenderer.handleKeyboardNavigation(e);
  }

  // ─── Délégation publique : KanbanRenderer ──────────────────────────

  renderKanban(viewMode, records, options) {
    this.kanbanRenderer.renderKanban(viewMode, records, options);
  }

  updateBadgeStates(container, activeStatut) {
    container.querySelectorAll('.board-count').forEach(badge => {
      const statut = badge.dataset.status;
      if (activeStatut && statut === activeStatut) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    });
  }

  // ─── Délégation publique : ColumnCollapseManager ───────────────────

  initColumnCollapse() {
    this.collapseManager.initColumnCollapse();
  }

  handleColumnCollapse(e) {
    this.collapseManager.handleColumnCollapse(e);
  }

  onKanbanRendered() {
    this.collapseManager.onKanbanRendered();
  }

  // ─── Backward-compat stubs ─────────────────────────────────────────

  attachCardEventListeners(container) {
    // NOTE: TOUS les événements des cartes sont maintenant gérés par EventCentralizer.js
    // via délégation pour éviter l'accumulation de handlers (fuites mémoire).
    // Cette fonction est conservée vide pour compatibilité.
  }

  attachEventListeners(container) {
    this.attachCardEventListeners(container);

    // NOTE: TOUS les événements gérés par EventCentralizer.js via délégation :
    // - .board-count (click)
    // - #kanban-container (keydown ArrowLeft/Right)
  }

  removeColumnCollapseListeners() {
    // NOTE: Cette fonction n'est plus nécessaire car les événements .btn-collapse
    // sont gérés par EventCentralizer.js via délégation (pas d'addEventListener direct).
    // Conservée pour compatibilité.
  }

  // ─── Destruction ───────────────────────────────────────────────────

  destroySortableInstances() {
    this.sortableInstances.forEach(instance => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    this.sortableInstances = [];
  }

  destroy() {
    this.hideFocusNavigation();
    this.removeColumnCollapseListeners();
    this.destroySortableInstances();

    if (this.collapsedStack) {
      this.collapsedStack.remove();
      this.collapsedStack = null;
    }

    const viewModeControls = document.getElementById('view-mode-controls');
    if (viewModeControls) {
      viewModeControls.remove();
    }

    this.logger.debug('ViewManager resources cleaned up');
  }
}
