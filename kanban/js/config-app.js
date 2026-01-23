// === config-app.js ===
// Application pour la gestion des parametres et constantes

import { initConfigManager, getConfigManager } from './managers/ConfigManager.js';
import { GristManager } from './managers/GristManager.js';

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
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteBureau(nom);
    });

    // === SERVICES ===
    $('#btn-add-service').on('click', () => this.handleAddService());
    $('#input-service').on('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddService();
    });

    $(document).on('click', '.btn-delete-service', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteService(nom);
    });

    // === GROUPEMENTS ===
    $('#btn-add-groupement').on('click', () => this.handleAddGroupement());
    $('#input-groupement').on('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddGroupement();
    });

    $(document).on('click', '.btn-delete-groupement', (e) => {
      const nom = $(e.currentTarget).data('nom');
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

    $(document).on('click', '.btn-edit-template', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.openEditTemplateModal(id);
    });

    $(document).on('click', '.btn-delete-template', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeleteTemplate(id);
    });

    $('#btn-add-template-tache').on('click', () => this.addTemplateTacheRow());

    $(document).on('click', '.btn-remove-tache', (e) => {
      $(e.currentTarget).closest('.template-tache-item').remove();
    });

    $('#btn-save-template').on('click', () => this.handleSaveTemplate());

    // === ACTIONS GLOBALES ===
    $('#btn-export-config').on('click', () => this.handleExport());
    $('#btn-import-config').on('click', () => $('#file-import').click());
    $('#file-import').on('change', (e) => this.handleImport(e));
    $('#btn-reset-config').on('click', () => this.handleReset());

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

  // === AGENTS (PERSONNES) ===

  handleAddPersonne() {
    const prenom = $('#input-personne-prenom').val();
    const bureau = $('#input-personne-bureau').val();
    const service = $('#input-personne-service').val();
    const groupement = $('#input-personne-groupement').val();

    try {
      this.configManager.addPersonne({ prenom, bureau, service, groupement });
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

    // Remplir le formulaire
    $('#edit-personne-id').val(id);
    $('#edit-personne-prenom').val(personne.prenom || '');
    $('#edit-personne-bureau').val(personne.bureau || '');
    $('#edit-personne-service').val(personne.service || '');
    $('#edit-personne-groupement').val(personne.groupement || '');

    // Afficher le modal
    const modal = new bootstrap.Modal($('#modal-edit-personne')[0]);
    modal.show();
  }

  handleSavePersonne() {
    const id = parseInt($('#edit-personne-id').val());
    const prenom = $('#edit-personne-prenom').val();
    const bureau = $('#edit-personne-bureau').val();
    const service = $('#edit-personne-service').val();
    const groupement = $('#edit-personne-groupement').val();

    try {
      this.configManager.updatePersonne(id, { prenom, bureau, service, groupement });
      bootstrap.Modal.getInstance($('#modal-edit-personne')[0]).hide();
      this.renderPersonnes();
      this.showSuccess('Agent modifie');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeletePersonne(id) {
    const personnes = this.configManager.getPersonnes();
    const personne = personnes.find(p => p.id === id);
    if (!personne) return;

    // Verifier l'usage dans Grist (champ "qui")
    const usage = this.checkUsageInGrist('qui', personne.prenom);

    if (usage.count > 0) {
      await this.showImpactModal('Agent', personne.prenom, usage);
      return;
    }

    if (confirm(`Supprimer l'agent "${personne.prenom}" ?`)) {
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
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${this.escapeHtml(p.prenom)}</strong>
          <div class="small text-muted">
            ${p.bureau ? `<span class="me-2"><i class="bi bi-building"></i> ${this.escapeHtml(p.bureau)}</span>` : ''}
            ${p.service ? `<span class="me-2"><i class="bi bi-briefcase"></i> ${this.escapeHtml(p.service)}</span>` : ''}
            ${p.groupement ? `<span><i class="bi bi-collection"></i> ${this.escapeHtml(p.groupement)}</span>` : ''}
          </div>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary btn-edit-personne" data-id="${p.id}" title="Modifier">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-delete-personne" data-id="${p.id}" title="Supprimer">
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

  async handleDeleteBureau(nom) {
    const usage = this.checkUsageInGrist('bureau', nom);

    if (usage.count > 0) {
      await this.showImpactModal('Bureau', nom, usage);
      return;
    }

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
    this.renderSimpleList('#list-bureaux', bureaux, 'btn-delete-bureau', 'nom');
    $('#count-bureaux').text(bureaux.length);
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

  async handleDeleteService(nom) {
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
    this.renderSimpleList('#list-services', services, 'btn-delete-service', 'nom');
    $('#count-services').text(services.length);
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

  async handleDeleteGroupement(nom) {
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
    this.renderSimpleList('#list-groupements', groupements, 'btn-delete-groupement', 'nom');
    $('#count-groupements').text(groupements.length);
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
    const strategie = this.configManager.getStrategieById(id);
    if (!strategie) {
      this.showError('Strategie non trouvee');
      return;
    }

    // Remplir le formulaire
    $('#edit-strategie-id').val(id);
    $('#edit-strategie-code').val(strategie.code || '');
    $('#edit-strategie-objectif').val(strategie.objectif || '');
    $('#edit-strategie-sous-objectif').val(strategie.sousObjectif || '');

    // Afficher le modal
    const modal = new bootstrap.Modal($('#modal-edit-strategie')[0]);
    modal.show();
  }

  handleSaveStrategie() {
    const id = parseInt($('#edit-strategie-id').val());
    const code = $('#edit-strategie-code').val();
    const objectif = $('#edit-strategie-objectif').val();
    const sousObjectif = $('#edit-strategie-sous-objectif').val();

    try {
      this.configManager.updateStrategie(id, { code, objectif, sousObjectif });
      bootstrap.Modal.getInstance($('#modal-edit-strategie')[0]).hide();
      this.renderStrategies();
      this.showSuccess('Strategie modifiee');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteStrategie(id) {
    const strategie = this.configManager.getStrategieById(id);
    if (!strategie) return;

    if (confirm(`Supprimer la strategie "${strategie.code}" ?\n\nNote: Cette suppression n'affecte que l'auto-completion.\nLes strategies existantes dans Grist restent inchangees.`)) {
      this.configManager.deleteStrategie(id);
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Strategie supprimee de la configuration');
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
      <div class="list-group-item d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-1">
            <span class="badge bg-primary me-2">${this.escapeHtml(s.code)}</span>
            <strong>${this.escapeHtml(s.objectif)}</strong>
          </div>
          ${s.sousObjectif ? `<div class="small text-muted ms-4">${this.escapeHtml(s.sousObjectif)}</div>` : ''}
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary btn-edit-strategie" data-id="${s.id}" title="Modifier">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-delete-strategie" data-id="${s.id}" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    $list.html(html);
  }

  // === TEMPLATES DE MISE EN OEUVRE ===

  openEditTemplateModal(id) {
    this.editingTemplateId = id;

    if (id) {
      // Mode edition
      const template = this.configManager.getTemplateById(id);
      if (!template) {
        this.showError('Template non trouve');
        return;
      }

      $('#modal-template-title').text('Modifier le template');
      $('#edit-template-id').val(id);
      $('#edit-template-nom').val(template.nom || '');
      $('#edit-template-description').val(template.description || '');

      // Charger les taches
      $('#template-taches-container').empty();
      if (template.taches && template.taches.length > 0) {
        template.taches.forEach(tache => {
          this.addTemplateTacheRow(tache);
        });
      }
    } else {
      // Mode creation
      $('#modal-template-title').text('Nouveau template');
      $('#edit-template-id').val('');
      $('#edit-template-nom').val('');
      $('#edit-template-description').val('');
      $('#template-taches-container').empty();
    }

    const modal = new bootstrap.Modal($('#modal-edit-template')[0]);
    modal.show();
  }

  addTemplateTacheRow(tache = null) {
    const template = document.getElementById('template-tache-form');
    const clone = template.content.cloneNode(true);
    const item = clone.querySelector('.template-tache-item');

    if (tache) {
      item.querySelector('.tache-titre').value = tache.titre || '';
      item.querySelector('.tache-description').value = tache.description || '';
      item.querySelector('.tache-priorite').value = tache.priorite || 'Moyenne';
      item.querySelector('.tache-charge').value = tache.charge || '';
    }

    $('#template-taches-container').append(clone);
  }

  handleSaveTemplate() {
    const id = $('#edit-template-id').val();
    const nom = $('#edit-template-nom').val();
    const description = $('#edit-template-description').val();

    // Collecter les taches
    const taches = [];
    $('#template-taches-container .template-tache-item').each((index, item) => {
      const titre = $(item).find('.tache-titre').val();
      if (titre && titre.trim()) {
        taches.push({
          titre: titre.trim(),
          description: $(item).find('.tache-description').val() || '',
          priorite: $(item).find('.tache-priorite').val() || 'Moyenne',
          charge: parseFloat($(item).find('.tache-charge').val()) || 0
        });
      }
    });

    try {
      if (id) {
        // Mise a jour
        this.configManager.updateTemplate(parseInt(id), { nom, description, taches });
        this.showSuccess('Template modifie');
      } else {
        // Creation
        this.configManager.addTemplate({ nom, description, taches });
        this.showSuccess('Template cree');
      }

      bootstrap.Modal.getInstance($('#modal-edit-template')[0]).hide();
      this.renderTemplates();
      this.updateStats();
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteTemplate(id) {
    const template = this.configManager.getTemplateById(id);
    if (!template) return;

    if (confirm(`Supprimer le template "${template.nom}" ?`)) {
      this.configManager.deleteTemplate(id);
      this.renderTemplates();
      this.updateStats();
      this.showSuccess('Template supprime');
    }
  }

  renderTemplates() {
    const templates = this.configManager.getTemplates();
    const $list = $('#list-templates');
    $('#count-templates').text(templates.length);

    if (templates.length === 0) {
      $list.html(`
        <div class="text-center py-4 text-muted">
          <i class="bi bi-clipboard-x" style="font-size: 3rem;"></i>
          <p class="mt-2">Aucun template de mise en oeuvre</p>
          <p class="small">Creez un template pour definir des series de taches reutilisables</p>
        </div>
      `);
      return;
    }

    const html = templates.map(t => `
      <div class="template-card">
        <div class="template-card-header">
          <div>
            <strong>${this.escapeHtml(t.nom)}</strong>
            <span class="badge bg-info ms-2">${t.taches ? t.taches.length : 0} tache(s)</span>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary btn-edit-template" data-id="${t.id}" title="Modifier">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-delete-template" data-id="${t.id}" title="Supprimer">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        ${t.description ? `<div class="template-card-body small text-muted">${this.escapeHtml(t.description)}</div>` : ''}
        ${t.taches && t.taches.length > 0 ? `
          <div class="template-card-body pt-0">
            <div class="small">
              ${t.taches.slice(0, 3).map(tache => `
                <div class="d-flex align-items-center py-1 border-bottom">
                  <i class="bi bi-check2-square me-2 text-muted"></i>
                  <span>${this.escapeHtml(tache.titre)}</span>
                  ${tache.priorite && tache.priorite !== 'Moyenne' ? `
                    <span class="badge ${this.getPrioriteBadgeClass(tache.priorite)} ms-auto">${tache.priorite}</span>
                  ` : ''}
                </div>
              `).join('')}
              ${t.taches.length > 3 ? `
                <div class="text-muted small mt-1">+ ${t.taches.length - 3} autre(s) tache(s)</div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');

    $list.html(html);
  }

  getPrioriteBadgeClass(priorite) {
    switch (priorite) {
      case 'Critique': return 'bg-danger';
      case 'Haute': return 'bg-warning';
      case 'Moyenne': return 'bg-primary';
      case 'Basse': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  // === VERIFICATION D'USAGE ===

  /**
   * Verifie l'usage d'une valeur dans les taches Grist
   * @param {string} field - Champ a verifier (bureau, service, projet, qui)
   * @param {string} value - Valeur a rechercher
   * @returns {Object} {count, tasks}
   */
  checkUsageInGrist(field, value) {
    const tasks = this.gristManager.currentRecords || [];
    const impactedTasks = tasks.filter(task => {
      const fieldValue = task[field];
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return fieldValue === value;
    });

    return {
      count: impactedTasks.length,
      tasks: impactedTasks.slice(0, 10),
      totalCount: impactedTasks.length
    };
  }

  /**
   * Affiche un modal avec l'impact de la suppression
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
                <strong>${type} "${this.escapeHtml(value)}"</strong> est utilise par <strong>${usage.count} tache(s)</strong> dans Grist.
              </div>

              <p class="mb-3">
                Vous devez d'abord modifier ou supprimer ces taches avant de pouvoir supprimer ce ${type.toLowerCase()}.
              </p>

              <h6 class="mb-2">Taches impactees ${usage.totalCount > 10 ? `(10 premieres sur ${usage.totalCount})` : ''}:</h6>
              <div class="list-group">
                ${usage.tasks.map(task => `
                  <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>${this.escapeHtml(task.titre || 'Sans titre')}</strong>
                        <div class="small text-muted">
                          <span class="badge bg-secondary">${this.escapeHtml(task.statut || 'N/A')}</span>
                          ${task.qui ? `<span class="ms-2"><i class="bi bi-person"></i> ${this.escapeHtml(Array.isArray(task.qui) ? task.qui.join(', ') : task.qui)}</span>` : ''}
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
                  ${usage.totalCount - 10} autre(s) tache(s) utilisent egalement ce ${type.toLowerCase()}.
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

    $('#modal-impact').remove();
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal($('#modal-impact')[0]);
    modal.show();

    $('#modal-impact').on('hidden.bs.modal', () => {
      $('#modal-impact').remove();
    });
  }

  // === HELPERS ===

  renderSimpleList(selector, items, deleteClass, dataAttr) {
    const $list = $(selector);

    if (items.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucun element</div>');
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

  /**
   * Met a jour les statistiques
   */
  updateStats() {
    const stats = this.configManager.getStats();

    $('#stat-personnes').text(stats.personnes);
    $('#stat-bureaux').text(stats.bureaux);
    $('#stat-services').text(stats.services);
    $('#stat-groupements').text(stats.groupements);
    $('#stat-strategies').text(stats.strategies);
    $('#stat-templates').text(stats.templates);
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
    if (!text) return '';
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
