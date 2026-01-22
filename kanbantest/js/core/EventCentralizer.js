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

    // Délégation pour changement de statut des jalons (éléments dynamiques)
    safeOn('.jalon-status-select', 'change', (e) => {
      const jalonManager = this.managers.get('jalon');
      if (!jalonManager || typeof jalonManager.updateJalonStatus !== 'function') {
        return;
      }

      const jalonId = e.currentTarget.dataset.jalonId;
      const newStatus = e.currentTarget.value;

      if (jalonId) {
        jalonManager.updateJalonStatus(jalonId, newStatus);
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
    safeOn('#search-input', 'input', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.search = e.currentTarget.value.toLowerCase().trim();
      filterManager.debouncedSearch();
    }, 'filter');

    safeOn('#filter-bureau', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.bureau = e.currentTarget.value || '';
      filterManager.logger?.debug?.(`Bureau filter changed: ${filterManager.filters.bureau}`);
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#filter-qui', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.qui = e.currentTarget.value || '';
      filterManager.logger?.debug?.(`Qui filter changed: ${filterManager.filters.qui}`);
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#filter-statut', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.filters.statut = e.currentTarget.value || '';
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

      filterManager.showTermine = e.currentTarget.checked;
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#filter-projets-only', 'change', (e) => {
      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.showProjetsOnly = e.currentTarget.checked;
      filterManager.logger?.debug?.(`Projets only filter changed: ${filterManager.showProjetsOnly}`);
      filterManager.applyFilters();
    }, 'filter');

    safeOn('#clear-filters', 'click', (e) => {
      e.preventDefault();

      const filterManager = this.managers.get('filter');
      if (!filterManager) return;

      filterManager.clearAllFilters();
      filterManager.applyFilters();
    }, 'filter');

    // === MODALES ===
    safeOn('#btn-ajout-projet', 'click', (e) => {
      const modalManager = this.managers.get('modal');
      if (!modalManager || typeof modalManager.addNewProject !== 'function') {
        return;
      }

      modalManager.addNewProject();
    }, 'modal');

    safeOn('#stm-urgence, #stm-impact', 'change', (e) => {
      const modalManager = this.managers.get('modal');
      if (!modalManager) return;

      const urgenceSelect = document.getElementById('stm-urgence');
      const impactSelect = document.getElementById('stm-impact');
      const prioriteField = document.getElementById('stm-priorite-calculee');

      if (urgenceSelect && impactSelect && prioriteField) {
        prioriteField.value = modalManager.calculatePriorite(urgenceSelect.value, impactSelect.value);
      }
    }, 'modal');

    safeOn('#stm-description', 'input', (e) => {
      const modalManager = this.managers.get('modal');
      if (!modalManager || typeof modalManager.autoResizeTextarea !== 'function') {
        return;
      }

      modalManager.autoResizeTextarea(e);
    }, 'modal');

    // Délégation pour éléments dynamiques de stratégie
    safeOn('.strategy-tag-remove', 'click', (e) => {
      e.stopPropagation();

      const modalManager = this.managers.get('modal');
      if (!modalManager) return;

      const btn = e.currentTarget;
      const strategyId = parseInt(btn.dataset.strategyId);

      if (!isNaN(strategyId)) {
        modalManager.removeStrategyFromSelection(strategyId);
        modalManager.updateStrategyTags();
        modalManager.updateStrategyPreview();
        modalManager.updateStrategyIds();
      }
    }, 'modal');

    // Délégation pour sélection d'actions stratégiques (éléments dynamiques)
    safeOn('.strategy-action', 'click', (e) => {
      const modalManager = this.managers.get('modal');
      if (!modalManager || typeof modalManager.selectStrategy !== 'function') {
        return;
      }

      const actionDiv = e.currentTarget;
      const strategyId = parseInt(actionDiv.dataset.strategyId);

      if (!isNaN(strategyId) && modalManager.kanban.strategiesData) {
        const strategy = modalManager.kanban.strategiesData.find(s => s.id === strategyId);
        if (strategy) {
          // Extraire les données nécessaires depuis les attributs data
          const objectif = actionDiv.dataset.objectif || strategy.objectif;
          const sousObjectif = actionDiv.dataset.sousObjectif || strategy['sous-objectif'];
          const action = actionDiv.dataset.action || strategy.axe_strategique;

          modalManager.selectStrategy(strategy, objectif, sousObjectif, action, e);
        }
      }
    }, 'modal');

    // Délégation pour toggle expand/collapse des objectifs stratégiques (éléments dynamiques)
    safeOn('.strategy-objective-header', 'click', (e) => {
      const header = e.currentTarget;
      const content = header.nextElementSibling; // .strategy-sub-objectives

      if (!content) return;

      const isExpanded = content.style.display !== 'none';

      if (isExpanded) {
        content.style.display = 'none';
        header.classList.remove('expanded');
        const icon = header.querySelector('.strategy-toggle-icon');
        if (icon) icon.classList.remove('expanded');
      } else {
        content.style.display = 'block';
        header.classList.add('expanded');
        const icon = header.querySelector('.strategy-toggle-icon');
        if (icon) icon.classList.add('expanded');
      }
    }, 'modal');

    // Bouton "Tout désélectionner" les stratégies
    safeOn('#btn-clear-strategies', 'click', (e) => {
      const modalManager = this.managers.get('modal');
      if (modalManager && typeof modalManager.clearAllStrategies === 'function') {
        modalManager.clearAllStrategies();
      }
    }, 'modal');

    // Délégation pour auto-focus des champs de formulaire (click pour focus immédiat)
    safeOn('#shared-task-modal input, #shared-task-modal textarea, #shared-task-modal select', 'click', function(e) {
      const field = e.currentTarget;
      setTimeout(() => {
        field.focus();
        if (field.tagName === 'TEXTAREA' || field.type === 'text') {
          field.setSelectionRange(field.value.length, field.value.length);
        }
      }, 10);
    }, 'modal');

    // Délégation pour synchronisation checkboxes avec select caché
    safeOn('.checkbox-group input[type="checkbox"]', 'change', (e) => {
      const modalManager = this.managers.get('modal');
      if (!modalManager) return;

      const checkbox = e.currentTarget;
      const containerId = checkbox.dataset.containerId;
      const selectId = checkbox.dataset.selectId;

      if (containerId && selectId && typeof modalManager.syncCheckboxToSelect === 'function') {
        modalManager.syncCheckboxToSelect(containerId, selectId);
      }
    }, 'modal');

    // Délégation pour détection de modifications du formulaire (change)
    // Exclure stm-description car les commentaires sont historisés séparément
    safeOn('#shared-task-form input:not(#stm-description), #shared-task-form select, #shared-task-form textarea:not(#stm-description)', 'change', (e) => {
      const modalManager = this.managers.get('modal');
      if (modalManager && typeof modalManager.updateSaveButtonState === 'function') {
        modalManager.updateSaveButtonState();
      }
    }, 'modal');

    // Délégation pour détection de modifications du formulaire (input)
    // Exclure stm-description car les commentaires sont historisés séparément
    safeOn('#shared-task-form input:not(#stm-description), #shared-task-form select, #shared-task-form textarea:not(#stm-description)', 'input', (e) => {
      const modalManager = this.managers.get('modal');
      if (modalManager && typeof modalManager.updateSaveButtonState === 'function') {
        modalManager.updateSaveButtonState();
      }
    }, 'modal');

    // === VUES - Navigation horizontale ===
    // NOTE: Le scroll sur #kanban-container est géré par le ResizeObserver
    // dans ViewManager.setupHorizontalScroll() - pas besoin d'événement supplémentaire

    safeOn('.scroll-arrow-left', 'click', (e) => {
      const kanbanContainer = document.getElementById('kanban-container');
      if (kanbanContainer) {
        kanbanContainer.scrollBy({ left: -300, behavior: 'smooth' });
      }
    }, 'viewMode');

    safeOn('.scroll-arrow-right', 'click', (e) => {
      const kanbanContainer = document.getElementById('kanban-container');
      if (kanbanContainer) {
        kanbanContainer.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }, 'viewMode');

    // Délégation pour badges board-count (éléments dynamiques)
    safeOn('.board-count', 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const viewManager = this.managers.get('viewMode');
      if (!viewManager) return;

      const badge = e.currentTarget;
      const statut = badge.dataset.status;

      if (viewManager.kanban.filterManager) {
        const currentStatut = viewManager.kanban.filterManager.filters.statut;
        const newStatut = currentStatut === statut ? '' : statut;

        viewManager.kanban.filterManager.setFilter('statut', newStatut);
        viewManager.updateBadgeStates(document.getElementById('kanban-container'), newStatut);
      }
    }, 'viewMode');

    // Délégation pour zones éditables des cartes (éléments dynamiques)
    safeOn('.editable-zone', 'click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const viewManager = this.managers.get('viewMode');
      if (!viewManager) return;

      const card = e.currentTarget.closest('.kanban-item');
      const taskId = parseInt(card?.dataset.id, 10);

      if (!isNaN(taskId) && viewManager.kanban.modalManager) {
        const task = viewManager.kanban.currentRecords?.find(r => r.id === taskId);
        if (task) {
          viewManager.kanban.modalManager.openTaskModal(task);
        }
      }
    }, 'viewMode');

    // Délégation pour boutons timeline (éléments dynamiques)
    safeOn('.timeline-btn', 'click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const taskId = parseInt(e.currentTarget.dataset.taskId, 10);
      if (!isNaN(taskId)) {
        window.open(`timeline.html?task=${taskId}`, '_blank');
      }
    }, 'viewMode');

    // Délégation pour navigation clavier sur les cartes (éléments dynamiques)
    safeOn('.kanban-item', 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const editableZone = e.currentTarget.querySelector('.editable-zone');
        editableZone?.click();
      }
    }, 'viewMode');

    // Délégation pour boutons de repliage de colonnes (éléments dynamiques)
    safeOn('.btn-collapse-column', 'click', (e) => {
      const viewManager = this.managers.get('viewMode');
      if (!viewManager || typeof viewManager.handleColumnCollapse !== 'function') {
        return;
      }

      viewManager.handleColumnCollapse(e);
    }, 'viewMode');

    // Délégation pour boutons d'expansion depuis le stack (éléments dynamiques)
    safeOn('.btn-expand-from-stack', 'click', (e) => {
      e.preventDefault();

      const viewManager = this.managers.get('viewMode');
      if (!viewManager) return;

      const statusId = e.currentTarget.dataset.status;
      if (!statusId) return;

      const targetColumn = viewManager.findColumnByStatus(statusId);
      const originalButton = targetColumn?.querySelector('.btn-collapse-column');

      if (targetColumn && originalButton) {
        viewManager.expandColumn(statusId, targetColumn, originalButton, { fromStack: true });
      } else {
        viewManager.collapsedColumns.delete(statusId);
        viewManager.removeFromCollapsedStack(statusId);
      }
    }, 'viewMode');

    // Délégation pour navigation clavier dans le container kanban
    safeOn('#kanban-container', 'keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const viewManager = this.managers.get('viewMode');
        if (viewManager && typeof viewManager.handleKeyboardNavigation === 'function') {
          viewManager.handleKeyboardNavigation(e);
        }
      }
    }, 'viewMode');

    // === DATES ===
    safeOn('#btn-pick-date', 'click', (e) => {
      const datePickerManager = this.managers.get('datePicker');
      if (!datePickerManager || typeof datePickerManager.openDatePicker !== 'function') {
        return;
      }

      datePickerManager.openDatePicker();
    }, 'datePicker');

    safeOn('#btn-clear-date', 'click', (e) => {
      const datePickerManager = this.managers.get('datePicker');
      if (!datePickerManager || typeof datePickerManager.clearDate !== 'function') {
        return;
      }

      datePickerManager.clearDate();
    }, 'datePicker');

    safeOn('#stm-echeance', 'keydown', (e) => {
      const datePickerManager = this.managers.get('datePicker');
      if (!datePickerManager) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typeof datePickerManager.clearDate === 'function') {
          e.preventDefault();
          datePickerManager.clearDate();
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (typeof datePickerManager.openDatePicker === 'function') {
          e.preventDefault();
          datePickerManager.openDatePicker();
        }
      }
    }, 'datePicker');

    // Délégation pour presets de date (éléments dynamiques)
    safeOn('[data-preset]', 'click', (e) => {
      e.preventDefault();

      const datePickerManager = this.managers.get('datePicker');
      if (!datePickerManager || typeof datePickerManager.setDatePreset !== 'function') {
        return;
      }

      const preset = e.currentTarget.dataset.preset;
      if (preset) {
        datePickerManager.setDatePreset(preset);
      }
    }, 'datePicker');

    // === HISTORY MANAGER - Widgets d'édition ===
    // Bouton retour à la timeline
    safeOn('#btn-back-to-timeline', 'click', (e) => {
      const btn = e.currentTarget;
      const originalContent = btn.dataset.originalContent;
      if (originalContent) {
        const timelineContainer = document.querySelector('.timeline-list');
        if (timelineContainer) {
          timelineContainer.innerHTML = originalContent;
        }
      }
    }, 'history');

    // Widget d'édition de commentaire - boutons
    safeOn('#accordion-btn-close-comment-edit, #accordion-btn-cancel-comment-edit', 'click', (e) => {
      const historyManager = this.managers.get('history');
      if (historyManager && typeof historyManager.closeCommentEditWidget === 'function') {
        historyManager.closeCommentEditWidget();
      }
    }, 'history');

    safeOn('#accordion-btn-save-comment-edit', 'click', (e) => {
      const historyManager = this.managers.get('history');
      if (historyManager && typeof historyManager.saveCommentEdit === 'function') {
        historyManager.saveCommentEdit();
      }
    }, 'history');

    // Widget d'édition - overlay click pour fermer
    safeOn('.comment-edit-overlay', 'click', (e) => {
      if (e.target === e.currentTarget) { // Click direct sur overlay, pas sur enfant
        const historyManager = this.managers.get('history');
        if (historyManager && typeof historyManager.closeCommentEditWidget === 'function') {
          historyManager.closeCommentEditWidget();
        }
      }
    }, 'history');

    // Textarea du widget - empêcher propagation des touches
    safeOn('#accordion-comment-edit-text', 'keydown', (e) => {
      e.stopPropagation(); // Empêche les listeners globaux
    }, 'history');

    safeOn('#accordion-comment-edit-text', 'keyup', (e) => {
      e.stopPropagation(); // Empêche les listeners globaux
    }, 'history');

    // === RACCOURCIS CLAVIER ===
    safeOn(document, 'keydown', (e) => {
      // Ignorer si dans un champ de saisie
      if (e.target.matches('input, textarea, select')) return;

      // Fermer simple-history-modal avec Escape
      if (e.key === 'Escape') {
        const simpleModal = document.getElementById('simple-history-modal');
        if (simpleModal) {
          simpleModal.remove();
          return;
        }

        // Fermer widget d'édition de commentaire avec Escape
        const historyManager = this.managers.get('history');
        if (historyManager && typeof historyManager.isCommentEditOpen === 'function' &&
            historyManager.isCommentEditOpen()) {
          historyManager.closeCommentEditWidget();
          return;
        }
      }

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
