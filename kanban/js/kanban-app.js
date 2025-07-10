// === js/kanban-app.js ===
// Point d'entrée principal de l'application Kanban (version modulaire complète)

// === IMPORTS DES MODULES ===
import { 
  STATUTS, 
  DEFAULT_BUREAUX, 
  DEFAULT_RESPONSABLES, 
  TABLE_ID,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  VIEW_MODES,
  getDefaultStatuts
} from './config/constants.js';

import {
  normalizeDate,
  formatDate,
  prepareDateForGrist,
  generateTimestamp,
  generateDatesContainer,
  calculateDurationMinutes,
  formatDuration
} from './utils/dates.js';

import {
  generateBureauBadges,
  generatePriorityBadge,
  generateProjectBadge,
  generateResponsablesBadges,
  generateHistoryBadge,
  generateAllTaskBadges
} from './utils/badges.js';

import {
  displayError,
  displaySuccess,
  toggleLoadingSpinner,
  populateSelect,
  setSelectedOptions,
  getSelectedOptionsAsGristFormat,
  setFieldValue,
  getFieldValue,
  confirmAction,
  validateForm,
  addEventListenerSafe,
  toggleVisibility
} from './utils/dom.js';
// === CONSTANTES ===
const TABLE_ID = "Ssir_principale_task";
const STRATEGIES_TABLE_ID = "Ssir_strategie2"; // Table des stratégies

let projetsDynamiques = [];

// === CLASSE KANBANMANAGER CORRIGÉE ===
class KanbanManager {
  constructor() {
    // Propriétés principales
    this.kanbanContainer = document.getElementById('kanban-container');
    this.currentRecords = [];
    this.modalElement = document.getElementById('popup-tache');
    this.timelineModalElement = document.getElementById('timeline-modal'); // AJOUT
    this.currentTaskId = null;
    this.isUpdating = false;
    this.canEdit = true;
    this.gristOptions = {};
    this.strategiesData = []; // AJOUT pour les stratégies depuis Grist
    this.ignoreNextOnRecords = false;
    this.availableColumns = new Set();
    
    // Filtres et modes de vue
    this.filters = { bureau: '', qui: '', projet: '', statut: '' };
    this.showTermine = true;
    this.viewMode = VIEW_MODES.COMPACT;
    this.focusColumn = null;
    this.expandedCards = new Set();

 // Gestion utilisateur
    this.currentUser = null;
    this.userInitialized = false;
    
    // Instances Sortable
    this.sortableInstances = [];
    
    // Modal instances
    this.modal = null;
    this.timelineModal = null; // AJOUT
    
    this.init();
  }

 // === INITIALISATION ===
  async init() {
    try {
      toggleLoadingSpinner(true);
      
      await this.waitForGristReady();
      await this.loadGristDataAndOptions();
      await this.initializeUser();
      
      this.initModals(); // AJOUT
      this.initEventListeners();
      
      this.refreshKanban();
      
      displaySuccess('Kanban initialisé avec succès');
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      displayError(`Erreur d'initialisation: ${error.message}`);
    } finally {
      toggleLoadingSpinner(false);
    }
  }

  async waitForGristReady() {
    return new Promise((resolve) => {
      grist.ready({ requiredAccess: 'full' });
      grist.onRecords(this.handleGristUpdate.bind(this));
      setTimeout(resolve, 50);
    });
  }

  async waitForGristReady() {
    return new Promise((resolve) => {
      grist.ready({ requiredAccess: 'full' });
      grist.onRecords(this.handleGristUpdate.bind(this));
      setTimeout(resolve, 50);
    });
  }
 // CORRECTION 2: INITIALISATION DES MODALS (TASK + TIMELINE)
  initModals() {
    // Modal tâche
    if (this.modalElement) {
      try {
        this.modal = new bootstrap.Modal(this.modalElement, { 
          backdrop: 'static', 
          keyboard: false 
        });
        console.log('Modal tâche initialisée');
      } catch (e) {
        console.error('Erreur init modal tâche:', e);
      }
    }
  /**
   * Initialise tous les managers spécialisés
   */
  initializeManagers() {
    // Renderer pour les cartes
    this.cardRenderer = new CardRenderer(this);
    
    // Renderer pour les colonnes
    this.boardRenderer = new BoardRenderer(this, this.cardRenderer);
    
    // Gestionnaire de filtres
    this.filterManager = new FilterManager(this);
    
    // Gestionnaire de dates
    this.datePickerManager = new DatePickerManager(this);
    
    // Gestionnaire de modales
    this.modalManager = new ModalManager(this);
    
    // Gestionnaire d'historique
    this.historyManager = new HistoryManager(this);
    
    // Peupler les options des selects
    this.modalManager.populateSelectOptions();
    
    console.log('KanbanManager: Tous les managers initialisés');
  }

  // === GESTION UTILISATEUR ===
  async getCurrentGristUser() {
    try {
      console.log('🔍 Récupération utilisateur Grist...');
      
      const userInfo = await grist.docApi.getDocInfo();
      console.log('Info Grist reçue:', userInfo);
      
      const user = userInfo?.user || userInfo?.users?.[0] || null;
      
      if (user) {
        const userName = user.name || user.displayName || user.email || user.id || null;
        if (userName) {
          console.log('✅ Nom utilisateur trouvé:', userName);
          this.currentUser = userName;
          return this.currentUser;
        }
      }
      
      // Alternatives de fallback
      if (userInfo?.metadata?.updatedBy) {
        this.currentUser = userInfo.metadata.updatedBy;
        return this.currentUser;
      }
      
      if (userInfo?.owner) {
        this.currentUser = userInfo.owner;
        return this.currentUser;
      }
      
      console.log('❌ Aucun nom d\'utilisateur trouvé');
      this.currentUser = null;
      return this.currentUser;
      
    } catch (error) {
      console.log('❌ Erreur API getDocInfo:', error.message);
      this.currentUser = null;
      return this.currentUser;
    }
  }

  async initializeUser() {
    if (this.userInitialized) return this.currentUser;
    
    console.log('Initialisation de l\'utilisateur Grist...');
    this.currentUser = await this.getCurrentGristUser();
    this.userInitialized = true;
    
    if (this.currentUser) {
      console.log('✅ Utilisateur Grist initialisé:', this.currentUser);
    } else {
      console.log('⚠️ Pas de nom d\'utilisateur Grist disponible');
    }
    
    return this.currentUser;
  }

  // === CORRECTION 1: CHARGEMENT DES STRATÉGIES DEPUIS GRIST ===
  async loadGristDataAndOptions() {
    try {
      // Charger les tâches principales
      const records = await grist.docApi.fetchTable(TABLE_ID);
      
      if (records && typeof records === 'object') {
        this.availableColumns = new Set(Object.keys(records));
        console.log('Colonnes disponibles:', Array.from(this.availableColumns));
      }
      
      this.currentRecords = this.mapGristRecords(records);
      
      // Charger les options de base
      this.gristOptions.statut = getDefaultStatuts();
      this.gristOptions.urgence = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
      this.gristOptions.impact = ['Critique', 'Important', 'Modéré', 'Mineur'];
      
      const bureaux = this.getUniqueValuesFromData('bureau', true);
      this.gristOptions.bureau = [...new Set([...DEFAULT_BUREAUX, ...bureaux])].sort();
      
      const responsables = this.getUniqueValuesFromData('qui', true);
      this.gristOptions.responsables = [...new Set([...DEFAULT_RESPONSABLES, ...responsables])].sort();
      
      const projets = this.getUniqueValuesFromData('projet');
      this.gristOptions.projet = [...new Set([...projets, ...projetsDynamiques])].sort();
      
      // NOUVEAU: Charger les stratégies depuis Grist
      await this.loadStrategiesFromGrist();
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // Valeurs par défaut en cas d'erreur
      this.gristOptions.statut = getDefaultStatuts();
      this.gristOptions.urgence = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
      this.gristOptions.impact = ['Critique', 'Important', 'Modéré', 'Mineur'];
      this.gristOptions.bureau = DEFAULT_BUREAUX;
      this.gristOptions.responsables = DEFAULT_RESPONSABLES;
      this.gristOptions.projet = [];
      this.strategiesData = [];
      if (!this.currentRecords) this.currentRecords = [];
    }
  }


  // NOUVEAU: Chargement des stratégies depuis la table Grist
  async loadStrategiesFromGrist() {
    try {
      console.log(`Chargement table stratégies: ${STRATEGIES_TABLE_ID}...`);
      const strategiesTable = await grist.docApi.fetchTable(STRATEGIES_TABLE_ID);
      
      if (strategiesTable && strategiesTable.id) {
        this.strategiesData = strategiesTable.id.map((id, index) => ({
          id: id,
          objectif: strategiesTable.objectif?.[index] || '',
          sous_objectif: strategiesTable.sous_objectif?.[index] || '',
          action: strategiesTable.action?.[index] || '',
          responsable: strategiesTable.responsable?.[index] || '',
          echeance: strategiesTable.echeance?.[index] || '',
          portee: strategiesTable.portee?.[index] || ''
        }));
        
        console.log(`${this.strategiesData.length} stratégies chargées depuis Grist`);
      } else {
        console.warn('Table stratégies vide ou non trouvée');
        this.strategiesData = [];
      }
    } catch (error) {
      console.error('Erreur chargement stratégies:', error);
      this.strategiesData = [];
    }
  }

  mapGristRecords(gristData) {
    const records = [];
    if (!gristData || typeof gristData !== 'object') return [];
    
    const keys = Object.keys(gristData);
    if (!keys.includes('id') || !Array.isArray(gristData.id)) return [];
    
    const num = gristData.id.length;
    
    for (let i = 0; i < num; i++) {
      const rec = {};
      let ok = true;
      
      // Colonnes requises
      for (const key of REQUIRED_COLUMNS) {
        if (gristData.hasOwnProperty(key) && Array.isArray(gristData[key]) && gristData[key].length > i) {
          const v = gristData[key][i];
          if ((key === 'bureau' || key === 'qui') && Array.isArray(v) && v[0] === 'L') {
            rec[key] = v;
          } else if ((key === 'bureau' || key === 'qui') && (!Array.isArray(v) || v[0] !== 'L')) {
            rec[key] = ['L'];
          } else {
            rec[key] = v;
          }
        } else if (key === 'id') { 
          ok = false; 
          break; 
        } else {
          rec[key] = null;
        }
      }
      
      // Colonnes optionnelles
      for (const key of OPTIONAL_COLUMNS) {
        if (gristData.hasOwnProperty(key) && Array.isArray(gristData[key]) && gristData[key].length > i) {
          rec[key] = gristData[key][i];
        } else {
          rec[key] = null;
        }
      }
      
      if (ok) { 
        rec.id = parseInt(rec.id, 10); 
        if (!isNaN(rec.id)) records.push(rec); 
      }
    }
    return records;
  }

  getUniqueValuesFromData(key, isList = false) {
    const values = new Set();
    (this.currentRecords || []).forEach(rec => {
      const v = rec[key];
      if (isList && Array.isArray(v)) {
        v.slice(1).forEach(i => i && values.add(String(i).trim()));
      } else if (!isList && v !== null && typeof v !== 'undefined') {
        values.add(String(v).trim());
      }
    });
    return Array.from(values).filter(v => v).sort();
  }

  // === GESTION DES COMMENTAIRES ===
  addTimestampToDescription(currentDescription, newContent, userName = null) {
    if (!newContent || newContent.trim() === '') {
      return currentDescription || '';
    }

    const user = userName || this.currentUser;
    const timestamp = generateTimestamp(new Date(), user);
    const separator = '---';
    
    if (!currentDescription || currentDescription.trim() === '') {
      return `${timestamp}\n${newContent.trim()}`;
    }
    
    // Vérifier si le contenu n'a pas changé
    const lines = currentDescription.split('\n');
    const lastContentIndex = lines.findIndex(line => line.startsWith('[') && line.includes(']'));
    
    if (lastContentIndex >= 0) {
      const lastContent = lines.slice(lastContentIndex + 1)
        .join('\n')
        .replace(/^---\s*$/gm, '')
        .trim();
      
      if (lastContent === newContent.trim()) {
        return currentDescription;
      }
    }
    
    return `${timestamp}\n${newContent.trim()}\n\n${separator}\n\n${currentDescription}`;
  }

  getLatestDescription(description) {
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

  // === CALCUL DE PRIORITÉ ===
  calculerPriorite(urgence, impact) {
    const imp = String(impact || '').trim().toLowerCase();
    const urg = String(urgence || '').trim().toLowerCase();
    
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }

  // === RENDU DU KANBAN ===
  refreshKanban() {
    if (!this.kanbanContainer || !this.boardRenderer) return;
    
    const filteredRecords = this.filterManager 
      ? this.filterManager.filterRecords(this.currentRecords)
      : this.currentRecords;
    
    this.boardRenderer.renderKanban(this.viewMode, filteredRecords, {
      showTermine: this.showTermine,
      focusColumn: this.focusColumn,
      container: this.kanbanContainer
    });
  }

  // === DRAG & DROP ===
  async handleDragEnd(evt, targetStatus) {
    if (!evt.item || !evt.item.dataset) return;
    
    const id = parseInt(evt.item.dataset.id, 10);
    if (isNaN(id)) return;
    
    const record = this.currentRecords.find(r => r.id === id);
    if (!record) return;
    
    const newStatus = evt.to.dataset.status;
    const oldStatus = record.statut;
    
    if (oldStatus === newStatus) return;
    
    console.log(`Déplacement de la tâche ${id} de "${oldStatus}" vers "${newStatus}"`);
    
    try {
      const updateData = { statut: newStatus };
      
      // Ajouter l'historique si disponible
      if (this.historyManager) {
        const historyData = this.historyManager.updateTaskHistory(
          record, 
          newStatus, 
          'Déplacé par glisser-déposer'
        );
        Object.assign(updateData, historyData);
      }
      
      await grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, id, updateData]
      ]);
      
      console.log(`Tâche ${id} mise à jour avec succès`);
      
      // Mise à jour locale
      const recordIndex = this.currentRecords.findIndex(r => r.id === id);
      if (recordIndex !== -1) {
        this.currentRecords[recordIndex] = { 
          ...this.currentRecords[recordIndex], 
          ...updateData 
        };
      }
      
      this.refreshKanban();
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      displayError(`Erreur: ${error.message}`);
      this.refreshKanban();
    }
  }

  // === GESTION DES MODALS ===
  openPopup(tache = {}) {
    if (this.modalManager) {
      this.modalManager.openTaskModal(tache);
    }
  }

  // === EVENT LISTENERS PRINCIPAUX ===
  initEventListeners() {
    // Export de l'historique complet
    const btnExportHistory = document.getElementById('btn-export-history');
    if (btnExportHistory) {
      btnExportHistory.addEventListener('click', () => {
        if (this.historyManager) {
          this.historyManager.exportFullHistory();
        }
      });
    }
    
    // Raccourcis clavier globaux
    document.addEventListener('keydown', (e) => {
      // Ces raccourcis sont déjà gérés par les managers spécialisés
      // Ici on peut ajouter des raccourcis globaux supplémentaires
      
      if (e.key === 'r' || e.key === 'R') {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          this.refreshKanban();
          console.log('🔄 Kanban rechargé manuellement');
        }
      }
    });
  }

  // === GESTION DES MISES À JOUR GRIST ===
  handleGristUpdate(gristRecords, mappings = null) {
    if (this.isUpdating) {
      console.log('KanbanManager: Ignorer mise à jour (opération en cours)');
      return;
    }
    
    console.log('KanbanManager: Mise à jour des enregistrements depuis Grist');
    
    try {
      // Recharger les données
      this.loadGristDataAndOptions().then(() => {
        this.refreshKanban();
        
        // Mettre à jour les options des selects
        if (this.modalManager) {
          this.modalManager.populateSelectOptions();
        }
      });
    } catch (error) {
      console.error('KanbanManager: Erreur lors de la mise à jour:', error);
      displayError('Erreur lors de la synchronisation avec Grist');
    }
  }

  /**
   * Callback appelé quand les données sont rechargées
   * @param {Array} newRecords - Nouveaux enregistrements
   * @param {object} newOptions - Nouvelles options
   */
  onDataReloaded(newRecords, newOptions) {
    this.currentRecords = newRecords;
    this.gristOptions = newOptions;
    
    this.refreshKanban();
    
    // Notifier les managers
    if (this.filterManager) {
      this.filterManager.updateFilterStats();
    }
  }

  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Recherche des tâches par critères
   * @param {object} criteria - Critères de recherche
   * @returns {Array} Tâches correspondantes
   */
  searchTasks(criteria = {}) {
    return this.currentRecords.filter(record => {
      // Déléguer à FilterManager si disponible
      if (this.filterManager) {
        return this.filterManager.filterRecords([record]).length > 0;
      }
      
      // Fallback simple
      if (criteria.text) {
        const searchText = criteria.text.toLowerCase();
        const searchableText = [
          record.titre || '',
          record.description || '',
          record.projet || ''
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchText);
      }
      
      return true;
    });
  }

  /**
   * Obtient les statistiques du Kanban
   * @returns {object} Statistiques
   */
  getKanbanStatistics() {
    const stats = {
      totalTasks: this.currentRecords.length,
      byStatus: {},
      byPriority: {},
      byBureau: {},
      withDeadlines: 0,
      overdue: 0,
      urgent: 0,
      recentlyUpdated: 0
    };

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    this.currentRecords.forEach(record => {
      // Par statut
      const status = record.statut || 'Non défini';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Par priorité
      const priority = this.calculerPriorite(record.urgence, record.impact);
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      // Par bureau
      if (Array.isArray(record.bureau) && record.bureau.length > 1) {
        record.bureau.slice(1).forEach(bureau => {
          stats.byBureau[bureau] = (stats.byBureau[bureau] || 0) + 1;
        });
      }

      // Échéances
      if (record.date_echeance) {
        stats.withDeadlines++;
        
        const deadline = new Date(record.date_echeance);
        if (deadline < now && record.statut !== 'Terminé') {
          stats.overdue++;
        }
        
        if (deadline <= threeDaysFromNow && deadline >= now) {
          stats.urgent++;
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
   * Exporte les données au format CSV
   * @returns {string} Données CSV
   */
  exportToCSV() {
    const headers = [
      'ID', 'Titre', 'Description', 'Statut', 'Projet', 'Urgence', 'Impact',
      'Bureaux', 'Responsables', 'Date_Echeance', 'Date_Debut', 'Priorité'
    ];

    let csv = headers.join(',') + '\n';

    this.currentRecords.forEach(record => {
      const priority = this.calculerPriorite(record.urgence, record.impact);
      const bureaux = Array.isArray(record.bureau) ? record.bureau.slice(1).join(', ') : '';
      const responsables = Array.isArray(record.qui) ? record.qui.slice(1).join(', ') : '';
      
      const row = [
        record.id || '',
        `"${(record.titre || '').replace(/"/g, '""')}"`,
        `"${(record.description || '').replace(/"/g, '""')}"`,
        record.statut || '',
        record.projet || '',
        record.urgence || '',
        record.impact || '',
        `"${bureaux}"`,
        `"${responsables}"`,
        record.date_echeance || '',
        record.date_debut || '',
        priority
      ];

      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Télécharge un fichier CSV
   * @param {string} csvData - Données CSV
   * @param {string} filename - Nom du fichier
   */
  downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }

  /**
   * Exporte tout le Kanban
   */
  exportKanban() {
    try {
      const csvData = this.exportToCSV();
      const filename = `kanban_export_${new Date().toISOString().slice(0, 10)}.csv`;
      this.downloadCSV(csvData, filename);
      
      displaySuccess(`Export de ${this.currentRecords.length} tâches réussi`);
    } catch (error) {
      console.error('Erreur export Kanban:', error);
      displayError('Erreur lors de l\'export');
    }
  }

  /**
   * Trouve une tâche par ID
   * @param {number} taskId - ID de la tâche
   * @returns {object|null} Tâche trouvée ou null
   */
  findTaskById(taskId) {
    return this.currentRecords.find(r => r.id === taskId) || null;
  }

  /**
   * Met à jour une tâche localement
   * @param {number} taskId - ID de la tâche
   * @param {object} updates - Mises à jour
   */
  updateLocalTask(taskId, updates) {
    const index = this.currentRecords.findIndex(r => r.id === taskId);
    if (index !== -1) {
      this.currentRecords[index] = {
        ...this.currentRecords[index],
        ...updates
      };
    }
  }

  /**
   * Ajoute une tâche localement
   * @param {object} newTask - Nouvelle tâche
   */
  addLocalTask(newTask) {
    this.currentRecords.push(newTask);
  }

  /**
   * Supprime une tâche localement
   * @param {number} taskId - ID de la tâche
   */
  removeLocalTask(taskId) {
    this.currentRecords = this.currentRecords.filter(r => r.id !== taskId);
  }

  /**
   * Vérifie l'état de connexion à Grist
   * @returns {boolean} True si connecté
   */
  isGristConnected() {
    return typeof grist !== 'undefined' && this.currentRecords.length >= 0;
  }

  /**
   * Recharge les données depuis Grist
   */
  async reloadFromGrist() {
    try {
      toggleLoadingSpinner(true);
      
      await this.loadGristDataAndOptions();
      this.refreshKanban();
      
      // Mettre à jour les filtres
      if (this.filterManager) {
        this.filterManager.updateFilterStats();
      }
      
      displaySuccess('Données rechargées depuis Grist');
      
    } catch (error) {
      console.error('Erreur rechargement Grist:', error);
      displayError('Erreur lors du rechargement');
    } finally {
      toggleLoadingSpinner(false);
    }
  }

  /**
   * Nettoie les cartes expandées
   */
  clearExpandedCards() {
    this.expandedCards.clear();
    if (this.cardRenderer) {
      this.cardRenderer.clearExpandedCards();
    }
  }

  /**
   * Change le mode de vue
   * @param {string} newMode - Nouveau mode (compact, detailed, focus)
   */
  setViewMode(newMode) {
    if (this.filterManager) {
      this.filterManager.setViewMode(newMode);
    } else {
      this.viewMode = newMode;
      this.refreshKanban();
    }
  }

  /**
   * Applique un filtre rapide
   * @param {string} filterType - Type de filtre
   */
  applyQuickFilter(filterType) {
    if (this.filterManager) {
      this.filterManager.applyQuickFilter(filterType);
    }
  }

  /**
   * Efface tous les filtres
   */
  clearAllFilters() {
    if (this.filterManager) {
      this.filterManager.clearAllFilters();
    }
  }

  /**
   * Obtient l'état complet du Kanban
   * @returns {object} État complet
   */
  exportFullState() {
    const state = {
      version: '2.0',
      timestamp: Date.now(),
      recordCount: this.currentRecords.length,
      viewMode: this.viewMode,
      currentUser: this.currentUser,
      gristConnected: this.isGristConnected(),
      managers: {}
    };

    // États des managers
    if (this.filterManager) {
      state.managers.filter = this.filterManager.exportState();
    }

    if (this.datePickerManager) {
      state.managers.datePicker = this.datePickerManager.exportState();
    }

    if (this.modalManager) {
      state.managers.modal = this.modalManager.exportState();
    }

    if (this.cardRenderer) {
      state.managers.cardRenderer = this.cardRenderer.exportState();
    }

    return state;
  }

  /**
   * Importe un état du Kanban
   * @param {object} state - État à importer
   */
  importFullState(state) {
    if (!state || state.version !== '2.0') {
      console.warn('État incompatible ou invalide');
      return;
    }

    // Importer dans les managers
    if (state.managers) {
      if (this.filterManager && state.managers.filter) {
        this.filterManager.importState(state.managers.filter);
      }

      if (this.datePickerManager && state.managers.datePicker) {
        this.datePickerManager.importState(state.managers.datePicker);
      }

      if (this.cardRenderer && state.managers.cardRenderer) {
        this.cardRenderer.importState(state.managers.cardRenderer);
      }
    }

    console.log('État Kanban importé avec succès');
  }

  /**
   * Méthode de debug pour les développeurs
   */
  debug() {
    const debugInfo = {
      kanbanManager: this,
      currentRecords: this.currentRecords,
      gristOptions: this.gristOptions,
      managers: {
        filter: this.filterManager,
        datePicker: this.datePickerManager,
        modal: this.modalManager,
        history: this.historyManager,
        cardRenderer: this.cardRenderer,
        boardRenderer: this.boardRenderer
      },
      statistics: this.getKanbanStatistics(),
      state: this.exportFullState()
    };

    console.log('🐛 DEBUG KANBAN:', debugInfo);
    return debugInfo;
  }

  /**
   * Nettoie toutes les ressources
   */
  destroy() {
    // Nettoyer les managers
    if (this.filterManager) {
      this.filterManager.destroy();
      this.filterManager = null;
    }

    if (this.datePickerManager) {
      this.datePickerManager.destroy();
      this.datePickerManager = null;
    }

    if (this.modalManager) {
      this.modalManager.destroy();
      this.modalManager = null;
    }

    if (this.historyManager) {
      this.historyManager.destroy();
      this.historyManager = null;
    }

    if (this.boardRenderer) {
      this.boardRenderer.destroy();
      this.boardRenderer = null;
    }

    // Nettoyer les données
    this.currentRecords = [];
    this.gristOptions = {};
    this.availableColumns.clear();
    this.expandedCards.clear();
    this.sortableInstances = [];

    console.log('KanbanManager: Toutes les ressources nettoyées');
  }
}

// === INITIALISATION DE L'APPLICATION ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initialisation de l\'application Kanban modulaire...');
  
  window.kanbanManager = new KanbanManager();
  
  // Gestion des erreurs globales
  window.addEventListener('error', (event) => {
    console.error('Erreur globale Kanban:', event.error);
    displayError(`Erreur système: ${event.error.message}`);
  });
  
  // Gestion des promesses rejetées
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
    displayError(`Erreur asynchrone: ${event.reason}`);
  });
});

// === EXPORT POUR UTILISATION EXTERNE ===
window.KanbanApp = {
  KanbanManager,
  // Managers exportés
  FilterManager,
  DatePickerManager,
  ModalManager,
  HistoryManager,
  CardRenderer,
  BoardRenderer,
  // Utilitaires exposés
  displayError,
  displaySuccess,
  normalizeDate,
  formatDate,
  generateBureauBadges,
  generateAllTaskBadges,
  // Constantes
  STATUTS,
  VIEW_MODES,
  TABLE_ID
};

// === COMMANDES DE DEBUG POUR LA CONSOLE ===
if (typeof window !== 'undefined') {
  window.debugKanban = () => {
    if (window.kanbanManager) {
      return window.kanbanManager.debug();
    }
    console.warn('KanbanManager non initialisé');
  };
  
  window.exportKanbanState = () => {
    if (window.kanbanManager) {
      const state = window.kanbanManager.exportFullState();
      console.log('État exporté:', state);
      return state;
    }
  };
  
  window.reloadKanban = () => {
    if (window.kanbanManager) {
      window.kanbanManager.reloadFromGrist();
    }
  };
}
