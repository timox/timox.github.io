// === managers/history/HistoryValidator.js ===
// Validation et mise a jour de la structure d'historique

import { calculateDurationMinutes } from '../../utils/dates.js';

/**
 * Validateur et gestionnaire de mises a jour de l'historique
 */
export class HistoryValidator {
  constructor(historyManager) {
    this.manager = historyManager;
  }

  /**
   * Met a jour l'historique d'une tache lors d'un changement de statut
   * @param {object} task - Tache
   * @param {string} newStatus - Nouveau statut
   * @param {string} note - Note optionnelle
   * @returns {object} Donnees d'historique mises a jour
   */
  updateTaskHistory(task, newStatus, note = null) {
    const now = new Date().toISOString();
    const user = this.manager.kanban.currentUser || 'Système';

    try {
      let historyData;

      // Parser l'historique existant
      if (task.historique_statuts) {
        historyData = JSON.parse(task.historique_statuts);
      } else {
        historyData = { historique: [], version: 1 };
      }

      if (!historyData || typeof historyData !== 'object') {
        historyData = { historique: [], version: 1 };
      }

      if (!Array.isArray(historyData.historique)) {
        historyData.historique = [];
      }

      // Si il y a un historique, fermer la derniere entree
      if (historyData.historique.length > 0) {
        const lastEntry = historyData.historique[historyData.historique.length - 1];
        if (!lastEntry.date_sortie) {
          lastEntry.date_sortie = now;
          lastEntry.duree_minutes = calculateDurationMinutes(lastEntry.date_entree, now);
        }
      }

      // Ajouter la nouvelle entree
      historyData.historique.push({
        statut: newStatus,
        date_entree: now,
        date_sortie: null,
        duree_minutes: null,
        utilisateur: user,
        note: note,
        timestamp: now
      });

      return {
        historique_statuts: JSON.stringify(historyData),
        date_derniere_maj: now,
        statut_precedent: task.statut
      };

    } catch (error) {
      this.manager.logger.error('Erreur mise à jour historique:', error);

      // Historique de secours
      const fallbackHistory = {
        historique: [{
          statut: newStatus,
          date_entree: now,
          date_sortie: null,
          duree_minutes: null,
          utilisateur: user,
          note: note || "Historique reconstruit après erreur",
          timestamp: now
        }],
        version: 1
      };

      return {
        historique_statuts: JSON.stringify(fallbackHistory),
        date_derniere_maj: now,
        statut_precedent: task.statut || 'Inconnu'
      };
    }
  }

  /**
   * Valide la structure d'un historique
   * @param {string} historyJSON - Historique au format JSON
   * @returns {object} Resultat de validation
   */
  validateHistoryStructure(historyJSON) {
    try {
      const data = JSON.parse(historyJSON);

      if (!data.historique || !Array.isArray(data.historique)) {
        return { isValid: false, error: 'Structure historique invalide' };
      }

      const invalidEntries = data.historique.filter(entry =>
        !entry.statut || !entry.date_entree
      );

      if (invalidEntries.length > 0) {
        return {
          isValid: false,
          error: `${invalidEntries.length} entrée(s) invalide(s) trouvée(s)`
        };
      }

      return { isValid: true, entriesCount: data.historique.length };

    } catch (error) {
      return { isValid: false, error: 'JSON invalide' };
    }
  }

  /**
   * Genere un badge d'historique pour une tache
   * @param {object} task - Donnees de la tache
   * @returns {string} HTML du badge ou chaine vide
   */
  generateHistoryBadge(task) {
    if (!task.historique_statuts) return '';

    try {
      const historyData = JSON.parse(task.historique_statuts);
      const historyCount = historyData.historique ? historyData.historique.length : 0;

      if (historyCount <= 1) return '';

      return `
        <button class="btn-history" title="Voir l'historique (${historyCount} étapes)" data-task-id="${task.id}">
          <i class="bi bi-clock-history"></i> ${historyCount}
        </button>
      `;
    } catch (error) {
      this.manager.logger.warn('Erreur génération badge:', error);
      return '';
    }
  }

  /**
   * Obtient un resume rapide de l'historique d'une tache
   * @param {object} task - Donnees de la tache
   * @returns {object} Resume de l'historique
   */
  getTaskHistorySummary(task) {
    const historyData = this.manager.parseTaskHistory(task);

    return {
      stepCount: historyData.stats.totalSteps,
      commentCount: historyData.stats.totalComments,
      totalDuration: historyData.stats.totalDuration,
      creationDate: historyData.stats.creationDate,
      lastModified: historyData.stats.lastModified,
      currentStatus: historyData.stats.currentStatus,
      hasHistory: historyData.history.length > 0,
      hasComments: historyData.comments.length > 0
    };
  }
}
