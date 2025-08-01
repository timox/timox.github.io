#!/usr/bin/env node
// === analyze-mandatory-fields.js ===
// Analyse des problèmes de champs obligatoires

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
 * Analyse les champs obligatoires problématiques
 */
async function analyzeMandatoryFields() {
  console.log('🔍 ANALYSE DES CHAMPS OBLIGATOIRES');
  console.log('==================================\n');

  const allTasks = await apiCall('/tables/Ssir_principale_task/records');
  
  let tasksWithIssues = [];
  
  for (const task of allTasks.records) {
    let issues = [];
    
    // Vérifier titre
    if (!task.fields.titre || task.fields.titre.trim() === '') {
      issues.push('titre manquant');
    }
    
    // Vérifier statut
    if (!task.fields.statut) {
      issues.push('statut manquant');
    }
    
    // Vérifier format bureau
    if (!Array.isArray(task.fields.bureau) || task.fields.bureau.length === 0 || task.fields.bureau[0] !== 'L') {
      issues.push('format bureau invalide');
      console.log(`❌ Tâche ${task.id}: Bureau = ${JSON.stringify(task.fields.bureau)} (${typeof task.fields.bureau})`);
    } else {
      console.log(`✅ Tâche ${task.id}: Bureau = ${JSON.stringify(task.fields.bureau)}`);
    }
    
    // Vérifier format qui
    if (!Array.isArray(task.fields.qui) || task.fields.qui.length === 0 || task.fields.qui[0] !== 'L') {
      issues.push('format qui invalide');
      console.log(`❌ Tâche ${task.id}: Qui = ${JSON.stringify(task.fields.qui)} (${typeof task.fields.qui})`);
    } else {
      console.log(`✅ Tâche ${task.id}: Qui = ${JSON.stringify(task.fields.qui)}`);
    }
    
    if (issues.length > 0) {
      tasksWithIssues.push({
        taskId: task.id,
        taskTitle: task.fields.titre || 'Sans titre',
        issues: issues,
        bureau: task.fields.bureau,
        qui: task.fields.qui
      });
    }
  }

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   Total tâches: ${allTasks.records.length}`);
  console.log(`   Tâches avec problèmes: ${tasksWithIssues.length}`);

  if (tasksWithIssues.length > 0) {
    console.log(`\n🚨 DÉTAILS DES PROBLÈMES:`);
    tasksWithIssues.forEach((task, index) => {
      console.log(`\n${index + 1}. Tâche ${task.taskId}: "${task.taskTitle}"`);
      console.log(`   Problèmes: ${task.issues.join(', ')}`);
      console.log(`   Bureau actuel: ${JSON.stringify(task.bureau)} (${typeof task.bureau})`);
      console.log(`   Qui actuel: ${JSON.stringify(task.qui)} (${typeof task.qui})`);
      
      // Proposer des corrections
      let proposedBureau = task.bureau;
      let proposedQui = task.qui;
      
      if (task.issues.includes('format bureau invalide')) {
        if (!Array.isArray(task.bureau)) {
          proposedBureau = ['L'];
        } else if (task.bureau.length === 0) {
          proposedBureau = ['L'];
        } else if (task.bureau[0] !== 'L') {
          proposedBureau = ['L', ...task.bureau];
        }
      }
      
      if (task.issues.includes('format qui invalide')) {
        if (!Array.isArray(task.qui)) {
          proposedQui = ['L'];
        } else if (task.qui.length === 0) {
          proposedQui = ['L'];
        } else if (task.qui[0] !== 'L') {
          proposedQui = ['L', ...task.qui];
        }
      }
      
      console.log(`   Bureau proposé: ${JSON.stringify(proposedBureau)}`);
      console.log(`   Qui proposé: ${JSON.stringify(proposedQui)}`);
    });
  }

  return tasksWithIssues;
}

// Exécuter l'analyse
if (require.main === module) {
  analyzeMandatoryFields().catch(error => {
    console.error('💥 ERREUR:', error);
    process.exit(1);
  });
}

module.exports = { analyzeMandatoryFields };