// === JalonManager.js ===
// Gestionnaire des jalons avec formulaire inline simplifié

import { setFieldValue, getFieldValue } from '../utils/dom.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

export class JalonManager {
  constructor(kanban) {
    this.kanban = kanban;
    this.jalons = []; // Jalons de la tâche actuellement ouverte
    this.currentTaskId = null; // ID de la tâche en cours d'édition

    this.init();
  }

  init() {
    this.logger = createModuleLogger('JalonManager');
    this.logger.debug('Initialisation JalonManager (mode inline)...');
  }

  /**
   * Définit l'ID de la tâche en cours d'édition
   */
  setCurrentTaskId(taskId) {
    // Si on change de tâche, réinitialiser complètement
    if (this.currentTaskId !== taskId) {
      this.logger.debug(`Changement de tâche ${this.currentTaskId} → ${taskId}`);
      this.jalons = [];
      this.logger.debug(`Jalons réinitialisés pour la tâche ${taskId}`);
      this.updateJalonsDisplay();
    }
    this.currentTaskId = taskId;
  }

  /**
   * Récupère l'ID de la tâche en cours d'édition
   */
  getCurrentTaskId() {
    return this.currentTaskId;
  }

  /**
   * Ajoute un jalon depuis le formulaire inline
   */
  async addJalonInline() {
    const titreElement = document.getElementById('jalon-inline-titre');
    const dateElement = document.getElementById('jalon-inline-date');

    if (!titreElement || !dateElement) {
      this.logger.error('Éléments du formulaire inline non trouvés');
      return;
    }

    const titre = titreElement.value.trim();
    const date = dateElement.value;

    // Validation
    if (!titre) {
      this.showValidationError('Le titre du jalon est obligatoire');
      titreElement.focus();
      return;
    }

    if (!date) {
      this.showValidationError('La date du jalon est obligatoire');
      dateElement.focus();
      return;
    }

    // Créer le jalon
    const jalonData = {
      id: this.generateJalonId(),
      titre: titre,
      date: date,
      statut: 'planifie',
      created_at: new Date().toISOString()
    };

    // Ajouter le jalon
    this.addJalon(jalonData);

    // Historique
    const taskId = this.getCurrentTaskId();
    if (taskId && this.kanban.userActionManager) {
      await this.kanban.userActionManager.addHistoryEntry(
        taskId,
        'jalon_ajoute',
        `Nouveau jalon: ${jalonData.titre} (${jalonData.date})`,
        '',
        JSON.stringify(jalonData),
        ''
      );
    }

    // Vider le formulaire
    titreElement.value = '';
    dateElement.value = '';
    titreElement.focus();

    // Mettre à jour l'affichage
    this.updateJalonsDisplay();
    this.saveJalonsToForm();

    this.logger.info(`✅ Jalon ajouté: ${jalonData.titre}`);
  }

  /**
   * Ajoute un nouveau jalon
   */
  addJalon(jalonData) {
    // Vérifier qu'on n'ajoute pas un doublon basé sur l'ID
    const existingIndex = this.jalons.findIndex(j => j.id === jalonData.id);
    if (existingIndex !== -1) {
      this.logger.warn('Jalon avec même ID déjà existant, mise à jour:', jalonData.id);
      this.jalons[existingIndex] = jalonData;
    } else {
      this.jalons.push(jalonData);
      this.logger.debug('Jalon ajouté:', jalonData.titre, `(Total: ${this.jalons.length})`);
    }

    // Synchroniser avec le formulaire
    this.saveJalonsToForm();
  }

  /**
   * Supprime un jalon
   */
  async deleteJalon(id) {
    if (!id) {
      this.logger.error('ID de jalon manquant pour la suppression');
      return;
    }

    this.logger.debug('Tentative suppression jalon ID:', id);

    let index = this.jalons.findIndex(j => j.id === id);

    // Si pas trouvé avec correspondance exacte, essayer avec conversion de type
    if (index === -1) {
      index = this.jalons.findIndex(j => String(j.id) === String(id));
    }

    if (index === -1) {
      this.logger.warn(`Jalon ${id} non trouvé pour suppression`);
      return;
    }

    // Jalon trouvé - procéder à la suppression
    const jalonData = this.jalons[index];
    const taskId = this.getCurrentTaskId();

    this.logger.info(`🗑️ Suppression du jalon: "${jalonData.titre}"`);

    try {
      this.jalons.splice(index, 1);

      // Mettre à jour l'affichage
      this.updateJalonsDisplay();
      this.saveJalonsToForm();

      // Ajouter à l'historique
      if (taskId && this.kanban.userActionManager) {
        await this.kanban.userActionManager.addHistoryEntry(
          taskId,
          'jalon_supprime',
          `Jalon supprimé: ${jalonData.titre} (${jalonData.date})`,
          JSON.stringify(jalonData),
          '',
          ''
        );
      }

      this.logger.info(`✅ Jalon supprimé avec succès: ${id}`);

    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du jalon:`, error);
      throw error;
    }
  }

  /**
   * Met à jour l'affichage des jalons dans la timeline
   */
  updateJalonsDisplay() {
    this.logger.debug(`🔄 updateJalonsDisplay: ${this.jalons.length} jalons à afficher`);

    const timeline = document.getElementById('jalons-timeline');
    const emptyState = document.getElementById('jalons-empty');
    const countBadge = document.getElementById('jalons-count');

    // Vérifier que les éléments existent
    if (!timeline || !countBadge) {
      this.logger.debug('Éléments DOM jalons non trouvés - modale probablement fermée');
      return;
    }

    // Mettre à jour le compteur
    countBadge.textContent = this.jalons.length;

    // Vider le timeline
    timeline.innerHTML = '';

    if (this.jalons.length === 0) {
      // Afficher l'état vide
      timeline.innerHTML = `
        <div class="text-center text-muted py-2" id="jalons-empty">
          <i class="bi bi-calendar-x"></i>
          <p class="small mb-0 mt-1">Aucun jalon défini</p>
        </div>
      `;
      return;
    }

    // Trier les jalons par date
    const sortedJalons = [...this.jalons].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Générer le HTML des jalons
    const html = sortedJalons.map(jalon => this.renderJalonItem(jalon)).join('');
    timeline.innerHTML = html;

    this.logger.debug(`✅ Affichage jalons terminé`);
  }

  /**
   * Génère le HTML d'un jalon (version simplifiée)
   */
  renderJalonItem(jalon) {
    const date = new Date(jalon.date);
    const now = new Date();
    const isOverdue = date < now && jalon.statut !== 'termine';
    const isCompleted = jalon.statut === 'termine';

    let statusClass = '';
    let statusIcon = '📅';

    if (isCompleted) {
      statusClass = 'text-success';
      statusIcon = '✅';
    } else if (isOverdue) {
      statusClass = 'text-danger';
      statusIcon = '⚠️';
    }

    const dateStr = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return `
      <div class="jalon-item d-flex align-items-center justify-content-between py-2 px-2 mb-1 rounded ${statusClass}"
           data-jalon-id="${jalon.id}"
           style="background: ${isCompleted ? '#d1e7dd' : (isOverdue ? '#f8d7da' : '#e9ecef')};">
        <div class="d-flex align-items-center flex-grow-1">
          <span class="me-2">${statusIcon}</span>
          <span class="fw-medium me-2">${this.escapeHtml(jalon.titre)}</span>
          <small class="text-muted">${dateStr}</small>
        </div>
        <div class="jalon-actions">
          <select class="jalon-status-select form-select form-select-sm me-1"
                  data-jalon-id="${jalon.id}"
                  style="width: auto; padding: 0.15rem 1.5rem 0.15rem 0.5rem; font-size: 0.75rem;">
            <option value="planifie" ${jalon.statut === 'planifie' ? 'selected' : ''}>Planifié</option>
            <option value="en_cours" ${jalon.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
            <option value="termine" ${jalon.statut === 'termine' ? 'selected' : ''}>Terminé</option>
            <option value="annule" ${jalon.statut === 'annule' ? 'selected' : ''}>Annulé</option>
          </select>
          <button class="btn btn-sm btn-outline-danger btn-delete-jalon py-0 px-1"
                  data-jalon-id="${jalon.id}"
                  title="Supprimer">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Met à jour le statut d'un jalon
   */
  updateJalonStatus(jalonId, newStatus) {
    const jalon = this.jalons.find(j => j.id === jalonId || String(j.id) === String(jalonId));
    if (jalon) {
      jalon.statut = newStatus;
      this.updateJalonsDisplay();
      this.saveJalonsToForm();
      this.logger.debug(`Statut jalon ${jalonId} mis à jour: ${newStatus}`);
    }
  }

  /**
   * Vide les jalons pour une nouvelle tâche
   */
  clearJalonsForNewTask() {
    this.logger.debug('Clearing jalons for new task');
    this.jalons = [];
    this.currentTaskId = null;
    this.updateJalonsDisplay();

    // Vider le formulaire inline
    const titreElement = document.getElementById('jalon-inline-titre');
    const dateElement = document.getElementById('jalon-inline-date');
    if (titreElement) titreElement.value = '';
    if (dateElement) dateElement.value = '';
  }

  /**
   * Charge les jalons depuis les données de la tâche
   */
  loadJalonsFromTask(taskData) {
    try {
      // Extraire l'ID de la tâche
      const taskId = taskData?.id || taskData?.id_task;

      // Si pas de taskData ou pas d'ID, réinitialiser
      if (!taskData || !taskId) {
        this.logger.debug('loadJalonsFromTask: Pas de taskData ou d\'ID, réinitialisation');
        this.setCurrentTaskId(null);
        this.jalons = [];
        this.updateJalonsDisplay();
        this.saveJalonsToForm();
        return;
      }

      // Définir la tâche courante
      this.setCurrentTaskId(taskId);

      // Charger depuis les données de la tâche
      if (taskData.jalons) {
        let jalonsFromDB = [];

        if (typeof taskData.jalons === 'string') {
          const jalonsData = JSON.parse(taskData.jalons);
          // Nouveau format avec {jalons: [...]}
          if (jalonsData && jalonsData.jalons && Array.isArray(jalonsData.jalons)) {
            jalonsFromDB = [...jalonsData.jalons];
          }
          // Ancien format (array direct)
          else if (Array.isArray(jalonsData)) {
            jalonsFromDB = [...jalonsData];
          }
        } else if (Array.isArray(taskData.jalons)) {
          jalonsFromDB = [...taskData.jalons];
        }

        this.jalons = jalonsFromDB;
        this.logger.debug(`${jalonsFromDB.length} jalons chargés depuis la DB pour la tâche ${taskId}`);
      } else {
        this.jalons = [];
        this.logger.debug(`Aucun jalon en DB pour la tâche ${taskId}`);
      }

      this.updateJalonsDisplay();
      this.saveJalonsToForm();

    } catch (error) {
      this.logger.error('Erreur lors du chargement des jalons:', error);
      this.jalons = [];
      this.updateJalonsDisplay();
      this.saveJalonsToForm();
    }
  }

  /**
   * Sauvegarde les jalons dans le champ caché du formulaire
   */
  saveJalonsToForm() {
    this.logger.debug(`🔄 saveJalonsToForm: ${this.jalons.length} jalons à sauvegarder`);

    const jalonsData = {
      jalons: this.jalons || [],
      lastModified: new Date().toISOString()
    };
    const jsonString = JSON.stringify(jalonsData);

    setFieldValue('popup-jalons', jsonString);
    this.logger.debug(`💾 Sauvegarde: ${this.jalons.length} jalons`);
  }

  /**
   * Récupère les jalons depuis le formulaire pour sauvegarde
   */
  getJalonsForSave() {
    this.logger.debug(`🔍 getJalonsForSave: ${this.jalons?.length || 0} jalons en mémoire`);

    const jalonsData = {
      jalons: this.jalons || [],
      lastModified: new Date().toISOString()
    };

    return JSON.stringify(jalonsData);
  }

  // === UTILITAIRES ===

  generateJalonId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showValidationError(message) {
    // Utiliser le toast si disponible, sinon alert
    if (this.kanban?.toastManager) {
      this.kanban.toastManager.showError(message);
    } else {
      alert(message);
    }
  }
}
