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
    this.setFieldValue('stm-responsable', task.qui);
    this.setFieldValue('stm-bureau', task.bureau);
    this.setFieldValue('stm-projet', task.projet);
    this.setFieldValue('stm-urgence', task.urgence);
    this.setFieldValue('stm-impact', task.impact);

    // Classification V3
    this.setFieldValue('stm-nature', task.nature_activite);
    this.setFieldValue('stm-genre', task.genre_action);
    this.setFieldValue('stm-etape', task.etape_code);
    this.setFieldValue('stm-previsibilite', task.previsibilite);

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
    const data = {
      titre: this.getFieldValue('stm-titre'),
      description: this.getFieldValue('stm-description'),
      statut: this.getFieldValue('stm-statut'),
      qui: this.getFieldValue('stm-responsable'),
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
