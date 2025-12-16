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
    // (extrait bureaux, responsables, projets des tâches)
    this.configManager.syncFromGrist(this.gristManager.currentRecords);

    // Charger l'interface
    this.setupEventListeners();
    this.loadAllData();
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

    $(document).on('click', '.btn-delete-personne', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeletePersonne(id);
    });

    // === BUREAUX ===
    $('#btn-add-bureau').on('click', (e) => {
      e.preventDefault();
      this.handleAddBureau();
    });

    $(document).on('click', '.btn-delete-bureau', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteBureau(nom);
    });

    // === SERVICES ===
    $('#btn-add-service').on('click', (e) => {
      e.preventDefault();
      this.handleAddService();
    });

    $(document).on('click', '.btn-delete-service', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteService(nom);
    });

    // === GROUPEMENTS ===
    $('#btn-add-groupement').on('click', (e) => {
      e.preventDefault();
      this.handleAddGroupement();
    });

    $(document).on('click', '.btn-delete-groupement', (e) => {
      const nom = $(e.currentTarget).data('nom');
      this.handleDeleteGroupement(nom);
    });

    // === STRATÉGIES ===
    $('#btn-add-strategie').on('click', (e) => {
      e.preventDefault();
      this.handleAddStrategie();
    });

    $(document).on('click', '.btn-delete-strategie', (e) => {
      const id = parseInt($(e.currentTarget).data('id'));
      this.handleDeleteStrategie(id);
    });

    // === PROJETS ===
    $('#btn-add-projet').on('click', (e) => {
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
    const personne = personnes.find(p => p.id === id);
    if (!personne) return;

    // Vérifier l'usage dans Grist (champ "qui")
    const usage = this.checkUsageInGrist('qui', personne.nom);

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
      this.showSuccess('Stratégie ajoutée');
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteStrategie(id) {
    // Les stratégies sont dans une table séparée dans Grist
    // On ne peut pas facilement vérifier l'usage direct
    // Mais on peut vérifier si le code de la stratégie est utilisé

    const strategies = this.configManager.getStrategies();
    const strategie = strategies.find(s => s.id === id);
    if (!strategie) return;

    if (confirm(`⚠️ Supprimer la stratégie "${strategie.code}" ?\n\nNote: Cette suppression n'affecte que l'auto-complétion.\nLes stratégies existantes dans Grist restent inchangées.`)) {
      this.configManager.deleteStrategie(id);
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Stratégie supprimée de la configuration');
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
      $('#input-projet').val('');
      this.renderProjets();
      this.updateStats();
      this.showSuccess('Projet ajouté');
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

  // === VÉRIFICATION D'USAGE ===

  /**
   * Vérifie l'usage d'une valeur dans les tâches Grist
   * @param {string} field - Champ à vérifier (bureau, service, projet, qui)
   * @param {string} value - Valeur à rechercher
   * @returns {Object} {count, tasks}
   */
  checkUsageInGrist(field, value) {
    const tasks = this.gristManager.currentRecords || [];
    const impactedTasks = tasks.filter(task => task[field] === value);

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
