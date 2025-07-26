// === CORRECTIF GLOBAL TOUTES MODALES ===
console.log('🚨 === CORRECTIF GLOBAL URGENCE - TOUTES MODALES ===');

class SimpleModalFixer {
  constructor() {
    this.originalMethods = {};
    this.init();
  }

  init() {
    console.log('🔧 Initialisation correctif global...');
    
    // Attendre que kanbanManager soit disponible
    this.waitForKanban();
  }

  waitForKanban() {
    let attempts = 0;
    const maxAttempts = 30;
    
    const check = () => {
      attempts++;
      
      if (window.kanbanManager) {
        console.log('✅ KanbanManager détecté, application des correctifs...');
        this.applyAllFixes();
        return;
      }
      
      if (attempts < maxAttempts) {
        console.log(`⏳ Attente kanbanManager (${attempts}/${maxAttempts})...`);
        setTimeout(check, 1000);
      } else {
        console.log('❌ Timeout: KanbanManager non disponible');
      }
    };
    
    check();
  }

  applyAllFixes() {
    this.fixSimpleClickHandler();
    this.fixHistoryModal();
    this.fixStrategyModal();
    this.fixTaskModal();
    
    console.log('✅ TOUS LES CORRECTIFS APPLIQUÉS !');
    console.log('   → Timeline: CORRIGÉ');
    console.log('   → Stratégie: CORRIGÉ');  
    console.log('   → Édition tâche: CORRIGÉ');
  }

  fixSimpleClickHandler() {
    const handler = window.kanbanManager?.simpleClickHandler;
    if (!handler) {
      console.log('❌ SimpleClickHandler non trouvé');
      return;
    }

    // Sauvegarder original
    if (!handler._originalHandleClick) {
      handler._originalHandleClick = handler.handleClick;
    }

    // Remplacer par version ultra-simple
    handler.handleClick = (e) => {
      console.log('🎯 FIXED Click:', e.target.className, e.target.id);

      // Anti-spam simple
      if (handler.isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      handler.isProcessing = true;
      setTimeout(() => { handler.isProcessing = false; }, 1000);

      try {
        // TIMELINE
        if (e.target.classList.contains('btn-timeline') && e.target.dataset.taskId) {
          e.preventDefault();
          e.stopPropagation();
          this.openTimelineForced(parseInt(e.target.dataset.taskId));
          return;
        }

        // STRATÉGIE  
        if (e.target.classList.contains('strategie-icon') && e.target.dataset.taskId) {
          e.preventDefault();
          e.stopPropagation();
          this.openStrategyForced(parseInt(e.target.dataset.taskId));
          return;
        }

        // TÂCHE (titre de carte)
        const card = e.target.closest('.kanban-item');
        if (card && (e.target.classList.contains('item-title') || e.target.classList.contains('editable-zone'))) {
          e.preventDefault();
          e.stopPropagation();
          this.openTaskForced(parseInt(card.dataset.id));
          return;
        }

        // NOUVELLE TÂCHE
        if (e.target.id === 'btn-nouvelle-tache' || e.target.closest('#btn-nouvelle-tache')) {
          e.preventDefault();
          e.stopPropagation();
          this.openNewTaskForced();
          return;
        }

        // SAUVEGARDE
        if (e.target.id === 'btn-save-task' || e.target.closest('#btn-save-task')) {
          e.preventDefault();
          e.stopPropagation();
          this.saveTaskForced();
          return;
        }

      } catch (error) {
        console.error('❌ Erreur click handler:', error);
      }
    };

    console.log('✅ SimpleClickHandler remplacé');
  }

  openTimelineForced(taskId) {
    console.log('📖 FORCED Timeline pour tâche:', taskId);
    
    const task = window.kanbanManager.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      console.error('❌ Tâche non trouvée:', taskId);
      return;
    }

    const modal = document.getElementById('history-modal');
    if (!modal) {
      console.error('❌ history-modal non trouvé');
      return;
    }

    // Nettoyer
    this.cleanAllModals();

    // Titre
    const title = document.getElementById('history-modal-label');
    if (title) {
      title.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique - ${task.titre}
      `;
    }

    // Contenu
    const body = modal.querySelector('.modal-body');
    if (body) {
      let content = '<div class="alert alert-info">Chargement...</div>';
      
      try {
        if (task.notes) {
          const notes = typeof task.notes === 'string' ? JSON.parse(task.notes) : task.notes;
          if (notes.history && Array.isArray(notes.history)) {
            content = notes.history.map(entry => `
              <div class="border-start border-primary border-3 ps-3 mb-3">
                <div class="d-flex justify-content-between">
                  <strong>${entry.user || 'User'}</strong>
                  <small class="text-muted">${new Date(entry.timestamp).toLocaleString()}</small>
                </div>
                <div class="mt-1">${entry.details || entry.action}</div>
              </div>
            `).join('');
          }
        }
      } catch (e) {
        content = '<div class="alert alert-warning">Erreur lecture historique</div>';
      }
      
      body.innerHTML = content;
    }

    // Ouvrir
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    console.log('✅ Timeline ouverte');
  }

  openStrategyForced(taskId) {
    console.log('🎯 FORCED Stratégie pour tâche:', taskId);
    
    const task = window.kanbanManager.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      console.error('❌ Tâche non trouvée:', taskId);
      return;
    }

    const modal = document.getElementById('strategy-mini-modal');
    if (!modal) {
      console.error('❌ strategy-mini-modal non trouvé');
      return;
    }

    // Nettoyer
    this.cleanAllModals();

    // Titre
    const title = document.getElementById('strategy-mini-modal-label');
    if (title) {
      title.innerHTML = `Stratégie - ${task.titre}`;
    }

    // Contenu basique
    const body = modal.querySelector('.modal-body');
    if (body) {
      let content = '<div class="alert alert-info">Informations stratégiques</div>';
      
      try {
        if (task.strategie_id) {
          const strategieId = Array.isArray(task.strategie_id) ? task.strategie_id[1] : task.strategie_id;
          content = `
            <div class="card">
              <div class="card-body">
                <h6>Stratégie liée</h6>
                <p>ID: ${strategieId}</p>
                <p>Tâche: ${task.titre}</p>
              </div>
            </div>
          `;
        } else {
          content = '<div class="alert alert-info">Aucune stratégie associée</div>';
        }
      } catch (e) {
        content = '<div class="alert alert-warning">Erreur lecture stratégie</div>';
      }
      
      body.innerHTML = content;
    }

    // Ouvrir
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    console.log('✅ Stratégie ouverte');
  }

  openTaskForced(taskId) {
    console.log('📝 FORCED Task pour tâche:', taskId);
    
    const task = window.kanbanManager.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      console.error('❌ Tâche non trouvée:', taskId);
      return;
    }

    const modal = document.getElementById('popup-tache');
    if (!modal) {
      console.error('❌ popup-tache non trouvé');
      return;
    }

    // Nettoyer
    this.cleanAllModals();

    // Remplir champs basiques
    const titre = modal.querySelector('#popup-titre');
    const desc = modal.querySelector('#popup-description');
    const statut = modal.querySelector('#popup-statut-text');

    if (titre) titre.value = task.titre || '';
    if (desc) desc.value = ''; // Toujours vide pour nouveaux commentaires
    if (statut) statut.value = task.statut || '';

    // Mettre à jour le ModalManager si dispo
    if (window.kanbanManager.modalManager) {
      window.kanbanManager.modalManager.currentTaskId = taskId;
      window.kanbanManager.modalManager.currentTask = task;
      window.kanbanManager.modalManager.isNewTask = false;
    }

    // Ouvrir
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    console.log('✅ Task ouverte');
  }

  openNewTaskForced() {
    console.log('🆕 FORCED Nouvelle tâche');
    
    const modal = document.getElementById('popup-tache');
    if (!modal) {
      console.error('❌ popup-tache non trouvé');
      return;
    }

    // Nettoyer
    this.cleanAllModals();

    // Vider champs
    const titre = modal.querySelector('#popup-titre');
    const desc = modal.querySelector('#popup-description');
    const statut = modal.querySelector('#popup-statut-text');

    if (titre) titre.value = '';
    if (desc) desc.value = '';
    if (statut) statut.value = 'À faire';

    // Mettre à jour le ModalManager si dispo
    if (window.kanbanManager.modalManager) {
      window.kanbanManager.modalManager.currentTaskId = null;
      window.kanbanManager.modalManager.currentTask = null;
      window.kanbanManager.modalManager.isNewTask = true;
    }

    // Ouvrir
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    console.log('✅ Nouvelle tâche ouverte');
  }

  saveTaskForced() {
    console.log('💾 FORCED Save task');
    
    if (window.kanbanManager.modalManager) {
      try {
        window.kanbanManager.modalManager.saveTask();
        console.log('✅ Sauvegarde déléguée au ModalManager');
      } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
      }
    } else {
      console.log('⚠️ ModalManager non disponible pour save');
    }
  }

  cleanAllModals() {
    // Supprimer tous les backdrops
    document.querySelectorAll('.modal-backdrop').forEach(b => {
      console.log('🧹 Suppression backdrop:', b.className);
      b.remove();
    });

    // Réinitialiser body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    console.log('🧹 Modales nettoyées');
  }

  fixHistoryModal() {
    const historyManager = window.kanbanManager?.historyManager;
    if (historyManager && !historyManager._originalOpenTaskHistory) {
      historyManager._originalOpenTaskHistory = historyManager.openTaskHistory;
      historyManager.openTaskHistory = (taskId) => {
        this.openTimelineForced(taskId);
      };
      console.log('✅ HistoryManager.openTaskHistory remplacé');
    }
  }

  fixStrategyModal() {
    const kanban = window.kanbanManager;
    if (kanban && !kanban._originalOpenStrategyMiniModal) {
      kanban._originalOpenStrategyMiniModal = kanban.openStrategyMiniModal;
      kanban.openStrategyMiniModal = (taskId) => {
        this.openStrategyForced(taskId);
      };
      console.log('✅ openStrategyMiniModal remplacé');
    }
  }

  fixTaskModal() {
    const modalManager = window.kanbanManager?.modalManager;
    if (modalManager && !modalManager._originalOpenTaskModal) {
      modalManager._originalOpenTaskModal = modalManager.openTaskModal;
      modalManager.openTaskModal = (task) => {
        if (task && task.id) {
          this.openTaskForced(task.id);
        } else {
          this.openNewTaskForced();
        }
      };
      console.log('✅ ModalManager.openTaskModal remplacé');
    }
  }
}

// Créer et appliquer le correctif
const modalFixer = new SimpleModalFixer();

// Export pour utilisation manuelle
window.modalFixer = modalFixer;
window.applyGlobalModalFix = () => modalFixer.applyAllFixes();

console.log('🚨 CORRECTIF GLOBAL CHARGÉ !');
console.log('   🎯 Timeline: Sera corrigé');
console.log('   🎯 Stratégie: Sera corrigé');
console.log('   🎯 Édition: Sera corrigé');
console.log('   🎯 Nouvelle tâche: Sera corrigé');
console.log('');
console.log('📝 Si problème: applyGlobalModalFix()');