#!/usr/bin/env node

/**
 * 🔍 SUITE DE TESTS LECTURE SEULE - KANBAN GSSI
 * 
 * Tests automatisés en lecture seule pour éliminer les vérifications manuelles
 * OBJECTIF: Automatiser vos contrôles répétitifs sans modifier les données
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

// === TESTS DE VÉRIFICATION AUTOMATISÉS ===

async function analyzeTaskDistribution() {
  console.log('📊 Analyse: Distribution des tâches par statut');
  
  try {
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    console.log(`✅ Total: ${allTasks.records.length} tâches`);
    
    // Grouper par statut
    const byStatus = {};
    allTasks.records.forEach(task => {
      const status = task.fields.statut || 'Non défini';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
    
    console.log('📋 Répartition par statut:');
    Object.entries(byStatus)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        const percent = ((count / allTasks.records.length) * 100).toFixed(1);
        console.log(`   ${status}: ${count} tâches (${percent}%)`);
      });
    
    return { success: true, total: allTasks.records.length, distribution: byStatus };
    
  } catch (error) {
    console.log('❌ Échec analyse:', error.message);
    return { success: false, error: error.message };
  }
}

async function analyzeTeamWorkload() {
  console.log('\n👥 Analyse: Charge de travail par équipe');
  
  try {
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    
    // Analyser les bureaux
    const byBureau = {};
    allTasks.records.forEach(task => {
      const bureaux = task.fields.bureau || [];
      if (Array.isArray(bureaux) && bureaux.length > 1) {
        // Ignorer le premier élément "L" du format Grist
        bureaux.slice(1).forEach(bureau => {
          byBureau[bureau] = (byBureau[bureau] || 0) + 1;
        });
      }
    });
    
    console.log('🏢 Tâches par bureau:');
    Object.entries(byBureau)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Top 10
      .forEach(([bureau, count]) => {
        console.log(`   ${bureau}: ${count} tâches`);
      });
    
    return { success: true, workload: byBureau };
    
  } catch (error) {
    console.log('❌ Échec analyse équipes:', error.message);
    return { success: false, error: error.message };
  }
}

async function analyzePriorities() {
  console.log('\n🎯 Analyse: Priorités et urgences');
  
  try {
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    
    // Analyser urgences
    const byUrgence = {};
    const byImpact = {};
    
    allTasks.records.forEach(task => {
      const urgence = task.fields.urgence || 'Non définie';
      const impact = task.fields.impact || 'Non défini';
      
      byUrgence[urgence] = (byUrgence[urgence] || 0) + 1;
      byImpact[impact] = (byImpact[impact] || 0) + 1;
    });
    
    console.log('⚡ Par urgence:');
    Object.entries(byUrgence)
      .sort(([,a], [,b]) => b - a)
      .forEach(([urgence, count]) => {
        console.log(`   ${urgence}: ${count} tâches`);
      });
    
    console.log('💥 Par impact:');
    Object.entries(byImpact)
      .sort(([,a], [,b]) => b - a)
      .forEach(([impact, count]) => {
        console.log(`   ${impact}: ${count} tâches`);
      });
    
    // Identifier tâches critiques (urgence ET impact élevés)
    const critiques = allTasks.records.filter(task => {
      const urgence = task.fields.urgence || '';
      const impact = task.fields.impact || '';
      return (urgence.includes('Élevée') || urgence.includes('Haute')) &&
             (impact.includes('Important') || impact.includes('Critique') || impact.includes('Majeur'));
    });
    
    if (critiques.length > 0) {
      console.log(`\n🚨 ${critiques.length} tâches critiques détectées:`);
      critiques.slice(0, 5).forEach(task => {
        console.log(`   - ${task.fields.titre} (${task.fields.urgence}/${task.fields.impact})`);
      });
    }
    
    return { success: true, critiques: critiques.length, urgences: byUrgence, impacts: byImpact };
    
  } catch (error) {
    console.log('❌ Échec analyse priorités:', error.message);
    return { success: false, error: error.message };
  }
}

async function analyzeProjectProgress() {
  console.log('\n📈 Analyse: Avancement des projets');
  
  try {
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    
    // Grouper par projet
    const byProject = {};
    allTasks.records.forEach(task => {
      const projet = task.fields.projet || 'Sans projet';
      const statut = task.fields.statut || 'Non défini';
      
      if (!byProject[projet]) {
        byProject[projet] = { total: 0, terminé: 0, enCours: 0, aFaire: 0 };
      }
      
      byProject[projet].total++;
      
      if (statut === 'Terminé') byProject[projet].terminé++;
      else if (statut === 'En cours') byProject[projet].enCours++;
      else if (statut === 'À faire') byProject[projet].aFaire++;
    });
    
    console.log('📊 Avancement par projet:');
    Object.entries(byProject)
      .filter(([,stats]) => stats.total > 2) // Projets avec au moins 3 tâches
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 10)
      .forEach(([projet, stats]) => {
        const completion = ((stats.terminé / stats.total) * 100).toFixed(1);
        console.log(`   ${projet}:`);
        console.log(`     Total: ${stats.total} | Terminé: ${stats.terminé} (${completion}%) | En cours: ${stats.enCours} | À faire: ${stats.aFaire}`);
      });
    
    return { success: true, projects: byProject };
    
  } catch (error) {
    console.log('❌ Échec analyse projets:', error.message);
    return { success: false, error: error.message };
  }
}

async function analyzeDataQuality() {
  console.log('\n🔍 Analyse: Qualité des données');
  
  try {
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    
    let issues = {
      missingTitle: 0,
      missingStatus: 0,
      missingBureau: 0,
      missingResponsable: 0,
      emptyDescription: 0,
      tempRecords: 0
    };
    
    const problematicTasks = [];
    
    allTasks.records.forEach(task => {
      const fields = task.fields;
      let taskIssues = [];
      
      if (!fields.titre || fields.titre.trim() === '') {
        issues.missingTitle++;
        taskIssues.push('titre manquant');
      }
      
      if (!fields.statut) {
        issues.missingStatus++;
        taskIssues.push('statut manquant');
      }
      
      if (!fields.bureau || fields.bureau.length <= 1) {
        issues.missingBureau++;
        taskIssues.push('bureau manquant');
      }
      
      if (!fields.qui || fields.qui.length <= 1) {
        issues.missingResponsable++;
        taskIssues.push('responsable manquant');
      }
      
      if (!fields.description || fields.description.trim() === '') {
        issues.emptyDescription++;
        taskIssues.push('description vide');
      }
      
      if (fields.titre && fields.titre.includes('___TEMP_USER_RECORD___')) {
        issues.tempRecords++;
        taskIssues.push('enregistrement temporaire');
      }
      
      if (taskIssues.length > 0) {
        problematicTasks.push({
          id: task.id,
          titre: fields.titre,
          issues: taskIssues
        });
      }
    });
    
    console.log('📋 Problèmes détectés:');
    console.log(`   Titres manquants: ${issues.missingTitle}`);
    console.log(`   Statuts manquants: ${issues.missingStatus}`);
    console.log(`   Bureaux manquants: ${issues.missingBureau}`);
    console.log(`   Responsables manquants: ${issues.missingResponsable}`);
    console.log(`   Descriptions vides: ${issues.emptyDescription}`);
    console.log(`   Enregistrements temporaires: ${issues.tempRecords}`);
    
    if (problematicTasks.length > 0) {
      console.log(`\n⚠️ ${problematicTasks.length} tâches nécessitent une attention:`);
      problematicTasks.slice(0, 5).forEach(task => {
        console.log(`   ID ${task.id}: ${task.titre} (${task.issues.join(', ')})`);
      });
    }
    
    const qualityScore = ((allTasks.records.length - problematicTasks.length) / allTasks.records.length * 100).toFixed(1);
    console.log(`\n📊 Score qualité: ${qualityScore}%`);
    
    return { success: true, issues, qualityScore: parseFloat(qualityScore), problematic: problematicTasks.length };
    
  } catch (error) {
    console.log('❌ Échec analyse qualité:', error.message);
    return { success: false, error: error.message };
  }
}

// === SUITE PRINCIPALE ===

async function runReadOnlyTestSuite() {
  console.log('🔍 SUITE AUTOMATISÉE D\'ANALYSE KANBAN - LECTURE SEULE');
  console.log('='.repeat(70));
  console.log('🎯 OBJECTIF: Automatiser les contrôles et analyses répétitifs');
  console.log('📋 Document:', API_CONFIG.DOC_ID);
  console.log('');
  
  const startTime = Date.now();
  const results = [];
  
  // Analyses automatisées
  results.push(await analyzeTaskDistribution());
  results.push(await analyzeTeamWorkload());
  results.push(await analyzePriorities());
  results.push(await analyzeProjectProgress());
  results.push(await analyzeDataQuality());
  
  // Rapport final
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => r && r.success).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RAPPORT D\'ANALYSE AUTOMATISÉE');
  console.log('='.repeat(70));
  console.log(`✅ Analyses réussies: ${successful}/${total}`);
  console.log(`⏱️  Durée totale: ${duration} secondes`);
  
  // Résumé exécutif
  const distributionResult = results[0];
  const qualityResult = results[4];
  
  if (distributionResult && distributionResult.success) {
    console.log(`📈 Total tâches: ${distributionResult.total}`);
  }
  
  if (qualityResult && qualityResult.success) {
    console.log(`📊 Qualité données: ${qualityResult.qualityScore}%`);
    if (qualityResult.problematic > 0) {
      console.log(`⚠️  ${qualityResult.problematic} tâches nécessitent une attention`);
    }
  }
  
  const critiquesResult = results[2];
  if (critiquesResult && critiquesResult.success && critiquesResult.critiques > 0) {
    console.log(`🚨 ${critiquesResult.critiques} tâches critiques identifiées`);
  }
  
  console.log('\n💡 Cette analyse peut être lancée régulièrement pour:');
  console.log('   - Surveiller la charge de travail');
  console.log('   - Identifier les tâches critiques');
  console.log('   - Contrôler la qualité des données');
  console.log('   - Suivre l\'avancement des projets');
  console.log('\n💡 Commande: node readonly-test-suite.js');
  
  return { successful, total, duration, distributionResult, qualityResult };
}

// === LANCEMENT ===
if (require.main === module) {
  console.log('🚀 Démarrage de l\'analyse automatisée...\n');
  
  runReadOnlyTestSuite()
    .then(result => {
      process.exit(result.successful === result.total ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}