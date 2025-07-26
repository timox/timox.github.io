// === managers/FilterManager.js ===
// Gestionnaire pour les filtres, la recherche et les modes de vue (VERSION CORRIGÉE)

import { getFieldValue, setFieldValue, debounce } from '../utils/dom.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour les filtres et la recherche du Kanban
 */
export class FilterManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.logger = createModuleLogger('FilterManager');
    
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
    
    // Debounced search
    this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
    
    // Indicateur d'initialisation
    this.isInitialized = false;
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire de filtres
   */
  init() {
    this.logger.debug('FilterManager initializing');
    
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupAfterDOMReady();
      });
    } else {
      this.setupAfterDOMReady();
    }
  }
  
  /**
   * Configuration après que le DOM soit prêt
   */
  setupAfterDOMReady() {
    this.setupFilterElements();
    this.setupEventListeners();
    this.loadSavedFilters();
    this.populateFilterOptions();
    this.isInitialized = true;
    
    this.logger.debug('FilterManager initialized');
  }
  
  /**
   * Configure les éléments de filtre
   */
  setupFilterElements() {
    // Vérification de la présence des éléments avec jQuery
    this.elements = {
      searchInput: $('#search-input')[0],
      filterBureau: $('#filter-bureau')[0],
      filterQui: $('#filter-qui')[0],
      filterProjet: $('#filter-projet')[0],
      filterStatut: $('#filter-statut')[0],
      showTermine: $('#show-termine')[0],
      clearFiltersBtn: $('#btn-clear-filters')[0]
    };
    
    // Logging des éléments trouvés/manquants
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        this.logger.warn(`Filter element ${key} not found`);
      } else {
        this.logger.debug(`Filter element ${key} found`);
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
      // Raccourci F - DÉSACTIVÉ (géré centralement dans kanban-app.js)
      // document.addEventListener('keydown', (e) => {
      //   if ((e.key === 'f' || e.key === 'F') && !e.target.matches('input, textarea, select')) {
      //     e.preventDefault();
      //     this.elements.searchInput.focus();
      //   }
      // });
    }
    
    // Filtres par sélection
    if (this.elements.filterBureau) {
      this.elements.filterBureau.addEventListener('change', (e) => {
        this.filters.bureau = e.target.value || '';
        this.logger.debug(`Bureau filter changed: ${this.filters.bureau}`);
        this.applyFilters();
      });
    }
    
    if (this.elements.filterQui) {
      this.elements.filterQui.addEventListener('change', (e) => {
        this.filters.qui = e.target.value || '';
        this.logger.debug(`Qui filter changed: ${this.filters.qui}`);
        this.applyFilters();
      });
    }
    
    if (this.elements.filterProjet) {
      this.elements.filterProjet.addEventListener('change', (e) => {
        this.filters.projet = e.target.value || '';
        this.logger.debug(`Projet filter changed: ${this.filters.projet}`);
        this.applyFilters();
      });
    }
    
    if (this.elements.filterStatut) {
      this.elements.filterStatut.addEventListener('change', (e) => {
        this.filters.statut = e.target.value || '';
        this.logger.debug(`Statut filter changed: ${this.filters.statut}`);
        
        // CORRIGÉ: Synchroniser avec ViewModeManager en mode focus
        if (this.kanban.viewMode === 'focus' && this.kanban.viewModeManager) {
          this.kanban.viewModeManager.focusColumn = this.filters.statut;
        }
        
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
    
    // Bouton pour effacer tous les filtres
    if (this.elements.clearFiltersBtn) {
      this.elements.clearFiltersBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearAllFilters();
        this.applyFilters();
      });
    }
    
    this.logger.debug('Filter event listeners configured');
  }
  
  /**
   * Peuple les options des filtres
   */
  populateFilterOptions() {
    if (!this.kanban.gristOptions) {
      this.logger.warn('No gristOptions available for filter population');
      return;
    }
    
    const { bureau, responsables, projet, statut } = this.kanban.gristOptions;
    
    // Peupler bureau
    if (this.elements.filterBureau && bureau) {
      this.populateSelect(this.elements.filterBureau, bureau, 'Tous les bureaux');
    }
    
    // Peupler responsables
    if (this.elements.filterQui && responsables) {
      this.populateSelect(this.elements.filterQui, responsables, 'Tous les responsables');
    }
    
    // Peupler projets
    if (this.elements.filterProjet && projet) {
      this.populateSelect(this.elements.filterProjet, projet, 'Tous les projets');
    }
    
    // Peupler statuts
    if (this.elements.filterStatut && statut) {
      this.populateSelect(this.elements.filterStatut, statut, 'Tous les statuts');
    }
    
    this.logger.debug('Filter options populated');
  }
  
  /**
   * Peuple un select avec des options
   * @param {HTMLSelectElement} selectElement - Élément select
   * @param {Array} options - Options à ajouter
   * @param {string} allText - Texte pour "tous"
   */
  populateSelect(selectElement, options, allText) {
    selectElement.innerHTML = '';
    
    // Option "Tous" - désactiver en mode focus pour le filtre statut
    const isStatusSelect = selectElement.id === 'filter-statut';
    const isFocusMode = this.kanban.viewModeManager && this.kanban.viewModeManager.currentMode === 'focus';
    
    if (!isStatusSelect || !isFocusMode) {
      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = allText;
      selectElement.appendChild(allOption);
    }
    
    // Ajouter les options
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      selectElement.appendChild(optionElement);
    });
  }
  
  /**
   * Effectue la recherche textuelle
   */
  performSearch() {
    this.logger.debug(`Search performed: ${this.filters.search}`);
    this.applyFilters();
  }
  
  /**
   * Applique tous les filtres et actualise l'affichage
   */
  applyFilters() {
    if (!this.kanban || !this.kanban.currentRecords) {
      this.logger.warn('Kanban data not available for filtering');
      return;
    }
    
    this.logger.debug('Applying filters');
    
    // Mettre à jour l'état du KanbanManager
    this.kanban.filters = { ...this.filters };
    this.kanban.showTermine = this.showTermine;
    
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
      // Filtre bureau - Vérifier explicitement que la valeur n'est pas vide
      if (this.filters.bureau && this.filters.bureau.trim() !== '' && Array.isArray(record.bureau)) {
        const bureaux = record.bureau.slice(1); // Enlever le 'L' de Grist
        if (!bureaux.includes(this.filters.bureau)) return false;
      }
      
      // Filtre responsable - Vérifier explicitement que la valeur n'est pas vide
      if (this.filters.qui && this.filters.qui.trim() !== '' && Array.isArray(record.qui)) {
        const responsables = record.qui.slice(1); // Enlever le 'L' de Grist
        if (!responsables.includes(this.filters.qui)) return false;
      }
      
      // Filtre projet - Vérifier explicitement que la valeur n'est pas vide
      if (this.filters.projet && this.filters.projet.trim() !== '' && record.projet !== this.filters.projet) {
        return false;
      }
      
      // Filtre statut - Vérifier explicitement que la valeur n'est pas vide
      if (this.filters.statut && this.filters.statut.trim() !== '' && record.statut !== this.filters.statut) {
        return false;
      }
      
      // Filtre tâches terminées
      if (!this.showTermine && record.statut === 'Terminé') {
        return false;
      }
      
      // Recherche textuelle - Vérifier explicitement que la valeur n'est pas vide
      if (this.filters.search && this.filters.search.trim() !== '') {
        const searchableText = [
          record.titre || '',
          record.description || '',
          record.projet || '',
          record.strategie_objectif || '',
          record.strategie_sous_objectif || '',
          record.strategie_action || '',
          record.notes || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(this.filters.search.trim())) {
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
    let $statsElement = $('#filter-stats');
    if (!$statsElement.length) {
      // Créer l'élément s'il n'existe pas
      $statsElement = $('<small id="filter-stats" class="text-muted ms-3"></small>');
      
      const $controlsRow = $('.kanban-controls .row');
      if ($controlsRow.length) {
        $controlsRow.append($statsElement);
      }
    }
    
    if ($statsElement.length) {
      if (filteredCount === totalRecords) {
        $statsElement.html(`<span class="text-muted">${totalRecords} tâche${totalRecords > 1 ? 's' : ''}</span>`);
      } else {
        $statsElement.html(`<span class="text-info">${filteredCount} / ${totalRecords} tâche${totalRecords > 1 ? 's' : ''}</span>`);
      }
    }
    
    this.logger.info(`Filtered results: ${filteredCount}/${totalRecords} tasks displayed`);
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
    
    this.logger.debug('All filters reset');
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
        // Tâches urgentes (logique à implémenter côté rendu)
        this.filters.search = '';
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
        
      default:
        this.logger.warn(`Unknown quick filter type: ${type}`);
        return;
    }
    
    this.applyFilters();
    this.logger.debug(`Quick filter "${type}" applied`);
  }
  
  /**
   * Sauvegarde les filtres dans le localStorage
   */
  saveFilters() {
    try {
      const filterState = {
        filters: this.filters,
        showTermine: this.showTermine,
        timestamp: Date.now()
      };
      
      localStorage.setItem('kanban-filters', JSON.stringify(filterState));
    } catch (error) {
      this.logger.warn('Cannot save filters:', error.message);
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
      
      // Mettre à jour l'interface
      this.updateInterfaceFromState();
      
      this.logger.debug('Filters restored from localStorage');
      
    } catch (error) {
      this.logger.warn('Error loading filters:', error.message);
      localStorage.removeItem('kanban-filters');
    }
  }
  
  /**
   * Met à jour l'interface selon l'état courant
   */
  updateInterfaceFromState() {
    // Champs de recherche et filtres
    if (this.elements.searchInput) {
      this.elements.searchInput.value = this.filters.search || '';
    }
    
    if (this.elements.filterBureau) {
      this.elements.filterBureau.value = this.filters.bureau || '';
    }
    
    if (this.elements.filterQui) {
      this.elements.filterQui.value = this.filters.qui || '';
    }
    
    if (this.elements.filterProjet) {
      this.elements.filterProjet.value = this.filters.projet || '';
    }
    
    if (this.elements.filterStatut) {
      this.elements.filterStatut.value = this.filters.statut || '';
    }
    
    if (this.elements.showTermine) {
      this.elements.showTermine.checked = this.showTermine;
    }
  }
  
  /**
   * Met à jour les options des filtres quand les données changent
   */
  updateFilterOptions() {
    if (this.isInitialized) {
      this.populateFilterOptions();
    }
  }

  /**
   * Met à jour les options lors d'un changement de mode de vue
   */
  updateForViewMode() {
    if (this.isInitialized) {
      this.populateFilterOptions();
      
      // En mode focus, s'assurer qu'un statut est sélectionné
      const isFocusMode = this.kanban.viewModeManager && this.kanban.viewModeManager.currentMode === 'focus';
      if (isFocusMode && !this.filters.statut) {
        // Choisir le premier statut disponible ou celui du focus
        const focusColumn = this.kanban.viewModeManager.focusColumn || 'À faire';
        this.setFilter('statut', focusColumn);
      }
    }
  }
  
  /**
   * Obtient l'état actuel des filtres
   * @returns {object} État des filtres
   */
  getFilters() {
    return {
      ...this.filters,
      showTermine: this.showTermine
    };
  }
  
  /**
   * Définit les filtres
   * @param {object} newFilters - Nouveaux filtres
   */
  setFilters(newFilters) {
    if (newFilters.filters) {
      this.filters = { ...this.filters, ...newFilters.filters };
    }
    
    if (typeof newFilters.showTermine === 'boolean') {
      this.showTermine = newFilters.showTermine;
    }
    
    this.updateInterfaceFromState();
    this.applyFilters();
  }
  
  /**
   * Met à jour un filtre spécifique
   * @param {string} filterName - Nom du filtre
   * @param {string} value - Valeur du filtre
   */
  setFilter(filterName, value) {
    this.filters[filterName] = value;
    this.updateInterfaceFromState();
    this.applyFilters();
  }
  
  /**
   * Exporte l'état des filtres
   * @returns {object} État des filtres
   */
  exportState() {
    return {
      filters: { ...this.filters },
      showTermine: this.showTermine,
      totalRecords: this.kanban.currentRecords?.length || 0,
      filteredRecords: this.filterRecords(this.kanban.currentRecords || []).length
    };
  }
  
  /**
   * Vérifie si des filtres sont actifs
   * @returns {boolean} True si des filtres sont actifs
   */
  hasActiveFilters() {
    return (
      this.filters.bureau !== '' ||
      this.filters.qui !== '' ||
      this.filters.projet !== '' ||
      this.filters.statut !== '' ||
      this.filters.search !== '' ||
      !this.showTermine
    );
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    // Sauvegarder une dernière fois
    this.saveFilters();
    
    this.logger.debug('FilterManager resources cleaned up');
  }
}
