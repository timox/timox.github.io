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
  'projet', 'strategie_id', 'strategie_action', 'strategie_objectif', 'notes', 'delai'
];

let projetsDynamiques = [];
// --- Modification : Nom de la table Stratégies ---
const STRATEGIES_TABLE_ID = "Ssir_strategie2"; // Confirmé à partir de griststructure.txt
// --- Fin Modification ---


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
    this.initFlatpickr();
    this.refreshKanban();
    this.initEventListeners();
    this.loadStrategiesFromGrist();
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
      this.gristOptions.bureau = [...DEFAULT_BUREAUX];
      this.gristOptions.qui = [...DEFAULT_RESPONSABLES];
      this.gristOptions.projet = [...DEFAULT_PROJETS];
    } catch (error) {
      this.gristOptions.statut = DEFAULT_STATUTS;
      this.gristOptions.urgence = DEFAULT_URGENCES;
      this.gristOptions.impact = DEFAULT_IMPACTS;
      this.gristOptions.bureau = DEFAULT_BUREAUX;
      this.gristOptions.qui = DEFAULT_RESPONSABLES;
      this.gristOptions.projet = DEFAULT_PROJETS;
      if (!this.currentRecords) this.currentRecords = [];
    }
    // Stratégies dynamiques
            try {
                console.log(`Chargement table ${STRATEGIES_TABLE_ID}...`);
                const strategiesData = await grist.docApi.fetchTable(STRATEGIES_TABLE_ID);
                // --- Modification : Colonnes à extraire de Ssir_strategie2 ---
                const requiredStratCols = ['id', 'id2', 'objectif', 'sous_objectif', 'action']; // id est Row ID
                const displayCol = 'id2'; // Colonne à afficher dans le dropdown (confirmé id2)
                // --- Fin Modification ---

                if (strategiesData && requiredStratCols.every(col => strategiesData.hasOwnProperty(col))) {
                     this.gristOptions.strategies = strategiesData.id.map((id, index) => {
                         const stratRecord = {};
                         requiredStratCols.forEach(col => {
                             stratRecord[col] = strategiesData[col][index];
                         });
                         return stratRecord; // { id: ..., id2: ..., objectif: ..., sous_objectif: ..., action: ... }
                     }).sort((a, b) => String(a[displayCol] || '').localeCompare(String(b[displayCol] || ''))); // Trier par colonne d'affichage

                     console.log(`Options Stratégies (dynamique): ${this.gristOptions.strategies.length} valeurs chargées.`);
                } else {
                    console.warn(`La table ${STRATEGIES_TABLE_ID} ou des colonnes requises (${requiredStratCols.join(', ')}) sont manquantes/vides.`);
                    this.gristOptions.strategies = [];
                }
            } catch (stratError) {
                console.error(`Erreur chargement table ${STRATEGIES_TABLE_ID}:`, stratError);
                displayError(`Impossible de charger les stratégies.`);
                this.gristOptions.strategies = [];
            }
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
  };
  
 getPrioriteNum(prioriteStr) {
    // Ex: "Urgent (1)", "Élevé (2)", "Normal (3)", "Faible (4)"
    const match = /\((\d)\)/.exec(prioriteStr || "");
    return match ? parseInt(match[1], 10) : 3;
   }
  
getStrategieColor(strategieKey) {
  // 
  const PALETTE = [
    "#e3fcef", "#e3e6fc", "#fff3cd", "#fce3e3", "#f7d6e6", "#d1e7dd", "#e7eaf6", "#f9e79f", "#f6ddcc", "#d6eaf8"
  ];
  if (!strategieKey) return "#f7fafd";
  // Hash simple basé sur le texte
  let hash = 0;
  for (let i = 0; i < strategieKey.length; i++) {
    hash = strategieKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}

  
populateStrategieLists(selected = {}) {
  // Objectifs
  const objectifs = [...new Set(this.gristOptions.strategies.map(s => s.objectif))].filter(Boolean).sort();
  const selObj = document.getElementById('strategie-objectif');
  selObj.innerHTML = objectifs.map(obj => `<option value="${obj}">${obj}</option>`).join('');
  if (selected.objectif) selObj.value = selected.objectif;

  // Sous-objectifs
  function updateSousObjectif() {
    const obj = selObj.value;
    const sousObj = [...new Set(this.gristOptions.strategies.filter(s => s.objectif === obj).map(s => s.sous_objectif))].filter(Boolean).sort();
    const selSous = document.getElementById('strategie-sous-objectif');
    selSous.innerHTML = sousObj.map(so => `<option value="${so}">${so}</option>`).join('');
    if (selected.sous_objectif) selSous.value = selected.sous_objectif;
    updateAction();
  }

  // Actions
  function updateAction() { 
    const obj = selObj.value;
    const sousObj = document.getElementById('strategie-sous-objectif').value;
    const actions = [...new Set(this.gristOptions.strategies.filter(s => s.objectif === obj && s.sous_objectif === sousObj).map(s => s.action))].filter(Boolean).sort();
    const selAct = document.getElementById('strategie-action');
    selAct.innerHTML = actions.map(a => `<option value="${a}">${a}</option>`).join('');
    if (selected.action) selAct.value = selected.action;
  }

  selObj.onchange = updateSousObjectif;
  document.getElementById('strategie-sous-objectif').onchange = updateAction;

  updateSousObjectif();
}



  initFilters() {
    this.populateSelectWithOptions('filter-bureau', this.gristOptions.bureau || []);
    this.populateSelectWithOptions('filter-qui', this.gristOptions.qui || []);
    this.populateSelectWithOptions('filter-projet', this.gristOptions.projet || []);
    this.populateSelectWithOptions('filter-statut', DEFAULT_STATUTS);
    ['filter-bureau', 'filter-qui', 'filter-projet', 'filter-statut'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.onchange = () => {
        this.filters.bureau = document.getElementById('filter-bureau').value;
        this.filters.qui = document.getElementById('filter-qui').value;
        this.filters.projet = document.getElementById('filter-projet').value;
        this.filters.statut = document.getElementById('filter-statut').value;
        this.refreshKanban();
      };
    });
    const cb = document.getElementById('show-termine');
    if (cb) cb.onchange = () => { this.showTermine = cb.checked; this.refreshKanban(); };
  }

  filterRecords(records) {
    return records.filter(r => {
      if (this.filters.bureau && (!Array.isArray(r.bureau) || !r.bureau.includes(this.filters.bureau))) return false;
      if (this.filters.qui && (!Array.isArray(r.qui) || !r.qui.includes(this.filters.qui))) return false;
      if (this.filters.projet && r.projet !== this.filters.projet) return false;
      if (this.filters.statut && r.statut !== this.filters.statut) return false;
      return true;
    });
  }

  initModalWithOptions() {
    this.modalElement = document.getElementById('popup-tache');
    if (this.modalElement) {
      this.modal = new bootstrap.Modal(this.modalElement, { backdrop: 'static', keyboard: false });
      this.populateSelectWithOptions('popup-urgence', this.gristOptions.urgence || [], true);
      this.populateSelectWithOptions('popup-impact', this.gristOptions.impact || [], true);
      this.populateSelectWithOptions('popup-bureau', this.gristOptions.bureau || [], false);
      this.populateSelectWithOptions('popup-qui', this.gristOptions.qui || [], false);
      this.populateSelectWithOptions('popup-projet', this.gristOptions.projet || [], true);
      document.getElementById('btn-ajout-projet').onclick = () => {
        const champ = document.getElementById('projet-ajout');
        const val = champ.value.trim();
        if(val && !this.gristOptions.projet.includes(val)) {
          this.gristOptions.projet.push(val);
          this.populateSelectWithOptions('popup-projet', this.gristOptions.projet, true);
          champ.value = '';
        }
      };
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

  initFlatpickr() {
    this.flatpickr = flatpickr('#popup-delai', {
      altInput: true,
      altFormat: "j F Y",
      dateFormat: "Y-m-d",
      locale: 'fr',
      disableMobile: true
    });
    document.getElementById('delai-type').addEventListener('change', (e) => {
      if (e.target.value === 'date') {
        this.flatpickr.set('clickOpens', true);
        document.getElementById('popup-delai').placeholder = "Sélectionner une date";
      } else {
        this.flatpickr.set('clickOpens', false);
        document.getElementById('popup-delai').placeholder = `Nombre de ${e.target.value}`;
      }
    });
  }


  openPopup(tache = {}) {
    if (!this.modal || !this.modalElement) { displayError("Ouverture dialogue impossible."); return; }
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
    trySet('popup-strategie-id', tache.strategie_id || '');
    trySet('popup-strategie-action', tache.strategie_action || '');
    trySet('popup-strategie-objectif', tache.strategie_objectif || '');
    this.setSelectedOptions('popup-bureau', tache.bureau);
    this.setSelectedOptions('popup-qui', tache.qui);
    //strategies
    this.populateStrategieLists({
      objectif: tache.strategie_objectif,
      sous_objectif: tache.strategie_sous_objectif,
      action: tache.strategie_action
    });

    // Affichage équipes/personnes
    const eqDiv = document.getElementById('affectation-equipes');
    const persDiv = document.getElementById('affectation-personnes');
    if (eqDiv && persDiv) {
      eqDiv.innerHTML = (Array.isArray(tache.bureau) && tache.bureau.length > 1)
        ? tache.bureau.slice(1).map(b => `<span class="badge bg-secondary me-1">${b}</span>`).join(' ')
        : '<span class="text-muted">Aucune équipe</span>';
      persDiv.innerHTML = (Array.isArray(tache.qui) && tache.qui.length > 1)
        ? tache.qui.slice(1).map(q => `<span class="badge bg-primary me-1">${q}</span>`).join(' ')
        : '<span class="text-muted">Aucune personne</span>';
    }
    try { if (this.modal.show) this.modal.show(); else if ($?.fn?.modal) $(this.modalElement).modal('show'); else throw new Error("show modal absente."); } catch (e) { displayError("Affichage dialogue impossible."); }
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
    const filteredRecords = this.filterRecords(this.currentRecords || []);
    const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
    let kanbanHTML = '';
    statutsToShow.forEach(statut => {
      const boardId = statut.classe;
      const boardRecords = filteredRecords.filter(r => r.statut === statut.id);
      // Tri par priorité (1,2,3,4)
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

  // --- Priorité calculée selon ta règle ---
  calculerPriorite(u, i) {
    const imp = String(i || '').trim().toLowerCase();
    const urg = String(u || '').trim().toLowerCase();
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }
  getStrategieTooltip(record) {
    let tooltip = "";
    if (record.strategie_id) tooltip += `ID: ${record.strategie_id}\n`;
    if (record.strategie_action) tooltip += `Action: ${record.strategie_action}\n`;
    if (record.strategie_objectif) tooltip += `Objectif: ${record.strategie_objectif}`;
    return tooltip.trim();
  }
  formatDelai(dateStr) {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return new Date(dateStr).toLocaleDateString('fr-FR', options);
  }
  createTaskElementHTML(record) {
  // Priorité
 // const prio = this.calculerPriorite(record.urgence, record.impact);
 // let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
const prioNum = this.getPrioriteNum(record.priorite);
const prioBadge = `<span class="priority-badge priority-${prioNum}">P${prioNum}</span>`;
const strategieKey = record.strategie_objectif || record.strategie_action || record.strategie_sous_objectif || "";
const strategieColor = this.getStrategieColor(strategieKey);
const tooltip = this.getStrategieTooltip(record);
const projetTag = `<span class="projet-badge" 
  style="background:${strategieColor};"
  title="Objectif: ${record.strategie_objectif||""}\nAction: ${record.strategie_action||""}\nSous-objectif: ${record.strategie_sous_objectif||""}">
  ${record.projet||""}
</span>`;



  // Résumé description
  let resumeDesc = '';
  if (record.description) {
    const mots = record.description.split(/\s+/).slice(0, 10).join(' ');
    resumeDesc = `<div class="desc-resume">${mots}${record.description.split(/\s+/).length > 10 ? '…' : ''}</div>`;
  }

  // Personnes (qui)
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
    const strategie_id = document.getElementById('popup-strategie-id') ? document.getElementById('popup-strategie-id').value : '';
    const strategie_action = document.getElementById('popup-strategie-action') ? document.getElementById('popup-strategie-action').value : '';
    const strategie_objectif = document.getElementById('popup-strategie-objectif') ? document.getElementById('popup-strategie-objectif').value : '';
    const row = {
      titre, description, statut, projet, urgence, impact,
      bureau: ['L', ...bureau],
      qui: ['L', ...qui],
      delai: delaiValue,
      strategie_id, strategie_action, strategie_objectif
    };
    if (!grist.docApi.updateRecords || !grist.docApi.addRecords) {
      displayError("grist.docApi.updateRecords/addRecords n'est pas disponible dans ce contexte.");
      return;
    }
    if (this.currentTaskId) {
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
