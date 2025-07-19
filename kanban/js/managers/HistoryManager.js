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
import { TABLE_ID } from '../config/constants.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour l'historique des tâches et commentaires
 */
export class HistoryManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentTaskHistory = null;
    this.logger = createModuleLogger('HistoryManager');
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire d'historique
   */
  init() {
    this.setupEventListeners();
    this.setupCommentEditWidget();
    this.logger.info('History manager initialized');
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Bouton "Voir tous les commentaires"
    const btnShowComments = document.getElementById('btn-show-comments-only');
    if (btnShowComments) {
      btnShowComments.addEventListener('click', () => {
        if (!this.currentTaskHistory) {
          console.warn('HistoryManager: Aucune tâche sélectionnée pour afficher les commentaires');
          return;
        }
        this.showAllComments();
      });
    }
    
    // Bouton "Exporter cette tâche"
    const btnExportTask = document.getElementById('btn-export-task-history');
    if (btnExportTask) {
      btnExportTask.addEventListener('click', () => {
        if (!this.currentTaskHistory) {
          console.warn('HistoryManager: Aucune tâche sélectionnée pour exporter');
          return;
        }
        this.exportTaskHistory();
      });
    }
    
    // Widget d'édition de commentaire
    this.setupCommentEditWidget();
    
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
    
    // Vérifier si la tâche est déjà ouverte dans la modale de détail
    const taskModal = document.getElementById('popup-tache');
    const isTaskModalOpen = taskModal && taskModal.classList.contains('show');
    const currentTaskIdInModal = this.kanban.modalManager?.currentTaskId;
    
    if (isTaskModalOpen && currentTaskIdInModal === taskId) {
      // Utiliser l'accordéon dans la modale de détail
      console.log('HistoryManager: Utilisation accordéon dans modale de détail');
      if (this.kanban.modalManager) {
        this.kanban.modalManager.loadCommentHistoryInAccordion();
        
        // Ouvrir l'accordéon automatiquement
        const accordion = document.getElementById('comment-history-accordion');
        if (accordion && !accordion.classList.contains('show')) {
          const bsCollapse = new bootstrap.Collapse(accordion, { show: true });
        }
      }
    } else {
      // Utiliser la modale historique séparée (comportement original)
      console.log('HistoryManager: Utilisation modale historique séparée');
      if (this.kanban.modalManager) {
        this.kanban.modalManager.openHistoryModal(taskId);
      } else {
        this.renderTaskHistory(task);
      }
    }
  }
  
  /**
   * Rend l'historique d'une tâche dans la modal
   * @param {object} task - Données de la tâche
   */
  renderTaskHistory(task) {
    // CRITIQUE: Sauvegarder la tâche courante pour les boutons d'action
    this.currentTaskHistory = task;
    console.log('HistoryManager: Tâche sélectionnée pour historique:', task?.id, task?.titre);
    
    const historyData = this.parseTaskHistory(task);
    console.log('HistoryManager: Historique parsé:', historyData.comments?.length, 'commentaires');
    
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
    
    this.logger?.debug('Parsing task history', task.id);
    
    // Parser l'historique des statuts
    if (task.historique_statuts) {
      try {
        const historyData = JSON.parse(task.historique_statuts);
        if (historyData && historyData.historique) {
          history = historyData.historique;
          this.logger?.debug('Status history found:', history.length, 'entries');
        }
      } catch (error) {
        this.logger?.warn('Error parsing historique_statuts:', error);
      }
    }
    
    // ANCIEN SYSTÈME SUPPRIMÉ: Ne plus parser les commentaires depuis description
    // Tous les commentaires doivent maintenant être dans notes.history
    
    // Parser les entrées depuis les notes JSON (nouveau système)
    if (task.notes) {
      try {
        const notesData = JSON.parse(task.notes);
        // Notes trouvées
        if (notesData && notesData.history && Array.isArray(notesData.history)) {
          
          // Traiter chaque entrée selon son type d'action
          notesData.history.forEach(entry => {
            if (entry.action === 'comment') {
              // Extraire le contenu du commentaire de façon sûre
              let commentContent = entry.newValue || entry.details || '';
              
              // CAS SPÉCIFIQUE MIGRATION: Si c'est du JSON complet, extraire le content
              if (commentContent.startsWith('{') && commentContent.includes('"content"')) {
                try {
                  const jsonData = JSON.parse(commentContent);
                  if (jsonData.content) {
                    commentContent = jsonData.content;
                    console.warn('Migration: JSON comment extracted', entry.timestamp);
                  }
                } catch (e) {
                  // Si parsing échoue, utiliser le contenu brut
                  console.warn('Failed to parse comment JSON:', e);
                }
              }
              
              // Nettoyer les préfixes comme "Commentaire ajouté:"
              commentContent = commentContent.replace(/^Commentaire ajouté:\s*/, '');
              
              // Si après extraction il reste du JSON, c'est un cas problématique mais on garde l'info
              if (commentContent.startsWith('{') && commentContent.includes('"timestamp"')) {
                console.warn('Problematic JSON comment preserved for user review:', entry.timestamp);
                // On garde le commentaire mais on le marque comme problématique
                commentContent = `[MIGRATION] Données à vérifier: ${commentContent.substring(0, 100)}...`;
              }
              
              // Ajouter aux commentaires
              comments.push({
                timestamp: this.normalizeTimestamp(entry.timestamp),
                content: commentContent,
                user: entry.user || 'Utilisateur'
              });
            } else if (entry.action === 'status_change') {
              // Filtrer les changements de statut invalides (même statut)
              const isValidStatusChange = entry.details && 
                !entry.details.match(/from (.+) to \1$/); // Regex pour détecter "from X to X"
              
              if (isValidStatusChange) {
                const normalizedTimestamp = this.normalizeTimestamp(entry.timestamp);
                history.push({
                  timestamp: normalizedTimestamp,
                  statut: entry.status,
                  date_entree: normalizedTimestamp,
                  note: entry.details,
                  user: entry.user || 'Utilisateur'
                });
              } else {
                this.logger?.debug('Changement de statut invalide ignoré:', entry.details);
              }
            } else if (entry.action === 'update' || entry.action === 'field_change') {
              // Filtrer les doublons de commentaires (éviter "Commentaire modifié:")
              const isCommentUpdate = entry.details && 
                (entry.details.includes('Commentaire modifié:') || 
                 entry.details.includes('Commentaire ajouté:'));
              
              if (!isCommentUpdate) {
                // Ajouter aux mises à jour générales (sauf commentaires)
                const normalizedTimestamp = this.normalizeTimestamp(entry.timestamp);
                history.push({
                  timestamp: normalizedTimestamp,
                  statut: entry.status || task.statut,
                  date_entree: normalizedTimestamp,
                  note: entry.action === 'field_change' ? entry.details : `Mise à jour: ${entry.details}`,
                  user: entry.user || 'Utilisateur'
                });
              } else {
                this.logger?.debug('Doublon de commentaire ignoré dans update:', entry.details);
              }
            }
          });
          
          this.logger?.debug('JSON history found:', history.length, 'entries,', comments.length, 'comments');
        }
      } catch (error) {
        this.logger?.warn('Error parsing notes JSON:', error);
      }
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
  
  // FONCTION SUPPRIMÉE: parseCommentsFromDescription()
  // Les commentaires sont maintenant exclusivement dans notes.history
  
  /**
   * Convertit un timestamp en objet Date valide
   * @param {*} timestamp - Timestamp à convertir
   * @returns {Date} Objet Date valide
   */
  normalizeTimestamp(timestamp) {
    if (!timestamp) return new Date();
    
    // Déjà un objet Date
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? new Date() : timestamp;
    }
    
    // String ou nombre
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Fallback
    return new Date();
  }
  
  /**
   * Fusionne l'historique des statuts et les commentaires
   * @param {Array} history - Historique des statuts
   * @param {Array} comments - Commentaires
   * @returns {Array} Timeline fusionnée
   */
  mergeHistoryAndComments(history, comments) {
    const timeline = [];
    
    // Filtrer les entrées techniques inutiles pour l'utilisateur
    const isUserRelevant = (entry) => {
      if (!entry.note && !entry.details) return false;
      
      const content = entry.note || entry.details || '';
      
      // Masquer les changements techniques automatiques
      const technicalPatterns = [
        /Date d'échéance modifiée:/,
        /Date de début modifiée:/,
        /Priorité modifiée:/,
        /Assigné à modifiée:/,
        /field_change/,
        /Description mise à jour/,
        /Commentaire modifié:/
      ];
      
      return !technicalPatterns.some(pattern => pattern.test(content));
    };
    
    // Ajouter les changements de statut (seulement ceux pertinents)
    history.forEach(entry => {
      if (entry.timestamp && isUserRelevant(entry)) {
        timeline.push({
          type: 'status_change',
          timestamp: entry.timestamp, // Déjà normalisé dans parseTaskHistory
          ...entry
        });
      }
    });
    
    // Ajouter les commentaires
    comments.forEach(comment => {
      timeline.push({
        type: 'comment',
        timestamp: comment.timestamp, // Déjà normalisé dans parseTaskHistory
        ...comment
      });
    });
    
    // Trier par timestamp chronologique (plus récent en premier)
    // En cas d'égalité, donner priorité aux commentaires
    return timeline.sort((a, b) => {
      // Sécurité supplémentaire : vérifier que timestamp est bien un objet Date
      const timeA = (a.timestamp instanceof Date) ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = (b.timestamp instanceof Date) ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      
      if (timeA === timeB) {
        // En cas d'égalité, commentaires en premier
        if (a.type === 'comment' && b.type !== 'comment') return -1;
        if (b.type === 'comment' && a.type !== 'comment') return 1;
        return 0;
      }
      
      return timeB - timeA; // Plus récent en premier
    });
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
      // Trier l'historique par timestamp pour avoir le bon ordre chronologique
      const sortedHistory = [...history].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB; // Plus ancien en premier
      });
      
      // Date de création (premier statut chronologique)
      const firstEntry = sortedHistory[0];
      if (firstEntry.timestamp) {
        stats.creationDate = new Date(firstEntry.timestamp);
      }
      
      // Dernière modification (dernier statut chronologique)
      const lastEntry = sortedHistory[sortedHistory.length - 1];
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
    
    // Déterminer l'icône selon le type d'action
    let statusIcon;
    if (entry.note && entry.note.includes('modifié')) {
      // C'est un changement de champ, pas de statut
      statusIcon = this.getFieldChangeIcon(entry.note);
    } else {
      // C'est un vrai changement de statut
      statusIcon = this.getStatusIcon(entry.statut);
    }
    
    // Formatage direct sans normalizeDate pour préserver l'heure
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
    // Formatage direct sans normalizeDate pour préserver l'heure
    const formattedDate = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const userInfo = entry.user ? ` par ${entry.user}` : '';
    const latestBadge = entry.isLatest ? '<span class="badge bg-primary ms-2">Dernier</span>' : '';
    
    // Générer un ID unique pour le commentaire basé sur le timestamp
    const timestampString = entry.timestamp instanceof Date ? 
      entry.timestamp.toISOString() : 
      String(entry.timestamp);
    const commentId = `comment-${timestampString.replace(/[^\d]/g, '')}`;
    console.log('HistoryManager: Rendu commentaire avec bouton édition:', commentId);
    
    return `
      <div class="timeline-entry timeline-entry-comment" data-comment-id="${commentId}">
        <div class="timeline-status">
          <div class="timeline-status-left">
            <i class="bi bi-chat-square-text text-info"></i>
            <button class="btn btn-sm btn-outline-secondary btn-edit-comment" 
                    data-comment-id="${commentId}"
                    title="Éditer ce commentaire">
              ✏️
            </button>
            <span class="timeline-status-text">Commentaire${latestBadge}</span>
          </div>
        </div>
        <div class="timeline-dates">
          <i class="bi bi-calendar3"></i>
          ${formattedDate}${userInfo}
        </div>
        <div class="timeline-comment">
          <div class="comment-content" data-original="${entry.content.replace(/"/g, '&quot;')}">${entry.content}</div>
        </div>
      </div>
    `;
  }
  
  /**
   * Retourne l'icône appropriée pour un changement de champ
   * @param {string} note - Note décrivant le changement
   * @returns {string} HTML de l'icône
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
    
    // Icône par défaut pour les autres changements
    return '<i class="bi bi-pencil-square text-muted"></i>';
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
   * Configure le widget d'édition de commentaire
   */
  setupCommentEditWidget() {
    this.currentEditingComment = null;
    
    // Créer le widget d'édition s'il n'existe pas
    this.createCommentEditWidget();
    
    // Écouteur pour les boutons d'édition (plus précis, sans logging)
    document.addEventListener('click', (e) => {
      // Ne traiter que les clics sur les boutons d'édition
      if (e.target.matches('.btn-edit-comment, .btn-edit-comment *')) {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.target.closest('.btn-edit-comment');
        if (!button) {
          return;
        }
        
        const commentId = button.dataset.commentId;
        this.openCommentEditWidget(commentId);
      }
    });
    
    // Bouton fermer (IDs uniques pour accordéon)
    const btnClose = document.getElementById('accordion-btn-close-comment-edit');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeCommentEditWidget();
      });
    }
    
    // Bouton annuler
    const btnCancel = document.getElementById('accordion-btn-cancel-comment-edit');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        this.closeCommentEditWidget();
      });
    }
    
    // Bouton sauvegarder
    const btnSave = document.getElementById('accordion-btn-save-comment-edit');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        console.log('HistoryManager: Bouton sauvegarder cliqué, this:', this);
        this.saveCommentEdit();
      });
    } else {
      console.error('HistoryManager: Bouton accordion-btn-save-comment-edit non trouvé');
    }
    
    // Fermer avec l'overlay (seulement celui de l'accordéon)
    setTimeout(() => {
      const overlay = document.querySelector('#accordion-comment-edit-widget .comment-edit-overlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          // Fermer si on clique directement sur l'overlay (pas sur le modal)
          if (e.target === overlay) {
            this.closeCommentEditWidget();
          }
        });
      }
    }, 100);
    
    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isCommentEditOpen()) {
        this.closeCommentEditWidget();
      }
    });
  }
  
  /**
   * Crée le widget d'édition de commentaire dans le DOM
   */
  createCommentEditWidget() {
    // Vérifier si le widget existe déjà
    if (document.getElementById('accordion-comment-edit-widget')) {
      console.log('HistoryManager: Widget d\'édition accordéon existe déjà');
      return;
    }
    
    console.log('HistoryManager: Création du widget d\'édition de commentaires pour accordéon');
    
    // Créer le HTML du widget avec structure corrigée
    const widgetHTML = `
      <div id="accordion-comment-edit-widget" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1080;">
        <div class="comment-edit-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
          <div class="comment-edit-modal" style="background: white; border-radius: 8px; max-width: 700px; width: 95%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div class="comment-edit-header" style="padding: 1rem; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
              <h5 style="margin: 0; color: #333;"><i class="bi bi-pencil me-2"></i>Édition de commentaire</h5>
              <button type="button" id="accordion-btn-close-comment-edit" class="btn-close" aria-label="Fermer" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6c757d;">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            
            <div class="comment-edit-body" style="padding: 1rem;">
              <div class="mb-2">
                <small class="text-muted">Date: <span id="accordion-comment-edit-date"></span></small>
              </div>
              <textarea id="accordion-comment-edit-text" class="form-control" rows="6" 
                        placeholder="Modifiez votre commentaire..." style="resize: vertical; min-height: 120px;"></textarea>
            </div>
            
            <div class="comment-edit-footer" style="padding: 1rem; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 0.5rem;">
              <button type="button" id="accordion-btn-cancel-comment-edit" class="btn btn-secondary">
                <i class="bi bi-x-circle me-1"></i>Annuler
              </button>
              <button type="button" id="accordion-btn-save-comment-edit" class="btn btn-primary">
                <i class="bi bi-check-circle me-1"></i>Sauvegarder
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Ajouter au body
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }
  
  /**
   * Ajoute les styles CSS pour le widget d'édition
   */
  addCommentEditStyles() {
    const styleId = 'comment-edit-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const styles = `
      <style id="${styleId}">
        .comment-edit-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1070;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .comment-edit-modal {
          background: white;
          border-radius: 8px;
          max-width: 700px;
          width: 95%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .comment-edit-header {
          padding: 1rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .comment-edit-header h5 {
          margin: 0;
          color: #333;
        }
        
        .comment-edit-body {
          padding: 1rem;
        }
        
        .comment-edit-footer {
          padding: 1rem;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        
        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6c757d;
        }
        
        .btn-close:hover {
          color: #000;
        }
        
        .btn-edit-comment {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          margin-left: 0.5rem;
          line-height: 1;
        }
        
        .timeline-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .timeline-status-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .timeline-status-text {
          margin-left: 0.25rem;
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
  
  /**
   * Ouvre le widget d'édition pour un commentaire
   * @param {string} commentId - ID du commentaire
   */
  openCommentEditWidget(commentId) {
    console.log('HistoryManager: openCommentEditWidget appelé avec ID:', commentId);
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    console.log('HistoryManager: Element commentaire trouvé:', commentElement);
    
    if (!commentElement) {
      console.error('HistoryManager: Commentaire non trouvé pour ID:', commentId);
      console.log('HistoryManager: Éléments avec data-comment-id disponibles:', 
        document.querySelectorAll('[data-comment-id]'));
      return;
    }
    
    const contentElement = commentElement.querySelector('.comment-content');
    const originalContent = contentElement.dataset.original || contentElement.textContent;
    
    // Chercher l'élément de date (compatible modale historique ET accordéon)
    const dateElement = commentElement.querySelector('.timeline-dates') || 
                       commentElement.querySelector('.comment-meta');
    const dateText = dateElement ? dateElement.textContent.trim() : 'Date inconnue';
    
    // Stocker les informations du commentaire en cours d'édition
    this.currentEditingComment = {
      id: commentId,
      element: commentElement,
      originalContent: originalContent
    };
    
    // Remplir le widget (IDs uniques pour accordéon)
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');
    
    if (!textArea || !dateSpan) {
      console.error('HistoryManager: Éléments du widget accordéon non trouvés');
      return;
    }
    
    textArea.value = originalContent;
    dateSpan.textContent = dateText;
    
    // Afficher le widget
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (!widget) {
      console.error('HistoryManager: Widget accordéon non trouvé');
      return;
    }
    
    widget.style.display = 'block';
    
    // Focus sur le textarea
    setTimeout(() => {
      textArea.focus();
    }, 100);
  }
  
  /**
   * Ferme le widget d'édition
   */
  closeCommentEditWidget() {
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (widget) {
      widget.style.display = 'none';
    }
    
    this.currentEditingComment = null;
    
    // Nettoyer le formulaire (IDs uniques pour accordéon)
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');
    
    if (textArea) textArea.value = '';
    if (dateSpan) dateSpan.textContent = '';
  }
  
  /**
   * Vérifie si le widget d'édition est ouvert
   * @returns {boolean}
   */
  isCommentEditOpen() {
    const widget = document.getElementById('accordion-comment-edit-widget');
    return widget && widget.style.display === 'block';
  }
  
  /**
   * Sauvegarde les modifications du commentaire
   */
  async saveCommentEdit() {
    console.log('HistoryManager: saveCommentEdit appelé');
    console.log('HistoryManager: currentEditingComment:', this.currentEditingComment);
    
    if (!this.currentEditingComment) {
      console.error('HistoryManager: Aucun commentaire en cours d\'édition');
      console.log('HistoryManager: État du widget:', {
        widgetVisible: document.getElementById('comment-edit-widget')?.style.display,
        textareaValue: document.getElementById('comment-edit-text')?.value,
        dateText: document.getElementById('comment-edit-date')?.textContent
      });
      displayError('Erreur: Aucun commentaire sélectionné pour édition');
      return;
    }
    
    const newContent = document.getElementById('accordion-comment-edit-text').value.trim();
    
    if (!newContent) {
      displayError('Le commentaire ne peut pas être vide');
      return;
    }
    
    if (newContent === this.currentEditingComment.originalContent) {
      console.log('Aucune modification détectée');
      this.closeCommentEditWidget();
      return;
    }
    
    try {
      // Extraire l'ID de la tâche du commentId
      const taskId = this.currentTaskHistory?.id;
      if (!taskId) {
        throw new Error('ID de tâche non trouvé');
      }
      
      // Désactiver le bouton de sauvegarde et afficher un loader
      const saveBtn = document.getElementById('accordion-btn-save-comment-edit');
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Sauvegarde...';
      
      try {
        // Sauvegarder dans Grist
        await this.updateCommentInGrist(taskId, this.currentEditingComment.id, newContent);
        
        // Mise à jour dans l'interface
        const contentElement = this.currentEditingComment.element.querySelector('.comment-content');
        contentElement.textContent = newContent;
        contentElement.dataset.original = newContent;
        
        // Ajouter une indication visuelle que le commentaire a été modifié
        const timelineEntry = this.currentEditingComment.element;
        timelineEntry.classList.add('comment-edited');
        
        // Ajouter un badge "Modifié" si pas déjà présent
        const statusDiv = timelineEntry.querySelector('.timeline-status');
        if (!statusDiv.querySelector('.badge-edited')) {
          const editedBadge = document.createElement('span');
          editedBadge.className = 'badge bg-warning ms-2 badge-edited';
          editedBadge.textContent = 'Modifié';
          statusDiv.appendChild(editedBadge);
        }
        
        displaySuccess('Commentaire mis à jour avec succès');
        this.closeCommentEditWidget();
        
      } finally {
        // Restaurer le bouton
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du commentaire:', error);
      
      // Afficher un message d'erreur détaillé selon le type d'erreur
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (error.message.includes('non trouvé')) {
        errorMessage = 'Tâche non trouvée dans la base de données';
      } else if (error.message.includes('applyUserActions')) {
        errorMessage = 'Erreur de connexion à Grist. Vérifiez votre connexion.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Erreur de format des données. Contactez l\'administrateur.';
      }
      
      displayError(errorMessage);
    }
  }
  
  /**
   * Met à jour un commentaire dans Grist
   * @param {number} taskId - ID de la tâche
   * @param {string} commentId - ID du commentaire
   * @param {string} newContent - Nouveau contenu
   */
  async updateCommentInGrist(taskId, commentId, newContent) {
    try {
      // Récupérer la tâche actuelle depuis Grist
      const gristData = await grist.docApi.fetchTable(TABLE_ID);
      
      // Trouver l'enregistrement
      const index = gristData.id.findIndex(id => id === taskId);
      if (index === -1) {
        throw new Error(`Tâche ${taskId} non trouvée`);
      }
      
      const currentNotes = gristData.notes[index];
      let notesData;
      
      // Parser les notes JSON
      if (currentNotes && typeof currentNotes === 'string' && currentNotes.trim().startsWith('{')) {
        try {
          notesData = JSON.parse(currentNotes);
        } catch (parseError) {
          console.warn('Erreur parsing JSON, création nouvelle structure:', parseError);
          notesData = { content: currentNotes || "", history: [] };
        }
      } else {
        notesData = { content: currentNotes || "", history: [] };
      }
      
      // Assurer que l'historique existe
      if (!Array.isArray(notesData.history)) {
        notesData.history = [];
      }
      
      // Extraire le timestamp du commentId pour trouver l'entrée à modifier
      const commentTimestamp = commentId.replace('comment-', '');
      let entryFound = false;
      
      console.log('updateCommentInGrist - Recherche du commentaire:', commentId);
      console.log('updateCommentInGrist - Timestamp recherché:', commentTimestamp);
      console.log('updateCommentInGrist - Entrées d\'historique disponibles:', notesData.history.length);
      
      // CORRECTION: Gérer les commentaires anciens (dans content) ET nouveaux (dans history)
      
      // 1. Chercher dans l'historique JSON (nouveau système)
      for (let i = 0; i < notesData.history.length; i++) {
        const entry = notesData.history[i];
        const entryTimestamp = entry.timestamp.replace(/[^\d]/g, '');
        
        console.log(`updateCommentInGrist - Entrée ${i}: action=${entry.action}, timestamp=${entryTimestamp.substring(0, 12)}`);
        
        // Comparer les timestamps (on prend les premiers caractères pour éviter les problèmes de précision)
        if (entryTimestamp.substring(0, 12) === commentTimestamp.substring(0, 12)) {
          // Vérifier que c'est bien un commentaire
          if (entry.action === 'comment' || entry.action === 'create' || entry.action === 'update') {
            console.log('Modification du commentaire trouvé dans history:', entry);
            
            // Modifier le contenu selon le format
            if (entry.newValue) {
              notesData.history[i].newValue = newContent;
            }
            if (entry.details) {
              notesData.history[i].details = newContent;
            }
            
            // Mettre à jour le content principal si c'est le commentaire le plus récent
            if (i === notesData.history.length - 1) {
              notesData.content = newContent;
            }
            
            // Ajouter une marque d'édition
            notesData.history[i].edited = new Date().toISOString();
            notesData.history[i].editedBy = await this.getCurrentUser();
            
            entryFound = true;
            break;
          }
        }
      }
      
      // 2. Si pas trouvé dans history, chercher dans content (ancien système avec ---)
      if (!entryFound && notesData.content && notesData.content.includes('---')) {
        console.log('Recherche dans content (ancien système avec ---)');
        
        // Détecter si le commentaire à modifier est dans content (ancien format)
        const contentParts = notesData.content.split('\n---\n');
        if (contentParts.length > 1) {
          // Remplacer le premier commentaire (celui qui sera affiché)
          console.log('Remplacement du commentaire principal dans content');
          contentParts[0] = newContent;
          notesData.content = contentParts.join('\n---\n');
          entryFound = true;
          
          // Ajouter une entrée d'historique pour tracer la modification
          notesData.history.push({
            timestamp: new Date().toISOString(),
            user: await this.getCurrentUser(),
            action: 'update',
            details: `Commentaire modifié: ${newContent}`,
            status: gristData.statut[index] || 'Unknown'
          });
        }
      }
      
      if (!entryFound) {
        console.warn('Entrée de commentaire non trouvée, ajout d\'une nouvelle entrée');
        
        // Ajouter une nouvelle entrée d'historique pour la modification
        notesData.history.push({
          timestamp: new Date().toISOString(),
          user: await this.getCurrentUser(),
          action: 'update',
          details: `Commentaire modifié: ${newContent}`,
          status: gristData.statut[index] || 'Unknown'
        });
      }
      
      // Limiter l'historique à 50 entrées
      if (notesData.history.length > 50) {
        notesData.history = notesData.history.slice(-50);
      }
      
      // Sauvegarder dans Grist
      const updatedNotes = JSON.stringify(notesData);
      console.log('Sauvegarde des notes mises à jour:', updatedNotes);
      
      await grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, taskId, { 
          notes: updatedNotes,
          date_derniere_maj: new Date().toISOString()
        }]
      ]);
      
      console.log('Commentaire mis à jour avec succès dans Grist');
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du commentaire dans Grist:', error);
      throw error;
    }
  }
  
  /**
   * Récupère l'utilisateur actuel
   * @returns {Promise<string>}
   */
  async getCurrentUser() {
    try {
      const userActionManager = this.kanban.getUserActionManager ? 
        this.kanban.getUserActionManager() : 
        window.getUserActionManager?.();
        
      if (userActionManager && userActionManager.cachedUserName) {
        return userActionManager.cachedUserName;
      }
      
      return 'User';
    } catch (error) {
      console.warn('Impossible de récupérer l\'utilisateur actuel:', error);
      return 'User';
    }
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