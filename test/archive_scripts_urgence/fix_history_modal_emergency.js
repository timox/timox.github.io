// === CORRECTIF D'URGENCE MODALE HISTORIQUE ===
console.log('🚨 === CORRECTIF URGENCE MODALE HISTORIQUE ===');

// Remplacer la méthode openTaskHistory pour forcer l'ouverture
function patchHistoryManager() {
  const kanban = window.kanbanManager;
  
  if (!kanban || !kanban.historyManager) {
    console.log('❌ HistoryManager non disponible pour patch');
    return;
  }
  
  // Sauvegarder la méthode originale
  if (!kanban.historyManager._originalOpenTaskHistory) {
    kanban.historyManager._originalOpenTaskHistory = kanban.historyManager.openTaskHistory;
  }
  
  // Remplacer par une version simplifiée qui fonctionne
  kanban.historyManager.openTaskHistory = function(taskId) {
    console.log('🔧 PATCH: openTaskHistory appelé pour tâche:', taskId);
    
    // Trouver la tâche
    const task = this.kanban.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      console.error('❌ PATCH: Tâche non trouvée:', taskId);
      return;
    }
    
    console.log('✅ PATCH: Tâche trouvée:', task.titre);
    
    // Remplir directement la modale d'historique
    const historyModalEl = document.getElementById('history-modal');
    if (!historyModalEl) {
      console.error('❌ PATCH: Élément history-modal introuvable');
      return;
    }
    
    // Mettre à jour le titre
    const modalTitle = document.getElementById('history-modal-label');
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique de la tâche #${taskId} - ${task.titre}
      `;
    }
    
    // Remplir le contenu
    const modalBody = historyModalEl.querySelector('.modal-body');
    if (modalBody) {
      try {
        // Essayer de récupérer l'historique
        let historyHtml = '<div class="alert alert-info">Chargement historique...</div>';
        
        // Si on a des notes JSON, les afficher
        if (task.notes) {
          try {
            const notesData = typeof task.notes === 'string' ? JSON.parse(task.notes) : task.notes;
            if (notesData.history && Array.isArray(notesData.history)) {
              historyHtml = '<div class="timeline">';
              notesData.history.forEach((entry, index) => {
                historyHtml += `
                  <div class="timeline-entry mb-3 p-3 border-start border-primary border-3">
                    <div class="d-flex justify-content-between">
                      <span class="fw-bold">${entry.user || 'Utilisateur'}</span>
                      <span class="text-muted">${new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="mt-2">${entry.details || entry.action || 'Action'}</div>
                  </div>
                `;
              });
              historyHtml += '</div>';
            }
          } catch (e) {
            historyHtml = '<div class="alert alert-warning">Erreur lecture historique: ' + e.message + '</div>';
          }
        } else {
          historyHtml = '<div class="alert alert-info">Aucun historique disponible pour cette tâche.</div>';
        }
        
        modalBody.innerHTML = historyHtml;
        
      } catch (e) {
        modalBody.innerHTML = '<div class="alert alert-danger">Erreur génération historique: ' + e.message + '</div>';
      }
    }
    
    // Forcer l'ouverture Bootstrap
    try {
      console.log('🚀 PATCH: Ouverture modale Bootstrap...');
      
      // Nettoyer les backdrops existants
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
      document.body.classList.remove('modal-open');
      
      // Créer nouvelle instance et ouvrir
      const modal = new bootstrap.Modal(historyModalEl, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
      
      modal.show();
      console.log('✅ PATCH: Modale ouverte avec succès');
      
    } catch (error) {
      console.error('❌ PATCH: Erreur ouverture Bootstrap:', error);
    }
  };
  
  console.log('✅ PATCH: HistoryManager.openTaskHistory remplacé');
}

// Appliquer le patch automatiquement
function applyEmergencyPatch() {
  // Attendre que kanbanManager soit disponible
  let attempts = 0;
  const maxAttempts = 20;
  
  const checkAndPatch = () => {
    attempts++;
    
    if (window.kanbanManager && window.kanbanManager.historyManager) {
      console.log('✅ KanbanManager détecté, application du patch...');
      patchHistoryManager();
      return;
    }
    
    if (attempts < maxAttempts) {
      console.log(`⏳ Attente kanbanManager (${attempts}/${maxAttempts})...`);
      setTimeout(checkAndPatch, 1000);
    } else {
      console.log('❌ Timeout: KanbanManager non disponible après 20s');
    }
  };
  
  checkAndPatch();
}

// Fonction manuelle si l'auto ne marche pas
function manualPatch() {
  patchHistoryManager();
}

// Export
window.applyEmergencyPatch = applyEmergencyPatch;
window.manualPatch = manualPatch;

// Application automatique
applyEmergencyPatch();

console.log('🔧 Correctif d\'urgence chargé');
console.log('   → applyEmergencyPatch() - application automatique');
console.log('   → manualPatch() - application manuelle si besoin');