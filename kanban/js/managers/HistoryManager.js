// === managers/HistoryManager.js ===
// Gestionnaire pour l'historique des tâches et les commentaires

import { 
  generateTimestamp, 
  parseTimestamp, 
  calculateDurationMinutes, 
  formatDuration,
  formatDate 
} from '../utils/dates.js';

import { displayError, displaySuccess } from '../utils/dom.js';

/**
 * Gestionnaire pour l'historique des tâches et commentaires
 */
export class HistoryManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentTaskHistory = null;
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire d'historique
   */
  init() {
    this.setupEventListeners();
    console.log('HistoryManager: Gestionnaire d\'historique initialisé');
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Bouton "Voir tous les commentaires"
    const btnShowComments = document.getElementById('btn-show-comments-only');
    if (btnShowComments) {
      btnShowComments.addEventListener('click', () => {
        this.showAllComments();
      });
    }
    
    // Bouton "Exporter cette tâche"
    const btnExportTask = document.getElementById('btn-export-task-history');
    if (btnExportTask) {
      btnExportTask.addEventListener('click', () => {
        this.exportTaskHistory();
      });
    }
    
    // Écouteurs pour les boutons d'historique sur les cartes
    document.addEventListener('click', (e) => {
      if (e.target.matches('.btn-history, .btn-history *')) {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.target.closest('.btn-history');
        const taskId = parseInt(button.dataset.taskId, 10);
        
        if (!isNaN(taskId)) {
          this.openTaskHistory(taskId);
        }
      }
    });
  }
  
  /**
   * Ouvre l'historique d'une tâche
   * @param {number} taskId - ID de la tâche
   */
  openTaskHistory(taskId) {
    const task = this.kanban.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      displayError('Tâche non trouvée');
      return;
    }
    
    this.currentTaskHistory = task;
    
    if (this.kanban.modalManager) {
      this.kanban.modalManager.openHistoryModal(taskId);
    } else {
      this.renderTaskHistory(task);
    }
  }
  
  /**
   * Rend l'historique d'une tâche dans la modal
   * @param {object} task - Données de la tâche
   */
  renderTaskHistory(task) {
    const historyData = this.parseTaskHistory(task);
    
    this.renderHistoryStats(historyData);
    this.renderHistoryTimeline(historyData);
  }
  
  /**
   * Parse l'historique d'une tâche depuis les données Grist
   * @param {object} task - Données de la tâche
   * @returns {object} Historique parsé
   */
  parseTaskHistory(task) {
    let history = [];
    let comments = [];
    
    // Parser l'historique des statuts
    if (task.historique_statuts) {
      try {
        const historyData = JSON.parse(task.historique_statuts);
        if (historyData && historyData.historique) {
          history = historyData.historique;
        }
      } catch (error) {
        console.warn('HistoryManager: Erreur parsing historique_statuts:', error);
      }
    }
    
    // Parser les commentaires depuis la description
    if (task.description) {
      comments = this.parseCommentsFromDescription(task.description);
    }
    
    // Calculer les statistiques
    const stats = this.calculateHistoryStats(history, comments, task);
    
    // Fusionner historique et commentaires par chronologie
    const timeline = this.mergeHistoryAndComments(history, comments);
    
    return {
      task,
      history,
      comments,
      timeline,
      stats
    };
  }
  
  /**
   * Parse les commentaires depuis la description
   * @param {string} description - Description avec commentaires horodatés
   * @returns {Array} Liste des commentaires
   */
  parseCommentsFromDescription(description) {
    if (!description) return [];
    
    const comments = [];
    const sections = description.split(/^---\s*$/gm);
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      if (lines.length === 0) return;
      
      const firstLine = lines[0].trim();
      const timestampMatch = firstLine.match(/^\((\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})(\s*\([^)]+\))?\)$/);
      
      if (timestampMatch) {
        const timestampStr = timestampMatch[1];
        const userStr = timestampMatch[2] ? timestampMatch[2].slice(2, -1) : null; // Enlever " (" et ")"
        const content = lines.slice(1).join('\n').trim();
        
        if (content) {
          const timestamp = parseTimestamp(firstLine);
          
          comments.push({
            timestamp: timestamp || new Date(),
            timestampStr,
            user: userStr,
            content,
            isLatest: index === 0
          });
        }
      }
    });
    
    return comments.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Fusionne l'historique des statuts et les commentaires
   * @param {Array} history - Historique des statuts
   * @param {Array} comments - Commentaires
   * @returns {Array} Timeline fusionnée
   */
  mergeHistoryAndComments(history, comments) {
    const timeline = [];
    
    // Ajouter les changements de statut
    history.forEach(entry => {
      if (entry.timestamp) {
        timeline.push({
          type: 'status_change',
          timestamp: new Date(entry.timestamp),
          ...entry
        });
      }
    });
    
    // Ajouter les commentaires
    comments.forEach(comment => {
      timeline.push({
        type: 'comment',
        timestamp: comment.timestamp,
        ...comment
      });
    });
    
    // Trier par timestamp (plus récent en premier)
    return timeline.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Calcule les statistiques de l'historique
   * @param {Array} history - Historique des statuts
   * @param {Array} comments - Commentaires
   * @param {object} task - Données de la tâche
   * @returns {object} Statistiques
   */
  calculateHistoryStats(history, comments, task) {
    const stats = {
      totalSteps: history.length,
      totalComments: comments.length,
      currentStatus: task.statut,
      creationDate: null,
      lastModified: null,
      totalDuration: 0,
      averageStepDuration: 0
    };
    
    if (history.length > 0) {
      // Date de création (premier statut)
      const firstEntry = history[history.length - 1];
      if (firstEntry.timestamp) {
        stats.creationDate = new Date(firstEntry.timestamp);
      }
      
      // Dernière modification (dernier statut)
      const lastEntry = history[0];
      if (lastEntry.timestamp) {
        stats.lastModified = new Date(lastEntry.timestamp);
      }
      
      // Durée totale
      if (stats.creationDate && stats.lastModified) {
        stats.totalDuration = calculateDurationMinutes(stats.creationDate, stats.lastModified);
        stats.averageStepDuration = Math.round(stats.totalDuration / history.length);
      }
    }
    
    // Inclure les commentaires dans la date de dernière modification
    if (comments.length > 0 && comments[0].timestamp) {
      const lastCommentDate = comments[0].timestamp;
      if (!stats.lastModified || lastCommentDate > stats.lastModified) {
        stats.lastModified = lastCommentDate;
      }
    }
    
    return stats;
  }
  
  /**
   * Rend les statistiques de l'historique
   * @param {object} historyData - Données d'historique
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
   * @param {object} historyData - Données d'historique
   */
  renderHistoryTimeline(historyData) {
    const timelineContainer = document.getElementById('history-timeline');
    if (!timelineContainer) return;
    
    const { timeline, task } = historyData;
    
    if (timeline.length === 0) {
      timelineContainer.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-clock-history fs-1"></i>
          <p class="mt-2">Aucun historique disponible</p>
        </div>
      `;
      return;
    }
    
    let timelineHTML = '';
    
    timeline.forEach((entry, index) => {
      if (entry.type === 'status_change') {
        timelineHTML += this.renderStatusChangeEntry(entry, index === 0);
      } else if (entry.type === 'comment') {
        timelineHTML += this.renderCommentEntry(entry);
      }
    });
    
    timelineContainer.innerHTML = timelineHTML;
  }
  
  /**
   * Rend une entrée de changement de statut
   * @param {object} entry - Entrée d'historique
   * @param {boolean} isCurrent - Si c'est l'entrée courante
   * @returns {string} HTML de l'entrée
   */
  renderStatusChangeEntry(entry, isCurrent = false) {
    const currentClass = isCurrent ? 'current' : '';
    const statusIcon = this.getStatusIcon(entry.statut);
    const formattedDate = formatDate(entry.timestamp, {
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
          ${entry.note}
        </div>
      `;
    }
    
    return `
      <div class="timeline-entry ${currentClass}">
        <div class="timeline-status">
          ${statusIcon}
          ${entry.statut}
          ${isCurrent ? '<span class="badge bg-success ms-2">Actuel</span>' : ''}
        </div>
        <div class="timeline-dates">
          <i class="bi bi-calendar3"></i>
          ${formattedDate}
        </div>
        ${durationHTML}
        ${noteHTML}
      </div>
    `;
  }
  
  /**
   * Rend une entrée de commentaire
   * @param {object} entry - Entrée de commentaire
   * @returns {string} HTML de l'entrée
   */
  renderCommentEntry(entry) {
    const formattedDate = formatDate(entry.timestamp, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const userInfo = entry.user ? ` par ${entry.user}` : '';
    const latestBadge = entry.isLatest ? '<span class="badge bg-primary ms-2">Dernier</span>' : '';
    
    return `
      <div class="timeline-entry">
        <div class="timeline-status">
          <i class="bi bi-chat-square-text text-info"></i>
          Commentaire${latestBadge}
        </div>
        <div class="timeline-dates">
          <i class="bi bi-calendar3"></i>
          ${formattedDate}${userInfo}
        </div>
        <div class="timeline-comment">
          <div class="comment-content">${entry.content}</div>
        </div>
      </div>
    `;
  }
  
  /**
   * Retourne l'icône appropriée pour un statut
   * @param {string} status - Nom du statut
   * @returns {string} HTML de l'icône
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
   * Affiche tous les commentaires dans une vue simplifiée
   */
  showAllComments() {
    if (!this.currentTaskHistory) {
      displayError('Aucune tâche sélectionnée');
      return;
    }
    
    const historyData = this.parseTaskHistory(this.currentTaskHistory);
    const { comments } = historyData;
    
    if (comments.length === 0) {
      displayError('Aucun commentaire trouvé pour cette tâche');
      return;
    }
    
    const timelineContainer = document.getElementById('history-timeline');
    if (!timelineContainer) return;
    
    // Sauvegarder le contenu original
    const originalContent = timelineContainer.innerHTML;
    
    // Générer la vue des commentaires
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
      
      const userInfo = comment.user ? ` par ${comment.user}` : '';
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
          <div class="comment-content">${comment.content}</div>
        </div>
      `;
    });
    
    commentsHTML += '</div>';
    
    timelineContainer.innerHTML = commentsHTML;
    
    // Ajouter l'écouteur pour le bouton retour
    const backBtn = document.getElementById('btn-back-to-timeline');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        timelineContainer.innerHTML = originalContent;
      });
    }
  }
  
  /**
   * Exporte l'historique de la tâche courante
   */
  exportTaskHistory() {
    if (!this.currentTaskHistory) {
      displayError('Aucune tâche sélectionnée pour export');
      return;
    }
    
    try {
      const historyData = this.parseTaskHistory(this.currentTaskHistory);
      const csvData = this.generateTaskHistoryCSV(historyData);
      
      this.downloadCSV(csvData, `historique_tache_${this.currentTaskHistory.id}_${new Date().toISOString().slice(0, 10)}.csv`);
      
      displaySuccess('Historique exporté avec succès');
      
    } catch (error) {
      console.error('HistoryManager: Erreur export:', error);
      displayError('Erreur lors de l\'export de l\'historique');
    }
  }
  
  /**
   * Génère les données CSV pour l'historique d'une tâche
   * @param {object} historyData - Données d'historique
   * @returns {string} Données CSV
   */
  generateTaskHistoryCSV(historyData) {
    const { task, timeline, stats } = historyData;
    
    let csv = 'Type,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';
    
    // Informations générales
    csv += `"Tâche","${task.titre}","${stats.creationDate ? stats.creationDate.toISOString() : ''}","","","ID: ${task.id}"\n`;
    csv += `"Statistiques","Total","","","${stats.totalDuration}","${stats.totalSteps} étapes, ${stats.totalComments} commentaires"\n`;
    
    // Entrées de timeline
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
   * Exporte l'historique complet de toutes les tâches
   */
  exportFullHistory() {
    if (!this.kanban.currentRecords || this.kanban.currentRecords.length === 0) {
      displayError('Aucune tâche à exporter');
      return;
    }
    
    try {
      const csvData = this.generateFullHistoryCSV();
      this.downloadCSV(csvData, `historique_kanban_complet_${new Date().toISOString().slice(0, 10)}.csv`);
      
      displaySuccess(`Historique de ${this.kanban.currentRecords.length} tâches exporté`);
      
    } catch (error) {
      console.error('HistoryManager: Erreur export complet:', error);
      displayError('Erreur lors de l\'export complet');
    }
  }
  
  /**
   * Génère les données CSV pour l'historique complet
   * @returns {string} Données CSV
   */
  generateFullHistoryCSV() {
    let csv = 'ID_Tache,Titre,Projet,Statut_Actuel,Type_Entree,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';
    
    this.kanban.currentRecords.forEach(task => {
      const historyData = this.parseTaskHistory(task);
      const { timeline } = historyData;
      
      if (timeline.length === 0) {
        // Tâche sans historique
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
   * Télécharge un fichier CSV
   * @param {string} csvData - Données CSV
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
  
  /**
   * Met à jour l'historique d'une tâche lors d'un changement de statut
   * @param {object} task - Tâche
   * @param {string} newStatus - Nouveau statut
   * @param {string} note - Note optionnelle
   * @returns {object} Données d'historique mises à jour
   */
  updateTaskHistory(task, newStatus, note = null) {
    const now = new Date().toISOString();
    const user = this.kanban.currentUser || 'Système';
    
    try {
      let historyData;
      
      // Parser l'historique existant
      if (task.historique_statuts) {
        historyData = JSON.parse(task.historique_statuts);
      } else {
        historyData = { historique: [], version: 1 };
      }
      
      // Si il y a un historique, fermer la dernière entrée
      if (historyData.historique.length > 0) {
        const lastEntry = historyData.historique[historyData.historique.length - 1];
        if (!lastEntry.date_sortie) {
          lastEntry.date_sortie = now;
          lastEntry.duree_minutes = calculateDurationMinutes(lastEntry.date_entree, now);
        }
      }
      
      // Ajouter la nouvelle entrée
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
      console.error('HistoryManager: Erreur mise à jour historique:', error);
      
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
   * Génère un badge d'historique pour une tâche
   * @param {object} task - Données de la tâche
   * @returns {string} HTML du badge ou chaîne vide
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
      console.warn('HistoryManager: Erreur génération badge:', error);
      return '';
    }
  }
  
  /**
   * Obtient un résumé rapide de l'historique d'une tâche
   * @param {object} task - Données de la tâche
   * @returns {object} Résumé de l'historique
   */
  getTaskHistorySummary(task) {
    const historyData = this.parseTaskHistory(task);
    
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
  
  /**
   * Valide la structure d'un historique
   * @param {string} historyJSON - Historique au format JSON
   * @returns {object} Résultat de validation
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
   * Nettoie les ressources
   */
  destroy() {
    this.currentTaskHistory = null;
    
    // Les écouteurs d'événements seront automatiquement supprimés 
    // quand les éléments DOM seront détruits
    
    console.log('HistoryManager: Ressources nettoyées');
  }
}