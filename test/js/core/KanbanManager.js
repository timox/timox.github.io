// === core/KanbanManager.js ===
// Orchestrateur principal all�g� pour l'application Kanban

import { VIEW_MODES, STATUTS } from '../config/constants.js';
import { displayError, displaySuccess, toggleLoadingSpinner } from '../utils/dom.js';

// Importation des managers
import { DatePickerManager } from '../managers/DatePickerManager.js';
import { ModalManager } from '../managers/ModalManager.js';
import { HistoryManager } from '../managers/HistoryManager.js';
import { FilterManager } from '../managers/FilterManager.js';

// Importation des renderers
import { CardRenderer } from '../renderers/CardRenderer.js';
import { BoardRenderer } from '../renderers/BoardRenderer.js';

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
    this.cardRenderer = null;
    this.boardRenderer = null;
    
    // �tat des donn�es
    this.currentRecords = [];
    this.gristOptions = {};
    
    // �tat de l'interface
    // Le mode de vue est géré par ViewModeManager
    this.filters = {};
    this.showTermine = true;
    // La colonne focus est gérée par ViewModeManager
    
    // Utilisateur courant
    this.currentUser = null;
    
    this.init();
  }
  
  /**
   * Initialise l'application Kanban
   */
  async init() {
    try {
      console.log('KanbanManager: Initialisation...');
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
      
      this.isInitialized = true;
      console.log('KanbanManager: Initialisation termin�e avec succ�s');
      displaySuccess('Kanban initialis� avec succ�s');
      
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
    if (typeof grist === 'undefined') {
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
    console.log('KanbanManager: Initialisation des gestionnaires...');
    
    // 1. Gestionnaire Grist (donn�es)
    this.gristManager = new GristManager(this);
    
    // 2. Renderers (interface)
    this.cardRenderer = new CardRenderer(this);
    this.boardRenderer = new BoardRenderer(this, this.cardRenderer);
    
    // 3. Gestionnaire de dates
    this.datePickerManager = new DatePickerManager(this);
    
    // 4. Gestionnaire de modals
    this.modalManager = new ModalManager(this);
    
    // 5. Gestionnaire d'historique
    this.historyManager = new HistoryManager(this);
    
    // 6. Gestionnaire de filtres (en dernier car il d�pend des autres)
    this.filterManager = new FilterManager(this);
    
    console.log('KanbanManager: Gestionnaires initialis�s');
  }
  
  /**
   * Charge les donn�es initiales
   */
  async loadInitialData() {
    console.log('KanbanManager: Chargement des donn�es...');
    
    // Les donn�es sont charg�es par le GristManager
    // On r�cup�re les r�f�rences
    this.currentRecords = this.gristManager.currentRecords || [];
    this.gristOptions = this.gristManager.gristOptions || {};
    
    // Obtenir les informations utilisateur
    await this.loadUserInfo();
    
    console.log(`KanbanManager: ${this.currentRecords.length} t�ches charg�es`);
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
    console.log('KanbanManager: Initialisation de l\'interface...');
    
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
   * Configure les raccourcis clavier globaux
   */
  setupGlobalKeyboardShortcuts() {
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
  }
  
  /**
   * Configure les contr�les de vue
   */
  setupViewControls() {
    // Les contr�les sont g�r�s par le FilterManager
    // On s'assure juste que l'�tat initial est correct
    // Le mode de vue est géré par ViewModeManager
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
      
      // D�l�guer le rendu au BoardRenderer
      if (this.boardRenderer) {
        this.boardRenderer.renderKanban(this.viewModeManager?.getCurrentMode() || VIEW_MODES.COMPACT, filteredRecords, {
          showTermine: this.showTermine,
          focusColumn: this.viewModeManager?.getFocusColumn(),
          container: this.kanbanContainer
        });
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
  
  /**
   * G�re le drag & drop d'une t�che
   * @param {Event} evt - �v�nement de drag
   * @param {string} targetStatus - Statut de destination
   */
  async handleDragEnd(evt, targetStatus) {
    if (!evt.item || !evt.item.dataset) return;
    
    const taskId = parseInt(evt.item.dataset.id, 10);
    if (isNaN(taskId)) return;
    
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task) return;
    
    const oldStatus = task.statut;
    if (oldStatus === targetStatus) return;
    
    console.log(`KanbanManager: D�placement t�che ${taskId}: ${oldStatus} ? ${targetStatus}`);
    
    try {
      // Pr�parer les donn�es de mise � jour
      const updateData = { statut: targetStatus };
      
      // Ajouter l'historique si le HistoryManager est disponible
      if (this.historyManager && typeof this.historyManager.updateTaskHistory === 'function') {
        const historyUpdate = this.historyManager.updateTaskHistory(task, targetStatus);
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
  onDataReloaded(newRecords, newOptions) {
    console.log('KanbanManager: Donn�es recharg�es depuis Grist');
    
    this.currentRecords = newRecords || [];
    this.gristOptions = newOptions || {};
    
    // Mettre � jour les options des formulaires
    this.populateFormOptions();
    
    // Rafra�chir l'affichage
    this.refreshKanban();
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
    console.warn('KanbanManager.setViewMode() est déprécié. Utiliser viewModeManager.setViewMode()');
    if (this.viewModeManager) {
      this.viewModeManager.setViewMode(newMode);
    }
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
    if (this.cardRenderer && typeof this.cardRenderer.calculatePriority === 'function') {
      return this.cardRenderer.calculatePriority(record.urgence, record.impact);
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
      viewMode: this.viewModeManager?.getCurrentMode() || VIEW_MODES.COMPACT,
      filters: this.filters,
      showTermine: this.showTermine,
      focusColumn: this.viewModeManager?.getFocusColumn(),
      recordCount: this.currentRecords.length,
      gristConnected: this.gristManager?.isGristConnected() || false,
      managers: {
        grist: !!this.gristManager,
        modal: !!this.modalManager,
        history: !!this.historyManager,
        filter: !!this.filterManager,
        datePicker: !!this.datePickerManager
      },
      renderers: {
        card: !!this.cardRenderer,
        board: !!this.boardRenderer
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
      
      displaySuccess('Application red�marr�e avec succ�s');
      
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
    
    if (this.boardRenderer) {
      this.boardRenderer.destroy();
      this.boardRenderer = null;
    }
    
    // Nettoyer le container
    if (this.kanbanContainer) {
      this.kanbanContainer.innerHTML = '';
    }
    
    // R�initialiser l'�tat
    this.isInitialized = false;
    this.currentRecords = [];
    this.gristOptions = {};
    
    console.log('KanbanManager: Ressources nettoy�es');
  }
}