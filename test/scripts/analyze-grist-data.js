// === Script d'Analyse des Données Grist ===
// Analyse les colonnes jalons et strategie_id pour identifier les données à corriger

console.log('🔍 === ANALYSE DES DONNÉES GRIST ===');

/**
 * Analyse les données Grist pour identifier les formats problématiques
 */
async function analyzeGristData() {
  try {
    console.log('📊 Récupération des données depuis Grist...');
    
    // Récupérer toutes les données
    const gristData = await grist.docApi.fetchTable('Ssir_principale_task');
    
    const totalRecords = gristData.id.length;
    console.log(`✅ ${totalRecords} enregistrements trouvés`);
    
    // === ANALYSE COLONNE JALONS ===
    console.log('\n🗓️ === ANALYSE COLONNE JALONS ===');
    
    const jalonsAnalysis = {
      total: 0,
      vides: 0,
      ancienFormat: 0,
      nouveauFormat: 0,
      corrompus: 0,
      exemples: {
        ancienFormat: [],
        nouveauFormat: [],
        corrompus: []
      }
    };
    
    for (let i = 0; i < totalRecords; i++) {
      const taskId = gristData.id[i];
      const jalons = gristData.jalons[i];
      
      if (!jalons || jalons === '') {
        jalonsAnalysis.vides++;
        continue;
      }
      
      jalonsAnalysis.total++;
      
      try {
        const parsed = JSON.parse(jalons);
        
        if (parsed.lastModified) {
          if (typeof parsed.lastModified === 'number') {
            // Ancien format timestamp numérique
            jalonsAnalysis.ancienFormat++;
            if (jalonsAnalysis.exemples.ancienFormat.length < 3) {
              jalonsAnalysis.exemples.ancienFormat.push({
                taskId,
                data: jalons,
                timestamp: parsed.lastModified
              });
            }
          } else if (typeof parsed.lastModified === 'string') {
            // Nouveau format ISO string
            jalonsAnalysis.nouveauFormat++;
            if (jalonsAnalysis.exemples.nouveauFormat.length < 3) {
              jalonsAnalysis.exemples.nouveauFormat.push({
                taskId,
                data: jalons,
                timestamp: parsed.lastModified
              });
            }
          }
        } else {
          // Format sans lastModified ou autre
          jalonsAnalysis.corrompus++;
          if (jalonsAnalysis.exemples.corrompus.length < 3) {
            jalonsAnalysis.exemples.corrompus.push({
              taskId,
              data: jalons
            });
          }
        }
      } catch (e) {
        // JSON invalide
        jalonsAnalysis.corrompus++;
        if (jalonsAnalysis.exemples.corrompus.length < 3) {
          jalonsAnalysis.exemples.corrompus.push({
            taskId,
            data: jalons,
            error: e.message
          });
        }
      }
    }
    
    // === ANALYSE COLONNE STRATEGIE_ID ===
    console.log('\n🎯 === ANALYSE COLONNE STRATEGIE_ID ===');
    
    const strategiesAnalysis = {
      total: 0,
      vides: 0,
      ancienFormatString: 0,
      ancienFormatNumber: 0,
      nouveauFormat: 0,
      corrompus: 0,
      exemples: {
        ancienFormatString: [],
        ancienFormatNumber: [],
        nouveauFormat: [],
        corrompus: []
      }
    };
    
    for (let i = 0; i < totalRecords; i++) {
      const taskId = gristData.id[i];
      const strategie = gristData.strategie_id[i];
      
      if (!strategie || strategie === '' || strategie === null) {
        strategiesAnalysis.vides++;
        continue;
      }
      
      strategiesAnalysis.total++;
      
      if (typeof strategie === 'number') {
        // Ancien format: ID numérique simple
        strategiesAnalysis.ancienFormatNumber++;
        if (strategiesAnalysis.exemples.ancienFormatNumber.length < 3) {
          strategiesAnalysis.exemples.ancienFormatNumber.push({
            taskId,
            data: strategie
          });
        }
      } else if (typeof strategie === 'string') {
        try {
          const parsed = JSON.parse(strategie);
          if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && parsed[0][0] === 'L') {
            // Nouveau format: références multiples Grist
            strategiesAnalysis.nouveauFormat++;
            if (strategiesAnalysis.exemples.nouveauFormat.length < 3) {
              strategiesAnalysis.exemples.nouveauFormat.push({
                taskId,
                data: strategie,
                parsed: parsed
              });
            }
          } else {
            // Format corrompu
            strategiesAnalysis.corrompus++;
            if (strategiesAnalysis.exemples.corrompus.length < 3) {
              strategiesAnalysis.exemples.corrompus.push({
                taskId,
                data: strategie,
                parsed: parsed
              });
            }
          }
        } catch (e) {
          // String simple (ancien format)
          strategiesAnalysis.ancienFormatString++;
          if (strategiesAnalysis.exemples.ancienFormatString.length < 3) {
            strategiesAnalysis.exemples.ancienFormatString.push({
              taskId,
              data: strategie
            });
          }
        }
      } else {
        // Type inattendu
        strategiesAnalysis.corrompus++;
        if (strategiesAnalysis.exemples.corrompus.length < 3) {
          strategiesAnalysis.exemples.corrompus.push({
            taskId,
            data: strategie,
            type: typeof strategie
          });
        }
      }
    }
    
    // === RAPPORT FINAL ===
    console.log('\n📊 === RAPPORT D\'ANALYSE ===');
    
    console.log('\n🗓️ JALONS:');
    console.log(`   Total avec jalons: ${jalonsAnalysis.total}`);
    console.log(`   Vides: ${jalonsAnalysis.vides}`);
    console.log(`   ❌ Ancien format (timestamp numérique): ${jalonsAnalysis.ancienFormat}`);
    console.log(`   ✅ Nouveau format (ISO string): ${jalonsAnalysis.nouveauFormat}`);
    console.log(`   🚨 Corrompus/invalides: ${jalonsAnalysis.corrompus}`);
    
    if (jalonsAnalysis.exemples.ancienFormat.length > 0) {
      console.log('\n   📝 Exemples ancien format:');
      jalonsAnalysis.exemples.ancienFormat.forEach(ex => {
        console.log(`      Tâche ${ex.taskId}: timestamp ${ex.timestamp}`);
      });
    }
    
    console.log('\n🎯 STRATÉGIES:');
    console.log(`   Total avec stratégies: ${strategiesAnalysis.total}`);
    console.log(`   Vides: ${strategiesAnalysis.vides}`);
    console.log(`   ❌ Ancien format (string): ${strategiesAnalysis.ancienFormatString}`);
    console.log(`   ❌ Ancien format (number): ${strategiesAnalysis.ancienFormatNumber}`);
    console.log(`   ✅ Nouveau format (références multiples): ${strategiesAnalysis.nouveauFormat}`);
    console.log(`   🚨 Corrompus/invalides: ${strategiesAnalysis.corrompus}`);
    
    if (strategiesAnalysis.exemples.ancienFormatNumber.length > 0) {
      console.log('\n   📝 Exemples ancien format (numbers):');
      strategiesAnalysis.exemples.ancienFormatNumber.forEach(ex => {
        console.log(`      Tâche ${ex.taskId}: stratégie ID ${ex.data}`);
      });
    }
    
    if (strategiesAnalysis.exemples.ancienFormatString.length > 0) {
      console.log('\n   📝 Exemples ancien format (strings):');
      strategiesAnalysis.exemples.ancienFormatString.forEach(ex => {
        console.log(`      Tâche ${ex.taskId}: stratégie "${ex.data}"`);
      });
    }
    
    // === RECOMMANDATIONS ===
    console.log('\n🎯 === RECOMMANDATIONS ===');
    
    const needsJalonsFix = jalonsAnalysis.ancienFormat + jalonsAnalysis.corrompus;
    const needsStrategiesFix = strategiesAnalysis.ancienFormatString + strategiesAnalysis.ancienFormatNumber + strategiesAnalysis.corrompus;
    
    if (needsJalonsFix === 0 && needsStrategiesFix === 0) {
      console.log('✅ AUCUNE CORRECTION NÉCESSAIRE - Toutes les données sont au bon format !');
    } else {
      console.log(`⚠️ CORRECTIONS RECOMMANDÉES:`);
      
      if (needsJalonsFix > 0) {
        console.log(`   📅 ${needsJalonsFix} jalons à convertir (timestamp → ISO date)`);
      }
      
      if (needsStrategiesFix > 0) {
        console.log(`   🎯 ${needsStrategiesFix} stratégies à convertir (ID simple → références multiples)`);
      }
      
      console.log('\n💡 Utilisez le script de correction pour migrer ces données.');
    }
    
    // === EXPORT DES RÉSULTATS ===
    const results = {
      timestamp: new Date().toISOString(),
      totalRecords,
      jalons: jalonsAnalysis,
      strategies: strategiesAnalysis,
      needsCorrection: needsJalonsFix > 0 || needsStrategiesFix > 0
    };
    
    // Exporter vers le localStorage pour utilisation ultérieure
    localStorage.setItem('gristDataAnalysis', JSON.stringify(results));
    console.log('\n💾 Résultats sauvegardés dans localStorage.gristDataAnalysis');
    
    return results;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    throw error;
  }
}

/**
 * Fonction d'aide pour lancer l'analyse depuis la console
 */
window.analyzeGristData = analyzeGristData;

// Auto-lancement si ce script est exécuté directement
if (typeof grist !== 'undefined') {
  console.log('🚀 Lancement automatique de l\'analyse...');
  analyzeGristData().then(() => {
    console.log('✅ Analyse terminée ! Consultez les résultats ci-dessus.');
  }).catch(error => {
    console.error('❌ Échec de l\'analyse:', error);
  });
} else {
  console.log('⚠️ Grist API non disponible. Lancez ce script depuis l\'interface Kanban.');
  console.log('💡 Ou utilisez: analyzeGristData() depuis la console navigateur.');
}