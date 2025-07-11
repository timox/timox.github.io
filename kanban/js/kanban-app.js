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

// NOUVEAU: Import des managers
import { FilterManager } from './managers/FilterManager.js';
import { ViewModeManager } from './managers/ViewModeManager.js';
import { ModalManager } from './managers/ModalManager.js';
import { GristManager } from './managers/GristManager.js';

// === CONSTANTES ===
const STRATEGIES_TABLE_ID = "Ssir_strategie2";

let projetsDynamiques = [];

// === CLASSE KANBANMANAGER CORRIGÉE ===
class KanbanManager {
  constructor() {
    // Propriétés principales
    this.kanbanContainer = document.getElementById('kanban-container');
    this.currentRecords = [];
    this.modalElement = null;
    this.historyModalElement =null;
    this.currentTaskId = null;
    this.isUpdating = false;
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
      this.initModals();
      this.initEventListeners();
      
      // Initialiser les managers après le chargement des données
      this.initializeManagers();
      
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
    
    // Manager Grist
    this.gristManager = new GristManager(this);
    
    console.log('✅ Managers initialisés');
  }

  async waitForGristReady() {
    return new Promise((resolve) => {
      console.log("Attente grist.ready...");
      try {
        grist.ready({ requiredAccess: 'full' });
        grist.onRecords(this.handleGristUpdate.bind(this));
        console.log("Listener onRecords attaché.");
        setTimeout(() => {
          console.log("grist.ready OK.");
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
    console.log("Chargement données Grist (Tâches et Options)...");
    try {
      // Charger les tâches principales
      const records = await grist.docApi.fetchTable(TABLE_ID);
      this.currentRecords = this.mapGristRecords(records);
      console.log("Données tâches mappées:", this.currentRecords.length, "enreg.");
      if (!this.currentRecords?.length) console.warn("Aucune donnée tâche Grist chargée.");

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

  // Chargement des stratégies depuis la table Grist (basé sur old example)
  async loadStrategiesFromGrist() {
    try {
      console.log(`Chargement table ${STRATEGIES_TABLE_ID}...`);
      const strategiesData = await grist.docApi.fetchTable(STRATEGIES_TABLE_ID);
      
      // Colonnes à extraire de Ssir_strategie2
      const requiredStratCols = ['id', 'id2', 'objectif', 'sous_objectif', 'action'];
      const displayCol = 'id2';
      
      if (strategiesData && requiredStratCols.every(col => strategiesData.hasOwnProperty(col))) {
        this.strategiesData = strategiesData.id.map((id, index) => {
          const stratRecord = {};
          requiredStratCols.forEach(col => {
            stratRecord[col] = strategiesData[col][index];
          });
          return stratRecord;
        }).sort((a, b) => String(a[displayCol] || '').localeCompare(String(b[displayCol] || '')));
        
        console.log(`Options Stratégies (dynamique): ${this.strategiesData.length} valeurs chargées.`);
      } else {
        console.warn(`La table ${STRATEGIES_TABLE_ID} ou des colonnes requises (${requiredStratCols.join(', ')}) sont manquantes/vides.`);
        this.strategiesData = [];
      }
    } catch (stratError) {
      console.error(`Erreur chargement table ${STRATEGIES_TABLE_ID}:`, stratError);
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

  // NOUVEAU: Génère l'historique des commentaires pour affichage lecture seule
  generateCommentHistory(description) {
    if (!description) return '';
    
    const sections = description.split(/^---\s*$/gm);
    let historyHTML = '';
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      if (lines.length === 0) return;
      
      const timestampMatch = lines[0].match(/^\[(.+)\]$/);
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
    
    console.log(`Création HTML pour tâche ${record.id}: ${record.titre}`);
    
    const priority = this.calculerPriorite(record.urgence, record.impact);
    const priorityBadge = generatePriorityBadge(priority);
    
    // Stratégie avec tooltip si disponible
    const strategyInfo = this.getStrategyInfo(record.strategie_id);
    const strategyTooltip = strategyInfo ? 
      `data-toggle="tooltip" data-placement="top" title="Objectif: ${strategyInfo.objectif} | Action: ${strategyInfo.action}"` : '';
    const strategyIcon = strategyInfo ? 
      `<i class="fas fa-bullseye strategie-icon" ${strategyTooltip}></i>` : '';

    // Projet
    const projectBadge = record.projet ? 
      generateProjectBadge({
        projet: record.projet,
        strategie_objectif: strategyInfo?.objectif,
        strategie_sous_objectif: strategyInfo?.sous_objectif,
        strategie_action: strategyInfo?.action
      }) : '';

    // Description résumée
    const resumeDesc = record.description ? 
      `<div class="desc-resume">${this.getLatestDescription(record.description).substring(0, 80)}${record.description.length > 80 ? '…' : ''}</div>` : '';
    
    // Dates
    const datesElement = generateDatesContainer({
      date_debut: record.date_debut,
      date_echeance: record.date_echeance
    }, this.viewMode === VIEW_MODES.COMPACT);
    
    // Badges bureaux
    const bureauBadges = generateBureauBadges(record.bureau, this.viewMode === VIEW_MODES.COMPACT);
    
    // Badges responsables
    const responsablesBadges = generateResponsablesBadges(record.qui);
    
    // Timeline button
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
    if (!record.description && !record.historique_statuts) return '';
    
    // Compter les commentaires
    const commentCount = record.description ? 
      (record.description.match(/^\[.*\]$/gm) || []).length : 0;
    
    // Compter les changements de statut
    let statusChangeCount = 0;
    if (record.historique_statuts) {
      try {
        const history = JSON.parse(record.historique_statuts);
        statusChangeCount = history.historique ? history.historique.length : 0;
      } catch (e) {
        statusChangeCount = 0;
      }
    }
    
    const totalEvents = commentCount + statusChangeCount;
    if (totalEvents === 0) return '';
    
    return `<button class="btn-timeline" title="Voir la timeline (${totalEvents} événement${totalEvents > 1 ? 's' : ''})" data-task-id="${record.id}">
      <i class="bi bi-clock-history"></i> ${totalEvents}
    </button>`;
  }

  // Récupération des infos stratégie
  getStrategyInfo(strategieId) {
    if (!strategieId || !this.strategiesData) return null;
    
    return this.strategiesData.find(strategy => strategy.id === strategieId) || null;
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
    
    // CORRIGÉ: Peupler aussi les filtres
    populateSelect('filter-bureau', bureau || [], true, 'Tous les bureaux');
    populateSelect('filter-qui', responsables || [], true, 'Tous les responsables');
    populateSelect('filter-projet', projet || [], true, 'Tous les projets');
    populateSelect('filter-statut', this.gristOptions.statut || [], true, 'Tous les statuts');
    
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
    if (!this.kanbanContainer) {
      console.error("Conteneur Kanban principal manquant !");
      return;
    }
    
    console.log("Rafraîchissement Kanban (Génération HTML + Sortable)...");
    console.log("Nombre d'enregistrements disponibles:", this.currentRecords?.length || 0);
    
    // Filtrer les enregistrements
    const filteredRecords = this.filterRecords(this.currentRecords || []);
    console.log(`Refresh - ${filteredRecords.length} enregistrements après filtrage.`);
    
    if (filteredRecords.length > 0) {
      console.log("Exemple d'enregistrement:", filteredRecords[0]);
    }
    
    const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
    console.log("Statuts à afficher:", statutsToShow.map(s => s.id));
    
    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];
    
    // CORRIGÉ: Appliquer les classes du mode de vue
    let kanbanHTML = '';
    const modeClass = this.viewMode === VIEW_MODES.COMPACT ? 'kanban-compact' : 
                     this.viewMode === VIEW_MODES.DETAILED ? 'kanban-detailed' : 
                     'kanban-focus';
    
    this.kanbanContainer.className = `kanban-container ${modeClass}`;
    
    // Mode focus : afficher une seule colonne
    if (this.viewMode === VIEW_MODES.FOCUS && this.focusColumn) {
      const focusStatut = STATUTS.find(s => s.id === this.focusColumn);
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

        kanbanHTML = `
          <div class="kanban-board focus-board" data-status-id="${focusStatut.id}">
            <div class="kanban-board-header">
              <span>${focusStatut.libelle}</span>
              <span class="badge badge-secondary count-badge ml-2">${count}</span>
            </div>
            <div class="kanban-items-container" data-status-id="${focusStatut.id}">
              ${itemsHTML}
            </div>
          </div>
        `;
      }
    } else {
      // Mode normal : afficher toutes les colonnes
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
        const isHidden = (count === 0 && statut.id !== 'Terminé' && this.showTermine);
        const hiddenClass = isHidden ? ' board-hidden' : '';

        console.log(`Items HTML pour ${statut.id}: ${itemsHTML.length} caractères`);
        if (count > 0 && itemsHTML.length === 0) {
          console.error(`Problème: ${count} enregistrements mais 0 caractères HTML générés`);
        }

        kanbanHTML += `
          <div class="kanban-board${hiddenClass}" data-status-id="${statut.id}" data-board-class="${statut.classe}">
            <div class="kanban-board-header entete-${statut.classe}">
              <span>${statut.libelle}</span>
              <span class="badge badge-secondary count-badge ml-2">${count}</span>
            </div>
            <div class="kanban-items-container" data-status-id="${statut.id}">
              ${itemsHTML}
            </div>
          </div>
        `;
      });
    }

    console.log('HTML final à injecter:', kanbanHTML.length, 'caractères');
    this.kanbanContainer.innerHTML = kanbanHTML || '<div style="padding: 20px; color: grey;">Aucune tâche à afficher.</div>';
    
    console.log('Vérification après injection:', this.kanbanContainer.innerHTML.length, 'caractères');
    
    // Initialiser Sortable
    this.kanbanContainer.querySelectorAll('.kanban-items-container').forEach(container => {
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
    
    // Attacher les événements
    this.attachCardEventListeners();
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

  // EVENT LISTENERS
  attachCardEventListeners() {
    // Édition des tâches
    this.kanbanContainer.querySelectorAll('.editable-zone').forEach(zone => {
      zone.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const card = zone.closest('.kanban-item');
        const taskId = parseInt(card.dataset.id, 10);
        const task = this.currentRecords.find(r => r.id === taskId);
        
        if (task) this.openPopup(task);
      });
    });
    
    // Boutons timeline
    this.kanbanContainer.querySelectorAll('.btn-timeline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const taskId = parseInt(btn.dataset.taskId, 10);
        this.openTimelineModal(taskId);
      });
    });
  }

  // === GESTION DE LA MODAL TIMELINE ===
  openTimelineModal(taskId) {
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task) {
      displayError('Tâche non trouvée');
      return;
    }

    if (!this.historyModal) {
      displayError('Modal timeline non disponible');
      return;
    }

    // Mettre à jour le titre
    const modalTitle = document.getElementById('history-modal-label');
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique - Tâche #${taskId}: ${task.titre}
      `;
    }

    // Générer le contenu
    this.renderTimelineContent(task);
    
    // Ouvrir la modal
    this.historyModal.show();
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
    
    // Parser les commentaires depuis la description
    if (task.description) {
      const sections = task.description.split(/^---\s*$/gm);
      
      sections.forEach(section => {
        const lines = section.trim().split('\n');
        if (lines.length === 0) return;
        
        const timestampMatch = lines[0].match(/^\[(.+)\]$/);
        if (timestampMatch) {
          const content = lines.slice(1).join('\n').trim();
          if (content) {
            const comment = {
              type: 'comment',
              timestamp: timestampMatch[1],
              content: content,
              user: this.extractUserFromTimestamp(timestampMatch[1])
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
    
    // Bouton nouvelle tâche
    const btnNewTask = document.getElementById('btn-nouvelle-tache');
    if (btnNewTask) {
      btnNewTask.addEventListener('click', (e) => {
        console.log('🆕 Clic bouton nouvelle tâche');
        e.preventDefault();
        this.openPopup();
      });
      console.log('✅ Event listener bouton nouvelle tâche attaché');
    } else {
      console.error('❌ Bouton nouvelle tâche non trouvé !');
    }

    // Bouton sauvegarder
    const btnSave = document.getElementById('btn-save-task');
    if (btnSave) {
      btnSave.addEventListener('click', (e) => {
        console.log('💾 Clic bouton sauvegarder');
        e.preventDefault();
        this.saveTask();
      });
      console.log('✅ Event listener bouton sauvegarder attaché');
    } else {
      console.warn('⚠️ Bouton sauvegarder non trouvé');
    }

    // Bouton supprimer
    const btnDelete = document.getElementById('btn-delete-task');
    if (btnDelete) {
      btnDelete.addEventListener('click', (e) => {
        console.log('🗑️ Clic bouton supprimer');
        e.preventDefault();
        this.deleteTask();
      });
    }

    // Bouton export historique
    const btnExportHistory = document.getElementById('btn-export-history');
    if (btnExportHistory) {
      btnExportHistory.addEventListener('click', (e) => {
        console.log('📤 Clic bouton export historique');
        e.preventDefault();
        this.exportKanban();
      });
    }

   

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'n' || e.key === 'N') && !e.target.matches('input, textarea')) {
        console.log('⌨️ Raccourci N pour nouvelle tâche');
        e.preventDefault();
        this.openPopup();
      }
      if (e.key === 'r' || e.key === 'R') {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          this.refreshKanban();
        }
      }
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
    this.modalManager.populateTaskForm(tache, isNewTask);
    
    // Afficher/masquer le bouton supprimer
    toggleVisibility('btn-delete-task', !isNewTask, 'inline-block');
    
    // Ouvrir la modal
    try {
      console.log('🔓 Ouverture de la modal...');
      this.modal.show();
      
      // Focus sur le premier champ après ouverture
      setTimeout(() => {
        const firstField = document.getElementById('popup-titre');
        if (firstField) {
          firstField.focus();
        }
      }, 300);
      
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
      console.log("onRecords ignoré (verrou)");
      return;
    }
    if (this.ignoreNextOnRecords) {
      console.log("onRecords ignoré (flag)");
      this.ignoreNextOnRecords = false;
      return;
    }
    
    console.log("MAJ Grist (onRecords):", gristRecords ? 'Données' : 'Pas');
    this.isUpdating = true;
    
    console.log("Stratégie: Re-fetch");
    grist.docApi.fetchTable(TABLE_ID).then(fresh => {
      console.log("Données re-fetchées.");
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
    }, 500);
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

  // === MÉTHODES DE FILTRAGE ET TRI ===
  filterRecords(records) {
    const { bureau, qui, projet, statut } = this.filters;
    if (!bureau && !qui && !projet && !statut) {
      return records;
    }
    console.log("Application filtres:", this.filters);
    return records.filter(r => {
      const matchBureau = !bureau || this.nettoyerListe(r.bureau).includes(bureau);
      const matchQui = !qui || this.nettoyerListe(r.qui).includes(qui);
      const matchProjet = !projet || r.projet === projet;
      const matchStatut = !statut || r.statut === statut;
      return matchBureau && matchQui && matchProjet && matchStatut;
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
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initialisation Kanban avec gestionnaires...');
  window.kanbanManager = new KanbanManager();
});

// === EXPORT POUR UTILISATION EXTERNE ===
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
