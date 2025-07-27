// === managers/ModalManager.js ===
// Gestionnaire pour les modales de tâches et d'historique

import { 
  setFieldValue, 
  getFieldValue, 
  setSelectedOptions, 
  getSelectedOptionsAsGristFormat,
  populateSelect,
  toggleVisibility,
  validateForm,
  resetForm,
  displayError,
  displaySuccess,
  confirmAction
} from '../utils/dom.js';

import { TABLE_ID } from '../config/constants.js';
import { getUserActionManager } from '../utils/UserActionManager.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour les modales et formulaires
 */
export class ModalManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.logger = createModuleLogger('ModalManager');
    this.taskModal = null;
    this.historyModal = null;
    this.currentTaskId = null;
    this.currentTask = null;
    this.isNewTask = false;
    
    // Approche stateless - pas de cache, reset complet à chaque tâche
    this.selectedStrategies = [];
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire de modales
   */
  init() {
    this.initializeModals();
    this.setupEventListeners();
    this.setupStrategySelects();
    this.logger.debug('ModalManager initialized');
  }
  
  /**
   * Initialise les instances de modales Bootstrap
   */
  initializeModals() {
    const taskModalElement = document.getElementById('popup-tache');
    if (taskModalElement) {
      this.taskModal = new bootstrap.Modal(taskModalElement, {
        backdrop: 'static',
        keyboard: true,
        focus: true
      });
    }
    
    const historyModalElement = document.getElementById('history-modal');
    if (historyModalElement) {
      this.historyModal = new bootstrap.Modal(historyModalElement, {
        backdrop: false,
        keyboard: true
      });
    }
  }
  
  /**
   * Configure les écouteurs d'événements pour les modales
   */
  setupEventListeners() {
    // Bouton nouvelle tâche
    const btnNouvelleTache = document.getElementById('btn-nouvelle-tache');
    if (btnNouvelleTache) {
      btnNouvelleTache.addEventListener('click', () => {
        this.openTaskModal();
      });
    }
    
    // Event listeners pour les boutons de la modal avec délégation
    $(document).off('click.modal-events', '#btn-save-task, #btn-delete-task')
      .on('click.modal-events', '#btn-save-task', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.logger.debug('Save button clicked');
        this.saveTask();
      })
      .on('click.modal-events', '#btn-delete-task', (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        this.logger.debug('Delete button clicked');
        this.deleteTask();
      });
    
    // Bouton ajouter projet
    const btnAjoutProjet = document.getElementById('btn-ajout-projet');
    if (btnAjoutProjet) {
      btnAjoutProjet.addEventListener('click', () => {
        this.addNewProject();
      });
    }
    
    // Bouton toggle accordéon historique des commentaires (délégation d'événements)
    document.addEventListener('click', (e) => {
      if (e.target.matches('#btn-toggle-comment-history, #btn-toggle-comment-history *')) {
        this.logger.debug('History toggle button clicked');
        // Laisser Bootstrap gérer l'accordéon, mais charger les données
        setTimeout(() => {
          this.loadCommentHistoryInAccordion();
        }, 100); // Petit délai pour laisser Bootstrap ouvrir l'accordéon
      }
    });
    
    // Écouteur pour quand l'accordéon s'ouvre (événement Bootstrap)
    document.addEventListener('shown.bs.collapse', (e) => {
      if (e.target.id === 'comment-history-accordion') {
        this.logger.debug('History accordion opened');
        this.loadCommentHistoryInAccordion();
      }
    });
    
    // Raccourcis clavier - DÉSACTIVÉS (gérés centralement dans kanban-app.js)
    // document.addEventListener('keydown', (e) => {
    //   if ((e.key === 'n' || e.key === 'N') && !e.target.matches('input, textarea')) {
    //     e.preventDefault();
    //     this.openTaskModal();
    //   }
    // });
    
    // Auto-resize des textareas
    const descriptionTextarea = document.getElementById('popup-description');
    if (descriptionTextarea) {
      descriptionTextarea.addEventListener('input', this.autoResizeTextarea);
    }
  }
  
  /**
   * Configure les listes déroulantes de stratégie
   */
  setupStrategySelects() {
    // Initialiser l'interface accordéon des stratégies
    this.setupStrategyAccordion();
  }
  
  /**
   * Configure l'interface accordéon des stratégies
   */
  setupStrategyAccordion() {
    const strategyBrowser = document.getElementById('strategy-browser');
    
    if (!strategyBrowser) {
      this.logger.warn('Strategy browser element not found');
      return;
    }
    
    // Initialiser la collection des stratégies sélectionnées
    this.selectedStrategies = [];
    
    // Vérifier si on a des données stratégiques disponibles
    this.logger.debug(`Strategy data check: ${this.kanban.strategiesData?.length || 0} strategies available`);
    
    if (this.kanban.strategiesData && this.kanban.strategiesData.length > 0) {
      this.logger.debug('Rendering strategy accordion from integrated data');
      this.renderStrategyAccordion(strategyBrowser);
    } else {
      this.logger.warn('Rendering strategy accordion with fallback data');
      this.renderFallbackStrategyAccordion(strategyBrowser);
    }
    
    // Configurer les événements pour la gestion multiple
    this.setupMultiStrategyEvents();
  }
  
  /**
   * Génère l'interface accordéon depuis les données Grist
   */
  renderStrategyAccordion(container) {
    const mappings = this.buildStrategyMappingsFromGrist();
    container.innerHTML = '';
    
    mappings.objectifs.forEach(objectif => {
      const objectiveDiv = this.createObjectiveAccordion(objectif, mappings);
      container.appendChild(objectiveDiv);
    });
  }
  
  /**
   * Crée un accordéon pour un objectif
   */
  createObjectiveAccordion(objectif, mappings) {
    const objectiveDiv = document.createElement('div');
    objectiveDiv.className = 'strategy-objective';
    
    // Header cliquable
    const header = document.createElement('div');
    header.className = 'strategy-objective-header';
    header.innerHTML = `
      <h6 class="strategy-objective-title">${objectif}</h6>
      <i class="bi bi-chevron-right strategy-toggle-icon"></i>
    `;
    
    // Contenu des sous-objectifs
    const content = document.createElement('div');
    content.className = 'strategy-sub-objectives';
    content.style.display = 'none';
    
    // Générer les sous-objectifs
    const sousObjectifs = mappings.sousObjectifs[objectif] || [];
    sousObjectifs.forEach(sousObjectif => {
      const subObjectiveDiv = this.createSubObjectiveSection(objectif, sousObjectif, mappings);
      content.appendChild(subObjectiveDiv);
    });
    
    // Event listener pour toggle
    header.addEventListener('click', () => {
      const isExpanded = content.style.display !== 'none';
      
      if (isExpanded) {
        content.style.display = 'none';
        header.classList.remove('expanded');
        header.querySelector('.strategy-toggle-icon').classList.remove('expanded');
      } else {
        content.style.display = 'block';
        header.classList.add('expanded');
        header.querySelector('.strategy-toggle-icon').classList.add('expanded');
      }
    });
    
    objectiveDiv.appendChild(header);
    objectiveDiv.appendChild(content);
    
    return objectiveDiv;
  }
  
  /**
   * Crée une section de sous-objectif avec ses actions
   */
  createSubObjectiveSection(objectif, sousObjectif, mappings) {
    const subObjectiveDiv = document.createElement('div');
    subObjectiveDiv.className = 'strategy-sub-objective';
    
    const title = document.createElement('div');
    title.className = 'strategy-sub-objective-title';
    title.textContent = sousObjectif;
    subObjectiveDiv.appendChild(title);
    
    // Générer les actions
    const actions = mappings.actions[sousObjectif] || [];
    actions.forEach(action => {
      const actionDiv = this.createActionCard(objectif, sousObjectif, action);
      subObjectiveDiv.appendChild(actionDiv);
    });
    
    return subObjectiveDiv;
  }
  
  /**
   * Crée une carte d'action cliquable
   */
  createActionCard(objectif, sousObjectif, action) {
    // Trouver la stratégie correspondante dans les données Grist
    const strategy = this.kanban.strategiesData.find(s => 
      s.objectif === objectif && 
      s.sous_objectif === sousObjectif && 
      s.action === action
    );
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'strategy-action';
    actionDiv.dataset.strategyId = strategy ? strategy.id : '';
    
    actionDiv.innerHTML = `
      <div class="strategy-action-title">${action}</div>
      <div class="strategy-action-details">
        ${strategy ? `
          <div class="strategy-action-detail">
            <i class="bi bi-calendar3"></i>
            <span>${strategy.echeance || 'Non défini'}</span>
          </div>
          <div class="strategy-action-detail">
            <i class="bi bi-person"></i>
            <span>${strategy.responsable || 'Non défini'}</span>
          </div>
          <div class="strategy-action-detail">
            <i class="bi bi-globe"></i>
            <span>${strategy.portee || 'Non défini'}</span>
          </div>
        ` : '<span class="text-muted">Détails non disponibles</span>'}
      </div>
      <i class="bi bi-check-circle strategy-selected-indicator" style="display: none;"></i>
    `;
    
    // Event listener pour sélection
    actionDiv.addEventListener('click', () => {
      this.selectStrategy(strategy, objectif, sousObjectif, action);
    });
    
    return actionDiv;
  }
  
  /**
   * Toggle une stratégie (ajout/suppression)
   */
  selectStrategy(strategy, objectif, sousObjectif, action) {
    if (!strategy) return;
    
    const actionCard = event.currentTarget;
    const isCurrentlySelected = actionCard.classList.contains('selected');
    
    if (isCurrentlySelected) {
      // Désélectionner cette stratégie
      this.removeStrategyFromSelection(strategy.id);
      actionCard.classList.remove('selected');
      actionCard.querySelector('.strategy-selected-indicator').style.display = 'none';
    } else {
      // Ajouter cette stratégie
      this.addStrategyToSelection(strategy);
      actionCard.classList.add('selected');
      actionCard.querySelector('.strategy-selected-indicator').style.display = 'block';
    }
    
    // Mettre à jour l'affichage
    this.updateStrategyTags();
    this.updateStrategyPreview();
    this.updateStrategyIds();
    
    // Afficher les détails de la stratégie cliquée
    this.updateStrategyDetails(strategy);
    
    this.logger.debug(`Selected strategies: ${this.selectedStrategies.length} items`);
  }
  
  /**
   * Ajoute une stratégie à la sélection
   */
  addStrategyToSelection(strategy) {
    // Éviter les doublons
    if (!this.selectedStrategies.find(s => s.id === strategy.id)) {
      this.selectedStrategies.push(strategy);
      
      // Plus de cache - approche stateless
    }
  }
  
  /**
   * Retire une stratégie de la sélection
   */
  removeStrategyFromSelection(strategyId) {
    this.selectedStrategies = this.selectedStrategies.filter(s => s.id !== strategyId);
    
    // Plus de cache - approche stateless
    
    // Mettre à jour l'état visuel de la carte correspondante
    const actionCard = document.querySelector(`[data-strategy-id="${strategyId}"]`);
    if (actionCard) {
      actionCard.classList.remove('selected');
      const indicator = actionCard.querySelector('.strategy-selected-indicator');
      if (indicator) indicator.style.display = 'none';
    }
  }
  
  /**
   * Met à jour l'affichage des tags de stratégies
   */
  updateStrategyTags() {
    const tagsContainer = document.getElementById('strategy-tags');
    const selectedContainer = document.getElementById('selected-strategies');
    const countBadge = document.getElementById('strategy-count');
    
    if (!tagsContainer || !selectedContainer || !countBadge) return;
    
    if (this.selectedStrategies.length === 0) {
      selectedContainer.style.display = 'none';
      return;
    }
    
    selectedContainer.style.display = 'block';
    countBadge.textContent = this.selectedStrategies.length;
    
    // Générer les tags
    tagsContainer.innerHTML = this.selectedStrategies.map(strategy => `
      <span class="badge bg-primary me-2 mb-2 strategy-tag" data-strategy-id="${strategy.id}">
        <span class="strategy-tag-text" title="${strategy.objectif} → ${strategy.sous_objectif} → ${strategy.action}">
          ${strategy.action}
        </span>
        <button type="button" class="btn-close btn-close-white ms-2 strategy-tag-remove" 
                data-strategy-id="${strategy.id}" title="Retirer cette stratégie">
        </button>
      </span>
    `).join('');
    
    // Ajouter les événements de suppression
    tagsContainer.querySelectorAll('.strategy-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const strategyId = parseInt(btn.dataset.strategyId);
        this.removeStrategyFromSelection(strategyId);
        this.updateStrategyTags();
        this.updateStrategyPreview();
        this.updateStrategyIds();
      });
    });
  }
  
  /**
   * Met à jour le preview dans l'en-tête de l'accordéon
   */
  updateStrategyPreview() {
    const preview = document.getElementById('selected-strategy-preview');
    if (!preview) return;
    
    if (this.selectedStrategies.length === 0) {
      preview.textContent = '';
    } else if (this.selectedStrategies.length === 1) {
      const strategy = this.selectedStrategies[0];
      preview.textContent = `${strategy.objectif} → ${strategy.action}`;
    } else {
      preview.textContent = `${this.selectedStrategies.length} stratégies sélectionnées`;
    }
  }
  
  /**
   * Met à jour le champ caché avec les IDs de stratégies
   */
  updateStrategyIds() {
    const strategyIds = this.selectedStrategies.map(s => s.id);
    
    // Format liste de références Grist: [["L", id1], ["L", id2], ...]
    let gristFormat;
    if (strategyIds.length === 0) {
      gristFormat = [];
    } else {
      gristFormat = strategyIds.map(id => ["L", id]);
    }
    
    setFieldValue('popup-strategie-id', gristFormat);
    
    this.logger.debug(`Strategies updated: ${strategyIds.length} selected, format:`, gristFormat);
  }
  
  /**
   * Configure les événements pour la gestion multiple
   */
  setupMultiStrategyEvents() {
    // Bouton "Tout désélectionner"
    const clearBtn = document.getElementById('btn-clear-strategies');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllStrategies();
      });
    }
  }
  
  /**
   * Désélectionne toutes les stratégies
   */
  clearAllStrategies() {
    // Vider la collection
    this.selectedStrategies = [];
    
    // Plus de cache - approche stateless
    
    // Mettre à jour l'interface
    document.querySelectorAll('.strategy-action.selected').forEach(el => {
      el.classList.remove('selected');
      const indicator = el.querySelector('.strategy-selected-indicator');
      if (indicator) indicator.style.display = 'none';
    });
    
    // Mettre à jour l'affichage
    this.updateStrategyTags();
    this.updateStrategyPreview();
    this.updateStrategyIds();
    this.hideStrategyDetails();
    
    this.logger.debug('All strategies deselected');
  }
  
  /**
   * Génère l'interface avec données de fallback
   */
  renderFallbackStrategyAccordion(container) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Données stratégiques non disponibles</strong>
        <p class="mb-0 mt-2">Impossible de charger les stratégies depuis Grist. 
        Veuillez vérifier la connexion ou contacter l'administrateur.</p>
      </div>
    `;
  }
  
  /**
   * Construit les mappings de stratégie depuis les données intégrées
   * @returns {object} Mappings organisés par objectif, sous-objectif, action
   */
  buildStrategyMappingsFromGrist() {
    const objectifs = [...new Set(this.kanban.strategiesData.map(s => s.objectif))].sort();
    const sousObjectifs = {};
    const actions = {};
    
    // Pour chaque objectif, trouver les sous-objectifs
    objectifs.forEach(objectif => {
      const strategiesForObjectif = this.kanban.strategiesData.filter(s => s.objectif === objectif);
      const sousObjectifsList = [...new Set(strategiesForObjectif.map(s => s.sous_objectif))].sort();
      sousObjectifs[objectif] = sousObjectifsList;
      
      // Pour chaque sous-objectif, trouver les actions
      sousObjectifsList.forEach(sousObjectif => {
        const strategiesForSousObjectif = strategiesForObjectif.filter(s => s.sous_objectif === sousObjectif);
        const actionsList = [...new Set(strategiesForSousObjectif.map(s => s.action))].sort();
        actions[sousObjectif] = actionsList;
      });
    });
    
    return {
      objectifs,
      sousObjectifs,
      actions
    };
  }
  
  /**
   * Met à jour les détails de la stratégie sélectionnée
   * @param {object} strategy - Objet stratégie
   */
  updateStrategyDetails(strategy) {
    const detailsContainer = document.getElementById('strategy-details');
    
    if (!strategy || !detailsContainer) {
      this.hideStrategyDetails();
      return;
    }
    
    // Mettre à jour les détails
    document.getElementById('strategy-echeance').textContent = strategy.echeance || '-';
    document.getElementById('strategy-responsable').textContent = strategy.responsable || '-';
    document.getElementById('strategy-portee').textContent = strategy.portee || '-';
    
    detailsContainer.style.display = 'block';
  }
  
  


  /**
   * Peuple les champs de stratégie - VERSION SIMPLE
   * @param {string|array} strategyIds - IDs de stratégies de la DB
   */
  populateStrategyFieldsFromIds(strategyIds) {
    // Reset complet à chaque fois
    this.resetStrategySelection();
    
    if (!strategyIds) {
      return;
    }
    
    // Parse simple des IDs
    let idsArray = [];
    try {
      if (typeof strategyIds === 'string') {
        idsArray = JSON.parse(strategyIds);
      } else if (Array.isArray(strategyIds)) {
        idsArray = strategyIds;
      } else {
        idsArray = [strategyIds];
      }
    } catch (e) {
      this.logger.warn('Error parsing strategy IDs:', e.message);
      return;
    }
    
    if (!Array.isArray(idsArray) || idsArray.length === 0) {
      return;
    }
    
    // Rechercher et sélectionner chaque stratégie - VERSION SIMPLE
    if (this.kanban.strategiesData && this.kanban.strategiesData.length > 0) {
      idsArray.forEach(strategyId => {
        // Debug pour comprendre les données reçues
        this.logger.debug('Processing strategy ID:', {
          original: strategyId,
          isArray: Array.isArray(strategyId),
          type: typeof strategyId,
          length: Array.isArray(strategyId) ? strategyId.length : 'N/A'
        });
        
        // Extraire l'ID depuis le format Grist ["L", id] si nécessaire
        let searchId = strategyId;
        if (Array.isArray(strategyId) && strategyId.length === 2 && strategyId[0] === 'L') {
          searchId = strategyId[1];
        }
        
        // Ignorer les IDs invalides ou vides
        if (!searchId || searchId === 'L' || (Array.isArray(searchId) && searchId.length === 0)) {
          this.logger.debug('Skipping invalid strategy ID:', strategyId);
          return; // Continue to next iteration
        }
        
        const strategy = this.kanban.strategiesData.find(s => s.id == searchId);
        if (strategy) {
          this.addStrategyToSelection(strategy);
          this.preSelectStrategyInAccordion(strategy);
        } else {
          this.logger.warn(`Strategy not found for ID:`, {
            original: strategyId,
            searchId: searchId,
            available: this.kanban.strategiesData.map(s => s.id).slice(0, 5)
          });
        }
      });
      
      // Mettre à jour l'affichage
      this.updateStrategyTags();
      this.updateStrategyPreview();
      this.updateStrategyIds();
      
      this.logger.debug(`Pre-selected strategies: ${this.selectedStrategies.length} items`);
    } else {
      this.logger.warn('Strategy data not available for populating fields');
    }
  }
  
  /**
   * Peuple les stratégies depuis le format références multiples de Grist
   * @param {string|array} gristReferences - Références Grist [["L", id1], ["L", id2], ...]
   */
  populateStrategyFieldsFromGristReferences(gristReferences) {
    this.logger.debug(`Loading strategies from Grist: ${gristReferences?.length || 0} references`);
    
    // Reset complet des stratégies à chaque tâche (approche stateless)
    this.selectedStrategies = [];
    this.resetStrategySelection();
    
    if (!gristReferences) {
      return;
    }
    
    // Convertir les références Grist en array d'IDs
    let strategyIds = [];
    try {
      if (typeof gristReferences === 'string') {
        const parsed = JSON.parse(gristReferences);
        if (Array.isArray(parsed)) {
          // Format Grist: [["L", id1], ["L", id2], ...]
          strategyIds = parsed.map(ref => Array.isArray(ref) && ref[0] === 'L' ? ref[1] : ref).filter(id => id);
        }
      } else if (Array.isArray(gristReferences)) {
        strategyIds = gristReferences.map(ref => Array.isArray(ref) && ref[0] === 'L' ? ref[1] : ref).filter(id => id);
      } else {
        // Fallback: ID simple
        strategyIds = [gristReferences];
      }
    } catch (e) {
      this.logger.warn('Error parsing Grist references:', e.message);
      return;
    }
    
    this.logger.debug(`Extracted strategy IDs: ${strategyIds.length} items`);
    
    if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
      return;
    }
    
    // Charger les stratégies correspondantes
    if (this.kanban.strategiesData && this.kanban.strategiesData.length > 0) {
      let strategiesFromDB = [];
      
      strategyIds.forEach(strategyId => {
        // Ignorer les IDs invalides ou vides (même logique que dans populateStrategyFieldsFromGristReferences)
        if (!strategyId || strategyId === 'L' || (Array.isArray(strategyId) && strategyId.length === 0)) {
          this.logger.debug('Skipping invalid strategy ID in loadStrategiesFromIds:', strategyId);
          return; // Continue to next iteration
        }
        
        const strategy = this.kanban.strategiesData.find(s => s.id == strategyId);
        if (strategy) {
          strategiesFromDB.push(strategy);
          this.addStrategyToSelection(strategy);
          this.preSelectStrategyInAccordion(strategy);
        } else {
          this.logger.warn(`Strategy not found for ID:`, {
            original: strategyId,
            searchId: strategyId,
            available: this.kanban.strategiesData.map(s => s.id).slice(0, 5)
          });
        }
      });
      
      // Plus de cache - approche stateless
      
      // Mettre à jour l'affichage
      this.updateStrategyTags();
      this.updateStrategyPreview();
      this.updateStrategyIds();
      
      this.logger.info(`Strategies loaded from Grist: ${strategiesFromDB.length} items`);
    }
  }
  
  /**
   * Compatibilité : peuple depuis un ID unique (ancien système)
   * @param {number} strategyId - ID de la stratégie unique
   */
  populateStrategyFieldsFromId(strategyId) {
    if (strategyId) {
      this.populateStrategyFieldsFromIds([strategyId]);
    } else {
      this.resetStrategySelection();
    }
  }
  
  /**
   * Pré-sélectionne une stratégie dans l'interface accordéon
   * @param {object} strategy - Stratégie à pré-sélectionner
   */
  preSelectStrategyInAccordion(strategy) {
    // Désélectionner les autres actions d'abord
    document.querySelectorAll('.strategy-action.selected').forEach(el => {
      el.classList.remove('selected');
      const indicator = el.querySelector('.strategy-selected-indicator');
      if (indicator) indicator.style.display = 'none';
    });
    
    // Trouver et sélectionner la bonne action
    const actionCards = document.querySelectorAll('.strategy-action');
    actionCards.forEach(card => {
      if (card.dataset.strategyId == strategy.id) {
        card.classList.add('selected');
        const indicator = card.querySelector('.strategy-selected-indicator');
        if (indicator) indicator.style.display = 'block';
        
        // Ouvrir l'accordéon parent si nécessaire
        const objectiveHeader = card.closest('.strategy-objective').querySelector('.strategy-objective-header');
        if (objectiveHeader && !objectiveHeader.classList.contains('expanded')) {
          objectiveHeader.click(); // Déclencher l'ouverture
        }
      }
    });
  }
  
  /**
   * Réinitialise la sélection de stratégie
   */
  resetStrategySelection() {
    // Reset collection des stratégies sélectionnées - FORCE le nettoyage complet
    this.selectedStrategies = [];
    
    // Reset champs stratégie avec jQuery
    $('#popup-strategie-objectif, #popup-strategie-sous-objectif, #popup-strategie-action, #popup-strategie-id').val('');
    
    // Reset interface accordéon avec jQuery
    $('.strategy-action.selected').removeClass('selected');
    $('.strategy-selected-indicator').hide();
    
    // Force le nettoyage DOM des stratégies
    const strategiesContainer = document.querySelector('.strategies-list, [class*="strategy"]');
    if (strategiesContainer) {
      // Ne pas vider complètement mais reset les sélections
      document.querySelectorAll('.strategy-tag, .selected-strategies-tags').forEach(el => {
        if (el.closest('.selected-strategies-container, .strategy-tags-container')) {
          el.remove();
        }
      });
    }
    
    // Nettoyer tous les éléments stratégies sélectionnées visibles
    document.querySelectorAll('.strategy-tag, .selected-strategies-container [style*="display: block"]').forEach(el => {
      if (el.classList.contains('strategy-tag')) {
        el.remove();
      } else if (el.classList.contains('selected-strategies-container')) {
        el.style.display = 'none';
      }
    });
    
    // Reset preview
    $('#selected-strategy-preview').text('');
    
    // Masquer les détails
    this.hideStrategyDetails();
    
    // Force update des tags et preview
    this.updateStrategyTags();
    this.updateStrategyPreview();
  }
  
  /**
   * Ouvre la modal de tâche
   * @param {object} task - Données de la tâche (null pour nouvelle tâche)
   */
  openTaskModal(task = null) {
    if (!this.taskModal) {
      displayError('Modal de tâche non disponible');
      return;
    }
    
    // ✅ RESET intelligent : seulement si nouvelle tâche ou changement de tâche
    const isChangingTask = !task || this.currentTaskId !== task?.id;
    if (isChangingTask) {
      this.resetTaskForm();
    }
    
    this.isNewTask = !task || !task.id;
    this.currentTask = task;
    this.currentTaskId = task?.id || null;
    
    this.logger.debug(`Opening task modal: ${this.isNewTask ? 'new task' : 'edit task ' + this.currentTaskId}`);
    
    // Mettre à jour le titre de la modal
    const modalTitle = document.getElementById('popup-tache-label');
    if (modalTitle) {
      modalTitle.innerHTML = this.isNewTask 
        ? '<i class="bi bi-plus-circle me-2"></i>Nouvelle Tâche'
        : '<i class="bi bi-pencil-square me-2"></i>Modifier Tâche';
    }
    
    
    // Informer le JalonManager de la tâche en cours
    if (this.kanban.jalonManager) {
      this.kanban.jalonManager.setCurrentTaskId(this.currentTaskId);
    }
    
    // Peupler les champs APRÈS avoir configuré les caches
    this.populateTaskForm(task);
    
    // Afficher/masquer le bouton supprimer
    toggleVisibility('btn-delete-task', !this.isNewTask, 'inline-block');
    
    // Ouvrir la modal
    this.taskModal.show();
    
    // Focus sur le premier champ
    setTimeout(() => {
      const firstField = document.getElementById('popup-titre');
      if (firstField) firstField.focus();
    }, 300);
    
    // Assurer que tous les champs peuvent recevoir le focus
    this.ensureAllFieldsFocus();
  }
  
  /**
   * Assure que tous les champs de la modale peuvent recevoir le focus
   */
  ensureAllFieldsFocus() {
    // Liste des champs à vérifier
    const fieldIds = [
      'popup-titre',
      'popup-description', 
      'popup-urgence',
      'popup-impact',
      'popup-date-debut',
      'popup-date-echeance',
      'popup-projet'
    ];
    
    fieldIds.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        // Supprimer les attributs qui empêchent le focus
        field.removeAttribute('readonly');
        field.removeAttribute('disabled');
        field.tabIndex = 0;
        
        // Ajouter un gestionnaire de clic pour forcer le focus
        if (!field.dataset.focusHandlerAdded) {
          field.dataset.focusHandlerAdded = 'true';
          field.addEventListener('click', function() {
            setTimeout(() => {
              this.focus();
              if (this.tagName === 'TEXTAREA' || this.type === 'text') {
                this.setSelectionRange(this.value.length, this.value.length);
              }
            }, 10);
          });
        }
      }
    });
    
    // Appeler la méthode spécifique pour la description
    this.ensureDescriptionFocus();
  }

  /**
   * Assure que le textarea description peut recevoir le focus
   */
  ensureDescriptionFocus() {
    const descriptionField = document.getElementById('popup-description');
    if (!descriptionField) return;
    
    // Supprimer les attributs qui empêchent le focus
    descriptionField.removeAttribute('readonly');
    descriptionField.removeAttribute('disabled');
    
    // Assurer que le champ est focusable
    descriptionField.tabIndex = 0;
    
    // Éviter de lier plusieurs fois les mêmes événements
    if (descriptionField.dataset.focusHandlerAdded) return;
    descriptionField.dataset.focusHandlerAdded = 'true';
    
    // Ajouter un gestionnaire de clic pour forcer le focus
    descriptionField.addEventListener('click', function(e) {
      e.stopPropagation();
      setTimeout(() => {
        this.focus();
        this.setSelectionRange(this.value.length, this.value.length);
      }, 10);
    });
    
    // Ajouter un gestionnaire pour débugger les problèmes de focus
    descriptionField.addEventListener('focus', function() {
    });
    
    descriptionField.addEventListener('blur', function() {
    });
    
    // Gestionnaire pour forcer le focus au survol
    descriptionField.addEventListener('mouseenter', function() {
    });
  }
  
  /**
   * Peuple le formulaire avec les données d'une tâche
   * @param {object} task - Données de la tâche
   */
  // === REMPLISSAGE DU FORMULAIRE CORRIGÉ ===
  populateTaskForm(tache, isNewTask) {
    this.logger.debug(`Populating task form: ${isNewTask ? 'new task' : 'edit mode'}`);
    
    // S'assurer que tache est un objet
    if (!tache) {
      tache = {};
    }
    
    // Utiliser le paramètre isNewTask s'il est fourni
    if (isNewTask !== undefined) {
      this.isNewTask = isNewTask;
      this.currentTaskId = this.isNewTask ? null : (tache.id || null);
      this.currentTask = this.isNewTask ? null : tache;
    }
    
    
    // Champs de base
    setFieldValue('popup-titre', tache.titre || '');
    
    // Description - TOUJOURS VIDE pour saisie de nouveaux commentaires
    // Les anciens commentaires sont visibles dans l'historique, pas dans la zone de saisie
    setFieldValue('popup-description', '');
    
    // Réinitialiser l'accordéon historique
    this.resetCommentHistoryAccordion();
    
    // Statut (lecture seule)
    const statut = tache.statut || (isNewTask ? 'Backlog' : '');
    setFieldValue('popup-statut-text', statut);
    
    // Projet
    setFieldValue('popup-projet', tache.projet || '');
    
    // Urgence et Impact
    setFieldValue('popup-urgence', tache.urgence || '');
    setFieldValue('popup-impact', tache.impact || '');
    
    // Stratégies depuis Grist - gérer le format références multiples
    if (tache.strategie_id) {
      // Le champ strategie_id contient maintenant les références multiples
      this.populateStrategyFieldsFromGristReferences(tache.strategie_id);
    } else {
      // Aucune stratégie - réinitialiser
      this.resetStrategySelection();
    }
    
    // Bureaux et responsables (selects multiples)
    setSelectedOptions('popup-bureau', tache.bureau || ['L']);
    setSelectedOptions('popup-qui', tache.qui || ['L']);
    
    // Synchroniser avec les cases à cocher
    this.syncSelectToCheckbox('popup-bureau-checkboxes', 'popup-bureau');
    this.syncSelectToCheckbox('popup-qui-checkboxes', 'popup-qui');
    
    // Charger les jalons si disponibles
    if (this.kanban.jalonManager) {
      this.logger.debug(`Processing jalons: ${typeof tache.jalons} - ${tache.jalons}`);
      this.kanban.jalonManager.loadJalonsFromTask(tache);
    }
    
    this.logger.debug('Task form populated');
  }


  
  
  /**
   * Sauvegarde la tâche
   */
  async saveTask() {
    if (!validateForm('task-form')) {
      displayError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    try {
      // Collecter les données du formulaire
      const taskData = this.collectFormData();
      
      // Préparer les données pour Grist
      const gristData = this.prepareTaskDataForGrist(taskData);
      
      let result;
      
      // Logs de debug simplifiés
      if (this.kanban.config?.enableDebugMode) {
        this.logger.info(`Saving task: ${this.isNewTask ? 'CREATE' : 'UPDATE'} ${this.currentTaskId || 'new'}`);
      }
      
      // Validation critique
      if (!this.isNewTask && (!this.currentTaskId || this.currentTaskId === null)) {
        // Tentative de récupération depuis currentTask
        if (this.currentTask && this.currentTask.id) {
          this.currentTaskId = this.currentTask.id;
        } else {
          displayError('Erreur: ID de tâche manquant pour la mise à jour');
          return;
        }
      }
      
      if (this.isNewTask) {
        // Création
        const action = ['AddRecord', TABLE_ID, null, gristData];
        result = await grist.docApi.applyUserActions([action]);
        
        // Enregistrer l'action utilisateur pour la création
        const userActionManager = getUserActionManager();
        if (userActionManager && result && result.retValues && result.retValues[0]) {
          const newTaskId = result.retValues[0];
          const descriptionContent = getFieldValue('popup-description').trim();
          
          // Enregistrer en parallèle pour accélérer
          const historyPromises = [
            userActionManager.createTaskAction(newTaskId, gristData)
          ];
          
          if (descriptionContent) {
            historyPromises.push(
              userActionManager.addHistoryEntry(
                newTaskId,
                'comment',
                `Commentaire initial: ${descriptionContent}`,
                '',
                descriptionContent,
                gristData.statut || 'À faire'
              )
            );
          }
          
          // Exécuter en parallèle sans attendre
          Promise.allSettled(historyPromises).catch(e => this.logger.warn('History promises failed:', e.message));
        }
        
        displaySuccess('Tâche créée avec succès');
        
        // Vider le champ description après création
        setFieldValue('popup-description', '');
      } else {
        // Mise à jour
        const action = ['UpdateRecord', TABLE_ID, this.currentTaskId, gristData];
        result = await grist.docApi.applyUserActions([action]);
        
        // Enregistrer l'action utilisateur pour la mise à jour
        const userActionManager = getUserActionManager();
        if (userActionManager) {
          const descriptionContent = getFieldValue('popup-description').trim();
          const oldJalons = this.currentTask?.jalons || null;
          const newJalons = gristData.jalons || null;
          const jalonsChanged = this.hasJalonsChanged(oldJalons, newJalons);
          const oldStrategies = this.currentTask?.strategie_id || null;
          const newStrategies = gristData.strategie_id || null;
          const strategiesChanged = this.hasStrategiesChanged(oldStrategies, newStrategies);
          
          // Préparer toutes les opérations d'historique en parallèle
          const historyPromises = [];
          
          if (descriptionContent) {
            historyPromises.push(
              userActionManager.addHistoryEntry(
                this.currentTaskId,
                'comment',
                `Commentaire ajouté: ${descriptionContent}`,
                '',
                descriptionContent,
                gristData.statut || this.currentTask?.statut
              )
            );
            
            const hasOtherChanges = this.hasSignificantChanges(this.currentTask, gristData, ['description']);
            if (hasOtherChanges) {
              historyPromises.push(
                userActionManager.updateTaskAction(this.currentTaskId, this.currentTask, gristData, 'Task updated via modal')
              );
            }
          } else {
            historyPromises.push(
              userActionManager.updateTaskAction(this.currentTaskId, this.currentTask, gristData, 'Task updated via modal')
            );
          }
          
          // ✅ VÉRIFIER CHANGEMENT DE STATUT SPÉCIFIQUEMENT
          if (this.currentTask && this.currentTask.statut !== gristData.statut) {
            console.log(`📝 Modal: Changement statut ${this.currentTask.statut} → ${gristData.statut}`);
            historyPromises.push(
              userActionManager.statusChangeAction(
                this.currentTaskId, 
                this.currentTask.statut, 
                gristData.statut
              )
            );
          }
          
          // Ajouter les changements spéciaux aux promesses
          if (jalonsChanged) {
            const jalonsDetails = this.getJalonsChangeDetails(oldJalons, newJalons);
            historyPromises.push(
              userActionManager.addHistoryEntry(
                this.currentTaskId,
                'jalons_update',
                jalonsDetails.message,
                jalonsDetails.oldSummary,
                jalonsDetails.newSummary,
                gristData.statut || this.currentTask?.statut
              )
            );
          }
          
          if (strategiesChanged) {
            const strategiesDetails = this.getStrategiesChangeDetails(oldStrategies, newStrategies);
            historyPromises.push(
              userActionManager.addHistoryEntry(
                this.currentTaskId,
                'strategies_update',
                strategiesDetails.message,
                strategiesDetails.oldSummary,
                strategiesDetails.newSummary,
                gristData.statut || this.currentTask?.statut
              )
            );
          }
          
          // Exécuter toutes les opérations d'historique en parallèle sans attendre
          Promise.allSettled(historyPromises).catch(e => this.logger.warn('History promises failed:', e.message));
        }
        
        displaySuccess('Tâche mise à jour avec succès');
        
        // Vider le champ description après mise à jour seulement si c'était un commentaire d'historique
        const descriptionContent = getFieldValue('popup-description').trim();
        if (descriptionContent && descriptionContent.length > 0) {
          // Si il y avait du contenu dans description, c'était probablement un commentaire d'historique
          setFieldValue('popup-description', '');
        }
      }
      
      // Log résultat seulement en mode debug
      if (this.kanban.config?.enableDebugMode) {
        this.logger.debug('Grist save result received');
      }
      
      // Signaler la mise à jour locale
      if (this.kanban.signalLocalUpdate) {
        this.kanban.signalLocalUpdate();
      }
      
      // Marquer comme en cours de mise à jour pour éviter les refresh prématurés
      if (this.kanban.isUpdating !== undefined) {
        this.kanban.isUpdating = true;
      }
      
      // Fermer la modal
      this.taskModal.hide();
      
      // Attendre un peu pour laisser Grist traiter la mise à jour
      setTimeout(() => {
        if (this.kanban.isUpdating !== undefined) {
          this.kanban.isUpdating = false;
        }
        // Refresh seulement après avoir libéré le flag
        this.kanban.refreshKanban();
      }, 200);
      
    } catch (error) {
      this.logger.error('Complete save error:', error.message);
      
      // Afficher l'erreur détaillée
      let errorMessage = `Erreur lors de la sauvegarde: ${error.message}`;
      if (error.stack) {
        this.logger.error('Error details:', error.stack);
        errorMessage += '\n(Voir console pour détails)';
      }
      
      displayError(errorMessage);
    }
  }
  
  /**
   * Collecte les données du formulaire
   * @returns {object} Données collectées
   */
  collectFormData() {
    const data = {
      titre: getFieldValue('popup-titre').trim(),
      statut: getFieldValue('popup-statut-text'),
      projet: getFieldValue('popup-projet').trim() || null,
      urgence: getFieldValue('popup-urgence') || null,
      impact: getFieldValue('popup-impact') || null,
      bureau: getSelectedOptionsAsGristFormat('popup-bureau'),
      qui: getSelectedOptionsAsGristFormat('popup-qui'),
      strategie_id: getFieldValue('popup-strategie-id') || null, // Références multiples Grist
      jalons: this.kanban.jalonManager ? this.kanban.jalonManager.getJalonsForSave() : null
    };
    
    this.logger.debug(`Collecting form data: ${data.titre || 'untitled'} (${data.statut})`);
    
    // CHAMP DESCRIPTION SUPPRIMÉ - Tous les commentaires sont maintenant dans notes.history
    // Le champ de saisie popup-description sert uniquement pour les nouveaux commentaires
    
    // Date d'échéance
    if (this.kanban.datePickerManager) {
      data.date_echeance = this.kanban.datePickerManager.getDateForGrist();
    }
    
    return data;
  }
  
  /**
   * Prépare les données pour l'envoi à Grist
   * @param {object} taskData - Données de la tâche
   * @returns {object} Données formatées pour Grist
   */
  prepareTaskDataForGrist(taskData) {
    this.logger.debug('Preparing task data for Grist API');
    
    const gristData = { ...taskData };
    
    // Ajouter les métadonnées
    gristData.date_derniere_maj = new Date().toISOString();
    
    // Assurer que les champs obligatoires sont présents
    if (!gristData.titre) {
      throw new Error('Le titre est obligatoire');
    }
    
    // Assurer que le statut est défini
    if (!gristData.statut) {
      gristData.statut = 'Backlog';
    }
    
    // Assurer que les listes sont dans le bon format - SEULEMENT si elles sont vides ou invalides
    if (!Array.isArray(gristData.bureau)) {
      gristData.bureau = ['L'];
    } else if (gristData.bureau.length === 0 || gristData.bureau[0] !== 'L') {
      // Si la liste est vide ou ne commence pas par 'L', la corriger
      if (gristData.bureau.length === 0) {
        gristData.bureau = ['L'];
      } else {
        gristData.bureau = ['L', ...gristData.bureau];
      }
    }
    
    if (!Array.isArray(gristData.qui)) {
      gristData.qui = ['L'];
    } else if (gristData.qui.length === 0 || gristData.qui[0] !== 'L') {
      // Si la liste est vide ou ne commence pas par 'L', la corriger
      if (gristData.qui.length === 0) {
        gristData.qui = ['L'];
      } else {
        gristData.qui = ['L', ...gristData.qui];
      }
    }
    
    // Ensure empty lists are properly formatted as ['L'] not ['L', ''] 
    if (gristData.bureau.length === 2 && gristData.bureau[1] === '') {
      gristData.bureau = ['L'];
    }
    if (gristData.qui.length === 2 && gristData.qui[1] === '') {
      gristData.qui = ['L'];
    }
    
    // Pour strategie_id (ReferenceList), convertir au bon format ['L', id] AVEC VALIDATION
    if (gristData.strategie_id) {
      let strategyId = null;
      
      // Extraire l'ID selon le format
      if (typeof gristData.strategie_id === 'number') {
        strategyId = gristData.strategie_id;
      } else if (typeof gristData.strategie_id === 'string' && !isNaN(parseInt(gristData.strategie_id))) {
        strategyId = parseInt(gristData.strategie_id);
      } else if (typeof gristData.strategie_id === 'string' && gristData.strategie_id.startsWith('L,')) {
        strategyId = parseInt(gristData.strategie_id.substring(2), 10);
      } else if (Array.isArray(gristData.strategie_id) && gristData.strategie_id.length === 2 && gristData.strategie_id[0] === 'L') {
        // Déjà au bon format ['L', id]
        strategyId = gristData.strategie_id[1];
      }
      
      // VALIDATION: Vérifier que l'ID existe dans les stratégies
      if (strategyId && !isNaN(strategyId)) {
        const strategyExists = this.kanban.strategiesData?.find(s => s.id === strategyId);
        if (strategyExists) {
          gristData.strategie_id = ['L', strategyId];  // Format correct pour ReferenceList
          console.log(`✅ Stratégie ${strategyId} validée et convertie au format ['L', ${strategyId}]`);
        } else {
          console.warn(`⚠️ Stratégie ${strategyId} n'existe pas, suppression de la référence`);
          gristData.strategie_id = null;
        }
      } else {
        console.warn(`⚠️ ID stratégie invalide:`, gristData.strategie_id);
        gristData.strategie_id = null;
      }
    } else {
      gristData.strategie_id = null;
    }
    
    // Remove historique_statuts - it's a Date field, not JSON
    delete gristData.historique_statuts;
    
    // Nettoyer les valeurs nulles/undefined problématiques
    Object.keys(gristData).forEach(key => {
      if (gristData[key] === undefined) {
        gristData[key] = null;
      }
    });
    
    // Éviter les appels au history manager qui peuvent causer des problèmes
    // (commenté pour l'instant)
    /*
    if (this.isNewTask) {
      if (this.kanban.historyManager) {
        const historyData = this.kanban.historyManager.updateTaskHistory(
          { statut: null }, 
          taskData.statut, 
          'Tâche créée'
        );
        Object.assign(gristData, historyData);
      }
    } else {
      if (this.currentTask && this.currentTask.statut !== taskData.statut) {
        if (this.kanban.historyManager) {
          const historyData = this.kanban.historyManager.updateTaskHistory(
            this.currentTask,
            taskData.statut,
            'Statut modifié via formulaire'
          );
          Object.assign(gristData, historyData);
        }
      }
    }
    */
    
    // Vérifier les jalons pour Grist (déjà au format JSON string)
    if (gristData.jalons !== null && gristData.jalons !== undefined) {
      if (typeof gristData.jalons !== 'string') {
        gristData.jalons = JSON.stringify(gristData.jalons || []);
      }
    } else {
      gristData.jalons = '{"jalons":[],"lastModified":0}'; // Valeur par défaut
    }
    
    // Conversion du format strategie_id si nécessaire pour les références multiples
    if (gristData.strategie_id && typeof gristData.strategie_id === 'string') {
      try {
        // Vérifier si c'est déjà au format JSON Grist
        const parsed = JSON.parse(gristData.strategie_id);
        if (Array.isArray(parsed)) {
        }
      } catch (e) {
        // Si c'est un nombre simple, le convertir au format références multiples
        const strategyId = parseInt(gristData.strategie_id);
        if (!isNaN(strategyId)) {
          gristData.strategie_id = JSON.stringify([["L", strategyId]]);
        }
      }
    }
    
    this.logger.debug('Task data prepared for Grist API');
    
    return gristData;
  }
  
  /**
   * Supprime la tâche courante
   */
   // === SUPPRESSION DE TÂCHE ===
  async deleteTask() {
    this.logger.info(`Deleting task: ${this.currentTaskId}`);
    
    if (!this.currentTaskId) {
      alert('Aucune tâche sélectionnée pour suppression');
      return;
    }
    
    const task = this.kanban.currentRecords?.find(r => r.id === this.currentTaskId);
    const taskTitle = task?.titre || 'cette tâche';
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${taskTitle}" ?`)) {
      return;
    }
    
    try {
      // Enregistrer l'action utilisateur avant la suppression
      const userActionManager = getUserActionManager();
      if (userActionManager && task) {
        await userActionManager.deleteTaskAction(this.currentTaskId, task);
      }
      
      await grist.docApi.applyUserActions([
        ['RemoveRecord', TABLE_ID, this.currentTaskId]
      ]);
      
      // Fermer la modal d'abord
      this.closeAllModals();
      
      displaySuccess('Tâche supprimée avec succès');
      
      // Signaler la mise à jour locale pour éviter les triggers onRecords inutiles
      if (this.kanban && this.kanban.signalLocalUpdate) {
        this.kanban.signalLocalUpdate();
      }
      
      // Nettoyer les références
      this.currentTaskId = null;
      this.currentTask = null;
      this.isNewTask = false;
      
      // Rafraîchir le kanban avec un petit délai pour laisser la modal se fermer
      setTimeout(() => {
        if (this.kanban && this.kanban.refreshKanban) {
          this.logger.debug('Refreshing kanban after deletion');
          this.kanban.refreshKanban();
        } else {
          this.logger.warn('Cannot refresh kanban: missing reference');
          // Fallback: recharger la page si le kanban n'est pas accessible
          window.location.reload();
        }
      }, 100);
      
    } catch (error) {
      this.logger.error('Task deletion failed:', error.message);
      displayError(`Erreur lors de la suppression: ${error.message}`);
    }
  }
// === MÉTHODE DE DIAGNOSTIC ===
  diagnoseModals() {
    this.logger.debug('Running modal diagnostics');
  }

  // === RESET COMPLET DES MODALES ===
  resetModals() {
    this.logger.debug('Resetting all modals');
    
    // Détruire les instances existantes
    if (this.modal) {
      try {
        this.modal.dispose();
      } catch (e) {
        this.logger.warn('Error destroying modal:', e.message);
      }
    }
    
    if (this.historyModal) {
      try {
        this.historyModal.dispose();
      } catch (e) {
        this.logger.warn('Error destroying history modal:', e.message);
      }
    }
    
    // Réinitialiser
    this.modal = null;
    this.historyModal = null;
    this.modalElement = null;
    this.historyModalElement = null;
    
    // Réinitialiser
    setTimeout(() => {
      this.initModals();
    }, 100);
  }



  /**
   * Ajoute un nouveau projet
   */
  // === MÉTHODE D'AJOUT DE NOUVEAU PROJET ===
  addNewProject() {
    const newProjectName = getFieldValue('projet-ajout').trim();
    
    if (!newProjectName) {
      displayError('Veuillez saisir un nom de projet');
      return;
    }
    
    // Vérifier si le projet existe déjà
    const currentProjects = this.gristOptions?.projet || [];
    if (currentProjects.includes(newProjectName)) {
      displayError('Ce projet existe déjà');
      return;
    }
    
    // Ajouter le projet à la liste
    const updatedProjects = [...currentProjects, newProjectName].sort();
    this.kanban.gristOptions.projet = updatedProjects;
    
    // Mettre à jour le select
    populateSelect('popup-projet', updatedProjects, true);
    setFieldValue('popup-projet', newProjectName);
    setFieldValue('projet-ajout', '');
    
    displaySuccess(`Projet "${newProjectName}" ajouté`);
  }

  /**
   * Charge l'historique des commentaires dans l'accordéon de la modale
   */
  loadCommentHistoryInAccordion() {
    this.logger.debug(`Loading comment history for task ${this.currentTaskId}`);
    
    // Afficher un message de chargement
    const accordionContent = document.getElementById('comment-history-content');
    if (accordionContent) {
      accordionContent.innerHTML = `
        <div class="text-center text-muted py-3">
          <div class="spinner-border spinner-border-sm me-2"></div>
          <span>Chargement de l'historique...</span>
        </div>
      `;
    }

    // Vérifier si on a une tâche courante
    if (!this.currentTask && !this.currentTaskId) {
      this.logger.warn('No current task available for loading history');
      this.showAccordionError('Aucune tâche sélectionnée');
      return;
    }

    // Si on n'a pas currentTask mais qu'on a currentTaskId, essayer de la récupérer
    let taskToProcess = this.currentTask;
    if (!taskToProcess && this.currentTaskId) {
      taskToProcess = this.kanban.currentRecords?.find(r => r.id === this.currentTaskId);
      
      if (taskToProcess) {
        this.currentTask = taskToProcess; // Sauvegarder pour les prochains appels
      } else {
        this.logger.error(`Cannot find task with ID: ${this.currentTaskId}`);
        this.showAccordionError('Tâche non trouvée dans les données');
        return;
      }
    }

    // Vérifier le HistoryManager
    if (!this.kanban.historyManager) {
      this.logger.error('HistoryManager not available');
      this.showAccordionError('Gestionnaire d\'historique non disponible');
      return;
    }

    try {
      this.logger.debug(`Parsing history for task ${taskToProcess.id}: ${taskToProcess.titre}`);
      
      // Parser l'historique
      const historyData = this.kanban.historyManager.parseTaskHistory(taskToProcess);
      this.logger.debug(`History data loaded: ${historyData.comments?.length || 0} comments + ${historyData.history?.length || 0} history entries`);
      
      // Afficher les données dans l'accordéon
      this.renderCommentHistoryInAccordion(historyData);
      
    } catch (error) {
      this.logger.error('Error parsing history:', error.message);
      this.showAccordionError('Erreur lors du chargement de l\'historique: ' + error.message);
    }
  }

  /**
   * Rend l'historique des commentaires dans l'accordéon
   * @param {object} historyData - Données d'historique parsées
   */
  renderCommentHistoryInAccordion(historyData) {
    const accordionContent = document.getElementById('comment-history-content');
    const commentCountBadge = document.getElementById('comment-count-badge');
    
    if (!accordionContent || !commentCountBadge) {
      this.logger.error('Accordion elements not found');
      return;
    }

    const { comments, timeline, history, task } = historyData;
    
    // Utiliser la timeline complète qui contient TOUT (commentaires + changements de statut + modifications)
    const totalEntries = timeline.length;
    
    // Mettre à jour le badge de comptage  
    commentCountBadge.textContent = totalEntries;
    commentCountBadge.className = totalEntries > 0 ? 'badge bg-info ms-2' : 'badge bg-secondary ms-2';

    if (totalEntries === 0) {
      accordionContent.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-clock-history fs-4"></i>
          <p class="mt-2">Aucun historique trouvé</p>
          <small class="text-muted">L'historique des commentaires et modifications apparaîtra ici</small>
          <div class="mt-3">
            <button class="btn btn-sm btn-outline-primary" onclick="kanbanManager?.modalManager?.loadCommentHistoryInAccordion()">
              <i class="bi bi-arrow-clockwise me-1"></i>Recharger
            </button>
          </div>
          <div class="mt-2">
            <small class="text-muted">
              Tâche ID: ${task?.id || 'N/A'} | 
              Notes: ${task?.notes ? 'Présentes' : 'Vides'} | 
              Statuts: ${task?.historique_statuts ? 'Présents' : 'Vides'}
            </small>
          </div>
        </div>
      `;
      return;
    }

    // Construire le HTML avec commentaires ET modifications
    let historyHTML = '';
    
    // Ajouter les modifications (read-only)
    history.forEach((change) => {
      const formattedDate = new Date(change.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const userInfo = change.user ? ` par ${change.user}` : '';
      
      historyHTML += `
        <div class="history-item mb-3 p-3 border rounded bg-light">
          <div class="history-header d-flex justify-content-between align-items-start mb-2">
            <div class="history-meta">
              <small class="text-muted">
                <i class="bi bi-arrow-right-circle me-1"></i>${formattedDate}${userInfo}
                <span class="badge bg-secondary ms-2">Modification</span>
              </small>
            </div>
            <div class="text-muted">
              <i class="bi bi-lock" title="Lecture seule"></i>
            </div>
          </div>
          <div class="history-content text-muted">
            <strong>${change.statut}</strong>
            ${change.note ? `<br><small>${change.note}</small>` : ''}
          </div>
        </div>
      `;
    });
    
    // Ajouter les commentaires (éditables)
    comments.forEach((comment, index) => {
      const formattedDate = new Date(comment.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const isLatest = index === 0; // Le plus récent en premier
      const latestBadge = isLatest ? '<span class="badge bg-success ms-2">Récent</span>' : '';
      const userInfo = comment.user ? ` par ${comment.user}` : '';
      
      // Génerer un ID unique pour le commentaire
      const timestampString = comment.timestamp instanceof Date ? 
        comment.timestamp.toISOString() : 
        String(comment.timestamp);
      const commentId = `comment-${timestampString.replace(/[^\d]/g, '')}`;
      
      historyHTML += `
        <div class="comment-item mb-3 p-3 border rounded" data-comment-id="${commentId}">
          <div class="comment-header d-flex justify-content-between align-items-start mb-2">
            <div class="comment-meta">
              <small class="text-muted">
                <i class="bi bi-chat me-1"></i>${formattedDate}${userInfo}
                ${latestBadge}
              </small>
            </div>
            <button class="btn btn-sm btn-outline-secondary btn-edit-comment" 
                    data-comment-id="${commentId}"
                    title="Éditer ce commentaire">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
          <div class="comment-content" data-original="${comment.content.replace(/"/g, '&quot;')}">
            ${comment.content}
          </div>
        </div>
      `;
    });

    // Combiner et trier par timeline chronologique
    const allEntries = [...timeline].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Plus récent en premier
    });

    // Construire le HTML final trié
    let finalHTML = '';
    allEntries.forEach((entry, index) => {
      const formattedDate = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const userInfo = entry.user ? ` par ${entry.user}` : '';
      const isLatest = index === 0;

      if (entry.type === 'comment') {
        // Commentaire (éditable)
        const latestBadge = isLatest ? '<span class="badge bg-success ms-2">Récent</span>' : '';
        const timestampString = entry.timestamp instanceof Date ? 
          entry.timestamp.toISOString() : String(entry.timestamp);
        const commentId = `comment-${timestampString.replace(/[^\d]/g, '')}`;
        
        
        finalHTML += `
          <div class="comment-item mb-3 p-3 border rounded" data-comment-id="${commentId}">
            <div class="comment-header d-flex justify-content-between align-items-start mb-2">
              <div class="comment-meta">
                <small class="text-muted">
                  <i class="bi bi-chat me-1"></i>${formattedDate}${userInfo}
                  ${latestBadge}
                </small>
              </div>
              <button class="btn btn-sm btn-outline-secondary btn-edit-comment" 
                      data-comment-id="${commentId}"
                      title="Éditer ce commentaire">
                <i class="bi bi-pencil"></i>
              </button>
            </div>
            <div class="comment-content" data-original="${entry.content.replace(/"/g, '&quot;')}">
              ${entry.content}
            </div>
          </div>
        `;
      } else {
        // Modification (read-only)
        finalHTML += `
          <div class="history-item mb-3 p-3 border rounded bg-light">
            <div class="history-header d-flex justify-content-between align-items-start mb-2">
              <div class="history-meta">
                <small class="text-muted">
                  <i class="bi bi-arrow-right-circle me-1"></i>${formattedDate}${userInfo}
                  <span class="badge bg-secondary ms-2">Modification</span>
                </small>
              </div>
              <div class="text-muted">
                <i class="bi bi-lock" title="Lecture seule"></i>
              </div>
            </div>
            <div class="history-content text-muted">
              <strong>${entry.statut || 'Changement'}</strong>
              ${entry.note ? `<br><small>${entry.note}</small>` : ''}
            </div>
          </div>
        `;
      }
    });

    // Utiliser directement la timeline unifiée pour simplifier et améliorer
    let unifiedHTML = '';
    
    timeline.forEach((entry, index) => {
      const formattedDate = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const userInfo = entry.user ? ` par ${entry.user}` : '';
      const isLatest = index === 0;

      if (entry.type === 'comment') {
        // 💬 Commentaire (éditable)
        const latestBadge = isLatest ? '<span class="badge bg-success ms-2">Récent</span>' : '';
        const timestampString = entry.timestamp instanceof Date ? 
          entry.timestamp.toISOString() : String(entry.timestamp);
        const commentId = `comment-${timestampString.replace(/[^\d]/g, '')}`;
        
        unifiedHTML += `
          <div class="timeline-entry comment-item mb-3 p-3 border rounded border-primary" data-comment-id="${commentId}">
            <div class="timeline-header d-flex justify-content-between align-items-start mb-2">
              <div class="timeline-meta">
                <small class="text-muted">
                  <i class="bi bi-chat-fill me-1 text-primary"></i>${formattedDate}${userInfo}
                  <span class="badge bg-primary ms-2">💬 Commentaire</span>
                  ${latestBadge}
                </small>
              </div>
              <button class="btn btn-sm btn-outline-primary btn-edit-comment" 
                      data-comment-id="${commentId}"
                      title="Éditer ce commentaire">
                <i class="bi bi-pencil"></i>
              </button>
            </div>
            <div class="timeline-content comment-content fw-normal" data-original="${entry.content.replace(/"/g, '&quot;')}">
              ${entry.content}
            </div>
          </div>
        `;
      } else if (entry.type === 'status_change') {
        // 🔄 Changement de statut (read-only)
        unifiedHTML += `
          <div class="timeline-entry history-item mb-3 p-3 border rounded bg-light border-info">
            <div class="timeline-header d-flex justify-content-between align-items-start mb-2">
              <div class="timeline-meta">
                <small class="text-muted">
                  <i class="bi bi-arrow-right-circle-fill me-1 text-info"></i>${formattedDate}${userInfo}
                  <span class="badge bg-info ms-2">🔄 Statut</span>
                </small>
              </div>
              <div class="text-muted">
                <i class="bi bi-lock" title="Lecture seule"></i>
              </div>
            </div>
            <div class="timeline-content text-muted">
              <strong>${entry.statut || entry.status || 'Changement de statut'}</strong>
              ${entry.note || entry.details ? `<br><small>${entry.note || entry.details}</small>` : ''}
            </div>
          </div>
        `;
      } else {
        // ⚙️ Autre modification (read-only) 
        const actionIcon = entry.action === 'creation' ? 'bi-plus-circle-fill text-success' : 
                          entry.action === 'update' ? 'bi-pencil-square text-warning' : 
                          'bi-gear-fill text-secondary';
        
        const actionLabel = entry.action === 'creation' ? '➕ Création' :
                           entry.action === 'update' ? '✏️ Modification' :
                           '⚙️ Changement';
        
        unifiedHTML += `
          <div class="timeline-entry history-item mb-3 p-3 border rounded bg-light">
            <div class="timeline-header d-flex justify-content-between align-items-start mb-2">
              <div class="timeline-meta">
                <small class="text-muted">
                  <i class="${actionIcon} me-1"></i>${formattedDate}${userInfo}
                  <span class="badge bg-secondary ms-2">${actionLabel}</span>
                </small>
              </div>
              <div class="text-muted">
                <i class="bi bi-lock" title="Lecture seule"></i>
              </div>
            </div>
            <div class="timeline-content text-muted">
              ${entry.details || entry.note || 'Modification de la tâche'}
            </div>
          </div>
        `;
      }
    });

    accordionContent.innerHTML = unifiedHTML;
    
    this.logger.debug(`Unified timeline loaded: ${timeline.length} entries`);
  }

  /**
   * Affiche une erreur dans l'accordéon
   * @param {string} errorMessage - Message d'erreur
   */
  showAccordionError(errorMessage) {
    const accordionContent = document.getElementById('comment-history-content');
    const commentCountBadge = document.getElementById('comment-count-badge');
    
    if (accordionContent) {
      accordionContent.innerHTML = `
        <div class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle fs-4"></i>
          <p class="mt-2">${errorMessage}</p>
          <div class="mt-3">
            <button class="btn btn-sm btn-outline-primary" onclick="kanbanManager?.modalManager?.loadCommentHistoryInAccordion()">
              <i class="bi bi-arrow-clockwise me-1"></i>Réessayer
            </button>
          </div>
          <div class="mt-2">
            <small class="text-muted">
              Debug: 
              currentTaskId = ${this.currentTaskId || 'null'} | 
              currentTask = ${this.currentTask ? 'présent' : 'null'} | 
              historyManager = ${this.kanban?.historyManager ? 'présent' : 'null'}
            </small>
          </div>
        </div>
      `;
    }
    
    if (commentCountBadge) {
      commentCountBadge.textContent = '!';
      commentCountBadge.className = 'badge bg-danger ms-2';
    }
  }

  /**
   * Masque les détails de stratégie (fonction utilitaire)
   */
  hideStrategyDetails() {
    // Masquer les sections de détail stratégie si elles existent
    const strategyDetailsElements = document.querySelectorAll('.strategy-details, #strategy-details');
    strategyDetailsElements.forEach(element => {
      element.style.display = 'none';
    });
  }

  /**
   * Réinitialise l'accordéon historique des commentaires
   */
  resetCommentHistoryAccordion() {
    const accordionContent = document.getElementById('comment-history-content');
    const commentCountBadge = document.getElementById('comment-count-badge');
    const accordion = document.getElementById('comment-history-accordion');
    
    // Réinitialiser le contenu
    if (accordionContent) {
      accordionContent.innerHTML = `
        <div class="text-center text-muted py-3">
          <i class="bi bi-clock-history fs-4"></i>
          <p class="mt-2">Chargement de l'historique...</p>
        </div>
      `;
    }
    
    // Réinitialiser le badge
    if (commentCountBadge) {
      commentCountBadge.textContent = '0';
      commentCountBadge.className = 'badge bg-secondary ms-2';
    }
    
    // Fermer l'accordéon s'il est ouvert
    if (accordion && accordion.classList.contains('show')) {
      const bsCollapse = bootstrap.Collapse.getInstance(accordion);
      if (bsCollapse) {
        bsCollapse.hide();
      }
    }
  }

  /**
   * Ouvre la modal d'historique pour une tâche
   * @param {number} taskId - ID de la tâche
   */
  openHistoryModal(taskId) {
    if (!this.historyModal) {
      displayError('Modal d\'historique non disponible');
      return;
    }
    
    const task = this.kanban.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      displayError('Tâche non trouvée');
      return;
    }
    
    // Mettre à jour le titre
    const modalTitle = document.getElementById('history-modal-label');
    // Debug simplifié
    this.logger.debug(`Updating title for task ${taskId}`);
    
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique de la tâche #${taskId} - ${task.titre}
      `;
    } else {
      this.logger.error('History modal label element not found in DOM');
    }
    
    // Déléguer le rendu à HistoryManager
    if (this.kanban.historyManager) {
      this.kanban.historyManager.renderTaskHistory(task);
    }
    
    // Ouvrir la modal
    this.historyModal.show();
  }
  
  /**
   * Ferme toutes les modales ouvertes
   */
  closeAllModals() {
    this.logger.debug('Closing all modals');
    
    // Modales principales
    if (this.taskModal) {
      this.taskModal.hide();
    }
    
    if (this.historyModal) {
      this.historyModal.hide();
    }
    
    // JalonModal via KanbanManager
    if (this.kanban?.jalonManager?.jalonModal) {
      this.kanban.jalonManager.jalonModal.hide();
    }
    
    // DatePicker
    if (this.kanban?.datePickerManager?.closeDatePicker) {
      this.kanban.datePickerManager.closeDatePicker();
    }
    
    // Fermer toutes les modales Bootstrap génériques ouvertes
    $('.modal.show').each(function() {
      const modal = bootstrap.Modal.getInstance(this);
      if (modal) {
        modal.hide();
      }
    });
    
    // Nettoyer les backdrops orphelins
    setTimeout(() => {
      $('.modal-backdrop').remove();
      $('body').removeClass('modal-open');
    }, 300);
  }
  
  /**
   * Auto-resize d'un textarea
   * @param {Event} event - Événement input
   */
  autoResizeTextarea(event) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
  }
  
  /**
   * Peuple les options des selects depuis les données Grist
   */
  populateSelectOptions() {
    if (!this.kanban.gristOptions) return;
    
    const { urgence, impact, bureau, responsables, projet } = this.kanban.gristOptions;
    
    // Peupler les selects
    populateSelect('popup-urgence', urgence || [], true);
    populateSelect('popup-impact', impact || [], true);
    populateSelect('popup-projet', projet || [], true);
    
    // Peupler les cases à cocher
    this.logger.debug(`Populating options: ${bureau?.length || 0} bureau, ${responsables?.length || 0} responsables`);
    this.populateCheckboxOptions('popup-bureau-checkboxes', 'popup-bureau', bureau || []);
    this.populateCheckboxOptions('popup-qui-checkboxes', 'popup-qui', responsables || []);
  }
  
  /**
   * Peuple les options sous forme de cases à cocher
   */
  populateCheckboxOptions(containerId, selectId, options) {
    const container = document.getElementById(containerId);
    const hiddenSelect = document.getElementById(selectId);
    
    if (!container || !hiddenSelect) {
      this.logger.warn(`Container ${containerId} or select ${selectId} not found`);
      return;
    }
    
    
    // Vider le container
    container.innerHTML = '';
    
    // Vider et remplir le select caché (pour compatibilité)
    hiddenSelect.innerHTML = '';
    
    // Ajouter d'abord l'option 'L' dans le select caché
    const lOption = document.createElement('option');
    lOption.value = 'L';
    lOption.textContent = 'L';
    hiddenSelect.appendChild(lOption);
    
    options.forEach((option, index) => {
      if (option === 'L') return; // Ignorer complètement le marqueur 'L' dans les checkboxes
      
      // Créer la case à cocher
      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = 'form-check';
      
      const checkbox = document.createElement('input');
      checkbox.className = 'form-check-input';
      checkbox.type = 'checkbox';
      checkbox.id = `${selectId}-checkbox-${index}`;
      checkbox.value = option;
      checkbox.name = selectId; // Ajouter un name pour le groupement
      
      const label = document.createElement('label');
      label.className = 'form-check-label';
      label.htmlFor = checkbox.id;
      label.textContent = option;
      
      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(label);
      container.appendChild(checkboxDiv);
      
      // Ajouter l'option au select caché
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      hiddenSelect.appendChild(optionElement);
      
      // Event listener pour synchroniser avec le select caché
      checkbox.addEventListener('change', (e) => {
        this.syncCheckboxToSelect(containerId, selectId);
      });
    });
    
    
    // Test immédiat - créer une case à cocher de test si aucune option
    if (options.length <= 1) {
      this.logger.warn(`No options found for ${containerId}`);
      const testDiv = document.createElement('div');
      testDiv.className = 'form-check';
      testDiv.innerHTML = `
        <input class="form-check-input" type="checkbox" id="${selectId}-test" value="Test">
        <label class="form-check-label" for="${selectId}-test">Test Option</label>
      `;
      container.appendChild(testDiv);
    }
  }
  
  /**
   * Synchronise les cases à cocher avec le select caché
   */
  syncCheckboxToSelect(containerId, selectId) {
    const container = document.getElementById(containerId);
    const hiddenSelect = document.getElementById(selectId);
    
    if (!container || !hiddenSelect) {
      this.logger.warn(`Sync failed: ${containerId} or ${selectId} not found`);
      return;
    }
    
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const selectedValues = ['L']; // Toujours inclure le marqueur 'L'
    
    checkboxes.forEach(checkbox => {
      selectedValues.push(checkbox.value);
    });
    
    
    // Mettre à jour le select caché
    Array.from(hiddenSelect.options).forEach(option => {
      option.selected = selectedValues.includes(option.value);
    });
    
    // Déclencher un événement change pour informer les autres composants
    hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  /**
   * Synchronise le select caché vers les cases à cocher
   */
  syncSelectToCheckbox(containerId, selectId) {
    const container = document.getElementById(containerId);
    const hiddenSelect = document.getElementById(selectId);
    
    if (!container || !hiddenSelect) return;
    
    const selectedValues = Array.from(hiddenSelect.selectedOptions).map(option => option.value);
    
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = selectedValues.includes(checkbox.value);
    });
  }
  
  /**
   * Réinitialise le formulaire - Version jQuery simplifiée
   */
  resetTaskForm() {
    // Reset formulaire complet avec jQuery
    $('#task-form')[0].reset();
    
    // Reset selects multiples
    $('#popup-bureau').val(['L']);
    $('#popup-qui').val(['L']);
    
    // Reset checkboxes
    $('#popup-bureau-checkboxes input, #popup-qui-checkboxes input').prop('checked', false);
    
    // Reset description
    $('#popup-description').val('');
    
    // Reset stratégies
    this.resetStrategySelection();
    
    // Reset date picker
    if (this.kanban.datePickerManager) {
      this.kanban.datePickerManager.reset();
    }
    
    // Reset jalons - FORCE le nettoyage DOM complet
    if (this.kanban.jalonManager) {
      this.kanban.jalonManager.jalons = [];
      this.kanban.jalonManager.currentTaskId = null;
      
      // Force le nettoyage du DOM des jalons
      const jalonsContainer = document.querySelector('.jalons-list, [class*="jalon"]');
      if (jalonsContainer) {
        jalonsContainer.innerHTML = '';
      }
      
      // Nettoyer tous les éléments jalons visibles
      document.querySelectorAll('.jalon-item, .jalon-header, [class*="jalon-"]').forEach(el => {
        if (el.closest('.jalon-list, .jalons-container')) {
          el.remove();
        }
      });
      
      this.kanban.jalonManager.updateJalonsDisplay();
      this.kanban.jalonManager.saveJalonsToForm();
    }
  }
  
  /**
   * Valide les données du formulaire
   * @returns {boolean} True si valide
   */
  validateTaskData() {
    const titre = getFieldValue('popup-titre').trim();
    
    if (!titre) {
      displayError('Le titre est obligatoire');
      return false;
    }
    
    if (titre.length > 255) {
      displayError('Le titre ne peut pas dépasser 255 caractères');
      return false;
    }
    
    // Validation des bureaux
    const bureaux = getSelectedOptionsAsGristFormat('popup-bureau');
    if (bureaux.length <= 1) {
      displayError('Veuillez sélectionner au moins un bureau');
      return false;
    }
    
    return true;
  }
  
  /**
   * Configure la modal en mode lecture seule
   * @param {boolean} readOnly - Mode lecture seule
   */
  setReadOnlyMode(readOnly) {
    const formElements = document.querySelectorAll('#task-form input, #task-form select, #task-form textarea');
    
    formElements.forEach(element => {
      element.disabled = readOnly;
    });
    
    // Masquer les boutons d'action en mode lecture seule
    toggleVisibility('btn-save-task', !readOnly);
    toggleVisibility('btn-delete-task', !readOnly && !this.isNewTask);
    toggleVisibility('btn-ajout-projet', !readOnly);
    
    if (this.kanban.datePickerManager) {
      this.kanban.datePickerManager.setEnabled(!readOnly);
    }
  }
  
  /**
   * Gère les raccourcis clavier dans la modal
   * @param {KeyboardEvent} event - Événement clavier
   */
  handleModalKeyboard(event) {
    // Ctrl+S pour sauvegarder
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.saveTask();
    }
    
    // Echap pour fermer (si pas de modifications)
    if (event.key === 'Escape') {
      if (this.hasUnsavedChanges()) {
        if (confirmAction('Des modifications non sauvegardées seront perdues. Continuer ?')) {
          this.closeAllModals();
        }
      } else {
        this.closeAllModals();
      }
    }
  }
  
  /**
   * Vérifie s'il y a des modifications non sauvegardées
   * @returns {boolean} True s'il y a des modifications
   */
  hasUnsavedChanges() {
    if (this.isNewTask) {
      // Vérifier si des champs ont été remplis
      const titre = getFieldValue('popup-titre').trim();
      // Ne plus vérifier le champ description pour les changements
      return titre !== '';
    }
    
    if (!this.currentTask) return false;
    
    // Comparer avec les données originales
    const currentData = this.collectFormData();
    
    return (
      currentData.titre !== (this.currentTask.titre || '') ||
      currentData.projet !== (this.currentTask.projet || '') ||
      currentData.urgence !== (this.currentTask.urgence || '') ||
      currentData.impact !== (this.currentTask.impact || '')
      // Ajouter d'autres comparaisons selon les besoins
    );
  }
  
  /**
   * Configure les écouteurs pour la détection de modifications
   */
  setupChangeDetection() {
    const formElements = document.querySelectorAll('#task-form input, #task-form select, #task-form textarea');
    
    formElements.forEach(element => {
      element.addEventListener('change', () => {
        this.updateSaveButtonState();
      });
      
      element.addEventListener('input', () => {
        this.updateSaveButtonState();
      });
    });
  }
  
  /**
   * Met à jour l'état du bouton de sauvegarde
   */
  updateSaveButtonState() {
    const saveButton = document.getElementById('btn-save-task');
    if (!saveButton) return;
    
    const hasChanges = this.hasUnsavedChanges();
    const isValid = this.validateTaskData();
    
    saveButton.disabled = !isValid;
    
    if (hasChanges && isValid) {
      saveButton.classList.remove('btn-primary');
      saveButton.classList.add('btn-warning');
      saveButton.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Sauvegarder';
    } else {
      saveButton.classList.remove('btn-warning');
      saveButton.classList.add('btn-primary');
      saveButton.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Sauvegarder';
    }
  }
  
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    if (this.taskModal) {
      this.taskModal.dispose();
      this.taskModal = null;
    }
    
    if (this.historyModal) {
      this.historyModal.dispose();
      this.historyModal = null;
    }
    
    this.currentTask = null;
    this.currentTaskId = null;
    
    this.logger.debug('ModalManager resources cleaned up');
  }
  
  /**
   * Ouvre l'historique des commentaires de la tâche courante
   */
  viewCommentHistory() {
    if (!this.currentTaskId) {
      displayError('Aucune tâche sélectionnée');
      return;
    }
    
    // Utiliser le HistoryManager pour ouvrir l'historique
    if (this.kanban.historyManager) {
      this.kanban.historyManager.openTaskHistory(this.currentTaskId);
    } else {
      displayError('Gestionnaire d\'historique non disponible');
    }
  }
  
  /**
   * Vérifie si il y a des changements significatifs autres que les champs exclus
   * @param {object} oldData - Anciennes données
   * @param {object} newData - Nouvelles données
   * @param {Array} excludeFields - Champs à exclure de la comparaison
   * @returns {boolean} True si il y a des changements significatifs
   */
  hasSignificantChanges(oldData, newData, excludeFields = []) {
    if (!oldData || !newData) return false;
    
    const relevantFields = [
      'titre', 'statut', 'projet', 'urgence', 'impact', 'bureau', 'qui', 
      'strategie_id', 'date_debut', 'date_echeance', 'jalons'
    ];
    
    // Filtrer les champs exclus
    const fieldsToCheck = relevantFields.filter(field => !excludeFields.includes(field));
    
    for (const field of fieldsToCheck) {
      const oldValue = oldData[field];
      const newValue = newData[field];
      
      // Comparaison spéciale pour les jalons (JSON)
      if (field === 'jalons') {
        const oldJalonsStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue || []);
        const newJalonsStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue || []);
        if (oldJalonsStr !== newJalonsStr) {
          return true;
        }
      }
      // Comparaison spéciale pour les tableaux
      else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        const oldStr = oldValue.slice().sort().join(',');
        const newStr = newValue.slice().sort().join(',');
        if (oldStr !== newStr) {
          return true;
        }
      } else {
        // Comparaison normale
        if (oldValue !== newValue) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Vérifie si les jalons ont changé
   * @param {string|object|null} oldJalons - Anciens jalons
   * @param {string|object|null} newJalons - Nouveaux jalons
   * @returns {boolean} True si les jalons ont changé
   */
  hasJalonsChanged(oldJalons, newJalons) {
    // Normaliser en objects pour comparaison sémantique
    try {
      const oldObj = oldJalons ? (typeof oldJalons === 'string' ? JSON.parse(oldJalons) : oldJalons) : { jalons: [] };
      const newObj = newJalons ? (typeof newJalons === 'string' ? JSON.parse(newJalons) : newJalons) : { jalons: [] };
      
      // Normaliser les structures (s'assurer qu'elles ont la même forme)
      const normalizeJalons = (obj) => ({
        jalons: obj.jalons || [],
        lastModified: obj.lastModified || 0
      });
      
      const normalizedOld = normalizeJalons(oldObj);
      const normalizedNew = normalizeJalons(newObj);
      
      // Comparaison des jalons en tant que telle (ignorer lastModified sauf si les jalons changent)
      const oldJalonsArray = normalizedOld.jalons;
      const newJalonsArray = normalizedNew.jalons;
      
      const changed = JSON.stringify(oldJalonsArray) !== JSON.stringify(newJalonsArray);
      
      if (changed) {
        console.log('🔍 Jalons changed detected:', {
          old: oldJalonsArray,
          new: newJalonsArray
        });
      }
      
      return changed;
      
    } catch (error) {
      console.warn('Error parsing jalons in hasJalonsChanged:', error);
      // Fallback sur comparaison string
      const oldStr = typeof oldJalons === 'string' ? oldJalons : JSON.stringify(oldJalons || []);
      const newStr = typeof newJalons === 'string' ? newJalons : JSON.stringify(newJalons || []);
      return oldStr !== newStr;
    }
  }

  /**
   * Vérifie si les stratégies ont changé
   * @param {string|Array|null} oldStrategies - Anciennes stratégies
   * @param {string|Array|null} newStrategies - Nouvelles stratégies
   * @returns {boolean} True si changement détecté
   */
  hasStrategiesChanged(oldStrategies, newStrategies) {
    // Normaliser en strings pour comparaison
    const oldStr = typeof oldStrategies === 'string' ? oldStrategies : JSON.stringify(oldStrategies || []);
    const newStr = typeof newStrategies === 'string' ? newStrategies : JSON.stringify(newStrategies || []);
    return oldStr !== newStr;
  }

  /**
   * Compte le nombre de jalons dans un objet jalons
   * @param {string|object|null} jalons - Objet jalons
   * @returns {number} Nombre de jalons
   */
  getJalonsCount(jalons) {
    if (!jalons) return 0;
    
    try {
      const jalonsObj = typeof jalons === 'string' ? JSON.parse(jalons) : jalons;
      if (jalonsObj && jalonsObj.jalons && Array.isArray(jalonsObj.jalons)) {
        return jalonsObj.jalons.length;
      }
      return 0;
    } catch (error) {
      this.logger.warn('Error parsing jalons for count:', error.message);
      return 0;
    }
  }

  /**
   * Génère les détails des changements de jalons pour l'historique
   * @param {string|object|null} oldJalons - Anciens jalons
   * @param {string|object|null} newJalons - Nouveaux jalons
   * @returns {object} Détails des changements
   */
  getJalonsChangeDetails(oldJalons, newJalons) {
    try {
      // Parser les jalons
      const oldJalonsObj = oldJalons ? (typeof oldJalons === 'string' ? JSON.parse(oldJalons) : oldJalons) : { jalons: [] };
      const newJalonsObj = newJalons ? (typeof newJalons === 'string' ? JSON.parse(newJalons) : newJalons) : { jalons: [] };
      
      const oldJalonsList = oldJalonsObj.jalons || [];
      const newJalonsList = newJalonsObj.jalons || [];
      
      // Créer des maps pour faciliter la comparaison
      const oldJalonsMap = new Map(oldJalonsList.map(j => [j.id, j]));
      const newJalonsMap = new Map(newJalonsList.map(j => [j.id, j]));
      
      const added = [];
      const removed = [];
      const modified = [];
      
      // Détecter les ajouts et modifications
      newJalonsList.forEach(newJalon => {
        const oldJalon = oldJalonsMap.get(newJalon.id);
        if (!oldJalon) {
          added.push(newJalon);
        } else if (JSON.stringify(oldJalon) !== JSON.stringify(newJalon)) {
          modified.push({ old: oldJalon, new: newJalon });
        }
      });
      
      // Détecter les suppressions
      oldJalonsList.forEach(oldJalon => {
        if (!newJalonsMap.has(oldJalon.id)) {
          removed.push(oldJalon);
        }
      });
      
      // Générer le message
      const messages = [];
      
      if (added.length > 0) {
        const titres = added.map(j => `"${j.titre}"`).join(', ');
        messages.push(`Ajouté: ${titres}`);
      }
      
      if (modified.length > 0) {
        const titres = modified.map(m => `"${m.new.titre}"`).join(', ');
        messages.push(`Modifié: ${titres}`);
      }
      
      if (removed.length > 0) {
        const titres = removed.map(j => `"${j.titre}"`).join(', ');
        messages.push(`Supprimé: ${titres}`);
      }
      
      const message = messages.length > 0 ? messages.join(' | ') : 'Jalons modifiés';
      
      // Générer les résumés pour oldValue/newValue
      const oldSummary = oldJalonsList.map(j => `${j.titre} (${j.date})`).join(', ') || 'Aucun';
      const newSummary = newJalonsList.map(j => `${j.titre} (${j.date})`).join(', ') || 'Aucun';
      
      return {
        message,
        oldSummary,
        newSummary
      };
      
    } catch (error) {
      this.logger.warn('Error parsing jalons for details:', error.message);
      return {
        message: 'Jalons modifiés (erreur parsing)',
        oldSummary: 'Erreur',
        newSummary: 'Erreur'
      };
    }
  }

  /**
   * Génère les détails des changements de stratégies pour l'historique
   * @param {string|Array|null} oldStrategies - Anciennes stratégies
   * @param {string|Array|null} newStrategies - Nouvelles stratégies
   * @returns {object} Détails du changement
   */
  getStrategiesChangeDetails(oldStrategies, newStrategies) {
    try {
      // Parser les stratégies (peuvent être array d'IDs ou null)
      const oldIds = oldStrategies ? (Array.isArray(oldStrategies) ? oldStrategies : JSON.parse(oldStrategies)) : [];
      const newIds = newStrategies ? (Array.isArray(newStrategies) ? newStrategies : JSON.parse(newStrategies)) : [];
      
      // Normaliser en arrays
      const oldIdsArray = Array.isArray(oldIds) ? oldIds : [oldIds].filter(Boolean);
      const newIdsArray = Array.isArray(newIds) ? newIds : [newIds].filter(Boolean);
      
      // Chercher les stratégies correspondantes
      const getStrategyInfo = (id) => {
        const strategy = this.kanban.strategiesData?.find(s => s.id === id);
        return strategy ? `${strategy.objectif} → ${strategy.action}` : `Stratégie ID ${id}`;
      };
      
      const added = newIdsArray.filter(id => !oldIdsArray.includes(id));
      const removed = oldIdsArray.filter(id => !newIdsArray.includes(id));
      
      // Générer le message
      const messages = [];
      
      if (added.length > 0) {
        const strategyNames = added.map(id => `"${getStrategyInfo(id)}"`).join(', ');
        messages.push(`Ajouté: ${strategyNames}`);
      }
      
      if (removed.length > 0) {
        const strategyNames = removed.map(id => `"${getStrategyInfo(id)}"`).join(', ');
        messages.push(`Supprimé: ${strategyNames}`);
      }
      
      const message = messages.length > 0 ? messages.join(' | ') : 'Stratégies modifiées';
      
      // Générer les résumés pour oldValue/newValue
      const oldSummary = oldIdsArray.map(id => getStrategyInfo(id)).join(', ') || 'Aucune';
      const newSummary = newIdsArray.map(id => getStrategyInfo(id)).join(', ') || 'Aucune';
      
      return {
        message,
        oldSummary,
        newSummary
      };
      
    } catch (error) {
      this.logger.warn('Error parsing strategies for details:', error.message);
      return {
        message: 'Stratégies modifiées (erreur parsing)',
        oldSummary: 'Erreur',
        newSummary: 'Erreur'
      };
    }
  }
}
