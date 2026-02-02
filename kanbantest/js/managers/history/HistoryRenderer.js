// === managers/history/HistoryRenderer.js ===
// Rendu de l'historique et de la timeline dans le DOM

import { escapeHTML } from '../../utils/safe-dom.js';
import { formatDuration, formatDate } from '../../utils/dates.js';

/**
 * Rendu de l'historique des taches dans le DOM
 */
export class HistoryRenderer {
  constructor(historyManager) {
    this.manager = historyManager;
  }

  /**
   * Rend l'historique d'une tache dans la modal
   * @param {object} task - Donnees de la tache
   */
  renderTaskHistory(task) {
    // Sauvegarder la tache courante pour les boutons d'action
    this.manager.currentTaskHistory = task;
    this.manager.logger.info('Tâche sélectionnée pour historique:', task?.id, task?.titre);

    const historyData = this.manager.parseTaskHistory(task);
    this.manager.logger.debug('Historique parsé:', historyData.comments?.length, 'commentaires');

    this.renderHistoryStats(historyData);
    this.renderHistoryTimeline(historyData);
  }

  /**
   * Rend les statistiques de l'historique
   * @param {object} historyData - Donnees d'historique
   */
  renderHistoryStats(historyData) {
    const statsContainer = document.getElementById('history-stats');
    if (!statsContainer) return;

    const { stats, task } = historyData;

    statsContainer.innerHTML = `
      <div class="row g-3">
        <div class="col-md-2 text-center">
          <div class="stat-item">
            <div class="stat-value">${task.id}</div>
            <div class="stat-label">ID Tâche</div>
          </div>
        </div>
        <div class="col-md-2 text-center">
          <div class="stat-item">
            <div class="stat-value">${stats.totalSteps}</div>
            <div class="stat-label">Étapes</div>
          </div>
        </div>
        <div class="col-md-2 text-center">
          <div class="stat-item">
            <div class="stat-value">${stats.totalComments}</div>
            <div class="stat-label">Commentaires</div>
          </div>
        </div>
        <div class="col-md-3 text-center">
          <div class="stat-item">
            <div class="stat-value">${formatDuration(stats.totalDuration)}</div>
            <div class="stat-label">Durée totale</div>
          </div>
        </div>
        <div class="col-md-3 text-center">
          <div class="stat-item">
            <div class="stat-value">${stats.lastModified ? formatDate(stats.lastModified) : 'N/A'}</div>
            <div class="stat-label">Dernière MAJ</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Rend la timeline de l'historique
   * @param {object} historyData - Donnees d'historique
   */
  renderHistoryTimeline(historyData) {
    const timelineContainer = document.getElementById('history-timeline');
    if (!timelineContainer) return;

    const { timeline, task } = historyData;

    // En-tete avec titre de tache cliquable
    // XSS FIX: escapeHTML sur task.titre + remplacement onclick par data-attribute
    let headerHTML = '';
    if (task && task.titre) {
      headerHTML = `
        <div class="timeline-header" style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 6px;">
          <h5 style="margin: 0; color: #1565c0;">
            <span class="timeline-task-title" data-action="open-task-modal" data-task-id="${task.id}" style="cursor: pointer;">
              ${escapeHTML(task.titre)}
            </span>
          </h5>
          <small class="text-muted">Cliquez sur le titre pour éditer la tâche</small>
        </div>
      `;
    }

    if (timeline.length === 0) {
      timelineContainer.innerHTML = headerHTML + `
        <div class="text-center text-muted py-4">
          <i class="bi bi-clock-history fs-1"></i>
          <p class="mt-2">Aucun historique disponible</p>
        </div>
      `;
      // Attach event listeners after DOM insertion
      this._attachTimelineHeaderListeners(timelineContainer);
      return;
    }

    let timelineHTML = headerHTML + '<div class="timeline-container">';

    timeline.forEach((entry, index) => {
      if (entry.type === 'status_change') {
        timelineHTML += this.renderStatusChangeEntry(entry, index === 0);
      } else if (entry.type === 'comment') {
        timelineHTML += this.renderCommentEntry(entry);
      }
    });

    timelineHTML += '</div>';
    timelineContainer.innerHTML = timelineHTML;

    // Attach event listeners after DOM insertion
    this._attachTimelineHeaderListeners(timelineContainer);
  }

  /**
   * Attache les event listeners sur les elements de la timeline header
   * Remplace les inline onclick par addEventListener
   * @param {HTMLElement} container - Conteneur de la timeline
   */
  _attachTimelineHeaderListeners(container) {
    const titleEl = container.querySelector('[data-action="open-task-modal"]');
    if (titleEl) {
      const taskId = parseInt(titleEl.dataset.taskId, 10);
      titleEl.addEventListener('click', () => {
        window.kanbanManager?.modalManager?.openTaskModalById(taskId);
      });
    }
  }

  /**
   * Rend une entree de changement de statut
   * @param {object} entry - Entree d'historique
   * @param {boolean} isCurrent - Si c'est l'entree courante
   * @returns {string} HTML de l'entree
   */
  renderStatusChangeEntry(entry, isCurrent = false) {
    const currentClass = isCurrent ? 'current' : '';

    // Determiner l'icone selon le type d'action
    let statusIcon;
    if (entry.note && entry.note.includes('modifié')) {
      // C'est un changement de champ, pas de statut
      statusIcon = this.getFieldChangeIcon(entry.note);
    } else {
      // C'est un vrai changement de statut
      statusIcon = this.getStatusIcon(entry.statut);
    }

    // Formatage direct sans normalizeDate pour preserver l'heure
    const formattedDate = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let durationHTML = '';
    if (entry.duration && entry.duration > 0) {
      durationHTML = `
        <div class="timeline-duration">
          <i class="bi bi-stopwatch"></i>
          Durée dans ce statut: ${formatDuration(entry.duration)}
        </div>
      `;
    }

    let noteHTML = '';
    if (entry.note) {
      noteHTML = `
        <div class="timeline-note">
          <i class="bi bi-sticky"></i>
          ${escapeHTML(entry.note)}
        </div>
      `;
    }

    return `
      <div class="timeline-entry">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong>${escapeHTML(entry.statut)}</strong>
            ${isCurrent ? '<span class="badge bg-success ms-2">Actuel</span>' : ''}
          </div>
          <small class="text-muted">${formattedDate}</small>
        </div>
        ${entry.note ? `<div class="text-muted">${escapeHTML(entry.note)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Rend une entree de commentaire
   * @param {object} entry - Entree de commentaire
   * @returns {string} HTML de l'entree
   */
  renderCommentEntry(entry) {
    // Formatage direct sans normalizeDate pour preserver l'heure
    const formattedDate = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const userInfo = entry.user ? ` par ${escapeHTML(entry.user)}` : '';
    const latestBadge = entry.isLatest ? '<span class="badge bg-primary ms-2">Dernier</span>' : '';

    // Generer un ID unique pour le commentaire base sur le timestamp
    const timestampString = entry.timestamp instanceof Date ?
      entry.timestamp.toISOString() :
      String(entry.timestamp);
    const commentId = `comment-${timestampString.replace(/[^\d]/g, '')}`;
    this.manager.logger.debug('Rendu commentaire avec bouton édition:', commentId);

    return `
      <div class="timeline-entry">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong>💬 Commentaire</strong>
            ${latestBadge}
          </div>
          <small class="text-muted">${formattedDate}${userInfo}</small>
        </div>
        <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px;">
          ${escapeHTML(entry.content)}
        </div>
      </div>
    `;
  }

  /**
   * Rendre l'historique d'une tache dans un element donne
   * @param {number} taskId - ID de la tache
   * @param {HTMLElement} targetElement - Element cible
   */
  async renderTaskHistoryInElement(taskId, targetElement) {
    try {
      targetElement.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm"></div></div>';

      const gristApi = this.manager.commentGristSync.getGristApi();
      const { TABLE_ID } = await import('../../config/constants.js');
      const gristData = await gristApi.docApi.fetchTable(TABLE_ID);
      const mappedRecords = this.manager.kanban.mapGristRecords(gristData);
      const task = mappedRecords.find(r => r.id === taskId);

      if (!task) {
        targetElement.innerHTML = '<p class="text-muted">Tâche introuvable.</p>';
        return;
      }

      // Reutiliser la logique existante : parser et rendre dans l'element
      this.manager.currentTaskHistory = task;
      const historyData = this.manager.parseTaskHistory(task);

      // Generer le HTML dans l'element cible
      const statsHtml = this.generateStatsHtml(historyData);
      const timelineHtml = this.generateTimelineHtml(historyData);
      targetElement.innerHTML = statsHtml + timelineHtml;

    } catch (error) {
      this.manager.logger.error('Erreur rendu historique:', error);
      targetElement.innerHTML = '<p class="text-danger">Erreur lors du chargement.</p>';
    }
  }

  /**
   * Genere le HTML des statistiques d'historique (version inline)
   * @param {object} historyData - Donnees d'historique parsees
   * @returns {string} HTML
   */
  generateStatsHtml(historyData) {
    const stats = historyData.stats || {};
    return `<div class="history-stats-inline mb-2">
      <small class="text-muted">
        ${stats.totalSteps || 0} etape(s), ${stats.totalComments || 0} commentaire(s)
      </small>
    </div>`;
  }

  /**
   * Genere le HTML de la timeline d'historique (version inline)
   * @param {object} historyData - Donnees d'historique parsees
   * @returns {string} HTML
   */
  generateTimelineHtml(historyData) {
    const entries = historyData.merged || [];
    if (entries.length === 0) {
      return '<p class="text-muted">Aucun historique disponible.</p>';
    }

    const items = entries.slice(-10).map(entry => {
      const date = entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('fr-FR') : '';
      const action = escapeHTML(entry.action || entry.type || '');
      const details = escapeHTML(entry.details || entry.note || '');
      return `<div class="timeline-entry-inline py-1 border-bottom">
        <small class="text-muted">${date}</small>
        <span class="ms-2">${action}</span>
        ${details ? `<span class="ms-1 text-secondary">${details}</span>` : ''}
      </div>`;
    });

    return `<div class="history-timeline-inline">${items.join('')}</div>`;
  }

  /**
   * Retourne l'icone appropriee pour un statut
   * @param {string} status - Nom du statut
   * @returns {string} HTML de l'icone
   */
  getStatusIcon(status) {
    const icons = {
      'Backlog': '<i class="bi bi-list-ul text-secondary"></i>',
      'À faire': '<i class="bi bi-calendar-plus text-info"></i>',
      'En cours': '<i class="bi bi-play-circle text-warning"></i>',
      'En attente': '<i class="bi bi-pause-circle text-primary"></i>',
      'Bloqué': '<i class="bi bi-x-octagon text-danger"></i>',
      'Validation': '<i class="bi bi-check-circle text-purple"></i>',
      'Terminé': '<i class="bi bi-check-circle-fill text-success"></i>'
    };

    return icons[status] || '<i class="bi bi-circle text-muted"></i>';
  }

  /**
   * Retourne l'icone appropriee pour un changement de champ
   * @param {string} note - Note decrivant le changement
   * @returns {string} HTML de l'icone
   */
  getFieldChangeIcon(note) {
    if (note.includes('Titre')) return '<i class="bi bi-card-text text-primary"></i>';
    if (note.includes('Projet')) return '<i class="bi bi-folder text-info"></i>';
    if (note.includes('Équipe') || note.includes('bureau')) return '<i class="bi bi-people text-success"></i>';
    if (note.includes('Responsables') || note.includes('qui')) return '<i class="bi bi-person-badge text-warning"></i>';
    if (note.includes('Urgence')) return '<i class="bi bi-exclamation-triangle text-danger"></i>';
    if (note.includes('Impact')) return '<i class="bi bi-lightning text-warning"></i>';
    if (note.includes('stratégique') || note.includes('Objectif')) return '<i class="bi bi-bullseye text-primary"></i>';
    if (note.includes('Date')) return '<i class="bi bi-calendar-event text-info"></i>';
    if (note.includes('Description')) return '<i class="bi bi-file-text text-secondary"></i>';

    // Icone par defaut pour les autres changements
    return '<i class="bi bi-pencil-square text-muted"></i>';
  }
}
