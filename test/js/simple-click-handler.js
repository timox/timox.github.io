// === GESTIONNAIRE DE CLICS SIMPLE ET ROBUSTE ===
// Remplace toute la logique complexe d'event listeners

class SimpleClickHandler {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.isProcessing = false;
    this.init();
  }
  
  init() {
    // UN SEUL event listener global, très simple
    document.addEventListener('click', (e) => this.handleClick(e), true);
    console.log('✅ Gestionnaire de clics simple initialisé');
  }
  
  handleClick(e) {
    // Protection anti-spam
    if (this.isProcessing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    this.isProcessing = true;
    setTimeout(() => { 
      this.isProcessing = false; 
      // Nettoyer les tooltips figées
      this.cleanStuckTooltips();
    }, 1000);
    
    try {
      console.log('🎯 Click intercepté:', e.target.className, e.target.id);
      
      // === PRIORITÉ 1: BOUTONS SYSTÈME ===
      
      // Nouvelle tâche
      if (e.target.id === 'btn-nouvelle-tache' || e.target.closest('#btn-nouvelle-tache')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleNewTask();
        return;
      }
      
      // Boutons modales (save, delete, etc.)
      if (e.target.id === 'btn-save-task' || e.target.closest('#btn-save-task')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleSaveTask();
        return;
      }
      
      if (e.target.id === 'btn-delete-task' || e.target.closest('#btn-delete-task')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleDeleteTask();
        return;
      }
      
      // === PRIORITÉ 2: TIMELINE ET HISTORIQUE (ULTRA PRIORITAIRE) ===
      
      // Timeline - détection TRÈS agressive pour éviter conflits avec cartes
      if (e.target.classList.contains('bi-clock-history') || 
          e.target.closest('.btn-timeline') ||
          e.target.classList.contains('btn-timeline')) {
        
        const timelineBtn = e.target.closest('.btn-timeline') || (e.target.classList.contains('btn-timeline') ? e.target : null);
        if (timelineBtn && timelineBtn.dataset.taskId) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Empêche TOUS les autres listeners
          console.log('🎯 Timeline détecté (priorité ultra), taskId:', timelineBtn.dataset.taskId);
          this.openTimeline(parseInt(timelineBtn.dataset.taskId));
          return;
        }
      }
      
      // Export historique
      if (e.target.id === 'btn-export-task-history' || e.target.closest('#btn-export-task-history')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleExportHistory();
        return;
      }
      
      // === PRIORITÉ 3: STRATÉGIES === (DÉSACTIVÉ POUR DEBUG)
      /*
      // Stratégie - icône avec data-task-id OU son parent
      const strategyIcon = e.target.closest('.strategie-icon') || (e.target.classList.contains('strategie-icon') ? e.target : null);
      if (strategyIcon && strategyIcon.dataset.taskId) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Stratégie détectée via closest(), taskId:', strategyIcon.dataset.taskId);
        this.openStrategy(parseInt(strategyIcon.dataset.taskId));
        return;
      }
      */
      
      // === PRIORITÉ 4: CARTES KANBAN ===
      
      // Carte - clic sur titre ou zone éditable
      const card = e.target.closest('.kanban-item');
      if (card && (e.target.classList.contains('item-title') || e.target.classList.contains('editable-zone'))) {
        e.preventDefault();
        e.stopPropagation();
        this.openTaskModal(parseInt(card.dataset.id));
        return;
      }
      
      // === PRIORITÉ 5: ÉLÉMENTS PASSIFS ===
      
      // Badges - ne rien faire, juste laisser Bootstrap gérer
      if (e.target.classList.contains('badge')) {
        // Laisser le tooltip s'afficher naturellement
        return;
      }
      
      // === PRIORITÉ 6: FILTRES ET NAVIGATION ===
      
      // Board counts (badges de statut)
      if (e.target.classList.contains('board-count')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleStatusFilter(e.target.dataset.status);
        return;
      }
      
      // Clear filters
      if (e.target.id === 'btn-clear-filters') {
        e.preventDefault();
        e.stopPropagation();
        this.handleClearFilters();
        return;
      }
      
    } catch (error) {
      console.error('❌ Erreur click handler:', error);
    }
  }
  
  openTimeline(taskId) {
    console.log('📖 Ouverture timeline pour tâche:', taskId);
    
    // 🆕 NOUVEAU SYSTÈME MODAL avec fallback
    if (this.kanban.modalSystem?.isInitialized()) {
      console.log('🆕 Utilisation nouveau système modal');
      this.kanban.modalSystem.openModal('history-modal', { taskId })
        .catch(error => {
          console.error('❌ Nouveau système échoué, fallback:', error);
          if (this.kanban.historyManager) {
            this.kanban.historyManager.openTaskHistory(taskId);
          }
        });
    } else if (this.kanban.historyManager) {
      console.log('🔄 Fallback ancien système');
      this.kanban.historyManager.openTaskHistory(taskId);
    }
  }
  
  // DÉSACTIVÉ POUR DEBUG
  /*
  openStrategy(taskId) {
    console.log('🎯 Ouverture stratégie pour tâche:', taskId);
    this.kanban.openStrategyMiniModal(taskId);
  }
  */
  
  openTaskModal(taskId) {
    console.log('📝 Ouverture modale tâche:', taskId);
    
    // Nettoyer avant d'ouvrir
    this.cleanBackdrops();
    
    // CORRECTION: Utiliser le ModalManager au lieu de faire à la main
    if (this.kanban.modalManager) {
      // Récupérer l'objet task complet à partir du taskId
      const task = this.kanban.currentRecords?.find(t => t.id === taskId);
      if (task) {
        console.log('📝 SimpleClickHandler: Ouverture via ModalManager avec task:', task.id);
        this.kanban.modalManager.openTaskModal(task);
      } else {
        console.error('❌ SimpleClickHandler: Task non trouvée pour ID:', taskId);
        displayError('Tâche non trouvée');
      }
    } else {
      console.log('⚠️ SimpleClickHandler: ModalManager indisponible, fallback direct');
      // Fallback ultra-simple si ModalManager indisponible
      this.fallbackOpenTaskModal(taskId);
    }
  }
  
  fallbackOpenTaskModal(taskId) {
    const task = this.kanban.currentRecords?.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.getElementById('popup-tache');
    if (!modal) return;
    
    // Remplir les champs de base
    const titre = modal.querySelector('#popup-titre');
    const desc = modal.querySelector('#popup-description');
    const statut = modal.querySelector('#popup-statut-text');
    
    if (titre) titre.value = task.titre || '';
    if (desc) desc.value = task.description || '';
    if (statut) statut.value = task.statut || '';
    
    // Ouvrir
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }
  
  cleanBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    console.log(`🧹 SimpleClickHandler: Nettoyage ${backdrops.length} backdrops`);
    
    backdrops.forEach((backdrop, index) => {
      console.log(`   → Suppression backdrop ${index + 1}: ${backdrop.className}`);
      backdrop.remove();
    });
    
    // Réinitialiser l'état du body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    console.log('🔧 Body state réinitialisé:', {
      classes: document.body.className,
      overflow: document.body.style.overflow
    });
  }
  
  // === MÉTHODES POUR LES NOUVEAUX HANDLERS ===
  
  handleNewTask() {
    console.log('🆕 Nouvelle tâche');
    if (this.kanban.modalManager) {
      this.kanban.modalManager.openTaskModal();
    } else {
      // Fallback direct
      const modal = document.getElementById('popup-tache');
      if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
      }
    }
  }
  
  handleSaveTask() {
    console.log('💾 Sauvegarde tâche');
    if (this.kanban.modalManager) {
      this.kanban.modalManager.saveTask();
    }
  }
  
  handleDeleteTask() {
    console.log('🗑️ Suppression tâche');
    if (this.kanban.modalManager) {
      this.kanban.modalManager.deleteTask();
    }
  }
  
  handleExportHistory() {
    console.log('📤 Export historique');
    if (this.kanban.historyManager) {
      this.kanban.historyManager.exportTaskHistory();
    }
  }
  
  handleStatusFilter(status) {
    console.log('🔍 Filtre statut:', status);
    if (this.kanban.filterManager) {
      this.kanban.filterManager.setFilter('statut', status);
    }
  }
  
  handleClearFilters() {
    console.log('🧹 Clear filtres');
    if (this.kanban.filterManager) {
      this.kanban.filterManager.clearAllFilters();
    }
  }
  
  cleanStuckTooltips() {
    // Supprimer toutes les tooltips figées
    const stuckTooltips = document.querySelectorAll('.tooltip, .bs-tooltip-auto, .bs-tooltip-top, .bs-tooltip-bottom, .bs-tooltip-left, .bs-tooltip-right');
    stuckTooltips.forEach(tooltip => {
      if (tooltip && tooltip.remove) {
        tooltip.remove();
      }
    });
    
    // Réinitialiser les tooltips Bootstrap
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      tooltipTriggerList.forEach(tooltipTriggerEl => {
        const tooltipInstance = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (tooltipInstance) {
          tooltipInstance.hide();
        }
      });
    }
  }
}

// Export pour utilisation
window.SimpleClickHandler = SimpleClickHandler;