// === managers/history/HistoryModalManager.js ===
// Gestion de la modale d'historique separee

import { displayError } from '../../utils/dom.js';
import { escapeHTML } from '../../utils/safe-dom.js';

/**
 * Gestion de l'ouverture/fermeture de la modale d'historique
 */
export class HistoryModalManager {
  constructor(historyManager) {
    this.manager = historyManager;
  }

  /**
   * Configure les listeners pour nettoyer automatiquement les backdrops
   * BUG FIX: stocke la reference du setInterval pour cleanup dans destroy()
   */
  setupModalCleanupListeners() {
    // Ecouter les evenements Bootstrap 5 de fermeture de modales
    document.addEventListener('hidden.bs.modal', (event) => {
      this.manager.logger.debug('Modale fermée détectée:', event.target.id);
      // Delai pour laisser Bootstrap 5 finir ses animations
      setTimeout(() => {
        this.cleanupOrphanBackdrops();
      }, 200);
    });

    // Nettoyage periodique des backdrops orphelins
    // BUG FIX: stocker la reference pour pouvoir la nettoyer dans destroy()
    this.manager._cleanupInterval = setInterval(() => {
      this.cleanupOrphanBackdrops();
    }, 5000); // Verifier toutes les 5 secondes
  }

  /**
   * Ouvre l'historique d'une tache
   * @param {number} taskId - ID de la tache
   */
  openTaskHistory(taskId) {
    this.manager.logger.info(`openTaskHistory appelé pour tâche ${taskId}`);

    // Verification des elements DOM
    if (!document.getElementById('task-history-modal-label')) {
      this.manager.logger.error('Élément task-history-modal-label manquant');
      return;
    }

    // Protection: Eviter les appels multiples sur openTaskHistory (reduite)
    const now = Date.now();
    if (this.manager._taskHistoryOpening === taskId && (this.manager._lastHistoryOpen && now - this.manager._lastHistoryOpen < 1000)) {
      this.manager.logger.debug(`openTaskHistory déjà en cours pour tâche ${taskId}`);
      return;
    }

    const task = this.manager.kanban.currentRecords?.find(r => r.id === taskId);
    this.manager.logger.debug('Tâche trouvée:', !!task, task ? task.titre : 'N/A');
    if (!task) {
      this.manager.logger.error('Tâche non trouvée pour ID:', taskId);
      displayError('Tâche non trouvée');
      return;
    }

    // Marquer cette tache comme en cours d'ouverture et horodater
    this.manager._taskHistoryOpening = taskId;
    this.manager._lastHistoryOpen = now;
    setTimeout(() => {
      this.manager._taskHistoryOpening = null;
      this.manager.logger.debug(`protection openTaskHistory levée pour tâche ${taskId}`);
    }, 500);

    this.manager.currentTaskHistory = task;

    // Verifier si la modale d'edition est ouverte
    const taskModal = document.getElementById('shared-task-modal');
    const isTaskModalOpen = taskModal && taskModal.classList.contains('show');
    const currentTaskIdInModal = this.manager.kanban.modalManager?.currentTaskId;

    if (isTaskModalOpen) {
      if (currentTaskIdInModal === taskId) {
        // Meme tache ouverte : utiliser l'accordeon dans la modale de detail
        this.manager.logger.info('Même tâche ouverte - utilisation accordéon dans modale de détail');
        if (this.manager.kanban.modalManager) {
          this.manager.kanban.modalManager.loadCommentHistoryInAccordion();

          // Ouvrir l'accordeon automatiquement
          const accordion = document.getElementById('comment-history-accordion');
          if (accordion && !accordion.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(accordion, { show: true });
          }
        }
        return; // Ne pas ouvrir la modale separee
      } else {
        // Tache differente : fermer la modale d'edition d'abord
        this.manager.logger.info('Tâche différente ouverte - fermeture modale d\'édition');
        if (this.manager.kanban.modalManager?.taskModal) {
          this.manager.kanban.modalManager.taskModal.hide();

          // Attendre que la modale soit fermee avant d'ouvrir l'historique
          setTimeout(() => {
            this.openHistoryModalSeparately(task, taskId);
          }, 300);
          return;
        }
      }
    }

    // Cas par defaut : ouvrir la modale historique separee
    this.openHistoryModalSeparately(task, taskId);
  }

  /**
   * Ouvre la modale d'historique separee
   * Inline onclick handlers replaced with addEventListener after DOM insertion
   * @param {object} task - Donnees de la tache
   * @param {number} taskId - ID de la tache
   */
  openHistoryModalSeparately(task, taskId) {
    this.manager.logger.info('Ouverture modale historique séparée');
    this.manager.logger.debug('DOM ready state:', document.readyState);
    this.manager.logger.debug('Task:', task?.id, task?.titre);

    // CORRECTIF: Nettoyer les backdrops orphelins avant d'ouvrir
    this.cleanupOrphanBackdrops();

    // Mettre a jour le titre de la modale
    const modalTitle = document.getElementById('task-history-modal-label');
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique de la tâche #${taskId} - ${escapeHTML(task.titre)}
      `;
    }

    // Rendre l'historique
    this.manager.renderer.renderTaskHistory(task);

    // Ouvrir la modale
    this.manager.logger.debug('Recherche élément task-history-modal dans le DOM...');
    const historyModalEl = document.getElementById('task-history-modal');

    // Debug complet des modales presentes
    const allModals = document.querySelectorAll('.modal');
    this.manager.logger.debug('Modales trouvées dans le DOM:', Array.from(allModals).map(m => m.id));

    if (!historyModalEl) {
      this.manager.logger.error('Élément task-history-modal introuvable dans le DOM');
      this.manager.logger.error('DOM actuel:', document.body.innerHTML.length, 'caractères');
      return;
    }

    this.manager.logger.debug('Élément task-history-modal trouvé:', historyModalEl);

    // Verifier l'etat de la modale avant ouverture
    this.manager.logger.debug('État modale avant ouverture:', {
      hasShow: historyModalEl.classList.contains('show'),
      display: historyModalEl.style.display,
      visibility: historyModalEl.style.visibility,
      modalManager: !!this.manager.kanban.modalManager?.historyModal
    });

    // SOLUTION SIMPLE: Utiliser la meme approche que la modal de test
    this.manager.logger.info('Création modal simple avec contenu Bootstrap');

    // Supprimer toute modal existante
    const existingSimple = document.getElementById('simple-history-modal');
    if (existingSimple) existingSimple.remove();

    // Creer une modal simple mais avec le contenu Bootstrap
    const simpleModal = document.createElement('div');
    simpleModal.id = 'simple-history-modal';

    // Nettoyer COMPLETEMENT le contenu Bootstrap des attributs problematiques
    let cleanContent = historyModalEl.innerHTML;

    // Supprimer TOUS les attributs Bootstrap
    cleanContent = cleanContent.replace(/data-bs-[^=]*="[^"]*"/g, '');
    cleanContent = cleanContent.replace(/aria-label="Close"/g, '');
    cleanContent = cleanContent.replace(/type="button"/g, '');

    // Remplacer les boutons de fermeture par des boutons simples ALIGNES A DROITE
    // Remplacement onclick inline par data-action pour addEventListener
    cleanContent = cleanContent.replace(/<button[^>]*class="[^"]*btn-close[^"]*"[^>]*>.*?<\/button>/g,
      '<button data-action="close-simple-modal" style="background:none;border:none;font-size:1.5rem;cursor:pointer;position:absolute;top:10px;right:15px;color:#666;">&times;</button>');

    // Supprimer les trois boutons du bas (modal-footer)
    cleanContent = cleanContent.replace(/<div[^>]*class="[^"]*modal-footer[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');

    // Supprimer les classes Bootstrap problematiques des boutons restants
    cleanContent = cleanContent.replace(/class="([^"]*)btn[^"]*"/g, (match, otherClasses) => {
      const cleanClasses = otherClasses.replace(/\s*btn[^\s]*/g, '').trim();
      return cleanClasses ? `class="${cleanClasses}"` : '';
    });

    // Corriger les liens d'edition de tache: remplacer onclick inline par data-attributes
    cleanContent = cleanContent.replace(/onclick="([^"]*)"/g, (match, onclickContent) => {
      if (onclickContent.includes('openTaskModal')) {
        // Remplacer par un data-attribute pour addEventListener
        return 'data-action="open-task-and-close-modal"';
      }
      return match;
    });

    simpleModal.innerHTML = `
      <div class="simple-history-overlay" data-action="close-on-backdrop" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1060;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: white;
          border-radius: 8px;
          max-width: 1000px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0,0,0,.5);
          position: relative;
        ">
          ${cleanContent}
        </div>
      </div>
    `;

    document.body.appendChild(simpleModal);

    // Attach event listeners after DOM insertion (replaces inline onclick handlers)
    this._attachSimpleModalListeners(simpleModal, taskId);

    // NOTE: Evenement Escape gere par EventCentralizer.js ligne 510-515
    // (detection de #simple-history-modal et fermeture automatique)

    this.manager.logger.info('Modal simple créée avec succès');
  }

  /**
   * Attache les event listeners sur la modal simple apres insertion dans le DOM
   * Remplace tous les inline onclick handlers
   * @param {HTMLElement} simpleModal - Element de la modal
   * @param {number} taskId - ID de la tache
   */
  _attachSimpleModalListeners(simpleModal, taskId) {
    // Fermeture par bouton close
    const closeButtons = simpleModal.querySelectorAll('[data-action="close-simple-modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        simpleModal.remove();
      });
    });

    // Fermeture par clic sur le backdrop (overlay)
    const overlay = simpleModal.querySelector('[data-action="close-on-backdrop"]');
    if (overlay) {
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          simpleModal.remove();
        }
      });
    }

    // Ouverture tache et fermeture modal
    const openTaskButtons = simpleModal.querySelectorAll('[data-action="open-task-and-close-modal"]');
    openTaskButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        simpleModal.remove();
        window.kanbanManager?.modalManager?.openTaskModalById(taskId);
      });
    });

    // Titre cliquable dans la timeline header (si present dans le contenu copie)
    const titleLinks = simpleModal.querySelectorAll('[data-action="open-task-modal"]');
    titleLinks.forEach(el => {
      const elTaskId = parseInt(el.dataset.taskId, 10) || taskId;
      el.addEventListener('click', () => {
        simpleModal.remove();
        window.kanbanManager?.modalManager?.openTaskModalById(elTaskId);
      });
    });
  }

  /**
   * Ferme la modal d'historique manuellement
   */
  closeHistoryModal() {
    const historyModalEl = document.getElementById('task-history-modal');
    if (historyModalEl) {
      historyModalEl.style.display = 'none';
      historyModalEl.classList.remove('show');
      historyModalEl.removeAttribute('aria-modal');
      historyModalEl.setAttribute('aria-hidden', 'true');
    }

    // Supprimer le backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    // Supprimer la classe du body
    document.body.classList.remove('modal-open');

    this.manager.logger.info('Modal d\'historique fermée manuellement');
  }

  /**
   * Force l'affichage de la modale d'historique
   * @param {HTMLElement} modalEl - Element de la modale
   */
  forceShowModal(modalEl) {
    this.manager.logger.info('Test: Création d\'une modal HTML simple');

    // Supprimer toute modal de test existante
    const existingTest = document.getElementById('test-simple-modal');
    if (existingTest) existingTest.remove();

    // Creer une modal simple sans Bootstrap
    const testModal = document.createElement('div');
    testModal.id = 'test-simple-modal';
    testModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 5px 15px rgba(0,0,0,.5);
        ">
          <h3>Modal de Test Simple</h3>
          <p>Si vous voyez ceci, les modals HTML peuvent s'afficher !</p>
          <hr>
          <div id="test-modal-content">
            ${modalEl.innerHTML}
          </div>
          <hr>
          <button data-action="close-test-modal" style="
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">
            Fermer cette modal de test
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(testModal);

    // Attach event listener instead of inline onclick
    const closeBtn = testModal.querySelector('[data-action="close-test-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        testModal.remove();
      });
    }

    this.manager.logger.info('Modal de test créée. Visible ?');

    // Log pour debug
    this.manager.logger.info('Comparaison:', {
      modalBootstrap: modalEl.id,
      modalBootstrapVisible: window.getComputedStyle(modalEl).display,
      modalTestVisible: 'devrait être visible'
    });
  }

  /**
   * Nettoie les backdrops orphelins
   */
  cleanupOrphanBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    let cleaned = 0;

    backdrops.forEach(backdrop => {
      // Verifier s'il y a une modale visible correspondante
      const visibleModals = document.querySelectorAll('.modal.show');

      if (visibleModals.length === 0) {
        // Aucune modale visible, supprimer le backdrop
        backdrop.remove();
        cleaned++;
        this.manager.logger.debug('Backdrop orphelin supprimé');
      }
    });

    if (cleaned > 0) {
      document.body.classList.remove('modal-open');
      this.manager.logger.info(`${cleaned} backdrop(s) orphelin(s) nettoyé(s)`);
    }
  }
}
