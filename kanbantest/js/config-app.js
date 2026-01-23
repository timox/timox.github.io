// === config-app.js ===
// Application pour la gestion des paramètres et constantes

import { initConfigManager, getConfigManager } from './managers/ConfigManager.js';
import { GristManager } from './managers/GristManager.js';

/**
 * Application de configuration
 */
class ConfigApp {
  constructor() {
    this.configManager = null;
    this.gristManager = null;
    this.currentTab = 'personnes';
  }

  /**
   * Initialise l'application
   */
  async init() {
    console.log('🚀 ConfigApp: Initializing...');

    // Initialiser le ConfigManager
    this.configManager = initConfigManager();

    // Initialiser le GristManager pour vérifier les usages
    this.gristManager = new GristManager(null);

    // Attendre que Grist soit prêt
    await this.waitForGrist();

    // Synchroniser la config depuis les données Grist existantes
    // (extrait bureaux, responsables)
    this.configManager.syncFromGrist(this.gristManager.currentRecords);

    await this.loadStrategiesFromGrist();
    this.projects = this.getProjectsFromGrist();

    // Charger l'interface
    this.setupEventListeners();
    this.loadAllData();
    this.updateFilters();
    this.updateStats();

    console.log('✅ ConfigApp: Ready');
  }

  /**
   * Attend que Grist soit prêt
   */
  async waitForGrist() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.gristManager.isConnected && this.gristManager.currentRecords.length >= 0) {
          console.log('✅ Grist ready:', this.gristManager.currentRecords.length, 'tâches');
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // === PERSONNES ===
    $('#btn-add-personne').on('click', (e) => {
      e.preventDefault();
      this.handleAddPersonne();
    });

    $(document).on('click', '.btn-delete-personne, .btn-delete-personne *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-delete-personne');
      const id = parseInt($btn.attr('data-id'));
      console.log('Delete personne clicked, id:', id, 'btn:', $btn.length);
      if (id) {
        this.handleDeletePersonne(id);
      }
    });

    // === BUREAUX ===
    $('#btn-add-bureau').on('click', (e) => {
      e.preventDefault();
      this.handleAddBureau();
    });

    $(document).on('click', '.btn-delete-bureau, .btn-delete-bureau *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-delete-bureau');
      const nom = $btn.attr('data-bureau');
      console.log('Delete bureau clicked, nom:', nom, 'btn:', $btn.length);
      if (nom) {
        this.handleDeleteBureau(nom);
      }
    });

    // === SERVICES ===
    $('#btn-add-service').on('click', (e) => {
      e.preventDefault();
      this.handleAddService();
    });

    $(document).on('click', '.btn-delete-service, .btn-delete-service *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-delete-service');
      const nom = $btn.attr('data-service');
      console.log('Delete service clicked, nom:', nom, 'btn:', $btn.length);
      if (nom) {
        this.handleDeleteService(nom);
      }
    });

    // === GROUPEMENTS ===
    $('#btn-add-groupement').on('click', (e) => {
      e.preventDefault();
      this.handleAddGroupement();
    });

    $(document).on('click', '.btn-delete-groupement, .btn-delete-groupement *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-delete-groupement');
      const nom = $btn.attr('data-groupement');
      console.log('Delete groupement clicked, nom:', nom, 'btn:', $btn.length);
      if (nom) {
        this.handleDeleteGroupement(nom);
      }
    });

    // === STRATÉGIES ===
    this.setupStrategieListeners();

    $(document).on('click', '.btn-delete-strategie, .btn-delete-strategie *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-delete-strategie');
      const id = parseInt($btn.attr('data-id'));
      if (id) {
        this.handleDeleteStrategie(id);
      }
    });

    $(document).on('click', '.btn-edit-strategie, .btn-edit-strategie *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-edit-strategie');
      const id = parseInt($btn.attr('data-id'));
      if (id) {
        this.handleEditStrategie(id);
      }
    });

    // === PROJETS ===
    $('#btn-add-projet').on('click', (e) => {
      e.preventDefault();
      this.handleAddProjet();
    });

    $(document).on('click', '.btn-delete-projet, .btn-delete-projet *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-delete-projet');
      const nom = $btn.attr('data-projet');
      console.log('Delete projet clicked, nom:', nom, 'btn:', $btn.length);
      if (nom) {
        this.handleDeleteProjet(nom);
      }
    });

    $(document).on('click', '.btn-edit-projet, .btn-edit-projet *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-edit-projet');
      const nom = $btn.attr('data-projet');
      if (nom) {
        this.handleEditProjet(nom);
      }
    });

    // === ACTIONS GLOBALES ===
    $('#btn-export-config').on('click', () => this.handleExport());
    $('#btn-import-config').on('click', () => $('#file-import').click());
    $('#file-import').on('change', (e) => this.handleImport(e));
    $('#btn-reset-config').on('click', () => this.handleReset());

    // === EXTRACTION SCHEMA GRIST ===
    $('#btn-extract-schema').on('click', () => this.handleExtractSchema());
    $('#btn-copy-schema').on('click', () => this.handleCopySchema());
    $('#btn-download-schema').on('click', () => this.handleDownloadSchema());

    // === ONGLETS ===
    $('button[data-bs-toggle="pill"]').on('shown.bs.tab', (e) => {
      this.currentTab = $(e.target).data('bs-target').replace('#', '');
    });

    // === ENTRÉE CLAVIER (Enter pour valider) ===
    $('#input-personne-nom').on('keypress', (e) => {
      if (e.which === 13) {
        e.preventDefault();
        this.handleAddPersonne();
      }
    });
    $('#input-bureau').on('keypress', (e) => {
      if (e.which === 13) {
        e.preventDefault();
        this.handleAddBureau();
      }
    });
    $('#input-service').on('keypress', (e) => {
      if (e.which === 13) {
        e.preventDefault();
        this.handleAddService();
      }
    });
    $('#input-groupement').on('keypress', (e) => {
      if (e.which === 13) {
        e.preventDefault();
        this.handleAddGroupement();
      }
    });
    $('#input-projet').on('keypress', (e) => {
      if (e.which === 13) {
        e.preventDefault();
        this.handleAddProjet();
      }
    });

    console.log('ConfigApp: Event listeners configured');
  }

  /**
   * Charge toutes les données
   */
  loadAllData() {
    this.renderPersonnes();
    this.renderBureaux();
    this.renderServices();
    this.renderGroupements();
    this.renderStrategies();
    this.renderProjets();
    this.renderPriorites();
    this.renderUrgences();
    this.renderImpacts();
  }

  // === PERSONNES ===

  handleAddPersonne() {
    const nom = $('#input-personne-nom').val();
    const bureau = $('#input-personne-bureau').val();
    const service = $('#input-personne-service').val();

    try {
      this.configManager.addPersonne({ nom, bureau, service });
      // Vider les champs
      $('#input-personne-nom').val('');
      $('#input-personne-bureau').val('');
      $('#input-personne-service').val('');
      this.renderPersonnes();
      this.updateStats();
      this.showSuccess('Personne ajoutée');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeletePersonne(id) {
    // Trouver le nom de la personne
    const personnes = this.configManager.getPersonnes();
    console.log('handleDeletePersonne - id reçu:', id, 'type:', typeof id);
    console.log('handleDeletePersonne - personnes:', personnes.map(p => ({ id: p.id, type: typeof p.id, nom: p.nom })));

    const personne = personnes.find(p => p.id === id);
    console.log('handleDeletePersonne - personne trouvée:', personne);

    if (!personne) {
      console.log('handleDeletePersonne - AUCUNE PERSONNE TROUVÉE!');
      return;
    }

    // Vérifier l'usage dans Grist (champ "qui")
    const usage = this.checkUsageInGrist('qui', personne.nom);
    console.log('handleDeletePersonne - usage pour', personne.nom, ':', usage);

    if (usage.count > 0) {
      await this.showImpactModal('Personne', personne.nom, usage);
      return;
    }

    if (confirm(`Supprimer la personne "${personne.nom}" ?`)) {
      this.configManager.deletePersonne(id);
      this.renderPersonnes();
      this.updateStats();
      this.showSuccess('Personne supprimée');
    }
  }

  renderPersonnes() {
    const personnes = this.configManager.getPersonnes();
    const $list = $('#list-personnes');

    if (personnes.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucune personne enregistrée</div>');
      return;
    }

    const html = personnes.map(p => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${this.escapeHtml(p.nom)}</strong>
          <div class="small text-muted">
            ${p.bureau ? `<span class="me-2"><i class="bi bi-building"></i> ${this.escapeHtml(p.bureau)}</span>` : ''}
            ${p.service ? `<span><i class="bi bi-briefcase"></i> ${this.escapeHtml(p.service)}</span>` : ''}
          </div>
        </div>
        <button class="btn btn-sm btn-outline-danger btn-delete-personne" data-id="${p.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');

    $list.html(html);
  }

  // === BUREAUX ===

  handleAddBureau() {
    const nom = $('#input-bureau').val();

    try {
      this.configManager.addBureau(nom);
      $('#input-bureau').val('');
      this.renderBureaux();
      this.updateStats();
      this.showSuccess('Bureau ajouté');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteBureau(nom) {
    // Vérifier l'usage dans Grist
    const usage = this.checkUsageInGrist('bureau', nom);

    if (usage.count > 0) {
      await this.showImpactModal('Bureau', nom, usage);
      return;
    }

    if (confirm(`Supprimer le bureau "${nom}" ?`)) {
      this.configManager.deleteBureau(nom);
      this.renderBureaux();
      this.updateStats();
      this.showSuccess('Bureau supprimé');
    }
  }

  renderBureaux() {
    const bureaux = this.configManager.getBureaux();
    this.renderSimpleList('#list-bureaux', bureaux, 'btn-delete-bureau', 'bureau');

    // Mettre à jour le select dans le formulaire personne
    const $select = $('#input-personne-bureau');
    $select.html('<option value="">Bureau...</option>' +
      bureaux.map(b => `<option value="${this.escapeHtml(b)}">${this.escapeHtml(b)}</option>`).join(''));
  }

  // === SERVICES ===

  handleAddService() {
    const nom = $('#input-service').val();

    try {
      this.configManager.addService(nom);
      $('#input-service').val('');
      this.renderServices();
      this.updateStats();
      this.showSuccess('Service ajouté');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteService(nom) {
    // Vérifier l'usage dans Grist
    const usage = this.checkUsageInGrist('service', nom);

    if (usage.count > 0) {
      await this.showImpactModal('Service', nom, usage);
      return;
    }

    if (confirm(`Supprimer le service "${nom}" ?`)) {
      this.configManager.deleteService(nom);
      this.renderServices();
      this.updateStats();
      this.showSuccess('Service supprimé');
    }
  }

  renderServices() {
    const services = this.configManager.getServices();
    this.renderSimpleList('#list-services', services, 'btn-delete-service', 'service');
  }

  // === GROUPEMENTS ===

  handleAddGroupement() {
    const nom = $('#input-groupement').val();

    try {
      this.configManager.addGroupement(nom);
      $('#input-groupement').val('');
      this.renderGroupements();
      this.updateStats();
      this.showSuccess('Groupement ajouté');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteGroupement(nom) {
    // Vérifier l'usage dans Grist
    const usage = this.checkUsageInGrist('groupement', nom);

    if (usage.count > 0) {
      await this.showImpactModal('Groupement', nom, usage);
      return;
    }

    if (confirm(`Supprimer le groupement "${nom}" ?`)) {
      this.configManager.deleteGroupement(nom);
      this.renderGroupements();
      this.updateStats();
      this.showSuccess('Groupement supprimé');
    }
  }

  renderGroupements() {
    const groupements = this.configManager.getGroupements();
    this.renderSimpleList('#list-groupements', groupements, 'btn-delete-groupement', 'groupement');
  }

  // === STRATÉGIES ===

  setupStrategieListeners() {
    // Modal save
    $('#btn-save-strategie').on('click', () => this.handleSaveStrategie());

    // Modal reset on open
    $('#modal-strategie').on('show.bs.modal', (e) => {
      if (!$(e.relatedTarget).data('id')) {
        this.resetStrategieForm();
      }
    });

    // Filters
    $('#filter-programme').on('change', () => this.renderStrategies());
    $('#filter-strategie').on('change', () => this.renderStrategies());
    $('#filter-search').on('input', () => this.renderStrategies());
  }

  resetStrategieForm() {
    $('#strategie-id').val('');
    $('#input-strategie-objectif').val('');
    $('#input-strategie-sous-objectif').val('');
    $('#input-strategie-axe').val('');
    $('#input-strategie-responsable').val('');
    $('#input-strategie-echeance').val('');
    $('#input-strategie-portee').val('');
    $('#modal-strategie-title').html('<i class="bi bi-bullseye me-2"></i>Nouvelle entrée stratégique');
  }

  handleEditStrategie(id) {
    const strategie = (this.strategies || []).find(s => s.id === id);
    if (!strategie) return;

    $('#strategie-id').val(id);
    $('#input-strategie-objectif').val(strategie.objectif || '');
    $('#input-strategie-sous-objectif').val(strategie.sous_objectif || '');
    $('#input-strategie-axe').val(strategie.axe_strategique || '');
    $('#input-strategie-responsable').val(strategie.responsable || '');
    $('#input-strategie-echeance').val(strategie.echeance || '');
    $('#input-strategie-portee').val(strategie.portee || '');
    $('#modal-strategie-title').html('<i class="bi bi-pencil me-2"></i>Modifier l\'entrée stratégique');

    const modal = new bootstrap.Modal($('#modal-strategie')[0]);
    modal.show();
  }

  async handleSaveStrategie() {
    const id = $('#strategie-id').val();
    const objectif = $('#input-strategie-objectif').val().trim();
    const sousObjectif = $('#input-strategie-sous-objectif').val().trim();
    const axeStrategique = $('#input-strategie-axe').val().trim();
    const responsable = $('#input-strategie-responsable').val().trim();
    const echeance = $('#input-strategie-echeance').val();
    const portee = $('#input-strategie-portee').val();

    if (!objectif) {
      this.showError('Le programme (objectif) est obligatoire');
      return;
    }
    if (!axeStrategique) {
      this.showError('La mission (axe stratégique) est obligatoire');
      return;
    }

    const data = {
      objectif,
      sous_objectif: sousObjectif,
      axe_strategique: axeStrategique,
      responsable,
      echeance: echeance || null,
      portee
    };

    try {
      if (id) {
        // Update
        await window.grist.docApi.applyUserActions([
          ['UpdateRecord', 'Ssir_strategie2', parseInt(id), data]
        ]);
        this.showSuccess('Entrée mise à jour');
      } else {
        // Create
        await window.grist.docApi.applyUserActions([
          ['AddRecord', 'Ssir_strategie2', null, data]
        ]);
        this.showSuccess('Entrée ajoutée');
      }

      bootstrap.Modal.getInstance($('#modal-strategie')[0]).hide();
      await this.loadStrategiesFromGrist();
      this.renderStrategies();
      this.updateFilters();
      this.updateStats();
    } catch (error) {
      this.showError('Erreur: ' + error.message);
    }
  }

  async handleDeleteStrategie(id) {
    const strategie = (this.strategies || []).find(s => s.id === id);
    if (!strategie) return;

    // Check if any tasks are linked to this strategy
    const linkedTasks = (this.gristManager.currentRecords || []).filter(
      t => t.strategie_id === id
    );

    if (linkedTasks.length > 0) {
      this.showError(`Impossible de supprimer: ${linkedTasks.length} tâche(s) rattachée(s) à cette mission`);
      return;
    }

    const label = `${strategie.objectif} → ${strategie.sous_objectif || '(pas de stratégie)'} → ${strategie.axe_strategique}`;
    if (!confirm(`Supprimer cette entrée ?\n\n${label}`)) return;

    try {
      await window.grist.docApi.applyUserActions([
        ['RemoveRecord', 'Ssir_strategie2', id]
      ]);
      await this.loadStrategiesFromGrist();
      this.renderStrategies();
      this.updateFilters();
      this.updateStats();
      this.showSuccess('Entrée supprimée');
    } catch (error) {
      this.showError('Suppression impossible: ' + error.message);
    }
  }

  updateFilters() {
    const strategies = this.strategies || [];

    // Programmes uniques
    const programmes = [...new Set(strategies.map(s => s.objectif).filter(Boolean))].sort();
    $('#filter-programme').html(
      '<option value="">Tous les programmes</option>' +
      programmes.map(p => `<option value="${this.escapeHtml(p)}">${this.escapeHtml(p)}</option>`).join('')
    );

    // Stratégies uniques
    const strategiesUniques = [...new Set(strategies.map(s => s.sous_objectif).filter(Boolean))].sort();
    $('#filter-strategie').html(
      '<option value="">Toutes les stratégies</option>' +
      strategiesUniques.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join('')
    );

    // Datalists pour l'autocomplétion
    $('#list-programmes-existants').html(
      programmes.map(p => `<option value="${this.escapeHtml(p)}">`).join('')
    );
    $('#list-strategies-existantes').html(
      strategiesUniques.map(s => `<option value="${this.escapeHtml(s)}">`).join('')
    );

    // Responsables (depuis les personnes)
    const personnes = this.configManager.getPersonnes();
    $('#list-responsables').html(
      personnes.map(p => `<option value="${this.escapeHtml(p.nom)}">`).join('')
    );
  }

  renderStrategies() {
    const allStrategies = this.strategies || [];
    const $list = $('#list-strategies');

    // Apply filters
    const filterProgramme = $('#filter-programme').val();
    const filterStrategie = $('#filter-strategie').val();
    const filterSearch = $('#filter-search').val().toLowerCase();

    let filtered = allStrategies;
    if (filterProgramme) {
      filtered = filtered.filter(s => s.objectif === filterProgramme);
    }
    if (filterStrategie) {
      filtered = filtered.filter(s => s.sous_objectif === filterStrategie);
    }
    if (filterSearch) {
      filtered = filtered.filter(s =>
        (s.objectif || '').toLowerCase().includes(filterSearch) ||
        (s.sous_objectif || '').toLowerCase().includes(filterSearch) ||
        (s.axe_strategique || '').toLowerCase().includes(filterSearch) ||
        (s.responsable || '').toLowerCase().includes(filterSearch)
      );
    }

    $('#count-strategies').text(`${filtered.length}/${allStrategies.length}`);

    if (filtered.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucune entrée trouvée</div>');
      return;
    }

    // Group by Programme
    const grouped = {};
    filtered.forEach(s => {
      const prog = s.objectif || '(Sans programme)';
      if (!grouped[prog]) grouped[prog] = {};
      const strat = s.sous_objectif || '(Sans stratégie)';
      if (!grouped[prog][strat]) grouped[prog][strat] = [];
      grouped[prog][strat].push(s);
    });

    // Count linked tasks
    const taskCounts = {};
    (this.gristManager.currentRecords || []).forEach(t => {
      if (t.strategie_id) {
        taskCounts[t.strategie_id] = (taskCounts[t.strategie_id] || 0) + 1;
      }
    });

    let html = '';
    Object.keys(grouped).sort().forEach(prog => {
      html += `
        <div class="card mb-2">
          <div class="card-header bg-primary bg-opacity-10 py-2">
            <strong><i class="bi bi-folder me-1"></i>${this.escapeHtml(prog)}</strong>
          </div>
          <div class="card-body p-2">
      `;

      Object.keys(grouped[prog]).sort().forEach(strat => {
        html += `
          <div class="ms-2 mb-2">
            <div class="text-muted small mb-1">
              <i class="bi bi-diagram-2 me-1"></i>${this.escapeHtml(strat)}
            </div>
        `;

        grouped[prog][strat].forEach(s => {
          const taskCount = taskCounts[s.id] || 0;
          const badgeClass = taskCount > 0 ? 'bg-success' : 'bg-secondary';

          html += `
            <div class="d-flex justify-content-between align-items-center bg-light rounded p-2 mb-1 ms-3">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center">
                  <i class="bi bi-bullseye me-2 text-primary"></i>
                  <strong>${this.escapeHtml(s.axe_strategique)}</strong>
                  <span class="badge ${badgeClass} ms-2" title="Tâches rattachées">
                    <i class="bi bi-list-task me-1"></i>${taskCount}
                  </span>
                </div>
                <div class="small text-muted mt-1">
                  ${s.responsable ? `<span class="me-3"><i class="bi bi-person"></i> ${this.escapeHtml(s.responsable)}</span>` : ''}
                  ${s.echeance ? `<span class="me-3"><i class="bi bi-calendar"></i> ${this.escapeHtml(s.echeance)}</span>` : ''}
                  ${s.portee ? `<span><i class="bi bi-geo-alt"></i> ${this.escapeHtml(s.portee)}</span>` : ''}
                </div>
              </div>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-secondary btn-edit-strategie" data-id="${s.id}" title="Modifier">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete-strategie" data-id="${s.id}" title="Supprimer">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          `;
        });

        html += '</div>';
      });

      html += '</div></div>';
    });

    $list.html(html);
  }

  // === PROJETS ===

  handleAddProjet() {
    const nom = $('#input-projet').val();

    try {
      this.addProjetToGrist(nom);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteProjet(nom) {
    // Vérifier l'usage dans Grist
    const usage = this.checkUsageInGrist('projet', nom);

    if (usage.count > 0) {
      await this.showImpactModal('Projet', nom, usage);
      return;
    }

    if (!confirm(`Supprimer le projet "${nom}" ?`)) return;

    await this.bulkUpdateProjects(nom, '');
    this.projects = this.getProjectsFromGrist();
    this.renderProjets();
    this.updateStats();
    this.showSuccess('Projet supprimé');
  }

  async handleEditProjet(nom) {
    const nouveauNom = prompt('Nouveau nom du projet', nom);
    if (nouveauNom === null) return;
    const trimmed = nouveauNom.trim();
    if (!trimmed) {
      this.showError('Le nom du projet est obligatoire');
      return;
    }
    await this.bulkUpdateProjects(nom, trimmed);
    this.projects = this.getProjectsFromGrist();
    this.renderProjets();
    this.updateStats();
    this.showSuccess('Projet mis à jour');
  }

  renderProjets() {
    const projets = this.projects || [];
    const $list = $('#list-projets');
    $('#count-projets').text(projets.length);

    if (projets.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucun projet enregistré</div>');
      return;
    }

    const html = projets.map(projet => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <span>${this.escapeHtml(projet)}</span>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-secondary btn-edit-projet" data-projet="${this.escapeHtml(projet)}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete-projet" data-projet="${this.escapeHtml(projet)}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    $list.html(html);
  }

  async loadStrategiesFromGrist() {
    try {
      const data = await window.grist.docApi.fetchTable('Ssir_strategie2');
      this.strategies = [];
      // Utiliser id2 car c'est le seul champ id disponible dans cette table
      if (!data?.id2) return;
      const count = data.id2.length;
      for (let i = 0; i < count; i++) {
        this.strategies.push({
          id: data.id2[i],
          objectif: data.objectif?.[i] || '',
          sous_objectif: data.sous_objectif?.[i] || '',
          axe_strategique: data.axe_strategique?.[i] || '',
          responsable: data.responsable?.[i] || '',
          echeance: data.echeance?.[i] || '',
          portee: data.portee?.[i] || ''
        });
      }
      $('#count-strategies').text(this.strategies.length);
    } catch (error) {
      console.warn('Chargement stratégies impossible:', error.message);
      this.strategies = [];
    }
  }

  getProjectsFromGrist() {
    const projects = new Set();
    (this.gristManager.currentRecords || []).forEach(record => {
      if (record.projet) {
        projects.add(String(record.projet).trim());
      }
    });
    return Array.from(projects).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }

  async addProjetToGrist(nom) {
    const trimmed = (nom || '').trim();
    if (!trimmed) throw new Error('Le nom du projet est obligatoire');
    if ((this.projects || []).includes(trimmed)) {
      throw new Error('Ce projet existe déjà');
    }
    this.projects = [...(this.projects || []), trimmed].sort();
    $('#input-projet').val('');
    this.renderProjets();
    this.updateStats();
    this.showSuccess('Projet ajouté (liste locale)');
  }

  async bulkUpdateProjects(oldValue, newValue) {
    const updates = [];
    (this.gristManager.currentRecords || []).forEach(record => {
      if (record.projet === oldValue) {
        updates.push(['UpdateRecord', 'Ssir_principale_task', record.id, { projet: newValue }]);
      }
    });
    if (updates.length > 0) {
      await window.grist.docApi.applyUserActions(updates);
    }
  }

  // === PRIORITÉS, URGENCES, IMPACTS (lecture seule) ===

  renderPriorites() {
    const priorites = this.configManager.getPriorites();
    this.renderReadOnlyList('#list-priorites', priorites);
  }

  renderUrgences() {
    const urgences = this.configManager.getUrgences();
    this.renderReadOnlyList('#list-urgences', urgences);
  }

  renderImpacts() {
    const impacts = this.configManager.getImpacts();
    this.renderReadOnlyList('#list-impacts', impacts);
  }

  // === VÉRIFICATION D'USAGE ===

  /**
   * Vérifie l'usage d'une valeur dans les tâches Grist
   * @param {string} field - Champ à vérifier (bureau, service, projet, qui)
   * @param {string} value - Valeur à rechercher
   * @returns {Object} {count, tasks}
   */
  checkUsageInGrist(field, value) {
    const tasks = this.gristManager.currentRecords || [];

    // Fonction pour vérifier si une valeur est présente dans un champ
    // Gère les ChoiceList (['L', 'val1', 'val2']) et les strings simples
    const fieldContainsValue = (taskFieldValue, searchValue) => {
      if (!taskFieldValue) return false;

      // Si c'est un tableau (ChoiceList Grist format ['L', ...])
      if (Array.isArray(taskFieldValue)) {
        // Ignorer le 'L' au début et chercher dans le reste
        return taskFieldValue.slice(1).includes(searchValue);
      }

      // Comparaison string simple
      return taskFieldValue === searchValue;
    };

    const impactedTasks = tasks.filter(task => fieldContainsValue(task[field], value));

    return {
      count: impactedTasks.length,
      tasks: impactedTasks.slice(0, 10), // Limiter à 10 pour l'affichage
      totalCount: impactedTasks.length
    };
  }

  /**
   * Affiche un modal avec l'impact de la suppression
   * @param {string} type - Type d'élément (Bureau, Service, etc.)
   * @param {string} value - Valeur à supprimer
   * @param {Object} usage - Résultat de checkUsageInGrist
   */
  async showImpactModal(type, value, usage) {
    const modalHtml = `
      <div class="modal fade" id="modal-impact" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-warning">
              <h5 class="modal-title">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Suppression impossible
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning">
                <strong>${type} "${this.escapeHtml(value)}"</strong> est utilisé par <strong>${usage.count} tâche(s)</strong> dans Grist.
              </div>

              <p class="mb-3">
                Vous devez d'abord modifier ou supprimer ces tâches avant de pouvoir supprimer ce ${type.toLowerCase()}.
              </p>

              <h6 class="mb-2">Tâches impactées ${usage.totalCount > 10 ? `(10 premières sur ${usage.totalCount})` : ''}:</h6>
              <div class="list-group">
                ${usage.tasks.map(task => `
                  <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>${this.escapeHtml(task.titre || 'Sans titre')}</strong>
                        <div class="small text-muted">
                          <span class="badge bg-secondary">${this.escapeHtml(task.statut || 'N/A')}</span>
                          ${task.qui ? `<span class="ms-2"><i class="bi bi-person"></i> ${this.escapeHtml(task.qui)}</span>` : ''}
                          ${task.projet ? `<span class="ms-2"><i class="bi bi-folder"></i> ${this.escapeHtml(task.projet)}</span>` : ''}
                        </div>
                      </div>
                      <span class="badge bg-light text-dark">#${task.id}</span>
                    </div>
                  </div>
                `).join('')}
              </div>

              ${usage.totalCount > 10 ? `
                <div class="alert alert-info mt-3">
                  <i class="bi bi-info-circle me-2"></i>
                  ${usage.totalCount - 10} autre(s) tâche(s) utilisent également ce ${type.toLowerCase()}.
                </div>
              ` : ''}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              <a href="index.html" class="btn btn-primary">
                <i class="bi bi-kanban me-1"></i>Aller au Kanban
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    // Supprimer le modal existant si présent
    $('#modal-impact').remove();

    // Ajouter et afficher le nouveau modal
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal($('#modal-impact')[0]);
    modal.show();

    // Nettoyer après fermeture
    $('#modal-impact').on('hidden.bs.modal', () => {
      $('#modal-impact').remove();
    });
  }

  // === HELPERS ===

  renderSimpleList(selector, items, deleteClass, dataAttr) {
    const $list = $(selector);

    if (items.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucun élément</div>');
      return;
    }

    const html = items.map(item => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <span>${this.escapeHtml(item)}</span>
        <button class="btn btn-sm btn-outline-danger ${deleteClass}" data-${dataAttr}="${this.escapeHtml(item)}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');

    $list.html(html);
  }

  renderReadOnlyList(selector, items) {
    const $list = $(selector);

    if (items.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucun élément</div>');
      return;
    }

    const html = items.map(item => `
      <div class="list-group-item">
        <span>${this.escapeHtml(item)}</span>
      </div>
    `).join('');

    $list.html(html);
  }

  /**
   * Met à jour les statistiques
   */
  updateStats() {
    const stats = this.configManager.getStats();

    $('#stat-personnes').text(stats.personnes);
    $('#stat-bureaux').text(stats.bureaux);
    $('#stat-services').text(stats.services);
    $('#stat-groupements').text(stats.groupements);
    $('#stat-strategies').text((this.strategies || []).length);
    $('#stat-projets').text((this.projects || []).length);
  }

  // === EXPORT / IMPORT / RESET ===

  handleExport() {
    try {
      const json = this.configManager.exportConfig();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `kanban-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this.showSuccess('Configuration exportée');
    } catch (error) {
      this.showError('Erreur lors de l\'export');
    }
  }

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        this.configManager.importConfig(evt.target.result);
        this.loadAllData();
        this.updateStats();
        this.showSuccess('Configuration importée');
        $('#file-import').val('');
      } catch (error) {
        this.showError(error.message);
      }
    };
    reader.readAsText(file);
  }

  handleReset() {
    if (confirm('⚠️ Réinitialiser TOUTE la configuration ?\n\nCette action est irréversible !')) {
      this.configManager.reset();
      this.loadAllData();
      this.updateStats();
      this.showSuccess('Configuration réinitialisée');
    }
  }

  // === EXTRACTION SCHEMA GRIST ===

  /**
   * Extrait la structure complète des tables Grist
   */
  async handleExtractSchema() {
    const modal = new bootstrap.Modal($('#schema-modal')[0]);
    modal.show();

    // Reset UI
    $('#schema-loading').show();
    $('#schema-content').hide();
    $('#schema-error').hide();

    try {
      const schema = await this.extractGristSchema();
      this.currentSchema = schema;

      // Render visual
      this.renderSchemaVisual(schema);

      // Render JSON
      const jsonStr = JSON.stringify(schema, null, 2);
      $('#schema-json-code').text(jsonStr);

      // Render Markdown
      const markdown = this.schemaToMarkdown(schema);
      $('#schema-markdown-code').text(markdown);

      $('#schema-loading').hide();
      $('#schema-content').show();

    } catch (error) {
      console.error('Erreur extraction schema:', error);
      $('#schema-loading').hide();
      $('#schema-error').text(`Erreur: ${error.message}`).show();
    }
  }

  /**
   * Extrait le schema depuis l'API Grist
   */
  async extractGristSchema() {
    const grist = window.grist;
    if (!grist) {
      throw new Error('API Grist non disponible');
    }

    const schema = {
      extractedAt: new Date().toISOString(),
      tables: {}
    };

    // Liste des tables connues à explorer
    const knownTables = [
      'Ssir_principale_task',
      'Ssir_strategie2',
      'Ssir_type_task'
    ];

    for (const tableId of knownTables) {
      try {
        const tableData = await grist.docApi.fetchTable(tableId);

        if (tableData && typeof tableData === 'object') {
          const columns = {};
          const sampleValues = {};

          for (const [colName, values] of Object.entries(tableData)) {
            if (colName === 'id' || colName === 'manualSort') continue;

            // Analyser les valeurs pour déterminer le type
            const colInfo = this.analyzeColumn(colName, values);
            columns[colName] = colInfo;

            // Garder quelques valeurs d'exemple (uniques, non nulles)
            const uniqueValues = [...new Set(values.filter(v => v !== null && v !== '' && v !== undefined))];
            sampleValues[colName] = uniqueValues.slice(0, 5);
          }

          schema.tables[tableId] = {
            rowCount: tableData.id ? tableData.id.length : 0,
            columns: columns,
            sampleValues: sampleValues
          };
        }
      } catch (error) {
        console.warn(`Table ${tableId} non accessible:`, error.message);
        schema.tables[tableId] = { error: error.message };
      }
    }

    return schema;
  }

  /**
   * Analyse une colonne pour déterminer son type et ses caractéristiques
   */
  analyzeColumn(colName, values) {
    const info = {
      name: colName,
      type: 'unknown',
      nullable: false,
      isReference: false,
      isList: false,
      uniqueCount: 0
    };

    if (!values || values.length === 0) {
      info.type = 'empty';
      return info;
    }

    // Vérifier les nulls
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    info.nullable = nonNullValues.length < values.length;
    info.uniqueCount = new Set(nonNullValues).size;

    if (nonNullValues.length === 0) {
      info.type = 'null';
      return info;
    }

    // Analyser le premier non-null
    const sample = nonNullValues[0];

    // Détecter les listes Grist ['L', ...]
    if (Array.isArray(sample) && sample[0] === 'L') {
      info.type = 'ChoiceList';
      info.isList = true;
      // Extraire toutes les valeurs possibles
      const allChoices = new Set();
      nonNullValues.forEach(arr => {
        if (Array.isArray(arr)) {
          arr.slice(1).forEach(v => allChoices.add(v));
        }
      });
      info.choices = [...allChoices].sort();
      return info;
    }

    // Détecter les références Grist [type, id]
    if (Array.isArray(sample) && sample.length === 2 && typeof sample[1] === 'number') {
      info.type = 'Reference';
      info.isReference = true;
      info.refTable = sample[0];
      return info;
    }

    // Types de base
    if (typeof sample === 'number') {
      // Distinguer Int et Date (timestamps)
      if (Number.isInteger(sample) && sample > 1000000000 && sample < 2000000000) {
        info.type = 'Date';
      } else if (Number.isInteger(sample)) {
        info.type = 'Int';
      } else {
        info.type = 'Numeric';
      }
      return info;
    }

    if (typeof sample === 'boolean') {
      info.type = 'Bool';
      return info;
    }

    if (typeof sample === 'string') {
      // Vérifier si c'est un Choice (peu de valeurs uniques)
      if (info.uniqueCount <= 20 && values.length > 20) {
        info.type = 'Choice';
        info.choices = [...new Set(nonNullValues)].filter(v => v).sort();
      } else if (sample.includes('\n') || sample.length > 200) {
        info.type = 'Text (long)';
      } else {
        info.type = 'Text';
      }
      return info;
    }

    return info;
  }

  /**
   * Affiche le schema de manière visuelle
   */
  renderSchemaVisual(schema) {
    const $container = $('#schema-visual');
    let html = '';

    for (const [tableName, tableInfo] of Object.entries(schema.tables)) {
      if (tableInfo.error) {
        html += `
          <div class="card mb-3 border-danger">
            <div class="card-header bg-danger text-white">
              <i class="bi bi-table me-2"></i>${tableName}
              <span class="badge bg-light text-danger ms-2">Erreur</span>
            </div>
            <div class="card-body">
              <p class="text-danger mb-0">${tableInfo.error}</p>
            </div>
          </div>
        `;
        continue;
      }

      html += `
        <div class="card mb-3">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-table me-2"></i>${tableName}
            <span class="badge bg-light text-primary ms-2">${tableInfo.rowCount} lignes</span>
            <span class="badge bg-light text-primary ms-1">${Object.keys(tableInfo.columns).length} colonnes</span>
          </div>
          <div class="card-body p-0">
            <table class="table table-sm table-striped mb-0">
              <thead class="table-light">
                <tr>
                  <th>Colonne</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Valeurs uniques</th>
                  <th>Exemples</th>
                </tr>
              </thead>
              <tbody>
      `;

      for (const [colName, colInfo] of Object.entries(tableInfo.columns)) {
        const samples = tableInfo.sampleValues[colName] || [];
        const sampleStr = samples.slice(0, 3).map(v => {
          if (Array.isArray(v)) return JSON.stringify(v);
          if (typeof v === 'string' && v.length > 30) return v.substring(0, 30) + '...';
          return String(v);
        }).join(', ');

        let typeClass = 'secondary';
        if (colInfo.isReference) typeClass = 'info';
        if (colInfo.isList) typeClass = 'warning';
        if (colInfo.type === 'Choice') typeClass = 'success';

        html += `
          <tr>
            <td><code>${colName}</code></td>
            <td>
              <span class="badge bg-${typeClass}">${colInfo.type}</span>
              ${colInfo.isReference ? `<small class="text-muted ms-1">→ ${colInfo.refTable}</small>` : ''}
            </td>
            <td>${colInfo.nullable ? '<i class="bi bi-check text-success"></i>' : '<i class="bi bi-x text-danger"></i>'}</td>
            <td>${colInfo.uniqueCount}</td>
            <td><small class="text-muted">${this.escapeHtml(sampleStr)}</small></td>
          </tr>
        `;

        // Afficher les choices si applicable
        if (colInfo.choices && colInfo.choices.length > 0) {
          html += `
            <tr class="table-light">
              <td colspan="5" class="ps-4">
                <small class="text-muted">Valeurs possibles: </small>
                ${colInfo.choices.slice(0, 10).map(c => `<span class="badge bg-light text-dark me-1">${this.escapeHtml(c)}</span>`).join('')}
                ${colInfo.choices.length > 10 ? `<span class="text-muted">... +${colInfo.choices.length - 10}</span>` : ''}
              </td>
            </tr>
          `;
        }
      }

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    $container.html(html);
  }

  /**
   * Convertit le schema en Markdown
   */
  schemaToMarkdown(schema) {
    let md = `# Schema Grist\n\nExtrait le: ${schema.extractedAt}\n\n`;

    for (const [tableName, tableInfo] of Object.entries(schema.tables)) {
      md += `## ${tableName}\n\n`;

      if (tableInfo.error) {
        md += `**Erreur:** ${tableInfo.error}\n\n`;
        continue;
      }

      md += `- **Lignes:** ${tableInfo.rowCount}\n`;
      md += `- **Colonnes:** ${Object.keys(tableInfo.columns).length}\n\n`;

      md += `| Colonne | Type | Nullable | Uniques |\n`;
      md += `|---------|------|----------|--------|\n`;

      for (const [colName, colInfo] of Object.entries(tableInfo.columns)) {
        let typeStr = colInfo.type;
        if (colInfo.isReference) typeStr += ` → ${colInfo.refTable}`;
        md += `| \`${colName}\` | ${typeStr} | ${colInfo.nullable ? 'Oui' : 'Non'} | ${colInfo.uniqueCount} |\n`;
      }

      md += `\n`;

      // Détailler les choices
      for (const [colName, colInfo] of Object.entries(tableInfo.columns)) {
        if (colInfo.choices && colInfo.choices.length > 0) {
          md += `### ${colName} (valeurs)\n\n`;
          md += colInfo.choices.map(c => `- ${c}`).join('\n');
          md += `\n\n`;
        }
      }
    }

    return md;
  }

  /**
   * Copie le schema JSON dans le presse-papier
   */
  handleCopySchema() {
    if (!this.currentSchema) return;

    const json = JSON.stringify(this.currentSchema, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      this.showSuccess('Schema copié dans le presse-papier');
    }).catch(err => {
      this.showError('Erreur lors de la copie');
    });
  }

  /**
   * Télécharge le schema en JSON
   */
  handleDownloadSchema() {
    if (!this.currentSchema) return;

    const json = JSON.stringify(this.currentSchema, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `grist-schema-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    this.showSuccess('Schema téléchargé');
  }

  // === NOTIFICATIONS ===

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showError(message) {
    this.showToast(message, 'danger');
  }

  showToast(message, type = 'info') {
    const toastHtml = `
      <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">
            ${this.escapeHtml(message)}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;

    const $toast = $(toastHtml);
    $('#toast-container').append($toast);

    const toast = new bootstrap.Toast($toast[0], { delay: 3000 });
    toast.show();

    $toast.on('hidden.bs.toast', () => $toast.remove());
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// === INITIALISATION ===

$(document).ready(() => {
  const app = new ConfigApp();
  app.init();
});
