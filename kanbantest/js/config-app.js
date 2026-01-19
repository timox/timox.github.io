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
    $('#btn-add-strategie').on('click', (e) => {
      e.preventDefault();
      this.handleAddStrategie();
    });

    $(document).on('click', '.btn-delete-strategie, .btn-delete-strategie *', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.target).closest('.btn-delete-strategie');
      const id = parseInt($btn.attr('data-id'));
      console.log('Delete strategie clicked, id:', id, 'btn:', $btn.length);
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

    $('#input-strategie-axe').on('keypress', (e) => {
      if (e.which === 13) {
        e.preventDefault();
        this.handleAddStrategie();
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

  handleAddStrategie() {
    const objectif = $('#input-strategie-objectif').val();
    const sousObjectif = $('#input-strategie-sous-objectif').val();
    const axeStrategique = $('#input-strategie-axe').val();

    try {
      this.addStrategieToGrist({ objectif, sousObjectif, axeStrategique });
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleDeleteStrategie(id) {
    const strategie = (this.strategies || []).find(s => s.id === id);
    if (!strategie) return;

    if (!confirm(`Supprimer l'axe stratégique "${strategie.axe_strategique}" ?`)) return;

    try {
      await window.grist.docApi.applyUserActions([
        ['RemoveRecord', 'Ssir_strategie2', id]
      ]);
      await this.loadStrategiesFromGrist();
      this.renderStrategies();
      this.updateStats();
      this.showSuccess('Stratégie supprimée');
    } catch (error) {
      this.showError('Suppression impossible: ' + error.message);
    }
  }

  async handleEditStrategie(id) {
    const strategie = (this.strategies || []).find(s => s.id === id);
    if (!strategie) return;

    const objectif = prompt('Objectif', strategie.objectif || '');
    if (objectif === null) return;
    const sousObjectif = prompt('Sous-objectif', strategie.sous_objectif || '');
    if (sousObjectif === null) return;
    const axeStrategique = prompt('Axe stratégique', strategie.axe_strategique || '');
    if (axeStrategique === null) return;

    try {
      await window.grist.docApi.applyUserActions([
        ['UpdateRecord', 'Ssir_strategie2', id, {
          objectif: objectif.trim(),
          sous_objectif: sousObjectif.trim(),
          axe_strategique: axeStrategique.trim()
        }]
      ]);
      await this.loadStrategiesFromGrist();
      this.renderStrategies();
      this.showSuccess('Stratégie mise à jour');
    } catch (error) {
      this.showError('Mise à jour impossible: ' + error.message);
    }
  }

  renderStrategies() {
    const strategies = this.strategies || [];
    const $list = $('#list-strategies');
    $('#count-strategies').text(strategies.length);

    if (strategies.length === 0) {
      $list.html('<div class="text-muted text-center py-3">Aucune stratégie enregistrée</div>');
      return;
    }

    const html = strategies.map(s => `
      <div class="list-group-item d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-1">
            <strong>${this.escapeHtml(s.objectif)}</strong>
          </div>
          ${s.sous_objectif ? `<div class="small text-muted ms-4">${this.escapeHtml(s.sous_objectif)}</div>` : ''}
          ${s.axe_strategique ? `<div class="small ms-4">${this.escapeHtml(s.axe_strategique)}</div>` : ''}
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

  async addStrategieToGrist({ objectif, sousObjectif, axeStrategique }) {
    if (!objectif || !objectif.trim()) throw new Error('Objectif obligatoire');
    if (!axeStrategique || !axeStrategique.trim()) throw new Error('Axe stratégique obligatoire');

    await window.grist.docApi.applyUserActions([
      ['AddRecord', 'Ssir_strategie2', null, {
        objectif: objectif.trim(),
        sous_objectif: (sousObjectif || '').trim(),
        axe_strategique: axeStrategique.trim()
      }]
    ]);

    $('#input-strategie-objectif').val('');
    $('#input-strategie-sous-objectif').val('');
    $('#input-strategie-axe').val('');
    await this.loadStrategiesFromGrist();
    this.renderStrategies();
    this.updateStats();
    this.showSuccess('Stratégie ajoutée');
  }

  async loadStrategiesFromGrist() {
    try {
      const data = await window.grist.docApi.fetchTable('Ssir_strategie2');
      this.strategies = [];
      if (!data?.id) return;
      const count = data.id.length;
      for (let i = 0; i < count; i++) {
        this.strategies.push({
          id: data.id[i],
          objectif: data.objectif?.[i] || '',
          sous_objectif: data.sous_objectif?.[i] || '',
          axe_strategique: data.axe_strategique?.[i] || ''
        });
      }
      $('#count-strategies').text(this.strategies.length);
    } catch (error) {
      this.showError('Chargement stratégies impossible: ' + error.message);
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
