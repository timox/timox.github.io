// === CORRECTIF IMMÉDIAT MODALES MANQUANTES ===
console.log('🚨 === CORRECTIF MODALES MANQUANTES ===');

function checkAndRestoreModals() {
  console.log('🔍 Vérification des modales...');
  
  const requiredModals = [
    {
      id: 'history-modal',
      name: 'Historique',
      html: `
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
      `
    },
    {
      id: 'strategy-mini-modal',
      name: 'Stratégies',
      html: `
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
      `
    }
  ];
  
  let restored = 0;
  
  requiredModals.forEach(modalConfig => {
    const existing = document.getElementById(modalConfig.id);
    
    if (!existing) {
      console.log(`❌ ${modalConfig.name} (${modalConfig.id}) manquante - RESTAURATION...`);
      
      // Créer l'élément
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = modalConfig.html.trim();
      const modalElement = tempDiv.firstChild;
      
      // L'ajouter au body
      document.body.appendChild(modalElement);
      
      console.log(`✅ ${modalConfig.name} restaurée avec succès`);
      restored++;
      
      // Vérifier que ça a marché
      const verification = document.getElementById(modalConfig.id);
      if (verification) {
        console.log(`✅ Vérification: ${modalConfig.id} est maintenant présente dans le DOM`);
      } else {
        console.log(`❌ ÉCHEC: ${modalConfig.id} n'a pas pu être restaurée`);
      }
      
    } else {
      console.log(`✅ ${modalConfig.name} (${modalConfig.id}) déjà présente`);
    }
  });
  
  console.log(`\n📊 Résultat: ${restored} modale(s) restaurée(s)`);
  
  // Test d'ouverture
  setTimeout(() => {
    testModalOpening();
  }, 500);
}

function testModalOpening() {
  console.log('\n🧪 TEST D\'OUVERTURE DES MODALES...');
  
  const historyModal = document.getElementById('history-modal');
  if (historyModal && typeof bootstrap !== 'undefined') {
    try {
      console.log('🔧 Test history-modal...');
      const bsModal = new bootstrap.Modal(historyModal);
      
      // Test show/hide rapide
      bsModal.show();
      console.log('✅ history-modal.show() - OK');
      
      setTimeout(() => {
        bsModal.hide();
        console.log('✅ history-modal.hide() - OK');
        console.log('🎉 history-modal fonctionne parfaitement !');
      }, 1000);
      
    } catch (error) {
      console.log('❌ Erreur test history-modal:', error.message);
    }
  } else {
    console.log('❌ history-modal ou Bootstrap non disponible');
  }
}

function forceModalReinitialization() {
  console.log('\n🔄 RÉINITIALISATION FORCÉE...');
  
  // Supprimer les modales existantes qui pourraient être corrompues
  ['history-modal', 'strategy-mini-modal'].forEach(modalId => {
    const existing = document.getElementById(modalId);
    if (existing) {
      console.log(`🗑️ Suppression ${modalId} existante`);
      existing.remove();
    }
  });
  
  // Attendre un peu puis recréer
  setTimeout(() => {
    checkAndRestoreModals();
  }, 100);
}

// Exécution immédiate
checkAndRestoreModals();

// Export des fonctions
window.checkAndRestoreModals = checkAndRestoreModals;
window.forceModalReinitialization = forceModalReinitialization;
window.testModalOpening = testModalOpening;

console.log('\n🔧 Fonctions disponibles:');
console.log('   → checkAndRestoreModals() - Vérifier et restaurer');
console.log('   → forceModalReinitialization() - Forcer réinitialisation');
console.log('   → testModalOpening() - Test ouverture');

// Protection continue - vérifier toutes les 5 secondes
setInterval(() => {
  const historyExists = document.getElementById('history-modal');
  const strategyExists = document.getElementById('strategy-mini-modal');
  
  if (!historyExists || !strategyExists) {
    console.log('🚨 MODALES MANQUANTES DÉTECTÉES - AUTO-RESTAURATION...');
    checkAndRestoreModals();
  }
}, 5000);