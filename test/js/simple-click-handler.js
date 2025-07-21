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
    setTimeout(() => { this.isProcessing = false; }, 1000);
    
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
      
      // === PRIORITÉ 2: TIMELINE ET HISTORIQUE ===
      
      // Timeline - bouton avec data-task-id
      if (e.target.dataset.taskId && e.target.classList.contains('btn-timeline')) {
        e.preventDefault();
        e.stopPropagation();
        this.openTimeline(parseInt(e.target.dataset.taskId));
        return;
      }
      
      // Export historique
      if (e.target.id === 'btn-export-task-history' || e.target.closest('#btn-export-task-history')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleExportHistory();
        return;
      }
      
      // === PRIORITÉ 3: STRATÉGIES ===
      
      // Stratégie - icône avec data-task-id
      if (e.target.dataset.taskId && e.target.classList.contains('strategie-icon')) {
        e.preventDefault();
        e.stopPropagation();
        this.openStrategy(parseInt(e.target.dataset.taskId));
        return;
      }
      
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
    if (this.kanban.historyManager) {
      this.kanban.historyManager.openTaskHistory(taskId);
    }
  }
  
  openStrategy(taskId) {
    console.log('🎯 Ouverture stratégie pour tâche:', taskId);
    this.kanban.openStrategyMiniModal(taskId);
  }
  
  openTaskModal(taskId) {
    console.log('📝 Ouverture modale tâche:', taskId);
    
    // Nettoyer avant d'ouvrir
    this.cleanBackdrops();
    
    // Méthode ultra-simple
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
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
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
}

// Export pour utilisation
window.SimpleClickHandler = SimpleClickHandler;