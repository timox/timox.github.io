const STATUTS = [
    { id: 'Backlog', libelle: 'Backlog', classe: 'backlog' },
    { id: 'À faire', libelle: 'À faire', classe: 'a-faire' },
    { id: 'En cours', libelle: 'En cours', classe: 'en-cours' },
    { id: 'En attente', libelle: 'En attente', classe: 'en-attente' },
    { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque' },
    { id: 'Validation', libelle: 'Validation', classe: 'validation' },
    { id: 'Terminé', libelle: 'Terminé', classe: 'termine' }
];
// --- Listes Statiques/Défaut ---
const DEFAULT_BUREAUX = ['Exploit', 'Réseau', 'BDD', 'Chef SSIR'];
const DEFAULT_RESPONSABLES = ['Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo', 'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta'];
const DEFAULT_URGENCES = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
const DEFAULT_IMPACTS = ['Critique', 'Important', 'Modéré', 'Mineur'];
const DEFAULT_STATUTS = STATUTS.map(s => s.id);

const TABLE_ID = "Ssir_principale_task";
// --- Modification : Nom de la table Stratégies ---
const STRATEGIES_TABLE_ID = "Ssir_strategie2"; // Confirmé à partir de griststructure.txt
// --- Fin Modification ---

const REQUIRED_COLUMNS = [ 'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact','projet','strategie_id','strategie_action','strategie_objectif', 'strategie_sous_objectif', 'notes', 'date_echeance' ]; // Ajout strategie_sous_objectif


function displayError(message) { console.error("ERREUR:", message); const el = document.getElementById('error-container'); if (el) { const p = document.createElement('div'); p.className = 'alert alert-danger m-3'; p.textContent = `Erreur Kanban: ${message}`; el.innerHTML = ''; el.appendChild(p); } const k = document.getElementById('kanban-container'); if (k && k.innerHTML.includes('Chargement')) k.innerHTML = '<div class="p-3 text-muted error-message">Erreur chargement.</div>'; }

function formatGristDate(timestamp) {
    if (!timestamp || typeof timestamp !== 'number') { return ''; }
    try {
        const date = new Date(timestamp * 1000); if (isNaN(date.getTime())) { return ''; }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    } catch (e) { console.error("Erreur formatage date:", e); return ''; }
}
function parseDateToGristTimestamp(dateString) {
    const errorElement = document.getElementById('date-error'); if (errorElement) errorElement.style.display = 'none';
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') { return { timestamp: null, error: null }; }
    dateString = dateString.trim(); const regex = /^(\d{2})\/(\d{2})\/(\d{2})$/; const match = dateString.match(regex);
    if (match) {
        const day = parseInt(match[1], 10); const month = parseInt(match[2], 10) - 1; let year = parseInt(match[3], 10);
        year += (year < 70 ? 2000 : 1900); const dateObj = new Date(Date.UTC(year, month, day));
        if (dateObj.getUTCFullYear() === year && dateObj.getUTCMonth() === month && dateObj.getUTCDate() === day) {
            return { timestamp: dateObj.getTime() / 1000, error: null };
        } else { const errMsg = "Date invalide (ex: 31/02/24)."; if (errorElement) { errorElement.textContent = errMsg; errorElement.style.display = 'block'; } return { timestamp: null, error: errMsg }; }
    } else { const errMsg = "Format invalide. Utilisez JJ/MM/AA."; if (errorElement) { errorElement.textContent = errMsg; errorElement.style.display = 'block'; } return { timestamp: null, error: errMsg }; }
}


class KanbanManager {
    constructor() {
        this.kanbanContainer = document.getElementById('kanban-container');
        this.currentRecords = [];
        this.modalElement = null;
        this.modal = null;
        this.currentTaskId = null;
        this.isUpdating = false;
        this.canEdit = true;
        this.gristOptions = { statut: [], urgence: [], impact: [], bureau: [], qui: [], projet: [], strategies: [] }; // strategies stockera les objets complets
        this.ignoreNextOnRecords = false;
        this.filters = { bureau: '', qui: '', projet: '', statut: '' };
        this.showTermine = true;
        this.sortableInstances = [];
        console.log("KanbanManager (Sortable.js - Edition TOUJOURS activée).");
    }

       async init() {
        console.log("Init démarré.");
        try {
            await this.waitForGristReady();
            console.log("1: Grist prêt.");
            await this.loadGristDataAndOptions(); // Charge les tâches ET les stratégies/options
            console.log("2: Données & Options OK.");
            this.initFilters(); // Utilise les données chargées (projets dynamiques)
            console.log("2b: Filtres OK.");
            this.initModalWithOptions(); // Utilise les données chargées (projets et stratégies dynamiques)
            console.log("3: Modal OK.");
            this.refreshKanban();
            console.log("4: Kanban HTML généré & Sortable initialisé.");
            this.initEventListeners();
            console.log("5: Listeners OK.");
            console.log("Init succès.");
            grist.setOption("ready", true);
        } catch (error) {
            displayError(`Init: ${error.message}`);
            console.error("Trace:", error);
            try { grist.setOption("ready", true); } catch(e) {}
        }
    }

    async waitForGristReady() {
        return new Promise((resolve, reject) => { console.log("Attente grist.ready..."); try { grist.ready({ requiredAccess: 'full' }); grist.onRecords(this.handleGristUpdate.bind(this)); console.log("Listener onRecords attaché."); setTimeout(() => { console.log("grist.ready OK."); resolve(); }, 50); } catch (err) { console.error("Erreur grist.ready/listeners:", err); reject(err); } });
    }

    async loadGristDataAndOptions() {
        console.log("Chargement données Grist (Tâches et Options)...");
        try {
            // Charger les tâches principales
            const records = await grist.docApi.fetchTable(TABLE_ID);
            this.currentRecords = this.mapGristRecords(records);
            console.log("Données tâches mappées:", this.currentRecords.length, "enreg.");
            if (!this.currentRecords?.length) console.warn("Aucune donnée tâche Grist chargée.");

            // Options Statiques
            this.gristOptions.statut = DEFAULT_STATUTS;
            this.gristOptions.urgence = DEFAULT_URGENCES;
            this.gristOptions.impact = DEFAULT_IMPACTS;
            this.gristOptions.bureau = [...DEFAULT_BUREAUX].sort((a, b) => String(a).localeCompare(String(b)));
            this.gristOptions.qui = [...DEFAULT_RESPONSABLES].sort((a, b) => String(a).localeCompare(String(b)));

            // Projets dynamiques
            this.gristOptions.projet = this.getUniqueValuesFromData('projet', false);
            console.log(`Options Projets (dynamique): ${this.gristOptions.projet.length} valeurs.`);

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

            console.log("Options finales pour listes:", this.gristOptions);

        } catch (error) {
             console.error("Erreur majeure loadGristDataAndOptions:", error);
             this.gristOptions = { statut: DEFAULT_STATUTS, urgence: DEFAULT_URGENCES, impact: DEFAULT_IMPACTS, bureau: [], qui: [], projet: [], strategies: [] }; // Reset
             if (!this.currentRecords) this.currentRecords = [];
             displayError(`Erreur critique chargement données : ${error.message}`);
        }
    }

    getUniqueValuesFromData(key, isList = false) {
        const values = new Set();
        (this.currentRecords || []).forEach(rec => { const v = rec[key]; if (isList && Array.isArray(v)) { v.slice(1).forEach(i => i && values.add(String(i).trim())); } else if (!isList && v !== null && typeof v !== 'undefined' && String(v).trim() !== '') { values.add(String(v).trim()); } }); // Ajout condition non vide pour projet
        const sorted = Array.from(values).sort((a, b) => String(a).localeCompare(String(b)));
        // console.log(`Valeurs uniques pour ${key}:`, sorted); // Debug
        return sorted;
    }

    mapGristRecords(gristData) {
        console.log("Mappage enreg..."); const records = [];
        if (!gristData || typeof gristData !== 'object') return []; const keys = Object.keys(gristData); if (!keys.includes('id') || !Array.isArray(gristData.id)) return [];
        const num = gristData.id.length; const cols = REQUIRED_COLUMNS; for (let i = 0; i < num; i++) { const rec = {};
        let ok = true; for (const key of cols) { if (gristData.hasOwnProperty(key) && Array.isArray(gristData[key]) && gristData[key].length > i) { const v = gristData[key][i];
        if ((key==='bureau'||key==='qui') && Array.isArray(v) && v[0] === 'L') { rec[key]=v; }
        else if ((key==='bureau'||key==='qui') && (!Array.isArray(v) || v[0] !== 'L')) { rec[key]=['L']; }
        else if (key === 'date_echeance') { rec[key] = (typeof v === 'number') ? v : null; }
        // --- Modification: Assurer que strategie_id est un nombre ou null ---
        else if (key === 'strategie_id') { rec[key] = (typeof v === 'number') ? v : null; }
        // --- Fin modification ---
        else { rec[key]=v; } } else if (key==='id') { ok=false; break; } else rec[key]=null; } if(ok) { rec.id=parseInt(rec.id,10); if (!isNaN(rec.id)) records.push(rec); } } console.log(`Mappage OK: ${records.length} enreg.`); return records;
    }

    handleGristUpdate(gristRecords, mappings = null) {
        if (this.isUpdating) { console.log("onRecords ignoré (verrou)"); return; }
        if (this.ignoreNextOnRecords) { console.log("onRecords ignoré (flag)"); this.ignoreNextOnRecords = false; return; }
        console.log("MAJ Grist (onRecords):", gristRecords ? 'Données' : 'Pas'); this.isUpdating = true;
        console.log("Stratégie: Re-fetch"); grist.docApi.fetchTable(TABLE_ID).then(fresh => { console.log("Données re-fetchées."); this.currentRecords = this.mapGristRecords(fresh); this.initFilters(); this.refreshKanban(); }).catch(err => { console.error("Erreur re-fetch:", err); displayError("Erreur MAJ Grist."); }).finally(() => { this.isUpdating = false; console.log("Verrou MAJ levé."); });
    }

    signalLocalUpdate() { console.log("Flag ignoreNextOnRecords activé."); this.ignoreNextOnRecords = true; setTimeout(() => { if(this.ignoreNextOnRecords) console.log("Flag ignoreNextOnRecords désactivé (timeout)."); this.ignoreNextOnRecords = false; }, 500); }


    initModalWithOptions() {
        console.log("Init modal..."); this.modalElement = document.getElementById('popup-tache');
        if (this.modalElement) {
            try {
                 if (bootstrap?.Modal) { this.modal = new bootstrap.Modal(this.modalElement, { backdrop: 'static', keyboard: false }); } else if ($?.fn?.modal) { $(this.modalElement).modal({ show: false, backdrop: 'static', keyboard: false }); } else throw new Error("BS Modal absent.");
                 console.log("Peuplement selects modal...");
                 this.populateSelectWithOptions('popup-urgence', this.gristOptions.urgence || [], true);
                 this.populateSelectWithOptions('popup-impact', this.gristOptions.impact || [], true);
                 this.populateSelectWithOptions('popup-bureau', this.gristOptions.bureau || [], false);
                 this.populateSelectWithOptions('popup-qui', this.gristOptions.qui || [], false);
                 this.populateSelectWithOptions('popup-projet', this.gristOptions.projet || [], true);
                 // --- Modification : Peupler Stratégies (utilise maintenant les objets) ---
                 this.populateSelectWithOptions('popup-strategie', this.gristOptions.strategies || [], true, 'id2'); // Précise 'id2' comme displayCol
                 // --- Fin Modification ---
                 console.log("Selects modal OK.");
            } catch (e) { console.error("Erreur init Modal:", e); displayError("Init dialogue impossible."); this.modal = null; return; }
        } else { console.error("Elem modal absent."); displayError("Comp éd. absent."); }
    }

    // --- Modification : Gérer object list + displayCol optionnel ---
    populateSelectWithOptions(selectId, options, addEmptyOption = true, displayCol = null) {
        const sel = document.getElementById(selectId);
        if (!sel) { console.warn(`Select #${selectId} non trouvé.`); return; }
        sel.innerHTML = '';
        if (!Array.isArray(options)) { console.warn(`Options pour #${selectId} non valides.`); return; }

        if (addEmptyOption && !sel.multiple) {
            const opt = document.createElement('option'); opt.value = ""; opt.text = "-- Choisir --"; sel.appendChild(opt);
        }

        options.forEach(option => {
            const opt = document.createElement('option');
            if (typeof option === 'object' && option !== null && typeof option.id !== 'undefined') {
                // Cas : Objet { id: ..., etc. }
                opt.value = option.id; // Toujours Row ID comme valeur
                // Utiliser displayCol si fourni, sinon 'name', sinon 'id' comme texte
                opt.text = option[displayCol] || option['name'] || option['id2'] || `ID ${option.id}`; // Utilise id2 par défaut si displayCol non fourni pour stratégies
            } else if (option !== null && typeof option !== 'undefined') {
                // Cas : Simple chaîne
                const valStr = String(option); opt.value = valStr; opt.text = valStr;
            } else { return; } // Ignorer null/undefined
            sel.appendChild(opt);
        });
    }
    // --- Fin Modification ---

    openPopup(tache = {}) {
        if (!this.modal || !this.modalElement) { displayError("Ouverture dialogue impossible."); return; }
        const isNewTask = !tache.id; console.log("Ouverture popup ID:", tache.id, " (Nouvelle tâche:", isNewTask, ")");
        this.currentTaskId = tache.id || null;

        const errorElement = document.getElementById('date-error'); if (errorElement) errorElement.style.display = 'none';
        const trySet = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ""; };
        const trySetText = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ""; };

        trySet('popup-id', tache.id); trySet('popup-titre', tache.titre); trySet('popup-description', tache.description);
        trySetText('popup-statut-text', tache.statut || (isNewTask ? (STATUTS[0]?.id || '') : ''));
        trySet('popup-projet', tache.projet); trySet('popup-urgence', tache.urgence); trySet('popup-impact', tache.impact);
        trySet('popup-strategie', tache.strategie_id); // Select strategie_id (Row ID)

        const dateEcheanceTimestamp = tache.date_echeance; trySet('popup-date-echeance', formatGristDate(dateEcheanceTimestamp));
        this.setSelectedOptions('popup-bureau', tache.bureau); this.setSelectedOptions('popup-qui', tache.qui);

        // --- Modification : Mettre à jour les détails de la stratégie initiale ---
        this.updateStrategieDetails(tache.strategie_id);
        // --- Fin Modification ---

        try { if (this.modal && typeof this.modal.show === 'function') { this.modal.show(); } else if (typeof $ === 'function' && $?.fn?.modal) { $(this.modalElement).modal('show'); } else { throw new Error("Impossible d'afficher le modal."); } console.log("Modal affiché."); } catch (e) { console.error("Erreur affichage modal:", e); displayError("Affichage dialogue impossible."); }
    }

    // --- Modification : Nouvelle fonction pour afficher les détails de la stratégie ---
    updateStrategieDetails(strategyRowId) {
         const objectifEl = document.getElementById('popup-strategie-objectif');
         const sousObjectifEl = document.getElementById('popup-strategie-sous-objectif');
         const actionEl = document.getElementById('popup-strategie-action');

         if (!objectifEl || !sousObjectifEl || !actionEl) return; // Sécurité

         let detailsFound = false;
         if (strategyRowId && this.gristOptions.strategies) {
             const selectedStrategy = this.gristOptions.strategies.find(s => s.id === strategyRowId);
             if (selectedStrategy) {
                 objectifEl.textContent = selectedStrategy.objectif || "-";
                 sousObjectifEl.textContent = selectedStrategy.sous_objectif || "-";
                 actionEl.textContent = selectedStrategy.action || "-";
                 detailsFound = true;
             }
         }

         // Vider si aucune stratégie sélectionnée ou trouvée
         if (!detailsFound) {
             objectifEl.textContent = "";
             sousObjectifEl.textContent = "";
             actionEl.textContent = "";
         }
    }
    // --- Fin Modification ---
  setSelectedOptions(selectId, valuesWithL) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        const values = Array.isArray(valuesWithL) && valuesWithL[0] === 'L' ? valuesWithL.slice(1) : [];
        const lowerVals = values.map(v => String(v ?? '').trim().toLowerCase());
        Array.from(sel.options).forEach(o => { const vClean = String(o.value).trim().toLowerCase(); o.selected = lowerVals.includes(vClean); });
    }

    refreshKanban() {
        if (!this.kanbanContainer) { console.error("Conteneur Kanban principal manquant !"); return; }
        console.log("Rafraîchissement Kanban (Génération HTML + Sortable)...");
        const start = performance.now();
        this.sortableInstances.forEach(s => s.destroy());
        this.sortableInstances = [];

        try {
            const filteredRecords = this.filterRecords(this.currentRecords || []);
            console.log(`Refresh - ${filteredRecords.length} enregistrements après filtrage.`);
            const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
            let kanbanHTML = '';
            statutsToShow.forEach(statut => {
                const boardId = statut.classe;
                const boardRecords = filteredRecords.filter(r => r.statut === statut.id);
                boardRecords.sort((a, b) => { const prioA = this.calculerPriorite(a.urgence, a.impact); const prioB = this.calculerPriorite(b.urgence, b.impact); if (prioA !== prioB) return prioA - prioB; return (a.id || 0) - (b.id || 0); });

                const itemsHTML = boardRecords.map(record => this.createTaskElementHTML(record)).join('');
                const count = boardRecords.length;
                const isHidden = (count === 0 && statut.id !== 'Terminé' && this.showTermine);
                const hiddenClass = isHidden ? ' board-hidden' : '';

                kanbanHTML += `
                    <div class="kanban-board${hiddenClass}" data-status-id="${statut.id}" data-board-class="${statut.classe}">
                        <div class="kanban-board-header entete-${statut.classe}"> <span>${statut.libelle}</span> <span class="badge badge-secondary count-badge ml-2">${count}</span> </div>
                        <div class="kanban-items-container" data-status-id="${statut.id}"> ${itemsHTML} </div>
                    </div>
                `;
            });

            this.kanbanContainer.innerHTML = kanbanHTML || '<div style="padding: 20px; color: grey;">Aucune tâche à afficher.</div>';
            this.kanbanContainer.querySelectorAll('.kanban-items-container').forEach(container => {
                const sortableInstance = Sortable.create(container, {
                    group: 'kanban-tasks', animation: 150,
                    ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag', filter: '.ignore-drag', preventOnFilter: true,
                    onEnd: (evt) => { console.log("Sortable 'onEnd' event capturé."); this.handleSortableDrop(evt); }
                });
                this.sortableInstances.push(sortableInstance);
            });
            console.log("Sortable initialisé sur les colonnes.");
            this.updateTaskCountsAndVisibility(filteredRecords); // Gérer visibilité initiale
            // Ré-initialiser les tooltips après la génération du HTML (important!)
            $(() => { $('body').tooltip('dispose').tooltip({ selector: '[data-toggle="tooltip"]' }); });
            console.log(`Refresh (HTML + Sortable) OK en ${Math.round(performance.now() - start)}ms.`);
        } catch(error) {
            console.error("Erreur majeure refreshKanban (Sortable):", error); displayError(`Erreur refresh: ${error.message}`);
            this.kanbanContainer.innerHTML = '<div style="padding: 20px; color: red;">Erreur lors de la génération du Kanban.</div>';
        }
    }

    filterRecords(records) {
        const { bureau, qui, projet, statut } = this.filters;
        if (!bureau && !qui && !projet && !statut) { return records; } console.log("Application filtres:", this.filters);
        return records.filter(r => { const matchBureau = !bureau || this.nettoyerListe(r.bureau).includes(bureau); const matchQui = !qui || this.nettoyerListe(r.qui).includes(qui); const matchProjet = !projet || r.projet === projet; const matchStatut = !statut || r.statut === statut; return matchBureau && matchQui && matchProjet && matchStatut; });
    }

    updateTaskCountsAndVisibility(recordsToCount = null) {
        if (!this.kanbanContainer) return;
        const records = recordsToCount || this.filterRecords(this.currentRecords || []);
        const total = records.length;
        console.log(`UpdateTaskCounts: ${total} enreg. (après filtre).`);
        const statutsToCheck = STATUTS;

        statutsToCheck.forEach(s => {
            const board = this.kanbanContainer.querySelector(`.kanban-board[data-status-id="${s.id}"]`);
            if (board) {
                const count = records.filter(r => r?.statut === s.id).length;
                const badge = board.querySelector('.count-badge');
                if (badge) badge.textContent = count;

                const isEmptyAndShouldBeHidden = (count === 0 && s.id !== 'Terminé');
                const isTermineAndShouldBeHidden = (s.id === 'Terminé' && !this.showTermine);
                const shouldBeHidden = isTermineAndShouldBeHidden || (isEmptyAndShouldBeHidden && !(s.id === 'Terminé' && this.showTermine));
                const isHidden = board.classList.contains('board-hidden');

                if (shouldBeHidden && !isHidden) { console.log(`Masquage colonne: ${s.id}`); board.classList.add('board-hidden'); }
                else if (!shouldBeHidden && isHidden) { console.log(`Affichage colonne: ${s.id}`); board.classList.remove('board-hidden'); }
            }
        });
    }
    updateTaskCounts() { this.updateTaskCountsAndVisibility(); }

    nettoyerListe(v) {
        if (Array.isArray(v) && v[0] === 'L') { return v.slice(1).filter(i => i !== null && typeof i !== 'undefined').map(String); }
        if (Array.isArray(v)) { return v.filter(i => i !== null && typeof i !== 'undefined').map(String); }
        if (typeof v === 'string' && v.trim() !== '') { return v.split(',').map(s => s.trim()).filter(Boolean); } return [];
    }
    calculerPriorite(u, i) {
        const imp = String(i || '').trim().toLowerCase(); const urg = String(u || '').trim().toLowerCase();
        if (imp === 'critique') return 1; if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2; if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3; if (imp === 'mineur') return 4; return 3;
    }

    // --- Modification : Inclure l'indicateur de date d'échéance ---
    createTaskElementHTML(t) {
        if (!t?.id) return '';
        const p = this.calculerPriorite(t.urgence, t.impact);
        const pC = `priority-${p}`;
        const pL = `P${p}`; const pLC = `badge-priority-${p}`;
        const sO = t.strategie_objectif || 'N/A'; const sA = t.strategie_action || 'N/A';
        const sT = (t.strategie_id) ? `data-toggle="tooltip" data-placement="top" title="Objectif: ${sO} | Action: ${sA}"` : '';
        const qL = this.nettoyerListe(t.qui); const bL = this.nettoyerListe(t.bureau);
        const d = t.description ? `${t.description.substring(0, 80)}${t.description.length > 80 ? '...' : ''}` : '';
        const tit = t.titre || 'Sans titre';

        // --- Modification: Générer l'indicateur de date si elle existe ---
        let dueDateIndicatorHTML = '';
        if (t.date_echeance) {
            const formattedDate = formatGristDate(t.date_echeance);
            if (formattedDate) {
                 // Utiliser 'far fa-calendar-alt' pour une icône contour
                 // Utiliser 'fas fa-calendar-alt' pour une icône pleine
                dueDateIndicatorHTML = `
                    <span class="due-date-indicator" data-toggle="tooltip" data-placement="top" title="Échéance: ${formattedDate}">
                        <i class="fas fa-calendar-alt"></i>
                    </span>
                `;
            }
        }
        // --- Fin Modification ---


        // Retourne la chaîne HTML de l'élément, incluant l'indicateur de date
        return `
            <div class="kanban-item ${pC}" data-eid="${t.id}">
                <div class="kanban-item-content">
                    <div class="kanban-item-line1">
                        <span class="kanban-item-prio-cible">
                            <span class="badge badge-priority ${pLC}">${pL}</span>
                            ${t.strategie_id ? `<i class="fas fa-bullseye strategie-icon" ${sT}></i>` : ''}
                        </span>
                        <span class="ml-auto d-flex align-items-center"> ${t.projet ? `<span class="badge projet">${t.projet}</span>` : ''}
                            ${dueDateIndicatorHTML} </span>
                    </div>
                    <strong class="task-title">${tit}</strong>
                    <div class="kanban-item-badges">
                        ${bL.map(b => `<span class="badge bureau">${b}</span>`).join('')}
                        ${qL.map(q => `<span class="badge qui">${q}</span>`).join('')}
                    </div>
                    ${d ? `<div class="kanban-item-details mt-2 text-muted">${d}</div>` : ''}
                </div>
            </div>
        `;
    }
    // --- Fin Modification ---

    async handleSortableDrop(evt) {
        if (this.isUpdating) { return; }

        const itemEl = evt.item;
        const targetContainer = evt.to;
        const sourceContainer = evt.from;
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;

        const taskId = parseInt(itemEl.dataset.eid, 10);
        const newStat = targetContainer.dataset.statusId;
        const oldStat = sourceContainer.dataset.statusId;

        console.log(`Sortable Drop: Tâche ${taskId}, De: ${oldStat}, Vers: ${newStat}`);
         if (isNaN(taskId) || !newStat) {
             console.error("Drop Sortable : ID tâche ou nouveau statut invalide.");
             return;
         }

         if (newStat !== oldStat) {
             this.isUpdating = true; // Verrouiller

             const recordIndex = (this.currentRecords||[]).findIndex(r => r?.id === taskId);
             if (recordIndex > -1) {
                 this.currentRecords[recordIndex].statut = newStat;
             } else {
                 console.error(`Drop Sortable: Record ${taskId} non trouvé localement !`);
                 this.isUpdating = false;
                 this.refreshKanban(); // Annuler visuellement
                 return;
             }

             this.updateTaskCounts(); // Basé sur état local mis à jour
             this.signalLocalUpdate(); // Ignorer prochain onRecords

             console.log(`Action Grist (via Sortable): UpdateRecord ${taskId}, {statut: ${newStat}}`);
             try {
                 const actions = [['UpdateRecord', TABLE_ID, taskId, { statut: newStat }]];
                 await grist.docApi.applyUserActions(actions);
                 console.log(`Succès Grist (via Sortable) ${taskId}.`);
             } catch (error) {
                 console.error("--- Erreur Drop Grist (Sortable) ---", error);
                 displayError(`Erreur déplacement (Sortable) ${taskId}: ${error.details?.userError || error.message || '?'}`);
                 // Rollback local ET visuel
                 if (recordIndex > -1) {
                     this.currentRecords[recordIndex].statut = oldStat;
                 }
                 this.refreshKanban(); // Refresh complet
             } finally {
                 this.isUpdating = false; // Libérer
             }
         } else {
            console.log("Drop Sortable: Pas de changement de statut.");
             this.updateTaskCounts(); // Mettre à jour les compteurs même si pas de changement de statut
         }
    }
  

    async sauvegarderTache() {
        if (this.isUpdating) { console.warn("Sauvegarde ignorée (verrou)."); return; } console.log("Tentative sauvegarde..."); this.isUpdating = true; const btn = document.getElementById('popup-sauvegarder'); if(btn) btn.disabled = true;
        const data = {}; let originalRecord = null; const errorElement = document.getElementById('date-error'); if (errorElement) errorElement.style.display = 'none';

        try {
            const getIdV = (id) => document.getElementById(id)?.value.trim() || '';
            const getSelV = (id) => { const v = document.getElementById(id)?.value; return v === "" ? null : v; };
            const getMultiSelV = (id) => Array.from(document.getElementById(id)?.selectedOptions || []).map(o => o.value).filter(v => v);

            if(this.currentTaskId) { originalRecord = this.currentRecords.find(r => r.id === this.currentTaskId); }

            data.titre = getIdV('popup-titre'); data.description = getIdV('popup-description'); data.projet = getSelV('popup-projet'); data.urgence = getSelV('popup-urgence'); data.impact = getSelV('popup-impact');

            // Récupérer strategie_id (Row ID numérique ou null)
            const strategieIdStr = getSelV('popup-strategie'); data.strategie_id = strategieIdStr ? parseInt(strategieIdStr, 10) : null;
            if (strategieIdStr && isNaN(data.strategie_id)) { data.strategie_id = null; } // Sécurité

            const dateEcheanceString = getIdV('popup-date-echeance'); const { timestamp: dateEcheanceTimestamp, error: dateError } = parseDateToGristTimestamp(dateEcheanceString);
            if (dateError) { throw new Error(dateError); } data.date_echeance = dateEcheanceTimestamp;

            const bureauVals = getMultiSelV('popup-bureau'); const quiVals = getMultiSelV('popup-qui');
            data.bureau = bureauVals.length > 0 ? ['L', ...bureauVals] : null; data.qui = quiVals.length > 0 ? ['L', ...quiVals] : null;
            console.log("Données formatées pour envoi:", data);

            const finalData = {}; let actionType = ''; let requiresGristFetch = false;
            if (this.currentTaskId && originalRecord) { // Update
                actionType = 'UpdateRecord';
                for (const key in data) {
                    if (key === 'bureau' || key === 'qui') {
                         const origL = originalRecord[key] || null; const newL = data[key] || null; const stringify = (arr) => arr ? JSON.stringify(['L', ...arr.slice(1).sort()]) : 'null';
                         if (stringify(origL) !== stringify(newL)) { finalData[key] = newL; }
                    } else if (key === 'strategie_id' || key === 'date_echeance') { // Comparaison nombre/null
                         if (data[key] !== originalRecord[key]) { finalData[key] = data[key]; }
                    } else if (data[key] !== originalRecord[key]) { // Autres champs
                         finalData[key] = (data[key] === "" && (key === 'projet' || key === 'urgence' || key === 'impact')) ? null : data[key];
                    }
                }
                if (originalRecord.description && data.description === '') finalData.description = '';
                if (originalRecord.titre && !data.titre) throw new Error("Titre requis.");
                console.log("Données modifiées pour Update:", finalData);
                if (Object.keys(finalData).length === 0) { console.log("Aucun champ modifié."); this.isUpdating=false; if(btn) btn.disabled=false; if (this.modal?.hide) this.modal.hide(); return; }
                // Si strategie_id change, on force un fetch pour voir les lookups mis à jour (même si Grist le fait)
                if (finalData.hasOwnProperty('strategie_id')) { requiresGristFetch = true; console.log("Strategie ID modifiée, fetch demandé."); }

            } else { // Add
                actionType = 'AddRecord'; requiresGristFetch = true; Object.assign(finalData, data);
                if (!finalData.titre) throw new Error("Titre requis."); finalData.statut = STATUTS[0]?.id || 'Backlog';
                Object.keys(finalData).forEach(key => { if (finalData[key] === "") { if (key === 'projet' || key === 'urgence' || key === 'impact') { finalData[key] = null; } } });
                console.log("Data pour AddRecord:", finalData);
            }

            let actions; if (actionType === 'UpdateRecord') { actions = [[actionType, TABLE_ID, this.currentTaskId, finalData]]; } else { actions = [[actionType, TABLE_ID, null, finalData]]; }
            console.log(`Action Grist: ${actionType}`); console.log(">>> Dump JSON action envoyée:", JSON.stringify(actions));

            const result = await grist.docApi.applyUserActions(actions); console.log("Action Grist OK:", result); this.signalLocalUpdate();

            if (actionType === 'UpdateRecord' && this.currentTaskId && !requiresGristFetch) {
                 const index = this.currentRecords.findIndex(r => r.id === this.currentTaskId);
                 if (index > -1) { console.log("MAJ locale (sans fetch) ID:", this.currentTaskId); this.currentRecords[index] = { ...this.currentRecords[index], ...finalData }; }
                 else { console.warn("Record màj non trouvé localement."); requiresGristFetch = true; } // Force fetch si index non trouvé
                 this.refreshKanban(); // Refresh UI avec données locales
            }
            if (requiresGristFetch) { // Après Add ou si fetch forcé
                console.log("Fetch post-action nécessaire...");
                // Recharger TOUTES les données pour être sûr (tâches + options)
                await this.loadGristDataAndOptions();
                this.initFilters(); // MAJ filtres
                this.initModalWithOptions(); // MAJ selects modal
                this.refreshKanban(); // Refresh UI
            }
             if (this.modal?.hide) this.modal.hide(); else if ($?.fn?.modal) $(this.modalElement).modal('hide');

        } catch (error) { console.error("--- Erreur Sauvegarde ---", error); if (!error.message.includes("Date invalide") && !error.message.includes("Format invalide")) { displayError(`Erreur sauvegarde: ${error.message || 'Erreur inconnue'}`); } }
        finally { this.isUpdating = false; if(btn) btn.disabled = false; }
    }


    initEventListeners() {
        console.log("Init listeners globaux...");
        // Bouton Nouvelle Tâche
        const btnNewTask = document.getElementById('btn-new-task'); if (btnNewTask) { const newBtn = btnNewTask.cloneNode(true); btnNewTask.parentNode.replaceChild(newBtn, btnNewTask); newBtn.addEventListener('click', () => this.openPopup({})); newBtn.disabled = false; newBtn.style.display = ''; } else console.warn("Btn #btn-new-task absent.");
        // Bouton Sauvegarder Modal
        const btnSave = document.getElementById('popup-sauvegarder'); if (btnSave) { const newSaveBtn = btnSave.cloneNode(true); btnSave.parentNode.replaceChild(newSaveBtn, btnSave); newSaveBtn.addEventListener('click', () => this.sauvegarderTache()); newSaveBtn.disabled = false; } else console.warn("Btn #popup-sauvegarder absent.");
        // Menu Contextuel
        const container = document.getElementById('kanban-container'); if (container) { if (container.dataset.contextListenerAttached !== 'true') { container.dataset.contextListenerAttached = 'true'; container.addEventListener('contextmenu', (event) => { event.preventDefault(); const item = event.target.closest('.kanban-item'); if (!item?.dataset.eid) return; document.querySelectorAll('.custom-context-menu').forEach(m => m.remove()); const taskId = parseInt(item.dataset.eid, 10); const tache = (this.currentRecords || []).find(t => t?.id === taskId); if (!tache) return; this.createContextMenu(event.pageX, event.pageY, tache); }); } } else console.warn("Conteneur Kanban non trouvé.");
        // Filtres
        document.getElementById('filter-bureau')?.addEventListener('change', (e) => { this.filters.bureau = e.target.value; this.refreshKanban(); });
        document.getElementById('filter-qui')?.addEventListener('change', (e) => { this.filters.qui = e.target.value; this.refreshKanban(); });
        document.getElementById('filter-projet')?.addEventListener('change', (e) => { this.filters.projet = e.target.value; this.refreshKanban(); });
        document.getElementById('filter-statut')?.addEventListener('change', (e) => { this.filters.statut = e.target.value; this.refreshKanban(); });
        document.getElementById('toggle-termine')?.addEventListener('change', (e) => { this.showTermine = e.target.checked; this.refreshKanban(); });
        console.log("Listeners Filtres & Options attachés.");

        // --- Modification : Listener pour changement de Stratégie dans le modal ---
        const strategieSelect = document.getElementById('popup-strategie');
        if (strategieSelect) {
            strategieSelect.addEventListener('change', (e) => {
                const selectedStrategyId = e.target.value ? parseInt(e.target.value, 10) : null;
                if (!isNaN(selectedStrategyId) || selectedStrategyId === null) {
                     this.updateStrategieDetails(selectedStrategyId);
                }
            });
            console.log("Listener 'change' attaché à #popup-strategie.");
        } else {
             console.warn("Select #popup-strategie non trouvé pour attacher listener 'change'.");
        }
        // --- Fin Modification ---

        console.log("Listeners globaux OK.");
    }

        initFilters() {
        console.log("Init Filtres...");
        // Utilise maintenant getUniqueValuesFromData via this.gristOptions.projet qui est dynamique
        const pop=(id,vals, isObjectList = false)=>{ // Ajout paramètre pour gérer liste d'objets
            const s=document.getElementById(id); if(!s)return;
            const cur=s.value; // Sauver la valeur actuelle
            this.populateSelectWithOptions(id, vals || [], true); // Peupler avec les options (string ou objets)
            // Essayer de restaurer la valeur précédente si elle existe toujours
            if(Array.from(s.options).some(o=>o.value===cur)){ s.value=cur; } else { s.value=""; }
            // Mettre à jour l'état du filtre interne
            this.filters[id.replace('filter-','')]=s.value;
        };
        pop('filter-bureau',this.getUniqueValuesFromData('bureau',true));
        pop('filter-qui',this.getUniqueValuesFromData('qui',true));
        // --- Modification : Utiliser this.gristOptions.projet ---
        pop('filter-projet',this.gristOptions.projet); // Utilise la liste dynamique chargée
        // --- Fin Modification ---
        pop('filter-statut', STATUTS.map(s=>s.id)); // STATUTS est toujours statique
        const tgl=document.getElementById('toggle-termine');if(tgl)tgl.checked=this.showTermine;
        console.log("Filtres peuplés et états restaurés/initialisés:", this.filters);
    }

     createContextMenu(x, y, tache) {
         console.log("Création menu contextuel...");
         const menu = document.createElement('div'); menu.className = 'custom-context-menu'; menu.style.left = `${x}px`; menu.style.top = `${y}px`;
         const createButton = (text, action, className = '') => { const btn = document.createElement('button'); btn.textContent = text; if (className) btn.classList.add(className); btn.onclick = () => { action(); menu.remove(); }; btn.onmouseover = () => btn.style.backgroundColor = '#f0f0f0'; const reset = () => { btn.style.backgroundColor = 'white'; if (className === 'delete-option') btn.style.color = '#dc3545'; }; btn.onmouseout = reset; if (className === 'delete-option') { btn.style.color = '#dc3545'; btn.onmouseover = () => { btn.style.backgroundColor = '#dc3545'; btn.style.color = 'white'; }; } menu.appendChild(btn); };
         createButton('🔧 Modifier', () => this.openPopup(tache)); createButton('❌ Supprimer', () => this.supprimerTache(tache.id), 'delete-option');
         document.body.appendChild(menu); console.log("Menu contextuel ajouté au body.");
         const closeMenu = (ev) => { if (!menu.contains(ev.target)) { console.log("Fermeture menu contextuel."); menu.remove(); document.removeEventListener('click', closeMenu); } }; setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
 
     async supprimerTache(id) {
         if (this.isUpdating) return; if (!confirm(`Confirmer suppression tâche ID ${id} ?`)) return; this.isUpdating = true; console.log("Suppression ID:", id); try { await grist.docApi.applyUserActions([['RemoveRecord', TABLE_ID, id]]); console.log("Suppression Grist OK:", id);
            this.signalLocalUpdate();
            const index = this.currentRecords.findIndex(r => r.id === id); if (index > -1) { console.log("Suppression locale ID:", id); this.currentRecords.splice(index, 1); }
            console.log("Refresh post-suppr..."); this.refreshKanban();
            } catch (error) { console.error("--- Erreur Suppr ---", error); displayError(`Erreur suppression ${id}: ${error.details?.userError || error.message || '?'}`); } finally { this.isUpdating = false; }
    }


} // Fin classe

document.addEventListener('DOMContentLoaded', () => { console.log("DOM chargé. Init KanbanManager..."); const kMan = new KanbanManager(); kMan.init().catch(err => { console.error("Erreur init globale:", err); displayError(`Erreur critique: ${err.message}`); }); window.kanbanManager = kMan; });



