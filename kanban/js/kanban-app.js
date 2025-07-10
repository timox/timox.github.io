// === js/kanban-app.js ===
// Point d'entrée principal de l'application Kanban (version modulaire)

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
  addEventListenerSafe
} from './utils/dom.js';

// === VARIABLES GLOBALES ===
let projetsDynamiques = [];

// === CLASSE KANBANMANAGER REFACTORISÉE ===
class KanbanManager {
  constructor() {
    // Propriétés principales
    this.kanbanContainer = document.getElementById('kanban-container');
    this.currentRecords = [];
    this.modalElement = document.getElementById('popup-tache');
    this.modal = null;
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
    
    // Managers spécialisés (seront initialisés plus tard)
    this.datePickerManager = null;
    
    this.init();
  }

  // === INITIALISATION ===
  async init() {
    try {
      toggleLoadingSpinner(true);
      
      await this.waitForGristReady();
      await this.loadGristDataAndOptions();
      await this.initializeUser();
      
      this.initFilters();
      this.initModalWithOptions();
      this.initFlatpickr();
      this.initViewModeControls();
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

  // === CRÉATION DES CARTES ===
  createTaskElementHTML(record) {
    const isExpanded = this.expandedCards.has(record.id);
    
    if (this.viewMode === VIEW_MODES.COMPACT && !isExpanded) {
      return this.createCompactTaskHTML(record);
    } else {
      return this.createDetailedTaskHTML(record);
    }
  }

  createCompactTaskHTML(record) {
    const priority = this.calculerPriorite(record.urgence, record.impact);
    const badges = generateAllTaskBadges({
      ...record,
      priority: priority
    }, true);
    
    const echeanceElement = generateDatesContainer({
      date_echeance: record.date_echeance
    }, true);
    
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    
    return `<div class="kanban-item kanban-item-compact ${hasEcheanceClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      ${badges.bureaux}
      <div class="compact-header">
        <div class="compact-priority">${badges.priority}</div>
        <div class="compact-echeance">${echeanceElement}</div>
        <button class="btn-expand" title="Voir détails">
          <i class="bi bi-chevron-down"></i>
        </button>
      </div>
      <div class="compact-title editable-zone">${record.titre || ''}</div>
    </div>`;
  }

  createDetailedTaskHTML(record) {
    const isExpanded = this.expandedCards.has(record.id);
    const priority = this.calculerPriorite(record.urgence, record.impact);
    
    const badges = generateAllTaskBadges({
      ...record,
      priority: priority
    }, false);
    
    // Résumé de description
    let resumeDesc = '';
    if (record.description) {
      const latestDesc = this.getLatestDescription(record.description);
      const mots = latestDesc.split(/\s+/).slice(0, 10).join(' ');
      resumeDesc = `<div class="desc-resume">${mots}${latestDesc.split(/\s+/).length > 10 ? '…' : ''}</div>`;
    }
    
    // Dates
    const datesElement = generateDatesContainer({
      date_debut: record.date_debut,
      date_echeance: record.date_echeance
    }, false);
    
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    const hasDateDebutClass = record.date_debut ? 'has-debut' : '';
    
    const collapseButton = (this.viewMode === VIEW_MODES.COMPACT && isExpanded) ? 
      `<button class="btn-collapse" title="Réduire"><i class="bi bi-chevron-up"></i></button>` : '';
    
    return `<div class="kanban-item kanban-item-detailed ${hasEcheanceClass} ${hasDateDebutClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      ${badges.bureaux}
      <div class="kanban-item-header">
        <div>${badges.priority}</div>
        <div class="item-badges">
          ${badges.project}
          ${badges.history}
          ${collapseButton}
        </div>
      </div>
      <div class="item-title editable-zone">${record.titre || ''}</div>
      ${resumeDesc}
      ${datesElement}
      ${badges.responsables}
    </div>`;
  }

  // === RENDU DU KANBAN ===
  refreshKanban() {
    if (!this.kanbanContainer) return;
    
    // Nettoyer les instances Sortable existantes
    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];
    
    const filteredRecords = this.applyFiltersToRecords();
    const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
    
    if (this.viewMode === VIEW_MODES.FOCUS) {
      this.renderFocusMode(statutsToShow, filteredRecords);
    } else {
      this.renderColumnMode(statutsToShow, filteredRecords);
    }
  }

  applyFiltersToRecords() {
    const searchTerm = getFieldValue('search-input').toLowerCase() || '';
    
    return this.currentRecords.filter(record => {
      // Filtre bureau
      if (this.filters.bureau && Array.isArray(record.bureau)) {
        const bureaux = record.bureau.slice(1);
        if (!bureaux.includes(this.filters.bureau)) return false;
      }
      
      // Filtre responsable
      if (this.filters.qui && Array.isArray(record.qui)) {
        const responsables = record.qui.slice(1);
        if (!responsables.includes(this.filters.qui)) return false;
      }
      
      // Filtre projet
      if (this.filters.projet && record.projet !== this.filters.projet) return false;
      
      // Filtre statut
      if (this.filters.statut && record.statut !== this.filters.statut) return false;
      
      // Recherche textuelle
      if (searchTerm) {
        const searchableText = [
          record.titre || '',
          record.description || '',
          record.projet || '',
          record.strategie_objectif || '',
          record.strategie_sous_objectif || '',
          record.strategie_action || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      return true;
    });
  }

  renderColumnMode(statutsToShow, filteredRecords) {
    const modeClass = this.viewMode === VIEW_MODES.COMPACT ? 'kanban-compact' : 'kanban-detailed';
    this.kanbanContainer.className = `kanban-container ${modeClass}`;
    
    let kanbanHTML = '';
    
    statutsToShow.forEach(statut => {
      const boardId = statut.classe;
      const boardRecords = filteredRecords.filter(r => r.statut === statut.id);
      
      // Tri par priorité puis par ID
      boardRecords.sort((a, b) => {
        const prioA = this.calculerPriorite(a.urgence, a.impact);
        const prioB = this.calculerPriorite(b.urgence, b.impact);
        if (prioA !== prioB) return prioA - prioB;
        return a.id - b.id;
      });
      
      const itemsHTML = boardRecords.map(record => this.createTaskElementHTML(record)).join('');
      const count = boardRecords.length;
      const isHidden = (count === 0 && statut.id !== 'Terminé' && this.showTermine);
      const hiddenClass = isHidden ? ' board-hidden' : '';
      
      kanbanHTML += `
        <div id="board-${boardId}" class="kanban-board board-${boardId}${hiddenClass}">
          <div class="kanban-board-header">
            <span class="board-title">${statut.libelle}</span>
            <span class="board-count">${count}</span>
          </div>
          <div class="kanban-board-body" id="items-${boardId}" data-status="${statut.id}">
            ${itemsHTML}
          </div>
        </div>
      `;
    });
    
    this.kanbanContainer.innerHTML = kanbanHTML;
    this.initializeSortable(statutsToShow);
    this.attachCardEventListeners();
  }

  renderFocusMode(statutsToShow, filteredRecords) {
    if (!this.focusColumn) {
      this.focusColumn = statutsToShow[0]?.id || 'Backlog';
    }
    
    // Navigation
    const navHTML = `
      <div class="focus-navigation">
        ${statutsToShow.map(statut => {
          const count = filteredRecords.filter(r => r.statut === statut.id).length;
          const activeClass = this.focusColumn === statut.id ? 'active' : '';
          return `<button class="btn btn-outline-secondary ${activeClass}" data-status="${statut.id}">
            ${statut.libelle} <span class="badge bg-secondary">${count}</span>
          </button>`;
        }).join('')}
      </div>
    `;
    
    // Colonne active
    const activeStatus = statutsToShow.find(s => s.id === this.focusColumn);
    const boardRecords = filteredRecords.filter(r => r.statut === this.focusColumn);
    
    boardRecords.sort((a, b) => {
      const prioA = this.calculerPriorite(a.urgence, a.impact);
      const prioB = this.calculerPriorite(b.urgence, b.impact);
      if (prioA !== prioB) return prioA - prioB;
      return a.id - b.id;
    });
    
    const itemsHTML = boardRecords.map(record => this.createTaskElementHTML(record)).join('');
    
    const columnHTML = `
      <div class="focus-column">
        <div class="kanban-board-header">
          <span class="board-title">${activeStatus?.libelle || ''}</span>
          <span class="board-count">${boardRecords.length}</span>
        </div>
        <div class="kanban-board-body" id="items-focus" data-status="${this.focusColumn}">
          ${itemsHTML}
        </div>
      </div>
    `;
    
    this.kanbanContainer.innerHTML = navHTML + columnHTML;
    
    // Event listeners pour la navigation
    document.querySelectorAll('.focus-navigation button').forEach(btn => {
      addEventListenerSafe(btn.id || `focus-btn-${Date.now()}`, 'click', (e) => {
        this.focusColumn = e.target.dataset.status;
        this.refreshKanban();
      });
    });
    
    this.initializeSortable([{ classe: 'focus' }]);
    this.attachCardEventListeners();
  }

  initializeSortable(statuts) {
    if (this.viewMode === VIEW_MODES.FOCUS) {
      const el = document.getElementById('items-focus');
      if (el) {
        const sortable = new Sortable(el, {
          group: 'kanban-focus',
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          onEnd: evt => this.handleDragEnd(evt, this.focusColumn)
        });
        this.sortableInstances.push(sortable);
      }
    } else {
      statuts.forEach(statut => {
        const boardId = statut.classe;
        const el = document.getElementById(`items-${boardId}`);
        if (el) {
          const sortable = new Sortable(el, {
            group: 'kanban',
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: evt => this.handleDragEnd(evt, statut.id)
          });
          this.sortableInstances.push(sortable);
        }
      });
    }
  }

  attachCardEventListeners() {
    // Event listeners pour les cartes
    Array.from(this.kanbanContainer.querySelectorAll('.kanban-item .editable-zone')).forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const item = el.closest('.kanban-item');
        const id = parseInt(item.dataset.id, 10);
        const tache = this.currentRecords.find(r => r.id === id);
        if (tache) this.openPopup(tache);
      });
    });
    
    // Boutons expand/collapse
    Array.from(this.kanbanContainer.querySelectorAll('.btn-expand')).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const item = btn.closest('.kanban-item');
        const id = parseInt(item.dataset.id, 10);
        this.expandedCards.add(id);
        this.refreshKanban();
      });
    });
    
    Array.from(this.kanbanContainer.querySelectorAll('.btn-collapse')).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const item = btn.closest('.kanban-item');
        const id = parseInt(item.dataset.id, 10);
        this.expandedCards.delete(id);
        this.refreshKanban();
      });
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
    if (!this.modal || !this.modalElement) return;
    
    const isNewTask = !tache.id;
    this.currentTaskId = tache.id || null;
    
    // Afficher/cacher le bouton supprimer
    toggleVisibility('btn-delete-task', !isNewTask, 'inline-block');
    
    // Remplir les champs
    setFieldValue('popup-id', tache.id || '');
    setFieldValue('popup-titre', tache.titre || '');
    
    const latestDescription = this.getLatestDescription(tache.description || '');
    setFieldValue('popup-description', latestDescription);
    
    setFieldValue('popup-statut-text', tache.statut || (isNewTask ? (STATUTS[0]?.id || '') : ''));
    setFieldValue('popup-projet', tache.projet || '');
    setFieldValue('popup-urgence', tache.urgence || '');
    setFieldValue('popup-impact', tache.impact || '');
    
    setSelectedOptions('popup-bureau', tache.bureau);
    setSelectedOptions('popup-qui', tache.qui);
    
    this.populateStrategieLists({
      objectif: tache.strategie_objectif,
      sous_objectif: tache.strategie_sous_objectif,
      action: tache.strategie_action
    });
    
    // Gérer les dates avec le DatePickerManager
    if (this.datePickerManager) {
      const normalizedDate = normalizeDate(tache.date_echeance);
      this.datePickerManager.setDate(normalizedDate);
    }
    
    this.modal.show();
  }

  // === INITIALISATION DES FILTRES ===
  initFilters() {
    populateSelect('filter-bureau', this.gristOptions.bureau || []);
    populateSelect('filter-qui', this.gristOptions.responsables || []);
    populateSelect('filter-projet', this.gristOptions.projet || []);
    populateSelect('filter-statut', getDefaultStatuts());
  }

  // === INITIALISATION DES MODALS ===
  initModalWithOptions() {
    if (this.modalElement) {
      this.modal = new bootstrap.Modal(this.modalElement, { 
        backdrop: 'static', 
        keyboard: false 
      });
      
      populateSelect('popup-urgence', this.gristOptions.urgence || [], true);
      populateSelect('popup-impact', this.gristOptions.impact || [], true);
      populateSelect('popup-bureau', this.gristOptions.bureau || [], false);
      populateSelect('popup-qui', this.gristOptions.responsables || [], false);
      populateSelect('popup-projet', this.gristOptions.projet || [], true);
    }
  }

  // === PLACEHOLDER POUR LES MÉTHODES MANQUANTES ===
  initFlatpickr() {
    // TODO: Initialiser le DatePickerManager
    console.log('DatePickerManager à implémenter');
  }

  initViewModeControls() {
    // TODO: Initialiser les contrôles de mode de vue
    console.log('Contrôles de vue à implémenter');
  }

  populateStrategieLists(selected = {}) {
    // TODO: Implémenter la gestion de la stratégie
    console.log('Gestion stratégie à implémenter');
  }

  initEventListeners() {
    // TODO: Initialiser tous les event listeners
    console.log('Event listeners à implémenter');
  }

  handleGristUpdate(gristRecords, mappings = null) {
    // TODO: Gérer les mises à jour Grist
    console.log('Gestion mises à jour Grist à implémenter');
  }
}

// === INITIALISATION DE L'APPLICATION ===
document.addEventListener('DOMContentLoaded', () => {
  window.kanbanManager = new KanbanManager();
});

// === EXPORT POUR UTILISATION EXTERNE ===
window.KanbanApp = {
  KanbanManager,
  // Utilitaires exposés
  displayError,
  displaySuccess,
  normalizeDate,
  formatDate,
  generateBureauBadges
};