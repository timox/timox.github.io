#!/usr/bin/env node
// === debug-jalons-issue.js ===
// Debug du problème de suppression du dernier jalon

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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`API Error: ${error.message}`);
  }
}

/**
 * Debug des jalons
 */
async function debugJalonsIssue() {
  console.log('🔍 DEBUG PROBLÈME JALONS');
  console.log('========================\n');

  // Chercher les tâches qui ont le champ jalons
  const allTasks = await apiCall('/tables/Ssir_principale_task/records');
  
  console.log('📊 Analyse des formats de jalons:\n');
  
  let issues = {
    emptyArray: [],
    emptyObject: [],
    oldFormat: [],
    newFormat: [],
    invalid: []
  };

  for (const task of allTasks.records) {
    if (task.fields.jalons !== null && task.fields.jalons !== undefined) {
      const jalonsField = task.fields.jalons;
      
      try {
        if (jalonsField === '[]') {
          issues.emptyArray.push({
            id: task.id,
            titre: task.fields.titre,
            jalons: jalonsField
          });
        } else if (jalonsField === '{}') {
          issues.emptyObject.push({
            id: task.id,
            titre: task.fields.titre,
            jalons: jalonsField
          });
        } else {
          const parsed = JSON.parse(jalonsField);
          
          if (Array.isArray(parsed)) {
            issues.oldFormat.push({
              id: task.id,
              titre: task.fields.titre,
              count: parsed.length,
              jalons: jalonsField.substring(0, 100) + '...'
            });
          } else if (parsed && typeof parsed === 'object' && parsed.hasOwnProperty('jalons')) {
            issues.newFormat.push({
              id: task.id,
              titre: task.fields.titre,
              count: parsed.jalons.length,
              lastModified: parsed.lastModified
            });
          } else {
            issues.invalid.push({
              id: task.id,
              titre: task.fields.titre,
              jalons: jalonsField.substring(0, 100) + '...'
            });
          }
        }
      } catch (e) {
        issues.invalid.push({
          id: task.id,
          titre: task.fields.titre,
          jalons: jalonsField ? jalonsField.substring(0, 100) : 'null',
          rawLength: jalonsField ? jalonsField.length : 0,
          error: e.message
        });
      }
    }
  }

  // Afficher le rapport
  console.log(`✅ Nouveau format correct: ${issues.newFormat.length} tâches`);
  if (issues.newFormat.length > 0) {
    console.log('   Exemples:');
    issues.newFormat.slice(0, 3).forEach(t => {
      console.log(`   - Tâche ${t.id}: "${t.titre}" (${t.count} jalons)`);
    });
  }

  console.log(`\n❌ Ancien format (array): ${issues.oldFormat.length} tâches`);
  if (issues.oldFormat.length > 0) {
    console.log('   Exemples:');
    issues.oldFormat.slice(0, 3).forEach(t => {
      console.log(`   - Tâche ${t.id}: "${t.titre}" (${t.count} jalons)`);
    });
  }

  console.log(`\n⚠️  Array vide '[]': ${issues.emptyArray.length} tâches`);
  if (issues.emptyArray.length > 0) {
    console.log('   Problème: Ces tâches ont probablement eu leur dernier jalon supprimé');
    issues.emptyArray.forEach(t => {
      console.log(`   - Tâche ${t.id}: "${t.titre}"`);
    });
  }

  console.log(`\n⚠️  Objet vide '{}': ${issues.emptyObject.length} tâches`);
  console.log(`\n❓ Format invalide: ${issues.invalid.length} tâches`);
  if (issues.invalid.length > 0) {
    console.log('   Exemples de formats invalides:');
    issues.invalid.slice(0, 5).forEach(t => {
      console.log(`   - Tâche ${t.id}: "${t.titre}"`);
      console.log(`     Jalons: ${t.jalons} (${t.rawLength} caractères)`);
      if (t.error) console.log(`     Erreur: ${t.error}`);
    });
  }

  // Rechercher spécifiquement la tâche 117 mentionnée par l'utilisateur
  console.log('\n🔍 Analyse spécifique de la tâche 117:');
  const task117 = allTasks.records.find(t => t.id === 117);
  if (task117) {
    console.log(`   Titre: "${task117.fields.titre}"`);
    console.log(`   Jalons actuels: ${task117.fields.jalons || 'null'}`);
    
    if (task117.fields.notes) {
      try {
        const notesData = JSON.parse(task117.fields.notes);
        if (notesData.history) {
          const jalonActions = notesData.history.filter(e => 
            e.action === 'jalon_ajoute' || 
            e.action === 'jalon_supprime' || 
            e.action === 'jalon_timeline_removed' ||
            e.action === 'jalon_timeline_added'
          );
          console.log(`   Actions jalons dans l'historique: ${jalonActions.length}`);
          jalonActions.forEach((action, i) => {
            console.log(`     ${i+1}. ${action.timestamp} - ${action.action}: ${action.details}`);
          });
        }
      } catch (e) {
        console.log(`   Erreur parsing notes: ${e.message}`);
      }
    }
  } else {
    console.log(`   ❌ Tâche 117 non trouvée`);
  }

  // Vérifier spécifiquement les tâches avec historique de suppression de jalons
  console.log('\n🔍 Recherche des tâches avec suppression de jalons dans l\'historique:');
  
  let tasksWithJalonDeletion = [];
  for (const task of allTasks.records) {
    if (task.fields.notes) {
      try {
        const notesData = JSON.parse(task.fields.notes);
        if (notesData.history) {
          const hasJalonDeletion = notesData.history.some(entry => 
            entry.action === 'jalon_supprime' || 
            entry.action === 'jalon_timeline_removed'
          );
          
          if (hasJalonDeletion) {
            const currentJalons = task.fields.jalons || 'null';
            tasksWithJalonDeletion.push({
              id: task.id,
              titre: task.fields.titre,
              currentJalons: currentJalons.substring(0, 50) + '...',
              deletions: notesData.history.filter(e => 
                e.action === 'jalon_supprime' || 
                e.action === 'jalon_timeline_removed'
              ).length
            });
          }
        }
      } catch (e) {
        // Ignorer
      }
    }
  }

  if (tasksWithJalonDeletion.length > 0) {
    console.log(`\nTrouvé ${tasksWithJalonDeletion.length} tâches avec suppression de jalons:`);
    tasksWithJalonDeletion.forEach(t => {
      console.log(`   - Tâche ${t.id}: "${t.titre}"`);
      console.log(`     Suppressions: ${t.deletions}, Jalons actuels: ${t.currentJalons}`);
    });
  }

  // Test spécifique: simuler le problème en cherchant des tâches avec array vide mais historique
  console.log('\n🧪 Recherche de tâches avec jalons=[] mais avec historique jalons:');
  
  let problematicTasks = [];
  for (const task of allTasks.records) {
    if (task.fields.jalons && task.fields.notes) {
      try {
        const jalonsData = JSON.parse(task.fields.jalons);
        const notesData = JSON.parse(task.fields.notes);
        
        // Vérifier si: jalons array vide MAIS historique d'ajout de jalons
        if (jalonsData && 
            jalonsData.jalons && 
            Array.isArray(jalonsData.jalons) && 
            jalonsData.jalons.length === 0 &&
            notesData.history) {
          
          const hasJalonAdditions = notesData.history.some(entry => 
            entry.action === 'jalon_ajoute' || 
            entry.action === 'jalon_timeline_added'
          );
          
          if (hasJalonAdditions) {
            problematicTasks.push({
              id: task.id,
              titre: task.fields.titre,
              jalonHistory: notesData.history.filter(e => 
                e.action === 'jalon_ajoute' || 
                e.action === 'jalon_supprime' ||
                e.action === 'jalon_timeline_added' ||
                e.action === 'jalon_timeline_removed'
              )
            });
          }
        }
      } catch (e) {
        // Ignorer
      }
    }
  }

  if (problematicTasks.length > 0) {
    console.log(`\n⚠️  Trouvé ${problematicTasks.length} tâches problématiques (jalons vides mais historique d'ajout):`);
    problematicTasks.forEach(t => {
      console.log(`   - Tâche ${t.id}: "${t.titre}"`);
      console.log(`     Historique jalons: ${t.jalonHistory.length} entrées`);
      t.jalonHistory.forEach((entry, i) => {
        console.log(`       ${i+1}. ${entry.timestamp} - ${entry.action}: ${entry.details}`);
      });
    });
  } else {
    console.log('   ✅ Aucune tâche problématique trouvée.');
  }
}

// Exécuter le debug
if (require.main === module) {
  debugJalonsIssue().catch(error => {
    console.error('💥 ERREUR:', error);
    process.exit(1);
  });
}

module.exports = { debugJalonsIssue };