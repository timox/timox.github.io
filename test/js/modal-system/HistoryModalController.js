/**
 * HistoryModalController - Controller spécialisé pour la modale d'historique
 * 
 * RESPONSABILITÉS:
 * - Gestion de l'affichage de l'historique des tâches
 * - Rendu de la timeline des modifications
 * - Gestion des commentaires et exports
 * - Interface avec HistoryManager pour la logique métier
 * 
 * MIGRATION:
 * - Remplace progressivement la logique de HistoryManager
 * - Maintient la compatibilité avec l'API existante
 * - Centralise la gestion de la modale historique
 */

import BaseModalController from './BaseModalController.js';

export class HistoryModalController extends BaseModalController {
  constructor(modalId = 'history-modal', options = {}) {
    super(modalId, options);
    
    // État spécifique à l'historique
    this.currentTask = null;
    this.historyData = null;
    this.filterMode = 'all'; // 'all', 'comments', 'changes'
    
    // Références aux managers externes
    this.historyManager = null;
    this.kanbanManager = null;
    
    this.logger.info('HistoryModalController initialisé');
  }

  /**
   * Options par défaut spécifiques à l'historique
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      autoLoadHistory: true,
      enableExport: true,
      enableCommentEdit: true,
      maxHistoryEntries: 1000
    };
  }

  // ==========================================
  // CYCLE DE VIE SPÉCIALISÉ
  // ==========================================

  /**
   * Validation avant ouverture
   */
  async validate(options = {}) {
    if (!options.taskId && !options.task) {
      throw new Error('taskId ou task requis pour ouvrir l\'historique');
    }

    // Validation de la tâche
    if (options.task) {
      this.currentTask = options.task;
    } else if (options.taskId) {
      // Récupération de la tâche via le kanban manager
      if (!this.kanbanManager) {
        throw new Error('KanbanManager non configuré');
      }
      
      this.currentTask = this.kanbanManager.currentRecords?.find(r => r.id == options.taskId);
      if (!this.currentTask) {
        throw new Error(`Tâche non trouvée: ${options.taskId}`);
      }
    }

    this.logger.info('Validation réussie pour tâche:', this.currentTask.id);
  }

  /**
   * Rendu du contenu de l'historique
   */
  async doRenderContent(options = {}) {
    this.logger.info('Rendu de l\'historique pour tâche:', this.currentTask.id);
    
    try {
      // 1. Mise à jour du titre
      this.setTitle(`
        <i class="bi bi-clock-history me-2"></i>
        Historique - ${this.currentTask.titre}
      `);
      
      // 2. Chargement des données d'historique
      this.setLoading(true, 'Chargement de l\'historique...');
      
      if (this.options.autoLoadHistory) {
        await this.loadHistoryData();
      }
      
      // 3. Rendu des différentes sections
      await this.renderHistoryStats();
      await this.renderHistoryTimeline();
      
      this.setLoading(false);
      
      this.logger.info('Rendu de l\'historique terminé');
      
    } catch (error) {
      this.setLoading(false);
      this.logger.error('Erreur rendu historique:', error);
      this.renderError(error.message);
      throw error;
    }
  }

  /**
   * Événements personnalisés pour l'historique
   */
  bindCustomEvents() {
    // Boutons de filtrage
    this.addEventHandler('click', '#btn-show-comments-only', this.handleFilterComments);
    this.addEventHandler('click', '#btn-show-all-history', this.handleFilterAll);
    
    // Export
    this.addEventHandler('click', '#btn-export-task-history', this.handleExport);
    
    // Édition de commentaires (si activée)
    if (this.options.enableCommentEdit) {
      this.addEventHandler('click', '.edit-comment-btn', this.handleEditComment);
      this.addEventHandler('click', '.save-comment-btn', this.handleSaveComment);
      this.addEventHandler('click', '.cancel-comment-btn', this.handleCancelComment);
    }
  }

  // ==========================================
  // CHARGEMENT ET TRAITEMENT DES DONNÉES
  // ==========================================

  /**
   * Charge les données d'historique
   */
  async loadHistoryData() {
    this.logger.info('Chargement données historique...');
    
    try {
      // Utilisation du HistoryManager existant si disponible
      if (this.historyManager && typeof this.historyManager.getTaskHistory === 'function') {
        this.historyData = await this.historyManager.getTaskHistory(this.currentTask);
      } else {
        // Fallback: extraction directe depuis les notes
        this.historyData = this.extractHistoryFromNotes();
      }
      
      this.logger.info(`Historique chargé: ${this.historyData?.entries?.length || 0} entrées`);
      
    } catch (error) {
      this.logger.error('Erreur chargement historique:', error);
      this.historyData = { entries: [], stats: {} };
    }
  }

  /**
   * Extraction de l'historique depuis les notes (fallback)
   */
  extractHistoryFromNotes() {
    if (!this.currentTask.notes) {
      return { entries: [], stats: {} };
    }

    try {
      const notes = typeof this.currentTask.notes === 'string' 
        ? JSON.parse(this.currentTask.notes) 
        : this.currentTask.notes;

      const entries = notes.history || [];
      
      // Statistiques de base
      const stats = {
        totalEntries: entries.length,
        commentCount: entries.filter(e => e.action === 'comment').length,
        changeCount: entries.filter(e => e.action !== 'comment').length,
        dateRange: this.calculateDateRange(entries)
      };

      return { entries, stats };
      
    } catch (error) {
      this.logger.error('Erreur parsing notes:', error);
      return { entries: [], stats: {} };
    }
  }

  /**
   * Calcule la plage de dates de l'historique
   */
  calculateDateRange(entries) {
    if (entries.length === 0) return null;
    
    const dates = entries
      .map(e => new Date(e.timestamp))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a - b);
    
    return dates.length > 0 ? {
      first: dates[0],
      last: dates[dates.length - 1]
    } : null;
  }

  // ==========================================
  // RENDU DES SECTIONS
  // ==========================================

  /**
   * Rendu des statistiques d'historique
   */
  async renderHistoryStats() {
    const statsContainer = this.findElement('#history-stats');
    if (!statsContainer) return;

    const stats = this.historyData?.stats || {};
    
    const statsHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card bg-light">
            <div class="card-body text-center py-2">
              <div class="fs-4 fw-bold text-primary">${stats.totalEntries || 0}</div>
              <small class="text-muted">Entrées totales</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-light">
            <div class="card-body text-center py-2">
              <div class="fs-4 fw-bold text-info">${stats.commentCount || 0}</div>
              <small class="text-muted">Commentaires</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-light">
            <div class="card-body text-center py-2">
              <div class="fs-4 fw-bold text-warning">${stats.changeCount || 0}</div>
              <small class="text-muted">Modifications</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-light">
            <div class="card-body text-center py-2">
              <div class="fs-6 fw-bold text-success">
                ${stats.dateRange ? this.formatDateRange(stats.dateRange) : 'N/A'}
              </div>
              <small class="text-muted">Période</small>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-3">
        <div class="btn-group" role="group" aria-label="Filtres historique">
          <button type="button" class="btn btn-outline-primary ${this.filterMode === 'all' ? 'active' : ''}" 
                  id="btn-show-all-history">
            <i class="bi bi-list me-1"></i>Tout afficher
          </button>
          <button type="button" class="btn btn-outline-info ${this.filterMode === 'comments' ? 'active' : ''}" 
                  id="btn-show-comments-only">
            <i class="bi bi-chat-square-text me-1"></i>Commentaires uniquement
          </button>
        </div>
      </div>
    `;
    
    statsContainer.innerHTML = statsHTML;
  }

  /**
   * Rendu de la timeline d'historique
   */
  async renderHistoryTimeline() {
    const timelineContainer = this.findElement('#history-timeline');
    if (!timelineContainer) return;

    const entries = this.getFilteredEntries();
    
    if (entries.length === 0) {
      timelineContainer.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="bi bi-clock-history fs-1"></i>
          <p class="mt-3">Aucune entrée d'historique disponible</p>
        </div>
      `;
      return;
    }

    const timelineHTML = entries.map((entry, index) => {
      return this.renderTimelineEntry(entry, index);
    }).join('');

    timelineContainer.innerHTML = `
      <div class="timeline">
        ${timelineHTML}
      </div>
    `;
  }

  /**
   * Rendu d'une entrée de timeline
   */
  renderTimelineEntry(entry, index) {
    const date = new Date(entry.timestamp).toLocaleString('fr-FR');
    const isComment = entry.action === 'comment';
    const iconClass = isComment ? 'bi-chat-square-text text-info' : 'bi-pencil-square text-warning';
    
    return `
      <div class="timeline-entry ${isComment ? 'comment-entry' : 'change-entry'}" data-index="${index}">
        <div class="timeline-marker">
          <i class="bi ${iconClass}"></i>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <strong>${entry.user || 'Utilisateur'}</strong>
            <small class="text-muted ms-2">${date}</small>
            ${this.options.enableCommentEdit && isComment ? this.renderEditButton(index) : ''}
          </div>
          <div class="timeline-body">
            <div class="timeline-action">
              <span class="badge bg-secondary me-2">${this.getActionLabel(entry.action)}</span>
              ${entry.status ? `<span class="badge bg-primary">${entry.status}</span>` : ''}
            </div>
            <div class="timeline-details mt-2">
              ${this.renderEntryDetails(entry)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Rendu des détails d'une entrée
   */
  renderEntryDetails(entry) {
    if (entry.action === 'comment') {
      return `<div class="comment-text">${entry.details || entry.newValue || ''}</div>`;
    }
    
    // Pour les autres actions, afficher les détails de modification
    let details = entry.details || '';
    
    if (entry.oldValue && entry.newValue) {
      details += `
        <div class="change-diff mt-2">
          <div class="old-value"><strong>Avant:</strong> ${entry.oldValue}</div>
          <div class="new-value"><strong>Après:</strong> ${entry.newValue}</div>
        </div>
      `;
    }
    
    return details;
  }

  /**
   * Bouton d'édition pour les commentaires
   */
  renderEditButton(index) {
    return `
      <button class="btn btn-sm btn-outline-secondary edit-comment-btn ms-2" 
              data-index="${index}" title="Éditer ce commentaire">
        <i class="bi bi-pencil"></i>
      </button>
    `;
  }

  // ==========================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ==========================================

  /**
   * Filtrage : afficher uniquement les commentaires
   */
  handleFilterComments(event) {
    this.filterMode = 'comments';
    this.renderHistoryStats();
    this.renderHistoryTimeline();
  }

  /**
   * Filtrage : afficher tout l'historique
   */
  handleFilterAll(event) {
    this.filterMode = 'all';
    this.renderHistoryStats();
    this.renderHistoryTimeline();
  }

  /**
   * Export de l'historique
   */
  async handleExport(event) {
    this.logger.info('Export historique demandé');
    
    try {
      // Utilisation du HistoryManager existant si disponible
      if (this.historyManager && typeof this.historyManager.exportTaskHistory === 'function') {
        await this.historyManager.exportTaskHistory(this.currentTask);
      } else {
        // Fallback: export simple
        await this.exportHistoryFallback();
      }
      
    } catch (error) {
      this.logger.error('Erreur export:', error);
      alert('Erreur lors de l\'export de l\'historique');
    }
  }

  /**
   * Export fallback
   */
  async exportHistoryFallback() {
    const data = {
      task: {
        id: this.currentTask.id,
        titre: this.currentTask.titre,
        statut: this.currentTask.statut
      },
      history: this.historyData?.entries || [],
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `historique-tache-${this.currentTask.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Édition d'un commentaire
   */
  handleEditComment(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    const entry = this.historyData?.entries[index];
    
    if (!entry || entry.action !== 'comment') return;
    
    // TODO: Implémenter l'édition de commentaire
    this.logger.info('Édition commentaire:', index);
  }

  /**
   * Sauvegarde d'un commentaire édité
   */
  handleSaveComment(event) {
    // TODO: Implémenter la sauvegarde
    this.logger.info('Sauvegarde commentaire');
  }

  /**
   * Annulation de l'édition
   */
  handleCancelComment(event) {
    // TODO: Implémenter l'annulation
    this.logger.info('Annulation édition commentaire');
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  /**
   * Récupère les entrées filtrées selon le mode actuel
   */
  getFilteredEntries() {
    const entries = this.historyData?.entries || [];
    
    switch (this.filterMode) {
      case 'comments':
        return entries.filter(e => e.action === 'comment');
      case 'all':
      default:
        return entries;
    }
  }

  /**
   * Libellé d'action traduit
   */
  getActionLabel(action) {
    const labels = {
      'comment': 'Commentaire',
      'field_change': 'Modification',
      'status_change': 'Changement statut',
      'create': 'Création',
      'update': 'Mise à jour',
      'delete': 'Suppression'
    };
    
    return labels[action] || action;
  }

  /**
   * Formatage de la plage de dates
   */
  formatDateRange(dateRange) {
    if (!dateRange) return 'N/A';
    
    const first = dateRange.first.toLocaleDateString('fr-FR');
    const last = dateRange.last.toLocaleDateString('fr-FR');
    
    return first === last ? first : `${first} → ${last}`;
  }

  /**
   * Rendu d'erreur
   */
  renderError(message) {
    const body = this.findElement('.modal-body');
    if (body) {
      body.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Erreur:</strong> ${message}
        </div>
      `;
    }
  }

  // ==========================================
  // CONFIGURATION EXTERNE
  // ==========================================

  /**
   * Configure les managers externes
   */
  setManagers(historyManager, kanbanManager) {
    this.historyManager = historyManager;
    this.kanbanManager = kanbanManager;
    this.logger.info('Managers configurés');
  }

  /**
   * API publique pour ouvrir l'historique (compatibilité)
   */
  async openTaskHistory(taskId) {
    if (this.registry) {
      await this.registry.open(this.modalId, { taskId });
    } else {
      this.logger.error('Registry non configuré');
    }
  }
}

// Pas besoin d'export default - déjà exporté avec la classe