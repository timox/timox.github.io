// === DIAGNOSTIC MODALES - Test SimpleClickHandler ===
console.log('🔍 === DIAGNOSTIC MODALES 2025-07-21 ===');

function diagnosticModales() {
  console.log('\n🎯 1. ÉTAT DU SIMPLECLICKHANDLER');
  
  // Vérifier que SimpleClickHandler existe
  if (typeof SimpleClickHandler !== 'undefined') {
    console.log('✅ SimpleClickHandler est chargé');
  } else {
    console.log('❌ SimpleClickHandler non trouvé');
    return;
  }
  
  // Vérifier l'instance
  if (window.kanbanManager && window.kanbanManager.simpleClickHandler) {
    console.log('✅ Instance SimpleClickHandler trouvée');
    console.log('   → isProcessing:', window.kanbanManager.simpleClickHandler.isProcessing);
  } else {
    console.log('❌ Instance SimpleClickHandler manquante');
  }
  
  console.log('\n🎯 2. BOUTONS TIMELINE');
  
  // Chercher les boutons timeline
  const timelineButtons = document.querySelectorAll('.btn-timeline');
  console.log(`   → ${timelineButtons.length} boutons timeline trouvés`);
  
  timelineButtons.forEach((btn, index) => {
    console.log(`   → Bouton ${index + 1}:`, {
      id: btn.id,
      classes: btn.className,
      taskId: btn.dataset.taskId,
      visible: btn.offsetParent !== null
    });
  });
  
  console.log('\n🎯 3. BOUTONS NOUVELLE TÂCHE');
  
  // Bouton nouvelle tâche
  const newTaskBtn = document.getElementById('btn-nouvelle-tache');
  if (newTaskBtn) {
    console.log('✅ Bouton nouvelle tâche trouvé');
    console.log('   → Visible:', newTaskBtn.offsetParent !== null);
    console.log('   → Classes:', newTaskBtn.className);
  } else {
    console.log('❌ Bouton nouvelle tâche manquant');
  }
  
  console.log('\n🎯 4. MODALES BOOTSTRAP');
  
  // Modal principale
  const mainModal = document.getElementById('popup-tache');
  if (mainModal) {
    console.log('✅ Modale principale trouvée');
    console.log('   → Display:', window.getComputedStyle(mainModal).display);
    console.log('   → Bootstrap classes:', mainModal.classList.contains('modal'));
  } else {
    console.log('❌ Modale principale manquante');
  }
  
  console.log('\n🎯 5. BACKDROPS ORPHELINS');
  
  // Backdrops orphelins
  const backdrops = document.querySelectorAll('.modal-backdrop');
  console.log(`   → ${backdrops.length} backdrops trouvés`);
  
  backdrops.forEach((backdrop, index) => {
    console.log(`   → Backdrop ${index + 1}:`, {
      classes: backdrop.className,
      zIndex: window.getComputedStyle(backdrop).zIndex,
      display: window.getComputedStyle(backdrop).display
    });
  });
  
  console.log('\n🎯 6. ÉTAT BODY');
  
  // État du body
  console.log('   → Body classes:', document.body.className);
  console.log('   → Body overflow:', document.body.style.overflow);
  
  console.log('\n🎯 7. TEST CLICK SIMULATION');
  
  // Simuler un clic sur nouvelle tâche si elle existe
  if (newTaskBtn) {
    console.log('🧪 Test simulation clic nouvelle tâche...');
    
    // Écouter les logs du click handler
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog.apply(console, args);
    };
    
    // Simuler le clic
    newTaskBtn.click();
    
    // Restaurer console.log
    setTimeout(() => {
      console.log = originalLog;
      console.log('📊 Logs capturés:', logs.filter(log => log.includes('🎯') || log.includes('🆕')));
    }, 100);
  }
}

// Test ouverture modale directe
function testModaleDirect() {
  console.log('\n🧪 === TEST MODALE DIRECT ===');
  
  try {
    const modal = document.getElementById('popup-tache');
    if (modal) {
      console.log('🔧 Tentative ouverture modale Bootstrap...');
      
      // Nettoyer avant
      document.querySelectorAll('.modal-backdrop').forEach(b => {
        console.log('🧹 Suppression backdrop:', b.className);
        b.remove();
      });
      document.body.classList.remove('modal-open');
      
      // Créer instance Bootstrap
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      
      console.log('✅ Modale lancée - vérifier écran');
    } else {
      console.log('❌ Modale introuvable');
    }
  } catch (error) {
    console.log('❌ Erreur ouverture:', error.message);
  }
}

// Exporter les fonctions
window.diagnosticModales = diagnosticModales;
window.testModaleDirect = testModaleDirect;

console.log('🔧 Fonctions disponibles:');
console.log('   → diagnosticModales() - diagnostic complet');
console.log('   → testModaleDirect() - test ouverture forcée');