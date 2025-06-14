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
const REQUIRED_COLUMNS = [
  'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_objectif', 'strategie_sous_objectif', 'strategie_action', 'notes', 'delai'
];
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
    this.init();
  }

  async init() {
    await this.waitForGristReady();
    await this.loadGristDataAndOptions();
    this.initFilters();
    this.initModalWithOptions();
    this.initFlatpickr && this.initFlatpickr();
    this.refreshKanban();
    this.initEventListeners && this.initEventListeners();
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
    const cols = REQUIRED_COLUMNS;
    for (let i = 0; i < num; i++) {
      const rec = {};
      let ok = true;
      for (const key of cols) {
        if (gristData.hasOwnProperty(key) && Array.isArray(gristData[key]) && gristData[key].length > i) {
          const v = gristData[key][i];
          if ((key === 'bureau' || key === 'qui') && Array.isArray(v) && v[0] === 'L') {
            rec[key] = v;
          } else if ((key === 'bureau' || key === 'qui') && (!Array.isArray(v) || v[0] !== 'L')) {
            rec[key] = ['L'];
          } else {
            rec[key] = v;
          }
        } else if (key === 'id') { ok = false; break; }
        else rec[key] = null;
      }
      if (ok) { rec.id = parseInt(rec.id, 10); if (!isNaN(rec.id)) records.push(rec); }
    }
    return records;
  }

  handleGristUpdate(gristRecords, mappings = null) {
    if (this.isUpdating) return;
    if (this.ignoreNextOnRecords) { this.ignoreNextOnRecords = false; return; }
    this.isUpdating = true;
    grist.docApi.fetchTable(TABLE_ID).then(fresh => {
      this.currentRecords = this.mapGristRecords(fresh);
      this.initFilters();
      this.refreshKanban();
    }).finally(() => { this.isUpdating = false; });
  }

  signalLocalUpdate() {
    this.ignoreNextOnRecords = true;
    setTimeout(() => { this.ignoreNextOnRecords = false; }, 500);
  }

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

  // --- STRATEGIE : Extraction et chaînage dynamique ---
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

    // Objectifs
    const objectifs = [...new Set(STRATEGIES.map(s => s.objectif))].filter(Boolean).sort();
    const selObj = document.getElementById('strategie-objectif');
    if (!selObj) return;
    selObj.innerHTML = objectifs.map(obj => `<option value="${obj}">${obj}</option>`).join('');
    if (selected.objectif) selObj.value = selected.objectif;

    // Sous-objectifs
    function updateSousObjectif() {
      const obj = selObj.value;
      const sousObj = [...new Set(STRATEGIES.filter(s => s.objectif === obj).map(s => s.sous_objectif))].filter(Boolean).sort();
      const selSous = document.getElementById('strategie-sous-objectif');
      selSous.innerHTML = sousObj.map(so => `<option value="${so}">${so}</option>`).join('');
      if (selected.sous_objectif) selSous.value = selected.sous_objectif;
      updateAction();
    }

    // Actions
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
    // Stratégie : chaînage dynamique
    this.populateStrategieLists({
      objectif: tache.strategie_objectif,
      sous_objectif: tache.strategie_sous_objectif,
      action: tache.strategie_action
    });
    const delaiInput = document.getElementById('popup-delai');
    if (delaiInput && tache.delai) delaiInput.value = tache.delai;
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

  refreshKanban() {
    if (!this.kanbanContainer) return;
    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];
    const filteredRecords = this.currentRecords || [];
    const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
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
          onEnd: evt => this.handleDragEnd(evt, statut.id)
        });
        this.sortableInstances.push(sortable);
      }
    });
    Array.from(this.kanbanContainer.querySelectorAll('.kanban-item .editable-zone')).forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = el.closest('.kanban-item');
        const id = parseInt(item.dataset.id, 10);
        const tache = this.currentRecords.find(r => r.id === id);
        if (tache) this.openPopup(tache);
      });
    });
  }

  handleDragEnd(evt, statut) {
    if (!evt.item) return;
    const id = parseInt(evt.item.dataset.id, 10);
    const record = this.currentRecords.find(r => r.id === id);
    if (!record) return;
    const newStatus = evt.to.dataset.status;
    if (record.statut !== newStatus) {
      if (!grist.docApi.updateRecords) {
        displayError("grist.docApi.updateRecords n'est pas disponible dans ce contexte.");
        return;
      }
      grist.docApi.updateRecords(TABLE_ID, [id], { statut: newStatus }).then(() => {
        this.signalLocalUpdate();
      });
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

  createTaskElementHTML(record) {
    // Priorité
    const prio = this.calculerPriorite(record.urgence, record.impact);
    let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
    // Projet avec infobulle stratégie
    let projetTag = '';
    if (record.projet) {
      const tooltip = [
        record.strategie_objectif ? `Objectif: ${record.strategie_objectif}` : '',
        record.strategie_sous_objectif ? `Sous-objectif: ${record.strategie_sous_objectif}` : '',
        record.strategie_action ? `Action: ${record.strategie_action}` : ''
      ].filter(Boolean).join('\n');
      projetTag = `<span class="badge bg-info text-dark" title="${tooltip.replace(/"/g, '&quot;')}">${record.projet}</span>`;
    }
    // Résumé description
    let resumeDesc = '';
    if (record.description) {
      const mots = record.description.split(/\s+/).slice(0, 10).join(' ');
      resumeDesc = `<div class="desc-resume">${mots}${record.description.split(/\s+/).length > 10 ? '…' : ''}</div>`;
    }
    // Personnes
    let personnes = '';
    if (Array.isArray(record.qui) && record.qui.length > 1) {
      personnes = '<div class="personnes-list">' +
        record.qui.slice(1).map(q => `<span class="personne-badge">${q}</span>`).join(' ') +
        '</div>';
    }
    // Icône délai
    let delaiIcon = '';
    if (record.delai) {
      delaiIcon = `<span class="delai-indicator" title="Date butoir : ${this.formatDelai(record.delai)}">
        <i class="bi bi-calendar-event"></i>
      </span>`;
    }
    return `<div class="kanban-item" data-id="${record.id}">
      <div class="kanban-item-header">
        <div>${prioBadge}</div>
        <div>
          ${projetTag}
          ${delaiIcon}
        </div>
      </div>
      <div class="item-title editable-zone">${record.titre || ''}</div>
      ${resumeDesc}
      ${personnes}
    </div>`;
  }

  formatDelai(dateStr) {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return new Date(dateStr).toLocaleDateString('fr-FR', options);
  }

  async saveTask() {
    const delaiType = document.getElementById('delai-type') ? document.getElementById('delai-type').value : 'date';
    let delaiValue = '';
    if (delaiType === 'date') {
      delaiValue = this.flatpickr && this.flatpickr.selectedDates[0] ? this.flatpickr.formatDate(this.flatpickr.selectedDates[0], "Y-m-d") : '';
    } else if (document.getElementById('popup-delai')) {
      const qte = parseInt(document.getElementById('popup-delai').value);
      if (!isNaN(qte) && qte > 0) {
        const today = new Date();
        if (delaiType === 'semaines') today.setDate(today.getDate() + qte * 7);
        else today.setMonth(today.getMonth() + qte);
        delaiValue = today.toISOString().slice(0,10);
      }
    }
    const titre = document.getElementById('popup-titre').value;
    const description = document.getElementById('popup-description').value;
    const statut = document.getElementById('popup-statut-text').value;
    const projet = document.getElementById('popup-projet').value;
    const urgence = document.getElementById('popup-urgence').value;
    const impact = document.getElementById('popup-impact').value;
    const bureau = Array.from(document.getElementById('popup-bureau').selectedOptions).map(o => o.value);
    const qui = Array.from(document.getElementById('popup-qui').selectedOptions).map(o => o.value);
    // Stratégie
    const strategie_objectif = document.getElementById('strategie-objectif').value;
    const strategie_sous_objectif = document.getElementById('strategie-sous-objectif').value;
    const strategie_action = document.getElementById('strategie-action').value;
    const row = {
      titre, description, statut, projet, urgence, impact,
      bureau: ['L', ...bureau],
      qui: ['L', ...qui],
      delai: delaiValue,
      strategie_objectif,
      strategie_sous_objectif,
      strategie_action
    };
    /* if (!grist.docApi.updateRecords || !grist.docApi.addRecords) {
      displayError("grist.docApi.updateRecords/addRecords n'est pas disponible dans ce contexte.");
      return;
    }
*/    if (this.currentTaskId) {
      await grist.docApi.updateRecords(TABLE_ID, [this.currentTaskId], row);
    } else {
      await grist.docApi.addRecords(TABLE_ID, [row]);
    }
    this.signalLocalUpdate();
    this.modal.hide();
    this.refreshKanban();
  }

  initEventListeners() {
    document.getElementById('btn-save-task').onclick = () => this.saveTask();
    document.getElementById('btn-nouvelle-tache').onclick = () => this.openPopup();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new KanbanManager();
});
