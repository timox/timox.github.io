// === TEST SIMPLE PRESENCE MODALES ===
console.log('🔍 === TEST SIMPLE MODALES ===');

function checkModalsNow() {
  console.log('\n🧪 VÉRIFICATION MODALES:');
  
  const historyModal = document.getElementById('history-modal');
  const strategyModal = document.getElementById('strategy-mini-modal');
  const taskModal = document.getElementById('popup-tache');
  
  const results = {
    timestamp: new Date().toLocaleTimeString(),
    history: historyModal !== null,
    strategy: strategyModal !== null,
    task: taskModal !== null
  };
  
  console.log('📊 Résultats:', results);
  
  if (historyModal) {
    console.log('✅ history-modal: PRÉSENTE');
    console.log('   → Classes:', historyModal.className);
    console.log('   → Display:', window.getComputedStyle(historyModal).display);
    console.log('   → Parent:', historyModal.parentNode?.tagName);
  } else {
    console.log('❌ history-modal: ABSENTE');
  }
  
  if (strategyModal) {
    console.log('✅ strategy-mini-modal: PRÉSENTE');
    console.log('   → Classes:', strategyModal.className);
    console.log('   → Display:', window.getComputedStyle(strategyModal).display);
    console.log('   → Parent:', strategyModal.parentNode?.tagName);
  } else {
    console.log('❌ strategy-mini-modal: ABSENTE');
  }
  
  if (taskModal) {
    console.log('✅ popup-tache: PRÉSENTE');
  } else {
    console.log('❌ popup-tache: ABSENTE');
  }
  
  // Test ouverture si modales présentes
  if (historyModal && strategyModal) {
    console.log('🎉 TOUTES LES MODALES SONT PRÉSENTES !');
  } else {
    console.log('🚨 MODALES MANQUANTES - PROBLÈME CONFIRMÉ');
    
    // Chercher dans tout le DOM
    const allModals = document.querySelectorAll('.modal');
    console.log('📋 Toutes les modales trouvées:', allModals.length);
    allModals.forEach((modal, index) => {
      console.log(`   ${index + 1}. ${modal.id || 'Sans ID'} (${modal.className})`);
    });
  }
  
  return results;
}

function watchModalChanges() {
  console.log('👁️ SURVEILLANCE DES CHANGEMENTS...');
  
  let lastState = checkModalsNow();
  
  const observer = new MutationObserver((mutations) => {
    let modalChanged = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.id && node.id.includes('modal')) {
            console.log('🚨 MODAL SUPPRIMÉE:', node.id);
            modalChanged = true;
          }
        });
        
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.id && node.id.includes('modal')) {
            console.log('✨ MODAL AJOUTÉE:', node.id);
            modalChanged = true;
          }
        });
      }
    });
    
    if (modalChanged) {
      console.log('🔄 CHANGEMENT DÉTECTÉ - NOUVELLE VÉRIFICATION:');
      const newState = checkModalsNow();
      
      if (JSON.stringify(lastState) !== JSON.stringify(newState)) {
        console.log('📊 ÉTAT CHANGÉ:', { ancien: lastState, nouveau: newState });
        lastState = newState;
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Surveillance active');
  return observer;
}

function testModalOpenability() {
  console.log('\n🧪 TEST OUVERTURE MODALES...');
  
  const historyModal = document.getElementById('history-modal');
  if (historyModal && typeof bootstrap !== 'undefined') {
    try {
      const bsModal = new bootstrap.Modal(historyModal);
      console.log('✅ history-modal: Bootstrap Modal créé avec succès');
      
      // Test rapide show/hide
      bsModal.show();
      console.log('✅ history-modal: show() exécuté');
      
      setTimeout(() => {
        bsModal.hide();
        console.log('✅ history-modal: hide() exécuté');
      }, 1000);
      
    } catch (error) {
      console.log('❌ history-modal: Erreur Bootstrap:', error.message);
    }
  } else {
    console.log('❌ history-modal: Indisponible pour test');
  }
}

// Exécution immédiate
const initialCheck = checkModalsNow();

// Export des fonctions
window.checkModalsNow = checkModalsNow;
window.watchModalChanges = watchModalChanges;
window.testModalOpenability = testModalOpenability;

console.log('\n🔧 Fonctions disponibles:');
console.log('   → checkModalsNow() - Vérifier maintenant');
console.log('   → watchModalChanges() - Surveiller changements');
console.log('   → testModalOpenability() - Tester ouverture');

// Auto-surveillance toutes les 5 secondes
setInterval(() => {
  const currentState = checkModalsNow();
  if (!window.lastModalState) {
    window.lastModalState = currentState;
  } else {
    if (JSON.stringify(window.lastModalState) !== JSON.stringify(currentState)) {
      console.log('🔄 CHANGEMENT AUTO-DÉTECTÉ:', { 
        ancien: window.lastModalState, 
        nouveau: currentState 
      });
      window.lastModalState = currentState;
    }
  }
}, 5000);