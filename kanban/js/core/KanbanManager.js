// === core/KanbanManager.js ===
// Orchestrateur principal all�g� pour l'application Kanban

import { VIEW_MODES } from '../config/constants.js';
import { displayError, toggleLoadingSpinner } from '../utils/dom.js';
import { getEventCentralizer } from './EventCentralizer.js';

// Importation des managers
import { DatePickerManager } from '../managers/DatePickerManager.js';
import { ModalManager } from '../managers/ModalManager.js';
import { HistoryManager } from '../managers/HistoryManager.js';
import { FilterManager } from '../managers/FilterManager.js';
import { ViewManager } from '../managers/ViewManager.js';
import { JalonManager } from '../managers/JalonManager.js';

// Importation du gestionnaire Grist
import { GristManager } from '../managers/GristManager.js';

/**
 * Orchestrateur principal de l'application Kanban (version all�g�e)
 */
export class KanbanManager {
  constructor() {
    // Container principal
    this.kanbanContainer = document.getElementById('kanban-container');
    
    // �tat de l'application
    this.isInitialized = false;
    this.isUpdating = false;
    
    // Gestionnaires sp�cialis�s
    this.gristManager = null;
    this.datePickerManager = null;
    this.modalManager = null;
    this.historyManager = null;
    this.filterManager = null;
    this.viewManager = null;
    this.jalonManager = null;
    
    // �tat des donn�es
    this.currentRecords = [];
    this.gristOptions = {};
    this.strategyData = []; // Données de la table SSIR_strategie2
    
    // �tat de l'interface
    this.viewMode = VIEW_MODES.COMPACT;
    this.filters = {};
    this.showTermine = true;
    this.focusColumn = null;
    
    // Utilisateur courant
    this.currentUser = null;
    
    this.init();
  }
  
  /**
   * Initialise l'application Kanban
   */
  async init() {
    try {
      toggleLoadingSpinner(true);
      
      // V�rifier les pr�requis
      this.checkPrerequisites();
      
      // Initialiser les gestionnaires dans l'ordre
      await this.initializeManagers();
      
      // Charger les donn�es initiales
      await this.loadInitialData();
      
      // Initialiser l'interface
      this.initializeInterface();
      
      // Premier rendu
      this.refreshKanban();
      
      // Initialiser la centralisation des événements
      this.setupEventCentralizer();
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('KanbanManager: Erreur d\'initialisation:', error);
      displayError(`Erreur d'initialisation: ${error.message}`);
    } finally {
      toggleLoadingSpinner(false);
    }
  }
  
  /**
   * V�rifie les pr�requis de l'application
   */
  checkPrerequisites() {
    // V�rifier la pr�sence du container principal
    if (!this.kanbanContainer) {
      throw new Error('Container Kanban non trouv�');
    }
    
    // V�rifier la pr�sence de Grist
    if (typeof window === 'undefined' || typeof window.grist === 'undefined') {
      throw new Error('API Grist non disponible');
    }
    
    // V�rifier Bootstrap
    if (typeof bootstrap === 'undefined') {
      console.warn('KanbanManager: Bootstrap non d�tect�');
    }
    
    // V�rifier SortableJS
    if (typeof Sortable === 'undefined') {
      console.warn('KanbanManager: SortableJS non d�tect�');
    }
    
    // V�rifier Flatpickr
    if (typeof flatpickr === 'undefined') {
      console.warn('KanbanManager: Flatpickr non d�tect�');
    }
  }
  
  /**
   * Initialise tous les gestionnaires sp�cialis�s
   */
  async initializeManagers() {

    // 1. Gestionnaire Grist (données)
    this.gristManager = new GristManager(this);

    // 2. Gestionnaire de dates
    this.datePickerManager = new DatePickerManager(this);

    // 3. Gestionnaire de modals
    this.modalManager = new ModalManager(this);

    // 4. Gestionnaire d'historique
    this.historyManager = new HistoryManager(this);

    // 5. Gestionnaire de filtres
    this.filterManager = new FilterManager(this);

    // 6. Gestionnaire des jalons (doit être initialisé après ModalManager)
    this.jalonManager = new JalonManager(this);

    // 7. Gestionnaire de vues et de rendu
    this.viewManager = new ViewManager(this);

    console.log('KanbanManager: Gestionnaires initialisés');
  }
  
  /**
   * Charge les donn�es initiales
   */
  async loadInitialData() {
    console.log('KanbanManager: Chargement des donn�es...');
    
    // Les donn�es sont charg�es par le GristManager
    // On r�cup�re les r�f�rences
    this.currentRecords = this.gristManager.currentRecords || [];
    this.gristOptions = this.normalizeGristOptions(this.gristManager.gristOptions || {});
    
    // Charger les données stratégiques depuis SSIR_strategie2
    await this.loadStrategyData();
    
    // Obtenir les informations utilisateur
    await this.loadUserInfo();
    
    console.log(`KanbanManager: ${this.currentRecords.length} t�ches charg�es`);
    console.log(`KanbanManager: ${this.strategyData.length} strat�gies charg�es`);
  }
  
  /**
   * Charge les données stratégiques depuis Grist
   */
  async loadStrategyData() {
    try {
      const strategyRecords = await this.gristManager.fetchTable('Ssir_strategie2');
      this.strategyData = this.mapStrategyRecords(strategyRecords);
      this.strategiesData = this.strategyData; // Alias pour ModalManager
      if (this.modalManager && this.strategyData.length > 0) {
        this.modalManager.handleStrategyDataLoaded(this.strategyData);
      }
    } catch (error) {
      console.error('KanbanManager: Erreur lors du chargement des stratégies depuis Grist:', error);
      this.strategyData = [];
      this.strategiesData = [];
      if (this.modalManager) {
        this.modalManager.handleStrategyDataLoaded([]);
      }
      throw new Error(`Chargement des stratégies impossible: ${error?.message || 'erreur inconnue'}`);
    }
  }
  
  /**
   * Affiche une erreur de connexion à l'utilisateur
   */
  displayConnectionError() {
    const container = document.getElementById('kanban-container');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger m-4">
          <h4><i class="bi bi-exclamation-triangle me-2"></i>Erreur de connexion Grist</h4>
          <p>L'application ne peut pas se connecter à la base de données Grist.</p>
          <p><strong>Causes possibles :</strong></p>
          <ul>
            <li>Table "Ssir_strategie2" inexistante ou inaccessible</li>
            <li>Permissions insuffisantes sur le document Grist</li>
            <li>Connexion réseau interrompue</li>
            <li>Document Grist non partagé avec cette application</li>
          </ul>
          <button class="btn btn-primary" onclick="window.location.reload()">
            <i class="bi bi-arrow-clockwise me-1"></i>Recharger la page
          </button>
        </div>
      `;
    }
  }

  /**
   * Mappe les enregistrements de stratégie depuis Grist
   * @param {object} records - Enregistrements bruts de Grist
   * @returns {Array} Enregistrements mappés
   */
  mapStrategyRecords(records) {
    if (!records || !records.id) {
      return [];
    }

    const normalizeColumn = (column) => {
      if (Array.isArray(column)) {
        return column;
      }
      if (column && typeof column === 'object') {
        return Object.keys(column)
          .sort((a, b) => Number(a) - Number(b))
          .map(key => column[key]);
      }
      return [];
    };

    const ids = normalizeColumn(records.id);
    const objectifs = normalizeColumn(records.objectif);
    const sousObjectifs = normalizeColumn(records.sous_objectif);
    const actions = normalizeColumn(records.action);
    const echeances = normalizeColumn(records.echeance);
    const responsables = normalizeColumn(records.responsable);
    const portees = normalizeColumn(records.portee);

    const mapped = [];

    ids.forEach((id, index) => {
      try {
        const parsedId = typeof id === 'number' ? id : parseInt(id, 10);
        const normalizedId = Number.isNaN(parsedId) ? id : parsedId;

        const strategy = {
          id: normalizedId,
          objectif: objectifs[index] || '',
          sous_objectif: sousObjectifs[index] || '',
          action: actions[index] || '',
          echeance: echeances[index] || '',
          responsable: responsables[index] || '',
          portee: portees[index] || ''
        };

        if (strategy.objectif && strategy.action) {
          mapped.push(strategy);
        }
      } catch (error) {
        console.warn('KanbanManager: Erreur mapping stratégie:', index, error);
      }
    });

    return mapped;
  }
  
  /**
   * Charge les informations utilisateur
   */
  async loadUserInfo() {
    try {
      const userInfo = await this.gristManager.getUserInfo();
      if (userInfo && userInfo.user) {
        this.currentUser = userInfo.user.name || userInfo.user.email || 'Utilisateur';
        console.log('KanbanManager: Utilisateur d�tect�:', this.currentUser);
      } else {
        console.log('KanbanManager: Aucun utilisateur d�tect�');
      }
    } catch (error) {
      console.warn('KanbanManager: Impossible de charger les infos utilisateur:', error);
    }
  }
  
  /**
   * Initialise l'interface utilisateur
   */
  initializeInterface() {
    
    // Initialiser les options des formulaires
    this.populateFormOptions();
    
    // Configurer les raccourcis clavier globaux
    this.setupGlobalKeyboardShortcuts();
    
    // Initialiser les contr�les de vue
    this.setupViewControls();
  }
  
  /**
   * Peuple les options des formulaires
   */
  populateFormOptions() {
    if (this.modalManager) {
      // Le ModalManager se charge de peupler les options
      this.modalManager.populateFormOptions?.(this.gristOptions);
    }

    if (this.filterManager) {
      // Le FilterManager se charge des options de filtres
      this.filterManager.populateFilterOptions?.(this.gristOptions);
    }
  }

  /**
   * Normalise les options provenant de Grist pour assurer la compatibilité
   * entre les différents gestionnaires (modal, filtres, etc.).
   * @param {object} rawOptions - Options brutes retournées par le GristManager
   * @returns {object} Options normalisées avec clés singulier/pluriel alignées
   */
  normalizeGristOptions(rawOptions = {}) {
    const sanitizeList = (list) => {
      if (!Array.isArray(list)) return [];

      return [...new Set(
        list
          .filter(value => typeof value === 'string' && value.trim() && value !== 'L')
          .map(value => value.trim())
      )].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    };

    const normalized = { ...rawOptions };

    const bureauList = sanitizeList(
      rawOptions.bureau || rawOptions.bureaux || rawOptions.bureaus || []
    );
    normalized.bureau = bureauList;
    normalized.bureaux = bureauList;

    const responsablesList = sanitizeList(
      rawOptions.responsables || rawOptions.responsable || rawOptions.qui || []
    );
    normalized.responsables = responsablesList;
    normalized.qui = responsablesList;

    const projetList = sanitizeList(rawOptions.projet || rawOptions.projets || []);
    normalized.projet = projetList;
    normalized.projets = projetList;

    const statutList = sanitizeList(rawOptions.statut || rawOptions.statuts || rawOptions.status || []);
    normalized.statut = statutList;
    normalized.statuts = statutList;

    const urgenceList = sanitizeList(rawOptions.urgence || rawOptions.urgences || []);
    normalized.urgence = urgenceList;
    normalized.urgences = urgenceList;

    const impactList = sanitizeList(rawOptions.impact || rawOptions.impacts || []);
    normalized.impact = impactList;
    normalized.impacts = impactList;

    return normalized;
  }
  
  /**
   * Configure les raccourcis clavier globaux
   * Note: Désactivé temporairement pour éviter les conflits avec jQuery
   */
  setupGlobalKeyboardShortcuts() {
    // DÉSACTIVÉ: Event listeners gérés centralement via jQuery dans kanban-app.js
    
    /*
    document.addEventListener('keydown', (e) => {
      // Ignorer si on est dans un champ de saisie
      if (e.target.matches('input, textarea, select')) return;
      
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          this.createNewTask();
          break;
          
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.refreshKanban();
          }
          break;
          
        case 'f':
          e.preventDefault();
          this.focusSearchInput();
          break;
          
        case 'escape':
          this.closeAllModals();
          break;
      }
    });
    */
  }
  
  /**
   * Configure les contr�les de vue
   */
  setupViewControls() {
    // Aligner l'état interne sur le gestionnaire de vues (détaillé par défaut)
    const managerMode = this.viewManager?.currentMode;
    const fallbackMode = this.filterManager?.viewMode || this.viewMode || VIEW_MODES.COMPACT;
    const resolvedMode = managerMode || fallbackMode;

    this.viewMode = resolvedMode;

    if (this.viewManager && managerMode !== resolvedMode) {
      this.viewManager.currentMode = resolvedMode;
      this.viewManager.updateViewModeButtons();
    }
  }
  
  /**
   * Rafra�chit l'affichage du Kanban
   */
  refreshKanban() {
    if (!this.isInitialized || this.isUpdating) {
      console.log('KanbanManager: Rafra�chissement ignor� (pas initialis� ou en cours de mise � jour)');
      return;
    }
    
    try {
      // R�cup�rer les donn�es filtr�es
      const filteredRecords = this.getFilteredRecords();
      
      // Déléguer le rendu au ViewManager
      if (this.viewManager) {
        this.viewManager.renderKanban(this.viewMode, filteredRecords, {
          showTermine: this.showTermine,
          focusColumn: this.focusColumn,
          container: this.kanbanContainer
        });

        if (typeof this.viewManager.onKanbanRendered === 'function') {
          this.viewManager.onKanbanRendered();
        }
      }
      
    } catch (error) {
      console.error('KanbanManager: Erreur lors du rafra�chissement:', error);
      displayError('Erreur lors de l\'affichage du Kanban');
    }
  }
  
  /**
   * Obtient les enregistrements filtr�s
   * @returns {Array} Enregistrements filtr�s
   */
  getFilteredRecords() {
    if (this.filterManager && typeof this.filterManager.filterRecords === 'function') {
      return this.filterManager.filterRecords(this.currentRecords);
    }
    
    // Fallback: retourner tous les enregistrements
    return this.currentRecords || [];
  }
  
  /**
   * Cr�e une nouvelle t�che
   */
  createNewTask() {
    if (this.modalManager) {
      this.modalManager.openTaskModal();
    } else {
      displayError('Gestionnaire de modals non disponible');
    }
  }
  
  /**
   * Focus sur le champ de recherche
   */
  focusSearchInput() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }
  
  /**
   * Ferme toutes les modals ouvertes
   */
  closeAllModals() {
    if (this.modalManager) {
      this.modalManager.closeAllModals();
    }
  }
  
  /**
   * Sauvegarde une t�che (appel�e par le ModalManager)
   * @param {object} taskData - Donn�es de la t�che
   * @param {number|null} taskId - ID pour mise � jour
   * @returns {Promise} Promise r�solue quand la sauvegarde est termin�e
   */
  async saveTaskData(taskData, taskId = null) {
    if (!this.gristManager) {
      throw new Error('Gestionnaire Grist non disponible');
    }
    
    try {
      const result = await this.gristManager.saveRecord(taskData, taskId);
      
      // Rafra�chir l'affichage
      this.refreshKanban();
      
      return result;
      
    } catch (error) {
      console.error('KanbanManager: Erreur sauvegarde t�che:', error);
      throw error;
    }
  }
  
  /**
   * Supprime une t�che (appel�e par le ModalManager)
   * @param {number} taskId - ID de la t�che � supprimer
   * @returns {Promise} Promise r�solue quand la suppression est termin�e
   */
  async deleteTaskById(taskId) {
    if (!this.gristManager) {
      throw new Error('Gestionnaire Grist non disponible');
    }
    
    try {
      await this.gristManager.deleteRecord(taskId);
      
      // Rafra�chir l'affichage
      this.refreshKanban();
      
    } catch (error) {
      console.error('KanbanManager: Erreur suppression t�che:', error);
      throw error;
    }
  }
  
  resolveStatusFromElement(element) {
    if (!element) return null;

    if (element.dataset) {
      if (element.dataset.status) {
        return element.dataset.status;
      }
      if (element.dataset.statusId) {
        return element.dataset.statusId;
      }
    }

    const statusNode = element.closest?.('[data-status]');
    if (statusNode?.dataset?.status) {
      return statusNode.dataset.status;
    }

    const statusIdNode = element.closest?.('[data-status-id]');
    if (statusIdNode?.dataset?.statusId) {
      return statusIdNode.dataset.statusId;
    }

    return null;
  }

  /**
   * G�re le drag & drop d'une t�che
   * @param {Event} evt - �v�nement de drag
   * @param {string} targetStatus - Statut de destination
   */
  async handleDragEnd(evt, targetStatus) {
    const itemEl = evt?.item;
    const rawTaskId = itemEl?.dataset?.id;
    const taskId = Number(rawTaskId);
    const statusFromDom = this.resolveStatusFromElement(evt?.to);
    const newStatus = targetStatus || statusFromDom;

    if (!Number.isInteger(taskId)) {
      console.error('KanbanManager: Drag&drop - identifiant t�che invalide', rawTaskId);
      displayError("Impossible d'identifier la t�che d�plac�e.");
      this.refreshKanban();
      return;
    }

    if (!newStatus) {
      console.error('KanbanManager: Drag&drop - statut cible introuvable', evt?.to);
      displayError("Impossible de d�terminer la colonne cible du d�placement.");
      this.refreshKanban();
      return;
    }

    const task = this.currentRecords.find(r => r.id === taskId);

    if (!task) {
      console.error('KanbanManager: Drag&drop - t�che introuvable', taskId);
      this.refreshKanban();
      return;
    }

    const oldStatus = task.statut;
    if (oldStatus === newStatus) {
      console.log('KanbanManager: Drag&drop ignor� (m�me statut)', { taskId, newStatus });
      return;
    }

    console.log(`KanbanManager: D�placement t�che ${taskId}: ${oldStatus} → ${newStatus}`);

    try {
      // Pr�parer les donn�es de mise � jour
      const updateData = { statut: newStatus };

      // Ajouter l'historique si le HistoryManager est disponible
      if (this.historyManager && typeof this.historyManager.updateTaskHistory === 'function') {
        const historyUpdate = this.historyManager.updateTaskHistory(task, newStatus);
        Object.assign(updateData, historyUpdate);
      }

      // Sauvegarder via GristManager
      await this.gristManager.saveRecord(updateData, taskId);

      console.log('KanbanManager: D�placement r�ussi');

    } catch (error) {
      console.error('KanbanManager: Erreur lors du d�placement:', error);
      displayError(`Erreur: ${error.message}`);

      // Rafra�chir pour annuler le d�placement visuel
      this.refreshKanban();
    }
  }
  
  /**
   * Callback appel� quand les donn�es Grist sont recharg�es
   * @param {Array} newRecords - Nouveaux enregistrements
   * @param {object} newOptions - Nouvelles options
   */
  async onDataReloaded(newRecords, newOptions) {
    console.log('KanbanManager: Donn�es recharg�es depuis Grist');

    this.currentRecords = newRecords || [];
    this.gristOptions = this.normalizeGristOptions(newOptions || {});

    // Mettre � jour les options des formulaires
    this.populateFormOptions();

    try {
      await this.loadStrategyData();
    } catch (error) {
      console.warn('KanbanManager: Impossible de recharger les strat�gies apr�s synchronisation:', error);
    }

    // Rafra�chir l'affichage seulement si pas en cours de mise � jour
    if (!this.isUpdating) {
      this.refreshKanban();
    } else {
      console.log('KanbanManager: Refresh ignor� car mise � jour en cours');
    }
  }
  
  /**
   * Callback appel� quand une date est chang�e
   * @param {string|null} newDate - Nouvelle date
   */
  onDateChanged(newDate) {
    // Callback pour le DatePickerManager
    console.log('KanbanManager: Date chang�e:', newDate);
  }
  
  /**
   * Obtient la derni�re description d'une t�che (pour la compatibilit�)
   * @param {string} description - Description avec historique
   * @returns {string} Derni�re description
   */
  getLatestDescription(description) {
    if (this.historyManager && typeof this.historyManager.getLatestDescription === 'function') {
      return this.historyManager.getLatestDescription(description);
    }
    
    // Fallback simple
    if (!description) return '';
    
    const lines = description.split('\n');
    const firstTimestampIndex = lines.findIndex(line => line.match(/^\(.*\)$/));
    
    if (firstTimestampIndex >= 0) {
      const separatorIndex = lines.findIndex((line, index) => 
        index > firstTimestampIndex && line.trim() === '---'
      );
      
      const endIndex = separatorIndex >= 0 ? separatorIndex : lines.length;
      return lines.slice(firstTimestampIndex + 1, endIndex).join('\n').trim();
    }
    
    return description;
  }
  
  /**
   * Ajoute un timestamp � une description (pour la compatibilit�)
   * @param {string} currentDescription - Description actuelle
   * @param {string} newContent - Nouveau contenu
   * @param {string} userName - Nom d'utilisateur
   * @returns {string} Description avec timestamp
   */
  addTimestampToDescription(currentDescription, newContent, userName = null) {
    if (this.historyManager && typeof this.historyManager.addTimestampToDescription === 'function') {
      return this.historyManager.addTimestampToDescription(currentDescription, newContent, userName);
    }
    
    // Fallback simple
    const user = userName || this.currentUser;
    const now = new Date();
    const timestamp = now.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const userSuffix = user ? ` (${user})` : '';
    const separator = '---';
    
    if (!newContent || newContent.trim() === '') {
      return currentDescription || '';
    }
    
    if (!currentDescription || currentDescription.trim() === '') {
      return `[${timestamp}${userSuffix}]\n${newContent.trim()}`;
    }
    
    return `[${timestamp}${userSuffix}]\n${newContent.trim()}\n\n${separator}\n\n${currentDescription}`;
  }
  
  /**
   * Change le mode de vue
   * @param {string} newMode - Nouveau mode de vue
   */
  setViewMode(newMode) {
    if (!Object.values(VIEW_MODES).includes(newMode)) {
      console.warn('KanbanManager: Mode de vue invalide:', newMode);
      return;
    }
    
    this.viewMode = newMode;
    
    // Notifier le FilterManager
    if (this.filterManager && typeof this.filterManager.setViewMode === 'function') {
      this.filterManager.setViewMode(newMode);
    } else {
      // Fallback: rafra�chir directement
      this.refreshKanban();
    }
    
    console.log('KanbanManager: Mode de vue chang�:', newMode);
  }
  
  /**
   * Applique des filtres
   * @param {object} newFilters - Nouveaux filtres
   */
  applyFilters(newFilters = {}) {
    this.filters = { ...this.filters, ...newFilters };
    
    // Notifier le FilterManager
    if (this.filterManager && typeof this.filterManager.applyFilters === 'function') {
      this.filterManager.applyFilters();
    } else {
      // Fallback: rafra�chir directement
      this.refreshKanban();
    }
  }
  
  /**
   * Exporte les donn�es du Kanban
   * @param {string} format - Format d'export ('csv', 'json')
   * @returns {string} Donn�es export�es
   */
  exportData(format = 'csv') {
    if (!this.gristManager) {
      throw new Error('Gestionnaire Grist non disponible');
    }
    
    switch (format.toLowerCase()) {
      case 'csv':
        return this.gristManager.exportToCSV();
        
      case 'json':
        return JSON.stringify({
          metadata: {
            exportDate: new Date().toISOString(),
            recordCount: this.currentRecords.length,
            version: '1.0'
          },
          records: this.currentRecords,
          options: this.gristOptions
        }, null, 2);
        
      default:
        throw new Error(`Format d'export non support�: ${format}`);
    }
  }
  
  /**
   * Obtient les statistiques du Kanban
   * @returns {object} Statistiques d�taill�es
   */
  getStatistics() {
    const stats = {
      total: this.currentRecords.length,
      byStatus: {},
      byPriority: {},
      withDeadlines: 0,
      overdue: 0,
      urgent: 0,
      recentlyCreated: 0,
      recentlyUpdated: 0
    };
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    this.currentRecords.forEach(record => {
      // Par statut
      const status = record.statut || 'Non d�fini';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Par priorit� (calcul simplifi�)
      const priority = this.calculateSimplePriority(record);
      stats.byPriority[`P${priority}`] = (stats.byPriority[`P${priority}`] || 0) + 1;
      
      // Avec �ch�ances
      if (record.date_echeance) {
        stats.withDeadlines++;
        
        const deadline = new Date(record.date_echeance);
        if (deadline < now && record.statut !== 'Termin�') {
          stats.overdue++;
        } else if (deadline <= threeDaysFromNow && record.statut !== 'Termin�') {
          stats.urgent++;
        }
      }
      
      // R�cemment cr��es (approximation par ID �lev�)
      if (record.id && this.currentRecords.length > 0) {
        const maxId = Math.max(...this.currentRecords.map(r => r.id));
        if (record.id > (maxId - 5)) {
          stats.recentlyCreated++;
        }
      }
      
      // R�cemment mises � jour
      if (record.date_derniere_maj) {
        const lastUpdate = new Date(record.date_derniere_maj);
        if (lastUpdate > oneDayAgo) {
          stats.recentlyUpdated++;
        }
      }
    });
    
    return stats;
  }
  
  /**
   * Calcule une priorit� simplifi�e
   * @param {object} record - Enregistrement
   * @returns {number} Priorit� (1-4)
   */
  calculateSimplePriority(record) {
    if (this.viewManager && typeof this.viewManager.calculatePriority === 'function') {
      return this.viewManager.calculatePriority(record.urgence, record.impact);
    }
    
    // Fallback simple
    const impact = String(record.impact || '').toLowerCase();
    const urgence = String(record.urgence || '').toLowerCase();
    
    if (impact === 'critique') return 1;
    if (impact === 'important') return (urgence === 'imm�diate' || urgence === 'courte') ? 1 : 2;
    if (impact === 'mod�r�') return (urgence === 'imm�diate') ? 2 : 3;
    return 4;
  }
  
  /**
   * Recherche des t�ches
   * @param {string} query - Requ�te de recherche
   * @returns {Array} T�ches correspondantes
   */
  searchTasks(query) {
    if (!query || query.trim() === '') {
      return this.currentRecords;
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    return this.currentRecords.filter(record => {
      const searchableText = [
        record.titre || '',
        record.description || '',
        record.projet || '',
        record.strategie_objectif || '',
        record.strategie_sous_objectif || '',
        record.strategie_action || '',
        record.notes || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }
  
  /**
   * Obtient une t�che par ID
   * @param {number} taskId - ID de la t�che
   * @returns {object|null} T�che trouv�e ou null
   */
  getTaskById(taskId) {
    return this.currentRecords.find(record => record.id === taskId) || null;
  }
  
  /**
   * V�rifie si l'application est pr�te
   * @returns {boolean} True si pr�te
   */
  isReady() {
    return this.isInitialized && 
           this.gristManager && 
           this.gristManager.isGristConnected();
  }
  
  /**
   * Obtient l'�tat complet de l'application
   * @returns {object} �tat complet
   */
  getApplicationState() {
    return {
      isInitialized: this.isInitialized,
      isUpdating: this.isUpdating,
      currentUser: this.currentUser,
      viewMode: this.viewMode,
      filters: this.filters,
      showTermine: this.showTermine,
      focusColumn: this.focusColumn,
      recordCount: this.currentRecords.length,
      gristConnected: this.gristManager?.isGristConnected() || false,
      managers: {
        grist: !!this.gristManager,
        modal: !!this.modalManager,
        history: !!this.historyManager,
        filter: !!this.filterManager,
        datePicker: !!this.datePickerManager,
        view: !!this.viewManager
      }
    };
  }
  
  /**
   * Mode debug : affiche l'�tat dans la console
   */
  debugInfo() {
    console.group('?? KanbanManager Debug Info');
    console.log('�tat:', this.getApplicationState());
    console.log('Statistiques:', this.getStatistics());
    console.log('Enregistrements:', this.currentRecords);
    console.log('Options Grist:', this.gristOptions);
    if (this.gristManager) {
      console.log('�tat Grist:', this.gristManager.exportState());
    }
    console.groupEnd();
  }
  
  /**
   * Red�marre l'application
   */
  async restart() {
    console.log('KanbanManager: Red�marrage de l\'application...');
    
    try {
      // Nettoyer l'�tat actuel
      this.destroy();
      
      // R�initialiser les variables
      this.isInitialized = false;
      this.isUpdating = false;
      this.currentRecords = [];
      this.gristOptions = {};
      
      // Relancer l'initialisation
      await this.init();

      console.log('KanbanManager: Application redémarrée');
      
    } catch (error) {
      console.error('KanbanManager: Erreur lors du red�marrage:', error);
      displayError('Erreur lors du red�marrage');
    }
  }
  
  /**
   * Nettoie toutes les ressources
   */
  destroy() {
    console.log('KanbanManager: Nettoyage des ressources...');
    
    // Nettoyer les gestionnaires
    if (this.gristManager) {
      this.gristManager.destroy();
      this.gristManager = null;
    }
    
    if (this.modalManager) {
      this.modalManager.destroy();
      this.modalManager = null;
    }
    
    if (this.historyManager) {
      this.historyManager.destroy();
      this.historyManager = null;
    }
    
    if (this.filterManager) {
      this.filterManager.destroy();
      this.filterManager = null;
    }
    
    if (this.datePickerManager) {
      this.datePickerManager.destroy();
      this.datePickerManager = null;
    }
    
    if (this.viewManager) {
      this.viewManager.destroy();
      this.viewManager = null;
    }
    
    // Nettoyer le container
    if (this.kanbanContainer) {
      this.kanbanContainer.innerHTML = '';
    }
    
    // R�initialiser l'�tat
    this.isInitialized = false;
    this.currentRecords = [];
    this.gristOptions = {};
    this.strategyData = [];
    
    console.log('KanbanManager: Ressources nettoy�es');
  }
  
  /**
   * Configure la centralisation des événements
   */
  setupEventCentralizer() {
    const eventCentralizer = getEventCentralizer();
    
    // Enregistrer tous les managers pour délégation
    eventCentralizer.registerManager('history', this.historyManager);
    eventCentralizer.registerManager('viewMode', this.viewManager);
    eventCentralizer.registerManager('modal', this.modalManager);
    eventCentralizer.registerManager('jalon', this.jalonManager);
    eventCentralizer.registerManager('filter', this.filterManager);
    
    this.eventCentralizer = eventCentralizer;
  }
}