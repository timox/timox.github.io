// === js/kanban-app.js CORRIGÉ ===
// Point d'entrée principal avec filtres, vues multiples et commentaires séparés

// === IMPORTS DES MODULES ===
import { 
  STATUTS, 
  DEFAULT_BUREAUX, 
  DEFAULT_RESPONSABLES, 
  TABLE_ID,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  VIEW_MODES,
  getDefaultStatuts,
  STRATEGY_DATA
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

import { initUserActionManager, getUserActionManager } from './utils/UserActionManager.js';
import { initNotesJsonMigrator, getNotesJsonMigrator } from './utils/NotesJsonMigrator.js';
import { initLogger, createModuleLogger } from './utils/LoggerManager.js';

// Modal system simplified - using existing modal managers only

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
  toggleVisibility,
  initializeTooltips
} from './utils/dom.js';

// NOUVEAU: Import des managers
import { FilterManager } from './managers/FilterManager.js';
import { ViewModeManager } from './managers/ViewModeManager.js';
import { ModalManager } from './managers/ModalManager.js';
import { HistoryManager } from './managers/HistoryManager.js';
import { DatePickerManager } from './managers/DatePickerManager.js';
import { GristManager } from './managers/GristManager.js';
import { JalonManager } from './managers/JalonManager.js';

// === CONSTANTES ===
const STRATEGIES_TABLE_ID = "Ssir_strategie2";

let projetsDynamiques = [];

// === CLASSE KANBANMANAGER CORRIGÉE ===
class KanbanManager {
  constructor() {
    // Initialiser le logger en premier
    const logger = initLogger();
    this.logger = createModuleLogger('KanbanManager');
    
    // Exposer le logger globalement pour usage console
    if (typeof window !== 'undefined') {
      window.logger = logger;
    }
    
    // Propriétés principales (container défini après waitForDOM)
    this.kanbanContainer = null;
    this.currentRecords = [];
    this.modalElement = null;
    this.historyModalElement = null;
    
    this.currentTaskId = null;
    this.isUpdating = false;
    this.isRefreshing = false;
    this.canEdit = true;
    this.gristOptions = {};
    this.strategiesData = [];
    this.ignoreNextOnRecords = false;
    this.availableColumns = new Set();
    
    // CORRIGÉ: Propriétés pour les filtres et vues (utilisées par les managers)
    this.filters = { bureau: '', qui: '', projet: '', statut: '', search: '' };
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
    this.historyModal = null;
    
    // NOUVEAU: Managers
    this.filterManager = null;
    this.viewModeManager = null;
    this.modalManager = null;
    this.historyManager = null;
    this.datePickerManager = null;
    this.gristManager = null;
    
    this.init();
  }

  // === INITIALISATION ===
  async init() {
    try {
      toggleLoadingSpinner(true);
      
      await this.waitForGristReady();
      await this.loadGristDataAndOptions();
      await this.initializeUser();
      
      // IMPORTANT: Attendre que le DOM soit complètement prêt
      await this.waitForDOM();
      
      // Récupérer le container maintenant que le DOM est prêt
      this.kanbanContainer = document.getElementById('kanban-container');
      
      // Créer le conteneur s'il n'existe pas (pour les widgets Grist)
      if (!this.kanbanContainer) {
        console.log('🔧 Création du conteneur Kanban pour widget Grist...');
        this.createKanbanContainer();
      }
      if (!this.kanbanContainer) {
        throw new Error('Container kanban-container non trouvé dans le DOM');
      }
      console.log('✅ Container kanban-container récupéré:', this.kanbanContainer);
      
      this.initModals();
      // ✅ Event listeners centralisés avec délégation jQuery
      console.log('Event listeners délégués avec jQuery');
      
      // Initialiser les managers après le chargement des données
      this.initializeManagers();
      
      // Initialiser les événements avec délégation jQuery
      this.initEventDelegation();
      
      this.refreshKanban();
      
      displaySuccess('Kanban initialisé avec succès');
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      displayError(`Erreur d'initialisation: ${error.message}`);
    } finally {
      toggleLoadingSpinner(false);
    }
  }

  async waitForGristManagerReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.gristManager && this.gristManager.isConnected) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

   // NOUVEAU: Attendre que le DOM soit prêt
  async waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }
  // NOUVEAU: Initialisation des managers
  initializeManagers() {
    console.log('🔧 Initialisation des managers...');
    
    // Manager des filtres
    this.filterManager = new FilterManager(this);
    
    // Manager des modes de vue 
    this.viewModeManager = new ViewModeManager(this);
    
    // Manager des modales
    this.modalManager = new ModalManager(this);
    
    // Manager de l'historique
    this.historyManager = new HistoryManager(this);
    
    // Manager du sélecteur de dates
    this.datePickerManager = new DatePickerManager(this);
    
    // Manager Grist
    this.gristManager = new GristManager(this);
    
    // Manager des jalons
    this.jalonManager = new JalonManager(this);
    
    // 🔧 CORRECTION: Nettoyage automatique des backdrops Bootstrap orphelins
    this.cleanOrphanBackdrops();
    
    // Vérification périodique des backdrops orphelins (toutes les 5 secondes)
    setInterval(() => this.updateCleanButton(), 5000);
    
    console.log('✅ Managers initialisés');
  }

  async waitForGristReady() {
    return new Promise((resolve) => {
      this.logger.info("Attente de l'initialisation Grist...");
      try {
        grist.ready({ requiredAccess: 'full' });
        grist.onRecords(this.handleGristUpdate.bind(this));
        this.logger.info("Listener onRecords attaché.");
        
        // Initialiser le gestionnaire d'actions utilisateur et le migrateur
        initUserActionManager(grist);
        initNotesJsonMigrator(grist);
        this.logger.info("UserActionManager et NotesJsonMigrator initialisés.");
        
        // Initialiser le nom d'utilisateur
        const userActionManager = getUserActionManager();
        if (userActionManager) {
          userActionManager.initializeUser().then(userName => {
            this.logger.debug("Nom d'utilisateur initialisé:", userName);
          }).catch(error => {
            console.error("Erreur lors de l'initialisation de l'utilisateur:", error);
          });
        }
        
        setTimeout(() => {
          this.logger.info("Grist initialisé avec succès.");
          resolve();
        }, 50);
      } catch (err) {
        console.error("Erreur grist.ready/listeners:", err);
        resolve(); // Don't fail, just continue
      }
    });
  }

  // === CHARGEMENT DES DONNÉES CORRIGÉ (BASÉ SUR OLD EXAMPLE) ===
  async loadGristDataAndOptions() {
    this.logger.info("Chargement des données depuis Grist...");
    try {
      // Charger les tâches principales
      const records = await grist.docApi.fetchTable(TABLE_ID);
      this.currentRecords = this.mapGristRecords(records);
      this.logger.info(`Données mappées: ${this.currentRecords.length} tâches`);
      if (!this.currentRecords?.length) console.warn("Aucune donnée tâche Grist chargée.");

      // Migrer les notes vers le format JSON si nécessaire
      const userActionManager = getUserActionManager();
      this.logger.debug("UserActionManager disponible:", !!userActionManager);
      this.logger.debug("Nombre d'enregistrements:", this.currentRecords?.length);
      
      if (userActionManager && this.currentRecords?.length > 0) {
        this.logger.debug(`Vérification migration pour ${this.currentRecords.length} enregistrements`);
        this.logger.debug("Exemple d'enregistrement:", this.currentRecords[0]);
        try {
          // Passer les enregistrements mappés plutôt que les données brutes
          const migrated = await userActionManager.migrateAllTasks(this.currentRecords);
          if (migrated > 0) {
            this.logger.info(`Migration terminée: ${migrated} tâches migrées vers JSON`);
            // Recharger les données après migration
            const updatedRecords = await grist.docApi.fetchTable(TABLE_ID);
            this.currentRecords = this.mapGristRecords(updatedRecords);
          } else {
            this.logger.debug("Aucune migration nécessaire - notes déjà en JSON");
          }
        } catch (migrationError) {
          console.error("Erreur lors de la migration des notes:", migrationError);
          // Continue without migration if it fails
        }
      } else {
        this.logger.debug("Migration ignorée - pas de gestionnaire ou d'enregistrements");
      }

      // Options Statiques
      this.gristOptions.statut = getDefaultStatuts();
      this.gristOptions.urgence = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
      this.gristOptions.impact = ['Critique', 'Important', 'Modéré', 'Mineur'];
      this.gristOptions.bureau = [...DEFAULT_BUREAUX].sort((a, b) => String(a).localeCompare(String(b)));
      this.gristOptions.responsables = [...DEFAULT_RESPONSABLES].sort((a, b) => String(a).localeCompare(String(b)));

      // Projets dynamiques
      this.gristOptions.projet = this.getUniqueValuesFromData('projet', false);
      console.log(`Options Projets (dynamique): ${this.gristOptions.projet.length} valeurs.`);

      // Charger les stratégies depuis Grist
      await this.loadStrategiesFromGrist();
      
      console.log('✅ Données chargées:', {
        taches: this.currentRecords.length,
        bureaux: this.gristOptions.bureau.length,
        responsables: this.gristOptions.responsables.length,
        projets: this.gristOptions.projet.length,
        strategies: this.strategiesData.length
      });
      
    } catch (error) {
      console.error('Erreur majeure loadGristDataAndOptions:', error);
      this.gristOptions = { 
        statut: getDefaultStatuts(), 
        urgence: ['Immédiate', 'Courte', 'Moyenne', 'Longue'], 
        impact: ['Critique', 'Important', 'Modéré', 'Mineur'], 
        bureau: [], 
        responsables: [], 
        projet: [] 
      };
      this.strategiesData = [];
      if (!this.currentRecords) this.currentRecords = [];
      throw error;
    }
  }

  // === MÉTHODE UTILITAIRE POUR EXTRAIRE VALEURS UNIQUES ===
  getUniqueValuesFromData(key, isList = false) {
    const values = new Set();
    (this.currentRecords || []).forEach(rec => {
      const v = rec[key];
      if (isList && Array.isArray(v)) {
        v.slice(1).forEach(i => i && values.add(String(i).trim()));
      } else if (!isList && v !== null && typeof v !== 'undefined' && String(v).trim() !== '') {
        values.add(String(v).trim());
      }
    });
    const sorted = Array.from(values).sort((a, b) => String(a).localeCompare(String(b)));
    return sorted;
  }

  // === CHARGEMENT DIRECT EN FALLBACK ===
  async loadGristDataDirect() {
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
      
      // Utiliser les données réelles pour les filtres
      const bureaux = this.getUniqueValuesFromData('bureau', true);
      this.gristOptions.bureau = [...new Set([...DEFAULT_BUREAUX, ...bureaux])].sort();
      
      const responsables = this.getUniqueValuesFromData('qui', true);
      this.gristOptions.responsables = [...new Set([...DEFAULT_RESPONSABLES, ...responsables])].sort();
      
      const projets = this.getUniqueValuesFromData('projet');
      this.gristOptions.projet = [...new Set([...projets, ...projetsDynamiques])].sort();
      
      console.log('✅ Données chargées (fallback):', {
        taches: this.currentRecords.length,
        bureaux: this.gristOptions.bureau.length,
        responsables: this.gristOptions.responsables.length,
        projets: this.gristOptions.projet.length
      });
      
    } catch (error) {
      console.error('Erreur chargement direct:', error);
      throw error;
    }
  }

  // Chargement des stratégies depuis les données intégrées
  async loadStrategiesFromGrist() {
    try {
      console.log('🎯 Chargement des stratégies depuis les données intégrées...');
      console.log('🔍 STRATEGY_DATA disponible:', !!STRATEGY_DATA);
      console.log('🔍 STRATEGY_DATA length:', STRATEGY_DATA?.length);
      
      if (STRATEGY_DATA && STRATEGY_DATA.length > 0) {
        // Utiliser les données intégrées depuis constants.js
        this.strategiesData = STRATEGY_DATA.map(strategy => ({
          id: strategy.id,
          id2: strategy.id, // Fallback pour compatibilité
          objectif: strategy.objectif,
          sous_objectif: strategy.sous_objectif,
          action: strategy.action,
          responsable: strategy.responsable,
          echeance: strategy.echeance,
          portee: strategy.portee
        })).sort((a, b) => a.id - b.id);
        
        console.log(`✅ Stratégies chargées depuis données intégrées: ${this.strategiesData.length} stratégies`);
        console.log('📋 Aperçu des stratégies:', this.strategiesData.slice(0, 3));
        console.log('🔢 IDs des stratégies:', this.strategiesData.map(s => s.id).slice(0, 10));
      } else {
        console.warn('⚠️ STRATEGY_DATA non disponible ou vide');
        this.strategiesData = [];
      }
    } catch (stratError) {
      console.error('❌ Erreur chargement stratégies intégrées:', stratError);
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
      
      this.currentUser = 'Utilisateur';
      return this.currentUser;
      
    } catch (error) {
      console.log('❌ Erreur API getDocInfo:', error.message);
      this.currentUser = 'Utilisateur';
      return this.currentUser;
    }
  }

  async initializeUser() {
    if (this.userInitialized) return this.currentUser;
    
    console.log('Initialisation de l\'utilisateur Grist...');
    this.currentUser = await this.getCurrentGristUser();
    this.userInitialized = true;
    
    console.log('✅ Utilisateur Grist initialisé:', this.currentUser);
    return this.currentUser;
  }

  // === GESTION DES COMMENTAIRES CORRIGÉE ===
  addTimestampToDescription(currentDescription, newContent, userName = null) {
    if (!newContent || newContent.trim() === '') {
      return currentDescription || '';
    }

    const user = userName || this.currentUser || 'Utilisateur';
    const timestamp = generateTimestamp(new Date(), user);
    const separator = '---';
    
    if (!currentDescription || currentDescription.trim() === '') {
      return `${timestamp}\n${newContent.trim()}`;
    }
    
    // Vérifier si le contenu n'a pas changé
    const lines = currentDescription.split('\n');
    const lastContentIndex = lines.findIndex(line => line.startsWith('(') && line.includes(')'));
    
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

  // NOUVEAU: Génère l'historique des commentaires pour affichage lecture seule
  generateCommentHistory(description) {
    if (!description) return '';
    
    const sections = description.split(/^---\s*$/gm);
    let historyHTML = '';
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      if (lines.length === 0) return;
      
      const timestampMatch = lines[0].match(/^\((.+)\)$/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        const content = lines.slice(1).join('\n').trim();
        
        if (content) {
          const isLatest = index === 0;
          const entryClass = isLatest ? 'description-entry latest' : 'description-entry historical';
          
          historyHTML += `
            <div class="${entryClass}">
              <div class="description-timestamp">${timestamp}</div>
              <div class="description-content">${content}</div>
            </div>
          `;
        }
      }
    });
    
    return historyHTML;
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

  // === RENDU DES CARTES ===
  createTaskElementHTML(record) {
    if (!record?.id) {
      console.warn('createTaskElementHTML: record sans ID', record);
      return '';
    }
    
    // LOG DÉTAILLÉ pour debug
    if (record.id === 76 || Math.random() < 0.1) { // Tâche 76 + 10% des autres tâches
      console.log(`🎨 Création HTML pour tâche ${record.id}: ${record.titre}`, {
        strategie_id: record.strategie_id,
        strategie_id_type: typeof record.strategie_id,
        has_strategies_data: !!this.strategiesData,
        strategies_count: this.strategiesData?.length,
        all_fields: Object.keys(record),
        strategy_related_fields: Object.keys(record).filter(k => k.includes('strateg'))
      });
    }
    
    const priority = this.calculerPriorite(record.urgence, record.impact);
    const priorityBadge = generatePriorityBadge(priority);
    
    // Stratégies multiples
    const strategiesInfo = this.getMultipleStrategiesInfo(record.strategie_id);
    
    // DEBUG pour stratégies
    if (record.id === 76 || Math.random() < 0.1) { // Tâche 76 + 10% des autres tâches
      console.log(`🎯 Debug stratégies tâche ${record.id}:`, {
        strategie_id: record.strategie_id,
        strategie_id_type: typeof record.strategie_id,
        strategiesInfo: strategiesInfo,
        strategiesInfo_length: strategiesInfo.length,
        strategiesData_available: !!this.strategiesData,
        strategiesData_length: this.strategiesData?.length,
        icon_will_show: strategiesInfo.length > 0 || record.id === 76
      });
    }
    
    // Icône de stratégie avec mini-modale au clic
    // TEST TEMPORAIRE: Forcer l'icône pour tâche 76
    const strategyIcon = (strategiesInfo.length > 0 || record.id === 76) ? 
      `<i class="bi bi-bullseye strategie-icon" 
          data-task-id="${record.id}" 
          title="Voir les stratégies (${strategiesInfo.length || 'TEST'})"
          style="cursor: pointer; color: ${record.id === 76 ? 'red' : '#0d6efd'}; font-size: 16px; margin-left: 4px;"></i>` : '';

    // Projet avec stratégies dans l'infobulle aussi (double affichage)
    const projectBadge = record.projet ? 
      generateProjectBadge({
        projet: record.projet,
        strategiesInfo: strategiesInfo,
        // Fallback ancien format pour compatibilité
        strategie_objectif: strategiesInfo[0]?.objectif,
        strategie_sous_objectif: strategiesInfo[0]?.sous_objectif,
        strategie_action: strategiesInfo[0]?.action
      }) : '';

    // Description résumée depuis notes.content
    let resumeDesc = '';
    if (record.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData && notesData.content) {
          const content = notesData.content.substring(0, 80);
          resumeDesc = `<div class="desc-resume">${content}${notesData.content.length > 80 ? '…' : ''}</div>`;
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }
    
    // Dates
    const datesElement = generateDatesContainer({
      date_debut: record.date_debut,
      date_echeance: record.date_echeance
    }, this.viewMode === VIEW_MODES.COMPACT);
    
    // Badges bureaux
    const bureauBadges = generateBureauBadges(record.bureau, this.viewMode === VIEW_MODES.COMPACT);
    
    // Badges responsables
    const responsablesBadges = generateResponsablesBadges(record.qui);
    
    // Timeline/History button (même chose)
    const timelineButton = this.generateTimelineButton(record);
    
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    const hasDateDebutClass = record.date_debut ? 'has-debut' : '';
    
    // CORRIGÉ: Classe selon le mode de vue
    const cardClass = this.viewMode === VIEW_MODES.COMPACT ? 'kanban-item-compact' : 'kanban-item';
    
    return `<div class="kanban-item ${cardClass} ${hasEcheanceClass} ${hasDateDebutClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      
      ${bureauBadges}
      
      <div class="kanban-item-header">
        <div class="priority-section">
          ${priorityBadge}
          ${strategyIcon}
        </div>
        <div class="item-badges">
          ${projectBadge}
          ${timelineButton}
        </div>
      </div>
      
      <div class="item-title editable-zone">${record.titre || 'Sans titre'}</div>
      
      ${resumeDesc}
      
      ${datesElement}
      
      ${responsablesBadges}
    </div>`;
  }

  // Génération du bouton timeline
  generateTimelineButton(record) {
    // Compter les événements depuis les notes JSON (nouveau système)
    let notesEventCount = 0;
    if (record.notes) {
      try {
        const migrator = getNotesJsonMigrator();
        if (migrator) {
          const history = migrator.getHistory(record);
          notesEventCount = Array.isArray(history) ? history.length : 0;
        }
      } catch (e) {
        notesEventCount = 0;
      }
    }
    
    // ANCIEN SYSTÈME SUPPRIMÉ: Plus de comptage des commentaires depuis description
    const commentCount = 0; // Fixé à 0 car plus de comptage depuis description
    
    // Compter les changements de statut (ancien système)
    let statusChangeCount = 0;
    if (record.historique_statuts) {
      try {
        const history = JSON.parse(record.historique_statuts);
        statusChangeCount = history.historique ? history.historique.length : 0;
      } catch (e) {
        statusChangeCount = 0;
      }
    }
    
    const totalEvents = notesEventCount + commentCount + statusChangeCount;
    
    // Toujours afficher le bouton timeline (même sans historique)
    return `<button class="btn-timeline" data-task-id="${record.id}" data-no-tooltip="true">
      <i class="bi bi-clock-history"></i> ${totalEvents > 0 ? totalEvents : 'Voir'}
    </button>`;
  }


  // Récupération des infos stratégie
  getStrategyInfo(strategieId) {
    if (!strategieId || !this.strategiesData) return null;
    
    // 🔧 CORRECTION: Grist renvoie les IDs sous format ["L", number]
    let cleanId = strategieId;
    
    // Si c'est un array Grist ["L", id], extraire l'ID
    if (Array.isArray(strategieId) && strategieId.length === 2 && strategieId[0] === 'L') {
      cleanId = strategieId[1];
    }
    
    // 🔧 CORRECTION: Comparaison flexible pour gérer string/number depuis Grist
    return this.strategiesData.find(strategy => strategy.id == cleanId) || null;
  }

  getMultipleStrategiesInfo(strategieIds) {
    if (!strategieIds || !this.strategiesData) {
      console.log('🔍 getMultipleStrategiesInfo: pas de données', { strategieIds, hasStrategiesData: !!this.strategiesData });
      return [];
    }
    
    // 🔧 CORRECTION: Grist renvoie les IDs sous format ["L", number]
    let cleanIds = strategieIds;
    
    // Si c'est un array Grist ["L", id], extraire l'ID
    if (Array.isArray(strategieIds) && strategieIds.length === 2 && strategieIds[0] === 'L') {
      cleanIds = strategieIds[1];
    }
    
    // Support ancien format (single ID) et nouveau format (array)
    const idsArray = Array.isArray(cleanIds) ? cleanIds : [cleanIds];
    console.log('🔍 getMultipleStrategiesInfo: idsArray=', idsArray);
    
    const result = idsArray
      .map(id => {
        // 🔧 CORRECTION: Comparaison flexible pour gérer string/number depuis Grist
        return this.strategiesData.find(strategy => strategy.id == id); // == au lieu de ===
      })
      .filter(strategy => strategy !== undefined);
    
    console.log('🔍 getMultipleStrategiesInfo: result=', result);
    return result;
  }

  // === INITIALISATION DES MODALES CORRIGÉE ===
  initModals() {
    console.log('🔧 Initialisation des modales...');
    
    // Vérifier que Bootstrap est disponible
    if (typeof bootstrap === 'undefined') {
      console.error('❌ Bootstrap n\'est pas chargé !');
      displayError('Bootstrap n\'est pas disponible. Veuillez recharger la page.');
      return;
    }
    
    // Rechercher les éléments de modal
    this.modalElement = document.getElementById('popup-tache');
    this.historyModalElement = document.getElementById('history-modal');
    
    // Debug: Vérifier si les éléments existent
    console.log('Modal element trouvé:', !!this.modalElement);
    console.log('History modal element trouvé:', !!this.historyModalElement);
    
    // Initialiser la modal tâche
    if (this.modalElement) {
      try {
        this.modal = new bootstrap.Modal(this.modalElement, { 
          backdrop: 'static', 
          keyboard: false 
        });
        console.log('✅ Modal tâche initialisée');
        
        // Ajouter des événements de debug
        this.modalElement.addEventListener('show.bs.modal', () => {
          console.log('📖 Modal tâche en cours d\'ouverture');
        });
        
        this.modalElement.addEventListener('shown.bs.modal', () => {
          console.log('✅ Modal tâche ouverte');
        });
        
      } catch (e) {
        console.error('❌ Erreur init modal tâche:', e);
        displayError('Erreur initialisation modal tâche');
      }
    } else {
      console.error('❌ Élément modal tâche non trouvé !');
      displayError('Modal tâche non trouvée dans le DOM');
    }

    // Initialiser la modal historique
    if (this.historyModalElement) {
      try {
        this.historyModal = new bootstrap.Modal(this.historyModalElement, { 
          backdrop: true, 
          keyboard: true 
        });
        console.log('✅ Modal historique initialisée');
      } catch (e) {
        console.error('❌ Erreur init modal historique:', e);
      }
    } else {
      console.warn('⚠️ Modal historique non trouvée, elle sera créée si nécessaire');
    }

    // Peupler les options des selects
    this.populateSelectOptions();
  }


  populateSelectOptions() {
    if (!this.gristOptions) return;
    
    const { urgence, impact, bureau, responsables, projet } = this.gristOptions;
    
    // Peupler les selects de base
    populateSelect('popup-urgence', urgence || [], true);
    populateSelect('popup-impact', impact || [], true);
    populateSelect('popup-bureau', bureau || [], false);
    populateSelect('popup-qui', responsables || [], false);
    populateSelect('popup-projet', projet || [], true);
    
    // CORRIGÉ: Laisser le FilterManager gérer les filtres
    if (this.filterManager && this.filterManager.updateFilterOptions) {
      this.filterManager.updateFilterOptions();
    }
    
    // Peupler le select des stratégies depuis Grist
    this.populateStrategySelect();
  }

  // Peuplement du select stratégies
  populateStrategySelect() {
    const strategySelect = document.getElementById('popup-strategie');
    if (!strategySelect) return;
    
    strategySelect.innerHTML = '<option value="">-- Choisir une stratégie --</option>';
    
    this.strategiesData.forEach(strategy => {
      const option = document.createElement('option');
      option.value = strategy.id;
      option.textContent = `${strategy.objectif} - ${strategy.action}`;
      strategySelect.appendChild(option);
    });
    
    // Écouteur pour afficher les détails de la stratégie
    strategySelect.addEventListener('change', (e) => {
      this.updateStrategyDetails(parseInt(e.target.value) || null);
    });
  }

  // Mise à jour des détails de stratégie
  updateStrategyDetails(strategyId) {
    const strategy = strategyId ? this.getStrategyInfo(strategyId) : null;
    
    const objectifEl = document.getElementById('popup-strategie-objectif');
    const sousObjectifEl = document.getElementById('popup-strategie-sous-objectif');
    const actionEl = document.getElementById('popup-strategie-action');
    
    if (objectifEl) objectifEl.textContent = strategy?.objectif || '';
    if (sousObjectifEl) sousObjectifEl.textContent = strategy?.sous_objectif || '';
    if (actionEl) actionEl.textContent = strategy?.action || '';
    
    // Mettre à jour les champs cachés
    setFieldValue('popup-strategie-objectif-hidden', strategy?.objectif || '');
    setFieldValue('popup-strategie-sous-objectif-hidden', strategy?.sous_objectif || '');
    setFieldValue('popup-strategie-action-hidden', strategy?.action || '');
  }

  // === RENDU DU KANBAN CORRIGÉ ===
  refreshKanban() {
    // Éviter les appels multiples simultanés
    if (this.isRefreshing) {
      this.logger.debug("RefreshKanban ignoré (déjà en cours)");
      return;
    }
    this.isRefreshing = true;
    
    if (!this.kanbanContainer) {
      console.log("🔧 Conteneur manquant, création automatique pour Grist...");
      this.createKanbanContainer();
      
      if (!this.kanbanContainer) {
        console.error("❌ Impossible de créer le conteneur Kanban !");
        this.isRefreshing = false;
        return;
      }
    }
    
    this.logger.debug("Rafraîchissement Kanban en cours...");
    this.logger.debug(`Enregistrements disponibles: ${this.currentRecords?.length || 0}`);
    
    // Filtrer les enregistrements
    const filteredRecords = this.filterRecords(this.currentRecords || []);
    this.logger.debug(`Filtrage: ${filteredRecords.length} enregistrements retenus`);
    
    if (filteredRecords.length > 0) {
      this.logger.debug("Exemple d'enregistrement:", filteredRecords[0]);
    }
    
    const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
    this.logger.debug("Statuts à afficher:", statutsToShow.map(s => s.id));
    
    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];
    
    // CORRIGÉ: Appliquer les classes du mode de vue
    let kanbanHTML = '';
    const modeClass = this.viewMode === VIEW_MODES.COMPACT ? 'kanban-compact' : 
                     this.viewMode === VIEW_MODES.DETAILED ? 'kanban-detailed' : 
                     'kanban-focus';
    
    this.kanbanContainer.className = `kanban-container ${modeClass}`;
    
    // Mode focus : afficher une seule colonne centrée
    if (this.viewMode === VIEW_MODES.FOCUS) {
      // CORRIGÉ: Utiliser le filtre statut actuel au lieu de this.focusColumn
      const activeStatusFilter = this.filterManager?.filters?.statut || this.focusColumn;
      const focusStatut = STATUTS.find(s => s.id === activeStatusFilter);
      if (focusStatut) {
        const boardRecords = filteredRecords.filter(r => r.statut === focusStatut.id);
        // Trier les enregistrements par priorité
        boardRecords.sort((a, b) => {
          const prioA = this.calculerPriorite(a.urgence, a.impact);
          const prioB = this.calculerPriorite(b.urgence, b.impact);
          if (prioA !== prioB) return prioA - prioB;
          return (a.id || 0) - (b.id || 0);
        });
        const itemsHTML = boardRecords.map(record => this.createTaskElementHTML(record)).join('');
        const count = boardRecords.length;

        // CORRIGÉ: Une seule colonne centrée en mode focus
        kanbanHTML = `
          <div class="kanban-board kanban-board-title focus-board" data-status-id="${focusStatut.id}" style="max-width: 600px; margin: 0 auto;">
            <div class="kanban-board-header">
              <span class="board-title">
                ${this.getStatusIcon(focusStatut.id)}
                ${focusStatut.libelle}
              </span>
              <button class="board-count" data-status="${focusStatut.id}" title="Filtrer par ${focusStatut.libelle}">${count}</button>
            </div>
            <div class="kanban-board-body" data-status="${focusStatut.id}">
              ${itemsHTML}
            </div>
          </div>
        `;
      }
    } else {
      // Mode normal : afficher toutes les colonnes avec masquage des vides
      statutsToShow.forEach(statut => {
        const boardId = statut.classe;
        const boardRecords = filteredRecords.filter(r => r.statut === statut.id);
        
        console.log(`Statut ${statut.id}: ${boardRecords.length} enregistrements`);
        
        // Trier les enregistrements par priorité
        boardRecords.sort((a, b) => {
          const prioA = this.calculerPriorite(a.urgence, a.impact);
          const prioB = this.calculerPriorite(b.urgence, b.impact);
          if (prioA !== prioB) return prioA - prioB;
          return (a.id || 0) - (b.id || 0);
        });

        const itemsHTML = boardRecords.map(record => {
          const html = this.createTaskElementHTML(record);
          if (!html) {
            console.warn(`Aucun HTML généré pour l'enregistrement:`, record);
          }
          return html;
        }).join('');
        const count = boardRecords.length;
        
        // CORRIGÉ: Masquer TOUTES les colonnes vides (peu importe le mode de vue) et la colonne Terminé si masquée
        const isHidden = (count === 0) || (statut.id === 'Terminé' && !this.showTermine);
        const hiddenClass = isHidden ? ' board-hidden' : '';
        const statusClass = this.getStatusClass(statut.id);

        console.log(`Items HTML pour ${statut.id}: ${itemsHTML.length} caractères`);
        if (count > 0 && itemsHTML.length === 0) {
          console.error(`Problème: ${count} enregistrements mais 0 caractères HTML générés`);
        }

        kanbanHTML += `
          <div class="kanban-board ${statusClass}${hiddenClass}" data-status="${statut.id}">
            <div class="kanban-board-header">
              <span class="board-title">
                ${this.getStatusIcon(statut.id)}
                ${statut.libelle}
              </span>
              <button class="board-count" data-status="${statut.id}" title="Filtrer par ${statut.libelle}">${count}</button>
            </div>
            <div class="kanban-board-body" data-status="${statut.id}">
              ${itemsHTML}
            </div>
          </div>
        `;
      });
    }

    console.log('HTML final à injecter:', kanbanHTML.length, 'caractères');
    this.kanbanContainer.innerHTML = kanbanHTML || '<div style="padding: 20px; color: grey;">Aucune tâche à afficher.</div>';
    
    console.log('Vérification après injection:', this.kanbanContainer.innerHTML.length, 'caractères');
    
    // Marquer le refresh comme terminé
    this.isRefreshing = false;
    
    // Initialiser Sortable
    this.kanbanContainer.querySelectorAll('.kanban-board-body').forEach(container => {
      const sortableInstance = Sortable.create(container, {
        group: 'kanban-tasks',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        filter: '.ignore-drag',
        preventOnFilter: true,
        onEnd: (evt) => this.handleDragEnd(evt)
      });
      this.sortableInstances.push(sortableInstance);
    });
    
    // Attacher les événements pour les badges cliquables
    this.attachCardEventListeners();
    
    this.attachBadgeEventListeners();
    this.initScrollArrows();
    
    // Réinitialiser les tooltips après refresh pour inclure les nouveaux éléments
    try {
      initializeTooltips('[data-bs-toggle="tooltip"], [title]');
      this.logger.debug("Tooltips réinitialisés après refresh");
    } catch (error) {
      this.logger.debug("Erreur initialisation tooltips:", error);
    }
    
    // Marquer la fin du refresh
    this.isRefreshing = false;
  }

  // === MÉTHODES UTILITAIRES POUR LE RENDU ===
  getStatusIcon(statusId) {
    const icons = {
      'Backlog': '<i class="bi bi-list-ul"></i>',
      'À faire': '<i class="bi bi-calendar-plus"></i>',
      'En cours': '<i class="bi bi-play-circle"></i>',
      'En attente': '<i class="bi bi-pause-circle"></i>',
      'Bloqué': '<i class="bi bi-x-octagon"></i>',
      'Validation': '<i class="bi bi-check-circle"></i>',
      'Terminé': '<i class="bi bi-check-circle-fill"></i>'
    };
    
    return icons[statusId] || '<i class="bi bi-circle"></i>';
  }

  getStatusClass(statusId) {
    const classes = {
      'Backlog': 'status-backlog',
      'À faire': 'status-todo', 
      'En cours': 'status-progress',
      'En attente': 'status-waiting',
      'Bloqué': 'status-blocked',
      'Validation': 'status-validation',
      'Terminé': 'status-done'
    };
    
    return classes[statusId] || 'status-unknown';
  }

  // === GESTION DES ÉVÉNEMENTS BADGES ===
  attachBadgeEventListeners() {
    // Écouteurs pour les badges de count (filtres par statut)
    this.kanbanContainer.querySelectorAll('.board-count').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const statut = e.currentTarget.dataset.status;
        
        if (this.filterManager) {
          // Toggle du filtre statut
          const currentStatut = this.filterManager.filters.statut;
          const newStatut = currentStatut === statut ? '' : statut;
          
          // Mettre à jour le filtre
          this.filterManager.setFilter('statut', newStatut);
          
          // Mettre à jour l'interface
          this.updateBadgeStates(newStatut);
        }
      });
    });
  }

  // Met à jour l'état visuel des badges selon le filtre actif
  updateBadgeStates(activeStatut) {
    this.kanbanContainer.querySelectorAll('.board-count').forEach(badge => {
      const statut = badge.dataset.status;
      if (activeStatut && statut === activeStatut) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    });
  }

  // === GESTION DES FLÈCHES DE SCROLL ===
  initScrollArrows() {
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');
    
    if (!leftArrow || !rightArrow) {
      console.warn('Flèches de scroll non trouvées dans le DOM');
      return;
    }

    // Gérer les clics sur les flèches
    leftArrow.addEventListener('click', () => {
      this.scrollContainer(-300);
    });

    rightArrow.addEventListener('click', () => {
      this.scrollContainer(300);
    });

    // Gérer la visibilité des flèches au scroll
    this.kanbanContainer.addEventListener('scroll', () => {
      this.updateArrowVisibility();
    });

    // Mise à jour initiale de la visibilité
    setTimeout(() => {
      this.updateArrowVisibility();
    }, 100);
  }

  scrollContainer(direction) {
    this.kanbanContainer.scrollBy({
      left: direction,
      behavior: 'smooth'
    });
  }

  updateArrowVisibility() {
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');
    
    if (!leftArrow || !rightArrow) return;

    const container = this.kanbanContainer;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    // Afficher flèche gauche si on peut scroller à gauche
    if (scrollLeft > 10) {
      leftArrow.classList.remove('hidden');
    } else {
      leftArrow.classList.add('hidden');
    }

    // Afficher flèche droite si on peut scroller à droite
    if (scrollLeft < scrollWidth - clientWidth - 10) {
      rightArrow.classList.remove('hidden');
    } else {
      rightArrow.classList.add('hidden');
    }
  }

  // NOUVEAU: Tri des enregistrements
  sortRecords(records) {
    records.sort((a, b) => {
      const prioA = this.calculerPriorite(a.urgence, a.impact);
      const prioB = this.calculerPriorite(b.urgence, b.impact);
      if (prioA !== prioB) return prioA - prioB;
      return (a.id || 0) - (b.id || 0);
    });
  }

  // EVENT LISTENERS - VERSION SIMPLE
  attachCardEventListeners() {
    // Ne plus rien faire ici - la délégation jQuery s'occupe de tout
    console.log('📝 Event listeners délégués avec jQuery');
  }

  // === MÉTHODE DIRECTE POUR OUVRIR MODALE TÂCHE ===
  openTaskModalDirect(taskId) {
    console.log('🔧 Ouverture directe modale tâche:', taskId);
    
    // Nettoyer d'abord les backdrops orphelins
    this.cleanOrphanBackdrops();
    
    try {
      // Trouver la tâche
      const task = this.currentRecords.find(t => t.id === taskId);
      if (!task) {
        console.error('❌ Tâche non trouvée:', taskId);
        return;
      }
      
      // Récupérer la modale
      const modalElement = document.getElementById('popup-tache');
      if (!modalElement) {
        console.error('❌ Modale popup-tache non trouvée');
        return;
      }
      
      // Peupler les champs de base
      const titleField = document.getElementById('popup-titre');
      const descField = document.getElementById('popup-description');
      const statusField = document.getElementById('popup-statut-text');
      
      if (titleField) titleField.value = task.titre || '';
      if (descField) descField.value = task.description || '';
      if (statusField) statusField.value = task.statut || '';
      
      // Stocker l'ID pour sauvegarde
      this.currentTaskId = taskId;
      
      // Charger l'historique dans la modale si le manager existe
      if (this.historyManager) {
        console.log('📖 Chargement historique dans modale...');
        // Utiliser un timeout pour laisser la modale s'ouvrir d'abord
        setTimeout(() => {
          this.historyManager.loadTaskHistoryInModal(taskId);
        }, 100);
      }
      
      // Ouvrir la modale avec Bootstrap
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      
      console.log('✅ Modale ouverte directement pour tâche:', taskId);
      
    } catch (error) {
      console.error('❌ Erreur ouverture modale directe:', error);
      alert(`Erreur ouverture modale: ${error.message}`);
    }
  }

  // === GESTION DE LA MODAL TIMELINE ===
  openTimelineModal(taskId) {
    this.logger.debug(`openTimelineModal appelée avec taskId: ${taskId}`);
    this.logger.debug(`historyManager disponible: ${!!this.historyManager}`);
    
    // REDIRECTION: Utiliser le HistoryManager qui a le système complet avec boutons d'édition
    if (this.historyManager) {
      this.logger.debug(`Appel historyManager.openTaskHistory(${taskId})`);
      this.historyManager.openTaskHistory(taskId);
    } else {
      this.logger.error('Gestionnaire d\'historique non disponible');
      displayError('Gestionnaire d\'historique non disponible');
    }
  }
  
  // === NETTOYAGE DES BACKDROPS BOOTSTRAP ORPHELINS ===
  cleanOrphanBackdrops() {
    // Supprimer tous les backdrops Bootstrap orphelins
    const backdrops = document.querySelectorAll('.modal-backdrop');
    console.log(`🧹 Nettoyage des backdrops orphelins: ${backdrops.length} trouvés`);
    
    backdrops.forEach((backdrop, index) => {
      console.log(`🗑️ Suppression backdrop orphelin ${index + 1}`);
      backdrop.remove();
    });
    
    // Réinitialiser le body si nécessaire
    const body = document.body;
    if (body.classList.contains('modal-open')) {
      console.log('🔄 Réinitialisation du body (modal-open)');
      body.classList.remove('modal-open');
      body.style.overflow = '';
      body.style.paddingRight = '';
      body.removeAttribute('data-bs-overflow');
      body.removeAttribute('data-bs-padding-right');
    }
    
    // Afficher/masquer le bouton de nettoyage d'urgence
    this.updateCleanButton();
    
    console.log('✅ Nettoyage des backdrops terminé');
  }
  
  // === CRÉATION DU CONTENEUR POUR WIDGETS GRIST ===
  createKanbanContainer() {
    // Vérifier qu'il n'existe pas déjà un container
    const existing = document.getElementById('kanban-container');
    if (existing) {
      console.log('✅ Container Kanban existant réutilisé');
      this.kanbanContainer = existing;
      return;
    }
    
    // Créer la structure HTML minimale nécessaire
    const container = document.createElement('div');
    container.id = 'kanban-container';
    container.className = 'kanban-container';
    
    // Style inline minimal pour Grist
    container.style.cssText = `
      display: flex;
      overflow-x: auto;
      gap: 1rem;
      padding: 1rem;
      min-height: 400px;
      width: 100%;
      box-sizing: border-box;
    `;
    
    // Ajouter au body
    document.body.appendChild(container);
    
    // Créer aussi les modales nécessaires
    this.createRequiredModals();
    
    // Récupérer le conteneur créé
    this.kanbanContainer = container;
    
    console.log('✅ Conteneur Kanban créé pour widget Grist');
  }
  
  createRequiredModals() {
    // Créer la modal d'historique
    const historyModal = document.createElement('div');
    historyModal.className = 'modal fade history-modal';
    historyModal.id = 'history-modal';
    historyModal.setAttribute('tabindex', '-1');
    historyModal.setAttribute('aria-hidden', 'true');
    historyModal.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="history-modal-label">
              <i class="bi bi-clock-history me-2"></i>Historique de la tâche
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div id="history-stats"></div>
            <div id="history-timeline"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-success" id="btn-export-task-history">
              <i class="bi bi-download me-1"></i>Exporter
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(historyModal);
    
    // Créer la modal d'édition de tâche
    const taskModal = document.createElement('div');
    taskModal.className = 'modal fade';
    taskModal.id = 'popup-tache';
    taskModal.setAttribute('tabindex', '-1');
    taskModal.setAttribute('aria-hidden', 'true');
    taskModal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="popup-tache-label">Éditer la tâche</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="popup-tache-body">
            <!-- Contenu généré dynamiquement -->
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
            <button type="button" class="btn btn-primary" id="btn-save-task">Sauvegarder</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(taskModal);
    
    console.log('✅ Modales créées pour widget Grist');
  }

  // Mise à jour du bouton de nettoyage d'urgence
  updateCleanButton() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    const cleanBtn = document.getElementById('btn-clean-backdrops');
    
    if (cleanBtn) {
      if (backdrops.length > 0) {
        cleanBtn.style.display = 'block';
        cleanBtn.onclick = () => this.cleanOrphanBackdrops();
      } else {
        cleanBtn.style.display = 'none';
      }
    }
    
    // 🧪 BOUTON TEST NOUVEAU SYSTÈME MODAL
    const testBtn = document.getElementById('btn-test-new-modal');
    if (testBtn && !testBtn.hasAttribute('data-initialized')) {
      testBtn.setAttribute('data-initialized', 'true');
      // testBtn.onclick = () => this.testNewModalSystem(); // SUPPRIMÉ
    }
  }
  
  // testNewModalSystem() supprimée - plus nécessaire
  
  // === GESTION DE LA MINI-MODALE STRATÉGIES ===
  openStrategyMiniModal(taskId) {
    // 🛡️ PROTECTION ANTI-SPAM: Éviter appels multiples rapides
    if (this._strategyModalOpening) {
      console.log('🚫 openStrategyMiniModal: déjà en cours d\'ouverture');
      return;
    }
    this._strategyModalOpening = true;
    setTimeout(() => { this._strategyModalOpening = false; }, 1000); // Reset après 1s
    
    console.log(`🔍 openStrategyMiniModal appelée avec taskId: ${taskId}`);
    
    const task = this.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      displayError('Tâche non trouvée');
      this._strategyModalOpening = false;
      return;
    }
    
    console.log(`🔍 Task trouvée:`, { id: task.id, titre: task.titre, strategie_id: task.strategie_id });
    
    const strategiesInfo = this.getMultipleStrategiesInfo(task.strategie_id);
    const content = document.getElementById('strategy-mini-content');
    
    if (!content) {
      displayError('Container de stratégies non trouvé');
      this._strategyModalOpening = false;
      return;
    }
    
    if (strategiesInfo.length === 0) {
      content.innerHTML = '<div class="strategy-mini-empty">Aucune stratégie associée</div>';
    } else {
      content.innerHTML = strategiesInfo.map(strategy => `
        <div class="strategy-mini-item">
          <div class="strategy-mini-objectif">${strategy.objectif}</div>
          <div class="strategy-mini-action">${strategy.action}</div>
        </div>
      `).join('');
    }
    
    // Ouvrir la modale
    const modalElement = document.getElementById('strategy-mini-modal');
    if (!modalElement) {
      console.error('❌ Élément strategy-mini-modal introuvable !');
      displayError('Modal stratégie non trouvée');
      this._strategyModalOpening = false;
      return;
    }
    
    console.log('🎉 Ouverture modal stratégie...');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Reset protection après ouverture réussie
    setTimeout(() => { this._strategyModalOpening = false; }, 500);
  }

  renderTimelineContent(task) {
    const timelineContent = document.getElementById('history-timeline');
    const timelineStats = document.getElementById('history-stats');
    
    if (!timelineContent || !timelineStats) return;

    // Analyser les données
    const timelineData = this.parseTimelineData(task);
    
    // Statistiques
    timelineStats.innerHTML = `
      <div class="row g-3">
        <div class="col-md-3">
          <div class="text-center">
            <h4 class="text-primary">${timelineData.events.length}</h4>
            <small class="text-muted">Événements total</small>
          </div>
        </div>
        <div class="col-md-3">
          <div class="text-center">
            <h4 class="text-info">${timelineData.comments.length}</h4>
            <small class="text-muted">Commentaires</small>
          </div>
        </div>
        <div class="col-md-3">
          <div class="text-center">
            <h4 class="text-warning">${timelineData.statusChanges.length}</h4>
            <small class="text-muted">Changements statut</small>
          </div>
        </div>
        <div class="col-md-3">
          <div class="text-center">
            <h4 class="text-success">${task.statut}</h4>
            <small class="text-muted">Statut actuel</small>
          </div>
        </div>
      </div>
    `;

    // Timeline
    let timelineHTML = '<div class="timeline">';
    
    timelineData.events.forEach((event, index) => {
      const isLatest = index === 0;
      const eventClass = isLatest ? 'timeline-event latest' : 'timeline-event';
      
      if (event.type === 'comment') {
        timelineHTML += `
          <div class="${eventClass}">
            <div class="timeline-marker bg-info">
              <i class="bi bi-chat-text text-white"></i>
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <h6 class="mb-1">Commentaire ${isLatest ? '(Dernier)' : ''}</h6>
                <small class="text-muted">${event.timestamp} par ${event.user}</small>
              </div>
              <div class="timeline-body">
                <div class="comment-content bg-light p-3 rounded">${event.content}</div>
                ${isLatest ? '' : '<small class="text-muted mt-2 d-block">✓ Commentaire validé</small>'}
              </div>
            </div>
          </div>
        `;
      } else if (event.type === 'status') {
        timelineHTML += `
          <div class="${eventClass}">
            <div class="timeline-marker bg-warning">
              <i class="bi bi-arrow-right text-white"></i>
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <h6 class="mb-1">Changement de statut</h6>
                <small class="text-muted">${event.timestamp} par ${event.user}</small>
              </div>
              <div class="timeline-body">
                <span class="badge bg-primary">${event.status}</span>
                ${event.duration ? `<span class="ms-2 text-muted">Durée: ${formatDuration(event.duration)}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }
    });
    
    timelineHTML += '</div>';
    timelineContent.innerHTML = timelineHTML;
  }

  parseTimelineData(task) {
    const events = [];
    const comments = [];
    const statusChanges = [];
    
    // Parser l'historique depuis le champ notes (nouveau système JSON)
    if (task.notes) {
      try {
        // Utiliser le migrator pour lire l'historique
        const migrator = getNotesJsonMigrator();
        
        if (migrator) {
          const historyData = migrator.getHistory(task);
          
          if (Array.isArray(historyData)) {
            historyData.forEach(entry => {
              const historyEvent = {
                type: entry.action === 'status_change' ? 'status' : 'comment',
                timestamp: new Date(entry.timestamp).toLocaleString('fr-FR'),
                content: entry.details,
                user: entry.user || 'System',
                action: entry.action,
                status: entry.status
              };
              
              if (entry.action === 'status_change') {
                statusChanges.push(historyEvent);
              } else {
                comments.push(historyEvent);
              }
              events.push(historyEvent);
            });
          }
        }
      } catch (error) {
        console.error('Erreur lecture historique notes:', error);
      }
    }
    
    // Parser les anciens commentaires depuis la description (compatibilité)
    if (task.description) {
      const sections = task.description.split(/^---\s*$/gm);
      
      sections.forEach(section => {
        const lines = section.trim().split('\n');
        if (lines.length === 0) return;
        
        const timestampMatch = lines[0].match(/^\((.+)\)$/);
        if (timestampMatch) {
          const content = lines.slice(1).join('\n').trim();
          if (content) {
            const comment = {
              type: 'comment',
              timestamp: timestampMatch[1],
              content: content,
              user: this.extractUserFromTimestamp(timestampMatch[1]),
              action: 'legacy_comment'
            };
            comments.push(comment);
            events.push(comment);
          }
        }
      });
    }
    
    // Parser l'historique des statuts
    if (task.historique_statuts) {
      try {
        const history = JSON.parse(task.historique_statuts);
        if (history.historique) {
          history.historique.forEach(entry => {
            const statusChange = {
              type: 'status',
              timestamp: new Date(entry.date_entree).toLocaleString('fr-FR'),
              status: entry.statut,
              user: entry.utilisateur || 'Système',
              duration: entry.duree_minutes
            };
            statusChanges.push(statusChange);
            events.push(statusChange);
          });
        }
      } catch (e) {
        console.warn('Erreur parsing historique statuts:', e);
      }
    }
    
    // Trier les événements par date (plus récent en premier)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { events, comments, statusChanges };
  }

  extractUserFromTimestamp(timestamp) {
    const match = timestamp.match(/\(([^)]+)\)$/);
    return match ? match[1] : this.currentUser;
  }

 // === EVENT LISTENERS CORRIGÉS ===
  initEventListeners() {
    console.log('🔧 Initialisation des event listeners...');
    
    // Nettoyer tous les event listeners précédents pour éviter doublons
    $(document).off('.kanban-events');
    
    // Bouton nouvelle tâche - délégation jQuery propre
    $(document).on('click.kanban-events', '#btn-nouvelle-tache', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🆕 Clic bouton nouvelle tâche');
      this.openPopup();
    });

    // Bouton sauvegarder - GÉRÉ PAR ModalManager.js (éviter duplication)

    // Bouton supprimer - GÉRÉ PAR ModalManager.js (éviter duplication)

    // Bouton export historique
    const btnExportHistory = document.getElementById('btn-export-history');
    if (btnExportHistory) {
      btnExportHistory.addEventListener('click', (e) => {
        console.log('📤 Clic bouton export historique');
        e.preventDefault();
        this.exportKanban();
      });
    }

   

    // Raccourcis clavier - délégation jQuery propre
    $(document).on('keydown.kanban-events', (e) => {
      // Ignorer si dans un champ de saisie
      if ($(e.target).is('input, textarea, select')) return;
      
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          this.openPopup();
          break;
          
        case 'r':
          if (!e.ctrlKey && !e.metaKey) { 
            e.preventDefault();
            this.refreshKanban();
          }
          break;
          
        case 'f':
          e.preventDefault();
          $('#search-input').focus();
          break;
          
        case 'escape':
          this.closeAllModals();
          break;
      }
    });

    // Timeline modal buttons - GÉRÉS PAR HistoryManager.js (éviter duplication)

    // Force timeline modal close buttons to work
    const timelineCloseButtons = document.querySelectorAll('#history-modal [data-bs-dismiss="modal"]');
    timelineCloseButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.historyModal) {
          this.historyModal.hide();
        }
      });
    });

    // Force task modal close buttons to work
    const taskCloseButtons = document.querySelectorAll('#popup-tache [data-bs-dismiss="modal"]');
    taskCloseButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.modalManager && this.modalManager.taskModal) {
          this.modalManager.taskModal.hide();
        } else if (this.modal) {
          this.modal.hide();
        }
      });
    });

    console.log('✅ Event listeners initialisés');
  }

// === OUVERTURE DE MODAL CORRIGÉE ===
  openPopup(tache = {}) {
    console.log('🔓 Tentative d\'ouverture de modal', { tache: tache?.id || 'nouvelle' });
    
    // Vérifications de sécurité
    if (!this.modal) {
      console.error('❌ Instance modal non disponible');
      
      // Tentative de réinitialisation
      console.log('🔄 Tentative de réinitialisation de la modal...');
      this.initModals();
      
      if (!this.modal) {
        displayError('Modal non disponible. Veuillez recharger la page.');
        return;
      }
    }
    
    if (!this.modalElement) {
      console.error('❌ Élément modal non disponible');
      displayError('Élément modal non trouvé dans le DOM');
      return;
    }
    
    const isNewTask = !tache.id;
    this.currentTaskId = tache.id || null;
    
    console.log('📝 Remplissage des champs de la modal');
    
    // Peupler les champs
    if (this.modalManager) {
      this.modalManager.populateTaskForm(tache, isNewTask);
    } else {
      console.error('❌ ModalManager non disponible');
      displayError('ModalManager non initialisé. Veuillez recharger la page.');
      return;
    }
    
    // Afficher/masquer le bouton supprimer
    toggleVisibility('btn-delete-task', !isNewTask, 'inline-block');
    
    // Ouvrir la modal via ModalManager
    try {
      console.log('🔓 Ouverture de la modal...');
      if (this.modalManager && this.modalManager.taskModal) {
        this.modalManager.taskModal.show();
        
        // Focus sur le premier champ après ouverture
        setTimeout(() => {
          const firstField = document.getElementById('popup-titre');
          if (firstField) {
            firstField.focus();
          }
        }, 300);
        
        console.log('✅ Modal tâche ouverte via ModalManager');
      } else {
        // Fallback vers l'ancienne méthode
        this.modal.show();
        console.log('✅ Modal tâche ouverte (fallback)');
      }
    } catch (error) {
      console.error('❌ Erreur ouverture modal:', error);
      displayError(`Erreur ouverture modal: ${error.message}`);
    }
  }

  // === DRAG & DROP ===
  async handleDragEnd(evt) {
    const itemEl = evt.item;
    const targetContainer = evt.to;
    const taskId = parseInt(itemEl.dataset.id, 10);
    const newStatus = targetContainer.dataset.statusId;

    const record = this.currentRecords.find(r => r.id === taskId);
    if (!record || record.statut === newStatus) return;

    try {
      this.isUpdating = true;
      
      // Mettre à jour les données locales
      const recordIndex = this.currentRecords.findIndex(r => r.id === taskId);
      if (recordIndex !== -1) {
        this.currentRecords[recordIndex].statut = newStatus;
      }
      
      this.refreshKanban();
      this.signalLocalUpdate();
      
      // Envoyer la mise à jour à Grist
      await grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, taskId, { statut: newStatus }]
      ]);
      
      // Enregistrer l'action utilisateur pour le changement de statut
      const userActionManager = getUserActionManager();
      if (userActionManager) {
        await userActionManager.statusChangeAction(taskId, record.statut, newStatus);
      }
      
      console.log(`Succès mise à jour statut ${taskId}.`);

    } catch (error) {
      console.error('Erreur déplacement:', error);
      displayError(`Erreur: ${error.message}`);
      this.refreshKanban();
    } finally {
      this.isUpdating = false;
    }
  }

  // === GESTION DES MISES À JOUR GRIST ===
  handleGristUpdate(gristRecords, mappings = null) {
    if (this.isUpdating) {
      this.logger.debug("onRecords ignoré (verrou de mise à jour)");
      return;
    }
    if (this.ignoreNextOnRecords) {
      this.logger.debug("onRecords ignoré (flag ignoreNext)");
      this.ignoreNextOnRecords = false;
      return;
    }
    
    // Ignorer les mises à jour des enregistrements temporaires du système d'historique
    if (gristRecords && Array.isArray(gristRecords)) {
      const hasTempRecord = gristRecords.some(record => 
        record && record.titre === '___TEMP_USER_RECORD___'
      );
      if (hasTempRecord) {
        this.logger.debug("onRecords ignoré (enregistrement temporaire)");
        return;
      }
    }
    
    this.logger.info("Mise à jour Grist détectée");
    this.isUpdating = true;
    
    this.logger.debug("Stratégie: Re-fetch des données");
    grist.docApi.fetchTable(TABLE_ID).then(fresh => {
      this.logger.debug("Données re-fetchées avec succès");
      this.currentRecords = this.mapGristRecords(fresh);
      this.refreshKanban();
      
      // Mettre à jour les options des filtres
      if (this.filterManager) {
        this.filterManager.updateFilterOptions();
      }
    }).catch(err => {
      console.error("Erreur re-fetch:", err);
      displayError("Erreur MAJ Grist.");
    }).finally(() => {
      this.isUpdating = false;
      console.log("Verrou MAJ levé.");
    });
  }

  // === SIGNAL LOCAL UPDATE ===
  signalLocalUpdate() {
    console.log("Flag ignoreNextOnRecords activé.");
    this.ignoreNextOnRecords = true;
    setTimeout(() => {
      if (this.ignoreNextOnRecords) {
        console.log("Flag ignoreNextOnRecords désactivé (timeout).");
        this.ignoreNextOnRecords = false;
      }
    }, 1000); // Augmenté de 500ms à 1000ms pour laisser plus de temps aux cascades
  }

  // === MISE À JOUR DES OPTIONS SANS RE-FETCH ===
  updateGristOptions() {
    // Charger les options de base
    this.gristOptions.statut = getDefaultStatuts();
    this.gristOptions.urgence = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
    this.gristOptions.impact = ['Critique', 'Important', 'Modéré', 'Mineur'];
    
    // Utiliser les données réelles pour les filtres
    const bureaux = this.getUniqueValuesFromData('bureau', true);
    this.gristOptions.bureau = [...new Set([...DEFAULT_BUREAUX, ...bureaux])].sort();
    
    const responsables = this.getUniqueValuesFromData('qui', true);
    this.gristOptions.responsables = [...new Set([...DEFAULT_RESPONSABLES, ...responsables])].sort();
    
    const projets = this.getUniqueValuesFromData('projet');
    this.gristOptions.projet = [...new Set([...projets, ...projetsDynamiques])].sort();
    
    console.log('Options mises à jour:', {
      bureaux: this.gristOptions.bureau.length,
      responsables: this.gristOptions.responsables.length,
      projets: this.gristOptions.projet.length,
      strategies: this.strategiesData.length
    });
  }

  // === MÉTHODES TIMELINE MODAL ===
  toggleCommentsOnlyView() {
    // Cette méthode peut être implémentée plus tard
    console.log('Toggle comments only view');
  }

  exportCurrentTaskHistory() {
    // Cette méthode peut être implémentée plus tard
    console.log('Export current task history');
  }

  // === MÉTHODES DE FILTRAGE ET TRI ===
  filterRecords(records) {
    // CRITIQUE: Filtrer d'abord les enregistrements temporaires système
    const filteredTempRecords = records.filter(r => {
      return r && r.titre !== '___TEMP_USER_RECORD___';
    });
    
    const { bureau, qui, projet, statut, search } = this.filters;
    
    // Appliquer tous les filtres (y compris la recherche textuelle)
    console.log("Application filtres:", this.filters);
    return filteredTempRecords.filter(r => {
      // Filtres dropdown
      const matchBureau = !bureau || this.nettoyerListe(r.bureau).includes(bureau);
      const matchQui = !qui || this.nettoyerListe(r.qui).includes(qui);
      const matchProjet = !projet || r.projet === projet;
      const matchStatut = !statut || r.statut === statut;
      
      // Recherche textuelle
      let matchSearch = true;
      if (search && search.trim() !== '') {
        const searchableText = [
          r.titre || '',
          r.description || '',
          r.projet || '',
          r.strategie_objectif || '',
          r.strategie_sous_objectif || '',
          r.strategie_action || '',
          r.notes || ''
        ].join(' ').toLowerCase();
        
        matchSearch = searchableText.includes(search.toLowerCase().trim());
      }
      
      return matchBureau && matchQui && matchProjet && matchStatut && matchSearch;
    });
  }

  nettoyerListe(v) {
    if (Array.isArray(v) && v[0] === 'L') {
      return v.slice(1).filter(i => i !== null && typeof i !== 'undefined').map(String);
    }
    if (Array.isArray(v)) {
      return v.filter(i => i !== null && typeof i !== 'undefined').map(String);
    }
    if (typeof v === 'string' && v.trim() !== '') {
      return v.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  calculerPriorite(u, i) {
    const imp = String(i || '').trim().toLowerCase();
    const urg = String(u || '').trim().toLowerCase();
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }

  // === MÉTHODES UTILITAIRES ===
  exportKanban() {
    const csvData = this.exportToCSV();
    const filename = `kanban_export_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadCSV(csvData, filename);
    displaySuccess('Export réussi');
  }

  exportToCSV() {
    const headers = [
      'ID', 'Titre', 'Description', 'Statut', 'Projet', 'Urgence', 'Impact',
      'Bureaux', 'Responsables', 'Date_Echeance', 'Stratégie'
    ];

    let csv = headers.join(',') + '\n';

    this.currentRecords.forEach(record => {
      const strategy = this.getStrategyInfo(record.strategie_id);
      const bureaux = Array.isArray(record.bureau) ? record.bureau.slice(1).join(', ') : '';
      const responsables = Array.isArray(record.qui) ? record.qui.slice(1).join(', ') : '';
      
      const row = [
        record.id || '',
        `"${(record.titre || '').replace(/"/g, '""')}"`,
        `"${(this.getLatestDescription(record.description) || '').replace(/"/g, '""')}"`,
        record.statut || '',
        record.projet || '',
        record.urgence || '',
        record.impact || '',
        `"${bureaux}"`,
        `"${responsables}"`,
        record.date_echeance || '',
        `"${strategy ? `${strategy.objectif} - ${strategy.action}` : ''}"`
      ];

      csv += row.join(',') + '\n';
    });

    return csv;
  }

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

  // NOUVEAU: Callbacks pour les managers
  onDataReloaded(records, options) {
    this.currentRecords = records;
    this.gristOptions = { ...this.gristOptions, ...options };
    this.refreshKanban();
    this.populateSelectOptions();
  }

  // NOUVEAU: Méthodes de recherche pour FilterManager
  searchTasks(criteria) {
    return this.currentRecords.filter(task => {
      if (criteria.text) {
        const searchableText = [
          task.titre || '',
          task.description || '',
          task.projet || ''
        ].join(' ').toLowerCase();
        
        return searchableText.includes(criteria.text.toLowerCase());
      }
      return true;
    });
  }
 

  // NOUVEAU: Statistiques pour l'affichage
  getKanbanStatistics() {
    const stats = {
      totalTasks: this.currentRecords.length,
      byStatus: {},
      urgent: 0,
      highPriority: 0
    };

    this.currentRecords.forEach(task => {
      // Par statut
      const status = task.statut || 'Non défini';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Tâches urgentes
      const priority = this.calculerPriorite(task.urgence, task.impact);
      if (priority <= 2) {
        stats.highPriority++;
      }
      if (task.urgence === 'Immédiate') {
        stats.urgent++;
      }
    });

    return stats;
  }

  /**
   * Initialise la délégation d'événements (bonne pratique jQuery)
   * PRINCIPE : Utiliser UNIQUEMENT jQuery pour la cohérence et stabilité
   */
  initEventDelegation() {
    console.log('🎯 Initialisation délégation d\'événements jQuery...');
    
    // VÉRIFIER que jQuery est disponible - obligatoire pour la stabilité
    if (typeof $ === 'undefined') {
      console.error('❌ jQuery requis pour la délégation d\'événements');
      displayError('jQuery requis pour le fonctionnement des événements');
      return;
    }
    
    this.initJQueryDelegation();
    console.log('✅ Délégation d\'événements jQuery initialisée');
  }
  
  /**
   * Délégation avec jQuery (seule méthode stable et pérenne)
   * PRINCIPE : Utiliser .on() avec délégation et bind() pour conserver le contexte
   */
  initJQueryDelegation() {
    const $container = $('#kanban-container');
    
    if ($container.length === 0) {
      console.error('❌ Container #kanban-container non trouvé');
      return;
    }
    
    // Nettoyer les anciens event listeners sur le container
    $container.off('.kanban-events');
    
    // BOUTONS HISTORIQUE - délégation avec contexte préservé
    $container.on('click.kanban-events', '.btn-timeline', $.proxy(function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // Empêcher autres gestionnaires
      
      // Protection anti-flood au niveau du gestionnaire
      const now = Date.now();
      if (this._lastTimelineClick && now - this._lastTimelineClick < 500) {
        console.log('🛡️ Timeline click bloqué (trop rapide)');
        return false;
      }
      this._lastTimelineClick = now;
      
      const taskId = parseInt($(e.currentTarget).data('task-id'), 10);
      console.log('🎯 Timeline clicked for task:', taskId);
      
      if (taskId && this.historyManager && typeof this.historyManager.openTaskHistory === 'function') {
        this.historyManager.openTaskHistory(taskId);
      } else {
        console.warn('❌ Cannot open history:', { taskId, hasHistoryManager: !!this.historyManager });
      }
      
      return false; // Empêcher propagation
    }, this)); // $.proxy() préserve le contexte 'this'
    
    // TITRES DE TÂCHES - délégation pour édition
    $container.on('click.kanban-events', '.item-title', $.proxy(function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const $card = $(e.target).closest('.kanban-item');
      const taskId = parseInt($card.data('id'), 10);
      console.log('🎯 Édition tâche jQuery délégation, taskId:', taskId);
      
      if (taskId && this.modalManager && typeof this.modalManager.openTaskModal === 'function') {
        const task = this.currentRecords?.find(t => t.id === taskId);
        if (task) {
          this.modalManager.openTaskModal(task);
        }
      }
    }, this)); // $.proxy() préserve le contexte 'this'
    
    console.log('✅ Délégation jQuery configurée avec $.proxy()');
  }
  
  // initNativeDelegation() supprimée - utilisation exclusive de jQuery pour la stabilité

  // initializeModalSystem() supprimée - système simplifié avec délégation jQuery
}

// === INITIALISATION ===
// SUPPRIMÉ: Double initialisation avec app-initializer.js
// L'initialisation est gérée par app-initializer.js via DOMContentLoaded

// === EXPORT POUR UTILISATION EXTERNE ===
export { KanbanManager };

window.KanbanApp = {
  KanbanManager,
  displayError,
  displaySuccess,
  normalizeDate,
  formatDate,
  generateBureauBadges,
  generateAllTaskBadges,
  STATUTS,
  VIEW_MODES,
  TABLE_ID
};
