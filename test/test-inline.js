/**
 * 🧪 TEST INLINE - À COLLER DIRECTEMENT DANS LA CONSOLE
 * 
 * Version inline du test de connexion Grist
 * Pas besoin de charger de fichier externe
 */

// Configuration de test
const TEST_CONFIG = {
  DOC_ID: "DOC_ID_SUPPRIME",
  TABLES: ["Ssir_principale_task", "Ssir_strategie2"]
};

// Test de connexion Grist
async function testGristInline() {
  console.log('🧪 Test connexion Grist - Version Inline');
  console.log('📋 Document ID:', TEST_CONFIG.DOC_ID);
  
  try {
    // 1. Vérifier Grist disponible
    if (typeof grist === 'undefined') {
      throw new Error('❌ Grist API non disponible - Êtes-vous dans le bon document ?');
    }
    console.log('✅ Grist API disponible');
    
    // 2. Vérifier docApi
    if (!grist.docApi) {
      throw new Error('❌ DocAPI non disponible');
    }
    console.log('✅ DocAPI disponible');
    
    // 3. Lister les tables
    console.log('📊 Récupération des tables...');
    const tables = await grist.docApi.listTables();
    console.log('📋 Tables trouvées:', tables);
    
    // 4. Vérifier tables attendues
    const missingTables = TEST_CONFIG.TABLES.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      console.warn('⚠️ Tables manquantes:', missingTables);
    } else {
      console.log('✅ Toutes les tables requises sont présentes');
    }
    
    // 5. Test lecture tâches
    try {
      const tasks = await grist.docApi.fetchTable('Ssir_principale_task');
      console.log(`📝 ${tasks.length} tâches trouvées`);
      
      if (tasks.length > 0) {
        console.log('Exemple tâche:', {
          id: tasks[0].id,
          titre: tasks[0].titre,
          statut: tasks[0].statut,
          bureau: tasks[0].bureau
        });
      }
    } catch (e) {
      console.warn('⚠️ Erreur lecture tâches:', e.message);
    }
    
    // 6. Test interface Kanban
    const interfaceOK = {
      kanbanManager: typeof window.kanbanManager !== 'undefined',
      kanbanContainer: !!document.getElementById('kanban-container'),
      btnNouvelle: !!document.getElementById('btn-nouvelle-tache'),
      currentRecords: window.kanbanManager?.currentRecords?.length || 0
    };
    
    console.log('🎯 Interface Kanban:', interfaceOK);
    
    // 7. Résumé
    console.log('\n📊 RÉSUMÉ DU TEST');
    console.log('==================');
    console.log('✅ Connexion Grist : OK');
    console.log('✅ Tables disponibles :', tables.length);
    console.log('✅ Tâches chargées :', window.kanbanManager?.currentRecords?.length || 'Non chargées');
    console.log('✅ Interface prête :', interfaceOK.kanbanManager ? 'OUI' : 'NON');
    
    return { success: true, tables, interfaceOK };
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    return { success: false, error: error.message };
  }
}

// Test ultra-rapide
function quickCheck() {
  const state = {
    grist: typeof grist !== 'undefined',
    docApi: typeof grist?.docApi !== 'undefined',
    kanban: typeof window.kanbanManager !== 'undefined',
    tasks: window.kanbanManager?.currentRecords?.length || 0,
    dom: !!document.getElementById('kanban-container')
  };
  
  console.log('⚡ État rapide:', state);
  
  const allOK = state.grist && state.docApi && state.kanban && state.dom;
  console.log(allOK ? '✅ Système prêt' : '❌ Problèmes détectés');
  
  return state;
}

// Lancer immédiatement le test rapide
console.log('🚀 Test inline chargé - Lancement du diagnostic...\n');
quickCheck();

console.log('\n📋 Commandes disponibles:');
console.log('  testGristInline() - Test complet de connexion');
console.log('  quickCheck()      - Vérification rapide (5 sec)');

// Exposer globalement
window.testGristInline = testGristInline;
window.quickCheck = quickCheck;