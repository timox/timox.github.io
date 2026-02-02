// === managers/history/HistoryExporter.js ===
// Export et affichage des commentaires et historique

import { displayError, displaySuccess } from '../../utils/dom.js';
import { formatDate } from '../../utils/dates.js';
import { escapeHTML } from '../../utils/safe-dom.js';

/**
 * Gestion de l'export de l'historique et de l'affichage des commentaires
 */
export class HistoryExporter {
  constructor(historyManager) {
    this.manager = historyManager;
  }

  /**
   * Affiche tous les commentaires dans une vue simplifiee
   */
  showAllComments() {
    if (!this.manager.currentTaskHistory) {
      displayError('Aucune tâche sélectionnée');
      return;
    }

    const historyData = this.manager.parseTaskHistory(this.manager.currentTaskHistory);
    const { comments } = historyData;

    if (comments.length === 0) {
      displayError('Aucun commentaire trouvé pour cette tâche');
      return;
    }

    const timelineContainer = document.getElementById('history-timeline');
    if (!timelineContainer) return;

    // Sauvegarder le contenu original
    const originalContent = timelineContainer.innerHTML;

    // Generer la vue des commentaires
    let commentsHTML = `
      <div class="text-center mb-4">
        <h6>
          <i class="bi bi-chat-square-text me-2"></i>
          Tous les commentaires (${comments.length})
        </h6>
        <button class="btn btn-sm btn-outline-secondary" id="btn-back-to-timeline">
          <i class="bi bi-arrow-left me-1"></i>Retour à la timeline
        </button>
      </div>
      <div class="all-comments-container">
    `;

    comments.forEach(comment => {
      const formattedDate = formatDate(comment.timestamp, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const userInfo = comment.user ? ` par ${escapeHTML(comment.user)}` : '';
      const latestBadge = comment.isLatest ?
        '<span class="badge bg-primary">Dernier commentaire</span>' : '';

      commentsHTML += `
        <div class="comment-item">
          <div class="comment-header">
            ${latestBadge}
            <span class="comment-timestamp text-muted">
              <i class="bi bi-clock"></i> ${formattedDate}${userInfo}
            </span>
          </div>
          <div class="comment-content">${escapeHTML(comment.content)}</div>
        </div>
      `;
    });

    commentsHTML += '</div>';

    timelineContainer.innerHTML = commentsHTML;

    // NOTE: Evenement #btn-back-to-timeline gere par EventCentralizer.js
    // (restauration du contenu original via data attribute)
    const backBtn = document.getElementById('btn-back-to-timeline');
    if (backBtn) {
      backBtn.dataset.originalContent = originalContent;
    }
  }

  /**
   * Exporte l'historique de la tache courante
   */
  exportTaskHistory() {
    if (!this.manager.currentTaskHistory) {
      displayError('Aucune tâche sélectionnée pour export');
      return;
    }

    try {
      const historyData = this.manager.parseTaskHistory(this.manager.currentTaskHistory);
      const csvData = this.generateTaskHistoryCSV(historyData);

      this.downloadCSV(csvData, `historique_tache_${this.manager.currentTaskHistory.id}_${new Date().toISOString().slice(0, 10)}.csv`);

      displaySuccess('Historique exporté avec succès');

    } catch (error) {
      this.manager.logger.error('Erreur export:', error);
      displayError('Erreur lors de l\'export de l\'historique');
    }
  }

  /**
   * Genere les donnees CSV pour l'historique d'une tache
   * @param {object} historyData - Donnees d'historique
   * @returns {string} Donnees CSV
   */
  generateTaskHistoryCSV(historyData) {
    const { task, timeline, stats } = historyData;

    let csv = 'Type,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';

    // Informations generales
    csv += `"Tâche","${task.titre}","${stats.creationDate ? stats.creationDate.toISOString() : ''}","","","ID: ${task.id}"\n`;
    csv += `"Statistiques","Total","","","${stats.totalDuration}","${stats.totalSteps} étapes, ${stats.totalComments} commentaires"\n`;

    // Entrees de timeline
    timeline.forEach(entry => {
      const date = entry.timestamp.toISOString();
      const user = entry.user || entry.utilisateur || '';
      const duration = entry.duration || '';
      let content = '';

      if (entry.type === 'status_change') {
        content = entry.note || 'Changement de statut';
        csv += `"Statut","${entry.statut}","${date}","${user}","${duration}","${content.replace(/"/g, '""')}"\n`;
      } else if (entry.type === 'comment') {
        content = entry.content || '';
        csv += `"Commentaire","","${date}","${user}","","${content.replace(/"/g, '""')}"\n`;
      }
    });

    return csv;
  }

  /**
   * Exporte l'historique complet de toutes les taches
   */
  exportFullHistory() {
    if (!this.manager.kanban.currentRecords || this.manager.kanban.currentRecords.length === 0) {
      displayError('Aucune tâche à exporter');
      return;
    }

    try {
      const csvData = this.generateFullHistoryCSV();
      this.downloadCSV(csvData, `historique_kanban_complet_${new Date().toISOString().slice(0, 10)}.csv`);

      displaySuccess(`Historique de ${this.manager.kanban.currentRecords.length} tâches exporté`);

    } catch (error) {
      this.manager.logger.error('Erreur export complet:', error);
      displayError('Erreur lors de l\'export complet');
    }
  }

  /**
   * Genere les donnees CSV pour l'historique complet
   * @returns {string} Donnees CSV
   */
  generateFullHistoryCSV() {
    let csv = 'ID_Tache,Titre,Projet,Statut_Actuel,Type_Entree,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';

    this.manager.kanban.currentRecords.forEach(task => {
      const historyData = this.manager.parseTaskHistory(task);
      const { timeline } = historyData;

      if (timeline.length === 0) {
        // Tache sans historique
        csv += `"${task.id}","${task.titre}","${task.projet || ''}","${task.statut}","Info","","","","","Pas d'historique disponible"\n`;
        return;
      }

      timeline.forEach(entry => {
        const date = entry.timestamp.toISOString();
        const user = entry.user || entry.utilisateur || '';
        const duration = entry.duration || '';
        let content = '';

        if (entry.type === 'status_change') {
          content = entry.note || 'Changement de statut';
          csv += `"${task.id}","${task.titre}","${task.projet || ''}","${task.statut}","Statut","${entry.statut}","${date}","${user}","${duration}","${content.replace(/"/g, '""')}"\n`;
        } else if (entry.type === 'comment') {
          content = entry.content || '';
          csv += `"${task.id}","${task.titre}","${task.projet || ''}","${task.statut}","Commentaire","","${date}","${user}","","${content.replace(/"/g, '""')}"\n`;
        }
      });
    });

    return csv;
  }

  /**
   * Telecharge un fichier CSV
   * @param {string} csvData - Donnees CSV
   * @param {string} filename - Nom du fichier
   */
  downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }
}
