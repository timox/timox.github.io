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
    safeOn('#btn-add-jalon', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const jalonManager = this.managers.get('jalon');
      if (!jalonManager || typeof jalonManager.openJalonModal !== 'function') {
        return;
      }

      jalonManager.logger?.debug?.('Bouton ajouter un jalon cliqué via EventCentralizer');
      jalonManager.openJalonModal();
    }, 'jalon');

    safeOn('.btn-delete-jalon', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const jalonManager = this.managers.get('jalon');
      if (!jalonManager) return;

      const jalonId = e.currentTarget.dataset.jalonId;
      if (!jalonId) {
        jalonManager.logger?.error?.('ID de jalon manquant pour la suppression');
        return;
      }

      if (confirm('Êtes-vous sûr de vouloir supprimer ce jalon ?')) {
        try {
          jalonManager.deleteJalon(jalonId);
        } catch (error) {
          jalonManager.logger?.error?.('Erreur lors de la suppression du jalon:', error);
        }
      }
    }, 'jalon');

    safeOn('.btn-edit-jalon', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const jalonManager = this.managers.get('jalon');
      if (!jalonManager || typeof jalonManager.openJalonModal !== 'function') {
        return;
      }

      const button = e.currentTarget;

      try {
        // Rechercher l'ID de jalon de manière robuste
        let jalonId = button.dataset.jalonId;

        if (!jalonId) {
          const jalonElement = button.closest('[data-jalon-id]');
          if (jalonElement) {
            jalonId = jalonElement.dataset.jalonId;
          }
        }

        if (!jalonId) {
          jalonManager.logger?.error?.('Impossible de trouver l\'ID du jalon à éditer');
          return;
        }

        jalonManager.logger?.debug?.('Édition du jalon ID:', jalonId);

        const jalon = jalonManager.jalons.find(j => j.id === jalonId);
        if (jalon) {
          jalonManager.openJalonModal(jalon);
        } else {
          jalonManager.logger?.error?.('Jalon non trouvé pour édition. ID:', jalonId);
        }
      } catch (error) {
        jalonManager.logger?.error?.('Erreur lors de l\'édition du jalon:', error);
      }
    }, 'jalon');

    safeOn('.jalon-type-card', 'click', (e) => {
      const jalonManager = this.managers.get('jalon');
      if (!jalonManager || typeof jalonManager.selectJalonType !== 'function') {
        return;
      }

      const card = e.currentTarget;
      const type = card.dataset.type;
      if (type) {
        jalonManager.selectJalonType(type);
      }
    }, 'jalon');

    safeOn('#btn-save-jalon', 'click', (e) => {
      const jalonManager = this.managers.get('jalon');
      if (!jalonManager || typeof jalonManager.saveJalon !== 'function') {
        return;
      }

      jalonManager.saveJalon();
    }, 'jalon');

    // === FILTRES ===
    safeOn('#task-search', 'input', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.search = e.target.value.toLowerCase().trim();
      filterManager.debouncedSearch();
    }, 'filter');

    safeOn('#filter-bureau', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.bureau = e.target.value || '';
      filterManager.logger?.debug?.(`Bureau filter changed: ${filterManager.filters.bureau}`);
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#filter-qui', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.qui = e.target.value || '';
      filterManager.logger?.debug?.(`Qui filter changed: ${filterManager.filters.qui}`);
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#filter-projet', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.projet = e.target.value || '';
      filterManager.logger?.debug?.(`Projet filter changed: ${filterManager.filters.projet}`);
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#filter-statut', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.statut = e.target.value || '';
      filterManager.logger?.debug?.(`Statut filter changed: ${filterManager.filters.statut}`);

      // Synchroniser avec ViewManager en mode focus
      if (filterManager.kanban.viewMode === 'focus' && filterManager.kanban.viewManager) {
        filterManager.kanban.viewManager.focusColumn = filterManager.filters.statut;
      }

      filterManager.applyFilters();
    }, 'filter');

    safeOn('#show-termine', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.showTermine = e.target.checked;
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#clear-filters', 'click', (e) => {
      e.preventDefault();

      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.clearAllFilters();
      filterManager.applyFilters();
    }, 'filter');

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