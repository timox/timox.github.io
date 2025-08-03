// === managers/ViewModeManager.js ===
// Gestionnaire pour les modes de vue du Kanban (Compact, Détaillé, Focus)

import { VIEW_MODES } from '../config/constants.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour les modes de vue du Kanban
 */
export class ViewModeManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentMode = VIEW_MODES.COMPACT;
    this.focusColumn = null;
    this.logger = createModuleLogger('ViewModeManager');
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire de modes de vue
   */
  init() {
    this.createViewModeControls();
    this.setupEventListeners();
    this.loadSavedViewMode();
    // État de repliage des colonnes
    this.collapsedColumns = new Set();
    this.collapsedStack = null; // Référence à la pile des colonnes repliées
    
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
    
    // Ajuster la disposition - une seule colonne centrée
    container.style.gridTemplateColumns = '1fr';
    container.style.gap = '1rem';
    container.style.height = 'calc(100vh - 250px)';
    container.style.justifyContent = 'center';
    
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
      const collapseButtons = document.querySelectorAll('.btn-collapse-column');
      collapseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this.handleColumnCollapse(e));
      });
      
      // Créer la pile des colonnes repliées si elle n'existe pas
      this.createCollapsedStack();
      
      this.logger.info(`${collapseButtons.length} boutons de repliage initialisés`);
    }, 100);
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

  /**
   * Replie une colonne
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Élément colonne
   * @param {HTMLElement} button - Bouton de repliage
   */
  collapseColumn(statusId, column, button) {
    this.collapsedColumns.add(statusId);
    
    // Animer la colonne vers la pile
    column.classList.add('column-collapsing');
    
    setTimeout(() => {
      // Masquer la colonne originale
      column.style.display = 'none';
      
      // Ajouter à la pile
      this.addToCollapsedStack(statusId, column);
      
      // Recalculer la largeur des colonnes restantes
      this.redistributeColumnWidths();
      
    }, 300);
    
    // Mettre à jour l'icône
    button.innerHTML = '<i class="bi bi-chevron-right"></i>';
    button.title = 'Déplier la colonne';
    
    this.logger.info(`Colonne ${statusId} repliée`);
  }

  /**
   * Déplie une colonne
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Élément colonne
   * @param {HTMLElement} button - Bouton de repliage
   */
  expandColumn(statusId, column, button) {
    this.collapsedColumns.delete(statusId);
    
    // Retirer de la pile
    this.removeFromCollapsedStack(statusId);
    
    // Réafficher la colonne
    column.style.display = '';
    column.classList.remove('column-collapsing');
    column.classList.add('column-expanding');
    
    setTimeout(() => {
      column.classList.remove('column-expanding');
      
      // Recalculer la largeur des colonnes
      this.redistributeColumnWidths();
    }, 300);
    
    // Mettre à jour l'icône
    button.innerHTML = '<i class="bi bi-chevron-left"></i>';
    button.title = 'Replier la colonne';
    
    this.logger.info(`Colonne ${statusId} dépliée`);
  }

  /**
   * Crée la pile des colonnes repliées
   */
  createCollapsedStack() {
    if (this.collapsedStack) return;
    
    const container = this.kanban.kanbanContainer;
    
    this.collapsedStack = document.createElement('div');
    this.collapsedStack.className = 'collapsed-columns-stack';
    this.collapsedStack.innerHTML = `
      <div class="stack-header">
        <i class="bi bi-stack"></i>
        <span>Colonnes repliées</span>
      </div>
      <div class="stack-content"></div>
    `;
    
    // Insérer au début du container
    container.insertBefore(this.collapsedStack, container.firstChild);
  }

  /**
   * Ajoute une colonne à la pile repliée
   * @param {string} statusId - ID du statut
   * @param {HTMLElement} column - Élément colonne
   */
  addToCollapsedStack(statusId, column) {
    if (!this.collapsedStack) return;
    
    const stackContent = this.collapsedStack.querySelector('.stack-content');
    const title = column.querySelector('.board-title').textContent.trim();
    const count = column.querySelector('.board-count').textContent.trim();
    
    const stackItem = document.createElement('div');
    stackItem.className = 'stack-item';
    stackItem.dataset.status = statusId;
    stackItem.innerHTML = `
      <span class="stack-item-title">${title}</span>
      <span class="stack-item-count">${count}</span>
      <button class="btn-expand-from-stack" data-status="${statusId}" title="Déplier">
        <i class="bi bi-chevron-right"></i>
      </button>
    `;
    
    // Ajouter l'écouteur pour déplier depuis la pile
    stackItem.querySelector('.btn-expand-from-stack').addEventListener('click', (e) => {
      e.preventDefault();
      const originalButton = column.querySelector('.btn-collapse-column');
      this.expandColumn(statusId, column, originalButton);
    });
    
    stackContent.appendChild(stackItem);
    
    // Afficher la pile si elle était cachée
    this.collapsedStack.style.display = 'block';
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
    
    // Masquer la pile si elle est vide
    const stackContent = this.collapsedStack.querySelector('.stack-content');
    if (stackContent.children.length === 0) {
      this.collapsedStack.style.display = 'none';
    }
  }

  /**
   * Redistribue la largeur des colonnes visibles
   */
  redistributeColumnWidths() {
    const container = this.kanban.kanbanContainer;
    const visibleColumns = container.querySelectorAll('.kanban-board:not([style*="display: none"])');
    const collapsedCount = this.collapsedColumns.size;
    
    if (visibleColumns.length === 0) return;
    
    // Calculer la largeur disponible (moins la pile si elle existe)
    const stackWidth = this.collapsedStack && this.collapsedStack.style.display !== 'none' ? 200 : 0;
    const availableWidth = `calc((100% - ${stackWidth}px) / ${visibleColumns.length})`;
    
    visibleColumns.forEach(column => {
      column.style.flex = '0 0 ' + availableWidth;
      column.style.minWidth = availableWidth;
      column.style.maxWidth = availableWidth;
    });
  }

  /**
   * Supprime les écouteurs de repliage de colonnes
   */
  removeColumnCollapseListeners() {
    document.querySelectorAll('.btn-collapse-column').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.hideFocusNavigation();
    this.removeColumnCollapseListeners();
    
    if (this.collapsedStack) {
      this.collapsedStack.remove();
      this.collapsedStack = null;
    }
    
    const viewModeControls = document.getElementById('view-mode-controls');
    if (viewModeControls) {
      viewModeControls.remove();
    }
    
    this.logger.debug('ViewModeManager resources cleaned up');
  }
}
