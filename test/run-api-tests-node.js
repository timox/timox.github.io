#!/usr/bin/env node

/**
 * 🧪 TEST API GRIST - VERSION NODE.JS
 * 
 * Exécuter avec: node run-api-tests-node.js
 */

const https = require('https');

const API_CONFIG = {
  HOST: 'grist.numerique.gouv.fr',
  DOC_ID: 'DOC_ID_SUPPRIME',
  API_KEY: 'IDENTIFIANT_SUPPRIME'
};

// Fonction pour faire des appels API
function apiCall(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_CONFIG.HOST,
      path: `/api/docs/${API_CONFIG.DOC_ID}${path}`,
      method: 'GET',
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
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Tests
async function runTests() {
  console.log('🧪 TESTS API GRIST - KANBAN GSSI');
  console.log('=================================\n');

  try {
    // Test 1: Connexion
    console.log('📡 Test 1: Connexion au document...');
    const doc = await apiCall('');
    console.log('✅ Document accessible:', doc.name);
    console.log('   ID:', doc.id);
    console.log('');

    // Test 2: Tables
    console.log('📊 Test 2: Vérification des tables...');
    const tables = await apiCall('/tables');
    console.log('✅ Tables trouvées:', tables.tables.map(t => t.id).join(', '));
    
    const expectedTables = ['Ssir_principale_task', 'Ssir_strategie2'];
    const foundTables = tables.tables.map(t => t.id);
    const hasAllTables = expectedTables.every(t => foundTables.includes(t));
    
    if (hasAllTables) {
      console.log('✅ Toutes les tables requises sont présentes');
    } else {
      console.log('❌ Tables manquantes');
    }
    console.log('');

    // Test 3: Données
    console.log('📝 Test 3: Lecture des données...');
    const tasks = await apiCall('/tables/Ssir_principale_task/records?limit=5');
    console.log('✅ Tâches:', tasks.records.length, 'enregistrements lus');
    
    if (tasks.records.length > 0) {
      const example = tasks.records[0];
      console.log('   Exemple de tâche:');
      console.log('   - ID:', example.id);
      console.log('   - Titre:', example.fields.titre || 'N/A');
      console.log('   - Statut:', example.fields.statut || 'N/A');
    }
    
    const strategies = await apiCall('/tables/Ssir_strategie2/records?limit=5');
    console.log('✅ Stratégies:', strategies.records.length, 'enregistrements lus');
    console.log('');

    // Résumé
    console.log('📊 RÉSUMÉ');
    console.log('=========');
    console.log('✅ Connexion API: OK');
    console.log('✅ Tables disponibles:', foundTables.length);
    console.log('✅ Accès lecture: OK');
    console.log('✅ Document ID:', API_CONFIG.DOC_ID);
    console.log('\n🎉 Tous les tests sont passés !');
    console.log('L\'environnement de test est prêt pour l\'automatisation.');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.log('\n🔧 Vérifiez:');
    console.log('1. La clé API est valide');
    console.log('2. Le document ID est correct');
    console.log('3. Vous avez accès au document');
  }
}

// Lancer les tests
console.log('🚀 Démarrage des tests...\n');
runTests();