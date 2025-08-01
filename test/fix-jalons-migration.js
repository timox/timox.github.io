#!/usr/bin/env node
// === fix-jalons-migration.js ===
// Migration des jalons vers le nouveau format {jalons: [...]}

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
 * Migre les jalons vers le nouveau format
 */
async function migrateJalonsFormat() {
  console.log('🔧 MIGRATION DES JALONS');
  console.log('======================\n');

  const allTasks = await apiCall('/tables/Ssir_principale_task/records');
  
  const tasksToFix = [];
  
  for (const task of allTasks.records) {
    if (task.fields.jalons) {
      try {
        const jalonsData = JSON.parse(task.fields.jalons);
        
        let needsMigration = false;
        let newFormat = null;
        
        if (Array.isArray(jalonsData)) {
          // Ancien format: [...] -> Nouveau format: {jalons: [...]}
          needsMigration = true;
          newFormat = {
            jalons: jalonsData,
            lastModified: new Date().toISOString()
          };
          console.log(`🔄 Tâche ${task.id}: Array -> Object (${jalonsData.length} jalons)`);
        } else if (jalonsData && typeof jalonsData === 'object' && !jalonsData.hasOwnProperty('jalons')) {
          // Objet mais pas au bon format
          needsMigration = true;
          newFormat = {
            jalons: [],
            lastModified: new Date().toISOString()
          };
          console.log(`🔄 Tâche ${task.id}: Object invalide -> Object correct`);
        } else if (jalonsData && jalonsData.jalons && Array.isArray(jalonsData.jalons)) {
          // Déjà au bon format
          console.log(`✅ Tâche ${task.id}: Déjà au bon format (${jalonsData.jalons.length} jalons)`);
        } else {
          // Format inconnu
          needsMigration = true;
          newFormat = {
            jalons: [],
            lastModified: new Date().toISOString()
          };
          console.log(`❓ Tâche ${task.id}: Format inconnu -> Object correct`);
        }
        
        if (needsMigration) {
          tasksToFix.push({
            id: task.id,
            title: task.fields.titre,
            oldData: jalonsData,
            newData: newFormat
          });
        }
        
      } catch (e) {
        // JSON invalide - remplacer par structure vide
        tasksToFix.push({
          id: task.id,
          title: task.fields.titre,
          oldData: task.fields.jalons,
          newData: {
            jalons: [],
            lastModified: new Date().toISOString()
          },
          error: e.message
        });
        console.log(`❌ Tâche ${task.id}: JSON invalide -> Object correct`);
      }
    }
  }

  console.log(`\n📊 RÉSUMÉ DE LA MIGRATION:`);
  console.log(`   Tâches à corriger: ${tasksToFix.length}`);

  if (tasksToFix.length === 0) {
    console.log('✅ Aucune migration nécessaire');
    return;
  }

  // Afficher les corrections proposées
  console.log(`\n🔧 CORRECTIONS PROPOSÉES:`);
  tasksToFix.forEach((task, index) => {
    console.log(`${index + 1}. Tâche ${task.id}: "${task.title}"`);
    if (task.error) {
      console.log(`   Erreur: ${task.error}`);
    }
    console.log(`   Ancien: ${JSON.stringify(task.oldData).substring(0, 100)}...`);
    console.log(`   Nouveau: ${JSON.stringify(task.newData)}`);
    console.log('');
  });

  // Demander confirmation (en mode read-only pour l'instant)
  console.log('⚠️  MODE READ-ONLY: Les corrections ne sont pas appliquées automatiquement');
  console.log('   Pour appliquer les corrections, décommentez le code de mise à jour ci-dessous\n');

  
  // APPLICATION DES CORRECTIONS
  console.log('🚀 Application des corrections...');
  
  for (const task of tasksToFix) {
    try {
      const updatePayload = {
        records: [
          {
            id: task.id,
            fields: {
              jalons: JSON.stringify(task.newData)
            }
          }
        ]
      };

      await apiCall(`/tables/${TABLE_ID}/records`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload)
      });

      console.log(`✅ Tâche ${task.id} corrigée`);
    } catch (error) {
      console.error(`❌ Erreur tâche ${task.id}:`, error.message);
    }
  }

  console.log('\n🎉 Migration terminée');
}

// Exécuter la migration
if (require.main === module) {
  migrateJalonsFormat().catch(error => {
    console.error('💥 ERREUR:', error);
    process.exit(1);
  });
}

module.exports = { migrateJalonsFormat };