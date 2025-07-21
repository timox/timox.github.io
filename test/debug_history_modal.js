// === DIAGNOSTIC SPÉCIALISÉ MODALE HISTORIQUE ===
console.log('🔍 === DIAGNOSTIC MODALE HISTORIQUE ===');

function diagnoseHistoryModal() {
  console.log('\n🎯 1. VÉRIFICATION ÉLÉMENT DOM');
  
  const historyModalEl = document.getElementById('history-modal');
  console.log('   → historyModal element exists:', !!historyModalEl);
  
  if (historyModalEl) {
    const style = window.getComputedStyle(historyModalEl);
    console.log('   → display:', style.display);
    console.log('   → visibility:', style.visibility);
    console.log('   → opacity:', style.opacity);
    console.log('   → z-index:', style.zIndex);
    console.log('   → classes:', historyModalEl.className);
  }
  
  console.log('\n🎯 2. VÉRIFICATION MODALMANAGER');
  
  const kanban = window.kanbanManager;
  console.log('   → kanbanManager exists:', !!kanban);
  
  if (kanban) {
    console.log('   → modalManager exists:', !!kanban.modalManager);
    
    if (kanban.modalManager) {
      console.log('   → historyModal instance exists:', !!kanban.modalManager.historyModal);
      
      if (kanban.modalManager.historyModal) {
        const modal = kanban.modalManager.historyModal;
        console.log('   → historyModal type:', typeof modal);
        console.log('   → historyModal constructor:', modal.constructor.name);
        console.log('   → historyModal _element exists:', !!modal._element);
        console.log('   → historyModal _isShown:', modal._isShown);
      }
    }
  }
  
  console.log('\n🎯 3. BOOTSTRAP MODAL GLOBAL');
  
  console.log('   → Bootstrap available:', typeof bootstrap !== 'undefined');
  console.log('   → Bootstrap Modal available:', typeof bootstrap?.Modal !== 'undefined');
  
  // Test création modale directe
  if (historyModalEl && typeof bootstrap !== 'undefined') {
    try {
      const testModal = bootstrap.Modal.getOrCreateInstance(historyModalEl);
      console.log('   → Bootstrap instance created:', !!testModal);
      console.log('   → Instance type:', testModal.constructor.name);
    } catch (error) {
      console.log('   → Bootstrap instance error:', error.message);
    }
  }
}

function testHistoryModalDirect() {
  console.log('\n🧪 === TEST OUVERTURE DIRECTE ===');
  
  const historyModalEl = document.getElementById('history-modal');
  if (!historyModalEl) {
    console.log('❌ Élément history-modal introuvable');
    return;
  }
  
  try {
    console.log('🔧 Création instance Bootstrap directe...');
    
    // Nettoyer d'abord
    const existingBackdrops = document.querySelectorAll('.modal-backdrop');
    console.log(`   → Suppression ${existingBackdrops.length} backdrops`);
    existingBackdrops.forEach(b => b.remove());
    
    // Forcer le contenu de test
    const modalBody = historyModalEl.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = '<h4>🧪 TEST MODALE HISTORIQUE</h4><p>Si vous voyez ceci, la modale fonctionne !</p>';
    }
    
    // Créer et ouvrir
    const modal = new bootstrap.Modal(historyModalEl, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    
    console.log('🚀 Ouverture modale...');
    modal.show();
    
    // Vérifier après 500ms
    setTimeout(() => {
      const style = window.getComputedStyle(historyModalEl);
      console.log('📊 État après ouverture:');
      console.log('   → display:', style.display);
      console.log('   → classes:', historyModalEl.className);
      console.log('   → is shown:', historyModalEl.classList.contains('show'));
    }, 500);
    
  } catch (error) {
    console.log('❌ Erreur test direct:', error.message);
    console.log('❌ Stack:', error.stack);
  }
}

function testHistoryManagerPath() {
  console.log('\n🧪 === TEST CHEMIN HISTORYMANAGER ===');
  
  const kanban = window.kanbanManager;
  if (!kanban || !kanban.historyManager) {
    console.log('❌ HistoryManager non disponible');
    return;
  }
  
  // Simuler exactement ce que fait le code
  try {
    console.log('🔧 Simulation openTaskHistory...');
    
    const taskId = 102; // ID de test
    const task = kanban.currentRecords?.find(r => r.id === taskId);
    
    if (!task) {
      console.log('❌ Task 102 non trouvée');
      return;
    }
    
    console.log('✅ Task trouvée:', task.titre);
    
    // Simuler le chemin exact
    console.log('🎯 Test condition modalManager...');
    console.log('   → kanban.modalManager exists:', !!kanban.modalManager);
    console.log('   → historyModal exists:', !!(kanban.modalManager && kanban.modalManager.historyModal));
    
    if (kanban.modalManager && kanban.modalManager.historyModal) {
      console.log('✅ Conditions OK, tentative show()...');
      
      // Tester show() directement
      kanban.modalManager.historyModal.show();
      console.log('✅ show() appelé sans erreur');
    }
    
  } catch (error) {
    console.log('❌ Erreur simulation:', error.message);
    console.log('❌ Stack:', error.stack);
  }
}

// Export des fonctions
window.diagnoseHistoryModal = diagnoseHistoryModal;
window.testHistoryModalDirect = testHistoryModalDirect;
window.testHistoryManagerPath = testHistoryManagerPath;

console.log('🔧 Fonctions disponibles:');
console.log('   → diagnoseHistoryModal() - diagnostic complet');
console.log('   → testHistoryModalDirect() - test Bootstrap direct');
console.log('   → testHistoryManagerPath() - test chemin HistoryManager');