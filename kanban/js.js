// === CODE KANBAN COMPLET ET ORDONNÉ ===
const STATUTS = [
  { id: 'Backlog', libelle: 'Backlog', classe: 'backlog' },
  { id: 'À faire', libelle: 'À faire', classe: 'a-faire' },
  { id: 'En cours', libelle: 'En cours', classe: 'en-cours' },
  { id: 'En attente', libelle: 'En attente', classe: 'en-attente' },
  { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque' },
  { id: 'Validation', libelle: 'Validation', classe: 'validation' },
  { id: 'Terminé', libelle: 'Terminé', classe: 'termine' }
];

const DEFAULT_BUREAUX = ['Exploit', 'Réseau', 'BDD', 'Chef SSIR'];
const DEFAULT_RESPONSABLES = ['Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo', 'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta'];
const DEFAULT_URGENCES = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
const DEFAULT_IMPACTS = ['Critique', 'Important', 'Modéré', 'Mineur'];
const DEFAULT_STATUTS = STATUTS.map(s => s.id);
const DEFAULT_PROJETS = [
  'accès distants', 'AD', 'SSI', 'caméras pièton', 'astre finances', 'correspondants', 'autre projet',
  'conformité systèmes', 'MCO', 'conformité RZO', 'firewall', 'Libriciel', 'intranet-extranet',
  'optimops', 'attestation assurances', 'horoquartz', 'administratif-budget'
];

const TABLE_ID = "Ssir_principale_task";

// Colonnes obligatoires
const REQUIRED_COLUMNS = [
  'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_objectif', 'strategie_sous_objectif', 'strategie_action', 'notes'
];

// Colonnes optionnelles pour les dates
const OPTIONAL_COLUMNS = ['date_debut', 'date_echeance'];

let projetsDynamiques = [];

function displayError(message) {
  console.error("ERREUR:", message);
  const el = document.getElementById('error-container');
  if (el) {
    const p = document.createElement('div');
    p.className = 'alert alert-danger m-3';
    p.textContent = `Erreur Kanban: ${message}`;
    el.innerHTML = '';
    el.appendChild(p);
  }
  const k = document.getElementById('kanban-container');
  if (k && k.innerHTML.includes('Chargement')) k.innerHTML = '';
}

class KanbanManager {
  constructor() {
    this.kanbanContainer = document.getElementById('kanban-container');
    this.currentRecords = [];
    this.modalElement = document.getElementById('popup-tache');
    this.modal = null;
    this.currentTaskId = null;
    this.isUpdating = false;
    this.canEdit = true;
    this.gristOptions = {};
    this.ignoreNextOnRecords = false;
    this.filters = { bureau: '', qui: '', projet: '', statut: '' };
    this.showTermine = true;
    this.sortableInstances = [];
    this.flatpickr = null;
    this.availableColumns = new Set();
    
    // Modes de vue
    this.viewMode = 'compact'; // 'compact', 'detailed', 'focus'
    this.focusColumn = null;
    this.expandedCards = new Set();
    
    this.init();
  }

  async init() {
    await this.waitForGristReady();
    await this.loadGristDataAndOptions();
    this.initFilters();
    this.initModalWithOptions();
    this.initFlatpickr();
    this.initViewModeControls();
    this.refreshKanban();
    this.initEventListeners();
  }

  async waitForGristReady() {
    return new Promise((resolve) => {
      grist.ready({ requiredAccess: 'full' });
      grist.onRecords(this.handleGristUpdate.bind(this));
      setTimeout(resolve, 50);
    });
  }

  async loadGristDataAndOptions() {
    try {
      const records = await grist.docApi.fetchTable(TABLE_ID);
      
      // Détecter les colonnes disponibles
      if (records && typeof records === 'object') {
        this.availableColumns = new Set(Object.keys(records));
        console.log('Colonnes disponibles:', Array.from(this.availableColumns));
      }
      
      this.currentRecords = this.mapGristRecords(records);
      this.gristOptions.statut = DEFAULT_STATUTS;
      this.gristOptions.urgence = DEFAULT_URGENCES;
      this.gristOptions.impact = DEFAULT_IMPACTS;
      
      const bureaux = this.getUniqueValuesFromData('bureau', true);
      this.gristOptions.bureau = [...new Set([...DEFAULT_BUREAUX, ...bureaux])].sort();
      
      const responsables = this.getUniqueValuesFromData('qui', true);
      this.gristOptions.qui = [...new Set([...DEFAULT_RESPONSABLES, ...responsables])].sort();
      
      const projets = this.getUniqueValuesFromData('projet');
      this.gristOptions.projet = [...new Set([...DEFAULT_PROJETS, ...projets, ...projetsDynamiques])].sort();
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.gristOptions.statut = DEFAULT_STATUTS;
      this.gristOptions.urgence = DEFAULT_URGENCES;
      this.gristOptions.impact = DEFAULT_IMPACTS;
      this.gristOptions.bureau = DEFAULT_BUREAUX;
      this.gristOptions.qui = DEFAULT_RESPONSABLES;
      this.gristOptions.projet = DEFAULT_PROJETS;
      if (!this.currentRecords) this.currentRecords = [];
    }
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

  mapGristRecords(gristData) {
    const records = [];
    if (!gristData || typeof gristData !== 'object') return [];
    
    const keys = Object.keys(gristData);
    if (!keys.includes('id') || !Array.isArray(gristData.id)) return [];
    
    const num = gristData.id.length;
    
    for (let i = 0; i < num; i++) {
      const rec = {};
      let ok = true;
      
      // Traitement des colonnes obligatoires
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
      
      // Traitement des colonnes optionnelles
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

  // === GESTION DES MODES DE VUE ===
  initViewModeControls() {
    const controlsContainer = document.querySelector('.kanban-controls .row');
    if (!controlsContainer) return;
    
    const viewModeHTML = `
      <div class="col-md-3">
        <div class="btn-group" role="group" aria-label="Mode de vue">
          <button type="button" class="btn btn-outline-primary btn-sm active" id="view-compact">
            <i class="bi bi-grid"></i> Compact
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm" id="view-detailed">
            <i class="bi bi-card-text"></i> Détaillé
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm" id="view-focus">
            <i class="bi bi-eye"></i> Focus
          </button>
        </div>
      </div>
    `;
    
    controlsContainer.insertAdjacentHTML('afterbegin', viewModeHTML);
    
    document.getElementById('view-compact')?.addEventListener('click', () => this.setViewMode('compact'));
    document.getElementById('view-detailed')?.addEventListener('click', () => this.setViewMode('detailed'));
    document.getElementById('view-focus')?.addEventListener('click', () => this.setViewMode('focus'));
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.expandedCards.clear();
    
    document.querySelectorAll('.btn-group button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${mode}`)?.classList.add('active');
    
    this.refreshKanban();
  }

  // === CRÉATION DES CARTES ===
  createTaskElementHTML(record) {
    const isExpanded = this.expandedCards.has(record.id);
    
    if (this.viewMode === 'compact' && !isExpanded) {
      return this.createCompactTaskHTML(record);
    } else {
      return this.createDetailedTaskHTML(record);
    }
  }

  createCompactTaskHTML(record) {
    const prio = this.calculerPriorite(record.urgence, record.impact);
    let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
    
    let echeanceElement = '';
    if (record.date_echeance) {
      const echeanceDate = new Date(record.date_echeance);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      echeanceDate.setHours(0, 0, 0, 0);
      
      const diffTime = echeanceDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let echeanceClass = 'echeance-ok';
      if (diffDays < 0) echeanceClass = 'echeance-depassee';
      else if (diffDays === 0) echeanceClass = 'echeance-aujourd-hui';
      else if (diffDays <= 3) echeanceClass = 'echeance-urgent';
      else if (diffDays <= 7) echeanceClass = 'echeance-bientot';
      
      const echeanceText = diffDays < 0 ? `J${diffDays}` : 
                          diffDays === 0 ? "Auj." : `J+${diffDays}`;
      
      echeanceElement = `<span class="date-echeance-compact ${echeanceClass}">
        <i class="bi bi-calendar-x"></i> ${echeanceText}
      </span>`;
    }
    
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    
    return `<div class="kanban-item kanban-item-compact ${hasEcheanceClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      <div class="compact-header">
        <div class="compact-priority">${prioBadge}</div>
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
    
    const prio = this.calculerPriorite(record.urgence, record.impact);
    let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
    
    let projetTag = '';
    if (record.projet) {
      const tooltip = [
        record.strategie_objectif ? `Objectif: ${record.strategie_objectif}` : '',
        record.strategie_sous_objectif ? `Sous-objectif: ${record.strategie_sous_objectif}` : '',
        record.strategie_action ? `Action: ${record.strategie_action}` : ''
      ].filter(Boolean).join('\n');
      projetTag = `<span class="badge bg-info text-dark" title="${tooltip.replace(/"/g, '&quot;')}">${record.projet}</span>`;
    }
    
    let resumeDesc = '';
    if (record.description) {
      const mots = record.description.split(/\s+/).slice(0, 10).join(' ');
      resumeDesc = `<div class="desc-resume">${mots}${record.description.split(/\s+/).length > 10 ? '…' : ''}</div>`;
    }
    
    let personnes = '';
    if (Array.isArray(record.qui) && record.qui.length > 1) {
      personnes = '<div class="personnes-list">' +
        record.qui.slice(1).map(q => `<span class="personne-badge">${q}</span>`).join(' ') +
        '</div>';
    }
    
    let datesElement = '';
    const hasDateDebut = record.date_debut;
    const hasDateEcheance = record.date_echeance;
      
    if (hasDateDebut || hasDateEcheance) {
      let dateInfo = [];
      
      if (hasDateDebut) {
        const debutFormatted = this.formatDate(record.date_debut);
        dateInfo.push(`<span class="date-debut" title="Début: ${debutFormatted}">
          <i class="bi bi-play-circle"></i> ${debutFormatted}
        </span>`);
      }
      
      if (hasDateEcheance) {
        const echeanceDate = new Date(record.date_echeance);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        echeanceDate.setHours(0, 0, 0, 0);
        
        const diffTime = echeanceDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let echeanceClass = 'echeance-ok';
        let echeanceText = '';
        
        if (diffDays < 0) {
          echeanceClass = 'echeance-depassee';
          echeanceText = `Dépassé (${Math.abs(diffDays)}j)`;
        } else if (diffDays === 0) {
          echeanceClass = 'echeance-aujourd-hui';
          echeanceText = "Aujourd'hui";
        } else if (diffDays <= 3) {
          echeanceClass = 'echeance-urgent';
          echeanceText = `${diffDays}j restant${diffDays > 1 ? 's' : ''}`;
        } else if (diffDays <= 7) {
          echeanceClass = 'echeance-bientot';
          echeanceText = `${diffDays}j restant${diffDays > 1 ? 's' : ''}`;
        } else {
          echeanceText = `J+${diffDays}`;
        }
        
        const echeanceFormatted = this.formatDate(record.date_echeance);
        dateInfo.push(`<span class="date-echeance ${echeanceClass}" title="Échéance: ${echeanceFormatted}">
          <i class="bi bi-calendar-x"></i> ${echeanceText}
        </span>`);
      }
      
      if (dateInfo.length > 0) {
        datesElement = `<div class="dates-container">${dateInfo.join('')}</div>`;
      }
    }
    
    const hasEcheanceClass = hasDateEcheance ? 'has-echeance' : '';
    const hasDateDebutClass = hasDateDebut ? 'has-debut' : '';
    const collapseButton = (this.viewMode === 'compact' && isExpanded) ? 
      `<button class="btn-collapse" title="Réduire"><i class="bi bi-chevron-up"></i></button>` : '';
    
    return `<div class="kanban-item kanban-item-detailed ${hasEcheanceClass} ${hasDateDebutClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      <div class="kanban-item-header">
        <div>${prioBadge}</div>
        <div class="item-badges">
          ${projetTag}
          ${collapseButton}
        </div>
      </div>
      <div class="item-title editable-zone">${record.titre || ''}</div>
      ${resumeDesc}
      ${datesElement}
      ${personnes}
    </div>`;
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const options = { weekday: 'short', day: 'numeric', month: 'short' };
      return new Date(dateStr).toLocaleDateString('fr-FR', options);
    } catch (e) {
      return dateStr;
    }
  }

  // === RENDU DU KANBAN ===
  refreshKanban() {
    if (!this.kanbanContainer) return;
    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];
    const filteredRecords = this.currentRecords || [];
    const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
    
    if (this.viewMode === 'focus') {
      this.renderFocusMode(statutsToShow, filteredRecords);
    } else {
      this.renderColumnMode(statutsToShow, filteredRecords);
    }
  }

  renderFocusMode(statutsToShow, filteredRecords) {
    if (!this.focusColumn) {
      this.focusColumn = statutsToShow[0]?.id || 'Backlog';
    }
    
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
    
    const activeStatus = statutsToShow.find(s => s.id === this.focusColumn);
    const boardRecords = filteredRecords.filter(r => r.statut === this.focusColumn);
    boardRecords.sort((a, b) => a.id - b.id);
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
    
    document.querySelectorAll('.focus-navigation button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.focusColumn = e.target.dataset.status;
        this.refreshKanban();
      });
    });
    
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
    
    this.attachCardEventListeners();
  }

  renderColumnMode(statutsToShow, filteredRecords) {
    const modeClass = this.viewMode === 'compact' ? 'kanban-compact' : 'kanban-detailed';
    this.kanbanContainer.className = `kanban-container ${modeClass}`;
    
    let kanbanHTML = '';
    statutsToShow.forEach(statut => {
      const boardId = statut.classe;
      const boardRecords = filteredRecords.filter(r => r.statut === statut.id);
      boardRecords.sort((a, b) => a.id - b.id);
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

    statutsToShow.forEach(statut => {
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

    this.attachCardEventListeners();
  }

  attachCardEventListeners() {
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

  // === SAUVEGARDE ET GESTION DES DONNÉES ===
  async saveTask() {
    try {
      let dateEcheance = '';
      let dateDebut = '';
      
      const delaiInput = document.getElementById('popup-delai');
      if (delaiInput && delaiInput.value.trim()) {
        dateEcheance = delaiInput.value.trim();
        
        if (!this.currentTaskId) {
          dateDebut = new Date().toISOString().slice(0,10);
        } else {
          const existingRecord = this.currentRecords.find(r => r.id === this.currentTaskId);
          dateDebut = existingRecord?.date_debut || '';
        }
      } else {
        dateEcheance = null;
        dateDebut = null;
      }
      
      const titre = document.getElementById('popup-titre').value;
      const description = document.getElementById('popup-description').value;
      const statut = document.getElementById('popup-statut-text').value;
      const projet = document.getElementById('popup-projet').value;
      const urgence = document.getElementById('popup-urgence').value;
      const impact = document.getElementById('popup-impact').value;
      const bureau = Array.from(document.getElementById('popup-bureau').selectedOptions).map(o => o.value);
      const qui = Array.from(document.getElementById('popup-qui').selectedOptions).map(o => o.value);
      
      const strategie_objectif = document.getElementById('strategie-objectif').value;
      const strategie_sous_objectif = document.getElementById('strategie-sous-objectif').value;
      const strategie_action = document.getElementById('strategie-action').value;
      
      const row = {
        titre, 
        description, 
        statut, 
        projet, 
        urgence, 
        impact,
        bureau: ['L', ...bureau],
        qui: ['L', ...qui],
        strategie_objectif,
        strategie_sous_objectif,
        strategie_action
      };

      if (this.availableColumns.has('date_debut')) {
        row.date_debut = dateDebut;
      }
      
      if (this.availableColumns.has('date_echeance')) {
        row.date_echeance = dateEcheance;
      }

      if (this.currentTaskId) {
        await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, this.currentTaskId, row]
        ]);
        console.log(`Tâche ${this.currentTaskId} mise à jour avec succès`);
        
        const recordIndex = this.currentRecords.findIndex(r => r.id === this.currentTaskId);
        if (recordIndex !== -1) {
          this.currentRecords[recordIndex] = { ...this.currentRecords[recordIndex], ...row };
          this.currentRecords[recordIndex].date_debut = dateDebut;
          this.currentRecords[recordIndex].date_echeance = dateEcheance;
        }
        
      } else {
        const result = await grist.docApi.applyUserActions([
          ['AddRecord', TABLE_ID, null, row]
        ]);
        console.log('Nouvelle tâche créée avec succès');
        
        if (result && result[0] && result[0].id) {
          const newRecord = { id: result[0].id, ...row };
          newRecord.date_debut = dateDebut;
          newRecord.date_echeance = dateEcheance;
          this.currentRecords.push(newRecord);
        }
      }
      
      this.modal.hide();
      this.refreshKanban();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes("KeyError 'date_debut'") || errorMessage.includes("KeyError 'date_echeance'")) {
        errorMessage = "Les colonnes de dates (date_debut/date_echeance) n'existent pas dans votre table Grist. Vous pouvez continuer à utiliser l'application, mais les dates ne seront pas sauvegardées.";
      }
      
      displayError(`Erreur lors de la sauvegarde: ${errorMessage}`);
    }
  }

  async handleDragEnd(evt, targetStatus) {
    if (!evt.item || !evt.item.dataset) return;
    
    const id = parseInt(evt.item.dataset.id, 10);
    if (isNaN(id)) return;
    
    const record = this.currentRecords.find(r => r.id === id);
    if (!record) return;
    
    const newStatus = evt.to.dataset.status;
    
    if (record.statut === newStatus) return;
    
    console.log(`Déplacement de la tâche ${id} vers ${newStatus}`);
    
    try {
      await grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, id, { statut: newStatus }]
      ]);
      
      console.log(`Tâche ${id} mise à jour avec succès`);
      
      const recordIndex = this.currentRecords.findIndex(r => r.id === id);
      if (recordIndex !== -1) {
        this.currentRecords[recordIndex].statut = newStatus;
      }
      
      this.refreshKanban();
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      displayError(`Erreur lors du déplacement de la tâche: ${error.message}`);
      this.refreshKanban();
    }
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

  async deleteTask(taskId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }
    
    try {
      await grist.docApi.applyUserActions([
        ['RemoveRecord', TABLE_ID, taskId]
      ]);
      
      console.log(`Tâche ${taskId} supprimée avec succès`);
      
      this.currentRecords = this.currentRecords.filter(r => r.id !== taskId);
      
      if (this.modal && this.currentTaskId === taskId) {
        this.modal.hide();
      }
      
      this.refreshKanban();
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      displayError(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  // === GESTION DES ÉVÉNEMENTS GRIST ===
  handleGristUpdate(gristRecords, mappings = null) {
    if (this.isUpdating) return;
    if (this.ignoreNextOnRecords) { 
      this.ignoreNextOnRecords = false; 
      return; 
    }
    
    console.log('Mise à jour Grist reçue, rechargement des données...');
    this.isUpdating = true;
    
    grist.docApi.fetchTable(TABLE_ID).then(fresh => {
      this.currentRecords = this.mapGristRecords(fresh);
      this.initFilters();
      this.refreshKanban();
      console.log('Données mises à jour avec succès');
    }).catch(error => {
      console.error('Erreur lors du rechargement des données:', error);
      displayError(`Erreur lors du rechargement: ${error.message}`);
    }).finally(() => { 
      this.isUpdating = false; 
    });
  }

  signalLocalUpdate() {
    this.ignoreNextOnRecords = true;
    setTimeout(() => { this.ignoreNextOnRecords = false; }, 500);
  }

  // === INITIALISATION DES COMPOSANTS ===
  initFilters() {
    this.populateSelectWithOptions('filter-bureau', this.gristOptions.bureau || []);
    this.populateSelectWithOptions('filter-qui', this.gristOptions.qui || []);
    this.populateSelectWithOptions('filter-projet', this.gristOptions.projet || []);
    this.populateSelectWithOptions('filter-statut', DEFAULT_STATUTS);
  }

  initModalWithOptions() {
    if (this.modalElement) {
      this.modal = new bootstrap.Modal(this.modalElement, { backdrop: 'static', keyboard: false });
      this.populateSelectWithOptions('popup-urgence', this.gristOptions.urgence || [], true);
      this.populateSelectWithOptions('popup-impact', this.gristOptions.impact || [], true);
      this.populateSelectWithOptions('popup-bureau', this.gristOptions.bureau || [], false);
      this.populateSelectWithOptions('popup-qui', this.gristOptions.qui || [], false);
      this.populateSelectWithOptions('popup-projet', this.gristOptions.projet || [], true);
      
      const btnAjoutProjet = document.getElementById('btn-ajout-projet');
      if (btnAjoutProjet) {
        btnAjoutProjet.onclick = () => {
          const champ = document.getElementById('projet-ajout');
          const val = champ.value.trim();
          if(val && !this.gristOptions.projet.includes(val) && !projetsDynamiques.includes(val)) {
            projetsDynamiques.push(val);
            this.populateSelectWithOptions('popup-projet', [...this.gristOptions.projet, ...projetsDynamiques], true);
            champ.value = '';
          }
        };
      }
    }
  }

  populateSelectWithOptions(selectId, options, addEmptyOption = true) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '';
    if (!Array.isArray(options)) return;
    if (addEmptyOption && !sel.multiple) {
      const opt = document.createElement('option');
      opt.value = "";
      opt.text = selectId.startsWith('filter-') ? "Tous" : "-- Choisir --";
      sel.appendChild(opt);
    }
    options.forEach(v => {
      if (v !== null && typeof v !== 'undefined') {
        const o = document.createElement('option');
        o.value = v;
        o.text = v;
        sel.appendChild(o);
      }
    });
  }

  getStratOptionsFromTasks() {
    const set = new Set();
    (this.currentRecords || []).forEach(rec => {
      const obj = rec.strategie_objectif || "";
      const sous = rec.strategie_sous_objectif || "";
      const act = rec.strategie_action || "";
      if (obj || sous || act) {
        set.add(JSON.stringify({objectif: obj, sous_objectif: sous, action: act}));
      }
    });
    return Array.from(set).map(s => JSON.parse(s));
  }

  populateStrategieLists(selected = {}) {
    const STRATEGIES = this.getStratOptionsFromTasks();

    const objectifs = [...new Set(STRATEGIES.map(s => s.objectif))].filter(Boolean).sort();
    const selObj = document.getElementById('strategie-objectif');
    if (!selObj) return;
    selObj.innerHTML = objectifs.map(obj => `<option value="${obj}">${obj}</option>`).join('');
    if (selected.objectif) selObj.value = selected.objectif;

    function updateSousObjectif() {
      const obj = selObj.value;
      const sousObj = [...new Set(STRATEGIES.filter(s => s.objectif === obj).map(s => s.sous_objectif))].filter(Boolean).sort();
      const selSous = document.getElementById('strategie-sous-objectif');
      selSous.innerHTML = sousObj.map(so => `<option value="${so}">${so}</option>`).join('');
      if (selected.sous_objectif) selSous.value = selected.sous_objectif;
      updateAction();
    }

    function updateAction() {
      const obj = selObj.value;
      const sousObj = document.getElementById('strategie-sous-objectif').value;
      const actions = [...new Set(STRATEGIES.filter(s => s.objectif === obj && s.sous_objectif === sousObj).map(s => s.action))].filter(Boolean).sort();
      const selAct = document.getElementById('strategie-action');
      selAct.innerHTML = actions.map(a => `<option value="${a}">${a}</option>`).join('');
      if (selected.action) selAct.value = selected.action;
    }

    selObj.onchange = updateSousObjectif;
    document.getElementById('strategie-sous-objectif').onchange = updateAction;

    updateSousObjectif();
  }

  openPopup(tache = {}) {
    if (!this.modal || !this.modalElement) return;
    const isNewTask = !tache.id;
    this.currentTaskId = tache.id || null;
    
    const btnDelete = document.getElementById('btn-delete-task');
    if (btnDelete) {
      btnDelete.style.display = isNewTask ? 'none' : 'inline-block';
    }
    
    const trySet = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ""; };
    trySet('popup-id', tache.id || '');
    trySet('popup-titre', tache.titre || '');
    trySet('popup-description', tache.description || '');
    trySet('popup-statut-text', tache.statut || (isNewTask ? (STATUTS[0]?.id || '') : ''));
    trySet('popup-projet', tache.projet || '');
    trySet('popup-urgence', tache.urgence || '');
    trySet('popup-impact', tache.impact || '');
    this.setSelectedOptions('popup-bureau', tache.bureau);
    this.setSelectedOptions('popup-qui', tache.qui);
    
    this.populateStrategieLists({
      objectif: tache.strategie_objectif,
      sous_objectif: tache.strategie_sous_objectif,
      action: tache.strategie_action
    });
    
    const delaiInput = document.getElementById('popup-delai');
    if (delaiInput && tache.date_echeance) {
      delaiInput.value = tache.date_echeance;
    }
    
    this.modal.show();
  }

  setSelectedOptions(selectId, valuesWithL) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const values = Array.isArray(valuesWithL) && valuesWithL[0] === 'L' ? valuesWithL.slice(1) : [];
    const lowerVals = values.map(v => String(v).trim().toLowerCase());
    Array.from(sel.options).forEach(o => {
      const vClean = String(o.value).trim().toLowerCase();
      o.selected = lowerVals.includes(vClean);
    });
  }

  initFlatpickr() {
    const delaiInput = document.getElementById('popup-delai');
    const delaiType = document.getElementById('delai-type');
    
    if (!delaiInput || !delaiType) return;
    
    this.flatpickr = flatpickr(delaiInput, {
      locale: 'fr',
      dateFormat: 'Y-m-d',
      allowInput: true,
      disableMobile: true,
      allowClear: true,
      placeholder: 'Cliquer pour choisir une date ou laisser vide'
    });
    
    delaiType.style.display = 'none';
    delaiInput.placeholder = 'Cliquer pour choisir une date ou laisser vide';
  }

  initEventListeners() {
    document.getElementById('btn-save-task').onclick = () => this.saveTask();
    document.getElementById('btn-nouvelle-tache').onclick = () => this.openPopup();
    
    const btnDelete = document.getElementById('btn-delete-task');
    if (btnDelete) {
      btnDelete.onclick = () => {
        if (this.currentTaskId) {
          this.deleteTask(this.currentTaskId);
        }
      };
    }
    
    const filterElements = ['filter-bureau', 'filter-qui', 'filter-projet', 'filter-statut'];
    filterElements.forEach(filterId => {
      const filterEl = document.getElementById(filterId);
      if (filterEl) {
        filterEl.addEventListener('change', () => this.applyFilters());
      }
    });
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
    
    const showTermineCheckbox = document.getElementById('show-termine');
    if (showTermineCheckbox) {
      showTermineCheckbox.addEventListener('change', (e) => {
        this.showTermine = e.target.checked;
        this.refreshKanban();
      });
    }
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' || e.key === 'N') {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          this.openPopup();
        }
      }
      if ((e.key === 'Delete' || e.key === 'Suppr') && this.currentTaskId) {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          this.deleteTask(this.currentTaskId);
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          const searchInput = document.getElementById('search-input');
          if (searchInput) searchInput.focus();
        }
      }
      if (e.key === '1' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.setViewMode('compact');
      }
      if (e.key === '2' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.setViewMode('detailed');
      }
      if (e.key === '3' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.setViewMode('focus');
      }
    });
  }

  applyFilters() {
    this.filters.bureau = document.getElementById('filter-bureau')?.value || '';
    this.filters.qui = document.getElementById('filter-qui')?.value || '';
    this.filters.projet = document.getElementById('filter-projet')?.value || '';
    this.filters.statut = document.getElementById('filter-statut')?.value || '';
    
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    
    let filteredRecords = this.currentRecords.filter(record => {
      if (this.filters.bureau && Array.isArray(record.bureau)) {
        const bureaux = record.bureau.slice(1);
        if (!bureaux.includes(this.filters.bureau)) return false;
      }
      
      if (this.filters.qui && Array.isArray(record.qui)) {
        const responsables = record.qui.slice(1);
        if (!responsables.includes(this.filters.qui)) return false;
      }
      
      if (this.filters.projet && record.projet !== this.filters.projet) return false;
      
      if (this.filters.statut && record.statut !== this.filters.statut) return false;
      
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
    
    const originalRecords = this.currentRecords;
    this.currentRecords = filteredRecords;
    
    this.refreshKanban();
    
    this.currentRecords = originalRecords;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new KanbanManager();
});
