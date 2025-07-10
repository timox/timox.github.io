// === managers/FilterManager.js ===
// Gestionnaire pour les filtres, la recherche et les modes de vue (VERSION CORRIGÉE)

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
    console.log('FilterManager: Initialisation...');
    
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
    
    console.log('FilterManager: Gestionnaire de filtres initialisé');
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
    
    // Logging des éléments trouvés/manquants
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        console.warn(`FilterManager: Élément ${key} non trouvé`);
      } else {
        console.log(`FilterManager: Élément ${key} trouvé`);
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
        if ((e.key === 'f' || e.key === 'F') && !e.target.matches('input, textarea, select')) {
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
    
    console.log('FilterManager: Event listeners configurés');
  }
  
  /**
   * Peuple les options des filtres
   */
  populateFilterOptions() {
    if (!this.kanban.gristOptions) {
      console.warn('FilterManager: Pas de gristOptions disponibles');
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
    
    console.log('FilterManager: Options des filtres peuplées');
  }
  
  /**
   * Peuple un select avec des options
   * @param {HTMLSelectElement} selectElement - Élément select
   * @param {Array} options - Options à ajouter
   * @param {string} allText - Texte pour "tous"
   */
  populateSelect(selectElement, options, allText) {
    selectElement.innerHTML = '';
    
    // Option "Tous"
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = allText;
    selectElement.appendChild(allOption);
    
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
    console.log('FilterManager: Recherche effectuée:', this.filters.search);
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
    
    console.log('FilterManager: Application des filtres:', this.filters);
    
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
    let statsElement = document.getElementById('filter-stats');
    if (!statsElement) {
      // Créer l'élément s'il n'existe pas
      statsElement = document.createElement('small');
      statsElement.id = 'filter-stats';
      statsElement.className = 'text-muted ms-3';
      
      const controlsRow = document.querySelector('.kanban-controls .row');
      if (controlsRow) {
        controlsRow.appendChild(statsElement);
      }
    }
    
    if (statsElement) {
      if (filteredCount === totalRecords) {
        statsElement.innerHTML = `<span class="text-muted">${totalRecords} tâche${totalRecords > 1 ? 's' : ''}</span>`;
      } else {
        statsElement.innerHTML = `<span class="text-info">${filteredCount} / ${totalRecords} tâche${totalRecords > 1 ? 's' : ''}</span>`;
      }
    }
    
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
        console.warn(`FilterManager: Filtre rapide inconnu: ${type}`);
        return;
    }
    
    this.applyFilters();
    console.log(`FilterManager: Filtre rapide "${type}" appliqué`);
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
    
    console.log('FilterManager: Ressources nettoyées');
  }
}
