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
import { referenceManager } from '../utils/ReferenceManager.js';
import { safeOn, cleanNamespace } from '../utils/EventManager.js';

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
    this.isPopulating = false; // Flag pour éviter la validation pendant le chargement

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
    this.setupReferenceField();
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
    
    const historyModalElement = document.getElementById('task-history-modal');
    if (historyModalElement) {
      this.historyModal = new bootstrap.Modal(historyModalElement, {
        backdrop: 'static',
        keyboard: true,
        focus: true
      });
    }
  }
  
  /**
   * Configure les écouteurs d'événements pour les modales
   */
  setupEventListeners() {
    // 🔧 CORRECTION: Utiliser EventManager pour éviter les écouteurs multiples
    cleanNamespace('modal'); // Nettoyer les anciens événements modal
    
    // Bouton nouvelle tâche
    safeOn('#btn-nouvelle-tache', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.logger.debug('Nouvelle tâche clicked (EventManager)');
      this.openTaskModal();
    }, 'modal');
    
    // Boutons de la modal
    safeOn('#btn-save-task', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.logger.debug('Save button clicked');
      this.saveTask();
    }, 'modal');
    
    safeOn('#btn-delete-task', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.logger.debug('Delete button clicked');
      this.deleteTask();
    }, 'modal');

    safeOn('#btn-duplicate-task', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.logger.debug('Duplicate button clicked');
      this.duplicateTask();
    }, 'modal');

    safeOn('#btn-toggle-history-panel', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.logger.debug('Toggle history panel button clicked');
      this.toggleHistoryPanel();
    }, 'modal');

    // Bouton ajouter projet
    // === ÉVÉNEMENTS BOOTSTRAP LIFECYCLE (exception autorisée) ===

    // Écouteur pour quand la modale de tâche est complètement affichée
    const taskModalElement = document.getElementById('popup-tache');
    if (taskModalElement) {
      taskModalElement.addEventListener('shown.bs.modal', () => {
        this.logger.debug('Task modal fully shown - refreshing jalons display');
        // Rafraîchir l'affichage des jalons maintenant que le DOM est prêt
        // Petit délai pour s'assurer que tout le contenu de la modale est rendu
        setTimeout(() => {
          if (this.kanban.jalonManager && !this.isNewTask) {
            this.logger.debug(`Calling updateJalonsDisplay - isNewTask: ${this.isNewTask}`);
            this.kanban.jalonManager.updateJalonsDisplay();
          }
        }, 50);
      });
    }

    // Écouteur pour quand l'accordéon s'ouvre (événement Bootstrap)
    document.addEventListener('shown.bs.collapse', (e) => {
      if (e.target.id === 'comment-history-accordion') {
        this.logger.debug('History accordion opened');
        this.loadCommentHistoryInAccordion();
        const panel = document.getElementById('task-history-panel');
        if (panel) {
          panel.classList.add('history-open');
        }
      }
    });

    document.addEventListener('hidden.bs.collapse', (e) => {
      if (e.target.id === 'comment-history-accordion') {
        const panel = document.getElementById('task-history-panel');
        if (panel) {
          panel.classList.remove('history-open');
        }
      }
    });

    // NOTE: Les événements suivants sont gérés dans EventCentralizer.js :
    // - #btn-ajout-projet (click) - ajout de projet
    // - #popup-urgence, #popup-impact (change) - calcul priorité
    // - #popup-description (input) - auto-resize textarea
    // - .strategy-tag-remove (click) - suppression tags stratégie (délégation)
    //
    // Les addEventListener sur éléments créés dynamiquement restent dans les méthodes
    // de création (ex: createObjectiveSection, createActionDiv) car ils sont attachés
    // au moment de la création de l'élément.
  }
  
  /**
   * Configure les listes déroulantes de stratégie
   */
  setupStrategySelects() {
    // Initialiser l'interface accordéon des stratégies
    this.setupStrategyAccordion();
  }

  /**
   * Configure le champ des références
   */
  setupReferenceField() {
    referenceManager.initializeField('popup-references', 'references-preview');
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
    // Diagnostic des données stratégiques
    console.log('🔍 DIAGNOSTIC STRATEGIES ModalManager:');
    console.log('  - kanban.strategiesData length:', this.kanban?.strategiesData?.length || 0);
    console.log('  - kanban.strategyData length:', this.kanban?.strategyData?.length || 0);
    
    // Récupérer les données depuis KanbanManager (cache ou Grist)
    const strategiesSource = this.kanban?.strategiesData || this.kanban?.strategyData;
    
    if (strategiesSource && strategiesSource.length > 0) {
      console.log(`✅ Rendu accordéon avec ${strategiesSource.length} stratégies`);
      this.renderStrategyAccordion(strategyBrowser);
    } else {
      console.log('❌ Aucune donnée stratégique disponible');
      this.renderFallbackStrategyAccordion(strategyBrowser);
    }
    
    // Configurer les événements pour la gestion multiple
    this.setupMultiStrategyEvents();
  }

  /**
   * Actualise l'accordéon des stratégies lorsqu'elles sont chargées
   * @param {Array} strategies - Données de stratégies depuis Grist
   */
  handleStrategyDataLoaded(strategies = []) {
    const strategyBrowser = document.getElementById('strategy-browser');
    if (!strategyBrowser) {
      return;
    }

    if (!Array.isArray(strategies) || strategies.length === 0) {
      this.selectedStrategies = [];
      this.renderFallbackStrategyAccordion(strategyBrowser);
      this.updateStrategyTags();
      this.updateStrategyPreview();
      this.updateStrategyIds();
      return;
    }

    const previouslySelectedIds = new Set(
      Array.isArray(this.selectedStrategies)
        ? this.selectedStrategies.map(s => s.id)
        : []
    );

    this.kanban.strategiesData = strategies;

    this.renderStrategyAccordion(strategyBrowser);
    this.setupMultiStrategyEvents();
    this.restoreStrategySelections(previouslySelectedIds);
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
    header.dataset.toggleTarget = 'strategy-content'; // Pour délégation EventCentralizer
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

    // NOTE: Événement click géré par EventCentralizer.js via délégation
    // (supprimé pour éviter l'accumulation de handlers)

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
    actionDiv.dataset.objectif = objectif;
    actionDiv.dataset.sousObjectif = sousObjectif;
    actionDiv.dataset.action = action;

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

    // NOTE: Événement .strategy-action géré par EventCentralizer.js ligne 304-324
    // (supprimé pour éviter l'accumulation de handlers à chaque render)

    return actionDiv;
  }

  restoreStrategySelections(selectedIds) {
    if (!(selectedIds instanceof Set) || selectedIds.size === 0) {
      this.selectedStrategies = [];
      this.updateStrategyPreview();
      this.updateStrategyIds();
      return;
    }

    const restored = this.kanban.strategiesData.filter(strategy => selectedIds.has(strategy.id));
    this.selectedStrategies = restored;

    restored.forEach(strategy => {
      const actionCard = document.querySelector(`[data-strategy-id="${strategy.id}"]`);
      if (actionCard) {
        actionCard.classList.add('selected');
        const indicator = actionCard.querySelector('.strategy-selected-indicator');
        if (indicator) {
          indicator.style.display = 'block';
        }
      }
    });

    this.updateStrategyTags();
    this.updateStrategyPreview();
    this.updateStrategyIds();
  }
  
  /**
   * Toggle une stratégie (ajout/suppression)
   */
  selectStrategy(strategy, objectif, sousObjectif, action, evt) {
    if (!strategy || !evt) return;

    const actionCard = evt.currentTarget;
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
    
    // NOTE: Les événements de suppression des tags sont gérés par EventCentralizer.js
    // via délégation sur le sélecteur .strategy-tag-remove
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
    // NOTE: Bouton "Tout désélectionner" géré par EventCentralizer.js
    // (#btn-clear-strategies via délégation)
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
   * Génère l'interface sans données stratégiques
   */
  renderFallbackStrategyAccordion(container) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        <strong>Stratégies non disponibles</strong>
        <p class="mb-0 mt-2">Les données stratégiques ne sont pas chargées. 
        Cette fonctionnalité est optionnelle pour la gestion des tâches.</p>
        <p class="mb-0 mt-2"><small class="text-muted">
        Cause probable : Grist ne peut se connecter qu'à une seule table à la fois.
        </small></p>
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
      
      console.log(`✅ Final selectedStrategies:`, this.selectedStrategies);
      console.log(`   selectedStrategies.length:`, this.selectedStrategies.length);
      
      this.logger.debug(`Pre-selected strategies: ${this.selectedStrategies.length} items`);
    } else {
      console.log(`❌ Strategy data not available - strategiesData:`, this.kanban.strategiesData?.length || 0);
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
      if (Array.isArray(gristReferences)) {
        // Format Grist ReferenceList: ['L', id1, id2, id3, ...]
        if (gristReferences.length > 0 && gristReferences[0] === 'L') {
          strategyIds = gristReferences.slice(1); // Prendre tout sauf le 'L'
        } else {
          // Fallback pour ancien format
          strategyIds = gristReferences.filter(id => id !== 'L');
        }
      } else if (typeof gristReferences === 'string') {
        const parsed = JSON.parse(gristReferences);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] === 'L') {
          strategyIds = parsed.slice(1);
        }
      } else {
        // Fallback: ID simple
        strategyIds = [gristReferences];
      }
    } catch (e) {
      this.logger.warn('Error parsing Grist references:', e.message);
      return;
    }
    
    console.log(`   Extracted strategy IDs:`, strategyIds);
    console.log(`   strategyIds.length:`, strategyIds.length);
    
    this.logger.debug(`Extracted strategy IDs: ${strategyIds.length} items`);
    
    if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
      console.log(`❌ No valid strategy IDs - returning`);
      return;
    }
    
    // Charger les stratégies correspondantes
    console.log(`   Available strategies data:`, this.kanban.strategiesData?.length || 0);
    if (this.kanban.strategiesData && this.kanban.strategiesData.length > 0) {
      let strategiesFromDB = [];
      
      strategyIds.forEach(strategyId => {
        console.log(`   Processing strategy ID:`, strategyId, typeof strategyId);
        // Ignorer les IDs invalides ou vides (même logique que dans populateStrategyFieldsFromGristReferences)
        if (!strategyId || strategyId === 'L' || (Array.isArray(strategyId) && strategyId.length === 0)) {
          this.logger.debug('Skipping invalid strategy ID in loadStrategiesFromIds:', strategyId);
          return; // Continue to next iteration
        }
        
        const strategy = this.kanban.strategiesData.find(s => s.id == strategyId);
        console.log(`   Found strategy:`, strategy ? `${strategy.id} - ${strategy.objectif}` : 'NOT FOUND');
        if (strategy) {
          strategiesFromDB.push(strategy);
          this.addStrategyToSelection(strategy);
          this.preSelectStrategyInAccordion(strategy);
        } else {
          console.log(`❌ Strategy not found for ID ${strategyId}`);
          console.log(`   Available IDs:`, this.kanban.strategiesData.map(s => s.id).slice(0, 10));
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
    const strategiesContainer = $('.strategies-list, [class*="strategy"]');
    if (strategiesContainer.length) {
      // Ne pas vider complètement mais reset les sélections
      $('.strategy-tag, .selected-strategies-tags')
        .filter((_, el) => $(el).closest('.selected-strategies-container, .strategy-tags-container').length > 0)
        .remove();
    }
    
    // Nettoyer tous les éléments stratégies sélectionnées visibles
    $('.strategy-tag, .selected-strategies-container [style*="display: block"]').each((_, el) => {
      const element = $(el);
      if (element.hasClass('strategy-tag')) {
        element.remove();
      } else if (element.hasClass('selected-strategies-container')) {
        element.hide();
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
   * Ouvre la modal de tâche par ID
   * @param {number} taskId - ID de la tâche à ouvrir
   */
  openTaskModalById(taskId) {
    this.logger.debug('openTaskModalById appelé avec ID:', taskId);
    
    if (!taskId) {
      this.openTaskModal(); // Nouvelle tâche
      return;
    }
    
    // Récupérer la tâche depuis les données actuelles
    const task = this.kanban.currentRecords?.find(r => r.id === parseInt(taskId));
    
    if (!task) {
      this.logger.error('Tâche non trouvée pour ID:', taskId);
      displayError(`Tâche ${taskId} non trouvée`);
      return;
    }
    
    this.openTaskModal(task);
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
    
    // Validation du paramètre : si ce n'est pas null, ça doit être un objet avec un id
    if (task !== null && (typeof task !== 'object' || typeof task === 'number')) {
      this.logger.error('openTaskModal appelé avec un paramètre invalide:', task);
      displayError('Erreur: paramètre invalide. Utilisez openTaskModalById() pour ouvrir par ID.');
      return;
    }
    
    // CORRECTIF: Nettoyer les backdrops orphelins avant d'ouvrir
    if (this.kanban.historyManager?.cleanupOrphanBackdrops) {
      this.kanban.historyManager.cleanupOrphanBackdrops();
    }

    // Flag pour éviter la validation pendant le chargement
    this.isPopulating = true;

    // ✅ RESET intelligent : seulement si nouvelle tâche ou changement de tâche
    const isChangingTask = !task || this.currentTaskId !== task?.id;
    if (isChangingTask) {
      this.resetTaskForm();
    }

    // CORRECTIF: Vérifier id ET id_task pour déterminer si c'est une nouvelle tâche
    // Certaines tâches peuvent avoir id_task mais pas id (ou vice versa)
    const resolvedTaskId = task?.id ?? task?.id_task ?? null;
    this.isNewTask = !task || !resolvedTaskId;
    this.currentTask = task;
    this.currentTaskId = resolvedTaskId;

    // Log de debug pour diagnostiquer les problèmes de mise à jour
    this.logger.debug(`openTaskModal: task=${task ? 'present' : 'null'}, task.id=${task?.id}, task.id_task=${task?.id_task}, resolvedTaskId=${resolvedTaskId}, isNewTask=${this.isNewTask}`);

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

    // Peupler les options des selects d'abord
    this.populateSelectOptions();

    // Peupler les champs APRÈS avoir configuré les caches
    this.populateTaskForm(task);

    // Fin du chargement - activer la validation
    this.isPopulating = false;
    
    // Afficher/masquer les boutons supprimer et dupliquer
    toggleVisibility('btn-delete-task', !this.isNewTask, 'inline-block');
    toggleVisibility('btn-duplicate-task', !this.isNewTask, 'inline-block');

    // Ouvrir la modal
    this.taskModal.show();

    // NOTE: L'affichage des jalons est rafraîchi via l'événement 'shown.bs.modal'
    // (voir setupEventListeners() ligne 121) pour garantir que le DOM est prêt

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
      }
    });

    // NOTE: Événements de focus/click gérés par EventCentralizer.js via délégation
    // (plus besoin de listeners individuels - dataset.focusHandlerAdded supprimé)
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

    // NOTE: Événements gérés par EventCentralizer.js via délégation
    // (addEventListener click/focus/blur/mouseenter supprimés - gérés globalement)
  }
  
  /**
   * Peuple le formulaire avec les données d'une tâche
   * @param {object} task - Données de la tâche
   */
  // === REMPLISSAGE DU FORMULAIRE CORRIGÉ ===
  populateTaskForm(tache, isNewTask) {
    const task = tache ? { ...tache } : {};
    const resolvedId = task.id ?? task.id_task ?? null;

    this.logger.debug(`populateTaskForm: tache.id=${tache?.id}, tache.id_task=${tache?.id_task}, resolvedId=${resolvedId}, this.isNewTask=${this.isNewTask}`);

    // Si on a un ID résolu mais pas de task.id, ajouter l'id à task pour cohérence
    if (resolvedId !== null && typeof task.id === 'undefined') {
      task.id = resolvedId;
    }

    // Utiliser le paramètre isNewTask s'il est fourni explicitement
    if (isNewTask !== undefined) {
      this.isNewTask = isNewTask;
    }

    // CORRECTIF: Ne pas écraser currentTaskId si déjà défini correctement
    // Utiliser resolvedId seulement si cohérent avec l'état actuel
    if (!this.isNewTask) {
      // Mode édition : s'assurer qu'on a un ID valide
      if (resolvedId !== null) {
        this.currentTaskId = resolvedId;
        this.currentTask = task;
      } else {
        // Pas d'ID résolu mais pas en mode nouvelle tâche - incohérence
        this.logger.warn(`populateTaskForm: Incohérence - isNewTask=false mais resolvedId=null`);
      }
    } else {
      // Nouvelle tâche - pas d'ID
      this.currentTaskId = null;
      this.currentTask = null;
    }

    // Champs de base
    setFieldValue('popup-titre', task.titre || '');
    
    // Description - TOUJOURS VIDE pour saisie de nouveaux commentaires
    // Les anciens commentaires sont visibles dans l'historique, pas dans la zone de saisie
    setFieldValue('popup-description', '');

    // Réinitialiser l'accordéon historique
    this.resetCommentHistoryAccordion();

    // Statut (lecture seule)
    const statut = task.statut || (this.isNewTask ? 'Backlog' : '');
    setFieldValue('popup-statut-text', statut);
    task.statut = statut;

    this.prefillHistorySummaryFromTask(task);

    // Projet
    setFieldValue('popup-projet', task.projet || '');
    
    // Urgence et Impact
    setFieldValue('popup-urgence', task.urgence || '');
    setFieldValue('popup-impact', task.impact || '');
    
    // Priorité calculée automatiquement
    const prioriteCalculee = this.calculatePriorite(task.urgence || '', task.impact || '');
    setFieldValue('popup-priorite-calculee', prioriteCalculee);
    
    // Stratégies depuis Grist - gérer le format références multiples
    if (task.strategie_id) {
      // Le champ strategie_id contient maintenant les références multiples
      this.populateStrategyFieldsFromGristReferences(task.strategie_id);
    } else {
      // Aucune stratégie - réinitialiser
      this.resetStrategySelection();
    }

    const ensureGristList = (values) => {
      if (!Array.isArray(values)) {
        return ['L'];
      }

      const normalized = values
        .filter(value => typeof value === 'string' && value.trim() && value !== 'L')
        .map(value => value.trim());

      const unique = [...new Set(normalized)];
      return ['L', ...unique];
    };

    // Bureaux et responsables (selects multiples)
    const bureauList = ensureGristList(task.bureau);
    const responsablesList = ensureGristList(task.qui);

    setSelectedOptions('popup-bureau', bureauList);
    setSelectedOptions('popup-qui', responsablesList);

    // Synchroniser avec les cases à cocher
    this.syncSelectToCheckbox('popup-bureau-checkboxes', 'popup-bureau');
    this.syncSelectToCheckbox('popup-qui-checkboxes', 'popup-qui');

    // IMPORTANT: Re-synchroniser dans l'autre sens pour s'assurer que le select caché est à jour
    // (car cocher programmatiquement ne déclenche pas l'événement change)
    this.syncCheckboxToSelect('popup-bureau-checkboxes', 'popup-bureau');
    this.syncCheckboxToSelect('popup-qui-checkboxes', 'popup-qui');

    // Références et documentation (extraire depuis le champ notes)
    let referencesValue = '';
    if (task.notes) {
      try {
        const notesData = JSON.parse(task.notes);
        referencesValue = notesData.references || '';
      } catch (e) {
        // Si les notes ne sont pas du JSON valide, ignorer
      }
    }
    setFieldValue('popup-references', referencesValue);
    
    // Forcer la mise à jour de l'aperçu des références
    const preview = document.getElementById('references-preview');
    if (preview) {
      referenceManager.updatePreview(referencesValue, preview);
    }
    
    // Charger les jalons si disponibles
    if (this.kanban.jalonManager) {
      this.logger.debug(`Processing jalons: ${typeof task.jalons} - ${task.jalons}`);
      this.kanban.jalonManager.loadJalonsFromTask(task);
    }

    this.logger.debug('Task form populated');

    if (!this.isNewTask && (this.currentTaskId || this.currentTask)) {
      this.loadCommentHistoryInAccordion({ previewOnly: true });
    }
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
      
      // Validation critique - vérifier que l'ID est bien défini pour une mise à jour
      if (!this.isNewTask && (!this.currentTaskId || this.currentTaskId === null)) {
        // Tentative de récupération depuis currentTask (id ou id_task)
        const recoveredId = this.currentTask?.id ?? this.currentTask?.id_task ?? null;
        if (recoveredId) {
          this.currentTaskId = recoveredId;
          this.logger.warn(`saveTask: ID récupéré depuis currentTask: ${recoveredId}`);
        } else {
          this.logger.error(`saveTask: ID manquant - isNewTask=${this.isNewTask}, currentTaskId=${this.currentTaskId}, currentTask.id=${this.currentTask?.id}, currentTask.id_task=${this.currentTask?.id_task}`);
          displayError('Erreur: ID de tâche manquant pour la mise à jour');
          return;
        }
      }

      // Log de debug avant sauvegarde
      this.logger.debug(`saveTask: isNewTask=${this.isNewTask}, currentTaskId=${this.currentTaskId}`);
      
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
          
          // ✅ VÉRIFIER CHANGEMENT DE RÉFÉRENCES
          const oldReferences = this.extractReferencesFromNotes(this.currentTask?.notes);
          const newReferences = referenceManager.cleanReferences(getFieldValue('popup-references'));
          
          if (oldReferences !== newReferences) {
            const changeDescription = this.describeReferenceChange(oldReferences, newReferences);
            if (changeDescription) {
              historyPromises.push(
                userActionManager.addHistoryEntry(
                  this.currentTaskId,
                  'field_update',
                  changeDescription,
                  oldReferences || '',
                  newReferences || '',
                  gristData.statut || this.currentTask?.statut
                )
              );
            }
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
  /**
   * Collecte les données de stratégies sélectionnées
   * @returns {Array|null} Format Grist pour strategie_id
   */
  collectStrategyData() {
    
    if (!this.selectedStrategies || this.selectedStrategies.length === 0) {
      this.logger.debug('No strategies to collect - returning null');
      return null;
    }

    // Format Grist ReferenceList: ['L', id1, id2, id3, ...] comme bureau et qui
    const strategyIds = this.selectedStrategies.map(s => s.id);
    const gristFormat = ['L', ...strategyIds];
    this.logger.debug(`Strategies collected: ${strategyIds.length} items`, gristFormat);
    return gristFormat;
  }

  collectFormData() {
    // ✅ Synchroniser les checkboxes vers les selects cachés AVANT de collecter les données
    // Cela garantit que les valeurs des checkboxes sont bien reflétées dans les selects
    this.syncCheckboxToSelect('popup-bureau-checkboxes', 'popup-bureau');
    this.syncCheckboxToSelect('popup-qui-checkboxes', 'popup-qui');

    const data = {
      titre: getFieldValue('popup-titre').trim(),
      statut: getFieldValue('popup-statut-text'),
      projet: getFieldValue('popup-projet').trim() || null,
      urgence: getFieldValue('popup-urgence') || null,
      impact: getFieldValue('popup-impact') || null,
      bureau: getSelectedOptionsAsGristFormat('popup-bureau'),
      qui: getSelectedOptionsAsGristFormat('popup-qui'),
      strategie_id: this.collectStrategyData(), // Collecte spécialisée stratégies
      jalons: this.kanban.jalonManager ? this.kanban.jalonManager.getJalonsForSave() : null
    };

    // Préserver les champs mission/MEO de la tâche courante (non modifiables dans le formulaire)
    if (this.currentTask && !this.isNewTask) {
      const missionFields = [
        'mission_code', 'mission_nom', 'mission_responsable', 'mission_bureau',
        'mission_priorite', 'mission_date_debut', 'mission_date_fin',
        'sous_action_code', 'sous_action_nom', 'categorie',
        'sous_action_charge_estimee', 'sous_action_charge_reelle',
        'est_classifiee'
      ];

      missionFields.forEach(field => {
        if (this.currentTask[field] !== undefined && this.currentTask[field] !== null) {
          data[field] = this.currentTask[field];
        }
      });

      this.logger.debug(`Champs mission préservés: ${missionFields.filter(f => data[f]).join(', ')}`);
    }

    this.logger.debug(`Collecting form data: ${data.titre || 'untitled'} (${data.statut})`);
    this.logger.debug(`Bureaux collectés: ${JSON.stringify(data.bureau)}, Agents collectés: ${JSON.stringify(data.qui)}`);

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
    
    // Pour strategie_id (ReferenceList multiples), valider le format ['L', id1, id2, ...]
    if (gristData.strategie_id) {
      if (Array.isArray(gristData.strategie_id) && gristData.strategie_id.length >= 1 && gristData.strategie_id[0] === 'L') {
        // Format ReferenceList correct: ['L', id1, id2, id3, ...]
        const strategyIds = gristData.strategie_id.slice(1); // Tout sauf le 'L'
        
        // VALIDATION: Vérifier que tous les IDs existent dans les stratégies
        const validIds = [];
        const invalidIds = [];
        
        strategyIds.forEach(id => {
          if (id && !isNaN(id)) {
            const strategyExists = this.kanban.strategiesData?.find(s => s.id == id);
            if (strategyExists) {
              validIds.push(parseInt(id));
            } else {
              invalidIds.push(id);
            }
          } else {
            invalidIds.push(id);
          }
        });
        
        if (validIds.length > 0) {
          gristData.strategie_id = ['L', ...validIds];  // Format correct pour ReferenceList multiple
          console.log(`✅ ${validIds.length} stratégies validées:`, validIds);
          if (invalidIds.length > 0) {
            console.warn(`⚠️ ${invalidIds.length} stratégies invalides ignorées:`, invalidIds);
          }
        } else {
          console.warn(`⚠️ Aucune stratégie valide trouvée, suppression de la référence`);
          gristData.strategie_id = null;
        }
      } else {
        console.warn(`⚠️ Format strategie_id invalide (attendu: ['L', id1, id2, ...]):`, gristData.strategie_id);
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
    console.log('   Type:', typeof gristData.jalons);
    console.log('   Valeur brute:', gristData.jalons);
    
    if (gristData.jalons !== null && gristData.jalons !== undefined) {
      if (typeof gristData.jalons !== 'string') {
        console.log('⚠️ Jalons pas au format string, conversion...');
        gristData.jalons = JSON.stringify(gristData.jalons || []);
      }
      console.log('✅ Jalons après traitement:', gristData.jalons);
    } else {
      console.log('❌ Jalons null/undefined, valeur par défaut');
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
    
    // Gérer les références dans le champ notes
    const referencesText = referenceManager.cleanReferences(getFieldValue('popup-references'));
    const existingReferences = this.extractReferencesFromNotes(this.currentTask?.notes);
    const shouldUpdateReferences = this.isNewTask
      ? Boolean(referencesText)
      : referencesText !== existingReferences;

    if (shouldUpdateReferences) {
      try {
        // Parser les notes existantes ou créer une nouvelle structure
        let notesData;
        if (this.currentTask?.notes) {
          try {
            notesData = JSON.parse(this.currentTask.notes);
          } catch (e) {
            // Si les notes existantes ne sont pas du JSON valide, créer une nouvelle structure
            notesData = { content: this.currentTask.notes || "", history: [] };
          }
        } else {
          notesData = { content: "", history: [] };
        }

        if (!Array.isArray(notesData.history)) {
          notesData.history = [];
        }

        // Ajouter les références
        notesData.references = referencesText || "";

        // Sérialiser les notes mises à jour
        gristData.notes = JSON.stringify(notesData);
      } catch (error) {
        this.logger.error('Error preparing notes with references:', error);
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

  /**
   * Duplique la tâche actuelle
   * Crée une copie de la tâche avec le statut "À faire" et un titre modifié
   * Préserve le lien mission/MEO
   */
  async duplicateTask() {
    if (!this.currentTaskId || this.isNewTask) {
      displayError('Aucune tâche à dupliquer');
      return;
    }

    try {
      // Collecter les données actuelles du formulaire
      const taskData = this.collectFormData();

      // Modifier les données pour la copie
      const duplicateData = { ...taskData };

      // Modifier le titre pour indiquer la copie
      const originalTitle = duplicateData.titre || 'Sans titre';
      duplicateData.titre = `Copie de ${originalTitle}`;

      // Remettre le statut à "À faire" pour la nouvelle tâche
      duplicateData.statut = 'À faire';

      // Ne pas copier les dates de début (la tâche est nouvelle)
      duplicateData.date_debut = null;

      // Conserver le lien mission/MEO de la tâche originale
      // (déjà inclus via collectFormData qui préserve ces champs)

      // Préparer les données pour Grist
      const gristData = this.prepareTaskDataForGrist(duplicateData);

      // Créer la nouvelle tâche
      const action = ['AddRecord', TABLE_ID, null, gristData];
      const result = await grist.docApi.applyUserActions([action]);

      // Enregistrer l'action utilisateur pour la création
      const userActionManager = getUserActionManager();
      if (userActionManager && result && result.retValues && result.retValues[0]) {
        const newTaskId = result.retValues[0];
        await userActionManager.createTaskAction(newTaskId, gristData);

        // Ajouter une entrée d'historique pour la duplication
        await userActionManager.addHistoryEntry(
          newTaskId,
          'creation',
          `Tâche dupliquée depuis la tâche #${this.currentTaskId}`,
          '',
          originalTitle,
          'À faire'
        );
      }

      displaySuccess(`Tâche dupliquée avec succès`);

      // Signaler la mise à jour locale
      if (this.kanban.signalLocalUpdate) {
        this.kanban.signalLocalUpdate();
      }

      // Fermer la modal actuelle
      this.closeAllModals();

      // Rafraîchir le kanban
      setTimeout(() => {
        if (this.kanban && this.kanban.refreshKanban) {
          this.kanban.refreshKanban();
        }
      }, 100);

    } catch (error) {
      this.logger.error('Task duplication failed:', error.message);
      displayError(`Erreur lors de la duplication: ${error.message}`);
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

  toggleHistoryPanel() {
    const panel = document.getElementById('task-history-panel');
    if (!panel) return;

    const collapseElement = panel.querySelector('#comment-history-accordion');
    const collapseInstance = collapseElement
      ? bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false })
      : null;

    const shouldOpen = !panel.classList.contains('history-open');
    panel.classList.toggle('history-open', shouldOpen);

    if (!collapseInstance) {
      if (shouldOpen) {
        this.loadCommentHistoryInAccordion();
      }
      return;
    }

    if (shouldOpen) {
      collapseInstance.show();
      setTimeout(() => {
        this.loadCommentHistoryInAccordion();
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    } else {
      collapseInstance.hide();
    }
  }

  updateHistorySummary(historyData) {
    const lastUpdateElement = document.getElementById('history-last-update');
    const ownersElement = document.getElementById('history-resume-owners');
    const statusElement = document.getElementById('history-resume-status');

    if (!lastUpdateElement && !ownersElement && !statusElement) {
      return;
    }

    const { timeline = [], task = {} } = historyData;
    const lastEntry = timeline[0];

    if (lastUpdateElement) {
      if (lastEntry?.timestamp) {
        const date = new Date(lastEntry.timestamp);
        lastUpdateElement.textContent = date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        lastUpdateElement.textContent = 'Aucune activité récente';
      }
    }

    const formatList = (values) => {
      if (!values) return '-';
      if (Array.isArray(values)) {
        const cleaned = values.filter(item => item && item !== 'L');
        return cleaned.length ? cleaned.join(', ') : '-';
      }
      if (typeof values === 'string') {
        return values && values !== 'L' ? values : '-';
      }
      return '-';
    };

    if (ownersElement) {
      ownersElement.textContent = formatList(task.qui);
    }

    if (statusElement) {
      const status = lastEntry?.statut || task.statut || '-';
      statusElement.textContent = status;
    }
  }

  /**
   * Met à jour le badge comptant les entrées d'historique
   * @param {number} totalEntries - Nombre d'entrées dans l'historique
   */
  updateHistoryCounter(totalEntries = 0) {
    const commentCountBadge = document.getElementById('comment-count-badge');
    if (!commentCountBadge) return;

    const safeTotal = Number.isFinite(totalEntries) ? totalEntries : 0;
    commentCountBadge.textContent = safeTotal;
    commentCountBadge.className = safeTotal > 0 ? 'badge bg-info ms-2' : 'badge bg-secondary ms-2';
  }

  /**
   * Pré-remplit le résumé historique à partir des données de la tâche
   * @param {object} task - Données de la tâche courante
   */
  prefillHistorySummaryFromTask(task = {}) {
    const ownersElement = document.getElementById('history-resume-owners');
    const statusElement = document.getElementById('history-resume-status');
    const lastUpdateElement = document.getElementById('history-last-update');

    if (ownersElement) {
      let owners = [];

      if (Array.isArray(task.qui)) {
        owners = task.qui.filter(value => value && value !== 'L');
      } else if (typeof task.qui === 'string' && task.qui.trim()) {
        owners = [task.qui.trim()];
      }

      ownersElement.textContent = owners.length > 0 ? owners.join(', ') : 'Non attribuée';
    }

    if (statusElement) {
      statusElement.textContent = task.statut || 'Non défini';
    }

    if (lastUpdateElement) {
      const dateCandidate = task.date_derniere_maj || task.date_modif || task.datenow || null;

      if (dateCandidate) {
        const parsedDate = new Date(dateCandidate);
        if (!Number.isNaN(parsedDate.getTime())) {
          lastUpdateElement.textContent = parsedDate.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } else {
          lastUpdateElement.textContent = 'Dernière mise à jour inconnue';
        }
      } else {
        lastUpdateElement.textContent = this.isNewTask ? 'Nouvelle tâche' : 'Aucune activité récente';
      }
    }

    this.updateHistoryCounter(0);
  }

  /**
   * Charge l'historique des commentaires dans l'accordéon de la modale
   */
  loadCommentHistoryInAccordion(options = {}) {
    const { previewOnly = false } = options;

    this.logger.debug(`Loading comment history for task ${this.currentTaskId} (previewOnly=${previewOnly})`);

    // Afficher un message de chargement uniquement si besoin
    const accordionContent = document.getElementById('comment-history-content');
    if (!previewOnly && accordionContent) {
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
      
      if (previewOnly) {
        const totalEntries = Array.isArray(historyData?.timeline) ? historyData.timeline.length : 0;
        this.updateHistorySummary(historyData);
        this.updateHistoryCounter(totalEntries);
        return historyData;
      }

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

    if (!accordionContent) {
      this.logger.error('Accordion content element not found');
      return;
    }

    const { comments = [], timeline = [], history = [], task = {} } = historyData || {};

    // Utiliser la timeline complète qui contient TOUT (commentaires + changements de statut + modifications)
    const totalEntries = Array.isArray(timeline) ? timeline.length : 0;

    this.updateHistorySummary(historyData);
    this.updateHistoryCounter(totalEntries);

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
      this.updateHistoryCounter(0);
    }

    // Fermer l'accordéon s'il est ouvert
    if (accordion && accordion.classList.contains('show')) {
      const bsCollapse = bootstrap.Collapse.getInstance(accordion);
      if (bsCollapse) {
        bsCollapse.hide();
      }
    }

    const panel = document.getElementById('task-history-panel');
    if (panel) {
      panel.classList.remove('history-open');
    }

    const lastUpdateElement = document.getElementById('history-last-update');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = 'En attente de sélection';
    }

    const ownersElement = document.getElementById('history-resume-owners');
    if (ownersElement) {
      ownersElement.textContent = '-';
    }

    const statusElement = document.getElementById('history-resume-status');
    if (statusElement) {
      statusElement.textContent = '-';
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
    const modalTitle = document.getElementById('task-history-modal-label');
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
    
    const {
      urgence = [],
      urgences = [],
      impact = [],
      impacts = [],
      bureau = [],
      bureaux = [],
      responsables = [],
      qui = [],
      projet = [],
      projets = []
    } = this.kanban.gristOptions;

    const sanitizeList = (values) => {
      if (!Array.isArray(values)) return [];
      return [...new Set(values
        .filter(value => typeof value === 'string' && value.trim() && value !== 'L')
        .map(value => value.trim())
      )].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    };

    const urgenceOptions = sanitizeList(urgence.length ? urgence : urgences);
    const impactOptions = sanitizeList(impact.length ? impact : impacts);
    const bureauOptions = sanitizeList(bureau.length ? bureau : bureaux);
    const responsableOptions = sanitizeList(responsables.length ? responsables : qui);
    const projetOptions = sanitizeList(projet.length ? projet : projets);

    // Mémoriser une copie normalisée pour les opérations locales (ajout projet, etc.)
    this.gristOptions = {
      bureau: bureauOptions,
      responsables: responsableOptions,
      projet: projetOptions,
      urgence: urgenceOptions,
      impact: impactOptions
    };

    // Peupler les selects
    populateSelect('popup-urgence', urgenceOptions, true);
    populateSelect('popup-impact', impactOptions, true);
    populateSelect('popup-projet', projetOptions, true);

    // Peupler les cases à cocher
    this.logger.debug(`Populating options: ${bureauOptions.length} bureau, ${responsableOptions.length} responsables`);
    this.populateCheckboxOptions('popup-bureau-checkboxes', 'popup-bureau', ['L', ...bureauOptions]);
    this.populateCheckboxOptions('popup-qui-checkboxes', 'popup-qui', ['L', ...responsableOptions]);
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
    lOption.hidden = true;
    lOption.disabled = true;
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

      // NOTE: Événement change géré par EventCentralizer.js via délégation
      // (checkbox synchronisation gérée globalement)
      checkbox.dataset.containerId = containerId;
      checkbox.dataset.selectId = selectId;
    });
    
    
    // Journaliser si aucune option utile n'a été trouvée
    const usableOptionsCount = options.filter(option => option && option !== 'L').length;
    if (usableOptionsCount === 0) {
      this.logger.warn(`No usable options found for ${containerId}`);
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
    // Ne pas valider pendant le chargement de la modale
    if (this.isPopulating) {
      return true;
    }

    const titre = getFieldValue('popup-titre').trim();

    if (!titre) {
      displayError('Le titre est obligatoire');
      return false;
    }

    if (titre.length > 255) {
      displayError('Le titre ne peut pas dépasser 255 caractères');
      return false;
    }

    // Note: Bureau n'est pas obligatoire (demande utilisateur)

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
    toggleVisibility('btn-duplicate-task', !readOnly && !this.isNewTask);
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
    // NOTE: Événements change/input gérés par EventCentralizer.js via délégation
    // (sur #task-form input, select, textarea)
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
  
  /**
   * Calcule la priorité automatiquement basée sur urgence et impact
   * @param {string} urgence - Niveau d'urgence
   * @param {string} impact - Niveau d'impact
   * @returns {string} Priorité calculée
   */
  calculatePriorite(urgence, impact) {
    if (!urgence || !impact) {
      return '';
    }
    
    // Matrice de calcul Urgence × Impact
    const matrix = {
      'Immédiate': {
        'Critique': 'P1 - Critique',
        'Important': 'P1 - Critique', 
        'Moyen': 'P2 - Élevée',
        'Faible': 'P3 - Moyenne'
      },
      'Courte': {
        'Critique': 'P1 - Critique',
        'Important': 'P2 - Élevée',
        'Moyen': 'P2 - Élevée', 
        'Faible': 'P3 - Moyenne'
      },
      'Moyenne': {
        'Critique': 'P2 - Élevée',
        'Important': 'P2 - Élevée',
        'Moyen': 'P3 - Moyenne',
        'Faible': 'P4 - Faible'
      },
      'Longue': {
        'Critique': 'P3 - Moyenne',
        'Important': 'P3 - Moyenne', 
        'Moyen': 'P4 - Faible',
        'Faible': 'P4 - Faible'
      }
    };
    
    return matrix[urgence]?.[impact] || 'Non définie';
  }

  /**
   * Extrait les références depuis le champ notes JSON
   * @param {string} notes - Champ notes JSON
   * @returns {string} Texte des références
   */
  extractReferencesFromNotes(notes) {
    if (!notes) return '';
    try {
      const notesData = JSON.parse(notes);
      return notesData.references || '';
    } catch (e) {
      return '';
    }
  }

  /**
   * Décrit le changement de références pour l'historique
   * @param {string} oldRefs - Anciennes références
   * @param {string} newRefs - Nouvelles références
   * @returns {string} Description du changement
   */
  describeReferenceChange(oldRefs, newRefs) {
    const oldCount = oldRefs ? oldRefs.split('\n').filter(r => r.trim()).length : 0;
    const newCount = newRefs ? newRefs.split('\n').filter(r => r.trim()).length : 0;
    
    if (!oldRefs && newRefs) {
      return `Ajout de ${newCount} référence${newCount > 1 ? 's' : ''}`;
    } else if (oldRefs && !newRefs) {
      return `Suppression de ${oldCount} référence${oldCount > 1 ? 's' : ''}`;
    } else if (oldCount !== newCount) {
      return `Modification des références (${oldCount} → ${newCount})`;
    } else {
      return 'Modification des références';
    }
  }
}
