#!/usr/bin/env node
// === test-status-tracking.js ===
// Test des corrections du tracking de statut

const API_KEY = 'IDENTIFIANT_SUPPRIME';
const DOC_ID = 'DOC_ID_SUPPRIME';
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
 * Test du tracking de statut
 */
async function testStatusTracking() {
  console.log('🧪 TEST DU TRACKING DE STATUT');
  console.log('===============================\n');

  // 1. Récupérer une tâche pour test
  console.log('📊 Récupération des tâches...');
  const allTasks = await apiCall('/tables/Ssir_principale_task/records');
  
  if (!allTasks || !allTasks.records || allTasks.records.length === 0) {
    console.error('❌ Aucune tâche trouvée');
    return;
  }

  // Prendre la première tâche qui n'est pas "Terminé"
  const testTask = allTasks.records.find(task => 
    task.fields.statut && task.fields.statut !== 'Terminé'
  );

  if (!testTask) {
    console.error('❌ Aucune tâche non-terminée trouvée pour test');
    return;
  }

  console.log(`✅ Tâche sélectionnée: "${testTask.fields.titre}" (ID: ${testTask.id})`);
  console.log(`   Statut actuel: ${testTask.fields.statut}\n`);

  // 2. Analyser l'historique avant changement
  console.log('📖 Analyse de l\'historique AVANT changement...');
  let historyBefore = [];
  if (testTask.fields.notes) {
    try {
      const notesData = JSON.parse(testTask.fields.notes);
      historyBefore = notesData.history || [];
    } catch (e) {
      console.log('   Notes au format texte (pas encore migré)');
    }
  }
  
  const statusChangesBefore = historyBefore.filter(entry => entry.action === 'status_change').length;
  console.log(`   Changements de statut dans l'historique: ${statusChangesBefore}`);
  console.log(`   Total entrées d'historique: ${historyBefore.length}\n`);

  // 3. Effectuer un changement de statut
  const originalStatus = testTask.fields.statut;
  const newStatus = originalStatus === 'À faire' ? 'En cours' : 'À faire';
  
  console.log(`🔄 Changement de statut: ${originalStatus} → ${newStatus}`);
  
  const updateResult = await apiCall(`/tables/${TABLE_ID}/records`, {
    method: 'PATCH',
    body: JSON.stringify({
      records: [{
        id: testTask.id,
        fields: {
          statut: newStatus
        }
      }]
    })
  });

  if (!updateResult) {
    console.error('❌ Échec du changement de statut');
    return;
  }

  console.log('✅ Changement de statut effectué via API Grist\n');

  // 4. Attendre un peu pour que l'historique soit mis à jour
  console.log('⏳ Attente 3 secondes pour mise à jour historique...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 5. Re-récupérer la tâche et analyser l'historique
  console.log('📖 Analyse de l\'historique APRÈS changement...');
  const updatedTaskResponse = await apiCall(`/tables/${TABLE_ID}/records/${testTask.id}`);
  
  if (!updatedTaskResponse) {
    console.error('❌ Impossible de récupérer la tâche mise à jour');
    return;
  }

  const updatedTask = updatedTaskResponse;
  let historyAfter = [];
  
  if (updatedTask.fields.notes) {
    try {
      const notesData = JSON.parse(updatedTask.fields.notes);
      historyAfter = notesData.history || [];
    } catch (e) {
      console.log('   Notes au format texte');
    }
  }

  const statusChangesAfter = historyAfter.filter(entry => entry.action === 'status_change').length;
  console.log(`   Changements de statut dans l'historique: ${statusChangesAfter}`);
  console.log(`   Total entrées d'historique: ${historyAfter.length}`);

  // 6. Vérifier si le tracking fonctionne
  const newStatusChanges = statusChangesAfter - statusChangesBefore;
  console.log(`\n🎯 RÉSULTAT DU TEST:`);
  console.log(`========================`);
  
  if (newStatusChanges > 0) {
    console.log(`✅ SUCCÈS: ${newStatusChanges} nouveau(x) changement(s) de statut détecté(s)`);
    console.log(`✅ Le tracking de statut fonctionne !`);
    
    // Afficher le dernier changement
    const latestStatusChange = historyAfter
      .filter(entry => entry.action === 'status_change')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
    if (latestStatusChange) {
      console.log(`\n📋 Dernier changement de statut:`);
      console.log(`   Timestamp: ${latestStatusChange.timestamp}`);
      console.log(`   User: ${latestStatusChange.user}`);
      console.log(`   Details: ${latestStatusChange.details}`);
      console.log(`   Old: ${latestStatusChange.oldValue}`);
      console.log(`   New: ${latestStatusChange.newValue}`);
    }
  } else {
    console.log(`❌ ÉCHEC: Aucun nouveau changement de statut détecté`);
    console.log(`❌ Le tracking de statut ne fonctionne pas encore`);
    
    console.log(`\n🔍 DEBUG - Dernières entrées d'historique:`);
    historyAfter.slice(-3).forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.timestamp} | ${entry.action} | ${entry.user}`);
      console.log(`      Details: ${entry.details}`);
    });
  }

  // 7. Remettre le statut original
  console.log(`\n🔄 Remise du statut original: ${newStatus} → ${originalStatus}`);
  await apiCall(`/tables/${TABLE_ID}/records`, {
    method: 'PATCH',
    body: JSON.stringify({
      records: [{
        id: testTask.id,
        fields: {
          statut: originalStatus
        }
      }]
    })
  });
  
  console.log('✅ Statut original restauré');
}

/**
 * Test global du tracking
 */
async function runAllTests() {
  try {
    await testStatusTracking();
  } catch (error) {
    console.error('❌ Erreur durant les tests:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runAllTests();
}

module.exports = { testStatusTracking };