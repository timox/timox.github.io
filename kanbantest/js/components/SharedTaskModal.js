/**
 * SharedTaskModal - Composant modale de tache reutilisable (Orchestrateur Phase 3)
 *
 * Peut etre utilise par n'importe quelle vue (kanban, taches, missions, etc.)
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
 *   modal.open(task);       // Ouvrir pour editer
 *   modal.openNew();        // Ouvrir pour creer
 */

import { ModalJalons } from './modal/ModalJalons.js';
import { ModalDatePicker } from './modal/ModalDatePicker.js';
import { ModalTaskLinks } from './modal/ModalTaskLinks.js';
import { ModalReferenceData } from './modal/ModalReferenceData.js';
import { ModalSelects } from './modal/ModalSelects.js';
import { ModalAffectation } from './modal/ModalAffectation.js';
import { ModalStrategy } from './modal/ModalStrategy.js';
import { ModalFormData } from './modal/ModalFormData.js';
import { ModalCRUD } from './modal/ModalCRUD.js';
import { ModalVisuals } from './modal/ModalVisuals.js';
import { ModalHistory } from './modal/ModalHistory.js';
import { ModalTabIndicators } from './modal/ModalTabIndicators.js';
import { ModalReferences } from './modal/ModalReferences.js';

export class SharedTaskModal {
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

    // Instancier tous les sous-modules
    this.jalonModule = new ModalJalons(this);
    this.datePickerModule = new ModalDatePicker(this);
    this.taskLinksModule = new ModalTaskLinks(this);
    this.refDataModule = new ModalReferenceData(this);
    this.selectsModule = new ModalSelects(this);
    this.affectationModule = new ModalAffectation(this);
    this.strategyModule = new ModalStrategy(this);
    this.formDataModule = new ModalFormData(this);
    this.crudModule = new ModalCRUD(this);
    this.visualsModule = new ModalVisuals(this);
    this.historyModule = new ModalHistory(this);
    this.tabIndicatorsModule = new ModalTabIndicators(this);
    this.referencesModule = new ModalReferences(this);

    // Donnees de reference - SYNCHRONISE AVEC constants.js
    this.programmes = [];
    this.strategies = [];
    this.meos = [];

    // Liste des agents - Source fiable (synchronisee avec DEFAULT_RESPONSABLES de constants.js)
    this.defaultAgents = [
      'Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo',
      'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta', 'Yvon',
      'Clarisse', 'Hervé', 'Didier'
    ];
    this.agents = this.defaultAgents.map(nom => ({ id: nom, nom: nom, bureau: '', fullName: nom }));

    // Bureaux - Source fiable (synchronisee avec DEFAULT_BUREAUX de constants.js)
    this.bureaux = ['Réseaux', 'BDD', 'Exploit', 'Nexsis-RRF', 'Chef SSIR', 'Chef GSSI', 'Chef SIG'];
    this.selectedStrategies = [];
  }

  /**
   * Initialise le composant en chargeant le HTML
   */
  async init() {
    if (this.isLoaded) return;

    // Creer le container si necessaire
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

      // Fix: Forcer le focus sur le champ titre apres l'ouverture de la modale
      // et reinitialiser le date picker si necessaire
      this.modal.addEventListener('shown.bs.modal', () => {
        const titreInput = document.getElementById('stm-titre');
        if (titreInput) {
          setTimeout(() => {
            titreInput.focus();
            titreInput.select();
          }, 100);
        }

        // Reinitialiser le date picker si flatpickr est maintenant disponible
        if (!this.datePickerModule.instance && (window.flatpickr || typeof flatpickr !== 'undefined')) {
          this.datePickerModule.init();
        }

        // Charger l'historique une fois la modale visible
        if (this.currentTask) {
          this.historyModule.loadTaskHistory();
        }
      });

      this.setupEventListeners();
      this.configureVisibility();
      await this.refDataModule.loadReferenceData();
      this.isLoaded = true;

      console.log('[SharedTaskModal] Initialized successfully');
    } catch (error) {
      console.error('[SharedTaskModal] Init error:', error);
      // Fallback: creer une modale minimale
      this.createFallbackModal(container);
    }
  }

  /**
   * Cree une modale minimale en cas d'echec de chargement
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
   * Configure la visibilite des sections optionnelles
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
   * Configure les ecouteurs d'evenements
   */
  setupEventListeners() {
    // Bouton Enregistrer
    const btnSave = document.getElementById('stm-btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => this.crudModule.handleSave());
    }

    // Bouton Supprimer
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => this.crudModule.handleDelete());
    }

    // Bouton Dupliquer
    const btnDuplicate = document.getElementById('stm-btn-duplicate');
    if (btnDuplicate) {
      btnDuplicate.addEventListener('click', () => this.crudModule.handleDuplicate());
    }

    // Bouton Ajouter liaison
    const btnAddLink = document.getElementById('stm-btn-add-link');
    if (btnAddLink) {
      btnAddLink.addEventListener('click', () => this.crudModule.handleAddLink());
    }

    // References - previsualisation en temps reel
    const referencesTextarea = document.getElementById('stm-references');
    if (referencesTextarea) {
      referencesTextarea.addEventListener('input', () => this.referencesModule.updateReferencesPreview());
    }

    // Bouton clear strategies
    const btnClearStrategies = document.getElementById('stm-btn-clear-strategies');
    if (btnClearStrategies) {
      btnClearStrategies.addEventListener('click', () => {
        document.querySelectorAll('#stm-strategy-browser .strategy-checkbox').forEach(cb => {
          cb.checked = false;
        });
        this.strategyModule.updateStrategyTags();
      });
    }

    // Statut change listener for badge update
    const statutSelect = document.getElementById('stm-statut');
    if (statutSelect) {
      statutSelect.addEventListener('change', () => this.visualsModule.updateStatusBadge());
    }

    // Date change listeners for timeline
    const dateDebut = document.getElementById('stm-date-debut');
    if (dateDebut) {
      dateDebut.addEventListener('change', () => this.visualsModule.updateTimelineVisual());
    }

    // Initialiser les jalons (sous-module)
    this.jalonModule.init();

    // Initialiser l'avancement
    this.visualsModule.initAvancement();

    // Initialiser les durees
    this.visualsModule.initDuree();

    // Initialiser les liens entre taches (sous-module)
    this.taskLinksModule.init();

    // Initialiser les boutons de priorite
    this.visualsModule.initPriorityButtons();

    // Initialiser l'indicateur de completude
    this.visualsModule.initCompletionRing();

    // Initialiser le compteur de description
    this.visualsModule.initDescriptionCounter();

    // Initialiser le sidebar historique
    this.historyModule.initHistorySidebar();

    // Initialiser les indicateurs d'onglets
    this.tabIndicatorsModule.initTabIndicators();

    // Exposer l'instance pour les callbacks
    window._sharedTaskModalInstance = this;

    // Fermeture de la modale
    if (this.modal) {
      this.modal.addEventListener('hidden.bs.modal', () => {
        this.currentTask = null;
        this.jalonModule.clear();
        this.selectedStrategies = [];
      });
    }
  }

  /**
   * Ouvre la modale pour editer une tache existante
   */
  open(task) {
    if (!this.isLoaded) {
      console.error('[SharedTaskModal] Not initialized. Call init() first.');
      return;
    }

    this.currentTask = task;
    this.formDataModule.populateForm(task);

    // Afficher les boutons Supprimer et Dupliquer pour les taches existantes
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete && this.options.onDelete) {
      btnDelete.style.display = 'inline-block';
    }
    const btnDuplicate = document.getElementById('stm-btn-duplicate');
    if (btnDuplicate) {
      btnDuplicate.style.display = 'inline-block';
    }

    // Mettre a jour le titre
    const modalTitle = document.getElementById('stm-modal-title');
    if (modalTitle) {
      modalTitle.textContent = `Tâche #${task.id}`;
    }

    this.bsModal.show();
  }

  /**
   * Ouvre la modale pour creer une nouvelle tache
   */
  openNew(defaults = {}) {
    if (!this.isLoaded) {
      console.error('[SharedTaskModal] Not initialized. Call init() first.');
      throw new Error('SharedTaskModal non initialisé');
    }

    this.currentTask = null;
    this.formDataModule.clearForm();

    // Appliquer les valeurs par defaut
    if (defaults.statut) {
      this.setFieldValue('stm-statut', defaults.statut);
    }

    // Cacher les boutons Supprimer et Dupliquer pour nouvelle tache
    const btnDelete = document.getElementById('stm-btn-delete');
    if (btnDelete) {
      btnDelete.style.display = 'none';
    }
    const btnDuplicate = document.getElementById('stm-btn-duplicate');
    if (btnDuplicate) {
      btnDuplicate.style.display = 'none';
    }

    // Mettre a jour le titre
    const modalTitle = document.getElementById('stm-modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Nouvelle tâche';
    }

    if (!this.bsModal) {
      throw new Error('Bootstrap modal non initialisé');
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

  // === Delegate methods for backward compat ===

  setFieldValue(id, value) {
    this.formDataModule.setFieldValue(id, value);
  }

  getFieldValue(id) {
    return this.formDataModule.getFieldValue(id);
  }

  showError(msg) {
    this.crudModule.showError(msg);
  }

  truncate(str, len) {
    return this.referencesModule.truncate(str, len);
  }

  // === Phase 2 compat getters ===

  get jalons() { return this.jalonModule.jalons; }
  set jalons(val) { this.jalonModule.jalons = val; }

  get datePicker() { return this.datePickerModule.instance; }

  get taskLinks() { return this.taskLinksModule.links; }
  set taskLinks(val) { this.taskLinksModule.links = val; }

  get allTasks() { return this.taskLinksModule.allTasks; }
  set allTasks(val) { this.taskLinksModule.allTasks = val; }

  // Compatibilite pour les appels inline onclick existants
  removeTaskLink(taskId, type) { this.taskLinksModule.remove(taskId, type); }
}

// Exposer globalement pour compatibilite temporaire
window.SharedTaskModal = SharedTaskModal;
