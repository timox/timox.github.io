// === CORRECTIF FINAL TIMELINE ===
console.log('🔧 === CORRECTIF TIMELINE FINAL ===');

function fixTimelineIssue() {
  console.log('🎯 Diagnostic du problème timeline...');
  
  // 1. Vérifier SimpleClickHandler
  const handler = window.kanbanManager?.simpleClickHandler;
  if (!handler) {
    console.log('❌ SimpleClickHandler introuvable');
    return;
  }
  
  console.log('✅ SimpleClickHandler trouvé');
  
  // 2. Vérifier openTimeline
  if (typeof handler.openTimeline !== 'function') {
    console.log('❌ openTimeline n\'est pas une fonction');
    return;
  }
  
  console.log('✅ openTimeline est une fonction');
  
  // 3. Test direct de openTimeline
  console.log('🧪 Test direct openTimeline(10)...');
  try {
    handler.openTimeline(10);
    console.log('✅ openTimeline appelé sans erreur');
  } catch (error) {
    console.log('❌ Erreur dans openTimeline:', error.message);
    console.log('❌ Stack:', error.stack);
  }
  
  // 4. Vérifier HistoryManager
  const historyManager = window.kanbanManager?.historyManager;
  console.log('✅ HistoryManager exists:', !!historyManager);
  
  if (historyManager) {
    console.log('✅ openTaskHistory exists:', typeof historyManager.openTaskHistory === 'function');
    
    // Test direct HistoryManager
    console.log('🧪 Test direct HistoryManager.openTaskHistory(10)...');
    try {
      historyManager.openTaskHistory(10);
      console.log('✅ HistoryManager.openTaskHistory appelé');
    } catch (error) {
      console.log('❌ Erreur HistoryManager:', error.message);
      console.log('❌ Stack:', error.stack);
    }
  }
}

function forceTimelineWorking() {
  console.log('🔧 Force Timeline Working...');
  
  const handler = window.kanbanManager?.simpleClickHandler;
  if (!handler) {
    console.log('❌ Pas de SimpleClickHandler pour patcher');
    return;
  }
  
  // Sauvegarder original
  if (!handler._originalOpenTimeline) {
    handler._originalOpenTimeline = handler.openTimeline;
  }
  
  // Remplacer par version qui marche
  handler.openTimeline = function(taskId) {
    console.log('🚀 FORCED openTimeline pour taskId:', taskId);
    
    const task = this.kanban.currentRecords?.find(r => r.id === taskId);
    if (!task) {
      console.error('❌ Task non trouvée:', taskId);
      return;
    }
    
    console.log('✅ Task trouvée:', task.titre);
    
    // Ouvrir directement la modale d'historique
    const modal = document.getElementById('history-modal');
    if (!modal) {
      console.error('❌ history-modal element non trouvé');
      return;
    }
    
    // Nettoyer
    document.querySelectorAll('.modal-backdrop').forEach(b => {
      console.log('🧹 Suppression backdrop');
      b.remove();
    });
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    
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
      let content = '<div class="alert alert-info">📖 Chargement historique...</div>';
      
      try {
        if (task.notes) {
          const notes = typeof task.notes === 'string' ? JSON.parse(task.notes) : task.notes;
          if (notes.history && Array.isArray(notes.history)) {
            content = '<div class="timeline">';
            notes.history.forEach((entry, index) => {
              const date = new Date(entry.timestamp).toLocaleString('fr-FR');
              content += `
                <div class="timeline-entry mb-3 p-3 border-start border-primary border-3">
                  <div class="d-flex justify-content-between">
                    <strong>${entry.user || 'Utilisateur'}</strong>
                    <small class="text-muted">${date}</small>
                  </div>
                  <div class="mt-2">${entry.details || entry.action || 'Action'}</div>
                </div>
              `;
            });
            content += '</div>';
          } else {
            content = '<div class="alert alert-warning">Format d\'historique non reconnu</div>';
          }
        } else {
          content = '<div class="alert alert-info">Aucun historique disponible</div>';
        }
      } catch (e) {
        content = '<div class="alert alert-danger">Erreur lecture historique: ' + e.message + '</div>';
      }
      
      body.innerHTML = content;
    }
    
    // Ouvrir avec Bootstrap
    try {
      console.log('🚀 Ouverture Bootstrap Modal...');
      const bsModal = new bootstrap.Modal(modal, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
      
      bsModal.show();
      console.log('✅ Timeline modale ouverte !');
      
      // Vérifier après 500ms
      setTimeout(() => {
        const isShown = modal.classList.contains('show');
        console.log('📊 État modale après 500ms:', {
          display: window.getComputedStyle(modal).display,
          isShown: isShown
        });
        
        if (!isShown) {
          console.log('⚠️ Modale pas visible, forçage CSS...');
          modal.style.display = 'block';
          modal.style.zIndex = '9999';
          modal.classList.add('show');
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur Bootstrap Modal:', error.message);
      
      // Fallback CSS direct
      console.log('🔧 Fallback CSS direct...');
      modal.style.display = 'block';
      modal.style.zIndex = '9999';
      modal.classList.add('show', 'modal');
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      
      // Backdrop manuel
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      backdrop.style.zIndex = '9998';
      document.body.appendChild(backdrop);
      document.body.classList.add('modal-open');
      
      console.log('✅ Fallback CSS appliqué');
    }
  };
  
  console.log('✅ openTimeline remplacé par version forcée');
}

// Auto-application
function autoFix() {
  let attempts = 0;
  const maxAttempts = 10;
  
  const check = () => {
    attempts++;
    
    if (window.kanbanManager?.simpleClickHandler) {
      console.log('✅ SimpleClickHandler détecté, application du fix...');
      forceTimelineWorking();
      return;
    }
    
    if (attempts < maxAttempts) {
      console.log(`⏳ Attente SimpleClickHandler (${attempts}/${maxAttempts})...`);
      setTimeout(check, 1000);
    } else {
      console.log('❌ Timeout SimpleClickHandler');
    }
  };
  
  check();
}

// Export fonctions
window.fixTimelineIssue = fixTimelineIssue;
window.forceTimelineWorking = forceTimelineWorking;
window.autoFix = autoFix;

// Application automatique
autoFix();

console.log('🔧 Correctif timeline chargé');
console.log('   → fixTimelineIssue() - diagnostic');
console.log('   → forceTimelineWorking() - correctif forcé');
console.log('   → Correctif appliqué automatiquement');