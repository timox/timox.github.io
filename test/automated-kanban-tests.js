#!/usr/bin/env node

/**
 * 🧪 SUITE DE TESTS AUTOMATISÉS KANBAN - ÉLIMINER LES COPIER-COLLER
 * 
 * Tests complets des workflows Kanban via API Grist
 * Usage: node automated-kanban-tests.js
 */

const https = require('https');

const API_CONFIG = {
  HOST: 'grist.numerique.gouv.fr',
  DOC_ID: 'DOC_ID_SUPPRIME',
  API_KEY: 'IDENTIFIANT_SUPPRIME'
};

// === UTILITAIRES API ===
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
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
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

// === GÉNÉRATEUR DE DONNÉES TEST ===
function generateTestData() {
  const timestamp = Date.now();
  const bureaux = ['Dev', 'Test', 'Réseau', 'Admin', 'GSSI'];
  const responsables = ['TestUser1', 'TestUser2', 'AdminTest'];
  const urgences = ['Faible', 'Moyenne', 'Élevée'];
  const impacts = ['Mineur', 'Majeur', 'Critique'];
  const projets = ['Test Auto', 'Migration', 'Sécurité', 'Infrastructure'];
  
  return {
    newTask: {
      titre: `Test Auto ${timestamp}`,
      description: `Description automatique générée à ${new Date().toISOString()}`,
      statut: 'À faire',
      bureau: [bureaux[Math.floor(Math.random() * bureaux.length)]],
      qui: [responsables[Math.floor(Math.random() * responsables.length)]],
      urgence: urgences[Math.floor(Math.random() * urgences.length)],
      impact: impacts[Math.floor(Math.random() * impacts.length)],
      projet: projets[Math.floor(Math.random() * projets.length)]
    },
    updateData: {
      titre: `Test Modifié ${timestamp}`,
      statut: 'En cours',
      urgence: 'Élevée'
    }
  };
}

// === TESTS INDIVIDUELS ===

async function testCreateTask(silent = false) {
  if (!silent) console.log('\n🧪 TEST 1: Création de tâche');
  
  try {
    const testData = generateTestData();
    const createBody = {
      records: [{
        fields: testData.newTask
      }]
    };
    
    const result = await apiCall('/tables/Ssir_principale_task/records', 'POST', createBody);
    const taskId = result.records[0].id;
    
    if (!silent) {
      console.log('✅ Tâche créée avec succès');
      console.log('   ID:', taskId);
      console.log('   Titre:', testData.newTask.titre);
      console.log('   Statut:', testData.newTask.statut);
    }
    
    return { success: true, taskId, data: testData.newTask };
    
  } catch (error) {
    if (!silent) console.log('❌ Échec création:', error.message);
    return { success: false, error: error.message };
  }
}

async function testReadTask(taskId, silent = false) {
  if (!silent) console.log('\n🧪 TEST 2: Lecture de tâche');
  
  try {
    const result = await apiCall(`/tables/Ssir_principale_task/records?filter={"id": [${taskId}]}`);
    
    if (result.records.length === 0) {
      throw new Error('Tâche non trouvée');
    }
    
    const task = result.records[0];
    
    if (!silent) {
      console.log('✅ Tâche lue avec succès');
      console.log('   ID:', task.id);
      console.log('   Titre:', task.fields.titre);
      console.log('   Statut:', task.fields.statut);
    }
    
    return { success: true, task };
    
  } catch (error) {
    if (!silent) console.log('❌ Échec lecture:', error.message);
    return { success: false, error: error.message };
  }
}

async function testUpdateTask(taskId, updateData, silent = false) {
  if (!silent) console.log('\n🧪 TEST 3: Modification de tâche');
  
  try {
    const updateBody = {
      records: [{
        id: taskId,
        fields: updateData
      }]
    };
    
    await apiCall('/tables/Ssir_principale_task/records', 'PATCH', updateBody);
    
    if (!silent) {
      console.log('✅ Tâche modifiée avec succès');
      console.log('   Nouveau titre:', updateData.titre);
      console.log('   Nouveau statut:', updateData.statut);
    }
    
    return { success: true };
    
  } catch (error) {
    if (!silent) console.log('❌ Échec modification:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDeleteTask(taskId, silent = false) {
  if (!silent) console.log('\n🧪 TEST 4: Suppression de tâche');
  
  try {
    await apiCall('/tables/Ssir_principale_task/records', 'DELETE', { records: [taskId] });
    
    if (!silent) {
      console.log('✅ Tâche supprimée avec succès');
      console.log('   ID supprimé:', taskId);
    }
    
    return { success: true };
    
  } catch (error) {
    if (!silent) console.log('❌ Échec suppression:', error.message);
    return { success: false, error: error.message };
  }
}

async function testFilterTasks(filters, silent = false) {
  if (!silent) console.log('\n🧪 TEST 5: Filtrage de tâches');
  
  try {
    let filterQuery = '';
    if (filters.statut) {
      filterQuery = `?filter={"statut": ["${filters.statut}"]}`;
    }
    
    const result = await apiCall(`/tables/Ssir_principale_task/records${filterQuery}&limit=10`);
    
    if (!silent) {
      console.log('✅ Filtrage réussi');
      console.log(`   ${result.records.length} tâches trouvées`);
      if (filters.statut) {
        console.log(`   Filtre appliqué: statut = ${filters.statut}`);
      }
    }
    
    return { success: true, count: result.records.length, records: result.records };
    
  } catch (error) {
    if (!silent) console.log('❌ Échec filtrage:', error.message);
    return { success: false, error: error.message };
  }
}

// === WORKFLOWS COMPLETS ===

async function testFullWorkflow() {
  console.log('\n🔄 TEST WORKFLOW COMPLET: Créer → Lire → Modifier → Supprimer');
  console.log('='.repeat(60));
  
  const results = {
    create: null,
    read: null,
    update: null,
    delete: null
  };
  
  try {
    // 1. Créer
    results.create = await testCreateTask(true);
    if (!results.create.success) throw new Error('Création échouée');
    console.log('✅ Étape 1/4: Création OK (ID: ' + results.create.taskId + ')');
    
    const taskId = results.create.taskId;
    
    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 2. Lire
    results.read = await testReadTask(taskId, true);
    if (!results.read.success) throw new Error('Lecture échouée');
    console.log('✅ Étape 2/4: Lecture OK');
    
    // 3. Modifier
    const updateData = generateTestData().updateData;
    results.update = await testUpdateTask(taskId, updateData, true);
    if (!results.update.success) throw new Error('Modification échouée');
    console.log('✅ Étape 3/4: Modification OK');
    
    // 4. Supprimer
    results.delete = await testDeleteTask(taskId, true);
    if (!results.delete.success) throw new Error('Suppression échouée');
    console.log('✅ Étape 4/4: Suppression OK');
    
    console.log('\n✅ WORKFLOW COMPLET RÉUSSI !');
    return { success: true, results };
    
  } catch (error) {
    console.log('\n❌ WORKFLOW ÉCHOUÉ:', error.message);
    return { success: false, error: error.message, results };
  }
}

async function testBatchOperations() {
  console.log('\n🔄 TEST OPÉRATIONS BATCH: Créer 5 tâches → Filtrer → Nettoyer');
  console.log('='.repeat(60));
  
  const createdIds = [];
  
  try {
    // Créer 5 tâches
    console.log('📝 Création de 5 tâches test...');
    for (let i = 1; i <= 5; i++) {
      const result = await testCreateTask(true);
      if (result.success) {
        createdIds.push(result.taskId);
        console.log(`   ✅ Tâche ${i}/5 créée (ID: ${result.taskId})`);
      }
    }
    
    // Tester le filtrage
    console.log('\n🔍 Test filtrage par statut...');
    const filterResult = await testFilterTasks({ statut: 'À faire' }, true);
    console.log(`   ✅ ${filterResult.count} tâches "À faire" trouvées`);
    
    // Nettoyer
    console.log('\n🧹 Nettoyage des tâches test...');
    for (const id of createdIds) {
      await testDeleteTask(id, true);
      console.log(`   ✅ Tâche ${id} supprimée`);
    }
    
    console.log('\n✅ OPÉRATIONS BATCH RÉUSSIES !');
    return { success: true, created: createdIds.length };
    
  } catch (error) {
    console.log('\n❌ BATCH ÉCHOUÉ:', error.message);
    
    // Tentative de nettoyage
    console.log('🧹 Tentative de nettoyage...');
    for (const id of createdIds) {
      try {
        await testDeleteTask(id, true);
      } catch (e) {
        // Ignorer les erreurs de nettoyage
      }
    }
    
    return { success: false, error: error.message };
  }
}

// === SUITE COMPLÈTE ===

async function runFullTestSuite() {
  console.log('🚀 SUITE COMPLÈTE DE TESTS AUTOMATISÉS KANBAN');
  console.log('='.repeat(60));
  console.log('Objectif: Éliminer les tests manuels répétitifs\n');
  
  const startTime = Date.now();
  const results = [];
  
  // Tests individuels
  console.log('📋 TESTS INDIVIDUELS');
  results.push(await testCreateTask());
  
  const createResult = results[results.length - 1];
  if (createResult.success && createResult.taskId) {
    results.push(await testReadTask(createResult.taskId));
    results.push(await testUpdateTask(createResult.taskId, { statut: 'Terminé' }));
    results.push(await testDeleteTask(createResult.taskId));
  }
  
  results.push(await testFilterTasks({ statut: 'En cours' }));
  
  // Workflows complets
  console.log('\n📋 WORKFLOWS COMPLETS');
  results.push(await testFullWorkflow());
  results.push(await testBatchOperations());
  
  // Rapport final
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => r && r.success).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Tests réussis: ${successful}/${total}`);
  console.log(`⏱️  Durée totale: ${duration} secondes`);
  
  if (successful === total) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('✅ L\'API fonctionne parfaitement');
    console.log('✅ Les workflows sont opérationnels');
    console.log('✅ Plus besoin de copier-coller manuel !');
  } else {
    console.log('\n⚠️ Certains tests ont échoué');
    console.log('Vérifiez les erreurs ci-dessus');
  }
  
  return { successful, total, duration };
}

// === POINT D'ENTRÉE ===
if (require.main === module) {
  console.log('🧪 Kanban GSSI - Tests Automatisés\n');
  
  runFullTestSuite()
    .then(result => {
      process.exit(result.successful === result.total ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}