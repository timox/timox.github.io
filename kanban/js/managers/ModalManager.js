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
    this.setupEventListeners();
    this.setupStrategySelects();
    console.log('ModalManager: Gestionnaire de modales initialisé');
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
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
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
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'n' || e.key === 'N') && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.openTaskModal();
      }
    });
    
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
    // Importer les données stratégiques si disponibles
    let strategieObjectifs, strategieSousObjectifs, strategieActions;
    
    try {
      // Tenter d'importer les données stratégiques
      const { 
        STRATEGIC_OBJECTIVES, 
        SUB_OBJECTIVES, 
        STRATEGIC_ACTIONS,
        getSubObjectives,
        getActions
      } = window.KanbanAppInitializer ? 
        await import('../config/strategyData.js') : 
        { STRATEGIC_OBJECTIVES: [], SUB_OBJECTIVES: {}, STRATEGIC_ACTIONS: {} };
      
      strategieObjectifs = STRATEGIC_OBJECTIVES.map(obj => obj.label);
      strategieSousObjectifs = {};
      strategieActions = {};
      
      // Construire les mappings
      STRATEGIC_OBJECTIVES.forEach(obj => {
        const subObjs = SUB_OBJECTIVES[obj.id] || [];
        strategieSousObjectifs[obj.label] = subObjs.map(sub => sub.label);
        
        subObjs.forEach(subObj => {
          const actions = STRATEGIC_ACTIONS[subObj.id] || [];
          strategieActions[subObj.label] = actions;
        });
      });
      
    } catch (error) {
      console.warn('ModalManager: Utilisation des données stratégiques par défaut');
      
      // Données de stratégie par défaut (fallback)
      strategieObjectifs = [
        'Modernisation Infrastructure',
        'Sécurité Renforcée', 
        'Performance Optimisée',
        'Conformité Réglementaire',
        'Innovation Technologique',
        'Résilience & Continuité'
      ];
      
      strategieSousObjectifs = {
        'Modernisation Infrastructure': [
          'Migration Cloud',
          'Virtualisation',
          'Automatisation',
          'Conteneurisation',
          'Réseaux Nouvelle Génération'
        ],
        'Sécurité Renforcée': [
          'Authentification Multi-Facteur',
          'Chiffrement des Données',
          'Monitoring Sécurité',
          'Formation Utilisateurs',
          'Audits & Tests d\'Intrusion'
        ],
        'Performance Optimisée': [
          'Optimisation Base de Données',
          'Cache et CDN',
          'Load Balancing',
          'Monitoring Performance'
        ],
        'Conformité Réglementaire': [
          'Conformité RGPD',
          'Certification ISO 27001',
          'Archivage Légal',
          'Audits de Conformité'
        ],
        'Innovation Technologique': [
          'Intelligence Artificielle',
          'Intégration IoT',
          'Blockchain',
          'Edge Computing'
        ],
        'Résilience & Continuité': [
          'Plan de Reprise d\'Activité',
          'Stratégie Sauvegarde 3-2-1',
          'Redondance Multi-Sites',
          'Tests de Résilience'
        ]
      };
      
      strategieActions = {
        'Migration Cloud': [
          'Audit Infrastructure Existante',
          'Sélection Fournisseur Cloud',
          'Planification Migration',
          'Migration Pilot',
          'Migration Production',
          'Optimisation Coûts Cloud',
          'Formation Équipes Cloud',
          'Monitoring Cloud Native'
        ],
        'Virtualisation': [
          'Évaluation Serveurs Physiques',
          'Choix Solution Virtualisation',
          'Déploiement Hyperviseur',
          'Migration Applications Legacy',
          'Optimisation Ressources VM',
          'Backup Machines Virtuelles',
          'Monitoring Infrastructure Virtuelle'
        ],
        'Automatisation': [
          'Identification Processus Manuels',
          'Sélection Outils Automatisation',
          'Développement Scripts',
          'Tests Automatisation',
          'Déploiement Production',
          'Formation Équipes',
          'Amélioration Continue'
        ],
        'Authentification Multi-Facteur': [
          'Choix Solution AMF',
          'Pilot Groupe Test',
          'Déploiement Phases',
          'Formation Utilisateurs',
          'Support Utilisateurs',
          'Monitoring Authentifications',
          'Optimisation UX'
        ],
        'Optimisation Base de Données': [
          'Audit Performance BDD',
          'Optimisation Requêtes',
          'Indexation Intelligente',
          'Partitionnement Tables',
          'Optimisation Mémoire',
          'Monitoring Temps Réponse',
          'Maintenance Préventive'
        ],
        'Conformité RGPD': [
          'Audit Données Personnelles',
          'Cartographie Traitements',
          'Mise à Jour Mentions Légales',
          'Procédures Exercice Droits',
          'Formation RGPD',
          'Outils Anonymisation',
          'Documentation Conformité'
        ],
        'Plan de Reprise d\'Activité': [
          'Analyse Impact Business',
          'Identification Risques',
          'Définition RTO/RPO',
          'Procédures Reprise',
          'Tests PRA Réguliers',
          'Formation Équipes Crise',
          'Amélioration Continue PRA'
        ]
      };
    }
    
    // Peupler la liste des objectifs
    populateSelect('strategie-objectif', strategieObjectifs, true, '-- Choisir objectif --');
    
    // Écouteur pour les sous-objectifs
    const objectifSelect = document.getElementById('strategie-objectif');
    if (objectifSelect) {
      objectifSelect.addEventListener('change', (e) => {
        const selectedObjectif = e.target.value;
        const sousObjectifs = strategieSousObjectifs[selectedObjectif] || [];
        populateSelect('strategie-sous-objectif', sousObjectifs, true, '-- Choisir sous-objectif --');
        
        // Vider les actions quand l'objectif change
        populateSelect('strategie-action', [], true, '-- Choisir action --');
      });
    }
    
    // Écouteur pour les actions
    const sousObjectifSelect = document.getElementById('strategie-sous-objectif');
    if (sousObjectifSelect) {
      sousObjectifSelect.addEventListener('change', (e) => {
        const selectedSousObjectif = e.target.value;
        const actions = strategieActions[selectedSousObjectif] || [];
        populateSelect('strategie-action', actions, true, '-- Choisir action --');
      });
    }
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
    
    this.isNewTask = !task;
    this.currentTask = task;
    this.currentTaskId = task?.id || null;
    
    // Mettre à jour le titre de la modal
    const modalTitle = document.getElementById('popup-tache-label');
    if (modalTitle) {
      modalTitle.innerHTML = this.isNewTask 
        ? '<i class="bi bi-plus-circle me-2"></i>Nouvelle Tâche'
        : '<i class="bi bi-pencil-square me-2"></i>Modifier Tâche';
    }
    
    // Peupler les champs
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
  }
  
  /**
   * Peuple le formulaire avec les données d'une tâche
   * @param {object} task - Données de la tâche
   */
  populateTaskForm(task = {}) {
    // Champs simples
    setFieldValue('popup-titre', task.titre || '');
    
    // Description - extraire la dernière version si horodatée
    const latestDescription = task.description 
      ? this.kanban.getLatestDescription(task.description) 
      : '';
    setFieldValue('popup-description', latestDescription);
    
    // Statut (lecture seule)
    const statut = task.statut || (this.isNewTask ? 'Backlog' : '');
    setFieldValue('popup-statut-text', statut);
    
    // Projet
    setFieldValue('popup-projet', task.projet || '');
    
    // Urgence et Impact
    setFieldValue('popup-urgence', task.urgence || '');
    setFieldValue('popup-impact', task.impact || '');
    
    // Bureaux et responsables (selects multiples)
    setSelectedOptions('popup-bureau', task.bureau || ['L']);
    setSelectedOptions('popup-qui', task.qui || ['L']);
    
    // Stratégie
    this.populateStrategyFields(task);
    
    // Date d'échéance (via DatePickerManager)
    if (this.kanban.datePickerManager) {
      this.kanban.datePickerManager.setDate(task.date_echeance);
    }
  }
  
  /**
   * Peuple les champs de stratégie
   * @param {object} task - Données de la tâche
   */
  populateStrategyFields(task) {
    // Définir l'objectif
    if (task.strategie_objectif) {
      setFieldValue('strategie-objectif', task.strategie_objectif);
      
      // Déclencher le changement pour peupler les sous-objectifs
      const objectifSelect = document.getElementById('strategie-objectif');
      if (objectifSelect) {
        objectifSelect.dispatchEvent(new Event('change'));
        
        // Attendre que les sous-objectifs soient peuplés
        setTimeout(() => {
          if (task.strategie_sous_objectif) {
            setFieldValue('strategie-sous-objectif', task.strategie_sous_objectif);
            
            // Déclencher le changement pour peupler les actions
            const sousObjectifSelect = document.getElementById('strategie-sous-objectif');
            if (sousObjectifSelect) {
              sousObjectifSelect.dispatchEvent(new Event('change'));
              
              // Attendre que les actions soient peuplées
              setTimeout(() => {
                if (task.strategie_action) {
                  setFieldValue('strategie-action', task.strategie_action);
                }
              }, 100);
            }
          }
        }, 100);
      }
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
      
      if (this.isNewTask) {
        // Création
        result = await grist.docApi.applyUserActions([
          ['AddRecord', TABLE_ID, null, gristData]
        ]);
        
        displaySuccess('Tâche créée avec succès');
      } else {
        // Mise à jour
        result = await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, this.currentTaskId, gristData]
        ]);
        
        displaySuccess('Tâche mise à jour avec succès');
      }
      
      // Fermer la modal et rafraîchir
      this.taskModal.hide();
      this.kanban.refreshKanban();
      
    } catch (error) {
      console.error('ModalManager: Erreur sauvegarde:', error);
      displayError(`Erreur lors de la sauvegarde: ${error.message}`);
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
      strategie_objectif: getFieldValue('strategie-objectif') || null,
      strategie_sous_objectif: getFieldValue('strategie-sous-objectif') || null,
      strategie_action: getFieldValue('strategie-action') || null
    };
    
    // Description avec horodatage si modifiée
    const newDescription = getFieldValue('popup-description').trim();
    if (newDescription) {
      const currentDescription = this.currentTask?.description || '';
      data.description = this.kanban.addTimestampToDescription(currentDescription, newDescription);
    } else {
      data.description = this.currentTask?.description || '';
    }
    
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
    const gristData = { ...taskData };
    
    // Ajouter les métadonnées
    gristData.date_derniere_maj = new Date().toISOString();
    
    if (this.isNewTask) {
      // Pour les nouvelles tâches, initialiser l'historique
      if (this.kanban.historyManager) {
        const historyData = this.kanban.historyManager.updateTaskHistory(
          { statut: null }, 
          taskData.statut, 
          'Tâche créée'
        );
        Object.assign(gristData, historyData);
      }
    } else {
      // Pour les mises à jour, vérifier si le statut a changé
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
    
    return gristData;
  }
  
  /**
   * Supprime la tâche courante
   */
  async deleteTask() {
    if (this.isNewTask || !this.currentTaskId) {
      displayError('Aucune tâche à supprimer');
      return;
    }
    
    if (!confirmAction(`Êtes-vous sûr de vouloir supprimer la tâche "${this.currentTask?.titre || 'cette tâche'}" ?`, 'delete')) {
      return;
    }
    
    try {
      await grist.docApi.applyUserActions([
        ['RemoveRecord', TABLE_ID, this.currentTaskId]
      ]);
      
      displaySuccess('Tâche supprimée avec succès');
      
      // Fermer la modal et rafraîchir
      this.taskModal.hide();
      this.kanban.refreshKanban();
      
    } catch (error) {
      console.error('ModalManager: Erreur suppression:', error);
      displayError(`Erreur lors de la suppression: ${error.message}`);
    }
  }
  
  /**
   * Ajoute un nouveau projet
   */
  addNewProject() {
    const newProjectName = getFieldValue('projet-ajout').trim();
    
    if (!newProjectName) {
      displayError('Veuillez saisir un nom de projet');
      return;
    }
    
    // Vérifier si le projet existe déjà
    const currentProjects = this.kanban.gristOptions?.projet || [];
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
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique de la tâche #${taskId} - ${task.titre}
      `;
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
    if (this.taskModal) {
      this.taskModal.hide();
    }
    
    if (this.historyModal) {
      this.historyModal.hide();
    }
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
    populateSelect('strategie-sous-objectif', [], true, '-- Choisir sous-objectif --');
    populateSelect('strategie-action', [], true, '-- Choisir action --');
    
    // Réinitialiser la date
    if (this.kanban.datePickerManager) {
      this.kanban.datePickerManager.reset();
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
      const description = getFieldValue('popup-description').trim();
      return titre !== '' || description !== '';
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
}
