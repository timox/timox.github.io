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
    // Données de stratégie (à adapter selon les besoins)
    const strategieObjectifs = [
      'Modernisation Infrastructure',
      'Sécurité Renforcée', 
      'Performance Optimisée',
      'Conformité Réglementaire',
      'Innovation Technologique'
    ];
    
    const strategieSousObjectifs = {
      'Modernisation Infrastructure': [
        'Migration Cloud',
        'Virtualisation',
        'Automatisation',
        'Conteneurisation'
      ],
      'Sécurité Renforcée': [
        'Authentification Multi-Facteur',
        'Chiffrement des Données',
        'Monitoring Sécurité',
        'Formation Utilisateurs'
      ],
      'Performance Optimisée': [
        'Optimisation Base de Données',
        'Cache et CDN',
        'Load Balancing',
        'Monitoring Performance'
      ]
    };
    
    const strategieActions = {
      'Migration Cloud': [
        'Audit Infrastructure Existante',
        'Planification Migration',
        'Tests de Performance',
        'Formation Équipes'
      ],
      'Virtualisation': [
        'Évaluation Serveurs Physiques',
        'Déploiement Hyperviseur',
        'Migration Applications',
        'Optimisation Ressources'
      ]
    };
    
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
    if (currentProjects.includes(
