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
      gristManager: options.gristManager || null,
      containerId: options.containerId || 'shared-modal-container'
    };

    this.modal = null;
    this.bsModal = null;
    this.currentTask = null;
    this.isLoaded = false;

    // Données de référence
    this.programmes = [];
    this.agents = [];
    this.strategies = [];
    this.meos = []; // Mises en œuvre agrégées depuis les tâches
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
        keyboard: true
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
    if (typeof grist === 'undefined') {
      console.warn('[SharedTaskModal] Grist not available, skipping reference data');
      return;
    }

    try {
      // Charger les programmes
      await this.loadProgrammes();

      // Charger les agents
      await this.loadAgents();

      // Charger les stratégies
      await this.loadStrategies();

      // Charger les MEO (après les stratégies)
      await this.loadMeos();

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
   * Charge les agents depuis ConfigManager (personnes définies dans config.html)
   */
  async loadAgents() {
    try {
      // Essayer de charger depuis ConfigManager (localStorage)
      const configManager = window._configManagerInstance;
      if (configManager && typeof configManager.getPersonnes === 'function') {
        const personnes = configManager.getPersonnes();
        this.agents = personnes.map(p => ({
          id: p.id,
          nom: p.nom,
          bureau: p.bureau || '',
          fullName: p.nom // Dans ConfigManager, nom est déjà le nom complet
        }));
        console.log('[SharedTaskModal] Loaded', this.agents.length, 'agents from ConfigManager');
      } else {
        // Fallback: essayer de charger depuis localStorage directement
        const stored = localStorage.getItem('kanban_config');
        if (stored) {
          const config = JSON.parse(stored);
          if (config.personnes && Array.isArray(config.personnes)) {
            this.agents = config.personnes.map(p => ({
              id: p.id,
              nom: p.nom,
              bureau: p.bureau || '',
              fullName: p.nom
            }));
            console.log('[SharedTaskModal] Loaded', this.agents.length, 'agents from localStorage');
          }
        }
      }

      // Trier par bureau puis par nom
      this.agents.sort((a, b) => {
        if (a.bureau !== b.bureau) return (a.bureau || '').localeCompare(b.bureau || '');
        return (a.fullName || '').localeCompare(b.fullName || '');
      });

      this.populateAgentSelect();
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load agents:', error.message);
      this.agents = [];
    }
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
      this.meos.forEach(meo => {
        const strat = this.strategies.find(s => s.id === meo.strategie_id);
        if (strat) {
          meo.mission = strat.axe_strategique;
          meo.strategie = strat.sous_objectif;
          meo.programme = strat.objectif;
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

    if (selectedOption && selectedOption.value) {
      // Remplir les champs cachés
      this.setFieldValue('stm-meo-code', selectedOption.value);
      this.setFieldValue('stm-meo-nom', selectedOption.dataset.meoNom || '');
      this.setFieldValue('stm-strategie', selectedOption.dataset.strategieId || '');

      // Afficher les infos déduites
      document.getElementById('stm-programme-display').textContent = selectedOption.dataset.programme || '-';
      document.getElementById('stm-strategie-display').textContent = selectedOption.dataset.strategie || '-';
      document.getElementById('stm-mission-display').textContent = selectedOption.dataset.mission || '-';
      infoDiv.style.display = 'flex';
    } else {
      // Vider les champs
      this.setFieldValue('stm-meo-code', '');
      this.setFieldValue('stm-meo-nom', '');
      this.setFieldValue('stm-strategie', '');
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

    // Bouton Ajouter liaison
    const btnAddLink = document.getElementById('stm-btn-add-link');
    if (btnAddLink) {
      btnAddLink.addEventListener('click', () => this.handleAddLink());
    }

    // Fermeture de la modale
    if (this.modal) {
      this.modal.addEventListener('hidden.bs.modal', () => {
        this.currentTask = null;
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

    // Afficher le bouton supprimer pour les tâches existantes
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete && this.options.onDelete) {
      btnDelete.style.display = 'block';
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

    // Cacher le bouton supprimer
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete) {
      btnDelete.style.display = 'none';
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
    this.setFieldValue('stm-etape', task.etape_code);
    this.setFieldValue('stm-previsibilite', task.previsibilite);

    // Rattachement hiérarchique via MEO
    this.setFieldValue('stm-meo-code', task.mise_en_oeuvre_code || '');
    this.setFieldValue('stm-meo-nom', task.mise_en_oeuvre_nom || '');
    this.setFieldValue('stm-strategie', task.strategie_id || '');
    this.setFieldValue('stm-programme', task.programme_id || '');

    // Sélectionner la MEO dans le dropdown
    const meoSelect = document.getElementById('stm-meo');
    if (meoSelect && task.mise_en_oeuvre_code) {
      meoSelect.value = task.mise_en_oeuvre_code;
      this.handleMeoChange(); // Mettre à jour l'affichage
    } else if (meoSelect) {
      meoSelect.value = '';
      const infoDiv = document.getElementById('stm-hierarchy-info');
      if (infoDiv) infoDiv.style.display = 'none';
    }

    // Responsable (soit ID de Ssir_agents, soit texte legacy)
    if (task.responsable_id) {
      this.setFieldValue('stm-responsable', task.responsable_id);
    } else if (task.qui) {
      // Chercher l'agent par nom
      const agent = this.agents.find(a => a.fullName === task.qui);
      this.setFieldValue('stm-responsable', agent ? agent.id : '');
    }

    // Bureau
    this.setFieldValue('stm-bureau', task.bureau || '');

    // Échéance (conversion timestamp si nécessaire)
    if (task.date_echeance) {
      const date = typeof task.date_echeance === 'number'
        ? new Date(task.date_echeance * 1000)
        : new Date(task.date_echeance);
      if (!isNaN(date.getTime())) {
        this.setFieldValue('stm-echeance', date.toISOString().split('T')[0]);
      }
    }

    // Temps
    if (this.options.showTimes) {
      this.setFieldValue('stm-temps-estime', task.temps_estime || '');
      this.setFieldValue('stm-temps-reel', task.temps_reel || '');
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
  }

  /**
   * Récupère les données du formulaire
   */
  getFormData() {
    // Récupérer l'ID du responsable sélectionné
    const responsableIdStr = this.getFieldValue('stm-responsable');
    const responsableId = responsableIdStr ? parseInt(responsableIdStr, 10) : null;

    // Retrouver le nom de l'agent pour le champ legacy 'qui'
    let quiValue = '';
    if (responsableId) {
      const agent = this.agents.find(a => a.id === responsableId);
      if (agent) {
        quiValue = agent.fullName;
      } else {
        // Fallback: récupérer le texte de l'option sélectionnée
        const selectEl = document.getElementById('stm-responsable');
        if (selectEl && selectEl.selectedIndex >= 0) {
          const selectedOption = selectEl.options[selectEl.selectedIndex];
          quiValue = selectedOption.dataset.fullname || selectedOption.textContent.trim();
        }
      }
    }

    const data = {
      titre: this.getFieldValue('stm-titre'),
      description: this.getFieldValue('stm-description'),
      statut: this.getFieldValue('stm-statut'),
      qui: quiValue,
      bureau: this.getFieldValue('stm-bureau'),
      projet: this.getFieldValue('stm-projet'),
      urgence: this.getFieldValue('stm-urgence'),
      impact: this.getFieldValue('stm-impact'),
      nature_activite: this.getFieldValue('stm-nature'),
      genre_action: this.getFieldValue('stm-genre'),
      etape_code: this.getFieldValue('stm-etape'),
      previsibilite: this.getFieldValue('stm-previsibilite')
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
      data.est_classifiee = true; // Marquer comme classifiée si liée à une stratégie
    }

    const programmeIdStr = this.getFieldValue('stm-programme');
    if (programmeIdStr) {
      data.programme_id = parseInt(programmeIdStr, 10);
    }

    // Responsable (référence vers Ssir_agents)
    if (responsableId) {
      data.responsable_id = responsableId;
    }

    // Échéance
    const echeance = this.getFieldValue('stm-echeance');
    if (echeance) {
      data.date_echeance = Math.floor(new Date(echeance).getTime() / 1000);
    }

    // Temps
    if (this.options.showTimes) {
      const tempsEstime = parseFloat(this.getFieldValue('stm-temps-estime'));
      const tempsReel = parseFloat(this.getFieldValue('stm-temps-reel'));
      if (!isNaN(tempsEstime)) data.temps_estime = tempsEstime;
      if (!isNaN(tempsReel)) data.temps_reel = tempsReel;
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
