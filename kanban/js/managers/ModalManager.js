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
       import('../config/strategyData.js') : 
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
    
    console.log('=== DEBUG: openTaskModal ===');
    console.log('Task parameter:', task);
    console.log('Task ID:', task?.id);
    console.log('Task type:', typeof task?.id);
    
    this.isNewTask = !task || !task.id;
    this.currentTask = task;
    this.currentTaskId = task?.id || null;
    
    console.log('IsNewTask:', this.isNewTask);
    console.log('CurrentTaskId:', this.currentTaskId);
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
    
    // Statut (lecture seule)
    const statut = tache.statut || (isNewTask ? 'Backlog' : '');
    setFieldValue('popup-statut-text', statut);
    
    // Projet
    setFieldValue('popup-projet', tache.projet || '');
    
    // Urgence et Impact
    setFieldValue('popup-urgence', tache.urgence || '');
    setFieldValue('popup-impact', tache.impact || '');
    
    // Stratégie depuis Grist
    setFieldValue('popup-strategie', tache.strategie_id || '');
    if (this.kanban.updateStrategyDetails) {
      this.kanban.updateStrategyDetails(tache.strategie_id);
    }
    
    // Bureaux et responsables (selects multiples)
    setSelectedOptions('popup-bureau', tache.bureau || ['L']);
    setSelectedOptions('popup-qui', tache.qui || ['L']);
    
    console.log('✅ Formulaire rempli');
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
      
      console.log('=== DEBUG: Envoi vers Grist ===');
      console.log('IsNewTask:', this.isNewTask);
      console.log('TABLE_ID:', TABLE_ID);
      console.log('CurrentTaskId:', this.currentTaskId);
      console.log('CurrentTaskId type:', typeof this.currentTaskId);
      console.log('Action à envoyer:', this.isNewTask ? 'AddRecord' : 'UpdateRecord');
      
      // Validation critique
      if (!this.isNewTask && (!this.currentTaskId || this.currentTaskId === null)) {
        console.error('ERREUR CRITIQUE: Tentative UpdateRecord avec currentTaskId null!');
        console.error('CurrentTask:', this.currentTask);
        displayError('Erreur: ID de tâche manquant pour la mise à jour');
        return;
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
          if (descriptionContent) {
            // Ajouter le contenu de description à l'historique
            await userActionManager.addHistoryEntry(
              newTaskId,
              'create',
              `Task created: ${gristData.titre || 'New task'} - ${descriptionContent}`,
              '',
              'Task created',
              gristData.statut || 'À faire'
            );
          } else {
            await userActionManager.createTaskAction(newTaskId, gristData);
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
          const details = descriptionContent ? 
            `Task updated: ${descriptionContent}` : 
            'Task updated via modal';
            
          await userActionManager.updateTaskAction(
            this.currentTaskId, 
            this.currentTask, 
            gristData, 
            details
          );
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
      strategie_id: getFieldValue('popup-strategie') || null
      // NOTE: strategie_objectif, strategie_sous_objectif, strategie_action 
      // are NOT saved - only strategie_id is saved to link to the strategy table
    };
    
    // Debug chaque champ collecté
    console.log('Titre:', data.titre);
    console.log('Statut:', data.statut);
    console.log('Projet:', data.projet);
    console.log('Urgence:', data.urgence);
    console.log('Impact:', data.impact);
    console.log('Bureau (raw):', data.bureau);
    console.log('Qui (raw):', data.qui);
    console.log('Strategie_id (raw):', data.strategie_id);
    
    // Description - conserver la description existante sans modification
    // Le champ de saisie description n'est plus utilisé pour stocker les données
    data.description = this.currentTask?.description || '';
    console.log('Description conservée:', data.description);
    
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
    
    // Remove fields that are auto-computed by Grist formulas
    delete gristData.strategie_objectif;
    delete gristData.strategie_sous_objectif; 
    delete gristData.strategie_action;
    console.log('Removed auto-computed strategy fields');
    
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
}
