// === config-app.js ===
// Application pour la gestion des paramètres et constantes

import { initConfigManager, getConfigManager } from './managers/ConfigManager.js';

/**
 * Application de configuration
 */
class ConfigApp {
  constructor() {
    this.configManager = null;
    this.currentTab = 'personnes';
  }

  /**
   * Initialise l'application
   */
  async init() {
    console.log('🚀 ConfigApp: Initializing...');

    // Initialiser le ConfigManager
    this.configManager = initConfigManager();

    // Charger l'interface
    this.setupEventListeners();
    this.loadAllData();
    this.updateStats();

    console.log('✅ ConfigApp: Ready');
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // === PERSONNES ===
    $('#form-personne').on('submit', (e) => {
      e.preventDefault();
      this.handleAddPersonne();
    });

    $(document).on('click', '.btn-delete-personne', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeletePersonne(id);
    });

    // === BUREAUX ===
    $('#form-bureau').on('submit', (e) => {
      e.preventDefault();
      this.handleAddBureau();
    });

    $(document).on('click', '.btn-delete-bureau', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteBureau(nom);
    });

    // === SERVICES ===
    $('#form-service').on('submit', (e) => {
      e.preventDefault();
      this.handleAddService();
    });

    $(document).on('click', '.btn-delete-service', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteService(nom);
    });

    // === GROUPEMENTS ===
    $('#form-groupement').on('submit', (e) => {
      e.preventDefault();
      this.handleAddGroupement();
    });

    $(document).on('click', '.btn-delete-groupement', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteGroupement(nom);
    });

    // === STRATÉGIES ===
    $('#form-strategie').on('submit', (e) => {
      e.preventDefault();
      this.handleAddStrategie();
    });

    $(document).on('click', '.btn-delete-strategie', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeleteStrategie(id);
    });

    // === PROJETS ===
    $('#form-projet').on('submit', (e) => {
      e.preventDefault();
      this.handleAddProjet();
    });

    $(document).on('click', '.btn-delete-projet', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteProjet(nom);
    });

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
      $('#form-personne')[0].reset();
      this.renderPersonnes();
      this.updateStats();
      this.showSuccess('Personne ajoutée');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeletePersonne(id) {
    if (confirm('Supprimer cette personne ?')) {
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
      $('#form-bureau')[0].reset();
      this.renderBureaux();
      this.updateStats();
      this.showSuccess('Bureau ajouté');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteBureau(nom) {
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
  }

  // === SERVICES ===

  handleAddService() {
    const nom = $('#input-service').val();

    try {
      this.configManager.addService(nom);
      $('#form-service')[0].reset();
      this.renderServices();
      this.updateStats();
      this.showSuccess('Service ajouté');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteService(nom) {
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
      $('#form-groupement')[0].reset();
      this.renderGroupements();
      this.updateStats();
      this.showSuccess('Groupement ajouté');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteGroupement(nom) {
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

  handleAddStrategie() {
    const code = $('#input-strategie-code').val();
    const objectif = $('#input-strategie-objectif').val();
    const sousObjectif = $('#input-strategie-sous-objectif').val();

    try {
      this.configManager.addStrategie({ code, objectif, sousObjectif });
      $('#form-strategie')[0].reset();
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Stratégie ajoutée');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteStrategie(id) {
    if (confirm('Supprimer cette stratégie ?')) {
      this.configManager.deleteStrategie(id);
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Stratégie supprimée');
    }
  }

  renderStrategies() {
    const strategies = this.configManager.getStrategies();
    const $list = $('#list-strategies');

    if (strategies.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucune stratégie enregistrée</div>');
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
        <button class="btn btn-sm btn-outline-danger btn-delete-strategie" data-id="${s.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');

    $list.html(html);
  }

  // === PROJETS ===

  handleAddProjet() {
    const nom = $('#input-projet').val();

    try {
      this.configManager.addProjet(nom);
      $('#form-projet')[0].reset();
      this.renderProjets();
      this.updateStats();
      this.showSuccess('Projet ajouté');
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleDeleteProjet(nom) {
    if (confirm(`Supprimer le projet "${nom}" ?`)) {
      this.configManager.deleteProjet(nom);
      this.renderProjets();
      this.updateStats();
      this.showSuccess('Projet supprimé');
    }
  }

  renderProjets() {
    const projets = this.configManager.getProjets();
    this.renderSimpleList('#list-projets', projets, 'btn-delete-projet', 'projet');
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
    $('#stat-strategies').text(stats.strategies);
    $('#stat-projets').text(stats.projets);
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
