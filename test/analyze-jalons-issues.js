#!/usr/bin/env node
// === analyze-jalons-issues.js ===
// Analyse des problèmes de jalons détectés par la suite de régression

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
 * Analyse les jalons problématiques
 */
async function analyzeJalonsIssues() {
  console.log('🔍 ANALYSE DES PROBLÈMES DE JALONS');
  console.log('==================================\n');

  const allTasks = await apiCall('/tables/Ssir_principale_task/records');
  
  let tasksWithJalons = 0;
  let validJalonsFormat = 0;
  let invalidJalonsFormat = 0;
  let jalonsProblems = [];

  for (const task of allTasks.records) {
    if (task.fields.jalons) {
      tasksWithJalons++;
      
      try {
        const jalonsData = JSON.parse(task.fields.jalons);
        
        if (jalonsData && jalonsData.jalons && Array.isArray(jalonsData.jalons)) {
          validJalonsFormat++;
          console.log(`✅ Tâche ${task.id}: "${task.fields.titre}" - ${jalonsData.jalons.length} jalons`);
        } else {
          invalidJalonsFormat++;
          jalonsProblems.push({
            taskId: task.id,
            taskTitle: task.fields.titre,
            issue: 'Structure jalons invalide',
            data: jalonsData,
            rawData: task.fields.jalons.substring(0, 200) + '...'
          });
          console.log(`❌ Tâche ${task.id}: "${task.fields.titre}" - Structure invalide`);
        }
        
      } catch (e) {
        invalidJalonsFormat++;
        jalonsProblems.push({
          taskId: task.id,
          taskTitle: task.fields.titre,
          issue: 'JSON parse error',
          error: e.message,
          rawData: task.fields.jalons.substring(0, 200) + '...'
        });
        console.log(`❌ Tâche ${task.id}: "${task.fields.titre}" - Erreur JSON: ${e.message}`);
      }
    }
  }

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   Tâches avec jalons: ${tasksWithJalons}`);
  console.log(`   Format valide: ${validJalonsFormat}`);
  console.log(`   Format invalide: ${invalidJalonsFormat}`);

  if (jalonsProblems.length > 0) {
    console.log(`\n🚨 DÉTAILS DES PROBLÈMES:`);
    jalonsProblems.forEach((problem, index) => {
      console.log(`\n${index + 1}. Tâche ${problem.taskId}: "${problem.taskTitle}"`);
      console.log(`   Problème: ${problem.issue}`);
      if (problem.error) {
        console.log(`   Erreur: ${problem.error}`);
      }
      if (problem.data) {
        console.log(`   Données parsées:`, problem.data);
      }
      console.log(`   Données brutes: ${problem.rawData}`);
    });

    // Proposer des corrections
    console.log(`\n🔧 PROPOSITIONS DE CORRECTION:`);
    jalonsProblems.forEach((problem, index) => {
      if (problem.issue === 'JSON parse error') {
        console.log(`${index + 1}. Tâche ${problem.taskId}: Corriger le JSON malformé`);
      } else if (problem.issue === 'Structure jalons invalide') {
        console.log(`${index + 1}. Tâche ${problem.taskId}: Convertir au format {jalons: [...]}`);
      }
    });
  }
}

// Exécuter l'analyse
if (require.main === module) {
  analyzeJalonsIssues().catch(error => {
    console.error('💥 ERREUR:', error);
    process.exit(1);
  });
}

module.exports = { analyzeJalonsIssues };