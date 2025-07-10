// === core/KanbanManager.js ===
// Orchestrateur principal allégé pour l'application Kanban

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
import { GristManager } from './GristManager.js';

/**
 * Orchestrateur principal de l'application Kanban (version allégée)
 */
export class KanbanManager {
  constructor() {
    // Container principal
    this.kanbanContainer = document.getElementById('kanban-container');
    
    // État de l'application
    this.isInitialized = false;
    this.isUpdating = false;
    
    // Gestionnaires spécialisés
    this.gristManager = null;
    this.datePickerManager = null;
    this.modalManager = null;
    this.historyManager = null;
    this.filterManager = null;
    this.cardRenderer = null;
    this.boardRenderer = null;
    
    // État des données
    this.currentRecords = [];
    this.gristOptions = {};
    
    // État de l'interface
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
      console.log('KanbanManager: Initialisation...');
      toggleLoadingSpinner(true);
      
      // Vérifier les prérequis
      this.checkPrerequisites();
      
      // Initialiser les gestionnaires dans l'ordre
      await this.initializeManagers();
      
      // Charger les données initiales
      await this.loadInitialData();
      
      // Initialiser l'interface
      this.initializeInterface();
      
      // Premier rendu
      this.refreshKanban();
      
      this.isInitialized = true;
      console.log('KanbanManager: Initialisation terminée avec succès');
      displaySuccess('Kanban initialisé avec succès');
      
    } catch (error) {
      console.error('KanbanManager: Erreur d\'initialisation:', error);
      displayError(`Erreur d'initialisation: ${error.message}`);
    } finally {
      toggleLoadingSpinner(false);
    }
  }
  
  /**
   * Vérifie les prérequis de l'application
   */
  checkPrerequisites() {
    // Vérifier la présence du container principal
    if (!this.kanbanContainer) {
      throw new Error('Container Kanban non trouvé');
    }
    
    // Vérifier la présence de Grist
    if (typeof grist === 'undefined') {
      throw new Error('API Grist non disponible');
    }
    
    // Vérifier Bootstrap
    if (typeof bootstrap === 'undefined') {
      console.warn('KanbanManager: Bootstrap non détecté');
    }
    
    // Vérifier SortableJS
    if (typeof Sortable === 'undefined') {
      console.warn('KanbanManager: SortableJS non détecté');
    }
    
    // Vérifier Flatpickr
    if (typeof flatpickr === 'undefined') {
      console.warn('KanbanManager: Flatpickr non détecté');
    }
  }
  
  /**
   * Initialise tous les gestionnaires spécialisés
   */
  async initializeManagers() {
    console.log('KanbanManager: Initialisation des gestionnaires...');
    
    // 1. Gestionnaire Grist (données)
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
    
    // 6. Gestionnaire de filtres (en dernier car il dépend des autres)
    this.filterManager = new FilterManager(this);
    
    console.log('KanbanManager: Gestionnaires initialisés');
  }
  
  /**
   * Charge les données initiales
   */
  async loadInitialData() {
    console.log('KanbanManager: Chargement des données...');
    
    // Les données sont chargées par le GristManager
    // On récupère les références
    this.currentRecords = this.gristManager.currentRecords || [];
    this.gristOptions = this.gristManager.gristOptions || {};
    
    // Obtenir les informations utilisateur
    await this.loadUserInfo();
    
    console.log(`KanbanManager: ${this.currentRecords.length} tâches chargées`);
  }
  
  /**
   * Charge les informations utilisateur
   */
  async loadUserInfo() {
    try {
      const userInfo = await this.gristManager.getUserInfo();
      if (userInfo && userInfo.user) {
        this.currentUser = userInfo.user.name || userInfo.user.email || 'Utilisateur';
        console.log('KanbanManager: Utilisateur détecté:', this.currentUser);
      } else {
        console.log('KanbanManager: Aucun utilisateur détecté');
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
    
    // Initialiser les contrôles de vue
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
   * Configure les contrôles de vue
   */
  setupViewControls() {
    // Les contrôles sont gérés par le FilterManager
    // On s'assure juste que l'état initial est correct
    this.viewMode = this.filterManager?.viewMode || VIEW_MODES.COMPACT;
  }
  
  /**
   * Rafraîchit l'affichage du Kanban
   */
  refreshKanban() {
    if (!this.isInitialized || this.isUpdating) {
      console.log('KanbanManager: Rafraîchissement ignoré (pas initialisé ou en cours de mise à jour)');
      return;
    }
    
    try {
      // Récupérer les données filtrées
      const filteredRecords = this.getFilteredRecords();
      
      // Déléguer le rendu au BoardRenderer
      if (this.boardRenderer) {
        this.boardRenderer.renderKanban(this.viewMode, filteredRecords, {
          showTermine: this.showTermine,
          focusColumn: this.focusColumn,
          container: this.kanbanContainer
        });
      }
      
    } catch (error) {
      console.error('KanbanManager: Erreur lors du rafraîchissement:', error);
      displayError('Erreur lors de l\'affichage du Kanban');
    }
  }
  
  /**
   * Obtient les enregistrements filtrés
   * @returns {Array} Enregistrements filtrés
   */
  getFilteredRecords() {
    if (this.filterManager && typeof this.filterManager.filterRecords === 'function') {
      return this.filterManager.filterRecords(this.currentRecords);
    }
    
    // Fallback: retourner tous les enregistrements
    return this.currentRecords || [];
  }
  
  /**
   * Crée une nouvelle tâche
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
   * Sauvegarde une tâche (appelée par le ModalManager)
   * @param {object} taskData - Données de la tâche
   * @param {number|null} taskId - ID pour mise à jour
   * @returns {Promise} Promise résolue quand la sauvegarde est terminée
   */
  async saveTaskData(taskData, taskId = null) {
    if (!this.gristManager) {
      throw new Error('Gestionnaire Grist non disponible');
    }
    
    try {
      const result = await this.gristManager.saveRecord(taskData, taskId);
      
      // Rafraîchir l'affichage
      this.refreshKanban();
      
      return result;
      
    } catch (error) {
      console.error('KanbanManager: Erreur sauvegarde tâche:', error);
      throw error;
    }
  }
  
  /**
   * Supprime une tâche (appelée par le ModalManager)
   * @param {number} taskId - ID de la tâche à supprimer
   * @returns {Promise} Promise résolue quand la suppression est terminée
   */
  async deleteTaskById(taskId) {
    if (!this.gristManager) {
      throw new Error('Gestionnaire Grist non disponible');
    }
    
    try {
      await this.gristManager.deleteRecord(taskId);
      
      // Rafraîchir l'affichage
      this.refreshKanban();
      
    } catch (error) {
      console.error('KanbanManager: Erreur suppression tâche:', error);
      throw error;
    }
  }
  
  /**
   * Gère le drag & drop d'une tâche
   * @param {Event} evt - Événement de drag
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
    
    console.log(`KanbanManager: Déplacement tâche ${taskId}: ${oldStatus} ? ${targetStatus}`);
    
    try {
      // Préparer les données de mise à jour
      const updateData = { statut: targetStatus };
      
      // Ajouter l'historique si le HistoryManager est disponible
      if (this.historyManager && typeof this.historyManager.updateTaskHistory === 'function') {
        const historyUpdate = this.historyManager.updateTaskHistory(task, targetStatus);
        Object.assign(updateData, historyUpdate);
      }
      
      // Sauvegarder via GristManager
      await this.gristManager.saveRecord(updateData, taskId);
      
      console.log('KanbanManager: Déplacement réussi');
      
    } catch (error) {
      console.error('KanbanManager: Erreur lors du déplacement:', error);
      displayError(`Erreur: ${error.message}`);
      
      // Rafraîchir pour annuler le déplacement visuel
      this.refreshKanban();
    }
  }
  
  /**
   * Callback appelé quand les données Grist sont rechargées
   * @param {Array} newRecords - Nouveaux enregistrements
   * @param {object} newOptions - Nouvelles options
   */
  onDataReloaded(newRecords, newOptions) {
    console.log('KanbanManager: Données rechargées depuis Grist');
    
    this.currentRecords = newRecords || [];
    this.gristOptions = newOptions || {};
    
    // Mettre à jour les options des formulaires
    this.populateFormOptions();
    
    // Rafraîchir l'affichage
    this.refreshKanban();
  }
  
  /**
   * Callback appelé quand une date est changée
   * @param {string|null} newDate - Nouvelle date
   */
  onDateChanged(newDate) {
    // Callback pour le DatePickerManager
    console.log('KanbanManager: Date changée:', newDate);
  }
  
  /**
   * Obtient la dernière description d'une tâche (pour la compatibilité)
   * @param {string} description - Description avec historique
   * @returns {string} Dernière description
   */
  getLatestDescription(description) {
    if (this.historyManager && typeof this.historyManager.getLatestDescription === 'function') {
      return this.historyManager.getLatestDescription(description);
    }
    
    // Fallback simple
    if (!description) return '';
    
    const lines = description.split('\n');
    const firstTimestampIndex = lines.findIndex(line => line.match(/^\[.*\]$/));
    
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
   * Ajoute un timestamp à une description (pour la compatibilité)
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
      // Fallback: rafraîchir directement
      this.refreshKanban();
    }
    
    console.log('KanbanManager: Mode de vue changé:', newMode);
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
      // Fallback: rafraîchir directement
      this.refreshKanban();
    }
  }
  
  /**
   * Exporte les données du Kanban
   * @param {string} format - Format d'export ('csv', 'json')
   * @returns {string} Données exportées
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
        throw new Error(`Format d'export non supporté: ${format}`);
    }
  }
  
  /**
   * Obtient les statistiques du Kanban
   * @returns {object} Statistiques détaillées
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
      const status = record.statut || 'Non défini';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Par priorité (calcul simplifié)
      const priority = this.calculateSimplePriority(record);
      stats.byPriority[`P${priority}`] = (stats.byPriority[`P${priority}`] || 0) + 1;
      
      // Avec échéances
      if (record.date_echeance) {
        stats.withDeadlines++;
        
        const deadline = new Date(record.date_echeance);
        if (deadline < now && record.statut !== 'Terminé') {
          stats.overdue++;
        } else if (deadline <= threeDaysFromNow && record.statut !== 'Terminé') {
          stats.urgent++;
        }
      }
      
      // Récemment créées (approximation par ID élevé)
      if (record.id && this.currentRecords.length > 0) {
        const maxId = Math.max(...this.currentRecords.map(r => r.id));
        if (record.id > (maxId - 5)) {
          stats.recentlyCreated++;
        }
      }
      
      // Récemment mises à jour
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
   * Calcule une priorité simplifiée
   * @param {object} record - Enregistrement
   * @returns {number} Priorité (1-4)
   */
  calculateSimplePriority(record) {
    if (this.cardRenderer && typeof this.cardRenderer.calculatePriority === 'function') {
      return this.cardRenderer.calculatePriority(record.urgence, record.impact);
    }
    
    // Fallback simple
    const impact = String(record.impact || '').toLowerCase();
    const urgence = String(record.urgence || '').toLowerCase();
    
    if (impact === 'critique') return 1;
    if (impact === 'important') return (urgence === 'immédiate' || urgence === 'courte') ? 1 : 2;
    if (impact === 'modéré') return (urgence === 'immédiate') ? 2 : 3;
    return 4;
  }
  
  /**
   * Recherche des tâches
   * @param {string} query - Requête de recherche
   * @returns {Array} Tâches correspondantes
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
   * Obtient une tâche par ID
   * @param {number} taskId - ID de la tâche
   * @returns {object|null} Tâche trouvée ou null
   */
  getTaskById(taskId) {
    return this.currentRecords.find(record => record.id === taskId) || null;
  }
  
  /**
   * Vérifie si l'application est prête
   * @returns {boolean} True si prête
   */
  isReady() {
    return this.isInitialized && 
           this.gristManager && 
           this.gristManager.isGristConnected();
  }
  
  /**
   * Obtient l'état complet de l'application
   * @returns {object} État complet
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
        datePicker: !!this.datePickerManager
      },
      renderers: {
        card: !!this.cardRenderer,
        board: !!this.boardRenderer
      }
    };
  }
  
  /**
   * Mode debug : affiche l'état dans la console
   */
  debugInfo() {
    console.group('?? KanbanManager Debug Info');
    console.log('État:', this.getApplicationState());
    console.log('Statistiques:', this.getStatistics());
    console.log('Enregistrements:', this.currentRecords);
    console.log('Options Grist:', this.gristOptions);
    if (this.gristManager) {
      console.log('État Grist:', this.gristManager.exportState());
    }
    console.groupEnd();
  }
  
  /**
   * Redémarre l'application
   */
  async restart() {
    console.log('KanbanManager: Redémarrage de l\'application...');
    
    try {
      // Nettoyer l'état actuel
      this.destroy();
      
      // Réinitialiser les variables
      this.isInitialized = false;
      this.isUpdating = false;
      this.currentRecords = [];
      this.gristOptions = {};
      
      // Relancer l'initialisation
      await this.init();
      
      displaySuccess('Application redémarrée avec succès');
      
    } catch (error) {
      console.error('KanbanManager: Erreur lors du redémarrage:', error);
      displayError('Erreur lors du redémarrage');
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
    
    // Réinitialiser l'état
    this.isInitialized = false;
    this.currentRecords = [];
    this.gristOptions = {};
    
    console.log('KanbanManager: Ressources nettoyées');
  }
}