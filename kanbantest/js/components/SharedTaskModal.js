/**
 * SharedTaskModal - Composant modale de tâche réutilisable
 *
 * Peut être utilisé par n'importe quelle vue (kanban, taches, missions, etc.)
 *
 * Usage:
 *   const modal = new SharedTaskModal({
 *     onSave: async (task) => { ... },
 *     onDelete: async (taskId) => { ... },
 *     showLinks: true,      // Afficher la section liaisons
 *     showTimes: true,      // Afficher la section temps
 *     gristManager: grist   // Instance optionnelle du Grist manager
 *   });
 *
 *   await modal.init();
 *   modal.open(task);       // Ouvrir pour éditer
 *   modal.openNew();        // Ouvrir pour créer
 */
class SharedTaskModal {
  constructor(options = {}) {
    this.options = {
      onSave: options.onSave || null,
      onDelete: options.onDelete || null,
      showLinks: options.showLinks ?? false,
      showTimes: options.showTimes ?? true,
      showJalons: options.showJalons ?? true,
      showHistory: options.showHistory ?? true,
      gristManager: options.gristManager || null,
      containerId: options.containerId || 'shared-modal-container'
    };

    this.modal = null;
    this.bsModal = null;
    this.currentTask = null;
    this.isLoaded = false;
    this.datePicker = null;

    // Données de référence - SYNCHRONISÉ AVEC constants.js
    this.programmes = [];
    this.strategies = [];
    this.meos = [];

    // Liste des agents - Source fiable (synchronisée avec DEFAULT_RESPONSABLES de constants.js)
    this.defaultAgents = [
      'Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo',
      'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta', 'Yvon',
      'Clarisse', 'Hervé', 'Didier'
    ];
    this.agents = this.defaultAgents.map(nom => ({ id: nom, nom: nom, bureau: '', fullName: nom }));

    // Bureaux - Source fiable (synchronisée avec DEFAULT_BUREAUX de constants.js)
    this.bureaux = ['Réseaux', 'BDD', 'Exploit', 'Nexsis-RRF', 'Chef SSIR', 'Chef GSSI', 'Chef SIG'];
    this.jalons = [];
    this.selectedStrategies = [];
    this.taskLinks = [];
    this.allTasks = []; // Pour le sélecteur de liens
  }

  /**
   * Initialise le composant en chargeant le HTML
   */
  async init() {
    if (this.isLoaded) return;

    // Créer le container si nécessaire
    let container = document.getElementById(this.options.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.options.containerId;
      document.body.appendChild(container);
    }

    // Charger le HTML du composant
    try {
      const response = await fetch('components/task-modal.html');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      container.innerHTML = html;

      this.modal = document.getElementById('shared-task-modal');
      if (!this.modal) {
        throw new Error('Modal element not found in loaded HTML');
      }

      this.bsModal = new bootstrap.Modal(this.modal, {
        backdrop: 'static',
        keyboard: true,
        focus: true
      });

      // Fix: Forcer le focus sur le champ titre après l'ouverture de la modale
      // et réinitialiser le date picker si nécessaire
      this.modal.addEventListener('shown.bs.modal', () => {
        const titreInput = document.getElementById('stm-titre');
        if (titreInput) {
          setTimeout(() => {
            titreInput.focus();
            titreInput.select();
          }, 100);
        }

        // Réinitialiser le date picker si flatpickr est maintenant disponible
        if (!this.datePicker && (window.flatpickr || typeof flatpickr !== 'undefined')) {
          this.initDatePicker();
        }
      });

      this.setupEventListeners();
      this.configureVisibility();
      await this.loadReferenceData();
      this.isLoaded = true;

      console.log('[SharedTaskModal] Initialized successfully');
    } catch (error) {
      console.error('[SharedTaskModal] Init error:', error);
      // Fallback: créer une modale minimale
      this.createFallbackModal(container);
    }
  }

  /**
   * Crée une modale minimale en cas d'échec de chargement
   */
  createFallbackModal(container) {
    container.innerHTML = `
      <div class="modal fade" id="shared-task-modal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title"><i class="bi bi-card-checklist me-2"></i>Éditer Tâche</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="stm-task-id">
              <div class="mb-3">
                <label class="form-label">Titre</label>
                <input type="text" class="form-control" id="stm-titre">
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="stm-description" rows="3"></textarea>
              </div>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Statut</label>
                  <select class="form-select" id="stm-statut">
                    <option value="Backlog">Backlog</option>
                    <option value="À faire">À faire</option>
                    <option value="En cours">En cours</option>
                    <option value="Terminé">Terminé</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Responsable</label>
                  <input type="text" class="form-control" id="stm-responsable">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
              <button type="button" class="btn btn-primary" id="stm-btn-save">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modal = document.getElementById('shared-task-modal');
    this.bsModal = new bootstrap.Modal(this.modal);
    this.setupEventListeners();
    this.isLoaded = true;
  }

  /**
   * Configure la visibilité des sections optionnelles
   */
  configureVisibility() {
    const tempsSection = document.getElementById('stm-temps-section');
    const liensSection = document.getElementById('stm-liens-section');

    if (tempsSection) {
      tempsSection.style.display = this.options.showTimes ? 'block' : 'none';
    }
    if (liensSection) {
      liensSection.style.display = this.options.showLinks ? 'block' : 'none';
    }
  }

  /**
   * Charge les données de référence (programmes, agents, stratégies)
   */
  async loadReferenceData() {
    // Peupler les checkboxes de bureaux (statique)
    this.populateBureauCheckboxes();

    if (typeof grist === 'undefined') {
      console.warn('[SharedTaskModal] Grist not available, skipping reference data');
      return;
    }

    try {
      // Charger les programmes
      await this.loadProgrammes();

      // Charger les agents
      await this.loadAgents();

      // Peupler les checkboxes responsables après chargement agents
      this.populateQuiCheckboxes();

      // Charger les stratégies
      await this.loadStrategies();

      // Charger les MEO (après les stratégies)
      await this.loadMeos();

      // Initialiser le strategy browser
      this.initStrategyBrowser();

      // Initialiser le date picker
      this.initDatePicker();

      // Charger les tâches pour les liens
      await this.loadAllTasks();

      console.log('[SharedTaskModal] Reference data loaded');
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load some reference data:', error);
    }
  }

  /**
   * Charge les programmes depuis Grist
   */
  async loadProgrammes() {
    try {
      const data = await grist.docApi.fetchTable('Ssir_programmes');
      this.programmes = [];
      const count = data.id?.length || 0;

      for (let i = 0; i < count; i++) {
        this.programmes.push({
          id: data.id[i],
          code: data.code?.[i] || '',
          nom: data.nom?.[i] || ''
        });
      }

      this.populateProgrammeSelect();
    } catch (error) {
      console.warn('[SharedTaskModal] No programmes table:', error.message);
    }
  }

  /**
   * Charge les agents - Utilise la liste par défaut (constants.js)
   * ConfigManager/localStorage peuvent enrichir les données mais pas les remplacer
   */
  async loadAgents() {
    // Utiliser la liste par défaut définie dans le constructeur (synchronisée avec constants.js)
    // Ne PAS écraser avec ConfigManager/localStorage qui peut contenir des données incorrectes
    console.log('[SharedTaskModal] Using default agents list:', this.agents.length, 'agents');

    // Trier par nom
    this.agents.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));

    this.populateAgentSelect();
  }

  /**
   * Charge les stratégies depuis Grist
   */
  async loadStrategies() {
    try {
      const data = await grist.docApi.fetchTable('Ssir_strategie2');
      this.strategies = [];
      // Utiliser id2 car c'est le seul champ id disponible dans cette table
      const count = data.id2?.length || 0;

      for (let i = 0; i < count; i++) {
        this.strategies.push({
          id: data.id2[i],
          objectif: data.objectif?.[i] || '',
          sous_objectif: data.sous_objectif?.[i] || '',
          axe_strategique: data.axe_strategique?.[i] || ''
        });
      }

      this.populateStrategySelect();
    } catch (error) {
      console.warn('[SharedTaskModal] No strategies table:', error.message);
    }
  }

  /**
   * Charge les MEO depuis les tâches (agrégées)
   */
  async loadMeos() {
    try {
      // Charger toutes les tâches pour extraire les MEO
      const data = await grist.docApi.fetchTable('Ssir_principale_task');
      const meoMap = new Map();

      const count = data.id?.length || 0;
      for (let i = 0; i < count; i++) {
        const meoCode = data.mise_en_oeuvre_code?.[i];
        const strategieId = data.strategie_id?.[i];

        if (meoCode && strategieId && !meoMap.has(meoCode)) {
          meoMap.set(meoCode, {
            code: meoCode,
            nom: data.mise_en_oeuvre_nom?.[i] || 'Sans nom',
            categorie: data.categorie?.[i] || 'Projet',
            strategie_id: strategieId
          });
        }
      }

      this.meos = Array.from(meoMap.values());

      // Enrichir avec les infos de stratégie
      console.log('[SharedTaskModal] Enriching MEOs with strategy info...');
      console.log('[SharedTaskModal] Available strategies:', this.strategies.slice(0, 3));

      this.meos.forEach(meo => {
        // Essayer de matcher par ID (peut être string ou number)
        const strat = this.strategies.find(s =>
          s.id === meo.strategie_id ||
          String(s.id) === String(meo.strategie_id)
        );

        if (strat) {
          meo.mission = strat.axe_strategique || '';
          meo.strategie = strat.sous_objectif || '';
          meo.programme = strat.objectif || '';
          console.log('[SharedTaskModal] MEO enriched:', meo.code, '→', {
            mission: meo.mission,
            strategie: meo.strategie,
            programme: meo.programme
          });
        } else {
          console.warn('[SharedTaskModal] No strategy found for MEO:', meo.code, 'strategie_id:', meo.strategie_id);
        }
      });

      // Trier par programme > mission > code
      this.meos.sort((a, b) => {
        if (a.programme !== b.programme) return (a.programme || '').localeCompare(b.programme || '');
        if (a.mission !== b.mission) return (a.mission || '').localeCompare(b.mission || '');
        return (a.code || '').localeCompare(b.code || '');
      });

      this.populateMeoSelect();
      console.log('[SharedTaskModal] Loaded', this.meos.length, 'MEOs');
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load MEOs:', error.message);
      this.meos = [];
    }
  }

  /**
   * Peuple le sélecteur de MEO
   */
  populateMeoSelect() {
    const select = document.getElementById('stm-meo');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner une mise en œuvre --</option>';

    // Grouper par Mission
    const missionGroups = {};
    this.meos.forEach(meo => {
      const missionKey = meo.mission || '(Sans mission)';
      if (!missionGroups[missionKey]) {
        missionGroups[missionKey] = [];
      }
      missionGroups[missionKey].push(meo);
    });

    // Créer les optgroups
    for (const [mission, meoList] of Object.entries(missionGroups)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = mission;

      for (const meo of meoList) {
        const option = document.createElement('option');
        option.value = meo.code;
        option.textContent = `${meo.code} - ${meo.nom}`;
        option.dataset.strategieId = meo.strategie_id;
        option.dataset.meoNom = meo.nom;
        option.dataset.mission = meo.mission || '';
        option.dataset.strategie = meo.strategie || '';
        option.dataset.programme = meo.programme || '';
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }

    // Listener pour remplir la hiérarchie automatiquement
    select.addEventListener('change', () => this.handleMeoChange());
  }

  /**
   * Gère le changement de MEO sélectionnée
   */
  handleMeoChange() {
    const select = document.getElementById('stm-meo');
    const infoDiv = document.getElementById('stm-hierarchy-info');

    if (!select || !infoDiv) return;

    const selectedOption = select.options[select.selectedIndex];

    console.log('[SharedTaskModal] MEO changed:', {
      value: selectedOption?.value,
      dataset: selectedOption?.dataset,
      meoNom: selectedOption?.dataset?.meoNom,
      programme: selectedOption?.dataset?.programme,
      strategie: selectedOption?.dataset?.strategie,
      mission: selectedOption?.dataset?.mission
    });

    if (selectedOption && selectedOption.value) {
      // Remplir les champs cachés
      this.setFieldValue('stm-meo-code', selectedOption.value);
      this.setFieldValue('stm-meo-nom', selectedOption.dataset.meoNom || '');
      this.setFieldValue('stm-strategie', selectedOption.dataset.strategieId || '');

      // Synchroniser avec le navigateur de stratégies
      const strategieId = selectedOption.dataset.strategieId;
      if (strategieId) {
        this.setSelectedStrategies([parseInt(strategieId, 10)]);
      } else {
        this.setSelectedStrategies([]);
      }

      // Afficher les infos déduites
      const progDisplay = document.getElementById('stm-programme-display');
      const stratDisplay = document.getElementById('stm-strategie-display');
      const missDisplay = document.getElementById('stm-mission-display');

      if (progDisplay) progDisplay.textContent = selectedOption.dataset.programme || '-';
      if (stratDisplay) stratDisplay.textContent = selectedOption.dataset.strategie || '-';
      if (missDisplay) missDisplay.textContent = selectedOption.dataset.mission || '-';

      infoDiv.style.display = 'block';
    } else {
      // Vider les champs
      this.setFieldValue('stm-meo-code', '');
      this.setFieldValue('stm-meo-nom', '');
      this.setFieldValue('stm-strategie', '');
      this.setSelectedStrategies([]);
      infoDiv.style.display = 'none';
    }
  }

  /**
   * Peuple le sélecteur de programmes
   */
  populateProgrammeSelect() {
    const select = document.getElementById('stm-programme');
    if (!select) return;

    select.innerHTML = '<option value="">-- Aucun programme --</option>';
    for (const prog of this.programmes) {
      const option = document.createElement('option');
      option.value = prog.id;
      option.textContent = `${prog.code} - ${prog.nom}`;
      select.appendChild(option);
    }
  }

  /**
   * Peuple le sélecteur d'agents (responsables)
   */
  populateAgentSelect() {
    const select = document.getElementById('stm-responsable');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner --</option>';

    // Grouper par bureau
    const bureaux = [...new Set(this.agents.map(a => a.bureau))];

    for (const bureau of bureaux) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = bureau || 'Sans bureau';

      const agentsBureau = this.agents.filter(a => a.bureau === bureau);
      for (const agent of agentsBureau) {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = agent.fullName;
        option.dataset.bureau = agent.bureau;
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }
  }

  /**
   * Peuple les boutons de bureaux (toggle buttons)
   */
  populateBureauCheckboxes() {
    const container = document.getElementById('stm-bureau-checkboxes');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'toggle-button-group';

    this.bureaux.forEach(bureau => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle-btn toggle-btn-bureau';
      btn.dataset.value = bureau;
      btn.innerHTML = `<i class="bi bi-building me-1"></i>${bureau}`;

      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        this.updateAffectationSummary();
      });

      container.appendChild(btn);
    });
  }

  /**
   * Peuple les boutons de responsables (toggle buttons) - liste simple sans groupement
   */
  populateQuiCheckboxes() {
    const container = document.getElementById('stm-qui-checkboxes');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'toggle-button-group';

    // Trier les agents par nom
    const sortedAgents = [...this.agents].sort((a, b) =>
      (a.nom || '').localeCompare(b.nom || '')
    );

    // Afficher tous les agents sans groupement
    sortedAgents.forEach(agent => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle-btn toggle-btn-person';
      btn.dataset.value = agent.nom;
      btn.innerHTML = `<i class="bi bi-person me-1"></i>${agent.nom}`;

      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        this.updateAffectationSummary();
      });

      container.appendChild(btn);
    });
  }

  /**
   * Récupère les valeurs des boutons bureaux sélectionnés
   */
  getSelectedBureaux() {
    const buttons = document.querySelectorAll('#stm-bureau-checkboxes .toggle-btn.active');
    return Array.from(buttons).map(btn => btn.dataset.value);
  }

  /**
   * Récupère les valeurs des boutons responsables sélectionnés
   */
  getSelectedQui() {
    const buttons = document.querySelectorAll('#stm-qui-checkboxes .toggle-btn.active');
    return Array.from(buttons).map(btn => btn.dataset.value);
  }

  /**
   * Définit les bureaux sélectionnés
   */
  setSelectedBureaux(bureaux) {
    document.querySelectorAll('#stm-bureau-checkboxes .toggle-btn').forEach(btn => {
      btn.classList.toggle('active', bureaux.includes(btn.dataset.value));
    });
    this.updateAffectationSummary();
  }

  /**
   * Définit les responsables sélectionnés
   */
  setSelectedQui(noms) {
    document.querySelectorAll('#stm-qui-checkboxes .toggle-btn').forEach(btn => {
      btn.classList.toggle('active', noms.includes(btn.dataset.value));
    });
    this.updateAffectationSummary();
  }

  /**
   * Met à jour le récapitulatif d'affectation
   */
  updateAffectationSummary() {
    const summary = document.getElementById('stm-affectation-summary');
    if (!summary) return;

    const selectedQui = this.getSelectedQui();
    const selectedBureaux = this.getSelectedBureaux();

    if (selectedQui.length === 0 && selectedBureaux.length === 0) {
      summary.innerHTML = `
        <div class="summary-card">
          <i class="bi bi-info-circle text-muted me-2"></i>
          <span class="text-muted small">Sélectionnez des responsables et/ou bureaux pour les afficher ici</span>
        </div>
      `;
      return;
    }

    let html = '<div class="summary-badges">';

    selectedQui.forEach(nom => {
      html += `<span class="summary-badge responsable"><i class="bi bi-person-fill"></i>${nom}</span>`;
    });

    selectedBureaux.forEach(bureau => {
      html += `<span class="summary-badge bureau"><i class="bi bi-building-fill"></i>${bureau}</span>`;
    });

    html += '</div>';
    summary.innerHTML = html;
  }

  /**
   * Peuple le sélecteur de stratégies
   */
  populateStrategySelect() {
    const select = document.getElementById('stm-strategie');
    if (!select) return;

    select.innerHTML = '<option value="">-- Aucune stratégie --</option>';

    // Grouper par objectif
    const objectifs = [...new Set(this.strategies.map(s => s.objectif))];

    for (const objectif of objectifs) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = objectif || 'Sans objectif';

      const strategiesObj = this.strategies.filter(s => s.objectif === objectif);
      for (const strat of strategiesObj) {
        const option = document.createElement('option');
        option.value = strat.id;
        const label = strat.sous_objectif
          ? `${strat.sous_objectif} > ${strat.axe_strategique}`
          : strat.axe_strategique;
        option.textContent = label;
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Bouton Enregistrer
    const btnSave = document.getElementById('stm-btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => this.handleSave());
    }

    // Bouton Supprimer
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => this.handleDelete());
    }

    // Bouton Dupliquer
    const btnDuplicate = document.getElementById('stm-btn-duplicate');
    if (btnDuplicate) {
      btnDuplicate.addEventListener('click', () => this.handleDuplicate());
    }

    // Bouton Ajouter liaison
    const btnAddLink = document.getElementById('stm-btn-add-link');
    if (btnAddLink) {
      btnAddLink.addEventListener('click', () => this.handleAddLink());
    }

    // Références - prévisualisation en temps réel
    const referencesTextarea = document.getElementById('stm-references');
    if (referencesTextarea) {
      referencesTextarea.addEventListener('input', () => this.updateReferencesPreview());
    }

    // Bouton clear strategies
    const btnClearStrategies = document.getElementById('stm-btn-clear-strategies');
    if (btnClearStrategies) {
      btnClearStrategies.addEventListener('click', () => {
        document.querySelectorAll('#stm-strategy-browser .strategy-checkbox').forEach(cb => {
          cb.checked = false;
        });
        this.updateStrategyTags();
      });
    }

    // Statut change listener for badge update
    const statutSelect = document.getElementById('stm-statut');
    if (statutSelect) {
      statutSelect.addEventListener('change', () => this.updateStatusBadge());
    }

    // Date change listeners for timeline
    const dateDebut = document.getElementById('stm-date-debut');
    if (dateDebut) {
      dateDebut.addEventListener('change', () => this.updateTimelineVisual());
    }

    // Initialiser les jalons
    this.initJalons();

    // Initialiser l'avancement
    this.initAvancement();

    // Initialiser les durées
    this.initDuree();

    // Initialiser les liens entre tâches
    this.initTaskLinks();

    // Initialiser les boutons de priorité
    this.initPriorityButtons();

    // Initialiser l'indicateur de complétude
    this.initCompletionRing();

    // Initialiser le compteur de description
    this.initDescriptionCounter();

    // Initialiser le sidebar historique
    this.initHistorySidebar();

    // Initialiser les indicateurs d'onglets
    this.initTabIndicators();

    // Exposer l'instance pour les callbacks
    window._sharedTaskModalInstance = this;

    // Fermeture de la modale
    if (this.modal) {
      this.modal.addEventListener('hidden.bs.modal', () => {
        this.currentTask = null;
        this.jalons = [];
        this.selectedStrategies = [];
      });
    }
  }

  /**
   * Ouvre la modale pour éditer une tâche existante
   */
  open(task) {
    if (!this.isLoaded) {
      console.error('[SharedTaskModal] Not initialized. Call init() first.');
      return;
    }

    this.currentTask = task;
    this.populateForm(task);

    // Afficher les boutons Supprimer et Dupliquer pour les tâches existantes
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete && this.options.onDelete) {
      btnDelete.style.display = 'inline-block';
    }
    const btnDuplicate = document.getElementById('stm-btn-duplicate');
    if (btnDuplicate) {
      btnDuplicate.style.display = 'inline-block';
    }

    // Mettre à jour le titre
    const modalTitle = document.getElementById('stm-modal-title');
    if (modalTitle) {
      modalTitle.textContent = `Tâche #${task.id}`;
    }

    this.bsModal.show();
  }

  /**
   * Ouvre la modale pour créer une nouvelle tâche
   */
  openNew(defaults = {}) {
    if (!this.isLoaded) {
      console.error('[SharedTaskModal] Not initialized. Call init() first.');
      return;
    }

    this.currentTask = null;
    this.clearForm();

    // Appliquer les valeurs par défaut
    if (defaults.statut) {
      this.setFieldValue('stm-statut', defaults.statut);
    }

    // Cacher les boutons Supprimer et Dupliquer pour nouvelle tâche
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete) {
      btnDelete.style.display = 'none';
    }
    const btnDuplicate = document.getElementById('stm-btn-duplicate');
    if (btnDuplicate) {
      btnDuplicate.style.display = 'none';
    }

    // Mettre à jour le titre
    const modalTitle = document.getElementById('stm-modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Nouvelle tâche';
    }

    this.bsModal.show();
  }

  /**
   * Ferme la modale
   */
  close() {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  /**
   * Remplit le formulaire avec les données de la tâche
   */
  populateForm(task) {
    this.setFieldValue('stm-task-id', task.id);
    this.setFieldValue('stm-titre', task.titre);
    this.setFieldValue('stm-description', task.description);
    this.setFieldValue('stm-statut', task.statut);
    this.setFieldValue('stm-projet', task.projet);
    this.setFieldValue('stm-urgence', task.urgence);
    this.setFieldValue('stm-impact', task.impact);

    // Classification V3
    this.setFieldValue('stm-nature', task.nature_activite);
    this.setFieldValue('stm-genre', task.genre_action);
    this.setFieldValue('stm-etape', task.etape_cycle);
    this.setFieldValue('stm-previsibilite', task.previsibilite);

    // Priority buttons (urgence & impact)
    this.setPriorityButtonValue('stm-urgence-buttons', task.urgence);
    this.setPriorityButtonValue('stm-impact-buttons', task.impact);

    // Update status badge
    this.updateStatusBadge();

    // Rattachement hiérarchique via MEO
    this.setFieldValue('stm-meo-code', task.mise_en_oeuvre_code || '');
    this.setFieldValue('stm-meo-nom', task.mise_en_oeuvre_nom || '');
    this.setFieldValue('stm-strategie', task.strategie_id || '');
    this.setFieldValue('stm-programme', task.programme_id || '');

    // Sélectionner la MEO dans le dropdown
    const meoSelect = document.getElementById('stm-meo');
    if (meoSelect && task.mise_en_oeuvre_code) {
      meoSelect.value = task.mise_en_oeuvre_code;
      this.handleMeoChange();
    } else if (meoSelect) {
      meoSelect.value = '';
      const infoDiv = document.getElementById('stm-hierarchy-info');
      if (infoDiv) infoDiv.style.display = 'none';
    }

    // Bureaux (checkboxes) - peut être une string séparée par virgules ou un tableau
    const bureaux = task.bureau
      ? (Array.isArray(task.bureau) ? task.bureau : task.bureau.split(',').map(b => b.trim()))
      : [];
    this.setSelectedBureaux(bureaux);

    // Responsables/Qui (checkboxes) - peut être une string séparée par virgules ou un tableau
    const qui = task.qui
      ? (Array.isArray(task.qui) ? task.qui : task.qui.split(',').map(q => q.trim()))
      : [];
    this.setSelectedQui(qui);

    // Échéance (conversion timestamp si nécessaire)
    if (task.date_echeance) {
      const date = typeof task.date_echeance === 'number'
        ? new Date(task.date_echeance * 1000)
        : new Date(task.date_echeance);
      if (!isNaN(date.getTime())) {
        if (this.datePicker) {
          this.datePicker.setDate(date);
        } else {
          this.setFieldValue('stm-echeance', date.toISOString().split('T')[0]);
        }
        this.updateDateStatus(date);
      }
    } else {
      this.updateDateStatus(null);
    }

    // Références
    this.setFieldValue('stm-references', task.reference || '');
    this.updateReferencesPreview();

    // Jalons
    this.jalons = task.jalons ? JSON.parse(JSON.stringify(task.jalons)) : [];
    this.renderJalons();

    // Avancement
    const avancement = task.avancement || 0;
    const sliderAvancement = document.getElementById('stm-avancement');
    if (sliderAvancement) {
      sliderAvancement.value = avancement;
      this.updateAvancementDisplay(avancement);
    }

    // Date de début
    if (task.date_debut) {
      const dateDebut = typeof task.date_debut === 'number'
        ? new Date(task.date_debut * 1000)
        : new Date(task.date_debut);
      if (!isNaN(dateDebut.getTime())) {
        this.setFieldValue('stm-date-debut', dateDebut.toISOString().split('T')[0]);
      }
    }

    // Durées (en heures)
    this.setFieldValue('stm-duree-estimee', task.temps_estime_heures || '');
    this.setFieldValue('stm-duree-reelle', task.temps_reel_heures || '');
    // Les champs sont en heures dans Grist, on fixe l'unité à 'h'
    this.setFieldValue('stm-duree-estimee-unite', 'h');
    this.setFieldValue('stm-duree-reelle-unite', 'h');
    this.updateDureeEcart();

    // Liens entre tâches
    this.taskLinks = task.liens ? JSON.parse(JSON.stringify(task.liens)) : [];
    this.populateLinkTaskSelect();
    this.renderTaskLinks();

    // Stratégies multiples
    if (task.strategie_ids) {
      const ids = Array.isArray(task.strategie_ids) ? task.strategie_ids : task.strategie_ids.split(',').map(Number);
      this.setSelectedStrategies(ids);
    } else if (task.strategie_id) {
      this.setSelectedStrategies([task.strategie_id]);
    } else {
      this.setSelectedStrategies([]);
    }

    // Temps
    if (this.options.showTimes) {
      this.setFieldValue('stm-temps-estime', task.temps_estime || '');
      this.setFieldValue('stm-temps-reel', task.temps_reel || '');
    }

    // Update all visual indicators
    this.updateCompletionRing();
    this.updateTimelineVisual();

    // Update description counter
    const descCounter = document.getElementById('stm-desc-counter');
    if (descCounter) {
      const len = (task.description || '').length;
      descCounter.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
    }
  }

  /**
   * Vide le formulaire
   */
  clearForm() {
    const form = document.getElementById('shared-task-form');
    if (form) {
      form.reset();
    }
    this.setFieldValue('stm-task-id', '');

    // Vider les checkboxes
    this.setSelectedBureaux([]);
    this.setSelectedQui([]);

    // Vider les stratégies
    this.setSelectedStrategies([]);

    // Vider les jalons
    this.jalons = [];
    this.renderJalons();

    // Vider la date
    if (this.datePicker) {
      this.datePicker.clear();
    }
    this.updateDateStatus(null);

    // Vider les références
    this.setFieldValue('stm-references', '');
    this.updateReferencesPreview();

    // Cacher les infos hiérarchie
    const infoDiv = document.getElementById('stm-hierarchy-info');
    if (infoDiv) infoDiv.style.display = 'none';

    // Réinitialiser l'avancement
    const sliderAvancement = document.getElementById('stm-avancement');
    if (sliderAvancement) {
      sliderAvancement.value = 0;
      this.updateAvancementDisplay(0);
    }

    // Vider les durées et dates
    this.setFieldValue('stm-date-debut', '');
    this.setFieldValue('stm-duree-estimee', '');
    this.setFieldValue('stm-duree-reelle', '');
    const ecartDiv = document.getElementById('stm-duree-ecart');
    if (ecartDiv) ecartDiv.textContent = '';

    // Vider les liens
    this.taskLinks = [];
    this.renderTaskLinks();

    // Reset priority buttons
    this.setPriorityButtonValue('stm-urgence-buttons', '');
    this.setPriorityButtonValue('stm-impact-buttons', '');

    // Reset completion ring and other visual indicators
    this.updateCompletionRing();
    this.updateTimelineVisual();
    this.updateStatusBadge();
  }

  /**
   * Récupère les données du formulaire
   */
  getFormData() {
    // Récupérer les bureaux et responsables depuis les checkboxes
    const selectedBureaux = this.getSelectedBureaux();
    const selectedQui = this.getSelectedQui();

    const data = {
      titre: this.getFieldValue('stm-titre'),
      description: this.getFieldValue('stm-description'),
      statut: this.getFieldValue('stm-statut'),
      qui: selectedQui.join(', '),
      bureau: selectedBureaux.join(', '),
      projet: this.getFieldValue('stm-projet'),
      urgence: this.getFieldValue('stm-urgence'),
      impact: this.getFieldValue('stm-impact'),
      nature_activite: this.getFieldValue('stm-nature'),
      genre_action: this.getFieldValue('stm-genre'),
      etape_cycle: this.getFieldValue('stm-etape'),
      previsibilite: this.getFieldValue('stm-previsibilite'),
      reference: this.getFieldValue('stm-references')
    };

    // ID de la tâche
    const taskId = this.getFieldValue('stm-task-id');
    if (taskId) {
      data.id = parseInt(taskId, 10);
    }

    // Rattachement hiérarchique via MEO
    data.mise_en_oeuvre_code = this.getFieldValue('stm-meo-code');
    data.mise_en_oeuvre_nom = this.getFieldValue('stm-meo-nom');

    const strategieIdStr = this.getFieldValue('stm-strategie');
    if (strategieIdStr) {
      data.strategie_id = parseInt(strategieIdStr, 10);
      data.est_classifiee = true;
    }

    // Stratégies multiples
    if (this.selectedStrategies.length > 0) {
      data.strategie_ids = this.selectedStrategies.map(s => s.id);
      data.strategie_id = this.selectedStrategies[0].id; // Première pour compatibilité
      data.est_classifiee = true;
    }

    const programmeIdStr = this.getFieldValue('stm-programme');
    if (programmeIdStr) {
      data.programme_id = parseInt(programmeIdStr, 10);
    }

    // Échéance
    let echeanceDate = null;
    if (this.datePicker) {
      const dates = this.datePicker.selectedDates;
      if (dates.length > 0) {
        echeanceDate = dates[0];
      }
    } else {
      const echeance = this.getFieldValue('stm-echeance');
      if (echeance) {
        echeanceDate = new Date(echeance);
      }
    }
    if (echeanceDate && !isNaN(echeanceDate.getTime())) {
      data.date_echeance = Math.floor(echeanceDate.getTime() / 1000);
    }

    // Jalons
    if (this.jalons.length > 0) {
      data.jalons = this.jalons;
    }

    // Temps
    if (this.options.showTimes) {
      const tempsEstime = parseFloat(this.getFieldValue('stm-temps-estime'));
      const tempsReel = parseFloat(this.getFieldValue('stm-temps-reel'));
      if (!isNaN(tempsEstime)) data.temps_estime = tempsEstime;
      if (!isNaN(tempsReel)) data.temps_reel = tempsReel;
    }

    // Avancement
    const avancement = parseInt(this.getFieldValue('stm-avancement')) || 0;
    data.avancement = avancement;

    // Date de début
    const dateDebut = this.getFieldValue('stm-date-debut');
    if (dateDebut) {
      data.date_debut = Math.floor(new Date(dateDebut).getTime() / 1000);
    }

    // Durées (en heures pour Grist)
    const dureeEstimee = parseFloat(this.getFieldValue('stm-duree-estimee'));
    const dureeReelle = parseFloat(this.getFieldValue('stm-duree-reelle'));
    if (!isNaN(dureeEstimee)) {
      data.temps_estime_heures = dureeEstimee;
    }
    if (!isNaN(dureeReelle)) {
      data.temps_reel_heures = dureeReelle;
    }

    // Liens entre tâches
    if (this.taskLinks.length > 0) {
      data.liens = this.taskLinks;
    }

    return data;
  }

  /**
   * Handler pour la sauvegarde
   */
  async handleSave() {
    const data = this.getFormData();

    // Validation minimale
    if (!data.titre || !data.titre.trim()) {
      this.showError('Le titre est obligatoire');
      return;
    }

    try {
      if (this.options.onSave) {
        await this.options.onSave(data);
      } else if (this.options.gristManager) {
        await this.options.gristManager.saveRecord(data);
      }
      this.close();
    } catch (error) {
      console.error('[SharedTaskModal] Save error:', error);
      this.showError('Erreur lors de la sauvegarde');
    }
  }

  /**
   * Handler pour la suppression
   */
  async handleDelete() {
    if (!this.currentTask || !this.currentTask.id) return;

    if (!confirm('Supprimer cette tâche ?')) return;

    try {
      if (this.options.onDelete) {
        await this.options.onDelete(this.currentTask.id);
      } else if (this.options.gristManager) {
        await this.options.gristManager.deleteRecord(this.currentTask.id);
      }
      this.close();
    } catch (error) {
      console.error('[SharedTaskModal] Delete error:', error);
      this.showError('Erreur lors de la suppression');
    }
  }

  /**
   * Handler pour la duplication
   */
  async handleDuplicate() {
    if (!this.currentTask) return;

    try {
      // Collecter les données actuelles du formulaire
      const taskData = this.getFormData();

      // Modifier pour la duplication
      taskData.titre = `Copie de ${taskData.titre}`;
      taskData.statut = 'Backlog'; // Remettre en backlog
      delete taskData.id; // Supprimer l'ID pour créer une nouvelle tâche

      // Créer la nouvelle tâche
      if (this.options.onSave) {
        await this.options.onSave(taskData, true); // true = isNew
      } else if (this.options.gristManager) {
        await this.options.gristManager.createRecord(taskData);
      }

      this.close();
      console.log('[SharedTaskModal] Task duplicated successfully');
    } catch (error) {
      console.error('[SharedTaskModal] Duplicate error:', error);
      this.showError('Erreur lors de la duplication');
    }
  }

  /**
   * Handler pour l'ajout de liaison
   */
  handleAddLink() {
    // À implémenter selon les besoins
    console.log('[SharedTaskModal] Add link clicked');
    // Émettre un événement ou appeler un callback
    if (this.options.onAddLink) {
      this.options.onAddLink(this.currentTask);
    }
  }

  // === Strategy Browser ===

  /**
   * Initialise le navigateur de stratégies (accordion)
   */
  initStrategyBrowser() {
    const container = document.getElementById('stm-strategy-browser');
    if (!container) return;

    // Grouper par objectif > sous_objectif > axe
    const hierarchy = {};
    this.strategies.forEach(s => {
      const obj = s.objectif || '(Sans objectif)';
      const sousObj = s.sous_objectif || '(Sans sous-objectif)';
      if (!hierarchy[obj]) hierarchy[obj] = {};
      if (!hierarchy[obj][sousObj]) hierarchy[obj][sousObj] = [];
      hierarchy[obj][sousObj].push(s);
    });

    let html = '<div class="strategy-tree">';
    for (const [objectif, sousObjectifs] of Object.entries(hierarchy)) {
      html += `<div class="strategy-objectif mb-2">
        <div class="fw-bold text-primary small mb-1"><i class="bi bi-bullseye me-1"></i>${objectif}</div>`;

      for (const [sousObjectif, axes] of Object.entries(sousObjectifs)) {
        html += `<div class="strategy-sous-objectif ms-3 mb-1">
          <div class="text-muted small">${sousObjectif}</div>
          <div class="strategy-axes ms-3">`;

        for (const axe of axes) {
          html += `<div class="strategy-axe form-check">
            <input class="form-check-input strategy-checkbox" type="checkbox"
              id="stm-strat-${axe.id}" value="${axe.id}"
              data-objectif="${objectif}" data-sous-objectif="${sousObjectif}" data-axe="${axe.axe_strategique}">
            <label class="form-check-label small" for="stm-strat-${axe.id}">${axe.axe_strategique}</label>
          </div>`;
        }

        html += '</div></div>';
      }
      html += '</div>';
    }
    html += '</div>';

    container.innerHTML = html;

    // Listeners pour mise à jour des tags
    container.querySelectorAll('.strategy-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this.updateStrategyTags());
    });
  }

  /**
   * Met à jour les tags de stratégies sélectionnées
   */
  updateStrategyTags() {
    const tagsContainer = document.getElementById('stm-strategy-tags');
    const countBadge = document.getElementById('stm-strategy-count');
    const selectedSection = document.getElementById('stm-selected-strategies');

    if (!tagsContainer) return;

    const checked = document.querySelectorAll('#stm-strategy-browser .strategy-checkbox:checked');
    this.selectedStrategies = Array.from(checked).map(cb => ({
      id: parseInt(cb.value),
      objectif: cb.dataset.objectif,
      sousObjectif: cb.dataset.sousObjectif,
      axe: cb.dataset.axe
    }));

    if (this.selectedStrategies.length === 0) {
      if (selectedSection) selectedSection.style.display = 'none';
      return;
    }

    if (selectedSection) selectedSection.style.display = 'block';
    if (countBadge) countBadge.textContent = this.selectedStrategies.length;

    tagsContainer.innerHTML = this.selectedStrategies.map(s => `
      <span class="badge bg-primary me-1 mb-1">
        ${s.axe}
        <button type="button" class="btn-close btn-close-white ms-1"
          style="font-size: 0.6em;" data-strat-id="${s.id}"></button>
      </span>
    `).join('');

    // Listeners pour supprimer les tags
    tagsContainer.querySelectorAll('.btn-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stratId = e.target.dataset.stratId;
        const checkbox = document.getElementById(`stm-strat-${stratId}`);
        if (checkbox) {
          checkbox.checked = false;
          this.updateStrategyTags();
        }
      });
    });

    // Mettre à jour le champ caché
    const idsField = document.getElementById('stm-strategie-ids');
    if (idsField) {
      idsField.value = this.selectedStrategies.map(s => s.id).join(',');
    }
  }

  /**
   * Définit les stratégies sélectionnées
   */
  setSelectedStrategies(ids) {
    document.querySelectorAll('#stm-strategy-browser .strategy-checkbox').forEach(cb => {
      cb.checked = ids.includes(parseInt(cb.value));
    });
    this.updateStrategyTags();
  }

  // === Date Picker ===

  /**
   * Initialise le date picker avec bouton clear
   */
  initDatePicker() {
    const input = document.getElementById('stm-echeance');
    const btnPick = document.getElementById('stm-btn-pick-date');
    const btnClear = document.getElementById('stm-btn-clear-date');

    if (!input) {
      console.warn('[SharedTaskModal] Date input not found');
      return;
    }

    // Vérifier flatpickr globalement (window.flatpickr)
    const fp = window.flatpickr || (typeof flatpickr !== 'undefined' ? flatpickr : null);

    if (fp) {
      try {
        // Détruire l'instance précédente si elle existe
        if (this.datePicker) {
          this.datePicker.destroy();
        }

        this.datePicker = fp(input, {
          dateFormat: 'd/m/Y',
          locale: 'fr',
          allowInput: true,
          clickOpens: true,
          onChange: (dates) => {
            this.updateDateStatus(dates[0]);
            this.updateTimelineVisual();
            this.updateCompletionRing();
          }
        });
        console.log('[SharedTaskModal] Flatpickr initialized');
      } catch (error) {
        console.warn('[SharedTaskModal] Flatpickr init error:', error);
        this.initDatePickerFallback(input);
      }
    } else {
      console.warn('[SharedTaskModal] Flatpickr not available, using fallback');
      this.initDatePickerFallback(input);
    }

    // Bouton pour ouvrir le picker
    if (btnPick) {
      // Supprimer les anciens listeners en clonant le bouton
      const newBtnPick = btnPick.cloneNode(true);
      btnPick.parentNode.replaceChild(newBtnPick, btnPick);

      newBtnPick.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.datePicker && typeof this.datePicker.open === 'function') {
          this.datePicker.open();
        } else {
          // Fallback: utiliser input date natif
          const dateInput = document.getElementById('stm-echeance');
          if (dateInput) {
            if (dateInput.type === 'date') {
              try {
                dateInput.showPicker?.();
              } catch (err) {
                dateInput.focus();
                dateInput.click();
              }
            } else {
              // Convertir temporairement en input date
              const currentValue = dateInput.value;
              dateInput.type = 'date';
              dateInput.removeAttribute('readonly');
              try {
                dateInput.showPicker?.();
              } catch (err) {
                dateInput.focus();
              }
            }
          }
        }
      });
    }

    // Bouton pour effacer la date
    if (btnClear) {
      // Supprimer les anciens listeners en clonant le bouton
      const newBtnClear = btnClear.cloneNode(true);
      btnClear.parentNode.replaceChild(newBtnClear, btnClear);

      newBtnClear.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.datePicker && typeof this.datePicker.clear === 'function') {
          this.datePicker.clear();
        } else {
          const dateInput = document.getElementById('stm-echeance');
          if (dateInput) dateInput.value = '';
        }
        this.updateDateStatus(null);
      });
    }
  }

  /**
   * Fallback pour le date picker sans flatpickr
   */
  initDatePickerFallback(input) {
    input.type = 'date';
    input.removeAttribute('readonly');
    input.style.cursor = 'pointer';
    input.addEventListener('change', () => {
      this.updateDateStatus(input.value ? new Date(input.value) : null);
      this.updateTimelineVisual();
      this.updateCompletionRing();
    });
    // Permettre l'ouverture au clic
    input.addEventListener('click', () => {
      try {
        input.showPicker?.();
      } catch (e) {
        // Ignorer si showPicker n'est pas supporté
      }
    });
  }

  /**
   * Met à jour le statut de la date
   */
  updateDateStatus(date) {
    const btnClear = document.getElementById('stm-btn-clear-date');
    const statusSpan = document.getElementById('stm-date-status');

    if (date) {
      if (btnClear) btnClear.style.display = 'block';
      if (statusSpan) {
        const now = new Date();
        const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
          statusSpan.className = 'text-danger small';
          statusSpan.textContent = `En retard de ${Math.abs(diff)} jour(s)`;
        } else if (diff === 0) {
          statusSpan.className = 'text-warning small';
          statusSpan.textContent = "Échéance aujourd'hui";
        } else if (diff <= 7) {
          statusSpan.className = 'text-warning small';
          statusSpan.textContent = `Dans ${diff} jour(s)`;
        } else {
          statusSpan.className = 'text-muted small';
          statusSpan.textContent = `Dans ${diff} jours`;
        }
      }
    } else {
      if (btnClear) btnClear.style.display = 'none';
      if (statusSpan) {
        statusSpan.className = 'text-muted small';
        statusSpan.textContent = 'Aucune date définie';
      }
    }
  }

  // === Jalons ===

  /**
   * Initialise la section jalons
   */
  initJalons() {
    const btnAdd = document.getElementById('stm-btn-add-jalon');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.addJalon());
    }
    this.renderJalons();
  }

  /**
   * Ajoute un nouveau jalon depuis les champs inline
   */
  addJalon() {
    const titreInput = document.getElementById('stm-jalon-titre');
    const dateInput = document.getElementById('stm-jalon-date');

    if (!titreInput) return;

    const titre = titreInput.value.trim();
    if (!titre) {
      titreInput.classList.add('is-invalid');
      titreInput.focus();
      return;
    }

    // Formater la date si présente
    let dateFormatted = '';
    if (dateInput && dateInput.value) {
      const date = new Date(dateInput.value);
      dateFormatted = date.toLocaleDateString('fr-FR');
    }

    this.jalons.push({
      id: Date.now(),
      titre: titre,
      date: dateFormatted,
      statut: 'pending'
    });

    // Réinitialiser les champs
    titreInput.value = '';
    titreInput.classList.remove('is-invalid');
    if (dateInput) dateInput.value = '';

    this.renderJalons();
  }

  /**
   * Affiche les jalons
   */
  renderJalons() {
    const container = document.getElementById('stm-jalons-timeline');
    const emptyDiv = document.getElementById('stm-jalons-empty');
    const countBadge = document.getElementById('stm-jalons-count');

    if (!container) return;

    if (this.jalons.length === 0) {
      if (emptyDiv) emptyDiv.style.display = 'block';
      if (countBadge) countBadge.textContent = '0';
      container.querySelectorAll('.jalon-item').forEach(el => el.remove());
      return;
    }

    if (emptyDiv) emptyDiv.style.display = 'none';
    if (countBadge) countBadge.textContent = this.jalons.length;

    // Supprimer les anciens jalons
    container.querySelectorAll('.jalon-item').forEach(el => el.remove());

    // Ajouter les jalons
    this.jalons.forEach((jalon, idx) => {
      const div = document.createElement('div');
      div.className = 'jalon-item d-flex align-items-center gap-2 py-2 border-bottom';
      div.innerHTML = `
        <input type="checkbox" class="form-check-input" ${jalon.statut === 'done' ? 'checked' : ''} data-idx="${idx}">
        <span class="flex-grow-1 ${jalon.statut === 'done' ? 'text-decoration-line-through text-muted' : ''}">${jalon.titre}</span>
        <small class="text-muted">${jalon.date || '-'}</small>
        <button type="button" class="btn btn-sm btn-outline-danger" data-idx="${idx}">
          <i class="bi bi-trash"></i>
        </button>
      `;
      container.appendChild(div);

      // Listeners
      div.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        this.jalons[idx].statut = e.target.checked ? 'done' : 'pending';
        this.renderJalons();
      });
      div.querySelector('button').addEventListener('click', () => {
        this.jalons.splice(idx, 1);
        this.renderJalons();
      });
    });
  }

  // === References ===

  /**
   * Parse et prévisualise les références
   */
  updateReferencesPreview() {
    const textarea = document.getElementById('stm-references');
    const preview = document.getElementById('stm-references-preview');
    if (!textarea || !preview) return;

    const lines = textarea.value.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      preview.innerHTML = '';
      return;
    }

    preview.innerHTML = lines.map(line => {
      line = line.trim();
      // URL
      if (line.match(/^https?:\/\//)) {
        return `<a href="${line}" target="_blank" class="badge bg-info text-decoration-none me-1 mb-1"><i class="bi bi-link-45deg"></i> ${this.truncate(line, 40)}</a>`;
      }
      // Chemin réseau
      if (line.startsWith('\\\\')) {
        return `<span class="badge bg-secondary me-1 mb-1"><i class="bi bi-folder"></i> ${this.truncate(line, 40)}</span>`;
      }
      // Email
      if (line.includes('@')) {
        return `<a href="mailto:${line}" class="badge bg-success text-decoration-none me-1 mb-1"><i class="bi bi-envelope"></i> ${line}</a>`;
      }
      // Référence GLPI ou autre
      if (line.match(/^[A-Z]+-\d+/)) {
        return `<span class="badge bg-warning text-dark me-1 mb-1"><i class="bi bi-tag"></i> ${line}</span>`;
      }
      // Autre
      return `<span class="badge bg-light text-dark me-1 mb-1">${this.truncate(line, 50)}</span>`;
    }).join('');
  }

  /**
   * Tronque une chaîne
   */
  truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  // === Avancement ===

  /**
   * Initialise le slider d'avancement
   */
  initAvancement() {
    const slider = document.getElementById('stm-avancement');
    const badge = document.getElementById('stm-avancement-badge');
    const bar = document.getElementById('stm-avancement-bar');
    const statutSelect = document.getElementById('stm-statut');

    if (!slider) return;

    slider.addEventListener('input', () => {
      const value = parseInt(slider.value);
      this.updateAvancementDisplay(value);
    });

    // Synchroniser statut et avancement
    if (statutSelect) {
      statutSelect.addEventListener('change', () => {
        const statut = statutSelect.value;
        if (statut === 'Terminé') {
          slider.value = 100;
          this.updateAvancementDisplay(100);
        } else if (statut === 'Backlog' || statut === 'À faire') {
          if (parseInt(slider.value) === 100) {
            slider.value = 0;
            this.updateAvancementDisplay(0);
          }
        }
      });
    }
  }

  /**
   * Met à jour l'affichage de l'avancement
   */
  updateAvancementDisplay(value) {
    const badge = document.getElementById('stm-avancement-badge');
    const bar = document.getElementById('stm-avancement-bar');

    if (badge) badge.textContent = `${value}%`;
    if (bar) {
      bar.style.width = `${value}%`;
      bar.className = 'progress-bar';
      if (value === 100) {
        bar.classList.add('bg-success');
      } else if (value >= 75) {
        bar.classList.add('bg-info');
      } else if (value >= 50) {
        bar.classList.add('bg-primary');
      } else if (value >= 25) {
        bar.classList.add('bg-warning');
      }
    }
  }

  // === Durées ===

  /**
   * Initialise les champs de durée
   */
  initDuree() {
    const dureeEstimee = document.getElementById('stm-duree-estimee');
    const dureeReelle = document.getElementById('stm-duree-reelle');

    if (dureeEstimee && dureeReelle) {
      const updateEcart = () => this.updateDureeEcart();
      dureeEstimee.addEventListener('input', updateEcart);
      dureeReelle.addEventListener('input', updateEcart);
    }
  }

  /**
   * Met à jour l'écart de durée
   */
  updateDureeEcart() {
    const estimee = parseFloat(document.getElementById('stm-duree-estimee')?.value) || 0;
    const reelle = parseFloat(document.getElementById('stm-duree-reelle')?.value) || 0;
    const ecartDiv = document.getElementById('stm-duree-ecart');

    if (!ecartDiv || estimee === 0) {
      if (ecartDiv) ecartDiv.textContent = '';
      return;
    }

    const ecart = reelle - estimee;
    const pct = Math.round((ecart / estimee) * 100);

    if (ecart > 0) {
      ecartDiv.className = 'form-text small text-danger';
      ecartDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> +${ecart.toFixed(1)} (+${pct}%)`;
    } else if (ecart < 0) {
      ecartDiv.className = 'form-text small text-success';
      ecartDiv.innerHTML = `<i class="bi bi-check-circle"></i> ${ecart.toFixed(1)} (${pct}%)`;
    } else {
      ecartDiv.className = 'form-text small text-muted';
      ecartDiv.textContent = 'Dans les temps';
    }
  }

  // === Liens entre tâches ===

  /**
   * Charge toutes les tâches pour le sélecteur de liens
   */
  async loadAllTasks() {
    try {
      if (typeof grist === 'undefined') return;

      const data = await grist.docApi.fetchTable('Ssir_principale_task');
      this.allTasks = [];
      const count = data.id?.length || 0;

      for (let i = 0; i < count; i++) {
        this.allTasks.push({
          id: data.id[i],
          titre: data.titre?.[i] || `Tâche #${data.id[i]}`,
          statut: data.statut?.[i] || ''
        });
      }

      this.populateLinkTaskSelect();
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load tasks for links:', error.message);
    }
  }

  /**
   * Peuple le sélecteur de tâches pour les liens
   */
  populateLinkTaskSelect() {
    const select = document.getElementById('stm-link-task');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner une tâche --</option>';

    // Exclure la tâche courante
    const currentId = this.currentTask?.id;

    this.allTasks
      .filter(t => t.id !== currentId)
      .forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = `#${task.id} - ${this.truncate(task.titre, 50)}`;
        option.dataset.titre = task.titre;
        option.dataset.statut = task.statut;
        select.appendChild(option);
      });
  }

  /**
   * Initialise la section des liens
   */
  initTaskLinks() {
    const btnAdd = document.getElementById('stm-btn-add-link');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.addTaskLink());
    }
  }

  /**
   * Ajoute un lien vers une autre tâche
   */
  addTaskLink() {
    const typeSelect = document.getElementById('stm-link-type');
    const taskSelect = document.getElementById('stm-link-task');

    if (!typeSelect || !taskSelect || !taskSelect.value) {
      return;
    }

    const taskId = parseInt(taskSelect.value);
    const type = typeSelect.value;
    const selectedOption = taskSelect.options[taskSelect.selectedIndex];

    // Vérifier si le lien existe déjà
    if (this.taskLinks.some(l => l.taskId === taskId && l.type === type)) {
      alert('Ce lien existe déjà');
      return;
    }

    this.taskLinks.push({
      taskId: taskId,
      type: type,
      titre: selectedOption.dataset.titre,
      statut: selectedOption.dataset.statut
    });

    this.renderTaskLinks();
    taskSelect.value = '';
  }

  /**
   * Supprime un lien
   */
  removeTaskLink(taskId, type) {
    this.taskLinks = this.taskLinks.filter(l => !(l.taskId === taskId && l.type === type));
    this.renderTaskLinks();
  }

  /**
   * Affiche les liens
   */
  renderTaskLinks() {
    const container = document.getElementById('stm-liens-list');
    const countBadge = document.getElementById('stm-liens-count');
    const noLinks = document.getElementById('stm-no-links');

    if (!container) return;

    // Grouper par type
    const types = {
      bloque: { group: 'stm-links-bloque', items: [] },
      bloque_par: { group: 'stm-links-bloque-par', items: [] },
      lie: { group: 'stm-links-lie', items: [] },
      parent: { group: 'stm-links-parent', items: [] },
      enfant: { group: 'stm-links-enfant', items: [] }
    };

    this.taskLinks.forEach(link => {
      if (types[link.type]) {
        types[link.type].items.push(link);
      }
    });

    // Afficher/cacher les groupes
    for (const [type, data] of Object.entries(types)) {
      const groupEl = document.getElementById(data.group);
      const itemsEl = container.querySelector(`.task-link-items[data-type="${type}"]`);

      if (!groupEl || !itemsEl) continue;

      if (data.items.length === 0) {
        groupEl.style.display = 'none';
        itemsEl.innerHTML = '';
      } else {
        groupEl.style.display = 'block';
        itemsEl.innerHTML = data.items.map(link => `
          <div class="task-link-item d-flex align-items-center gap-2 py-1">
            <span class="badge bg-light text-dark">#${link.taskId}</span>
            <span class="flex-grow-1 small">${this.truncate(link.titre, 40)}</span>
            <span class="badge ${this.getStatusBadgeClass(link.statut)} small">${link.statut || '-'}</span>
            <button type="button" class="btn btn-sm btn-link text-danger p-0"
              onclick="window._sharedTaskModalInstance?.removeTaskLink(${link.taskId}, '${type}')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        `).join('');
      }
    }

    // Mettre à jour le compteur
    if (countBadge) countBadge.textContent = this.taskLinks.length;

    // Afficher/cacher le message "aucun lien"
    if (noLinks) {
      noLinks.style.display = this.taskLinks.length === 0 ? 'block' : 'none';
    }

    // Stocker dans le champ caché
    const hiddenField = document.getElementById('stm-liens-data');
    if (hiddenField) {
      hiddenField.value = JSON.stringify(this.taskLinks);
    }
  }

  /**
   * Retourne la classe CSS pour un badge de statut
   */
  getStatusBadgeClass(statut) {
    const classes = {
      'Backlog': 'bg-secondary',
      'À faire': 'bg-info',
      'En cours': 'bg-primary',
      'En attente': 'bg-warning text-dark',
      'Validation': 'bg-purple',
      'Terminé': 'bg-success'
    };
    return classes[statut] || 'bg-secondary';
  }

  // === Priority (now using selects - no special logic needed) ===

  /**
   * Initialise les selects de priorité (plus de boutons)
   */
  initPriorityButtons() {
    // Les selects fonctionnent automatiquement - juste ajouter listener pour completion ring
    ['stm-urgence', 'stm-impact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.updateCompletionRing());
      }
    });
  }

  /**
   * Définit la valeur des selects de priorité (pour compatibilité)
   */
  setPriorityButtonValue(containerId, value) {
    // Mapping des anciens IDs vers les nouveaux
    const mapping = {
      'stm-urgence-buttons': 'stm-urgence',
      'stm-impact-buttons': 'stm-impact'
    };
    const selectId = mapping[containerId] || containerId;
    this.setFieldValue(selectId, value);
  }

  // === Completion Ring ===

  /**
   * Initialise l'indicateur de complétude
   */
  initCompletionRing() {
    // Liste des champs à surveiller pour calculer la complétude
    const fieldsToWatch = [
      'stm-titre', 'stm-description', 'stm-statut', 'stm-avancement',
      'stm-echeance', 'stm-date-debut', 'stm-meo', 'stm-projet'
    ];

    fieldsToWatch.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.addEventListener('change', () => this.updateCompletionRing());
        el.addEventListener('input', () => this.updateCompletionRing());
      }
    });

    // Surveiller les checkboxes
    const checkboxContainers = ['stm-bureau-checkboxes', 'stm-qui-checkboxes'];
    checkboxContainers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.addEventListener('change', () => this.updateCompletionRing());
      }
    });

    this.updateCompletionRing();
  }

  /**
   * Met à jour l'indicateur de complétude
   */
  updateCompletionRing() {
    const circle = document.getElementById('stm-completion-circle');
    const text = document.getElementById('stm-completion-text');

    if (!circle || !text) return;

    // Calculer la complétude (pondérée)
    const weights = {
      titre: { weight: 20, check: () => !!this.getFieldValue('stm-titre') },
      description: { weight: 15, check: () => !!this.getFieldValue('stm-description') },
      statut: { weight: 10, check: () => !!this.getFieldValue('stm-statut') },
      urgence: { weight: 10, check: () => !!this.getFieldValue('stm-urgence') },
      impact: { weight: 10, check: () => !!this.getFieldValue('stm-impact') },
      echeance: { weight: 10, check: () => {
        if (this.datePicker) {
          return this.datePicker.selectedDates.length > 0;
        }
        return !!this.getFieldValue('stm-echeance');
      }},
      responsables: { weight: 15, check: () => this.getSelectedQui().length > 0 },
      meo: { weight: 10, check: () => !!this.getFieldValue('stm-meo') }
    };

    let score = 0;
    let total = 0;

    for (const [key, config] of Object.entries(weights)) {
      total += config.weight;
      if (config.check()) {
        score += config.weight;
      }
    }

    const percentage = Math.round((score / total) * 100);

    // Mettre à jour le SVG
    circle.setAttribute('stroke-dasharray', `${percentage}, 100`);
    text.textContent = `${percentage}%`;

    // Changer la couleur selon le niveau
    if (percentage >= 80) {
      circle.style.stroke = '#22c55e'; // green
    } else if (percentage >= 50) {
      circle.style.stroke = '#f59e0b'; // yellow
    } else {
      circle.style.stroke = '#ef4444'; // red
    }
  }

  // === Description Counter ===

  /**
   * Initialise le compteur de caractères de description
   */
  initDescriptionCounter() {
    const textarea = document.getElementById('stm-description');
    const counter = document.getElementById('stm-desc-counter');

    if (!textarea || !counter) return;

    const updateCounter = () => {
      const len = textarea.value.length;
      counter.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
    };

    textarea.addEventListener('input', updateCounter);
    updateCounter();
  }

  // === History Tab ===

  /**
   * Initialise l'onglet historique
   */
  initHistorySidebar() {
    // Listener pour charger l'historique quand l'onglet est sélectionné
    const tabHistory = document.getElementById('tab-history');
    if (tabHistory) {
      tabHistory.addEventListener('shown.bs.tab', () => {
        this.loadTaskHistory();
      });
    }

    // Bouton actualiser
    const btnRefresh = document.getElementById('stm-btn-refresh-history');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.loadTaskHistory();
      });
    }
  }

  /**
   * Charge l'historique de la tâche dans l'onglet
   * Parse le champ notes (format JSON: { content: "...", history: [...] })
   */
  async loadTaskHistory() {
    const timeline = document.getElementById('stm-history-timeline');
    const loadingEl = document.getElementById('stm-history-loading');
    const emptyEl = document.getElementById('stm-history-empty');

    if (!timeline || !this.currentTask) {
      if (emptyEl) {
        emptyEl.style.display = 'block';
        const pEl = emptyEl.querySelector('p');
        if (pEl) pEl.textContent = 'Ouvrez une tâche pour voir son historique';
      }
      return;
    }

    // Afficher le chargement
    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    // Supprimer les anciennes entrées
    timeline.querySelectorAll('.history-entry-item').forEach(el => el.remove());

    try {
      // Parser l'historique depuis le champ notes (JSON)
      const historyEntries = this.parseNotesHistory(this.currentTask);

      if (loadingEl) loadingEl.style.display = 'none';

      if (historyEntries.length > 0) {
        // Calculer les statistiques
        let modifications = historyEntries.length;
        let comments = historyEntries.filter(e => e.action === 'comment').length;
        let statusChanges = historyEntries.filter(e => e.action === 'status_change').length;
        let lastUpdate = historyEntries[0]?.timestamp || null;

        // Mettre à jour les stats
        this.updateHistoryStats(modifications, comments, statusChanges, lastUpdate);

        // Créer les entrées (triées du plus récent au plus ancien)
        historyEntries.forEach(entry => {
          const entryEl = this.createHistoryEntry(
            entry.timestamp,
            this.getActionLabel(entry.action),
            entry.user,
            entry.details || entry.newValue || ''
          );
          timeline.appendChild(entryEl);
        });
      } else {
        if (emptyEl) emptyEl.style.display = 'block';
        this.updateHistoryStats(0, 0, 0, null);
      }
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load history:', error);
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.style.display = 'block';
        const iEl = emptyEl.querySelector('i');
        const pEl = emptyEl.querySelector('p');
        if (iEl) iEl.className = 'bi bi-exclamation-circle';
        if (pEl) pEl.textContent = 'Erreur de chargement de l\'historique';
      }
      this.updateHistoryStats(0, 0, 0, null);
    }
  }

  /**
   * Parse l'historique depuis le champ notes (JSON)
   * Format: { content: "...", history: [{ timestamp, user, action, field, oldValue, newValue, details }] }
   */
  parseNotesHistory(task) {
    const entries = [];

    if (!task.notes) {
      return entries;
    }

    try {
      const notesData = typeof task.notes === 'string'
        ? JSON.parse(task.notes)
        : task.notes;

      if (notesData && notesData.history && Array.isArray(notesData.history)) {
        notesData.history.forEach(entry => {
          // Normaliser le timestamp
          let timestamp = entry.timestamp;
          if (typeof timestamp === 'string') {
            timestamp = new Date(timestamp).getTime();
          }
          // Convertir en secondes si en millisecondes
          if (timestamp > 1e12) {
            timestamp = Math.floor(timestamp / 1000);
          }

          entries.push({
            timestamp: timestamp,
            user: entry.user || 'Utilisateur',
            action: entry.action || 'update',
            field: entry.field || '',
            oldValue: entry.oldValue || '',
            newValue: entry.newValue || '',
            details: entry.details || '',
            status: entry.status || ''
          });
        });
      }
    } catch (error) {
      console.warn('[SharedTaskModal] Error parsing notes JSON:', error);
    }

    // Trier par date décroissante (plus récent en premier)
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return entries;
  }

  /**
   * Convertit un code d'action en libellé lisible
   */
  getActionLabel(action) {
    const labels = {
      'comment': 'Commentaire',
      'status_change': 'Changement de statut',
      'update': 'Modification',
      'field_change': 'Modification',
      'jalons_update': 'Jalons modifiés',
      'strategies_update': 'Stratégies modifiées',
      'create': 'Création'
    };
    return labels[action] || action || 'Modification';
  }

  /**
   * Crée une entrée d'historique
   */
  createHistoryEntry(timestamp, action, user, details) {
    const entry = document.createElement('div');
    entry.className = 'history-entry-item';

    const dateStr = timestamp ? new Date(timestamp * 1000).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';

    // Déterminer l'icône et la couleur selon l'action
    let iconClass = 'bi-pencil';
    let badgeClass = 'bg-secondary';
    const actionLower = action.toLowerCase();

    if (actionLower.includes('créé') || actionLower.includes('creation')) {
      iconClass = 'bi-plus-circle';
      badgeClass = 'bg-success';
    } else if (actionLower.includes('statut') || actionLower.includes('status')) {
      iconClass = 'bi-arrow-repeat';
      badgeClass = 'bg-primary';
    } else if (actionLower.includes('commentaire') || actionLower.includes('comment')) {
      iconClass = 'bi-chat-dots';
      badgeClass = 'bg-info';
    } else if (actionLower.includes('affectation') || actionLower.includes('assigné')) {
      iconClass = 'bi-person-check';
      badgeClass = 'bg-purple';
    } else if (actionLower.includes('supprim')) {
      iconClass = 'bi-trash';
      badgeClass = 'bg-danger';
    }

    entry.innerHTML = `
      <div class="history-entry-icon">
        <i class="bi ${iconClass}"></i>
      </div>
      <div class="history-entry-content">
        <div class="history-entry-header">
          <span class="badge ${badgeClass}">${action}</span>
          <span class="history-entry-time">${dateStr}</span>
        </div>
        <div class="history-entry-user">
          <i class="bi bi-person-circle me-1"></i>${user}
        </div>
        ${details ? `<div class="history-entry-details">${details}</div>` : ''}
      </div>
    `;

    return entry;
  }

  /**
   * Met à jour les statistiques d'historique
   */
  updateHistoryStats(modifications, comments, statusChanges, lastUpdate) {
    const statModifications = document.getElementById('stm-stat-modifications');
    const statComments = document.getElementById('stm-stat-comments');
    const statStatusChanges = document.getElementById('stm-stat-status-changes');
    const statLastUpdate = document.getElementById('stm-stat-last-update');

    if (statModifications) statModifications.textContent = modifications;
    if (statComments) statComments.textContent = comments;
    if (statStatusChanges) statStatusChanges.textContent = statusChanges;
    if (statLastUpdate) {
      if (lastUpdate) {
        const date = new Date(lastUpdate * 1000);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          statLastUpdate.textContent = 'Aujourd\'hui';
        } else if (diffDays === 1) {
          statLastUpdate.textContent = 'Hier';
        } else if (diffDays < 7) {
          statLastUpdate.textContent = `Il y a ${diffDays}j`;
        } else {
          statLastUpdate.textContent = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        }
      } else {
        statLastUpdate.textContent = '-';
      }
    }
  }

  // === Tab Indicators ===

  /**
   * Initialise les indicateurs d'onglets
   */
  initTabIndicators() {
    // Surveiller les changements pour mettre à jour les indicateurs
    const updateIndicators = () => {
      this.updateTabIndicator('essential', this.checkEssentialFields());
      this.updateTabIndicator('planning', this.checkPlanningFields());
      this.updateTabIndicator('organization', this.checkOrganizationFields());
      this.updateTabIndicator('affectation', this.checkAffectationFields());
      this.updateTabIndicator('advanced', this.checkAdvancedFields());
    };

    // Observer les changements sur le formulaire
    const form = document.getElementById('shared-task-form');
    if (form) {
      form.addEventListener('change', updateIndicators);
      form.addEventListener('input', updateIndicators);
    }

    updateIndicators();
  }

  /**
   * Met à jour un indicateur d'onglet
   */
  updateTabIndicator(tabName, hasContent) {
    const indicator = document.getElementById(`indicator-${tabName}`);
    if (!indicator) return;

    indicator.className = 'tab-indicator';
    if (hasContent) {
      indicator.classList.add('has-content');
    }
  }

  /**
   * Vérifie si les champs essentiels sont remplis
   */
  checkEssentialFields() {
    return !!this.getFieldValue('stm-titre') ||
           !!this.getFieldValue('stm-description') ||
           !!this.getFieldValue('stm-urgence') ||
           !!this.getFieldValue('stm-impact');
  }

  /**
   * Vérifie si les champs d'affectation sont remplis
   */
  checkAffectationFields() {
    return this.getSelectedQui().length > 0 ||
           this.getSelectedBureaux().length > 0 ||
           !!this.getFieldValue('stm-equipe');
  }

  /**
   * Vérifie si les champs de planification sont remplis
   */
  checkPlanningFields() {
    const hasDate = this.datePicker ?
      this.datePicker.selectedDates.length > 0 :
      !!this.getFieldValue('stm-echeance');

    return hasDate ||
           !!this.getFieldValue('stm-date-debut') ||
           !!this.getFieldValue('stm-duree-estimee') ||
           !!this.getFieldValue('stm-duree-reelle') ||
           this.jalons.length > 0;
  }

  /**
   * Vérifie si les champs d'organisation sont remplis
   */
  checkOrganizationFields() {
    return !!this.getFieldValue('stm-meo') ||
           !!this.getFieldValue('stm-projet') ||
           this.selectedStrategies.length > 0 ||
           this.taskLinks.length > 0;
  }

  /**
   * Vérifie si les champs avancés sont remplis
   */
  checkAdvancedFields() {
    return !!this.getFieldValue('stm-nature') ||
           !!this.getFieldValue('stm-genre') ||
           !!this.getFieldValue('stm-etape') ||
           !!this.getFieldValue('stm-references');
  }

  // === Timeline Visual ===

  /**
   * Met à jour la visualisation de la timeline
   */
  updateTimelineVisual() {
    const startPoint = document.getElementById('stm-timeline-start');
    const endPoint = document.getElementById('stm-timeline-end');
    const progress = document.getElementById('stm-timeline-progress');

    if (!startPoint || !endPoint || !progress) return;

    const dateDebut = this.getFieldValue('stm-date-debut');
    let dateEcheance = null;

    if (this.datePicker) {
      const dates = this.datePicker.selectedDates;
      if (dates.length > 0) dateEcheance = dates[0];
    } else {
      const val = this.getFieldValue('stm-echeance');
      if (val) dateEcheance = new Date(val);
    }

    // Mettre à jour les points
    startPoint.classList.toggle('has-date', !!dateDebut);
    endPoint.classList.toggle('has-date', !!dateEcheance);

    // Vérifier si en retard
    if (dateEcheance) {
      const now = new Date();
      endPoint.classList.toggle('overdue', dateEcheance < now);
    } else {
      endPoint.classList.remove('overdue');
    }

    // Calculer la progression si les deux dates sont définies
    if (dateDebut && dateEcheance) {
      const start = new Date(dateDebut);
      const end = dateEcheance;
      const now = new Date();

      const totalDuration = end - start;
      const elapsed = now - start;

      if (totalDuration > 0) {
        const pct = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
        progress.style.width = `${pct}%`;
      }
    } else {
      progress.style.width = '0%';
    }
  }

  // === Status Badge Update ===

  /**
   * Met à jour le badge de statut dans le header
   */
  updateStatusBadge() {
    const badge = document.getElementById('stm-status-badge');
    const select = document.getElementById('stm-statut');

    if (!badge || !select) return;

    const statut = select.value;
    const option = select.options[select.selectedIndex];
    const color = option?.dataset?.color || 'secondary';

    badge.className = `badge bg-${color}`;
    badge.textContent = statut;
  }

  // === Utilitaires ===

  setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.value = value || '';
    }
  }

  getFieldValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  showError(message) {
    // Afficher une alerte simple ou un toast
    alert(message);
  }
}

// Export pour ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SharedTaskModal;
}

// Exposer globalement
window.SharedTaskModal = SharedTaskModal;
