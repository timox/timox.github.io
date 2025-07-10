// === managers/ViewModeManager.js ===
// Gestionnaire pour les modes de vue du Kanban (Compact, Détaillé, Focus)

import { VIEW_MODES } from '../config/constants.js';

/**
 * Gestionnaire pour les modes de vue du Kanban
 */
export class ViewModeManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentMode = VIEW_MODES.COMPACT;
    this.focusColumn = null;
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire de modes de vue
   */
  init() {
    this.createViewModeControls();
    this.setupEventListeners();
    this.loadSavedViewMode();
    console.log('ViewModeManager: Gestionnaire de modes de vue initialisé');
  }
  
  /**
   * Crée les contrôles de mode de vue
   */
  createViewModeControls() {
    const controlsContainer = document.querySelector('.kanban-controls .row');
    if (!controlsContainer) return;
    
    // Vérifier si les contrôles existent déjà
    if (document.getElementById('view-mode-controls')) return;
    
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
    if (!container) return;
    
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
    }
    
    // Rafraîchir le kanban avec le nouveau mode
    if (this.kanban.refreshKanban) {
      this.kanban.viewMode = mode;
      this.kanban.refreshKanban();
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
    
    // Ajuster la disposition en grille
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
    container.style.gap = '0.75rem';
    container.style.height = 'calc(100vh - 200px)';
  }
  
  /**
   * Applique le mode détaillé
   */
  applyDetailedMode() {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-detailed');
    
    // Masquer la navigation focus si elle existe
    this.hideFocusNavigation();
    
    // Ajuster la disposition en grille
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
    container.style.gap = '1rem';
    container.style.height = 'auto';
  }
  
  /**
   * Applique le mode focus
   * @param {string} previousMode - Mode précédent
   */
  applyFocusMode(previousMode) {
    const container = this.kanban.kanbanContainer;
    container.classList.add('kanban-focus');
    
    // Créer la navigation focus
    this.createFocusNavigation();
    
    // Si pas de colonne focus définie, choisir la première
    if (!this.focusColumn) {
      this.focusColumn = 'Backlog';
    }
    
    // Ajuster la disposition
    container.style.gridTemplateColumns = '1fr';
    container.style.gap = '1rem';
    container.style.height = 'calc(100vh - 250px)';
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
    
    const navButtons = statuts.map(statut => {
      const count = this.getTaskCountForStatus(statut);
      const isActive = this.focusColumn === statut;
      const activeClass = isActive ? 'active' : '';
      
      return `
        <div class="col-auto">
          <button class="btn btn-outline-secondary btn-sm focus-nav-btn ${activeClass}" 
                  data-column="${statut}"
                  title="Voir les tâches ${statut}">
            ${statut} 
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
    
    // Rafraîchir en mode focus
    if (this.currentMode === VIEW_MODES.FOCUS && this.kanban.refreshKanban) {
      this.kanban.focusColumn = columnId;
      this.kanban.refreshKanban();
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
