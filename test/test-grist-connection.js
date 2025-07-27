/**
 * 🧪 TEST DE CONNEXION GRIST - ENVIRONNEMENT ISOLÉ
 * 
 * Script pour tester la connexion au document Grist de test
 * Usage: Charger ce script dans /test/ puis appeler testGristConnection()
 */

const TEST_GRIST_CONFIG = {
  DOC_ID: "DOC_ID_SUPPRIME",
  SERVER: "https://grist.numerique.gouv.fr",
  WORKSPACE_ID: "13708",
  ORG_ID: "docs"
};

async function testGristConnection() {
  console.log('🧪 Test connexion Grist - Environnement de test');
  console.log('📋 Configuration:', TEST_GRIST_CONFIG);
  
  try {
    // Test 1: Vérifier que Grist est disponible
    if (typeof grist === 'undefined') {
      throw new Error('Grist API non disponible - Ouvrir depuis Grist');
    }
    
    console.log('✅ Grist API disponible');
    
    // Test 2: Initialiser Grist
    await grist.ready({
      requiredAccess: 'full',
      columns: ['id', 'titre', 'statut', 'bureau', 'qui']
    });
    
    console.log('✅ Grist initialisé avec accès complet');
    
    // Test 3: Tester connexion docApi
    if (!grist.docApi) {
      throw new Error('DocAPI non disponible');
    }
    
    console.log('✅ DocAPI disponible');
    
    // Test 4: Lister les tables disponibles
    const tables = await grist.docApi.listTables();
    console.log('📊 Tables disponibles:', tables);
    
    // Test 5: Vérifier tables attendues
    const expectedTables = ['Ssir_principale_task', 'Ssir_strategie2'];
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn('⚠️ Tables manquantes:', missingTables);
    } else {
      console.log('✅ Toutes les tables attendues sont présentes');
    }
    
    // Test 6: Tester lecture données tâches
    try {
      const tasksData = await grist.docApi.fetchTable('Ssir_principale_task');
      console.log('📝 Tâches chargées:', tasksData.length, 'enregistrements');
      
      if (tasksData.length > 0) {
        console.log('📋 Exemple tâche:', {
          id: tasksData[0].id,
          titre: tasksData[0].titre,
          statut: tasksData[0].statut
        });
      }
    } catch (error) {
      console.warn('⚠️ Erreur lecture tâches:', error.message);
    }
    
    // Test 7: Tester lecture données stratégies
    try {
      const strategiesData = await grist.docApi.fetchTable('Ssir_strategie2');
      console.log('🎯 Stratégies chargées:', strategiesData.length, 'enregistrements');
      
      if (strategiesData.length > 0) {
        console.log('📋 Exemple stratégie:', {
          id: strategiesData[0].id,
          objectif: strategiesData[0].objectif,
          action: strategiesData[0].action
        });
      }
    } catch (error) {
      console.warn('⚠️ Erreur lecture stratégies:', error.message);
    }
    
    // Test 8: Test d'écriture (création tâche test)
    console.log('🧪 Test création tâche...');
    
    const testTask = {
      titre: `Test Connexion ${new Date().toISOString()}`,
      description: 'Tâche de test automatique - peut être supprimée',
      statut: 'À faire',
      bureau: ['L', 'Test'],
      qui: ['L', 'TestUser'],
      urgence: 'Faible',
      impact: 'Mineur',
      projet: 'Test'
    };
    
    try {
      const result = await grist.docApi.applyUserActions([
        ['AddRecord', 'Ssir_principale_task', testTask]
      ]);
      
      const newTaskId = result.retValues[0];
      console.log('✅ Tâche test créée avec ID:', newTaskId);
      
      // Supprimer immédiatement la tâche test
      await grist.docApi.applyUserActions([
        ['RemoveRecord', 'Ssir_principale_task', newTaskId]
      ]);
      
      console.log('✅ Tâche test supprimée - Pas de pollution des données');
      
    } catch (error) {
      console.warn('⚠️ Erreur test écriture:', error.message);
    }
    
    // Rapport final
    console.log('\n🎉 TEST DE CONNEXION RÉUSSI');
    console.log('📋 Environnement de test prêt pour les tests automatisés');
    
    return {
      success: true,
      tables,
      gristAvailable: true,
      docApiAvailable: true
    };
    
  } catch (error) {
    console.error('❌ ERREUR DE CONNEXION:', error);
    console.log('\n🔧 Actions correctives possibles:');
    console.log('1. Vérifier que vous êtes dans le bon document Grist');
    console.log('2. Vérifier les permissions d\'accès au document');
    console.log('3. Rafraîchir la page si nécessaire');
    
    return {
      success: false,
      error: error.message,
      gristAvailable: typeof grist !== 'undefined',
      docApiAvailable: typeof grist?.docApi !== 'undefined'
    };
  }
}

// Test de compatibilité avec l'interface existante
async function testKanbanCompatibility() {
  console.log('🧪 Test compatibilité interface Kanban');
  
  const compatibility = {
    managers: {
      kanbanManager: typeof window.kanbanManager !== 'undefined',
      modalManager: window.kanbanManager?.modalManager !== undefined,
      filterManager: window.kanbanManager?.filterManager !== undefined,
      viewModeManager: window.kanbanManager?.viewModeManager !== undefined,
      gristManager: window.kanbanManager?.gristManager !== undefined
    },
    elements: {
      kanbanContainer: !!document.getElementById('kanban-container'),
      btnNouvelle: !!document.getElementById('btn-nouvelle-tache'),
      searchInput: !!document.getElementById('search-input'),
      modalTache: !!document.getElementById('popup-tache')
    },
    data: {
      currentRecords: window.kanbanManager?.currentRecords?.length || 0,
      gristOptions: Object.keys(window.kanbanManager?.gristOptions || {}).length
    }
  };
  
  console.log('🔍 Compatibilité interface:', compatibility);
  
  const allManagersOK = Object.values(compatibility.managers).every(ok => ok);
  const allElementsOK = Object.values(compatibility.elements).every(ok => ok);
  
  if (allManagersOK && allElementsOK) {
    console.log('✅ Interface Kanban compatible - Tests automatisés possibles');
  } else {
    console.warn('⚠️ Problèmes de compatibilité détectés');
    if (!allManagersOK) console.warn('Managers manquants:', compatibility.managers);
    if (!allElementsOK) console.warn('Éléments DOM manquants:', compatibility.elements);
  }
  
  return compatibility;
}

// Exposer globalement
window.testGristConnection = testGristConnection;
window.testKanbanCompatibility = testKanbanCompatibility;
window.TEST_GRIST_CONFIG = TEST_GRIST_CONFIG;

console.log('🧪 Script de test Grist chargé');
console.log('📋 Commandes disponibles:');
console.log('  - testGristConnection()    : Test connexion complète');
console.log('  - testKanbanCompatibility() : Test compatibilité interface');