// === config-app.js ===
// Application pour la gestion des parametres et constantes

import { initConfigManager, getConfigManager } from './managers/ConfigManager.js';
import { GristManager } from './managers/GristManager.js';
import { NATURE_ACTIVITE, GENRE_ACTION, ETAPE_CYCLE } from './config/constants.js';

/**
 * Application de configuration
 */
class ConfigApp {
  constructor() {
    this.configManager = null;
    this.gristManager = null;
    this.currentTab = 'agents';
    this.editingTemplateId = null;
  }

  /**
   * Initialise l'application
   */
  async init() {
    console.log('ConfigApp: Initializing...');

    // Initialiser le ConfigManager
    this.configManager = initConfigManager();

    // Initialiser le GristManager pour verifier les usages
    this.gristManager = new GristManager(null);

    // Attendre que Grist soit pret
    await this.waitForGrist();

    // Charger l'interface
    this.setupEventListeners();
    this.loadAllData();
    this.updateStats();

    console.log('ConfigApp: Ready');
  }

  /**
   * Attend que Grist soit pret
   */
  async waitForGrist() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.gristManager.isConnected && this.gristManager.currentRecords.length >= 0) {
          console.log('Grist ready:', this.gristManager.currentRecords.length, 'taches');
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  /**
   * Configure les ecouteurs d'evenements
   */
  setupEventListeners() {
    // === AGENTS ===
    $('#btn-add-personne').on('click', () => this.handleAddPersonne());
    $('#input-personne-prenom').on('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddPersonne();
    });

    $(document).on('click', '.btn-edit-personne', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.openEditPersonneModal(id);
    });

    $(document).on('click', '.btn-delete-personne', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeletePersonne(id);
    });

    $('#btn-save-personne').on('click', () => this.handleSavePersonne());

    // === BUREAUX ===
    $('#btn-add-bureau').on('click', () => this.handleAddBureau());
    $('#input-bureau').on('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddBureau();
    });

    $(document).on('click', '.btn-delete-bureau', (e) => {
      const nom = $(e.currentTarget).data('bureau');
      this.handleDeleteBureau(nom);
    });

    // === SERVICES ===
    $('#btn-add-service').on('click', () => this.handleAddService());
    $('#input-service').on('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddService();
    });

    $(document).on('click', '.btn-delete-service', (e) => {
      const nom = $(e.currentTarget).data('service');
      this.handleDeleteService(nom);
    });

    // === GROUPEMENTS ===
    $('#btn-add-groupement').on('click', () => this.handleAddGroupement());
    $('#input-groupement').on('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddGroupement();
    });

    $(document).on('click', '.btn-delete-groupement', (e) => {
      const nom = $(e.currentTarget).data('groupement');
      this.handleDeleteGroupement(nom);
    });

    // === STRATEGIES ===
    $('#btn-add-strategie').on('click', () => this.handleAddStrategie());
    $('#input-strategie-code').on('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddStrategie();
    });

    $(document).on('click', '.btn-edit-strategie', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.openEditStrategieModal(id);
    });

    $(document).on('click', '.btn-delete-strategie', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeleteStrategie(id);
    });

    $('#btn-save-strategie').on('click', () => this.handleSaveStrategie());

    // === TEMPLATES ===
    $('#btn-add-template').on('click', () => this.openEditTemplateModal(null));
    $('#btn-load-example-templates').on('click', () => this.handleLoadExampleTemplates());

    $(document).on('click', '.btn-edit-template', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.openEditTemplateModal(id);
    });

    $(document).on('click', '.btn-delete-template', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeleteTemplate(id);
    });

    $(document).on('click', '#btn-add-template-tache', () => this.addTemplateTacheRow());

    $(document).on('click', '.btn-remove-tache', (e) => {
      $(e.currentTarget).closest('.template-tache-item').remove();
    });

    $('#btn-save-template').on('click', () => this.handleSaveTemplate());

    // === ACTIONS GLOBALES ===
    $('#btn-export-config').on('click', () => this.handleExport());
    $('#btn-import-config').on('click', () => $('#file-import').click());
    $('#file-import').on('change', (e) => this.handleImport(e));
    $('#btn-reset-config').on('click', () => this.handleReset());
    $('#btn-extract-schema').on('click', () => this.handleExtractSchema());
    $('#btn-copy-schema').on('click', () => this.handleCopySchema());
    $('#btn-download-schema').on('click', () => this.handleDownloadSchema());

    // === ONGLETS ===
    $('button[data-bs-toggle="pill"]').on('shown.bs.tab', (e) => {
      this.currentTab = $(e.target).data('bs-target').replace('#', '');
    });
  }

  /**
   * Charge toutes les donnees
   */
  loadAllData() {
    this.renderPersonnes();
    this.renderBureaux();
    this.renderServices();
    this.renderGroupements();
    this.renderStrategies();
    this.renderTemplates();
    this.populateSelects();
  }

  /**
   * Remplit les selects avec les donnees
   */
  populateSelects() {
    const bureaux = this.configManager.getBureaux();
    const services = this.configManager.getServices();
    const groupements = this.configManager.getGroupements();

    // Selects pour ajout personne
    const bureauxOptions = '<option value="">Bureau...</option>' +
      bureaux.map(b => `<option value="${this.escapeHtml(b)}">${this.escapeHtml(b)}</option>`).join('');
    $('#input-personne-bureau').html(bureauxOptions);
    $('#edit-personne-bureau').html('<option value="">Aucun</option>' +
      bureaux.map(b => `<option value="${this.escapeHtml(b)}">${this.escapeHtml(b)}</option>`).join(''));

    const servicesOptions = '<option value="">Service...</option>' +
      services.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join('');
    $('#input-personne-service').html(servicesOptions);
    $('#edit-personne-service').html('<option value="">Aucun</option>' +
      services.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join(''));

    const groupementsOptions = '<option value="">Groupement...</option>' +
      groupements.map(g => `<option value="${this.escapeHtml(g)}">${this.escapeHtml(g)}</option>`).join('');
    $('#input-personne-groupement').html(groupementsOptions);
    $('#edit-personne-groupement').html('<option value="">Aucun</option>' +
      groupements.map(g => `<option value="${this.escapeHtml(g)}">${this.escapeHtml(g)}</option>`).join(''));
  }

  // === PERSONNES (AGENTS) ===

  handleAddPersonne() {
    const prenom = $('#input-personne-prenom').val();
    const bureau = $('#input-personne-bureau').val();
    const service = $('#input-personne-service').val();
    const groupement = $('#input-personne-groupement').val();

    try {
      this.configManager.addPersonne({ nom: prenom, bureau, service, groupement });
      $('#input-personne-prenom').val('');
      $('#input-personne-bureau').val('');
      $('#input-personne-service').val('');
      $('#input-personne-groupement').val('');
      this.renderPersonnes();
      this.updateStats();
      this.showSuccess('Agent ajoute');
    } catch (error) {
      this.showError(error.message);
    }
  }

  openEditPersonneModal(id) {
    const personnes = this.configManager.getPersonnes();
    const personne = personnes.find(p => p.id === id);
    if (!personne) return;

    this.populateSelects();

    $('#edit-personne-id').val(id);
    $('#edit-personne-prenom').val(personne.nom || '');
    $('#edit-personne-bureau').val(personne.bureau || '');
    $('#edit-personne-service').val(personne.service || '');
    $('#edit-personne-groupement').val(personne.groupement || '');

    const modal = new bootstrap.Modal($('#modal-edit-personne')[0]);
    modal.show();
  }

  handleSavePersonne() {
    const id = parseInt($('#edit-personne-id').val());
    const prenom = $('#edit-personne-prenom').val().trim();
    const bureau = $('#edit-personne-bureau').val();
    const service = $('#edit-personne-service').val();
    const groupement = $('#edit-personne-groupement').val();

    if (!prenom) {
      this.showError('Le prenom est obligatoire');
      return;
    }

    try {
      this.configManager.updatePersonne(id, {
        nom: prenom,
        bureau,
        service,
        groupement
      });
      bootstrap.Modal.getInstance($('#modal-edit-personne')[0]).hide();
      this.renderPersonnes();
      this.updateStats();
      this.showSuccess('Agent mis a jour');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeletePersonne(id) {
    const personnes = this.configManager.getPersonnes();
    const personne = personnes.find(p => p.id === id);
    if (!personne) return;

    if (confirm(`Supprimer l'agent "${personne.nom}" ?`)) {
      this.configManager.deletePersonne(id);
      this.renderPersonnes();
      this.updateStats();
      this.showSuccess('Agent supprime');
    }
  }

  renderPersonnes() {
    const personnes = this.configManager.getPersonnes();
    const $list = $('#list-personnes');
    $('#count-personnes').text(personnes.length);

    if (personnes.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucun agent enregistre</div>');
      return;
    }

    const html = personnes.map(p => `
      <div class="item-card">
        <div>
          <span class="fw-semibold">${this.escapeHtml(p.nom)}</span>
          ${p.bureau ? `<span class="badge bg-info ms-2">${this.escapeHtml(p.bureau)}</span>` : ''}
          ${p.service ? `<span class="badge bg-secondary ms-1">${this.escapeHtml(p.service)}</span>` : ''}
          ${p.groupement ? `<span class="badge bg-warning text-dark ms-1">${this.escapeHtml(p.groupement)}</span>` : ''}
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-secondary btn-edit-personne" data-id="${p.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete-personne" data-id="${p.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
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
      this.populateSelects();
      this.updateStats();
      this.showSuccess('Bureau ajoute');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteBureau(nom) {
    if (confirm(`Supprimer le bureau "${nom}" ?`)) {
      this.configManager.deleteBureau(nom);
      this.renderBureaux();
      this.populateSelects();
      this.updateStats();
      this.showSuccess('Bureau supprime');
    }
  }

  renderBureaux() {
    const bureaux = this.configManager.getBureaux();
    $('#count-bureaux').text(bureaux.length);
    this.renderSimpleList('#list-bureaux', bureaux, 'btn-delete-bureau', 'bureau');
  }

  // === SERVICES ===

  handleAddService() {
    const nom = $('#input-service').val();
    try {
      this.configManager.addService(nom);
      $('#input-service').val('');
      this.renderServices();
      this.populateSelects();
      this.updateStats();
      this.showSuccess('Service ajoute');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteService(nom) {
    if (confirm(`Supprimer le service "${nom}" ?`)) {
      this.configManager.deleteService(nom);
      this.renderServices();
      this.populateSelects();
      this.updateStats();
      this.showSuccess('Service supprime');
    }
  }

  renderServices() {
    const services = this.configManager.getServices();
    $('#count-services').text(services.length);
    this.renderSimpleList('#list-services', services, 'btn-delete-service', 'service');
  }

  // === GROUPEMENTS ===

  handleAddGroupement() {
    const nom = $('#input-groupement').val();
    try {
      this.configManager.addGroupement(nom);
      $('#input-groupement').val('');
      this.renderGroupements();
      this.populateSelects();
      this.updateStats();
      this.showSuccess('Groupement ajoute');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteGroupement(nom) {
    if (confirm(`Supprimer le groupement "${nom}" ?`)) {
      this.configManager.deleteGroupement(nom);
      this.renderGroupements();
      this.populateSelects();
      this.updateStats();
      this.showSuccess('Groupement supprime');
    }
  }

  renderGroupements() {
    const groupements = this.configManager.getGroupements();
    $('#count-groupements').text(groupements.length);
    this.renderSimpleList('#list-groupements', groupements, 'btn-delete-groupement', 'groupement');
  }

  // === STRATEGIES ===

  handleAddStrategie() {
    const code = $('#input-strategie-code').val();
    const objectif = $('#input-strategie-objectif').val();
    const sousObjectif = $('#input-strategie-sous-objectif').val();

    try {
      this.configManager.addStrategie({ code, objectif, sousObjectif });
      $('#input-strategie-code').val('');
      $('#input-strategie-objectif').val('');
      $('#input-strategie-sous-objectif').val('');
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Strategie ajoutee');
    } catch (error) {
      this.showError(error.message);
    }
  }

  openEditStrategieModal(id) {
    const strategies = this.configManager.getStrategies();
    const strategie = strategies.find(s => s.id === id);
    if (!strategie) return;

    $('#edit-strategie-id').val(id);
    $('#edit-strategie-code').val(strategie.code || '');
    $('#edit-strategie-objectif').val(strategie.objectif || '');
    $('#edit-strategie-sous-objectif').val(strategie.sousObjectif || '');

    const modal = new bootstrap.Modal($('#modal-edit-strategie')[0]);
    modal.show();
  }

  handleSaveStrategie() {
    const id = parseInt($('#edit-strategie-id').val());
    const code = $('#edit-strategie-code').val().trim();
    const objectif = $('#edit-strategie-objectif').val().trim();
    const sousObjectif = $('#edit-strategie-sous-objectif').val().trim();

    if (!code || !objectif) {
      this.showError('Le code et l\'objectif sont obligatoires');
      return;
    }

    try {
      this.configManager.updateStrategie(id, { code, objectif, sousObjectif });
      bootstrap.Modal.getInstance($('#modal-edit-strategie')[0]).hide();
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Strategie mise a jour');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteStrategie(id) {
    const strategies = this.configManager.getStrategies();
    const strategie = strategies.find(s => s.id === id);
    if (!strategie) return;

    if (confirm(`Supprimer la strategie "${strategie.code}" ?`)) {
      this.configManager.deleteStrategie(id);
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Strategie supprimee');
    }
  }

  renderStrategies() {
    const strategies = this.configManager.getStrategies();
    const $list = $('#list-strategies');
    $('#count-strategies').text(strategies.length);

    if (strategies.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucune strategie enregistree</div>');
      return;
    }

    const html = strategies.map(s => `
      <div class="item-card">
        <div>
          <span class="badge bg-secondary me-2">${this.escapeHtml(s.code)}</span>
          <span class="fw-semibold">${this.escapeHtml(s.objectif)}</span>
          ${s.sousObjectif ? `<i class="bi bi-arrow-right mx-2"></i><span class="text-muted">${this.escapeHtml(s.sousObjectif)}</span>` : ''}
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-secondary btn-edit-strategie" data-id="${s.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete-strategie" data-id="${s.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    $list.html(html);
  }

  // === TEMPLATES ===

  openEditTemplateModal(id) {
    this.editingTemplateId = id;

    if (id === null) {
      // Nouveau template
      $('#modal-template-title').text('Nouveau template');
      $('#edit-template-id').val('');
      $('#edit-template-nom').val('');
      $('#edit-template-description').val('');
      $('#template-taches-container').empty();
      this.addTemplateTacheRow(); // Ajouter une ligne vide
    } else {
      // Edition
      const templates = this.configManager.getTemplates();
      const template = templates.find(t => t.id === id);
      if (!template) return;

      $('#modal-template-title').text('Modifier le template');
      $('#edit-template-id').val(id);
      $('#edit-template-nom').val(template.nom || '');
      $('#edit-template-description').val(template.description || '');

      $('#template-taches-container').empty();
      (template.taches || []).forEach(tache => {
        this.addTemplateTacheRow(tache);
      });
    }

    const modal = new bootstrap.Modal($('#modal-edit-template')[0]);
    modal.show();
  }

  addTemplateTacheRow(tache = null) {
    const $template = $($('#template-tache-form').html());
    const index = $('#template-taches-container .template-tache-item').length;
    $template.attr('data-index', index);

    // Peupler le select Nature (WHY)
    const $natureSelect = $template.find('.tache-nature');
    Object.values(NATURE_ACTIVITE).forEach(nature => {
      $natureSelect.append(`<option value="${nature.code}">${nature.nom}</option>`);
    });

    // Peupler le select Genre (HOW)
    const $genreSelect = $template.find('.tache-genre');
    Object.values(GENRE_ACTION).forEach(genre => {
      $genreSelect.append(`<option value="${genre.code}">${genre.nom}</option>`);
    });

    // Peupler le select Etape (WHERE)
    const $etapeSelect = $template.find('.tache-etape');
    Object.values(ETAPE_CYCLE).sort((a, b) => a.ordre - b.ordre).forEach(etape => {
      $etapeSelect.append(`<option value="${etape.code}">${etape.nom}</option>`);
    });

    if (tache) {
      $template.find('.tache-titre').val(tache.titre || '');
      $template.find('.tache-nature').val(tache.nature || '');
      $template.find('.tache-genre').val(tache.genre || '');
      $template.find('.tache-etape').val(tache.etape || '');
      $template.find('.tache-priorite').val(tache.priorite || 'Moyenne');
      $template.find('.tache-charge').val(tache.charge || '');
      $template.find('.tache-description').val(tache.description || '');
    }

    $('#template-taches-container').append($template);
  }

  handleSaveTemplate() {
    const id = $('#edit-template-id').val();
    const nom = $('#edit-template-nom').val().trim();
    const description = $('#edit-template-description').val().trim();

    if (!nom) {
      this.showError('Le nom du template est obligatoire');
      return;
    }

    // Collecter les taches
    const taches = [];
    $('#template-taches-container .template-tache-item').each((i, el) => {
      const $el = $(el);
      const titre = $el.find('.tache-titre').val().trim();
      if (titre) {
        taches.push({
          titre,
          nature: $el.find('.tache-nature').val() || '',
          genre: $el.find('.tache-genre').val() || '',
          etape: $el.find('.tache-etape').val() || '',
          priorite: $el.find('.tache-priorite').val() || 'Moyenne',
          charge: parseFloat($el.find('.tache-charge').val()) || 0,
          description: $el.find('.tache-description').val().trim()
        });
      }
    });

    try {
      if (id) {
        this.configManager.updateTemplate(parseInt(id), { nom, description, taches });
        this.showSuccess('Template mis a jour');
      } else {
        this.configManager.addTemplate({ nom, description, taches });
        this.showSuccess('Template ajoute');
      }

      bootstrap.Modal.getInstance($('#modal-edit-template')[0]).hide();
      this.renderTemplates();
      this.updateStats();
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteTemplate(id) {
    const templates = this.configManager.getTemplates();
    const template = templates.find(t => t.id === id);
    if (!template) return;

    if (confirm(`Supprimer le template "${template.nom}" ?`)) {
      this.configManager.deleteTemplate(id);
      this.renderTemplates();
      this.updateStats();
      this.showSuccess('Template supprime');
    }
  }

  async handleLoadExampleTemplates() {
    const existingCount = this.configManager.getTemplates().length;
    let confirmMsg = 'Charger les templates exemples SI (exploitation) ?';
    if (existingCount > 0) {
      confirmMsg += `\n\nVous avez deja ${existingCount} template(s). Les exemples seront ajoutes a la suite.`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch('data/default-templates.json');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const count = this.configManager.importTemplates(data, false);

      this.renderTemplates();
      this.updateStats();
      this.showSuccess(`${count} templates charges avec succes`);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      this.showError('Erreur lors du chargement des templates exemples');
    }
  }

  renderTemplates() {
    const templates = this.configManager.getTemplates();
    const $list = $('#list-templates');
    $('#count-templates').text(templates.length);

    if (templates.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucun template enregistre</div>');
      return;
    }

    const html = templates.map(t => `
      <div class="template-card">
        <div class="template-card-header">
          <div>
            <strong>${this.escapeHtml(t.nom)}</strong>
            <span class="badge bg-primary ms-2">${(t.taches || []).length} tache(s)</span>
          </div>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary btn-edit-template" data-id="${t.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete-template" data-id="${t.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <div class="template-card-body">
          ${t.description ? `<p class="text-muted small mb-2">${this.escapeHtml(t.description)}</p>` : ''}
          ${(t.taches || []).length > 0 ? `
            <div class="small">
              ${(t.taches || []).map(tache => `
                <div class="d-flex flex-wrap align-items-center py-1 border-bottom gap-1">
                  <i class="bi bi-check2-square me-2 text-muted"></i>
                  <span class="fw-medium">${this.escapeHtml(tache.titre)}</span>
                  ${tache.nature ? `<span class="badge" style="background-color: ${NATURE_ACTIVITE[tache.nature]?.couleur || '#6c757d'}; font-size: 0.7em;">${NATURE_ACTIVITE[tache.nature]?.nom || tache.nature}</span>` : ''}
                  ${tache.genre ? `<span class="badge" style="background-color: ${GENRE_ACTION[tache.genre]?.couleur || '#6c757d'}; font-size: 0.7em;">${GENRE_ACTION[tache.genre]?.nom || tache.genre}</span>` : ''}
                  ${tache.etape ? `<span class="badge" style="background-color: ${ETAPE_CYCLE[tache.etape.replace('ETP.', '')]?.couleur || '#6c757d'}; font-size: 0.7em;">${ETAPE_CYCLE[tache.etape.replace('ETP.', '')]?.nom || tache.etape}</span>` : ''}
                  <span class="badge bg-light text-dark">${this.escapeHtml(tache.priorite)}</span>
                  ${tache.charge ? `<span class="ms-auto text-muted">${tache.charge}j</span>` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-muted small mb-0">Aucune tache definie</p>'}
        </div>
      </div>
    `).join('');

    $list.html(html);
  }

  // === HELPERS ===

  renderSimpleList(selector, items, deleteClass, dataAttr) {
    const $list = $(selector);

    if (items.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucun element</div>');
      return;
    }

    const html = items.map(item => `
      <div class="item-card">
        <span>${this.escapeHtml(item)}</span>
        <button class="btn btn-sm btn-outline-danger ${deleteClass}" data-${dataAttr}="${this.escapeHtml(item)}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');

    $list.html(html);
  }

  updateStats() {
    const stats = this.configManager.getStats();
    $('#stat-personnes').text(stats.personnes);
    $('#stat-bureaux').text(stats.bureaux);
    $('#stat-services').text(stats.services);
    $('#stat-groupements').text(stats.groupements);
    $('#stat-strategies').text(stats.strategies);
    $('#stat-templates').text(stats.templates || 0);
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
      this.showSuccess('Configuration exportee');
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
        this.showSuccess('Configuration importee');
        $('#file-import').val('');
      } catch (error) {
        this.showError(error.message);
      }
    };
    reader.readAsText(file);
  }

  handleReset() {
    if (confirm('Reinitialiser TOUTE la configuration ?\n\nCette action est irreversible !')) {
      this.configManager.reset();
      this.loadAllData();
      this.updateStats();
      this.showSuccess('Configuration reinitialisee');
    }
  }

  // === EXTRACTION SCHEMA GRIST ===

  async handleExtractSchema() {
    const modal = new bootstrap.Modal($('#schema-modal')[0]);
    modal.show();

    $('#schema-loading').show();
    $('#schema-content').hide();
    $('#schema-error').hide();

    try {
      const schema = await this.extractGristSchema();
      this.currentSchema = schema;

      this.renderSchemaVisual(schema);

      const jsonStr = JSON.stringify(schema, null, 2);
      $('#schema-json-code').text(jsonStr);

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

  async extractGristSchema() {
    const grist = window.grist;
    if (!grist) {
      throw new Error('API Grist non disponible');
    }

    const schema = {
      extractedAt: new Date().toISOString(),
      tables: {}
    };

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

            const colInfo = this.analyzeColumn(colName, values);
            columns[colName] = colInfo;

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

    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    info.nullable = nonNullValues.length < values.length;
    info.uniqueCount = new Set(nonNullValues).size;

    if (nonNullValues.length === 0) {
      info.type = 'null';
      return info;
    }

    const sample = nonNullValues[0];

    if (Array.isArray(sample) && sample[0] === 'L') {
      info.type = 'ChoiceList';
      info.isList = true;
      const allChoices = new Set();
      nonNullValues.forEach(arr => {
        if (Array.isArray(arr)) {
          arr.slice(1).forEach(v => allChoices.add(v));
        }
      });
      info.choices = [...allChoices].sort();
      return info;
    }

    if (Array.isArray(sample) && sample.length === 2 && typeof sample[1] === 'number') {
      info.type = 'Reference';
      info.isReference = true;
      info.refTable = sample[0];
      return info;
    }

    if (typeof sample === 'number') {
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
              ${colInfo.isReference ? `<small class="text-muted ms-1">-> ${colInfo.refTable}</small>` : ''}
            </td>
            <td>${colInfo.nullable ? '<i class="bi bi-check text-success"></i>' : '<i class="bi bi-x text-danger"></i>'}</td>
            <td>${colInfo.uniqueCount}</td>
            <td><small class="text-muted">${this.escapeHtml(sampleStr)}</small></td>
          </tr>
        `;

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
        if (colInfo.isReference) typeStr += ` -> ${colInfo.refTable}`;
        md += `| \`${colName}\` | ${typeStr} | ${colInfo.nullable ? 'Oui' : 'Non'} | ${colInfo.uniqueCount} |\n`;
      }

      md += `\n`;

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

  handleCopySchema() {
    if (!this.currentSchema) return;

    const json = JSON.stringify(this.currentSchema, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      this.showSuccess('Schema copie dans le presse-papier');
    }).catch(err => {
      this.showError('Erreur lors de la copie');
    });
  }

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
    this.showSuccess('Schema telecharge');
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
    if (text === null || text === undefined) return '';
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
