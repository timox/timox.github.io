/**
 * 🚨 TEST RAPIDE DE STABILITÉ - FOCUS MODALES
 * 
 * Test minimal pour vérifier la stabilité actuelle
 * Coller directement dans la console sur /test/
 */

async function quickStabilityTest() {
  console.log('🚨 Test de stabilité - Focus sur les problèmes connus');
  
  const results = [];
  
  // TEST 1: Vérifier qu'il n'y a qu'une seule modal principale
  try {
    const modals = document.querySelectorAll('.modal');
    const result1 = {
      test: 'Nombre de modales',
      count: modals.length,
      success: modals.length <= 2, // Tolérer 1-2 modales max
      details: Array.from(modals).map(m => m.id || m.className)
    };
    results.push(result1);
    console.log(result1.success ? '✅' : '❌', 'Modales:', result1);
  } catch (e) {
    results.push({ test: 'Nombre de modales', success: false, error: e.message });
  }
  
  // TEST 2: Vérifier absence de modales ouvertes au démarrage
  try {
    const openModals = document.querySelectorAll('.modal.show');
    const result2 = {
      test: 'Modales ouvertes au démarrage',
      count: openModals.length,
      success: openModals.length === 0,
      details: Array.from(openModals).map(m => m.id)
    };
    results.push(result2);
    console.log(result2.success ? '✅' : '❌', 'Modales ouvertes:', result2);
  } catch (e) {
    results.push({ test: 'Modales ouvertes', success: false, error: e.message });
  }
  
  // TEST 3: Test ouverture/fermeture modal simple
  try {
    const btnNouvelle = document.getElementById('btn-nouvelle-tache');
    if (!btnNouvelle) throw new Error('Bouton nouvelle tâche introuvable');
    
    // Ouvrir
    btnNouvelle.click();
    await new Promise(r => setTimeout(r, 300));
    
    const modalOuverte = document.querySelector('.modal.show');
    const ouvertureOK = !!modalOuverte;
    
    // Fermer avec Échap
    if (modalOuverte) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await new Promise(r => setTimeout(r, 300));
    }
    
    const modalFermee = !document.querySelector('.modal.show');
    
    const result3 = {
      test: 'Ouverture/Fermeture modal',
      ouverture: ouvertureOK,
      fermeture: modalFermee,
      success: ouvertureOK && modalFermee
    };
    results.push(result3);
    console.log(result3.success ? '✅' : '❌', 'Modal cycle:', result3);
  } catch (e) {
    results.push({ test: 'Modal cycle', success: false, error: e.message });
  }
  
  // TEST 4: Vérifier gestionnaires d'événements non dupliqués
  try {
    const btnNouvelle = document.getElementById('btn-nouvelle-tache');
    let clickCount = 0;
    
    // Compter les clics effectifs
    const originalClick = btnNouvelle.onclick;
    btnNouvelle.onclick = () => {
      clickCount++;
      if (originalClick) originalClick();
    };
    
    btnNouvelle.click();
    await new Promise(r => setTimeout(r, 100));
    
    const result4 = {
      test: 'Événements dupliqués',
      clickCount,
      success: clickCount <= 1,
      warning: clickCount > 1 ? 'Possible duplication gestionnaires' : null
    };
    results.push(result4);
    console.log(result4.success ? '✅' : '❌', 'Gestionnaires:', result4);
    
    // Restaurer
    btnNouvelle.onclick = originalClick;
  } catch (e) {
    results.push({ test: 'Gestionnaires événements', success: false, error: e.message });
  }
  
  // TEST 5: Vérifier état initial des managers
  try {
    const managersState = {
      kanbanManager: typeof window.kanbanManager !== 'undefined',
      modalManager: window.kanbanManager?.modalManager !== undefined,
      filterManager: window.kanbanManager?.filterManager !== undefined,
      viewModeManager: window.kanbanManager?.viewModeManager !== undefined
    };
    
    const allManagersOK = Object.values(managersState).every(state => state);
    
    const result5 = {
      test: 'État des managers',
      managers: managersState,
      success: allManagersOK
    };
    results.push(result5);
    console.log(result5.success ? '✅' : '❌', 'Managers:', result5);
  } catch (e) {
    results.push({ test: 'État managers', success: false, error: e.message });
  }
  
  // RAPPORT FINAL
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('\n📊 RAPPORT DE STABILITÉ');
  console.log('========================');
  console.log(`✅ Tests réussis: ${successful}/${total}`);
  console.log(`❌ Tests échoués: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 STABILITÉ OK - Système fonctionnel');
  } else {
    console.log('\n⚠️ PROBLÈMES DÉTECTÉS - Vérifier les erreurs ci-dessus');
    console.log('\nÉchecs détaillés:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`❌ ${r.test}: ${r.error || 'Voir détails ci-dessus'}`);
    });
  }
  
  return { successful, total, results };
}

// TEST ULTRA-RAPIDE (10 secondes)
async function ultraQuickTest() {
  console.log('⚡ Test ultra-rapide - 10 secondes');
  
  try {
    // Juste vérifier que les éléments de base existent
    const essential = {
      kanbanContainer: !!document.getElementById('kanban-container'),
      btnNouvelle: !!document.getElementById('btn-nouvelle-tache'),
      cards: document.querySelectorAll('.kanban-card').length,
      modalsOpen: document.querySelectorAll('.modal.show').length
    };
    
    console.log('📋 État essentiel:', essential);
    
    const isStable = essential.kanbanContainer && 
                    essential.btnNouvelle && 
                    essential.modalsOpen === 0;
    
    console.log(isStable ? '✅ STABLE' : '❌ INSTABLE');
    return isStable;
    
  } catch (e) {
    console.log('❌ ERREUR:', e.message);
    return false;
  }
}

// Exposer globalement
window.quickStabilityTest = quickStabilityTest;
window.ultraQuickTest = ultraQuickTest;

console.log('🚨 Tests de stabilité chargés');
console.log('📋 Commandes:');
console.log('  - ultraQuickTest()     : Test 10 secondes');
console.log('  - quickStabilityTest() : Test complet stabilité');