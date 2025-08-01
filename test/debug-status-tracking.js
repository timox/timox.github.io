#!/usr/bin/env node
// === debug-status-tracking.js ===
// Debug spécifique pour comprendre pourquoi status_change n'apparaît pas

const API_KEY = '246a54fe9f95afca85b8d0f1acb4c421406200e9';
const DOC_ID = 'e4navPUHoV29jnDQfqMFwo';
const BASE_URL = `https://grist.numerique.gouv.fr/api/docs/${DOC_ID}`;
const TABLE_ID = 'Ssir_principale_task';

/**
 * Effectue un appel API vers Grist
 */
async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      console.error(`❌ Erreur ${response.status}: ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('❌ Erreur API:', error.message);
    return null;
  }
}

/**
 * Debug tracking de statut d'une tâche spécifique
 */
async function debugStatusTracking() {
  console.log('🔍 DEBUG TRACKING STATUS');
  console.log('========================\n');

  // 1. Récupérer toutes les tâches
  console.log('📊 Récupération des tâches...');
  const allTasks = await apiCall('/tables/Ssir_principale_task/records');
  
  if (!allTasks || !allTasks.records || allTasks.records.length === 0) {
    console.error('❌ Aucune tâche trouvée');
    return;
  }

  console.log(`✅ ${allTasks.records.length} tâches trouvées\n`);

  // 2. Analyser les tâches avec historique JSON
  let tasksWithHistory = 0;
  let statusChangeEntries = 0;
  let totalHistoryEntries = 0;

  console.log('🔍 Analyse détaillée de l\'historique...\n');

  for (const task of allTasks.records) {
    if (task.fields.notes) {
      try {
        let history = [];
        
        // Parser les notes JSON
        if (typeof task.fields.notes === 'string') {
          const notesData = JSON.parse(task.fields.notes);
          if (notesData && notesData.history && Array.isArray(notesData.history)) {
            history = notesData.history;
            tasksWithHistory++;
          }
        }

        if (history.length > 0) {
          totalHistoryEntries += history.length;
          
          // Compter les status_change
          const statusChanges = history.filter(entry => entry.action === 'status_change');
          
          if (statusChanges.length > 0) {
            statusChangeEntries += statusChanges.length;
            console.log(`📋 Tâche "${task.fields.titre}" (ID: ${task.id})`);
            console.log(`   ${statusChanges.length} changement(s) de statut :`);
            
            statusChanges.forEach((entry, index) => {
              console.log(`   ${index + 1}. ${entry.timestamp} | ${entry.user || 'Unknown'}`);
              console.log(`      Details: ${entry.details || 'N/A'}`);
              console.log(`      Old: ${entry.oldValue || 'N/A'} → New: ${entry.newValue || 'N/A'}`);
            });
            console.log('');
          }
        }
      } catch (error) {
        // Notes pas en JSON, ignorer
      }
    }
  }

  console.log('📊 RÉSULTATS DEBUG:');
  console.log('===================');
  console.log(`Tâches avec historique JSON: ${tasksWithHistory}/${allTasks.records.length}`);
  console.log(`Total entrées d'historique: ${totalHistoryEntries}`);
  console.log(`Changements de statut trouvés: ${statusChangeEntries}`);

  if (statusChangeEntries === 0) {
    console.log('\n❌ PROBLÈME: Aucun changement de statut dans l\'historique');
    console.log('\n🔍 CAUSES POSSIBLES:');
    console.log('1. UserActionManager.statusChangeAction() pas appelé');
    console.log('2. oldStatus === newStatus (pas de changement réel)');
    console.log('3. UserActionManager non initialisé');
    console.log('4. Erreur dans addHistoryEntry()');
    console.log('5. Notes pas au format JSON pour les nouvelles entrées');
  } else {
    console.log(`\n✅ ${statusChangeEntries} changement(s) de statut détecté(s)`);
  }

  // 3. Vérifier une tâche récemment modifiée
  console.log('\n🕐 Analyse tâches récemment modifiées...');
  
  const recentTasks = allTasks.records
    .filter(task => task.fields.date_derniere_maj)
    .sort((a, b) => new Date(b.fields.date_derniere_maj) - new Date(a.fields.date_derniere_maj))
    .slice(0, 3);

  console.log(`\n📋 Top 3 tâches récemment modifiées:`);
  recentTasks.forEach((task, index) => {
    console.log(`${index + 1}. "${task.fields.titre}" (ID: ${task.id})`);
    console.log(`   Dernière modif: ${task.fields.date_derniere_maj}`);
    console.log(`   Statut actuel: ${task.fields.statut}`);
    
    if (task.fields.notes) {
      try {
        const notesData = JSON.parse(task.fields.notes);
        const history = notesData.history || [];
        const statusChanges = history.filter(entry => entry.action === 'status_change');
        console.log(`   Status changes: ${statusChanges.length}`);
        
        if (history.length > 0) {
          const lastEntry = history[history.length - 1];
          console.log(`   Dernière entrée: ${lastEntry.action} - ${lastEntry.timestamp}`);
        }
      } catch (e) {
        console.log(`   Notes format: texte brut`);
      }
    } else {
      console.log(`   Pas de notes`);
    }
    console.log('');
  });
}

/**
 * Test direct d'ajout d'historique
 */
async function testDirectHistoryAdd() {
  console.log('\n🧪 TEST DIRECT AJOUT HISTORIQUE');
  console.log('================================\n');
  
  // Prendre la première tâche
  const allTasks = await apiCall('/tables/Ssir_principale_task/records');
  if (!allTasks || !allTasks.records.length) {
    console.error('❌ Pas de tâches pour test');
    return;
  }
  
  const testTask = allTasks.records[0];
  console.log(`🎯 Test sur tâche: "${testTask.fields.titre}" (ID: ${testTask.id})`);
  
  // Analyser notes actuelles
  let currentHistory = [];
  if (testTask.fields.notes) {
    try {
      const notesData = JSON.parse(testTask.fields.notes);
      currentHistory = notesData.history || [];
    } catch (e) {
      // Notes en texte
    }
  }
  
  console.log(`📋 Historique actuel: ${currentHistory.length} entrées`);
  
  // Ajouter une entrée de test
  const testEntry = {
    timestamp: new Date().toISOString(),
    user: 'Debug Test',
    action: 'status_change',
    details: 'Test debug: À faire → En cours',
    oldValue: 'À faire',
    newValue: 'En cours',
    status: 'En cours'
  };
  
  currentHistory.push(testEntry);
  
  const newNotesData = {
    content: testTask.fields.notes ? (typeof testTask.fields.notes === 'string' ? '' : testTask.fields.notes) : '',
    history: currentHistory
  };
  
  console.log('📝 Tentative ajout entrée test...');
  
  const updateResult = await apiCall(`/tables/${TABLE_ID}/records`, {
    method: 'PATCH',
    body: JSON.stringify({
      records: [{
        id: testTask.id,
        fields: {
          notes: JSON.stringify(newNotesData, null, 2)
        }
      }]
    })
  });
  
  if (updateResult) {
    console.log('✅ Entrée test ajoutée avec succès');
    console.log('🔄 Vérifiez maintenant l\'historique dans l\'interface');
  } else {
    console.log('❌ Échec ajout entrée test');
  }
}

// Exécuter les tests
if (require.main === module) {
  (async () => {
    await debugStatusTracking();
    
    console.log('\n' + '='.repeat(50));
    const shouldTest = process.argv.includes('--test');
    if (shouldTest) {
      await testDirectHistoryAdd();
    } else {
      console.log('💡 Pour tester l\'ajout direct: node debug-status-tracking.js --test');
    }
  })();
}