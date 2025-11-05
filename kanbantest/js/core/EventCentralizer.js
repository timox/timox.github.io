// === core/EventCentralizer.js ===
// Centralisation de TOUS les événements via jQuery pour éviter les conflits

import { safeOn, cleanNamespace } from '../utils/EventManager.js';
import { VIEW_MODES } from '../config/constants.js';

/**
 * Centralise tous les événements de l'application via jQuery
 * UN SEUL ENDROIT pour gérer tous les listeners
 */
export class EventCentralizer {
  constructor() {
    this.managers = new Map();
    this.setupGlobalListeners();
  }
  
  /**
   * Enregistre un manager pour délégation
   */
  registerManager(name, manager) {
    this.managers.set(name, manager);
  }
  
  /**
   * Configure TOUS les listeners globaux via jQuery
   */
  setupGlobalListeners() {
    // === HISTORIQUE ===
    safeOn('.btn-history, .btn-timeline', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const historyManager = this.managers.get('history');
      if (!historyManager) return;
      
      // Protection anti-spam
      if (historyManager._historyOpening) return;
      historyManager._historyOpening = true;
      setTimeout(() => historyManager._historyOpening = false, 1000);
      
      const taskId = parseInt(e.currentTarget.dataset.taskId, 10);
      if (!isNaN(taskId) && taskId > 0) {
        historyManager.openTaskHistory(taskId);
      }
    }, 'history');
    
    // === ÉDITION COMMENTAIRES ===
    safeOn('.btn-edit-comment', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const historyManager = this.managers.get('history');
      if (!historyManager || typeof historyManager.openCommentEditWidget !== 'function') {
        return;
      }

      const button = e.currentTarget;
      const container = button.closest('[data-comment-id]')
        || button.closest('.comment-item')
        || button.closest('.timeline-entry');
      const commentId = button.dataset.commentId || container?.dataset.commentId;

      if (commentId) {
        historyManager.openCommentEditWidget(commentId);
        return;
      }

      const fallbackContent = container?.querySelector('.comment-content, .timeline-content')?.textContent?.trim();
      if (fallbackContent) {
        historyManager.logger?.warn?.('Identifiant de commentaire manquant, ouverture via contenu', fallbackContent);
        historyManager.openCommentEditWidgetFromContent?.(fallbackContent, button);
      } else {
        historyManager.logger?.error?.('Impossible de déterminer le commentaire à éditer depuis le bouton', button);
      }
    }, 'history');
    
    // === MODES D'AFFICHAGE ===
    safeOn('[data-mode]', 'click', (e) => {
      const viewManager = this.managers.get('viewMode');
      if (!viewManager) return;

      const mode = e.currentTarget.dataset.mode;
      viewManager.setViewMode(mode);
    }, 'viewMode');
    
    // === JALONS ===
    safeOn('.btn-delete-jalon', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const jalonManager = this.managers.get('jalon');
      if (!jalonManager) return;
      
      const jalonId = e.currentTarget.dataset.jalonId;
      if (jalonId) {
        jalonManager.deleteJalon(jalonId);
      }
    }, 'jalon');
    
    // === RACCOURCIS CLAVIER ===
    safeOn(document, 'keydown', (e) => {
      // Ignorer si dans un champ de saisie
      if (e.target.matches('input, textarea, select')) return;
      
      // Déléguer aux managers appropriés
      this.handleKeyboardShortcuts(e);
    }, 'keyboard');
    
    console.log('🎯 EventCentralizer: Tous les listeners centralisés via jQuery');
  }
  
  /**
   * Gestion centralisée des raccourcis clavier
   */
  handleKeyboardShortcuts(e) {
    const viewManager = this.managers.get('viewMode');
    const modalManager = this.managers.get('modal');

    // Raccourcis modes d'affichage
    if (viewManager) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          viewManager.setViewMode(VIEW_MODES.COMPACT);
          break;
        case '2':
          e.preventDefault();
          viewManager.setViewMode(VIEW_MODES.DETAILED);
          break;
        case '3':
          e.preventDefault();
          viewManager.setViewMode(VIEW_MODES.FOCUS);
          break;
      }
    }
    
    // Raccourcis modales
    if (modalManager) {
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        modalManager.openTaskModal();
      }
    }
    
    // Raccourci Échap pour fermer modales
    if (e.key === 'Escape') {
      const historyManager = this.managers.get('history');
      if (historyManager && historyManager.isCommentEditOpen?.()) {
        historyManager.closeCommentEditWidget();
      }
    }
  }
  
  /**
   * Nettoie tous les listeners (pour cleanup)
   */
  cleanup() {
    cleanNamespace('history');
    cleanNamespace('viewMode');
    cleanNamespace('jalon');
    cleanNamespace('keyboard');
    console.log('🧹 EventCentralizer: Listeners nettoyés');
  }
}

// Singleton
let eventCentralizer = null;

export function getEventCentralizer() {
  if (!eventCentralizer) {
    eventCentralizer = new EventCentralizer();
  }
  return eventCentralizer;
}