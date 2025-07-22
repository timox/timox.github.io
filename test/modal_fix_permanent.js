// === SOLUTION PERMANENTE MODALES ===
console.log('🔧 === SOLUTION PERMANENTE MODALES ===');

// Assurer que les modales existent en permanence dans le DOM
function ensureModalsExist() {
  console.log('🛠️ Vérification et création des modales...');
  
  // 1. History Modal
  let historyModal = document.getElementById('history-modal');
  if (!historyModal) {
    console.log('➕ Création history-modal...');
    const historyHTML = `
      <div class="modal fade history-modal" id="history-modal" tabindex="-1" aria-labelledby="history-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="history-modal-label">
                <i class="bi bi-clock-history me-2"></i>Historique de la tâche
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div class="modal-body">
              <div id="history-stats" class="history-stats"></div>
              <div id="history-timeline" class="history-timeline"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-info" id="btn-show-comments-only">
                <i class="bi bi-chat-square-text me-2"></i>Voir tous les commentaires
              </button>
              <button type="button" class="btn btn-success" id="btn-export-task-history">
                <i class="bi bi-download me-2"></i>Exporter cette tâche
              </button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', historyHTML);
    historyModal = document.getElementById('history-modal');
    console.log('✅ history-modal créée');
  } else {
    console.log('✅ history-modal déjà présente');
  }
  
  // 2. Strategy Modal
  let strategyModal = document.getElementById('strategy-mini-modal');
  if (!strategyModal) {
    console.log('➕ Création strategy-mini-modal...');
    const strategyHTML = `
      <div class="modal fade" id="strategy-mini-modal" tabindex="-1" aria-labelledby="strategy-mini-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header py-2" style="background: linear-gradient(135deg, #0d6efd, #0056b3); color: white; border-bottom: none;">
              <h6 class="modal-title" id="strategy-mini-modal-label" style="font-size: 0.95rem; font-weight: 600;">
                <i class="bi bi-bullseye me-2"></i>Stratégies
              </h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer" style="filter: invert(1);"></button>
            </div>
            <div class="modal-body p-3">
              <div id="strategy-mini-content">
                <!-- Contenu généré dynamiquement -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', strategyHTML);
    strategyModal = document.getElementById('strategy-mini-modal');
    console.log('✅ strategy-mini-modal créée');
  } else {
    console.log('✅ strategy-mini-modal déjà présente');
  }
  
  // 3. Réinitialiser les références dans kanbanManager
  if (window.kanbanManager) {
    console.log('🔄 Mise à jour des références kanbanManager...');
    window.kanbanManager.historyModalElement = historyModal;
    if (historyModal && typeof bootstrap !== 'undefined') {
      try {
        window.kanbanManager.historyModal = new bootstrap.Modal(historyModal, { 
          backdrop: true, 
          keyboard: true 
        });
        console.log('✅ Bootstrap Modal history initialisée');
      } catch (e) {
        console.log('⚠️ Erreur init Bootstrap history:', e.message);
      }
    }
  }
  
  return { historyModal, strategyModal };
}

// Protection permanente - recréer les modales si elles disparaissent
function protectModals() {
  console.log('🛡️ Protection permanente activée...');
  
  // Vérification toutes les 3 secondes
  setInterval(() => {
    const historyExists = document.getElementById('history-modal');
    const strategyExists = document.getElementById('strategy-mini-modal');
    
    if (!historyExists || !strategyExists) {
      console.log('🚨 Modales manquantes détectées - Restauration...');
      ensureModalsExist();
    }
  }, 3000);
  
  // Observer les mutations pour détecter les suppressions
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.id && 
              (node.id === 'history-modal' || node.id === 'strategy-mini-modal')) {
            console.log('🚨 Modal supprimée détectée:', node.id);
            setTimeout(() => ensureModalsExist(), 100);
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Protection active');
}

// Patch pour intercepter et corriger les appels modales
function patchModalCalls() {
  console.log('🔧 Patch des appels modales...');
  
  // Si kanbanManager existe, patcher ses méthodes
  if (window.kanbanManager) {
    const original_openTaskHistory = window.kanbanManager.openTaskHistory;
    if (original_openTaskHistory) {
      window.kanbanManager.openTaskHistory = function(task) {
        console.log('🔧 Patch openTaskHistory pour tâche:', task?.id);
        
        // S'assurer que la modal existe
        ensureModalsExist();
        
        // Attendre un peu puis appeler l'original
        setTimeout(() => {
          try {
            original_openTaskHistory.call(this, task);
          } catch (e) {
            console.log('⚠️ Erreur openTaskHistory:', e.message);
            
            // Méthode de fallback
            const modal = document.getElementById('history-modal');
            if (modal && typeof bootstrap !== 'undefined') {
              const bsModal = new bootstrap.Modal(modal);
              
              // Remplir le contenu basique
              const title = modal.querySelector('#history-modal-label');
              if (title) {
                title.innerHTML = `<i class="bi bi-clock-history me-2"></i>Historique - ${task?.titre || 'Tâche'}`;
              }
              
              const body = modal.querySelector('.modal-body');
              if (body) {
                body.innerHTML = `
                  <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Historique de la tâche <strong>${task?.titre || 'Sans titre'}</strong>
                  </div>
                  <p>Contenu de l'historique en cours de chargement...</p>
                `;
              }
              
              bsModal.show();
              console.log('✅ Modal history ouverte en fallback');
            }
          }
        }, 100);
      };
    }
  }
}

// Exécution
ensureModalsExist();
protectModals();
patchModalCalls();

// Export global
window.ensureModalsExist = ensureModalsExist;
window.protectModals = protectModals;

console.log('🎉 SOLUTION PERMANENTE ACTIVE !');
console.log('📋 Les modales sont maintenant protégées et auto-recréées');
console.log('🔧 Fonction: ensureModalsExist() pour forcer la recréation');