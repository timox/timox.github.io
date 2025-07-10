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

import { FilterManager } from './managers/FilterManagers.js';
import { DatePickerManager } from './managers/DatePickerManager.js';
import { ModalManager } from './managers/ModalManager.js';
import { HistoryManager } from './managers/HistoryManager.js';
import { CardRenderer } from './renderers/CardRenderer.js';
import { BoardRenderer } from './renderers/boardRenderer.js';

// === VARIABLES GLOBALES ===
let projetsDynamiques = [];

// === CLASSE KANBANMANAGER REFACTORISÉE ET COMPLÈTE ===
class KanbanManager {
  constructor() {
    // Propriétés principales
    this.kanbanContainer = document.getElementById('kanban-container');
    this.currentRecords = [];
    this.modalElement = document.getElementById('popup-tache');
    this.currentTaskId = null;
    this.isUpdating = false;
    this.canEdit = true;
    this.gristOptions = {};
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
    
    // Managers spécialisés
    this.filterManager = null;
    this.datePickerManager = null;
    this.modalManager = null;
    this.historyManager = null;
    this.cardRenderer = null;
    this.boardRenderer = null;
    
    this.init();
  }

  // === INITIALISATION ===
  async init() {
    try {
      toggleLoadingSpinner(true);
      
      await this.waitForGristReady();
      await this.loadGristDataAndOptions();
      await this.initializeUser();
      
      this.initializeManagers();
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

  // === GESTION DES DONNÉES GRIST ===
  async loadGristDataAndOptions() {
    try {
      const records = await grist.docApi.fetchTable(TABLE_ID);
      
      if (records && typeof records === 'object') {
        this.availableColumns = new Set(Object.keys(records));
        console.log('Colonnes disponibles:', Array.from(this.availableColumns));
      }
      
      this.currentRecords = this.mapGristRecords(records);
      
      // Charger les options
      this.gristOptions.statut = getDefaultStatuts();
      this.gristOptions.urgence = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
      this.gristOptions.impact = ['Critique', 'Important', 'Modéré', 'Mineur'];
      
      const bureaux = this.getUniqueValuesFromData('bureau', true);
      this.gristOptions.bureau = [...new Set([...DEFAULT_BUREAUX, ...bureaux])].sort();
      
      const responsables = this.getUniqueValuesFromData('qui', true);
      this.gristOptions.responsables = [...new Set([...DEFAULT_RESPONSABLES, ...responsables])].sort();
      
      const projets = this.getUniqueValuesFromData('projet');
      this.gristOptions.projet = [...new Set([...projets, ...projetsDynamiques])].sort();
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // Valeurs par défaut en cas d'erreur
      this.gristOptions.statut = getDefaultStatuts();
      this.gristOptions.urgence = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
      this.gristOptions.impact = ['Critique', 'Important', 'Modéré', 'Mineur'];
      this.gristOptions.bureau = DEFAULT_BUREAUX;
      this.gristOptions.responsables = DEFAULT_RESPONSABLES;
      this.gristOptions.projet = [];
      if (!this.currentRecords) this.currentRecords = [];
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
  getKanbanStats() {
    const stats = {
      totalTasks: this.currentRecords.length,
      byStatus: {},
      byPriority: {},
      byBureau: {},
      withDeadlines: 0,
      overdue: 0,
      urgent: 0,
      recentlyCreated: 0,
      recentlyUpdated: 0
    };
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
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
      
      // Avec échéances
      if (record.date_echeance) {
        stats.withDeadlines++;
        
        const deadline = new Date(record.date_echeance);
        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0 && record.statut !== 'Terminé') {
          stats.overdue++;
        } else if (diffDays >= 0 && diffDays <= 3) {
          stats.urgent++;
        }
      }
      
      // Récemment créées (estimation basée sur l'ID)
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
   * Exporte les données du Kanban
   * @param {string} format - Format d'export ('csv', 'json')
   * @returns {string} Données exportées
   */
  exportKanbanData(format = 'csv') {
    if (format === 'json') {
      return JSON.stringify({
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: this.currentRecords.length,
          kanbanVersion: '2.0',
          columns: Array.from(this.availableColumns)
        },
        data: this.currentRecords,
        statistics: this.getKanbanStats()
      }, null, 2);
    }
    
    // Format CSV par défaut
    const headers = [
      'ID', 'Titre', 'Description', 'Statut', 'Projet', 'Urgence', 'Impact',
      'Bureaux', 'Responsables', 'Date_Echeance', 'Date_Debut', 'Date_Derniere_MAJ'
    ];
    
    let csv = headers.join(',') + '\n';
    
    this.currentRecords.forEach(record => {
      const row = [
        record.id || '',
        `"${(record.titre || '').replace(/"/g, '""')}"`,
        `"${this.getLatestDescription(record.description || '').replace(/"/g, '""')}"`,
        record.statut || '',
        record.projet || '',
        record.urgence || '',
        record.impact || '',
        `"${Array.isArray(record.bureau) ? record.bureau.slice(1).join(', ') : ''}"`,
        `"${Array.isArray(record.qui) ? record.qui.slice(1).join(', ') : ''}"`,
        record.date_echeance || '',
        record.date_debut || '',
        record.date_derniere_maj || ''
      ];
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  /**
   * Télécharge les données exportées
   * @param {string} format - Format d'export
   * @param {string} filename - Nom du fichier (optionnel)
   */
  downloadExport(format = 'csv', filename = null) {
    const data = this.exportKanbanData(format);
    const defaultFilename = `kanban_export_${new Date().toISOString().slice(0, 10)}.${format}`;
    const finalFilename = filename || defaultFilename;
    
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    const blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
    displaySuccess(`Export ${format.toUpperCase()} téléchargé: ${finalFilename}`);
  }

  /**
   * Réinitialise le Kanban
   */
  resetKanban() {
    // Réinitialiser les filtres
    if (this.filterManager) {
      this.filterManager.clearAllFilters();
    }
    
    // Réinitialiser les modes de vue
    this.viewMode = VIEW_MODES.COMPACT;
    this.focusColumn = null;
    this.expandedCards.clear();
    
    // Fermer les modales
    if (this.modalManager) {
      this.modalManager.closeAllModals();
    }
    
    // Rafraîchir l'affichage
    this.refreshKanban();
    
    displaySuccess('Kanban réinitialisé');
  }

  /**
   * Valide l'intégrité des données
   * @returns {object} Rapport de validation
   */
  validateDataIntegrity() {
    const report = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        totalRecords: this.currentRecords.length,
        validRecords: 0,
        invalidRecords: 0
      }
    };
    
    this.currentRecords.forEach((record, index) => {
      const recordErrors = [];
      
      // Vérifications obligatoires
      if (!record.id || isNaN(record.id)) {
        recordErrors.push('ID manquant ou invalide');
      }
      
      if (!record.titre || record.titre.trim() === '') {
        recordErrors.push('Titre manquant');
      }
      
      if (!record.statut || !STATUTS.find(s => s.id === record.statut)) {
        recordErrors.push('Statut manquant ou invalide');
      }
      
      // Vérifications du format des listes
      if (record.bureau && (!Array.isArray(record.bureau) || record.bureau[0] !== 'L')) {
        recordErrors.push('Format de liste bureau invalide');
      }
      
      if (record.qui && (!Array.isArray(record.qui) || record.qui[0] !== 'L')) {
        recordErrors.push('Format de liste responsables invalide');
      }
      
      // Vérifications des dates
      if (record.date_echeance && !normalizeDate(record.date_echeance)) {
        recordErrors.push('Format de date d\'échéance invalide');
      }
      
      if (record.date_debut && !normalizeDate(record.date_debut)) {
        recordErrors.push('Format de date de début invalide');
      }
      
      if (recordErrors.length > 0) {
        report.errors.push({
          recordIndex: index,
          recordId: record.id,
          recordTitle: record.titre,
          errors: recordErrors
        });
        report.stats.invalidRecords++;
        report.isValid = false;
      } else {
        report.stats.validRecords++;
      }
    });
    
    return report;
  }

  /**
   * Répare les données si possible
   * @returns {Promise<boolean>} True si des réparations ont été effectuées
   */
  async repairData() {
    const report = this.validateDataIntegrity();
    
    if (report.isValid) {
      displaySuccess('Aucune réparation nécessaire');
      return false;
    }
    
    let repairCount = 0;
    
    for (const errorRecord of report.errors) {
      const record = this.currentRecords[errorRecord.recordIndex];
      const repairs = {};
      
      // Réparer les formats de listes
      if (record.bureau && !Array.isArray(record.bureau)) {
        repairs.bureau = ['L'];
        repairCount++;
      }
      
      if (record.qui && !Array.isArray(record.qui)) {
        repairs.qui = ['L'];
        repairCount++;
      }
      
      // Réparer les statuts invalides
      if (!record.statut || !STATUTS.find(s => s.id === record.statut)) {
        repairs.statut = 'Backlog';
        repairCount++;
      }
      
      // Appliquer les réparations
      if (Object.keys(repairs).length > 0) {
        try {
          await grist.docApi.applyUserActions([
            ['UpdateRecord', TABLE_ID, record.id, repairs]
          ]);
          
          // Mise à jour locale
          Object.assign(record, repairs);
          
        } catch (error) {
          console.error(`Erreur lors de la réparation de la tâche ${record.id}:`, error);
        }
      }
    }
    
    if (repairCount > 0) {
      displaySuccess(`${repairCount} réparation(s) effectuée(s)`);
      this.refreshKanban();
      return true;
    }
    
    return false;
  }

  /**
   * Sauvegarde l'état du Kanban
   * @returns {object} État sauvegardé
   */
  saveState() {
    const state = {
      viewMode: this.viewMode,
      focusColumn: this.focusColumn,
      expandedCards: Array.from(this.expandedCards),
      filters: this.filterManager ? this.filterManager.exportState() : null,
      user: this.currentUser,
      timestamp: Date.now()
    };
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem('kanban-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Impossible de sauvegarder l\'état:', error);
    }
    
    return state;
  }

  /**
   * Restaure l'état du Kanban
   * @param {object} state - État à restaurer
   */
  restoreState(state = null) {
    let stateToRestore = state;
    
    // Charger depuis localStorage si pas d'état fourni
    if (!stateToRestore) {
      try {
        const saved = localStorage.getItem('kanban-state');
        if (saved) {
          stateToRestore = JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Impossible de charger l\'état sauvegardé:', error);
        return;
      }
    }
    
    if (!stateToRestore) return;
    
    // Vérifier que l'état n'est pas trop ancien (7 jours)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
    if (Date.now() - stateToRestore.timestamp > maxAge) {
      localStorage.removeItem('kanban-state');
      return;
    }
    
    // Restaurer l'état
    if (stateToRestore.viewMode) {
      this.viewMode = stateToRestore.viewMode;
    }
    
    if (stateToRestore.focusColumn) {
      this.focusColumn = stateToRestore.focusColumn;
    }
    
    if (Array.isArray(stateToRestore.expandedCards)) {
      this.expandedCards = new Set(stateToRestore.expandedCards);
    }
    
    if (stateToRestore.filters && this.filterManager) {
      this.filterManager.importState(stateToRestore.filters);
    }
    
    console.log('KanbanManager: État restauré depuis sauvegarde');
  }

  /**
   * Exporte l'état complet du gestionnaire
   * @returns {object} État complet
   */
  exportFullState() {
    return {
      // Données principales
      recordCount: this.currentRecords.length,
      availableColumns: Array.from(this.availableColumns),
      gristOptions: this.gristOptions,
      
      // État de l'interface
      viewMode: this.viewMode,
      focusColumn: this.focusColumn,
      expandedCards: Array.from(this.expandedCards),
      
      // États des managers
      filterManager: this.filterManager ? this.filterManager.exportState() : null,
      datePickerManager: this.datePickerManager ? this.datePickerManager.exportState() : null,
      modalManager: this.modalManager ? this.modalManager.exportState() : null,
      cardRenderer: this.cardRenderer ? this.cardRenderer.exportState() : null,
      
      // Métadonnées
      user: this.currentUser,
      timestamp: Date.now(),
      version: '2.0',
      
      // Statistiques
      statistics: this.getKanbanStats(),
      
      // Rapport d'intégrité
      integrityReport: this.validateDataIntegrity()
    };
  }

  /**
   * Nettoie les ressources et détruit le gestionnaire
   */
  destroy() {
    // Sauvegarder l'état avant destruction
    this.saveState();
    
    // Détruire les managers
    if (this.filterManager) {
      this.filterManager.destroy();
    }
    
    if (this.datePickerManager) {
      this.datePickerManager.destroy();
    }
    
    if (this.modalManager) {
      this.modalManager.destroy();
    }
    
    if (this.historyManager) {
      this.historyManager.destroy();
    }
    
    if (this.boardRenderer) {
      this.boardRenderer.destroy();
    }
    
    // Nettoyer les données
    this.currentRecords = [];
    this.gristOptions = {};
    this.availableColumns.clear();
    this.expandedCards.clear();
    
    // Supprimer la référence globale
    window.kanbanManager = null;
    
    console.log('KanbanManager: Toutes les ressources ont été nettoyées');
  }
}

// === INITIALISATION DE L'APPLICATION ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initialisation du Kanban modulaire...');
  
  // Créer l'instance principale
  window.kanbanManager = new KanbanManager();
  
  // Restaurer l'état sauvegardé
  window.kanbanManager.restoreState();
  
  // Gestionnaire de fermeture de page
  window.addEventListener('beforeunload', () => {
    if (window.kanbanManager) {
      window.kanbanManager.saveState();
    }
  });
  
  // Gestionnaire d'erreurs globales
  window.addEventListener('error', (event) => {
    console.error('Erreur globale Kanban:', event.error);
    displayError(`Erreur système: ${event.error.message}`);
  });
  
  // Gestionnaire de promesses rejetées
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
    displayError(`Erreur asynchrone: ${event.reason}`);
  });
  
  console.log('✅ Kanban modulaire initialisé avec succès');
});

// === EXPORT POUR UTILISATION EXTERNE ===
window.KanbanApp = {
  KanbanManager,
  // Utilitaires exposés
  displayError,
  displaySuccess,
  normalizeDate,
  formatDate,
  generateBureauBadges,
  // Constantes
  VIEW_MODES,
  STATUTS,
  // Fonction d'aide pour créer une nouvelle instance
  createKanban: () => new KanbanManager(),
  // Fonction d'aide pour accéder à l'instance principale
  getInstance: () => window.kanbanManager
};

// === EXPORT ES6 (pour compatibilité) ===
export { KanbanManager, VIEW_MODES, STATUTS };
export default KanbanManager;
