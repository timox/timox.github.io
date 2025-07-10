// === managers/FilterManager.js ===
// Gestionnaire pour les filtres, la recherche et les modes de vue

import { getFieldValue, setFieldValue, debounce } from '../utils/dom.js';

/**
 * Gestionnaire pour les filtres et la recherche du Kanban
 */
export class FilterManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    
    // État des filtres
    this.filters = {
      bureau: '',
      qui: '',
      projet: '',
      statut: '',
      search: ''
    };
    
    // Options d'affichage
    this.showTermine = true;
    this.viewMode = 'compact'; // compact, detailed, focus
    this.focusColumn = null;
    
    // Debounced search
    this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire de filtres
   */
  init() {
    this.setupFilterElements();
    this.setupEventListeners();
    this.setupViewModeControls();
    this.loadSavedFilters();
  }
  
  /**
   * Configure les éléments de filtre
   */
  setupFilterElements() {
    // Vérification de la présence des éléments
    this.elements = {
      searchInput: document.getElementById('search-input'),
      filterBureau: document.getElementById('filter-bureau'),
      filterQui: document.getElementById('filter-qui'),
      filterProjet: document.getElementById('filter-projet'),
      filterStatut: document.getElementById('filter-statut'),
      showTermine: document.getElementById('show-termine')
    };
    
    // Logging des éléments manquants
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        console.warn(`FilterManager: Élément ${key} non trouvé`);
      }
    });
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Recherche textuelle
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase().trim();
        this.debouncedSearch();
      });
      
      // Raccourci clavier pour focus
      document.addEventListener('keydown', (e) => {
        if ((e.key === 'f' || e.key === 'F') && !e.target.matches('input, textarea')) {
          e.preventDefault();
          this.elements.searchInput.focus();
        }
      });
    }
    
    // Filtres par sélection
    if (this.elements.filterBureau) {
      this.elements.filterBureau.addEventListener('change', (e) => {
        this.filters.bureau = e.target.value;
        this.applyFilters();
      });
    }
    
    if (this.elements.filterQui) {
      this.elements.filterQui.addEventListener('change', (e) => {
        this.filters.qui = e.target.value;
        this.applyFilters();
      });
    }
    
    if (this.elements.filterProjet) {
      this.elements.filterProjet.addEventListener('change', (e) => {
        this.filters.projet = e.target.value;
        this.applyFilters();
      });
    }
    
    if (this.elements.filterStatut) {
      this.elements.filterStatut.addEventListener('change', (e) => {
        this.filters.statut = e.target.value;
        this.applyFilters();
      });
    }
    
    // Affichage des tâches terminées
    if (this.elements.showTermine) {
      this.elements.showTermine.addEventListener('change', (e) => {
        this.showTermine = e.target.checked;
        this.applyFilters();
      });
    }
  }
  
  /**
   * Configure les contrôles de mode de vue
   */
  setupViewModeControls() {
    // Créer les boutons de mode de vue s'ils n'existent pas
    this.createViewModeButtons();
    
    // Raccourcis clavier pour les modes de vue
    document.addEventListener('keydown', (e) => {
      if (!e.target.matches('input, textarea')) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.setViewMode('compact');
            break;
          case '2':
            e.preventDefault();
            this.setViewMode('detailed');
            break;
          case '3':
            e.preventDefault();
            this.setViewMode('focus');
            break;
        }
      }
    });
  }
  
  /**
   * Crée les boutons de mode de vue
   */
  createViewModeButtons() {
    const controlsContainer = document.querySelector('.kanban-controls .row');
    if (!controlsContainer) return;
    
    // Vérifier si les boutons existent déjà
    if (document.getElementById('view-mode-controls')) return;
    
    const viewModeCol = document.createElement('div');
    viewModeCol.className = 'col-md-12 mb-2';
    viewModeCol.id = 'view-mode-controls';
    
    viewModeCol.innerHTML = `
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
      <small class="text-muted ms-3">
        <kbd>1</kbd> Compact • <kbd>2</kbd> Détaillé • <kbd>3</kbd> Focus
      </small>
    `;
    
    // Insérer au début du container
    controlsContainer.insertBefore(viewModeCol, controlsContainer.firstChild);
    
    // Ajouter les écouteurs
    viewModeCol.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.setViewMode(mode);
      });
    });
  }
  
  /**
   * Définit le mode de vue
   * @param {string} mode - Mode de vue (compact, detailed, focus)
   */
  setViewMode(mode) {
    if (!['compact', 'detailed', 'focus'].includes(mode)) {
      console.warn(`FilterManager: Mode de vue invalide: ${mode}`);
      return;
    }
    
    this.viewMode = mode;
    
    // Mettre à jour les boutons
    document.querySelectorAll('#view-mode-controls .btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      }
    });
    
    // Sauvegarder la préférence
    this.saveFilters();
    
    // Appliquer les changements
    this.applyFilters();
    
    console.log(`FilterManager: Mode de vue changé vers "${mode}"`);
  }
  
  /**
   * Effectue la recherche textuelle
   */
  performSearch() {
    this.applyFilters();
  }
  
  /**
   * Applique tous les filtres et actualise l'affichage
   */
  applyFilters() {
    if (!this.kanban || !this.kanban.currentRecords) {
      console.warn('FilterManager: Données Kanban non disponibles');
      return;
    }
    
    // Mettre à jour l'état du KanbanManager
    this.kanban.filters = { ...this.filters };
    this.kanban.showTermine = this.showTermine;
    this.kanban.viewMode = this.viewMode;
    this.kanban.focusColumn = this.focusColumn;
    
    // Rafraîchir l'affichage
    if (this.kanban.refreshKanban) {
      this.kanban.refreshKanban();
    }
    
    // Mettre à jour les statistiques de filtrage
    this.updateFilterStats();
    
    // Sauvegarder les filtres
    this.saveFilters();
  }
  
  /**
   * Filtre les enregistrements selon les critères actifs
   * @param {Array} records - Enregistrements à filtrer
   * @returns {Array} Enregistrements filtrés
   */
  filterRecords(records) {
    if (!Array.isArray(records)) return [];
    
    return records.filter(record => {
      // Filtre bureau
      if (this.filters.bureau && Array.isArray(record.bureau)) {
        const bureaux = record.bureau.slice(1); // Enlever le 'L' de Grist
        if (!bureaux.includes(this.filters.bureau)) return false;
      }
      
      // Filtre responsable
      if (this.filters.qui && Array.isArray(record.qui)) {
        const responsables = record.qui.slice(1); // Enlever le 'L' de Grist
        if (!responsables.includes(this.filters.qui)) return false;
      }
      
      // Filtre projet
      if (this.filters.projet && record.projet !== this.filters.projet) {
        return false;
      }
      
      // Filtre statut
      if (this.filters.statut && record.statut !== this.filters.statut) {
        return false;
      }
      
      // Filtre tâches terminées
      if (!this.showTermine && record.statut === 'Terminé') {
        return false;
      }
      
      // Recherche textuelle
      if (this.filters.search) {
        const searchableText = [
          record.titre || '',
          record.description || '',
          record.projet || '',
          record.strategie_objectif || '',
          record.strategie_sous_objectif || '',
          record.strategie_action || '',
          record.notes || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(this.filters.search)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Met à jour les statistiques de filtrage
   */
  updateFilterStats() {
    if (!this.kanban.currentRecords) return;
    
    const totalRecords = this.kanban.currentRecords.length;
    const filteredRecords = this.filterRecords(this.kanban.currentRecords);
    const filteredCount = filteredRecords.length;
    
    // Mettre à jour le compteur dans l'interface (si l'élément existe)
    const statsElement = document.getElementById('filter-stats');
    if (statsElement) {
      if (filteredCount === totalRecords) {
        statsElement.innerHTML = `<span class="text-muted">${totalRecords} tâche${totalRecords > 1 ? 's' : ''}</span>`;
      } else {
        statsElement.innerHTML = `<span class="text-info">${filteredCount} / ${totalRecords} tâche${totalRecords > 1 ? 's' : ''}</span>`;
      }
    }
    
    // Logging pour debug
    console.log(`FilterManager: ${filteredCount}/${totalRecords} tâches affichées`);
  }
  
  /**
   * Réinitialise tous les filtres
   */
  clearAllFilters() {
    // Réinitialiser les valeurs
    this.filters = {
      bureau: '',
      qui: '',
      projet: '',
      statut: '',
      search: ''
    };
    
    this.showTermine = true;
    
    // Mettre à jour les éléments d'interface
    if (this.elements.searchInput) this.elements.searchInput.value = '';
    if (this.elements.filterBureau) this.elements.filterBureau.value = '';
    if (this.elements.filterQui) this.elements.filterQui.value = '';
    if (this.elements.filterProjet) this.elements.filterProjet.value = '';
    if (this.elements.filterStatut) this.elements.filterStatut.value = '';
    if (this.elements.showTermine) this.elements.showTermine.checked = true;
    
    // Appliquer les changements
    this.applyFilters();
    
    console.log('FilterManager: Tous les filtres réinitialisés');
  }
  
  /**
   * Définit la colonne de focus (pour le mode focus)
   * @param {string} columnId - ID de la colonne
   */
  setFocusColumn(columnId) {
    this.focusColumn = columnId;
    
    if (this.viewMode === 'focus') {
      this.applyFilters();
    }
  }
  
  /**
   * Active/désactive un filtre rapide prédéfini
   * @param {string} type - Type de filtre (urgent, my-tasks, etc.)
   */
  applyQuickFilter(type) {
    // Réinitialiser d'abord
    this.clearAllFilters();
    
    const currentUser = this.kanban.currentUser;
    
    switch (type) {
      case 'urgent':
        // Tâches urgentes (échéance proche)
        this.filters.search = ''; // Sera géré par la logique de date
        break;
        
      case 'my-tasks':
        // Mes tâches (si utilisateur connu)
        if (currentUser && this.elements.filterQui) {
          this.filters.qui = currentUser;
          this.elements.filterQui.value = currentUser;
        }
        break;
        
      case 'in-progress':
        // Tâches en cours
        this.filters.statut = 'En cours';
        if (this.elements.filterStatut) {
          this.elements.filterStatut.value = 'En cours';
        }
        break;
        
      case 'blocked':
        // Tâches bloquées
        this.filters.statut = 'Bloqué';
        if (this.elements.filterStatut) {
          this.elements.filterStatut.value = 'Bloqué';
        }
        break;
        
      case 'no-deadline':
        // Tâches sans échéance
        // Cette logique sera gérée dans filterRecords
        break;
        
      default:
        console.warn(`FilterManager: Filtre rapide inconnu: ${type}`);
        return;
    }
    
    this.applyFilters();
    console.log(`FilterManager: Filtre rapide "${type}" appliqué`);
  }
  
  /**
   * Crée des boutons de filtre rapide
   */
  createQuickFilterButtons() {
    const controlsContainer = document.querySelector('.kanban-controls');
    if (!controlsContainer) return;
    
    // Vérifier si les boutons existent déjà
    if (document.getElementById('quick-filters')) return;
    
    const quickFiltersDiv = document.createElement('div');
    quickFiltersDiv.className = 'row mt-2';
    quickFiltersDiv.id = 'quick-filters';
    
    quickFiltersDiv.innerHTML = `
      <div class="col-12">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <span class="text-muted small">Filtres rapides:</span>
          <button class="btn btn-sm btn-outline-danger" data-filter="urgent">
            <i class="bi bi-exclamation-triangle"></i> Urgent
          </button>
          <button class="btn btn-sm btn-outline-primary" data-filter="my-tasks">
            <i class="bi bi-person"></i> Mes tâches
          </button>
          <button class="btn btn-sm btn-outline-warning" data-filter="in-progress">
            <i class="bi bi-play"></i> En cours
          </button>
          <button class="btn btn-sm btn-outline-dark" data-filter="blocked">
            <i class="bi bi-x-octagon"></i> Bloquées
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="window.kanbanManager.filterManager.clearAllFilters()">
            <i class="bi bi-arrow-clockwise"></i> Tout
          </button>
        </div>
      </div>
    `;
    
    controlsContainer.appendChild(quickFiltersDiv);
    
    // Ajouter les écouteurs
    quickFiltersDiv.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterType = e.currentTarget.dataset.filter;
        this.applyQuickFilter(filterType);
      });
    });
  }
  
  /**
   * Sauvegarde les filtres dans le localStorage
   */
  saveFilters() {
    try {
      const filterState = {
        filters: this.filters,
        showTermine: this.showTermine,
        viewMode: this.viewMode,
        focusColumn: this.focusColumn,
        timestamp: Date.now()
      };
      
      localStorage.setItem('kanban-filters', JSON.stringify(filterState));
    } catch (error) {
      console.warn('FilterManager: Impossible de sauvegarder les filtres:', error);
    }
  }
  
  /**
   * Charge les filtres depuis le localStorage
   */
  loadSavedFilters() {
    try {
      const saved = localStorage.getItem('kanban-filters');
      if (!saved) return;
      
      const filterState = JSON.parse(saved);
      
      // Vérifier que les données ne sont pas trop anciennes (24h)
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      if (Date.now() - filterState.timestamp > maxAge) {
        localStorage.removeItem('kanban-filters');
        return;
      }
      
      // Restaurer les filtres
      if (filterState.filters) {
        this.filters = { ...this.filters, ...filterState.filters };
      }
      
      if (typeof filterState.showTermine === 'boolean') {
        this.showTermine = filterState.showTermine;
      }
      
      if (filterState.viewMode) {
        this.viewMode = filterState.viewMode;
      }
      
      if (filterState.focusColumn) {
        this.focusColumn = filterState.focusColumn;
      }
      
      // Mettre à jour l'interface
      this.updateInterfaceFromState();
      
      console.log('FilterManager: Filtres restaurés depuis localStorage');
      
    } catch (error) {
      console.warn('FilterManager: Erreur lors du chargement des filtres:', error);
      localStorage.removeItem('kanban-filters');
    }
  }
  
  /**
   * Met à jour l'interface selon l'état courant
   */
  updateInterfaceFromState() {
    // Champs de recherche et filtres
    if (this.elements.searchInput && this.filters.search) {
      this.elements.searchInput.value = this.filters.search;
    }
    
    if (this.elements.filterBureau && this.filters.bureau) {
      this.elements.filterBureau.value = this.filters.bureau;
    }
    
    if (this.elements.filterQui && this.filters.qui) {
      this.elements.filterQui.value = this.filters.qui;
    }
    
    if (this.elements.filterProjet && this.filters.projet) {
      this.elements.filterProjet.value = this.filters.projet;
    }
    
    if (this.elements.filterStatut && this.filters.statut) {
      this.elements.filterStatut.value = this.filters.statut;
    }
    
    if (this.elements.showTermine) {
      this.elements.showTermine.checked = this.showTermine;
    }
    
    // Boutons de mode de vue
    document.querySelectorAll('#view-mode-controls .btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === this.viewMode) {
        btn.classList.add('active');
      }
    });
  }
  
  /**
   * Exporte l'état actuel des filtres
   * @returns {object} État des filtres
   */
  exportState() {
    return {
      filters: { ...this.filters },
      showTermine: this.showTermine,
      viewMode: this.viewMode,
      focusColumn: this.focusColumn,
      totalRecords: this.kanban.currentRecords?.length || 0,
      filteredRecords: this.filterRecords(this.kanban.currentRecords || []).length
    };
  }
  
  /**
   * Importe un état de filtres
   * @param {object} state - État à importer
   */
  importState(state) {
    if (!state || typeof state !== 'object') return;
    
    if (state.filters) {
      this.filters = { ...this.filters, ...state.filters };
    }
    
    if (typeof state.showTermine === 'boolean') {
      this.showTermine = state.showTermine;
    }
    
    if (state.viewMode) {
      this.viewMode = state.viewMode;
    }
    
    if (state.focusColumn) {
      this.focusColumn = state.focusColumn;
    }
    
    this.updateInterfaceFromState();
    this.applyFilters();
    
    console.log('FilterManager: État importé avec succès');
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    // Sauvegarder une dernière fois
    this.saveFilters();
    
    // Supprimer les écouteurs d'événements en remplaçant les éléments
    Object.values(this.elements).forEach(element => {
      if (element && element.parentNode) {
        element.replaceWith(element.cloneNode(true));
      }
    });
    
    console.log('FilterManager: Ressources nettoyées');
  }
}