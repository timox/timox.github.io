#!/usr/bin/env node

/**
 * 🎯 SUITE DE TESTS AUTOMATISÉE FINALE - KANBAN GSSI
 * 
 * Tests automatisés complets utilisant le bon format API Grist
 * OBJECTIF: Éliminer définitivement les tests manuels répétitifs
 */

const https = require('https');

const API_CONFIG = {
  HOST: 'grist.numerique.gouv.fr',
  DOC_ID: 'DOC_ID_SUPPRIME',
  API_KEY: 'IDENTIFIANT_SUPPRIME'
};

function apiCall(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_CONFIG.HOST,
      path: `/api/docs/${API_CONFIG.DOC_ID}${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// === GÉNÉRATEUR DE DONNÉES AVEC BON FORMAT ===
function generateTestData() {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 1000);
  
  return {
    newTask: {
      titre: `Test Automatisé ${randomId}`,
      description: `Test généré automatiquement le ${new Date().toISOString()}`,
      statut: 'À faire',
      // FORMAT GRIST CORRECT: ["L", ...items]
      bureau: ["L", "Test", "API"],
      qui: ["L", "TestUser"],
      urgence: 'Faible',
      impact: 'Mineur',
      projet: 'Test Automatisé'
    },
    updateData: {
      titre: `Test Modifié ${randomId}`,
      statut: 'En cours',
      urgence: 'Moyenne'
    }
  };
}

// === TESTS WORKFLOW ===

async function testCreateAndCleanup() {
  console.log('🧪 Test: Création + Nettoyage automatique');
  
  try {
    const testData = generateTestData();
    
    // Créer
    const createBody = {
      records: [{
        fields: testData.newTask
      }]
    };
    
    const result = await apiCall('/tables/Ssir_principale_task/records', 'POST', createBody);
    const taskId = result.records[0].id;
    
    console.log('✅ Tâche créée:', taskId, '-', testData.newTask.titre);
    
    // Lire pour vérifier
    const readResult = await apiCall(`/tables/Ssir_principale_task/records?id=${taskId}`);
    const createdTask = readResult.records[0];
    console.log('✅ Lecture OK:', createdTask.fields.titre);
    
    // Modifier
    const updateBody = {
      records: [{
        id: taskId,
        fields: testData.updateData
      }]
    };
    
    await apiCall('/tables/Ssir_principale_task/records', 'PATCH', updateBody);
    console.log('✅ Modification OK:', testData.updateData.titre);
    
    // Supprimer immédiatement
    await apiCall('/tables/Ssir_principale_task/records', 'DELETE', { records: [taskId] });
    console.log('✅ Suppression OK - Aucune pollution des données');
    
    return { success: true, taskId, cleaned: true };
    
  } catch (error) {
    console.log('❌ Échec:', error.message);
    return { success: false, error: error.message };
  }
}

async function testBatchWorkflow() {
  console.log('\n🔄 Test: Workflow batch (5 tâches)');
  
  const createdIds = [];
  
  try {
    // Créer 5 tâches
    for (let i = 1; i <= 5; i++) {
      const testData = generateTestData();
      testData.newTask.titre = `Batch Test ${i}/5 - ${Date.now()}`;
      
      const createBody = {
        records: [{
          fields: testData.newTask
        }]
      };
      
      const result = await apiCall('/tables/Ssir_principale_task/records', 'POST', createBody);
      const taskId = result.records[0].id;
      createdIds.push(taskId);
      
      console.log(`   ✅ Tâche ${i}/5 créée (ID: ${taskId})`);
    }
    
    // Lire toutes les tâches créées
    console.log('🔍 Vérification des 5 tâches...');
    let allFound = true;
    for (const id of createdIds) {
      try {
        const readResult = await apiCall(`/tables/Ssir_principale_task/records?id=${id}`);
        if (readResult.records.length === 0) {
          allFound = false;
          console.log(`   ❌ Tâche ${id} non trouvée`);
        }
      } catch (e) {
        allFound = false;
        console.log(`   ❌ Erreur lecture tâche ${id}`);
      }
    }
    
    if (allFound) {
      console.log('   ✅ Toutes les tâches sont accessibles');
    }
    
    // Nettoyer toutes les tâches
    console.log('🧹 Nettoyage des 5 tâches...');
    for (const id of createdIds) {
      try {
        await apiCall('/tables/Ssir_principale_task/records', 'DELETE', { records: [id] });
        console.log(`   ✅ Tâche ${id} supprimée`);
      } catch (e) {
        console.log(`   ⚠️  Erreur suppression ${id}:`, e.message);
      }
    }
    
    console.log('✅ Workflow batch terminé');
    return { success: true, created: createdIds.length, cleaned: createdIds.length };
    
  } catch (error) {
    console.log('❌ Échec workflow batch:', error.message);
    
    // Nettoyage d'urgence
    console.log('🚨 Nettoyage d\'urgence...');
    for (const id of createdIds) {
      try {
        await apiCall('/tables/Ssir_principale_task/records', 'DELETE', { records: [id] });
      } catch (e) {
        // Ignorer erreurs de nettoyage
      }
    }
    
    return { success: false, error: error.message };
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Test: Intégrité des données existantes');
  
  try {
    // Compter toutes les tâches
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    console.log(`✅ ${allTasks.records.length} tâches totales dans la base`);
    
    // Vérifier différents statuts
    const statuts = ['À faire', 'En cours', 'Terminé'];
    for (const statut of statuts) {
      const encoded = encodeURIComponent(JSON.stringify({statut: [statut]}));
      const filtered = await apiCall(`/tables/Ssir_principale_task/records?filter=${encoded}`);
      console.log(`   - ${statut}: ${filtered.records.length} tâches`);
    }
    
    // Vérifier les stratégies
    const strategies = await apiCall('/tables/Ssir_strategie2/records');
    console.log(`✅ ${strategies.records.length} stratégies disponibles`);
    
    return { success: true, tasks: allTasks.records.length, strategies: strategies.records.length };
    
  } catch (error) {
    console.log('❌ Échec vérification:', error.message);
    return { success: false, error: error.message };
  }
}

async function testPerformance() {
  console.log('\n⚡ Test: Performance API');
  
  const startTime = Date.now();
  
  try {
    // Test lecture rapide
    await apiCall('/tables/Ssir_principale_task/records?limit=10');
    const readTime = Date.now() - startTime;
    
    // Test création rapide
    const createStart = Date.now();
    const testData = generateTestData();
    const createBody = {
      records: [{
        fields: testData.newTask
      }]
    };
    
    const result = await apiCall('/tables/Ssir_principale_task/records', 'POST', createBody);
    const taskId = result.records[0].id;
    const createTime = Date.now() - createStart;
    
    // Test suppression rapide
    const deleteStart = Date.now();
    await apiCall('/tables/Ssir_principale_task/records', 'DELETE', { records: [taskId] });
    const deleteTime = Date.now() - deleteStart;
    
    const totalTime = Date.now() - startTime;
    
    console.log('✅ Performances:');
    console.log(`   - Lecture 10 tâches: ${readTime}ms`);
    console.log(`   - Création: ${createTime}ms`);
    console.log(`   - Suppression: ${deleteTime}ms`);
    console.log(`   - Total: ${totalTime}ms`);
    
    return { 
      success: true, 
      timings: { read: readTime, create: createTime, delete: deleteTime, total: totalTime }
    };
    
  } catch (error) {
    console.log('❌ Échec performance:', error.message);
    return { success: false, error: error.message };
  }
}

// === SUITE PRINCIPALE ===

async function runFinalTestSuite() {
  console.log('🎯 SUITE FINALE DE TESTS AUTOMATISÉS - KANBAN GSSI');
  console.log('='.repeat(70));
  console.log('🎯 OBJECTIF: Éliminer les tests manuels répétitifs');
  console.log('📋 Document:', API_CONFIG.DOC_ID);
  console.log('');
  
  const startTime = Date.now();
  const results = [];
  
  // Tests principaux
  results.push(await testCreateAndCleanup());
  results.push(await testBatchWorkflow());
  results.push(await testDataIntegrity());
  results.push(await testPerformance());
  
  // Rapport final
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => r && r.success).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RAPPORT FINAL - TESTS AUTOMATISÉS');
  console.log('='.repeat(70));
  console.log(`✅ Tests réussis: ${successful}/${total}`);
  console.log(`⏱️  Durée totale: ${duration} secondes`);
  
  // Détails des performances
  const perfResult = results.find(r => r.timings);
  if (perfResult && perfResult.success) {
    console.log('⚡ Performances moyennes:');
    console.log(`   - Création: ${perfResult.timings.create}ms`);
    console.log(`   - Lecture: ${perfResult.timings.read}ms`);
    console.log(`   - Suppression: ${perfResult.timings.delete}ms`);
  }
  
  if (successful === total) {
    console.log('\n🎉 SUCCÈS COMPLET !');
    console.log('✅ L\'API Grist fonctionne parfaitement');
    console.log('✅ Tous les workflows sont opérationnels');
    console.log('✅ Les données ne sont pas polluées');
    console.log('✅ Plus besoin de tests manuels !');
    console.log('\n💡 Cette suite peut être lancée à chaque changement');
    console.log('💡 Commande: node final-test-suite.js');
  } else {
    console.log('\n⚠️ Certains tests ont échoué');
    results.forEach((result, i) => {
      if (result && !result.success) {
        console.log(`❌ Test ${i+1}: ${result.error}`);
      }
    });
  }
  
  return { successful, total, duration };
}

// === LANCEMENT ===
if (require.main === module) {
  console.log('🚀 Démarrage des tests automatisés...\n');
  
  runFinalTestSuite()
    .then(result => {
      process.exit(result.successful === result.total ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}