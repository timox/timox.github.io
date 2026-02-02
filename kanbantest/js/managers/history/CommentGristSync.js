// === managers/history/CommentGristSync.js ===
// Synchronisation des commentaires avec Grist (sauvegarde, restauration)

import { displayError, displaySuccess } from '../../utils/dom.js';
import { TABLE_ID } from '../../config/constants.js';

/**
 * Gestion de la synchronisation des commentaires avec Grist
 */
export class CommentGristSync {
  constructor(historyManager) {
    this.manager = historyManager;
  }

  /**
   * Restaure le commentaire en cours d'edition depuis le widget DOM
   * @returns {boolean} True si restaure avec succes, false sinon
   */
  restoreEditingCommentFromWidget() {
    this.manager.logger.debug('Tentative de restauration du commentaire depuis le widget');

    const widget = document.getElementById('accordion-comment-edit-widget');
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');

    const widgetVisible = widget && window.getComputedStyle(widget).display !== 'none' && widget.getAttribute('aria-hidden') !== 'true';

    if (!widget || !widgetVisible || !textArea) {
      this.manager.logger.error('Widget d\'edition non disponible ou invisible');
      displayError('Erreur: Aucun commentaire selectionne pour edition');
      return false;
    }

    // Recuperer l'ID du commentaire depuis plusieurs sources possibles
    const commentId = widget.dataset.commentId ||
                     textArea.dataset.commentId ||
                     textArea.getAttribute('data-comment-id') ||
                     dateSpan?.dataset.commentId;

    if (!commentId) {
      this.manager.logger.error('ID du commentaire non trouve dans le widget');
      this.manager.logger.debug('Sources verifiees:', {
        widgetDataset: Object.keys(widget.dataset),
        textAreaDataset: Object.keys(textArea.dataset),
        dateSpanDataset: dateSpan ? Object.keys(dateSpan.dataset) : null
      });
      displayError('Erreur: Session d\'edition expiree. Veuillez reessayer.');
      return false;
    }

    // Reconstituer l'objet commentaire
    this.manager.currentEditingComment = {
      id: commentId,
      originalContent: textArea.defaultValue || textArea.getAttribute('data-original') || textArea.placeholder || '',
      element: null // Plus de reference directe a l'element
    };

    this.manager.logger.info('Commentaire restaure depuis widget:', {
      id: commentId,
      hasOriginalContent: !!this.manager.currentEditingComment.originalContent
    });

    return true;
  }

  /**
   * Recupere les candidates de modales Bootstrap
   * @returns {Array} Liste des instances Bootstrap Modal
   */
  getBootstrapModalCandidates() {
    const modalManager = this.manager.kanban?.modalManager;
    if (!modalManager) {
      return [];
    }

    const candidates = [];
    if (modalManager.taskModal) {
      candidates.push(modalManager.taskModal);
    }

    if (modalManager.historyModal) {
      candidates.push(modalManager.historyModal);
    }

    return candidates;
  }

  /**
   * Recupere l'instance Bootstrap Modal active
   * @returns {object|null} Instance de modale active
   */
  getActiveBootstrapModalInstance() {
    const candidates = this.getBootstrapModalCandidates();
    if (!candidates.length) {
      return null;
    }

    const activeModal = candidates.find((modal) => modal?._element?.classList?.contains('show'));
    return activeModal || candidates[0] || null;
  }

  /**
   * Desactive temporairement le focus trap de la modale de tache (Bootstrap)
   */
  disableTaskModalFocusTrap() {
    const modalInstance = this.getActiveBootstrapModalInstance();
    if (!modalInstance || !modalInstance._focustrap) {
      return;
    }

    if (this.manager.activeModalFocusTrap?.instance === modalInstance && this.manager.activeModalFocusTrap.active) {
      return;
    }

    try {
      modalInstance._focustrap.deactivate();
      this.manager.activeModalFocusTrap = {
        instance: modalInstance,
        active: true
      };
      this.manager.logger.debug('Focus trap de la modale active desactive pour edition de commentaire');
    } catch (error) {
      this.manager.logger.warn('Impossible de desactiver le focus trap de la modale active', error);
    }
  }

  /**
   * Restaure le focus trap de la modale de tache (Bootstrap)
   */
  restoreTaskModalFocusTrap() {
    if (!this.manager.activeModalFocusTrap?.instance?._focustrap) {
      this.manager.activeModalFocusTrap = null;
      return;
    }

    try {
      this.manager.activeModalFocusTrap.instance._focustrap.activate();
      this.manager.logger.debug('Focus trap de la modale active reactive apres edition de commentaire');
    } catch (error) {
      this.manager.logger.warn('Impossible de reactiver le focus trap de la modale active', error);
    }

    this.manager.activeModalFocusTrap = null;
  }

  /**
   * Recupere l'ID de la tache pour laquelle on edite un commentaire
   * Utilise une hierarchie claire de sources fiables
   * @returns {number|null} L'ID de la tache ou null si non trouve
   */
  getCurrentEditingTaskId() {
    this.manager.logger.debug('Recherche de l\'ID de la tache pour edition de commentaire...');

    let taskId = null;
    let source = '';

    // PRIORITE 1: ID explicite dans currentTaskHistory
    if (this.manager.currentTaskHistory?.id) {
      taskId = this.manager.currentTaskHistory.id;
      source = 'currentTaskHistory.id';
    }

    // PRIORITE 2: Fallback vers ModalManager
    if (!taskId && this.manager.kanban?.modalManager?.currentTaskId) {
      taskId = this.manager.kanban.modalManager.currentTaskId;
      source = 'modalManager.currentTaskId';
      this.manager.logger.warn('Fallback vers ModalManager - verifier coherence avec l\'historique');
    }

    // PRIORITE 3: Autres champs dans currentTaskHistory
    if (!taskId && this.manager.currentTaskHistory) {
      taskId = this.manager.currentTaskHistory.taskId;
      if (taskId) {
        source = 'currentTaskHistory.taskId';
        this.manager.logger.warn('Utilisation champ alternatif dans currentTaskHistory');
      }
    }

    // PRIORITE 4: Dernier recours - DOM (moins fiable)
    if (!taskId) {
      const modalElement = document.getElementById('shared-task-modal');
      if (modalElement?.dataset.taskId) {
        taskId = modalElement.dataset.taskId;
        source = 'DOM.shared-task-modal.dataset.taskId';
        this.manager.logger.warn('Dernier recours - recuperation depuis DOM');
      }
    }

    // Validation et logging
    if (taskId) {
      taskId = parseInt(taskId);
      this.manager.logger.info(`ID de tache trouve: ${taskId} (source: ${source})`);

      // Validation de coherence si possible
      if (this.manager.currentTaskHistory?.id && taskId !== this.manager.currentTaskHistory.id) {
        this.manager.logger.error(`INCOHERENCE: ID trouve (${taskId}) != currentTaskHistory.id (${this.manager.currentTaskHistory.id})`);
        return null;
      }
    } else {
      this.manager.logger.error('Aucun ID de tache trouve pour l\'edition de commentaire');
      this.manager.logger.debug('Etat de debug:', {
        hasCurrentTaskHistory: !!this.manager.currentTaskHistory,
        currentTaskHistoryId: this.manager.currentTaskHistory?.id,
        modalManagerTaskId: this.manager.kanban?.modalManager?.currentTaskId,
        modalElementExists: !!document.getElementById('shared-task-modal')
      });
    }

    return taskId;
  }

  /**
   * Sauvegarde les modifications du commentaire
   */
  async saveCommentEdit() {
    this.manager.logger.info('saveCommentEdit appele');

    // Recuperer ou reconstituer le commentaire en cours d'edition
    if (!this.manager.currentEditingComment) {
      if (!this.restoreEditingCommentFromWidget()) {
        return;
      }
    }

    const newContent = document.getElementById('accordion-comment-edit-text')?.value?.trim();

    if (!newContent) {
      displayError('Le commentaire ne peut pas etre vide');
      return;
    }

    if (newContent === this.manager.currentEditingComment.originalContent) {
      this.manager.logger.debug('Aucune modification detectee');
      this.manager.commentEditWidget.close();
      return;
    }

    try {
      // Utiliser la methode centralisee pour recuperer l'ID
      const taskId = this.getCurrentEditingTaskId();

      if (!taskId) {
        throw new Error('ID de tache non trouve - impossible de sauvegarder le commentaire');
      }

      // Desactiver le bouton de sauvegarde et afficher un loader
      const saveBtn = document.getElementById('accordion-btn-save-comment-edit');
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Sauvegarde...';

      try {
        // Sauvegarder dans Grist
        await this.updateCommentInGrist(taskId, this.manager.currentEditingComment.id, newContent);

        // Mise a jour dans l'interface (si l'element existe encore)
        if (this.manager.currentEditingComment && this.manager.currentEditingComment.element) {
          const contentElement = this.manager.currentEditingComment.element.querySelector('.comment-content');
          if (contentElement) {
            contentElement.textContent = newContent;
            contentElement.dataset.original = newContent;

            // Ajouter une indication visuelle que le commentaire a ete modifie
            const timelineEntry = this.manager.currentEditingComment.element;
            timelineEntry.classList.add('comment-edited');

            // Ajouter un badge "Modifie" si pas deja present
            const statusDiv = timelineEntry.querySelector('.timeline-status');
            if (statusDiv && !statusDiv.querySelector('.badge-edited')) {
              const editedBadge = document.createElement('span');
              editedBadge.className = 'badge bg-warning ms-2 badge-edited';
              editedBadge.textContent = 'Modifie';
              statusDiv.appendChild(editedBadge);
            }
          }
        }

        displaySuccess('Commentaire mis a jour avec succes');
        this.manager.commentEditWidget.close();

      } finally {
        // Restaurer le bouton
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }

    } catch (error) {
      this.manager.logger.error('Erreur lors de la sauvegarde du commentaire:', error);

      // Afficher un message d'erreur detaille selon le type d'erreur
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (error.message.includes('non trouve') || error.message.includes('non trouvé')) {
        errorMessage = 'Tache non trouvee dans la base de donnees';
      } else if (error.message.includes('applyUserActions')) {
        errorMessage = 'Erreur de connexion a Grist. Verifiez votre connexion.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Erreur de format des donnees. Contactez l\'administrateur.';
      }

      displayError(errorMessage);
    }
  }

  /**
   * Met a jour un commentaire dans Grist
   * @param {number} taskId - ID de la tache
   * @param {string} commentId - ID du commentaire
   * @param {string} newContent - Nouveau contenu
   */
  async updateCommentInGrist(taskId, commentId, newContent) {
    try {
      // Recuperer la tache actuelle depuis Grist
      const gristApi = this.getGristApi();
      const gristData = await gristApi.docApi.fetchTable(TABLE_ID);

      // Trouver l'enregistrement
      const index = gristData.id.findIndex(id => id === taskId);
      if (index === -1) {
        throw new Error(`Tache ${taskId} non trouvee`);
      }

      const currentNotes = gristData.notes[index];
      let notesData;

      // Parser les notes JSON
      if (currentNotes && typeof currentNotes === 'string' && currentNotes.trim().startsWith('{')) {
        try {
          notesData = JSON.parse(currentNotes);
        } catch (parseError) {
          this.manager.logger.debug('Erreur parsing JSON, creation nouvelle structure:', parseError);
          notesData = { content: currentNotes || "", history: [] };
        }
      } else {
        notesData = { content: currentNotes || "", history: [] };
      }

      // Assurer que l'historique existe
      if (!Array.isArray(notesData.history)) {
        notesData.history = [];
      }

      // Normaliser un timestamp en chiffres uniquement pour comparaison
      const normalizeTimestampToDigits = (timestamp) => {
        if (timestamp === null || typeof timestamp === 'undefined') {
          return null;
        }

        try {
          if (timestamp instanceof Date) {
            if (Number.isNaN(timestamp.getTime())) {
              return null;
            }
            return timestamp.toISOString().replace(/[^\d]/g, '');
          }

          if (typeof timestamp === 'number') {
            const date = new Date(timestamp);
            if (Number.isNaN(date.getTime())) {
              return null;
            }
            return date.toISOString().replace(/[^\d]/g, '');
          }

          if (typeof timestamp === 'string') {
            const trimmed = timestamp.trim();
            if (!trimmed) {
              return '';
            }
            // Tenter de detecter les timestamps en millisecondes stockes sous forme de chaine numerique
            if (/^\d{10,}$/.test(trimmed)) {
              const asNumber = Number(trimmed);
              if (Number.isFinite(asNumber)) {
                const date = new Date(asNumber);
                if (!Number.isNaN(date.getTime())) {
                  return date.toISOString().replace(/[^\d]/g, '');
                }
              }
            }
            return trimmed.replace(/[^\d]/g, '');
          }

          // Dernier recours : convertir en string
          return String(timestamp).replace(/[^\d]/g, '');
        } catch (normalizationError) {
          this.manager.logger.warn('Impossible de normaliser le timestamp:', timestamp, normalizationError);
          return null;
        }
      };

      const commentTimestamp = commentId.replace('comment-', '');
      const commentTimestampDigits = normalizeTimestampToDigits(commentTimestamp);
      let entryFound = false;

      this.manager.logger.debug('updateCommentInGrist - Recherche du commentaire:', commentId);
      this.manager.logger.debug('updateCommentInGrist - Timestamp recherche:', commentTimestampDigits);
      this.manager.logger.debug('updateCommentInGrist - Entrees d\'historique disponibles:', notesData.history.length);

      if (commentTimestampDigits == null) {
        this.manager.logger.warn('updateCommentInGrist - Timestamp de commentaire invalide, fallback sans correspondance precise:', commentId);
      }

      // 1. Chercher dans l'historique JSON (nouveau systeme)
      for (let i = 0; i < notesData.history.length; i++) {
        const entry = notesData.history[i];
        const entryTimestamp = normalizeTimestampToDigits(entry?.timestamp);

        if (entryTimestamp == null) {
          this.manager.logger.warn('updateCommentInGrist - Entree sans timestamp, ignoree:', entry);
          continue;
        }

        this.manager.logger.debug(`updateCommentInGrist - Entree ${i}: action=${entry.action}, timestamp=${entryTimestamp.substring(0, 12)}`);

        // Comparer les timestamps (premiers caracteres pour eviter les problemes de precision)
        const timestampsMatch = (() => {
          if (commentTimestampDigits == null) {
            return false;
          }

          if (entryTimestamp === '' || commentTimestampDigits === '') {
            return entryTimestamp === commentTimestampDigits;
          }

          return entryTimestamp.substring(0, 12) === commentTimestampDigits.substring(0, 12);
        })();

        if (timestampsMatch) {
          // Verifier que c'est bien un commentaire
          if (entry.action === 'comment' || entry.action === 'create' || entry.action === 'update') {
            this.manager.logger.debug('Modification du commentaire trouve dans history:', entry);

            // Modifier le contenu selon le format
            if (entry.newValue) {
              notesData.history[i].newValue = newContent;
            }
            if (entry.details) {
              notesData.history[i].details = newContent;
            }

            // Mettre a jour le content principal si c'est le commentaire le plus recent
            if (i === notesData.history.length - 1) {
              notesData.content = newContent;
            }

            // Ajouter une marque d'edition
            notesData.history[i].edited = new Date().toISOString();
            notesData.history[i].editedBy = await this.getCurrentUser();

            entryFound = true;
            break;
          }
        }
      }

      // 2. Si pas trouve dans history, chercher dans content (ancien systeme avec ---)
      if (!entryFound && notesData.content && notesData.content.includes('---')) {
        this.manager.logger.debug('Recherche dans content (ancien systeme avec ---)');

        // Detecter si le commentaire a modifier est dans content (ancien format)
        const contentParts = notesData.content.split('\n---\n');
        if (contentParts.length > 1) {
          this.manager.logger.debug('Remplacement du commentaire principal dans content');
          contentParts[0] = newContent;
          notesData.content = contentParts.join('\n---\n');
          entryFound = true;

          // Ajouter une entree d'historique pour tracer la modification
          notesData.history.push({
            timestamp: new Date().toISOString(),
            user: await this.getCurrentUser(),
            action: 'update',
            details: `Commentaire modifie: ${newContent}`,
            status: gristData.statut[index] || 'Unknown'
          });
        }
      }

      if (!entryFound) {
        this.manager.logger.debug('Entree de commentaire non trouvee, ajout d\'une nouvelle entree');

        // Ajouter une nouvelle entree d'historique pour la modification
        notesData.history.push({
          timestamp: new Date().toISOString(),
          user: await this.getCurrentUser(),
          action: 'update',
          details: `Commentaire modifie: ${newContent}`,
          status: gristData.statut[index] || 'Unknown'
        });
      }

      // Limiter l'historique a 50 entrees
      if (notesData.history.length > 50) {
        notesData.history = notesData.history.slice(-50);
      }

      // Sauvegarder dans Grist
      const updatedNotes = JSON.stringify(notesData);
      this.manager.logger.debug('Sauvegarde des notes mises a jour:', updatedNotes.length > 100 ? 'Notes tres longues...' : updatedNotes);

      await gristApi.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, taskId, {
          notes: updatedNotes,
          date_derniere_maj: new Date().toISOString()
        }]
      ]);

      this.manager.logger.info('Commentaire mis a jour avec succes dans Grist');

    } catch (error) {
      this.manager.logger.error('Erreur lors de la mise a jour du commentaire dans Grist:', error);
      throw error;
    }
  }

  /**
   * Recupere l'API Grist disponible
   * @returns {object}
   */
  getGristApi() {
    if (this.manager.kanban?.gristManager?.getGristApi) {
      return this.manager.kanban.gristManager.getGristApi();
    }

    if (typeof window !== 'undefined' && typeof window.grist !== 'undefined') {
      return window.grist;
    }

    throw new Error('API Grist non disponible');
  }

  /**
   * Recupere l'utilisateur actuel
   * @returns {Promise<string>}
   */
  async getCurrentUser() {
    try {
      const userActionManager = this.manager.kanban.getUserActionManager ?
        this.manager.kanban.getUserActionManager() :
        window.getUserActionManager?.();

      if (userActionManager && userActionManager.cachedUserName) {
        return userActionManager.cachedUserName;
      }

      return 'User';
    } catch (error) {
      this.manager.logger.debug('Impossible de recuperer l\'utilisateur actuel:', error);
      return 'User';
    }
  }
}
