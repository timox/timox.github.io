#!/usr/bin/env node

/**
 * 🔍 ANALYSE DU TRACKING D'HISTORIQUE - KANBAN GSSI
 * 
 * Vérifier comment l'historique est actuellement géré
 */

const https = require('https');

const API_CONFIG = {
  HOST: 'grist.numerique.gouv.fr',
  DOC_ID: 'DOC_ID_SUPPRIME',
  API_KEY: 'IDENTIFIANT_SUPPRIME'
};

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
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function parseHistoryFromNotes(notesField) {
  if (!notesField) return null;
  
  try {
    const parsed = JSON.parse(notesField);
    if (parsed.history && Array.isArray(parsed.history)) {
      return parsed.history;
    }
  } catch (e) {
    // Si ce n'est pas du JSON valide
  }
  
  return null;
}

async function analyzeHistoryTracking() {
  console.log('🔍 ANALYSE DU TRACKING D\'HISTORIQUE');
  console.log('='.repeat(50));
  
  try {
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    console.log(`📊 Analyse de ${allTasks.records.length} tâches...\n`);
    
    let tasksWithHistory = 0;
    let totalHistoryEntries = 0;
    let statusChangeEntries = 0;
    let fieldChangeEntries = 0;
    let commentEntries = 0;
    
    const historyAnalysis = [];
    
    allTasks.records.forEach(task => {
      const history = parseHistoryFromNotes(task.fields.notes);
      
      if (history && history.length > 0) {
        tasksWithHistory++;
        totalHistoryEntries += history.length;
        
        const taskAnalysis = {
          id: task.id,
          titre: task.fields.titre,
          statut: task.fields.statut,
          historyCount: history.length,
          statusChanges: 0,
          fieldChanges: 0,
          comments: 0,
          entries: []
        };
        
        history.forEach(entry => {
          const entryInfo = {
            timestamp: entry.timestamp,
            user: entry.user,
            action: entry.action,
            details: entry.details
          };
          
          if (entry.action === 'status_change') {
            statusChangeEntries++;
            taskAnalysis.statusChanges++;
          } else if (entry.action === 'field_change') {
            fieldChangeEntries++;
            taskAnalysis.fieldChanges++;
          } else if (entry.action === 'comment') {
            commentEntries++;
            taskAnalysis.comments++;
          }
          
          taskAnalysis.entries.push(entryInfo);
        });
        
        historyAnalysis.push(taskAnalysis);
      }
    });
    
    console.log('📊 STATISTIQUES GÉNÉRALES:');
    console.log('='.repeat(30));
    console.log(`Tâches avec historique: ${tasksWithHistory}/${allTasks.records.length}`);
    console.log(`Total entrées d'historique: ${totalHistoryEntries}`);
    console.log(`Changements de statut: ${statusChangeEntries}`);
    console.log(`Changements de champs: ${fieldChangeEntries}`);
    console.log(`Commentaires: ${commentEntries}`);
    
    console.log('\n🔍 TYPES D\'ACTIONS DANS L\'HISTORIQUE:');
    console.log('='.repeat(40));
    
    const actionTypes = {};
    historyAnalysis.forEach(task => {
      task.entries.forEach(entry => {
        actionTypes[entry.action] = (actionTypes[entry.action] || 0) + 1;
      });
    });
    
    Object.entries(actionTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([action, count]) => {
        console.log(`${action}: ${count} entrées`);
      });
    
    if (statusChangeEntries === 0) {
      console.log('\n🚨 PROBLÈME IDENTIFIÉ:');
      console.log('='.repeat(25));
      console.log('❌ AUCUN changement de statut tracé dans l\'historique !');
      console.log('💡 Les changements de statut ne sont pas enregistrés');
    } else {
      console.log('\n✅ Changements de statut tracés:');
      console.log(`   ${statusChangeEntries} changements enregistrés`);
    }
    
    // Afficher quelques exemples d'historique
    const tasksWithMostHistory = historyAnalysis
      .sort((a, b) => b.historyCount - a.historyCount)
      .slice(0, 3);
    
    if (tasksWithMostHistory.length > 0) {
      console.log('\n📝 EXEMPLES D\'HISTORIQUE (Top 3):');
      console.log('='.repeat(35));
      
      tasksWithMostHistory.forEach((task, index) => {
        console.log(`\n${index + 1}. ${task.titre} (ID: ${task.id})`);
        console.log(`   ${task.historyCount} entrées | Status: ${task.statusChanges} | Fields: ${task.fieldChanges} | Comments: ${task.comments}`);
        
        // Afficher les 3 dernières entrées
        task.entries.slice(-3).forEach(entry => {
          const date = new Date(entry.timestamp).toLocaleDateString('fr-FR');
          console.log(`   - ${date} | ${entry.action} | ${entry.user}`);
          if (entry.details && entry.details.length < 100) {
            console.log(`     ${entry.details}`);
          }
        });
      });
    }
    
    // Vérifier le champ statut_precedent
    console.log('\n🔍 VÉRIFICATION CHAMP statut_precedent:');
    console.log('='.repeat(40));
    
    let tasksWithPreviousStatus = 0;
    allTasks.records.forEach(task => {
      if (task.fields.statut_precedent && task.fields.statut_precedent.trim() !== '') {
        tasksWithPreviousStatus++;
      }
    });
    
    console.log(`Tâches avec statut_precedent: ${tasksWithPreviousStatus}/${allTasks.records.length}`);
    
    if (tasksWithPreviousStatus === 0) {
      console.log('❌ Le champ statut_precedent n\'est pas utilisé');
    }
    
    return {
      success: true,
      tasksWithHistory,
      totalEntries: totalHistoryEntries,
      statusChanges: statusChangeEntries,
      fieldChanges: fieldChangeEntries,
      comments: commentEntries,
      actionTypes
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
    return { success: false, error: error.message };
  }
}

// === LANCEMENT ===
if (require.main === module) {
  analyzeHistoryTracking();
}