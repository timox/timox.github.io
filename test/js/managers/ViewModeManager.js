// === managers/ViewModeManager.js ===
// Gestionnaire pour les modes de vue du Kanban (Compact, Détaillé, Focus)

import { VIEW_MODES, STATUTS } from '../config/constants.js';
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
    this.logger.info('Gestionnaire de modes de vue initialisé');
  }
  
  /**
   * Crée les contrôles de mode de vue
   */
  createViewModeControls() {
    const controlsContainer = document.querySelector('.kanban-controls .row');
    if (!controlsContainer) {
      this.logger.error('Conteneur des contrôles kanban introuvable');
      return;
    }
    
    // Vérifier si les contrôles existent déjà
    if (document.getElementById('view-mode-controls')) {
      this.logger.debug('Contrôles de vue déjà créés');
      return;
    }
    
    const viewModeCol = document.createElement('div');
    viewModeCol.className = 'col-md-12 mb-2';
    viewModeCol.id = 'view-mode-controls';
    
    viewModeCol.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <span class="text-muted small">Modes de vue:</span>
        <div class="btn-group" role="group" aria-label="Modes de vue">
          <button type="button" class="btn btn-outline-secondary active" data-mode="compact">
            <i class="bi bi-grid-3x2"></i> Compact
          </button>
          <button type="button" class="btn btn-outline-secondary" data-mode="detailed">
            <i class="bi bi-card-list"></i> Détaillé
          </button>
          <button type="button" class="btn btn-outline-secondary" data-mode="focus">
            <i class="bi bi-zoom-in"></i> Focus
          </button>
        </div>
        <small class="text-muted">
          <kbd>1</kbd> Compact • <kbd>2</kbd> Détaillé • <kbd>3</kbd> Focus
        </small>
      </div>
    `;
    
    // Insérer au début du container
    controlsContainer.insertBefore(viewModeCol, controlsContainer.firstChild);
    this.logger.info('Contrôles de vue créés et insérés dans le DOM');
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
    
    // Navigation focus (pour le mode focus)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.focus-nav-btn')) {
        const button = e.target.closest('.focus-nav-btn');
        const columnId = button.dataset.column;
        this.setFocusColumn(columnId);
      }
    });
  }
  
  /**
   * Définit le mode de vue
   * @param {string} mode - Mode de vue
   */
  setViewMode(mode) {
    if (!Object.values(VIEW_MODES).includes(mode)) {
      console.warn('ViewModeManager: Mode de vue invalide:', mode);
      return;
    }
    
    const previousMode = this.currentMode;
    this.currentMode = mode;
    
    // Mettre à jour les boutons
    this.updateViewModeButtons();
    
    // Appliquer le mode
    this.applyViewMode(mode, previousMode);
    
    // Sauvegarder la préférence
    this.saveViewMode();
    
    console.log(`ViewModeManager: Mode de vue changé vers "${mode}"`);
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
    
    // Masquer les colonnes vides
    setTimeout(() => {
      this.hideEmptyColumns();
    }, 100);
    
    this.logger.info('Mode détaillé appliqué - colonnes vides masquées');
  }
  
  /**
   * Applique le mode focus
   * @param {string} previousMode - Mode précédent
   */
  applyFocusMode(previousMode) {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-focus');
    
    this.logger.debug('Application du mode focus...');
    
    // Créer la navigation focus
    this.createFocusNavigation();
    
    // Si pas de colonne focus définie, choisir la première colonne avec des tâches
    if (!this.focusColumn) {
      this.focusColumn = this.findFirstColumnWithTasks() || 'À faire';
      this.logger.debug(`Colonne focus automatique: ${this.focusColumn}`);
    }
    
    // Pas de refresh ici - sera fait par applyViewMode()
    this.logger.debug(`Focus mode configuré pour colonne: ${this.focusColumn}`);
    
    // Ajuster la disposition - une seule colonne centrée
    container.style.gridTemplateColumns = '1fr';
    container.style.gap = '1rem';
    container.style.height = 'calc(100vh - 250px)';
    container.style.justifyContent = 'center';
    
    this.logger.info(`Mode focus appliqué - colonne "${this.focusColumn}" seule visible`);
  }
  
  /**
   * Crée la navigation pour le mode focus
   */
  createFocusNavigation() {
    // Vérifier si la navigation existe déjà
    if (document.getElementById('focus-navigation')) return;
    
    const controlsContainer = document.querySelector('.kanban-controls');
    if (!controlsContainer) return;
    
    // Obtenir les statuts depuis les constantes
    const statuts = this.kanban.gristOptions?.statut || [
      'Backlog', 'À faire', 'En cours', 'En attente', 'Bloqué', 'Validation', 'Terminé'
    ];
    
    const navigationDiv = document.createElement('div');
    navigationDiv.id = 'focus-navigation';
    navigationDiv.className = 'row mt-2';
    
    const navButtons = statuts.map(statutId => {
      const statutObj = STATUTS.find(s => s.id === statutId);
      const count = this.getTaskCountForStatus(statutId);
      const isActive = this.focusColumn === statutId;
      const activeClass = isActive ? 'active' : '';
      const icone = statutObj ? statutObj.icone : '';
      
      return `
        <div class="col-auto">
          <button class="btn btn-outline-secondary btn-sm focus-nav-btn ${activeClass}" 
                  data-column="${statutId}"
                  title="Voir les tâches ${statutId}">
            ${icone} ${statutId} 
            <span class="badge bg-secondary">${count}</span>
          </button>
        </div>
      `;
    }).join('');
    
    navigationDiv.innerHTML = `
      <div class="col-12">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-muted small">Focus sur:</span>
          ${navButtons}
        </div>
      </div>
    `;
    
    controlsContainer.appendChild(navigationDiv);
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
    
    // Mettre à jour les boutons de navigation
    document.querySelectorAll('.focus-nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.column === columnId) {
        btn.classList.add('active');
      }
    });
    
    // Si on est en mode focus, changer immédiatement la colonne affichée
    if (this.currentMode === VIEW_MODES.FOCUS) {
      this.showOnlyFocusColumn(columnId);
      this.logger.info(`Colonne focus changée vers: ${columnId}`);
    }
    
    // Mettre à jour aussi dans kanban pour compatibilité
    this.kanban.focusColumn = columnId;
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
      if (this.kanban.refreshKanban) {
        this.kanban.refreshKanban();
        
        // Appliquer le mode focus APRÈS le refresh si nécessaire
        if (this.currentMode === VIEW_MODES.FOCUS && this.focusColumn) {
          setTimeout(() => {
            this.showOnlyFocusColumn(this.focusColumn);
          }, 100);
        }
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
      console.warn('ViewModeManager: Impossible de sauvegarder le mode de vue');
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
      console.warn('ViewModeManager: Erreur lors du chargement du mode de vue sauvegardé');
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
   * Nettoie les ressources
   */
  destroy() {
    this.hideFocusNavigation();
    
    const viewModeControls = document.getElementById('view-mode-controls');
    if (viewModeControls) {
      viewModeControls.remove();
    }
    
    console.log('ViewModeManager: Ressources nettoyées');
  }
}
