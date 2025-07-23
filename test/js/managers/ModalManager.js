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

/**
 * Gestionnaire pour les modales et formulaires
 */
export class ModalManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.taskModal = null;
    this.historyModal = null;
    this.currentTaskId = null;
    this.currentTask = null;
    this.isNewTask = false;
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire de modales
   */
  init() {
    this.initializeModals();
    // ✅ Event listeners supprimés - gérés par SimpleClickHandler
    this.setupStrategySelects();
    console.log('ModalManager: Gestionnaire de modales initialisé (listeners centralisés)');
  }
  
  /**
   * Initialise les instances de modales Bootstrap
   */
  initializeModals() {
    const taskModalElement = document.getElementById('popup-tache');
    if (taskModalElement) {
      this.taskModal = new bootstrap.Modal(taskModalElement, {
        backdrop: 'static',
        keyboard: false
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
   * ✅ SUPPRIMÉ - Configure les écouteurs d'événements
   * Event listeners maintenant gérés par SimpleClickHandler
   */
  setupEventListeners_DISABLED() {
    // Bouton nouvelle tâche
    const btnNouvelleTache = document.getElementById('btn-nouvelle-tache');
    if (btnNouvelleTache) {
      btnNouvelleTache.addEventListener('click', () => {
        this.openTaskModal();
      });
    }
    
    // Bouton sauvegarder
    const btnSaveTask = document.getElementById('btn-save-task');
    if (btnSaveTask) {
      btnSaveTask.addEventListener('click', () => {
        this.saveTask();
      });
    }
    
    // Bouton supprimer
    const btnDeleteTask = document.getElementById('btn-delete-task');
    if (btnDeleteTask) {
      btnDeleteTask.addEventListener('click', () => {
        this.deleteTask();
      });
    }
    
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
        console.log('ModalManager: Clic sur bouton toggle historique');
        // Laisser Bootstrap gérer l'accordéon, mais charger les données
        setTimeout(() => {
          this.loadCommentHistoryInAccordion();
        }, 100); // Petit délai pour laisser Bootstrap ouvrir l'accordéon
      }
    });
    
    // Écouteur pour quand l'accordéon s'ouvre (événement Bootstrap)
    document.addEventListener('shown.bs.collapse', (e) => {
      if (e.target.id === 'comment-history-accordion') {
        console.log('ModalManager: Accordéon historique ouvert');
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
      console.warn('ModalManager: strategy-browser non trouvé');
      return;
    }
    
    // Initialiser la collection des stratégies sélectionnées
    this.selectedStrategies = [];
    
    // Vérifier si on a des données stratégiques disponibles
    console.log('ModalManager: Vérification strategiesData:', {
      exists: !!this.kanban.strategiesData,
      length: this.kanban.strategiesData?.length || 0,
      sample: this.kanban.strategiesData?.[0]
    });
    
    if (this.kanban.strategiesData && this.kanban.strategiesData.length > 0) {
      console.log('ModalManager: Génération interface accordéon depuis données intégrées');
      this.renderStrategyAccordion(strategyBrowser);
    } else {
      console.warn('ModalManager: Génération interface accordéon avec données par défaut');
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
    
    console.log('Stratégies sélectionnées:', this.selectedStrategies.map(s => ({
      id: s.id,
      objectif: s.objectif,
      action: s.action
    })));
  }
  
  /**
   * Ajoute une stratégie à la sélection
   */
  addStrategyToSelection(strategy) {
    // Éviter les doublons
    if (!this.selectedStrategies.find(s => s.id === strategy.id)) {
      this.selectedStrategies.push(strategy);
    }
  }
  
  /**
   * Retire une stratégie de la sélection
   */
  removeStrategyFromSelection(strategyId) {
    this.selectedStrategies = this.selectedStrategies.filter(s => s.id !== strategyId);
    
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
    setFieldValue('popup-strategie-ids', JSON.stringify(strategyIds));
    
    // Compatibilité avec l'ancien système (premier ID seulement)
    setFieldValue('popup-strategie-id', strategyIds.length > 0 ? strategyIds[0] : '');
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
    
    console.log('Toutes les stratégies désélectionnées');
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
   * Masque les détails de stratégie
   */
  hideStrategyDetails() {
    const detailsContainer = document.getElementById('strategy-details');
    if (detailsContainer) {
      detailsContainer.style.display = 'none';
    }
  }
  
  /**
   * Peuple les champs de stratégie basés sur les strategie_ids multiples
   * @param {string|array} strategyIds - IDs de stratégies (JSON string ou array)
   */
  populateStrategyFieldsFromIds(strategyIds) {
    // Réinitialiser d'abord
    this.resetStrategySelection();
    
    if (!strategyIds) {
      return;
    }
    
    // Conversion en array si nécessaire
    let idsArray = [];
    try {
      if (typeof strategyIds === 'string') {
        idsArray = JSON.parse(strategyIds);
      } else if (Array.isArray(strategyIds)) {
        idsArray = strategyIds;
      } else {
        // Fallback pour compatibilité avec ancien système (ID unique)
        idsArray = [strategyIds];
      }
    } catch (e) {
      console.warn('Erreur parsing strategie_ids:', e);
      return;
    }
    
    if (!Array.isArray(idsArray) || idsArray.length === 0) {
      return;
    }
    
    // Rechercher et pré-sélectionner chaque stratégie
    if (this.kanban.strategiesData && this.kanban.strategiesData.length > 0) {
      idsArray.forEach(strategyId => {
        // Extraire l'ID depuis le format Grist ["L", id] si nécessaire
        let searchId = strategyId;
        if (Array.isArray(strategyId) && strategyId.length === 2 && strategyId[0] === 'L') {
          searchId = strategyId[1];
        }
        
        const strategy = this.kanban.strategiesData.find(s => s.id == searchId);
        if (strategy) {
          this.addStrategyToSelection(strategy);
          this.preSelectStrategyInAccordion(strategy);
        } else {
          console.warn('Stratégie non trouvée pour ID:', strategyId, '(recherché:', searchId, ')');
        }
      });
      
      // Mettre à jour l'affichage après toutes les sélections
      this.updateStrategyTags();
      this.updateStrategyPreview();
      this.updateStrategyIds();
      
      console.log('Stratégies pré-sélectionnées:', this.selectedStrategies.map(s => ({
        id: s.id,
        objectif: s.objectif,
        action: s.action
      })));
    } else {
      console.warn('Données stratégiques non disponibles pour peupler les champs');
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
    // Réinitialiser les champs cachés
    setFieldValue('popup-strategie-objectif', '');
    setFieldValue('popup-strategie-sous-objectif', '');
    setFieldValue('popup-strategie-action', '');
    setFieldValue('popup-strategie-id', '');
    
    // Réinitialiser l'interface accordéon
    document.querySelectorAll('.strategy-action.selected').forEach(el => {
      el.classList.remove('selected');
      const indicator = el.querySelector('.strategy-selected-indicator');
      if (indicator) indicator.style.display = 'none';
    });
    
    // Réinitialiser le preview
    const preview = document.getElementById('selected-strategy-preview');
    if (preview) {
      preview.textContent = '';
    }
    
    // Masquer les détails
    this.hideStrategyDetails();
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
    
    console.log('=== DEBUG: openTaskModal ===');
    console.log('Task parameter:', task);
    console.log('Task ID:', task?.id);
    console.log('Task type:', typeof task?.id);
    
    this.isNewTask = !task || !task.id;
    this.currentTask = task;
    this.currentTaskId = task?.id || null;
    
    console.log('✅ openTaskModal - État après initialisation:');
    console.log('   → IsNewTask:', this.isNewTask);
    console.log('   → CurrentTaskId:', this.currentTaskId);
    console.log('   → CurrentTask.id:', this.currentTask?.id);
    console.log('   → Task parameter received:', !!task);
    console.log('CurrentTask:', this.currentTask);
    
    // Mettre à jour le titre de la modal
    const modalTitle = document.getElementById('popup-tache-label');
    if (modalTitle) {
      modalTitle.innerHTML = this.isNewTask 
        ? '<i class="bi bi-plus-circle me-2"></i>Nouvelle Tâche'
        : '<i class="bi bi-pencil-square me-2"></i>Modifier Tâche';
    }
    
    // Peupler les champs
    this.populateTaskForm(task);
    
    // Informer le JalonManager de la tâche en cours
    if (this.kanban.jalonManager) {
      this.kanban.jalonManager.setCurrentTaskId(this.currentTaskId);
    }
    
    // Afficher/masquer le bouton supprimer
    toggleVisibility('btn-delete-task', !this.isNewTask, 'inline-block');
    
    // Ouvrir la modal
    this.taskModal.show();
    
    // Focus sur le premier champ
    setTimeout(() => {
      const firstField = document.getElementById('popup-titre');
      if (firstField) firstField.focus();
    }, 300);
  }
  
  /**
   * Peuple le formulaire avec les données d'une tâche
   * @param {object} task - Données de la tâche
   */
  // === REMPLISSAGE DU FORMULAIRE CORRIGÉ ===
  populateTaskForm(tache, isNewTask) {
    console.log('=== DEBUG: populateTaskForm ===');
    console.log('Tache parameter:', tache);
    console.log('isNewTask parameter:', isNewTask);
    
    // S'assurer que tache est un objet
    if (!tache) {
      tache = {};
    }
    
    // Utiliser le paramètre isNewTask s'il est fourni
    if (isNewTask !== undefined) {
      console.log('Using isNewTask parameter:', isNewTask);
      this.isNewTask = isNewTask;
      this.currentTaskId = this.isNewTask ? null : (tache.id || null);
      this.currentTask = this.isNewTask ? null : tache;
    }
    
    console.log('Final state - isNewTask:', this.isNewTask, 'currentTaskId:', this.currentTaskId);
    
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
    
    // Stratégies depuis Grist - peupler avec support multi-stratégies
    if (tache.strategie_ids) {
      this.populateStrategyFieldsFromIds(tache.strategie_ids);
    } else if (tache.strategie_id) {
      // Fallback compatibilité ancien système
      this.populateStrategyFieldsFromId(tache.strategie_id);
    }
    
    // Bureaux et responsables (selects multiples)
    setSelectedOptions('popup-bureau', tache.bureau || ['L']);
    setSelectedOptions('popup-qui', tache.qui || ['L']);
    
    // Charger les jalons si disponibles
    if (this.kanban.jalonManager) {
      this.kanban.jalonManager.loadJalonsFromTask(tache);
    }
    
    console.log('✅ Formulaire rempli');
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
      
      console.log('=== DEBUG: Envoi vers Grist ===');
      console.log('IsNewTask:', this.isNewTask);
      console.log('TABLE_ID:', TABLE_ID);
      console.log('CurrentTaskId:', this.currentTaskId);
      console.log('CurrentTaskId type:', typeof this.currentTaskId);
      console.log('Action à envoyer:', this.isNewTask ? 'AddRecord' : 'UpdateRecord');
      
      // Validation critique
      if (!this.isNewTask && (!this.currentTaskId || this.currentTaskId === null)) {
        console.error('🚨 ERREUR CRITIQUE: Tentative UpdateRecord avec currentTaskId null!');
        console.error('📊 État actuel ModalManager:');
        console.error('   → this.isNewTask:', this.isNewTask);
        console.error('   → this.currentTaskId:', this.currentTaskId);
        console.error('   → this.currentTask:', this.currentTask);
        console.error('   → typeof currentTaskId:', typeof this.currentTaskId);
        console.error('   → currentTask?.id:', this.currentTask?.id);
        
        // Tentative de récupération depuis currentTask
        if (this.currentTask && this.currentTask.id) {
          console.warn('🔧 RÉCUPÉRATION: Tentative récupération ID depuis currentTask');
          this.currentTaskId = this.currentTask.id;
          console.warn('   → currentTaskId récupéré:', this.currentTaskId);
        } else {
          displayError('Erreur: ID de tâche manquant pour la mise à jour');
          return;
        }
      }
      
      if (this.isNewTask) {
        // Création
        const action = ['AddRecord', TABLE_ID, null, gristData];
        console.log('Action AddRecord complète:', action);
        result = await grist.docApi.applyUserActions([action]);
        
        // Enregistrer l'action utilisateur pour la création
        const userActionManager = getUserActionManager();
        if (userActionManager && result && result.retValues && result.retValues[0]) {
          const newTaskId = result.retValues[0];
          console.log('New task created with ID:', newTaskId);
          
          // Capturer le contenu du champ description pour l'historique
          const descriptionContent = getFieldValue('popup-description').trim();
          
          // Toujours créer une entrée de création de tâche
          await userActionManager.createTaskAction(newTaskId, gristData);
          
          // Si il y a un commentaire, l'ajouter comme commentaire séparé
          if (descriptionContent) {
            await userActionManager.addHistoryEntry(
              newTaskId,
              'comment',
              `Commentaire initial: ${descriptionContent}`,
              '',
              descriptionContent,
              gristData.statut || 'À faire'
            );
          }
        }
        
        displaySuccess('Tâche créée avec succès');
        
        // Vider le champ description après création
        setFieldValue('popup-description', '');
      } else {
        // Mise à jour
        const action = ['UpdateRecord', TABLE_ID, this.currentTaskId, gristData];
        console.log('Action UpdateRecord complète:', action);
        result = await grist.docApi.applyUserActions([action]);
        
        // Enregistrer l'action utilisateur pour la mise à jour
        const userActionManager = getUserActionManager();
        if (userActionManager) {
          // Capturer le contenu du champ description pour l'historique
          const descriptionContent = getFieldValue('popup-description').trim();
          
          // Vérifier les changements de jalons spécifiquement
          const oldJalons = this.currentTask?.jalons || null;
          const newJalons = gristData.jalons || null;
          const jalonsChanged = this.hasJalonsChanged(oldJalons, newJalons);
          
          // Vérifier les changements de stratégies spécifiquement
          const oldStrategies = this.currentTask?.strategie_id || null;
          const newStrategies = gristData.strategie_id || null;
          const strategiesChanged = this.hasStrategiesChanged(oldStrategies, newStrategies);
          
          if (descriptionContent) {
            // Si il y a un commentaire, l'ajouter spécifiquement à l'historique
            await userActionManager.addHistoryEntry(
              this.currentTaskId,
              'comment',
              `Commentaire ajouté: ${descriptionContent}`,
              '',
              descriptionContent,
              gristData.statut || this.currentTask?.statut
            );
            
            // Ne pas traiter les autres changements si c'est juste un commentaire
            // Vérifier si les autres champs ont réellement changé
            const hasOtherChanges = this.hasSignificantChanges(this.currentTask, gristData, ['description']);
            
            if (hasOtherChanges) {
              // Il y a d'autres changements en plus du commentaire
              await userActionManager.updateTaskAction(
                this.currentTaskId, 
                this.currentTask, 
                gristData, 
                'Task updated via modal'
              );
            }
          } else {
            // Pas de commentaire, enregistrer normalement les changements
            await userActionManager.updateTaskAction(
              this.currentTaskId, 
              this.currentTask, 
              gristData, 
              'Task updated via modal'
            );
          }
          
          // Tracker spécifiquement les jalons si ils ont changé
          if (jalonsChanged) {
            const jalonsDetails = this.getJalonsChangeDetails(oldJalons, newJalons);
            await userActionManager.addHistoryEntry(
              this.currentTaskId,
              'jalons_update',
              jalonsDetails.message,
              jalonsDetails.oldSummary,
              jalonsDetails.newSummary,
              gristData.statut || this.currentTask?.statut
            );
          }
          
          // Tracker spécifiquement les stratégies si elles ont changé
          if (strategiesChanged) {
            const strategiesDetails = this.getStrategiesChangeDetails(oldStrategies, newStrategies);
            await userActionManager.addHistoryEntry(
              this.currentTaskId,
              'strategies_update',
              strategiesDetails.message,
              strategiesDetails.oldSummary,
              strategiesDetails.newSummary,
              gristData.statut || this.currentTask?.statut
            );
          }
        }
        
        displaySuccess('Tâche mise à jour avec succès');
        
        // Vider le champ description après mise à jour seulement si c'était un commentaire d'historique
        const descriptionContent = getFieldValue('popup-description').trim();
        if (descriptionContent && descriptionContent.length > 0) {
          // Si il y avait du contenu dans description, c'était probablement un commentaire d'historique
          setFieldValue('popup-description', '');
        }
      }
      
      console.log('Résultat Grist:', result);
      
      // Signaler la mise à jour locale
      if (this.kanban.signalLocalUpdate) {
        this.kanban.signalLocalUpdate();
      }
      
      // Fermer la modal et rafraîchir
      this.taskModal.hide();
      this.kanban.refreshKanban();
      
    } catch (error) {
      console.error('ModalManager: Erreur sauvegarde complète:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // Afficher l'erreur détaillée
      let errorMessage = `Erreur lors de la sauvegarde: ${error.message}`;
      if (error.stack) {
        console.error('Stack trace complet:', error.stack);
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
    console.log('=== DEBUG: collectFormData ===');
    
    const data = {
      titre: getFieldValue('popup-titre').trim(),
      statut: getFieldValue('popup-statut-text'),
      projet: getFieldValue('popup-projet').trim() || null,
      urgence: getFieldValue('popup-urgence') || null,
      impact: getFieldValue('popup-impact') || null,
      bureau: getSelectedOptionsAsGristFormat('popup-bureau'),
      qui: getSelectedOptionsAsGristFormat('popup-qui'),
      strategie_ids: getFieldValue('popup-strategie-ids') || null,
      strategie_id: getFieldValue('popup-strategie-id') || null, // Compatibilité
      jalons: this.kanban.jalonManager ? this.kanban.jalonManager.getJalonsForSave() : null
    };
    
    // Debug chaque champ collecté
    console.log('Titre:', data.titre);
    console.log('Statut:', data.statut);
    console.log('Projet:', data.projet);
    console.log('Urgence:', data.urgence);
    console.log('Impact:', data.impact);
    console.log('Bureau (raw):', data.bureau);
    console.log('Qui (raw):', data.qui);
    console.log('Strategie_ids:', data.strategie_ids);
    console.log('Strategie_id (compat):', data.strategie_id);
    
    // CHAMP DESCRIPTION SUPPRIMÉ - Tous les commentaires sont maintenant dans notes.history
    // Le champ de saisie popup-description sert uniquement pour les nouveaux commentaires
    
    // Date d'échéance
    if (this.kanban.datePickerManager) {
      data.date_echeance = this.kanban.datePickerManager.getDateForGrist();
    }
    console.log('Date_echeance:', data.date_echeance);
    
    console.log('=== Data collectée complète ===', data);
    return data;
  }
  
  /**
   * Prépare les données pour l'envoi à Grist
   * @param {object} taskData - Données de la tâche
   * @returns {object} Données formatées pour Grist
   */
  prepareTaskDataForGrist(taskData) {
    console.log('=== DEBUG: prepareTaskDataForGrist ===');
    console.log('Input taskData:', taskData);
    
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
    
    // Assurer que les listes sont dans le bon format (based on old example mapGristRecords)
    console.log('Bureau avant traitement:', gristData.bureau, typeof gristData.bureau);
    if (!Array.isArray(gristData.bureau) || gristData.bureau[0] !== 'L') {
      console.log('Bureau corrigé vers format Grist');
      gristData.bureau = ['L'];
    }
    
    console.log('Qui avant traitement:', gristData.qui, typeof gristData.qui);
    if (!Array.isArray(gristData.qui) || gristData.qui[0] !== 'L') {
      console.log('Qui corrigé vers format Grist');
      gristData.qui = ['L'];
    }
    
    // Ensure empty lists are properly formatted as ['L'] not ['L', ''] 
    if (gristData.bureau.length === 2 && gristData.bureau[1] === '') {
      gristData.bureau = ['L'];
    }
    if (gristData.qui.length === 2 && gristData.qui[1] === '') {
      gristData.qui = ['L'];
    }
    
    // Convertir strategie_id en nombre si nécessaire
    console.log('Strategie_id avant traitement:', gristData.strategie_id, typeof gristData.strategie_id);
    if (gristData.strategie_id && typeof gristData.strategie_id === 'string') {
      const strategyId = parseInt(gristData.strategie_id);
      gristData.strategie_id = isNaN(strategyId) ? null : strategyId;
      console.log('Strategie_id après conversion:', gristData.strategie_id);
    }
    
    // Remove historique_statuts - it's a Date field, not JSON
    delete gristData.historique_statuts;
    console.log('Removed historique_statuts field (Date field, not JSON)');
    
    // Nettoyer les valeurs nulles/undefined problématiques
    Object.keys(gristData).forEach(key => {
      if (gristData[key] === undefined) {
        console.log(`Nettoyage: ${key} undefined -> null`);
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
    
    // Vérifier et formater les jalons pour Grist
    if (gristData.jalons !== null && gristData.jalons !== undefined) {
      if (typeof gristData.jalons !== 'string') {
        console.log('🔧 Conversion jalons en JSON string pour Grist');
        gristData.jalons = JSON.stringify(gristData.jalons || []);
      }
      console.log('✅ Jalons prêts pour sauvegarde:', gristData.jalons.length, 'caractères');
    }
    
    // TEMPORAIRE : Supprimer strategie_ids jusqu'à ce que la colonne soit créée
    // TODO: Enlever cette ligne quand la colonne strategie_ids sera ajoutée à Grist
    if (gristData.strategie_ids !== undefined) {
      console.log('⚠️ Suppression temporaire du champ strategie_ids (colonne pas encore créée)');
      delete gristData.strategie_ids;
    }
    
    console.log('=== FINAL gristData pour envoi ===');
    console.log('Données préparées pour Grist:', gristData);
    
    // Validation finale des types
    Object.entries(gristData).forEach(([key, value]) => {
      console.log(`${key}: ${value} (type: ${typeof value}, isArray: ${Array.isArray(value)})`);
    });
    
    return gristData;
  }
  
  /**
   * Supprime la tâche courante
   */
   // === SUPPRESSION DE TÂCHE ===
  async deleteTask() {
    console.log('🗑️ Début suppression - TaskId:', this.currentTaskId);
    console.log('🗑️ Kanban référence:', !!this.kanban);
    console.log('🗑️ TaskModal référence:', !!this.taskModal);
    
    if (!this.currentTaskId) {
      displayError('Aucune tâche sélectionnée pour suppression');
      return;
    }
    
    const task = this.kanban.currentRecords?.find(r => r.id === this.currentTaskId);
    const taskTitle = task?.titre || 'cette tâche';
    
    if (!confirmAction(`Êtes-vous sûr de vouloir supprimer "${taskTitle}" ?`)) {
      console.log('🗑️ Suppression annulée par l\'utilisateur');
      return;
    }
    
    console.log('🗑️ Suppression confirmée pour:', taskTitle);
    
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
      if (this.taskModal) {
        this.taskModal.hide();
      }
      
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
          console.log('🗑️ Rafraîchissement du kanban...');
          this.kanban.refreshKanban();
        } else {
          console.error('Impossible de rafraîchir le kanban: référence manquante');
          // Fallback: recharger la page si le kanban n'est pas accessible
          window.location.reload();
        }
      }, 100);
      
    } catch (error) {
      console.error('Erreur suppression:', error);
      displayError(`Erreur lors de la suppression: ${error.message}`);
    }
  }
// === MÉTHODE DE DIAGNOSTIC ===
  diagnoseModals() {
    console.log('🔍 DIAGNOSTIC DES MODALES:');
    console.log('- Bootstrap disponible:', typeof bootstrap !== 'undefined');
    console.log('- Modal element existe:', !!document.getElementById('popup-tache'));
    console.log('- Modal instance créée:', !!this.modal);
    console.log('- History modal element existe:', !!document.getElementById('history-modal'));
    console.log('- History modal instance créée:', !!this.historyModal);
    console.log('- Bouton nouvelle tâche existe:', !!document.getElementById('btn-nouvelle-tache'));
    
    if (this.modal) {
      console.log('- Modal peut être ouverte:', typeof this.modal.show === 'function');
    }
  }

  // === RESET COMPLET DES MODALES ===
  resetModals() {
    console.log('🔄 Reset complet des modales...');
    
    // Détruire les instances existantes
    if (this.modal) {
      try {
        this.modal.dispose();
      } catch (e) {
        console.warn('Erreur lors de la destruction de la modal:', e);
      }
    }
    
    if (this.historyModal) {
      try {
        this.historyModal.dispose();
      } catch (e) {
        console.warn('Erreur lors de la destruction de la modal historique:', e);
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
    console.log('ModalManager: loadCommentHistoryInAccordion appelée');
    console.log('ModalManager: currentTask:', this.currentTask);
    console.log('ModalManager: historyManager:', this.kanban.historyManager);
    
    if (!this.currentTask) {
      console.warn('ModalManager: Aucune tâche courante pour charger l\'historique');
      this.showAccordionError('Aucune tâche sélectionnée');
      return;
    }

    // Obtenir les données d'historique via HistoryManager
    if (this.kanban.historyManager) {
      console.log('ModalManager: Parsing historique pour tâche ID:', this.currentTask.id);
      const historyData = this.kanban.historyManager.parseTaskHistory(this.currentTask);
      console.log('ModalManager: Données historique reçues:', historyData);
      this.renderCommentHistoryInAccordion(historyData);
    } else {
      console.error('HistoryManager non disponible');
      this.showAccordionError('Gestionnaire d\'historique non disponible');
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
      console.error('Éléments accordéon non trouvés');
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
        <div class="text-center text-muted py-3">
          <i class="bi bi-clock-history fs-4"></i>
          <p class="mt-2">Aucun historique trouvé</p>
          <small>L'historique complet apparaîtra ici une fois créé</small>
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
        
        console.log('ModalManager: Génération commentaire ID:', commentId, 'pour timestamp:', timestampString);
        
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
    
    console.log('ModalManager: Timeline complète unifiée chargée:', timeline.length, 'entrées');
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
        <div class="text-center text-danger py-3">
          <i class="bi bi-exclamation-triangle fs-4"></i>
          <p class="mt-2">${errorMessage}</p>
        </div>
      `;
    }
    
    if (commentCountBadge) {
      commentCountBadge.textContent = '!';
      commentCountBadge.className = 'badge bg-danger ms-2';
    }
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
    console.log(`🏷️ ModalManager: màj titre pour tâche ${taskId}`);
    
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique de la tâche #${taskId} - ${task.titre}
      `;
    } else {
      console.error('❌ Élément history-modal-label introuvable dans le DOM (ModalManager)');
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
    console.log('🚪 Fermeture de toutes les modales...');
    
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
    populateSelect('popup-bureau', bureau || [], false);
    populateSelect('popup-qui', responsables || [], false);
    populateSelect('popup-projet', projet || [], true);
  }
  
  /**
   * Réinitialise le formulaire de tâche
   */
  resetTaskForm() {
    resetForm('task-form');
    
    // Réinitialiser les selects multiples
    setSelectedOptions('popup-bureau', ['L']);
    setSelectedOptions('popup-qui', ['L']);
    
    // Réinitialiser la stratégie
    this.resetStrategySelection();
    
    // Réinitialiser la date
    if (this.kanban.datePickerManager) {
      this.kanban.datePickerManager.reset();
    }
    
    // Réinitialiser les jalons
    if (this.kanban.jalonManager) {
      this.kanban.jalonManager.loadJalonsFromTask({});
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
   * Exporte l'état du gestionnaire
   * @returns {object} État exporté
   */
  exportState() {
    return {
      currentTaskId: this.currentTaskId,
      isNewTask: this.isNewTask,
      hasTaskModal: this.taskModal !== null,
      hasHistoryModal: this.historyModal !== null,
      timestamp: Date.now()
    };
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
    
    console.log('ModalManager: Ressources nettoyées');
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
      'strategie_ids', 'strategie_id', 'date_debut', 'date_echeance', 'jalons'
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
    // Normaliser en strings pour comparaison
    const oldStr = typeof oldJalons === 'string' ? oldJalons : JSON.stringify(oldJalons || []);
    const newStr = typeof newJalons === 'string' ? newJalons : JSON.stringify(newJalons || []);
    return oldStr !== newStr;
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
      console.warn('Erreur parsing jalons pour comptage:', error);
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
      console.warn('Erreur parsing jalons pour détails:', error);
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
      console.warn('Erreur parsing stratégies pour détails:', error);
      return {
        message: 'Stratégies modifiées (erreur parsing)',
        oldSummary: 'Erreur',
        newSummary: 'Erreur'
      };
    }
  }
}
