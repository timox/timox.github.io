#!/usr/bin/env node
// === debug-task-117.js ===
// Debug spécifique pour la tâche 117

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
 * Debug spécifique tâche 117
 */
async function debugTask117() {
  console.log('🔍 DEBUG TÂCHE 117');
  console.log('==================\n');

  // 1. Récupérer la tâche 117
  console.log('📋 Récupération tâche 117...');
  const task = await apiCall(`/tables/${TABLE_ID}/records/117`);
  
  if (!task) {
    console.error('❌ Tâche 117 non trouvée');
    return;
  }

  console.log(`✅ Tâche trouvée: "${task.fields.titre}"`);
  console.log(`   Statut: ${task.fields.statut}`);
  console.log(`   Dernière modif: ${task.fields.date_derniere_maj}`);
  
  // 2. Analyser les stratégies
  console.log('\n🎯 ANALYSE STRATÉGIES:');
  console.log('======================');
  console.log('Données brutes strategie_id:', task.fields.strategie_id);
  console.log('Type:', typeof task.fields.strategie_id);
  
  if (task.fields.strategie_id) {
    if (Array.isArray(task.fields.strategie_id)) {
      console.log('Format: Array');
      console.log('Contenu:', task.fields.strategie_id);
      
      // Analyser le format
      if (task.fields.strategie_id.length > 0) {
        task.fields.strategie_id.forEach((item, index) => {
          console.log(`  [${index}]:`, item, typeof item);
          if (Array.isArray(item)) {
            console.log(`    Sous-array: [${item.join(', ')}]`);
          }
        });
      }
    } else {
      console.log('Format: Non-array');
      console.log('Valeur:', task.fields.strategie_id);
    }
  } else {
    console.log('❌ Pas de stratégies définies');
  }

  // 3. Analyser l'historique
  console.log('\n📖 ANALYSE HISTORIQUE:');
  console.log('=======================');
  
  if (task.fields.notes) {
    try {
      const notesData = JSON.parse(task.fields.notes);
      const history = notesData.history || [];
      
      console.log(`Total entrées historique: ${history.length}`);
      
      // Chercher les entrées liées aux stratégies
      const strategyEntries = history.filter(entry => 
        entry.action === 'strategies_update' || 
        entry.details?.includes('strateg') ||
        entry.details?.includes('Stratég')
      );
      
      console.log(`Entrées liées aux stratégies: ${strategyEntries.length}`);
      
      if (strategyEntries.length > 0) {
        console.log('\n📋 Dernières modifications stratégies:');
        strategyEntries.slice(-3).forEach((entry, index) => {
          console.log(`${index + 1}. ${entry.timestamp} | ${entry.user || 'Unknown'}`);
          console.log(`   Action: ${entry.action}`);
          console.log(`   Details: ${entry.details || 'N/A'}`);
          console.log(`   Old: ${entry.oldValue || 'N/A'}`);
          console.log(`   New: ${entry.newValue || 'N/A'}`);
          console.log('');
        });
      }

      // Chercher les status_change
      const statusChanges = history.filter(entry => entry.action === 'status_change');
      console.log(`\n🔄 Changements de statut: ${statusChanges.length}`);
      
      if (statusChanges.length > 0) {
        console.log('Derniers changements de statut:');
        statusChanges.slice(-2).forEach((entry, index) => {
          console.log(`${index + 1}. ${entry.timestamp} | ${entry.user || 'Unknown'}`);
          console.log(`   ${entry.oldValue} → ${entry.newValue}`);
        });
      }

    } catch (e) {
      console.log('Notes au format texte (pas JSON)');
      console.log('Contenu notes:', task.fields.notes?.substring(0, 100) + '...');
    }
  } else {
    console.log('❌ Pas de notes/historique');
  }

  // 4. Analyser les jalons
  console.log('\n📅 ANALYSE JALONS:');
  console.log('==================');
  
  if (task.fields.jalons) {
    try {
      const jalonsData = JSON.parse(task.fields.jalons);
      if (jalonsData && jalonsData.jalons) {
        console.log(`Nombre de jalons: ${jalonsData.jalons.length}`);
        if (jalonsData.jalons.length > 0) {
          jalonsData.jalons.forEach((jalon, index) => {
            console.log(`${index + 1}. "${jalon.titre}" (${jalon.date}) - ${jalon.statut}`);
          });
        }
      } else {
        console.log('Format jalons invalide');
      }
    } catch (e) {
      console.log('Erreur parsing jalons:', e.message);
    }
  } else {
    console.log('❌ Pas de jalons');
  }
}

// Exécuter le debug
if (require.main === module) {
  debugTask117();
}

module.exports = { debugTask117 };