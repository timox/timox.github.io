/**
 * ModalHistory - Gestion de l'historique dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere le sidebar historique, le chargement et l'affichage des entrees
 */

import { escapeHTML } from '../../utils/safe-dom.js';

export class ModalHistory {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Initialise l'onglet historique
   */
  initHistorySidebar() {
    // Listener pour charger l'historique quand l'onglet est selectionne
    const tabHistory = document.getElementById('tab-history');
    if (tabHistory) {
      tabHistory.addEventListener('shown.bs.tab', () => {
        this.loadTaskHistory();
      });
    }

    // Bouton actualiser
    const btnRefresh = document.getElementById('stm-btn-refresh-history');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.loadTaskHistory();
      });
    }
  }

  /**
   * Charge l'historique de la tache dans l'onglet
   * Parse le champ notes (format JSON: { content: "...", history: [...] })
   */
  async loadTaskHistory() {
    const timeline = document.getElementById('stm-history-timeline');
    const loadingEl = document.getElementById('stm-history-loading');
    const emptyEl = document.getElementById('stm-history-empty');

    if (!timeline || !this.modal.currentTask) {
      if (emptyEl) {
        emptyEl.style.display = 'block';
        const pEl = emptyEl.querySelector('p');
        if (pEl) pEl.textContent = 'Ouvrez une tâche pour voir son historique';
      }
      return;
    }

    // Afficher le chargement
    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    // Supprimer les anciennes entrees
    timeline.querySelectorAll('.history-entry-item').forEach(el => el.remove());

    try {
      // Parser l'historique depuis le champ notes (JSON)
      const historyEntries = this.parseNotesHistory(this.modal.currentTask);

      if (loadingEl) loadingEl.style.display = 'none';

      if (historyEntries.length > 0) {
        // Calculer les statistiques
        let modifications = historyEntries.length;
        let comments = historyEntries.filter(e => e.action === 'comment').length;
        let statusChanges = historyEntries.filter(e => e.action === 'status_change').length;
        let lastUpdate = historyEntries[0]?.timestamp || null;

        // Mettre a jour les stats
        this.updateHistoryStats(modifications, comments, statusChanges, lastUpdate);

        // Creer les entrees (triees du plus recent au plus ancien)
        historyEntries.forEach(entry => {
          const entryEl = this.createHistoryEntry(
            entry.timestamp,
            this.getActionLabel(entry.action),
            entry.user,
            entry.details || entry.newValue || ''
          );
          timeline.appendChild(entryEl);
        });
      } else {
        if (emptyEl) emptyEl.style.display = 'block';
        this.updateHistoryStats(0, 0, 0, null);
      }
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load history:', error);
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.style.display = 'block';
        const iEl = emptyEl.querySelector('i');
        const pEl = emptyEl.querySelector('p');
        if (iEl) iEl.className = 'bi bi-exclamation-circle';
        if (pEl) pEl.textContent = 'Erreur de chargement de l\'historique';
      }
      this.updateHistoryStats(0, 0, 0, null);
    }
  }

  /**
   * Parse l'historique depuis le champ notes (JSON)
   * Format: { content: "...", history: [{ timestamp, user, action, field, oldValue, newValue, details }] }
   */
  parseNotesHistory(task) {
    const entries = [];

    if (!task.notes) {
      return entries;
    }

    try {
      const notesData = typeof task.notes === 'string'
        ? JSON.parse(task.notes)
        : task.notes;

      if (notesData && notesData.history && Array.isArray(notesData.history)) {
        notesData.history.forEach(entry => {
          // Normaliser le timestamp
          let timestamp = entry.timestamp;
          if (typeof timestamp === 'string') {
            timestamp = new Date(timestamp).getTime();
          }
          // Convertir en secondes si en millisecondes
          if (timestamp > 1e12) {
            timestamp = Math.floor(timestamp / 1000);
          }

          entries.push({
            timestamp: timestamp,
            user: entry.user || 'Utilisateur',
            action: entry.action || 'update',
            field: entry.field || '',
            oldValue: entry.oldValue || '',
            newValue: entry.newValue || '',
            details: entry.details || '',
            status: entry.status || ''
          });
        });
      }
    } catch (error) {
      console.warn('[SharedTaskModal] Error parsing notes JSON:', error);
    }

    // Trier par date decroissante (plus recent en premier)
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return entries;
  }

  /**
   * Convertit un code d'action en libelle lisible
   */
  getActionLabel(action) {
    const labels = {
      'comment': 'Commentaire',
      'status_change': 'Changement de statut',
      'update': 'Modification',
      'field_change': 'Modification',
      'jalons_update': 'Jalons modifiés',
      'strategies_update': 'Stratégies modifiées',
      'create': 'Création'
    };
    return labels[action] || action || 'Modification';
  }

  /**
   * Cree une entree d'historique
   */
  createHistoryEntry(timestamp, action, user, details) {
    const entry = document.createElement('div');
    entry.className = 'history-entry-item';

    const dateStr = timestamp ? new Date(timestamp * 1000).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';

    // Determiner l'icone et la couleur selon l'action
    let iconClass = 'bi-pencil';
    let badgeClass = 'bg-secondary';
    const actionLower = action.toLowerCase();

    if (actionLower.includes('créé') || actionLower.includes('creation')) {
      iconClass = 'bi-plus-circle';
      badgeClass = 'bg-success';
    } else if (actionLower.includes('statut') || actionLower.includes('status')) {
      iconClass = 'bi-arrow-repeat';
      badgeClass = 'bg-primary';
    } else if (actionLower.includes('commentaire') || actionLower.includes('comment')) {
      iconClass = 'bi-chat-dots';
      badgeClass = 'bg-info';
    } else if (actionLower.includes('affectation') || actionLower.includes('assigné')) {
      iconClass = 'bi-person-check';
      badgeClass = 'bg-purple';
    } else if (actionLower.includes('supprim')) {
      iconClass = 'bi-trash';
      badgeClass = 'bg-danger';
    }

    // XSS fix: escape user data in innerHTML
    const safeAction = escapeHTML(action);
    const safeUser = escapeHTML(user);
    const safeDetails = escapeHTML(details);

    entry.innerHTML = `
      <div class="history-entry-icon">
        <i class="bi ${iconClass}"></i>
      </div>
      <div class="history-entry-content">
        <div class="history-entry-header">
          <span class="badge ${badgeClass}">${safeAction}</span>
          <span class="history-entry-time">${dateStr}</span>
        </div>
        <div class="history-entry-user">
          <i class="bi bi-person-circle me-1"></i>${safeUser}
        </div>
        ${safeDetails ? `<div class="history-entry-details">${safeDetails}</div>` : ''}
      </div>
    `;

    return entry;
  }

  /**
   * Met a jour les statistiques d'historique
   */
  updateHistoryStats(modifications, comments, statusChanges, lastUpdate) {
    const statModifications = document.getElementById('stm-stat-modifications');
    const statComments = document.getElementById('stm-stat-comments');
    const statStatusChanges = document.getElementById('stm-stat-status-changes');
    const statLastUpdate = document.getElementById('stm-stat-last-update');

    if (statModifications) statModifications.textContent = modifications;
    if (statComments) statComments.textContent = comments;
    if (statStatusChanges) statStatusChanges.textContent = statusChanges;
    if (statLastUpdate) {
      if (lastUpdate) {
        const date = new Date(lastUpdate * 1000);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          statLastUpdate.textContent = 'Aujourd\'hui';
        } else if (diffDays === 1) {
          statLastUpdate.textContent = 'Hier';
        } else if (diffDays < 7) {
          statLastUpdate.textContent = `Il y a ${diffDays}j`;
        } else {
          statLastUpdate.textContent = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        }
      } else {
        statLastUpdate.textContent = '-';
      }
    }
  }
}
