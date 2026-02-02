// === managers/history/CommentEditWidget.js ===
// Widget d'edition de commentaire (accordeon modale)

/**
 * Widget d'edition de commentaire dans la modale
 */
export class CommentEditWidget {
  constructor(historyManager) {
    this.manager = historyManager;
  }

  /**
   * Configure le widget d'edition de commentaire
   */
  setup() {
    this.manager.currentEditingComment = null;

    // Creer le widget d'edition s'il n'existe pas
    this.createWidget();

    // NOTE: Evenement .btn-edit-comment gere par EventCentralizer.js ligne 48-75
    // (supprime pour eviter le doublon avec addEventListener sur document)

    // NOTE: TOUS les evenements du widget geres par EventCentralizer.js via delegation :
    // - #accordion-btn-close-comment-edit (click) -> fermer widget
    // - #accordion-btn-cancel-comment-edit (click) -> fermer widget
    // - #accordion-btn-save-comment-edit (click) -> sauvegarder commentaire
    // - .comment-edit-overlay (click) -> fermer si click sur overlay direct
    // - document (keydown Escape) -> fermer widget
  }

  /**
   * Cree le widget d'edition de commentaire dans le DOM
   */
  createWidget() {
    // Supprimer le widget existant s'il y en a un
    const existingWidget = document.getElementById('accordion-comment-edit-widget');
    if (existingWidget) {
      this.manager.logger.debug('Suppression du widget existant');
      existingWidget.remove();
    }

    this.manager.logger.debug('Création du widget d\'édition de commentaires pour accordéon');

    // Creer le HTML du widget avec structure corrigee
    const widgetHTML = `
      <div id="accordion-comment-edit-widget" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1070;">
        <div class="comment-edit-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; pointer-events: auto;">
          <div class="comment-edit-modal-container" style="pointer-events: auto;">
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
                <textarea id="accordion-comment-edit-text" rows="6"
                          placeholder="Modifiez votre commentaire..."
                          style="width: 100%; min-height: 120px; padding: 10px; border: 2px solid #007bff; background: white; font-family: inherit; font-size: 14px; line-height: 1.4; resize: vertical; outline: none;"
                          ></textarea>
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
      </div>
    `;

    const container = document.getElementById('shared-task-modal') || document.body;
    container.insertAdjacentHTML('beforeend', widgetHTML);

    this.addStyles();

    // Attacher les event listeners apres creation
    this.attachListeners();
  }

  /**
   * Attache les event listeners au widget d'edition
   */
  attachListeners() {
    // NOTE: TOUS les evenements geres par EventCentralizer.js via delegation :
    // - #accordion-btn-close-comment-edit (click)
    // - #accordion-btn-cancel-comment-edit (click)
    // - #accordion-btn-save-comment-edit (click)
    // - #accordion-comment-edit-text (keydown/keyup pour stopPropagation)
    // - #btn-back-to-timeline (click)
    // - #simple-history-modal (Escape pour fermeture)
    // - .comment-edit-overlay (click pour fermeture)

    // Assurer que le textarea est focusable
    const textarea = document.getElementById('accordion-comment-edit-text');
    if (textarea) {
      textarea.tabIndex = 0;
    }
  }

  /**
   * Ajoute les styles CSS pour le widget d'edition
   */
  addStyles() {
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
   * Ouvre le widget d'edition pour un commentaire
   * @param {string} commentId - ID du commentaire
   */
  open(commentId) {
    this.manager.logger.debug('openCommentEditWidget appelé avec ID:', commentId);
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    this.manager.logger.debug('Element commentaire trouvé:', commentElement);

    if (!commentElement) {
      this.manager.logger.error('Commentaire non trouvé pour ID:', commentId);
      this.manager.logger.debug('Éléments avec data-comment-id disponibles:',
        document.querySelectorAll('[data-comment-id]'));
      return;
    }

    const contentElement = commentElement.querySelector('.comment-content');
    const originalContent = contentElement.dataset.original || contentElement.textContent;

    // Chercher l'element de date (compatible modale historique ET accordeon)
    const dateElement = commentElement.querySelector('.timeline-entry-timestamp') ||
                       commentElement.querySelector('.comment-timestamp') ||
                       commentElement.querySelector('.timeline-dates') ||
                       commentElement.querySelector('.comment-meta') ||
                       commentElement.querySelector('.timeline-meta') ||
                       commentElement.querySelector('.text-muted') ||
                       commentElement.querySelector('[class*="timestamp"]') ||
                       commentElement.querySelector('[class*="date"]');

    let dateText = 'Date inconnue';
    if (dateElement) {
      dateText = dateElement.textContent.trim();
      this.manager.logger.debug('Date trouvée:', dateText, 'depuis élément:', dateElement.className);
    } else {
      this.manager.logger.warn('Aucun élément de date trouvé dans:', commentElement.innerHTML);
      // Essayer de trouver une date dans le texte
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/;
      const match = commentElement.textContent.match(dateRegex);
      if (match) {
        dateText = match[0];
        this.manager.logger.debug('Date extraite du texte:', dateText);
      }
    }

    // Stocker les informations du commentaire en cours d'edition
    this.manager.currentEditingComment = {
      id: commentId,
      element: commentElement,
      originalContent: originalContent
    };

    // Remplir le widget (IDs uniques pour accordeon)
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');

    if (!textArea || !dateSpan) {
      this.manager.logger.error('Éléments du widget accordéon non trouvés');
      return;
    }

    textArea.value = originalContent;
    dateSpan.textContent = dateText;

    // S'assurer que le textarea est active
    textArea.disabled = false;
    textArea.readOnly = false;

    // Afficher le widget
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (!widget) {
      this.manager.logger.error('Widget accordéon non trouvé');
      return;
    }

    // Sauvegarder l'ID du commentaire dans le widget pour recuperation (multiples sources)
    widget.dataset.commentId = commentId;
    textArea.dataset.commentId = commentId;
    textArea.setAttribute('data-comment-id', commentId);
    textArea.setAttribute('data-original', originalContent);

    this.disableTaskModalFocusTrap();

    widget.style.display = 'block';

    // Focus avec debugging
    this.manager.logger.debug('Tentative de focus sur textarea:', {
      textArea: !!textArea,
      disabled: textArea.disabled,
      readOnly: textArea.readOnly,
      style: textArea.style.display,
      visible: textArea.offsetParent !== null
    });

    // Focus avec selection automatique du texte
    setTimeout(() => {
      textArea.focus();
      textArea.select(); // Selectionne tout le texte
    }, 150);
  }

  /**
   * Ferme le widget d'edition
   */
  close() {
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (widget) {
      widget.style.display = 'none';
    }

    this.restoreTaskModalFocusTrap();

    this.manager.currentEditingComment = null;

    // Nettoyer le formulaire (IDs uniques pour accordeon)
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');

    if (textArea) textArea.value = '';
    if (dateSpan) dateSpan.textContent = '';
  }

  /**
   * Verifie si le widget d'edition est ouvert
   * @returns {boolean}
   */
  isOpen() {
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (!widget) {
      return false;
    }

    const style = window.getComputedStyle(widget);
    return style.display !== 'none' && widget.getAttribute('aria-hidden') !== 'true';
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
      this.manager.logger.debug('Focus trap de la modale active désactivé pour édition de commentaire');
    } catch (error) {
      this.manager.logger.warn('Impossible de désactiver le focus trap de la modale active', error);
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
      this.manager.logger.debug('Focus trap de la modale active réactivé après édition de commentaire');
    } catch (error) {
      this.manager.logger.warn('Impossible de réactiver le focus trap de la modale active', error);
    }

    this.manager.activeModalFocusTrap = null;
  }

  /**
   * Recupere les instances de modales Bootstrap candidates
   * @returns {Array} Liste des instances de modales
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
   * Recupere l'instance de modale Bootstrap active
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
}
