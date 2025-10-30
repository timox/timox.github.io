// === managers/ViewManager.js ===
// Gestionnaire centralisé pour les modes de vue et le rendu du Kanban

import { STATUTS, VIEW_MODES, getStatusAccent } from '../config/constants.js';
import {
  generateBureauBadges,
  generatePriorityBadge,
  generateProjectBadge,
  generateResponsablesBadges
} from '../utils/badges.js';
import { generateDatesContainer } from '../utils/dates.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour les modes de vue du Kanban
 */
export class ViewManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentMode = VIEW_MODES.DETAILED;
    this.focusColumn = null;
    this.logger = createModuleLogger('ViewManager');
    this.wrapper = null;
    this.stackHost = null;
    this.sortableInstances = [];

    this.init();
  }
  
  /**
   * Initialise le gestionnaire de modes de vue
   */
  init() {
    this.createViewModeControls();
    this.setupEventListeners();
    this.loadSavedViewMode();
    this.wrapper = this.getKanbanWrapper();
    // État de repliage des colonnes
    this.collapsedColumns = new Set();
    this.collapsedStack = null; // Référence à la pile des colonnes repliées

    // Aligner immédiatement l'affichage sur le mode courant (détaillé par défaut)
    this.initializeViewMode();

    this.logger.info('Gestionnaire de modes de vue initialisé');
  }
  
  /**
   * Crée les contrôles de mode de vue
   */
  createViewModeControls() {
    // Chercher le conteneur des boutons dans le header
    const buttonsContainer = document.querySelector('.kanban-header .d-flex .d-flex.gap-2');
    if (!buttonsContainer) {
      this.logger.error('Conteneur des boutons introuvable');
      this.logger.debug('Structures disponibles:', document.querySelectorAll('.kanban-header .d-flex'));
      return;
    }
    
    // Vérifier si les contrôles existent déjà
    if (document.getElementById('view-mode-controls')) {
      this.logger.debug('Contrôles de vue déjà créés');
      return;
    }
    
    // Créer un conteneur pour les modes de vue dans le bandeau haut
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
    
    // Insérer avant le bouton "Nouvelle Tâche"
    const newTaskButton = buttonsContainer.querySelector('#btn-nouvelle-tache');
    if (newTaskButton && buttonsContainer.contains(newTaskButton)) {
      buttonsContainer.insertBefore(viewModeContainer, newTaskButton);
    } else {
      buttonsContainer.appendChild(viewModeContainer);
    }
    
    this.logger.info('Contrôles de vue créés et insérés dans le bandeau haut');
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Boutons de mode de vue
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-mode]')) {
        const button = e.target.closest('[data-mode]');
        const mode = button.dataset.mode;
        this.setViewMode(mode);
      }
    });
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      if (!e.target.matches('input, textarea, select')) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.setViewMode(VIEW_MODES.COMPACT);
            break;
          case '2':
            e.preventDefault();
            this.setViewMode(VIEW_MODES.DETAILED);
            break;
          case '3':
            e.preventDefault();
            this.setViewMode(VIEW_MODES.FOCUS);
            break;
        }
      }
    });
    
    // Navigation focus supprimée - le mode focus utilise maintenant le filtre statut directement
  }

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

  /**
   * Définit le mode de vue
   * @param {string} mode - Mode de vue
   */
  setViewMode(mode) {
    if (!Object.values(VIEW_MODES).includes(mode)) {
      this.logger.warn(`Invalid view mode: ${mode}`);
      return;
    }
    
    const previousMode = this.currentMode;
    this.currentMode = mode;
    
    // Réinitialiser tous les filtres avant de changer de vue
    this.resetAllFilters();
    
    // Mettre à jour les boutons
    this.updateViewModeButtons();
    
    // Appliquer le mode
    this.applyViewMode(mode, previousMode);
    
    // Sauvegarder la préférence
    this.saveViewMode();
    
    this.logger.info(`View mode changed to "${mode}" - filtres réinitialisés`);
  }
  
  /**
   * Met à jour l'état des boutons de mode de vue
   */
  updateViewModeButtons() {
    document.querySelectorAll('#view-mode-controls .btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === this.currentMode) {
        btn.classList.add('active');
      }
    });
  }
  
  /**
   * Applique le mode de vue au kanban
   * @param {string} mode - Nouveau mode
   * @param {string} previousMode - Mode précédent
   */
  applyViewMode(mode, previousMode) {
    const container = this.kanban.kanbanContainer;
    if (!container) {
      this.logger.error('Conteneur kanban introuvable pour appliquer le mode de vue');
      return;
    }
    
    this.logger.info(`Application du mode de vue: ${mode}`);
    
    // Nettoyer les classes de mode précédentes
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

    // Rafraîchir le kanban avec le nouveau mode
    if (this.kanban.refreshKanban) {
      this.kanban.viewMode = mode;
      
      // Mettre à jour les options de filtrage selon le mode
      if (this.kanban.filterManager && this.kanban.filterManager.updateForViewMode) {
        this.kanban.filterManager.updateForViewMode();
      }
      
      // Rafraichissement synchronisé
      this.refreshWithSync();
    }
  }
  
  /**
   * Applique le mode compact
   */
  applyCompactMode() {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-compact');
    
    // Masquer la navigation focus si elle existe
    this.hideFocusNavigation();
    
    // Réinitialiser les styles inline pour laisser le CSS prendre le contrôle
    container.style.gridTemplateColumns = '';
    container.style.gap = '';
    container.style.height = '';
    
    // Masquer les colonnes vides
    setTimeout(() => {
      this.hideEmptyColumns();
    }, 100);
    
    this.logger.info('Mode compact appliqué - colonnes vides masquées');
  }
  
  /**
   * Applique le mode détaillé
   */
  applyDetailedMode() {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-detailed');
    
    // Masquer la navigation focus si elle existe
    this.hideFocusNavigation();
    
    // Réinitialiser les styles inline pour laisser le CSS prendre le contrôle
    container.style.gridTemplateColumns = '';
    container.style.gap = '';
    container.style.height = '';
    
    // Initialiser le système de repliage des colonnes
    this.initColumnCollapse();
    
    // Masquer les colonnes vides
    setTimeout(() => {
      this.hideEmptyColumns();
    }, 100);
    
    this.logger.info('Mode détaillé appliqué - système de repliage initialisé');
  }
  
  /**
   * Applique le mode focus
   * @param {string} previousMode - Mode précédent
   */
  applyFocusMode(previousMode) {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-focus');
    
    this.logger.debug('Application du mode focus simplifié...');
    
    // SIMPLIFIÉ: Pas de navigation focus custom, utilise le filtre statut uniquement
    this.hideFocusNavigation();
    
    // Si pas de colonne focus définie, choisir la première colonne avec des tâches
    if (!this.focusColumn) {
      this.focusColumn = this.findFirstColumnWithTasks() || 'À faire';
      this.logger.debug(`Colonne focus automatique: ${this.focusColumn}`);
    }
    
    // CORRECTION: Synchroniser avec le kanban principal
    if (this.kanban.focusColumn !== this.focusColumn) {
      this.kanban.focusColumn = this.focusColumn;
      this.logger.debug(`Synchronisation focusColumn: ${this.focusColumn}`);
    }
    
    // SIMPLIFIÉ: Appliquer le filtre statut directement via FilterManager
    if (this.kanban.filterManager) {
      this.kanban.filterManager.setFilter('statut', this.focusColumn);
      this.logger.debug(`Filtre statut appliqué: ${this.focusColumn}`);
    }
    
    // Pas de refresh ici - sera fait par applyViewMode()
    this.logger.debug(`Focus mode configuré pour colonne: ${this.focusColumn}`);
    
    container.style.gridTemplateColumns = '';
    container.style.gap = '';
    container.style.height = '';
    container.style.justifyContent = '';

    this.logger.info(`Mode focus simplifié appliqué - statut "${this.focusColumn}" filtré`);
  }
  
  /**
   * Crée la navigation pour le mode focus
   * SUPPRIMÉ: Plus nécessaire avec la simplification du mode focus
   */
  createFocusNavigation() {
    // Navigation supprimée - le mode focus utilise maintenant directement le filtre statut
    this.logger.debug('Navigation focus désactivée - utilise le filtre statut');
  }
  
  /**
   * Masque la navigation focus
   */
  hideFocusNavigation() {
    const navigation = document.getElementById('focus-navigation');
    if (navigation) {
      navigation.remove();
    }
  }
  
  /**
   * Définit la colonne en focus
   * @param {string} columnId - ID de la colonne
   */
  setFocusColumn(columnId) {
    this.focusColumn = columnId;
    
    // CORRECTION: Synchroniser avec le kanban principal
    this.kanban.focusColumn = columnId;
    
    // SIMPLIFIÉ: Si on est en mode focus, appliquer le filtre statut directement
    if (this.currentMode === VIEW_MODES.FOCUS) {
      if (this.kanban.filterManager) {
        this.kanban.filterManager.setFilter('statut', columnId);
        this.logger.info(`Filtre statut appliqué en mode focus: ${columnId}`);
      }
    }
  }
  
  /**
   * Obtient le nombre de tâches pour un statut
   * @param {string} status - Statut
   * @returns {number} Nombre de tâches
   */
  getTaskCountForStatus(status) {
    if (!this.kanban.currentRecords) return 0;
    
    return this.kanban.currentRecords.filter(record => record.statut === status).length;
  }
  
  /**
   * Trouve la première colonne qui a des tâches
   * @returns {string|null} Nom de la première colonne avec des tâches
   */
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
  
  /**
   * Masque toutes les colonnes vides (sauf si toutes sont vides)
   */
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
    
    // Si toutes les colonnes sont vides, afficher toutes les colonnes
    if (visibleCount === 0 && totalCount > 0) {
      columns.forEach(column => {
        column.style.display = '';
      });
    }
    
    this.logger.debug(`Colonnes visibles: ${visibleCount}/${totalCount}`);
  }
  
  /**
   * Rafraichit le kanban de manière synchronisée
   */
  refreshWithSync() {
    // Éviter les rafraichissements multiples rapprochés
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    this.refreshTimeout = setTimeout(() => {
      // CORRIGÉ: Utiliser applyFilters() pour préserver l'état des filtres
      if (this.kanban.filterManager && this.kanban.filterManager.applyFilters) {
        this.kanban.filterManager.applyFilters();
      } else if (this.kanban.refreshKanban) {
        this.kanban.refreshKanban();
      }
        
      // Appliquer le mode focus APRÈS le refresh si nécessaire
      if (this.currentMode === VIEW_MODES.FOCUS && this.focusColumn) {
        setTimeout(() => {
          this.showOnlyFocusColumn(this.focusColumn);
        }, 100);
      }
      
      this.refreshTimeout = null;
    }, 50);
  }
  
  /**
   * Initialise le mode de vue par défaut
   */
  initializeViewMode() {
    this.updateViewModeButtons();
    this.applyViewMode(this.currentMode);
  }
  
  /**
   * Sauvegarde le mode de vue dans le localStorage
   */
  saveViewMode() {
    try {
      localStorage.setItem('kanban-view-mode', this.currentMode);
      localStorage.setItem('kanban-focus-column', this.focusColumn || '');
    } catch (error) {
      this.logger.warn('Cannot save view mode to localStorage');
    }
  }
  
  /**
   * Charge le mode de vue sauvegardé
   */
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
  
  /**
   * Affiche toutes les colonnes
   */
  showAllColumns() {
    const columns = this.kanban.kanbanContainer.querySelectorAll('.kanban-board');
    columns.forEach(column => {
      column.style.display = '';
    });
    this.logger.debug('Toutes les colonnes affichées');
  }
  
  /**
   * Affiche seulement la colonne en focus
   * @param {string} focusColumnName - Nom de la colonne à afficher
   */
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
      // Si la colonne focus n'est pas trouvée, afficher toutes les colonnes
      columns.forEach(column => {
        column.style.display = 'block';
      });
    }
  }

  /**
   * Obtient le mode de vue actuel
   * @returns {string} Mode de vue actuel
   */
  getCurrentMode() {
    return this.currentMode;
  }
  
  /**
   * Obtient la colonne en focus
   * @returns {string} Colonne en focus
   */
  getFocusColumn() {
    return this.focusColumn;
  }
  
  /**
   * Vérifie si le mode est actif
   * @param {string} mode - Mode à vérifier
   * @returns {boolean} True si le mode est actif
   */
  isMode(mode) {
    return this.currentMode === mode;
  }
  
  /**
   * Bascule vers le mode suivant
   */
  cycleViewMode() {
    const modes = Object.values(VIEW_MODES);
    const currentIndex = modes.indexOf(this.currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setViewMode(modes[nextIndex]);
  }
  
  /**
   * Réinitialise aux paramètres par défaut
   */
  reset() {
    this.setViewMode(VIEW_MODES.COMPACT);
    this.focusColumn = null;
  }
  
  /**
   * Exporte l'état du gestionnaire
   * @returns {object} État exporté
   */
  exportState() {
    return {
      currentMode: this.currentMode,
      focusColumn: this.focusColumn,
      timestamp: Date.now()
    };
  }
  
  /**
   * Importe un état du gestionnaire
   * @param {object} state - État à importer
   */
  importState(state) {
    if (state && state.currentMode && Object.values(VIEW_MODES).includes(state.currentMode)) {
      this.setViewMode(state.currentMode);
    }
    
    if (state && state.focusColumn) {
      this.setFocusColumn(state.focusColumn);
    }
  }
  
  /**
   * Réinitialise tous les filtres
   */
  resetAllFilters() {
    if (!this.kanban.filterManager) return;
    
    try {
      // Réinitialiser les filtres via le FilterManager
      this.kanban.filterManager.clearAllFilters();
      this.logger.info('Tous les filtres réinitialisés');
    } catch (error) {
      this.logger.error('Erreur lors de la réinitialisation des filtres:', error);
    }
  }

  /**
   * Initialise le système de repliage des colonnes pour le mode détaillé
   */
  initColumnCollapse() {
    // Supprimer les anciens écouteurs
    this.removeColumnCollapseListeners();

    // Ajouter les nouveaux écouteurs
    setTimeout(() => {
      const collapseButtons = Array.from(document.querySelectorAll('.btn-collapse-column'));

      if (collapseButtons.length === 0) {
        this.teardownCollapsedStack();
        return;
      }

      this.createCollapsedStack({ reset: true });

      collapseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this.handleColumnCollapse(e));
        this.decorateCollapseButton(btn);
      });

      this.restoreCollapsedColumns();

      this.logger.info(`${collapseButtons.length} boutons de repliage initialisés`);
    }, 60);
  }

  /**
   * Gère le repliage/dépliage d'une colonne
   * @param {Event} e - Événement click
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
    hiddenLabel.textContent = `${isCollapsed ? 'Déplier' : 'Replier'} la colonne ${statusId}`.trim();
    button.title = isCollapsed ? 'Déplier la colonne' : 'Replier la colonne';
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
    const container = this.kanban.kanbanContainer;
    if (!container) return null;
    return container.querySelector(`.kanban-board[data-status="${statusId}"]`);
  }

  /**
   * Replie une colonne
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Élément colonne
   * @param {HTMLElement} button - Bouton de repliage
  */
  collapseColumn(statusId, column, button, options = {}) {
    if (!column) {
      this.logger.warn(`Impossible de replier la colonne ${statusId} (élément introuvable)`);
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

    this.logger.info(`Colonne ${statusId} repliée`);
  }

  /**
   * Déplie une colonne
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Élément colonne
   * @param {HTMLElement} button - Bouton de repliage
   */
  expandColumn(statusId, column, button, options = {}) {
    this.collapsedColumns.delete(statusId);

    // Retirer de la pile
    this.removeFromCollapsedStack(statusId);

    // Réafficher la colonne
    if (column) {
      column.style.display = '';
      column.classList.remove('column-collapsing');
      column.classList.add('column-expanding');

      setTimeout(() => {
        column.classList.remove('column-expanding');
        this.redistributeColumnWidths();
      }, options.skipAnimation ? 0 : 260);
    } else {
      this.logger.warn(`Impossible de déplier la colonne ${statusId} (élément introuvable)`);
      this.redistributeColumnWidths();
    }

    if (button) {
      this.setCollapseButtonState(button, false);
    }

    this.logger.info(`Colonne ${statusId} dépliée`);
  }

  /**
   * Crée la pile des colonnes repliées
   */
  createCollapsedStack(options = {}) {
    const { reset = false } = options;
    const container = this.kanban.kanbanContainer;
    const wrapper = this.getKanbanWrapper();
    const host = wrapper || container;
    if (!host || !container) return;

    if (!this.collapsedStack) {
      this.collapsedStack = document.createElement('aside');
      this.collapsedStack.className = 'collapsed-columns-stack';
      this.collapsedStack.setAttribute('role', 'complementary');
      this.collapsedStack.setAttribute('aria-label', 'Colonnes repliées');
      this.collapsedStack.innerHTML = `
        <div class="stack-header">
          <div class="stack-title">
            <i class="bi bi-layout-three-columns" aria-hidden="true"></i>
            <span>Colonnes repliées</span>
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

    this.stackHost = host;

    if (wrapper) {
      wrapper.classList.add('has-collapsed-stack');
      wrapper.classList.toggle('is-focus-mode', this.currentMode === VIEW_MODES.FOCUS);
      wrapper.classList.toggle('is-compact-mode', this.currentMode === VIEW_MODES.COMPACT);
    }

    if (reset && this.collapsedStack) {
      const stackContent = this.collapsedStack.querySelector('.stack-content');
      if (stackContent) {
        stackContent.innerHTML = '';
      }
    }

    this.syncWrapperLayout();

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
    this.stackHost = null;

    const wrapper = this.getKanbanWrapper();
    if (wrapper) {
      wrapper.classList.remove('has-collapsed-stack');
    }

    this.updateCollapsedStackCounter();
  }

  /**
   * Ajoute une colonne à la pile repliée
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Élément colonne
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
      <button class="btn-expand-from-stack" data-status="${statusId}" title="Déplier la colonne ${title}">
        <span class="visually-hidden">Déplier la colonne ${title}</span>
        <i class="bi bi-arrow-bar-right" aria-hidden="true"></i>
      </button>
    `;

    stackItem.querySelector('.btn-expand-from-stack').addEventListener('click', (e) => {
      e.preventDefault();
      const targetColumn = this.findColumnByStatus(statusId);
      const originalButton = targetColumn?.querySelector('.btn-collapse-column');

      if (targetColumn && originalButton) {
        this.expandColumn(statusId, targetColumn, originalButton, { fromStack: true });
      } else {
        this.collapsedColumns.delete(statusId);
        this.removeFromCollapsedStack(statusId);
      }
    });

    stackContent.appendChild(stackItem);

    this.updateCollapsedStackCounter();
  }

  /**
   * Retire une colonne de la pile repliée
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
    const container = this.kanban.kanbanContainer;
    const visibleColumns = container.querySelectorAll('.kanban-board:not([style*="display: none"])');

    if (visibleColumns.length === 0) return;

    if (this.currentMode === VIEW_MODES.FOCUS) {
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
    this.syncWrapperLayout();
  }

  restoreCollapsedColumns() {
    if (this.currentMode === VIEW_MODES.COMPACT) {
      this.showAllColumns();
      this.teardownCollapsedStack();
      return;
    }

    if (!this.collapsedColumns || this.collapsedColumns.size === 0) {
      if (this.currentMode === VIEW_MODES.FOCUS) {
        this.teardownCollapsedStack();
      } else {
        this.showAllColumns();
      }
      this.updateCollapsedStackCounter();
      this.redistributeColumnWidths();
      return;
    }

    const statuses = Array.from(this.collapsedColumns);
    this.collapsedColumns.clear();

    if (this.currentMode !== VIEW_MODES.DETAILED) {
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
   * Supprime les écouteurs de repliage de colonnes
   */
  removeColumnCollapseListeners() {
    document.querySelectorAll('.btn-collapse-column').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
  }

  onKanbanRendered() {
    if (this.currentMode === VIEW_MODES.DETAILED) {
      this.initColumnCollapse();
    } else {
      this.showAllColumns();
      this.teardownCollapsedStack();
    }
  }

  /**
   * Calcule la priorité d'une tâche
   * @param {string} urgence - Niveau d'urgence
   * @param {string} impact - Niveau d'impact
   * @returns {number} Priorité (1-4)
   */
  calculatePriority(urgence, impact) {
    const imp = String(impact || '').trim().toLowerCase();
    const urg = String(urgence || '').trim().toLowerCase();

    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }

  /**
   * Obtient les informations des stratégies multiples
   * @param {string} strategieId - IDs des stratégies (séparés par virgules)
   * @returns {Array} Informations des stratégies
   */
  getMultipleStrategiesInfo(strategieId) {
    if (!strategieId || !this.kanban.strategyData) return [];

    const ids = String(strategieId)
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));

    return ids
      .map(id => this.kanban.strategyData.find(s => s.id === id))
      .filter(Boolean);
  }

  /**
   * Génère le bouton timeline
   * @param {object} record - Données de la tâche
   * @returns {string} HTML du bouton timeline
   */
  generateTimelineButton(record) {
    let notesEventCount = 0;
    if (record?.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData && Array.isArray(notesData.history)) {
          notesEventCount = notesData.history.length;
        }
      } catch {
        notesEventCount = 0;
      }
    }

    if (!notesEventCount) {
      return `<button class="btn btn-sm timeline-btn"
                      data-task-id="${record.id}"
                      title="Aucun événement"
                      style="border: none; background: none; color: #6c757d;">
                <i class="bi bi-clock-history"></i>
              </button>`;
    }

    return `<button class="btn btn-sm timeline-btn"
                    data-task-id="${record.id}"
                    title="${notesEventCount} événement${notesEventCount > 1 ? 's' : ''}"
                    style="border: none; background: none; color: #0dcaf0;">
              <i class="bi bi-clock-history"></i>
            </button>`;
  }

  /**
   * Rend une carte de tâche
   * @param {object} record - Données de la tâche
   * @param {string} viewMode - Mode de vue (compact, detailed, focus)
   * @returns {string} HTML de la carte
   */
  renderTaskCard(record, viewMode = VIEW_MODES.COMPACT) {
    if (!record?.id) {
      this.logger.warn('Tentative de rendu de carte sans identifiant', record);
      return '';
    }

    const priority = this.calculatePriority(record.urgence, record.impact);
    const priorityBadge = generatePriorityBadge(priority);
    const strategiesInfo = this.getMultipleStrategiesInfo(record.strategie_id);
    const hasStrategy = strategiesInfo.length > 0 ||
      record.strategie_objectif ||
      record.strategie_sous_objectif ||
      record.strategie_action;

    const strategiesText = strategiesInfo.length > 0
      ? strategiesInfo.map(s => `• ${s.objectif}`).join('\\n')
      : '';
    const strategyTooltip = strategiesText
      ? `title="${strategiesInfo.length} stratégie${strategiesInfo.length > 1 ? 's' : ''} liée${strategiesInfo.length > 1 ? 's' : ''}"`
      : (hasStrategy ? 'title="Stratégie associée"' : '');
    const strategyIcon = hasStrategy
      ? `<i class="bi bi-crosshair strategie-icon" ${strategyTooltip} style="font-size: 1.1em; color: #28a745;"></i>`
      : '';

    const projectBadge = record.projet
      ? generateProjectBadge({
          projet: record.projet,
          strategie_objectif: strategiesInfo[0]?.objectif,
          strategie_sous_objectif: strategiesInfo[0]?.sous_objectif,
          strategie_action: strategiesInfo[0]?.action
        })
      : '';

    let resumeDesc = '';
    if (record.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData?.content) {
          const content = notesData.content.substring(0, 80);
          resumeDesc = `<div class="desc-resume">${content}${notesData.content.length > 80 ? '…' : ''}</div>`;
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    const datesElement = generateDatesContainer({
      date_debut: record.date_debut,
      date_echeance: record.date_echeance
    }, viewMode === VIEW_MODES.COMPACT);

    const bureauBadges = generateBureauBadges(record.bureau, viewMode === VIEW_MODES.COMPACT);
    const responsablesBadges = generateResponsablesBadges(record.qui);
    const timelineButton = this.generateTimelineButton(record);

    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    const hasDateDebutClass = record.date_debut ? 'has-debut' : '';
    const cardClass = viewMode === VIEW_MODES.COMPACT ? 'kanban-item-compact' : 'kanban-item';

    return `<div class="kanban-item ${cardClass} ${hasEcheanceClass} ${hasDateDebutClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>

      ${bureauBadges}

      <div class="kanban-item-header">
        <div class="priority-section">
          ${priorityBadge}
          ${strategyIcon}
          ${this.generateReferenceIcon(record, viewMode)}
          ${this.generateJalonIcon(record, viewMode)}
        </div>
        <div class="item-badges">
          ${projectBadge}
          ${timelineButton}
        </div>
      </div>

      <div class="item-title editable-zone">${record.titre || 'Sans titre'}</div>

      ${this.generateExpandedContent(record, viewMode)}

      ${resumeDesc}

      ${datesElement}

      ${viewMode !== VIEW_MODES.COMPACT ? responsablesBadges : ''}
    </div>`;
  }

  generateReferenceIcon(record, viewMode) {
    if (viewMode === VIEW_MODES.COMPACT) return '';

    const hasReference = record?.notes && (
      record.notes.includes('\\\\') ||
      record.notes.includes('http') ||
      record.notes.includes('file://') ||
      record.notes.includes('C:') ||
      record.notes.includes('D:')
    );

    if (!hasReference) return '';

    const tooltip = viewMode === VIEW_MODES.FOCUS
      ? 'title="Contient des références - cliquer pour voir le détail"'
      : 'title="Contient des références"';

    return `<i class="bi bi-link-45deg reference-icon" ${tooltip} style="font-size: 1.1em; color: #6f42c1;"></i>`;
  }

  normalizeJalonsData(rawJalons) {
    if (!rawJalons) {
      return [];
    }

    let parsed = rawJalons;

    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if (!trimmed || trimmed === '[]' || trimmed.toLowerCase() === 'null') {
        return [];
      }

      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        this.logger?.warn('Impossible de parser les jalons:', error?.message || error);
        return [];
      }
    }

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.jalons)) {
        return parsed.jalons;
      }

      if (Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }

    return [];
  }

  generateJalonIcon(record, viewMode) {
    if (viewMode === VIEW_MODES.COMPACT) return '';

    const jalonsList = this.normalizeJalonsData(record?.jalons);
    const jalonCount = jalonsList.length;
    if (jalonCount === 0) return '';

    const tooltip = viewMode === VIEW_MODES.FOCUS
      ? `title="${jalonCount} jalon${jalonCount > 1 ? 's' : ''} planifié${jalonCount > 1 ? 's' : ''} - cliquer pour voir"`
      : `title="${jalonCount} jalon${jalonCount > 1 ? 's' : ''}"`;

    return `<i class="bi bi-calendar-event jalon-icon" ${tooltip} style="font-size: 1.1em; color: #fd7e14;"></i>`;
  }

  generateExpandedContent(record, viewMode) {
    if (viewMode !== VIEW_MODES.FOCUS) return '';

    let expandedContent = '';
    const strategiesInfo = this.getMultipleStrategiesInfo(record.strategie_id);
    if (strategiesInfo.length > 0) {
      expandedContent += `
        <div class="expanded-strategies">
          <h6><i class="bi bi-crosshair me-1"></i>Stratégies:</h6>
          <ul class="list-unstyled ms-3">
            ${strategiesInfo.map(s => `<li>• ${s.objectif} → ${s.action}</li>`).join('')}
          </ul>
        </div>`;
    }

    const jalonsList = this.normalizeJalonsData(record?.jalons);
    if (jalonsList.length > 0) {
      expandedContent += `
        <div class="expanded-jalons">
          <h6><i class="bi bi-calendar-event me-1"></i>Jalons:</h6>
          <ul class="list-unstyled ms-3">
            ${jalonsList.map(j => `<li>• ${j.titre}${j.date ? ` (${j.date})` : ''}</li>`).join('')}
          </ul>
        </div>`;
    }

    if (record?.notes && (record.notes.includes('\\\\') || record.notes.includes('http'))) {
      const references = this.extractReferences(record.notes);
      if (references.length > 0) {
        expandedContent += `
          <div class="expanded-references">
            <h6><i class="bi bi-link-45deg me-1"></i>Références:</h6>
            <ul class="list-unstyled ms-3">
              ${references.map(ref => `<li>• <code>${ref}</code></li>`).join('')}
            </ul>
          </div>`;
      }
    }

    return expandedContent;
  }

  extractReferences(text) {
    const references = [];
    const networkPaths = text.match(/\\\\[^\s]+/g) || [];
    references.push(...networkPaths);
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    references.push(...urls);
    const localPaths = text.match(/[A-Z]:[^\s]+/g) || [];
    references.push(...localPaths);
    return [...new Set(references)];
  }

  attachCardEventListeners(container) {
    container.querySelectorAll('.editable-zone').forEach(zone => {
      zone.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const card = zone.closest('.kanban-item');
        const taskId = parseInt(card?.dataset.id, 10);

        if (!isNaN(taskId) && this.kanban.modalManager) {
          const task = this.kanban.currentRecords?.find(r => r.id === taskId);
          if (task) {
            this.kanban.modalManager.openTaskModal(task);
          }
        }
      });
    });

    container.querySelectorAll('.timeline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const taskId = parseInt(btn.dataset.taskId, 10);
        if (!isNaN(taskId)) {
          window.open(`timeline.html?task=${taskId}`, '_blank');
        }
      });
    });

    container.querySelectorAll('.kanban-item').forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const editableZone = card.querySelector('.editable-zone');
          editableZone?.click();
        }
      });
    });
  }

  renderKanban(viewMode, records = [], options = {}) {
    const {
      showTermine = true,
      focusColumn = null,
      container = null
    } = options;

    const kanbanContainer = container || this.kanban.kanbanContainer;
    if (!kanbanContainer) {
      this.logger.error('Impossible de rendre le Kanban: container introuvable');
      return;
    }

    this.destroySortableInstances();

    const statutsToShow = showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');

    switch (viewMode) {
      case VIEW_MODES.FOCUS:
        this.renderFocusMode(kanbanContainer, statutsToShow, records, focusColumn || this.focusColumn);
        break;
      case VIEW_MODES.DETAILED:
        this.renderColumnMode(kanbanContainer, statutsToShow, records, VIEW_MODES.DETAILED);
        break;
      case VIEW_MODES.COMPACT:
      default:
        this.renderColumnMode(kanbanContainer, statutsToShow, records, VIEW_MODES.COMPACT);
        break;
    }

    this.attachEventListeners(kanbanContainer);
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
        .map(record => this.renderTaskCard(record, mode))
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
    this.focusColumn = activeColumn;

    const navigationHTML = this.generateFocusNavigation(statuts, records, activeColumn);
    const activeStatus = statuts.find(s => s.id === activeColumn);
    const boardRecords = this.filterRecordsByStatus(records, activeColumn);

    this.sortRecords(boardRecords);

    const itemsHTML = boardRecords
      .map(record => this.renderTaskCard(record, VIEW_MODES.FOCUS))
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
                    title="Filtrer par ${statut.libelle} (${count} tâche${count !== 1 ? 's' : ''})"
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
             aria-label="Liste des tâches ${statut.libelle}">
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
                title="Voir les tâches ${statut.libelle}"
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
      <div class="focus-column" role="tabpanel" aria-label="Tâches ${activeStatus?.libelle || ''}" style="--column-accent: ${accentColor};">
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
             aria-label="Liste des tâches">
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
      <div class="empty-drop-zone" role="region" aria-label="Zone de dépôt vide">
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
        <span class="indicator urgent" title="${stats.urgentTasks} tâche${stats.urgentTasks > 1 ? 's' : ''} urgente${stats.urgentTasks > 1 ? 's' : ''}">
          <i class="bi bi-exclamation-triangle text-danger"></i>
          ${stats.urgentTasks}
        </span>
      `);
    }

    if (stats.overdueTasks > 0) {
      indicators.push(`
        <span class="indicator overdue" title="${stats.overdueTasks} tâche${stats.overdueTasks > 1 ? 's' : ''} en retard">
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
              title="Replier/Déplier la colonne"
              aria-label="Replier ou déplier la colonne">
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
             title="P${priority}: ${count} tâche${count > 1 ? 's' : ''} (${percentage}%)">
        </div>
      `;
    }).filter(Boolean);

    if (priorityBars.length === 0) return '';

    return `
      <div class="priority-distribution" title="Distribution des priorités">
        ${priorityBars.join('')}
      </div>
    `;
  }

  filterRecordsByStatus(records, statusId) {
    return records.filter(record => record.statut === statusId);
  }

  sortRecords(records) {
    records.sort((a, b) => {
      const prioA = this.calculatePriority(a.urgence, a.impact);
      const prioB = this.calculatePriority(b.urgence, b.impact);

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
      const priority = this.calculatePriority(record.urgence, record.impact);
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
      'À faire': '<i class="bi bi-calendar-plus"></i>',
      'En cours': '<i class="bi bi-play-circle"></i>',
      'En attente': '<i class="bi bi-pause-circle"></i>',
      'Bloqué': '<i class="bi bi-x-octagon"></i>',
      'Validation': '<i class="bi bi-check-circle"></i>',
      'Terminé': '<i class="bi bi-check-circle-fill"></i>'
    };

    return icons[statusId] || '<i class="bi bi-circle"></i>';
  }

  getStatusClass(statusId) {
    const classes = {
      'Backlog': 'status-backlog',
      'À faire': 'status-todo',
      'En cours': 'status-progress',
      'En attente': 'status-waiting',
      'Bloqué': 'status-blocked',
      'Validation': 'status-validation',
      'Terminé': 'status-done'
    };

    return classes[statusId] || 'status-unknown';
  }

  getEncouragementText(statusId) {
    const messages = {
      'Backlog': 'Glissez des tâches ici pour les planifier',
      'À faire': 'Prêt à démarrer de nouvelles tâches ?',
      'En cours': 'Aucune tâche en cours pour le moment',
      'En attente': 'Pas de tâches en attente actuellement',
      'Bloqué': 'Heureusement, rien n\'est bloqué !',
      'Validation': 'Rien à valider pour l\'instant',
      'Terminé': 'Aucune tâche terminée récemment'
    };

    return messages[statusId] || 'Glissez des tâches ici';
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

        this.sortableInstances.push(sortable);
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

      this.sortableInstances.push(sortable);
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

    if (fromStatus === 'Terminé' && toStatus !== 'Terminé') {
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

    if (typeof this.kanban.handleDragEnd === 'function') {
      this.kanban.handleDragEnd(evt, targetStatus);
    }
  }

  initializeScrollArrows() {
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');
    const kanbanContainer = this.kanban.kanbanContainer;

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

    kanbanContainer.addEventListener('scroll', updateArrows);

    leftArrow.addEventListener('click', () => {
      kanbanContainer.scrollBy({ left: -300, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
      kanbanContainer.scrollBy({ left: 300, behavior: 'smooth' });
    });

    const resizeObserver = new ResizeObserver(updateArrows);
    resizeObserver.observe(kanbanContainer);

    setTimeout(updateArrows, 100);
  }

  attachEventListeners(container) {
    this.attachCardEventListeners(container);

    container.querySelectorAll('.board-count').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const statut = e.currentTarget.dataset.status;

        if (this.kanban.filterManager) {
          const currentStatut = this.kanban.filterManager.filters.statut;
          const newStatut = currentStatut === statut ? '' : statut;

          this.kanban.filterManager.setFilter('statut', newStatut);
          this.updateBadgeStates(container, newStatut);
        }
      });
    });

    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.handleKeyboardNavigation(e);
      }
    });
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

  handleKeyboardNavigation(e) {
    const focusedElement = document.activeElement;
    const currentColumn = focusedElement?.closest('.kanban-board');

    if (!currentColumn) return;

    const allColumns = Array.from(document.querySelectorAll('.kanban-board:not(.board-hidden)'));
    const currentIndex = allColumns.indexOf(currentColumn);

    let nextIndex;
    if (e.key === 'ArrowLeft') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : allColumns.length - 1;
    } else {
      nextIndex = currentIndex < allColumns.length - 1 ? currentIndex + 1 : 0;
    }

    const nextColumn = allColumns[nextIndex];
    if (nextColumn) {
      const firstCard = nextColumn.querySelector('.kanban-item');
      if (firstCard) {
        firstCard.focus();
      } else {
        nextColumn.querySelector('.kanban-board-body')?.focus();
      }
    }
  }

  destroySortableInstances() {
    this.sortableInstances.forEach(instance => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    this.sortableInstances = [];
  }

  /**
   * Nettoie les ressources
   */
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
