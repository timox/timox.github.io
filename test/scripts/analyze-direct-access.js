// === Script d'Analyse Direct - Utilise gristApp et gristDocPageModel ===

console.log('🔍 === ANALYSE DIRECTE DES DONNÉES GRIST ===');

/**
 * Analyse utilisant directement les objets Grist disponibles
 */
function analyzeDirectAccess() {
  try {
    console.log('📊 Accès direct aux données via gristDocPageModel...');
    
    if (typeof gristDocPageModel === 'undefined') {
      throw new Error('gristDocPageModel non disponible');
    }
    
    console.log('✅ gristDocPageModel trouvé');
    
    // Explorer la structure de gristDocPageModel
    console.log('🔍 Structure gristDocPageModel:');
    console.log('- gristDoc:', typeof gristDocPageModel.gristDoc);
    
    if (gristDocPageModel.gristDoc) {
      console.log('- gristDoc.docModel:', typeof gristDocPageModel.gristDoc.docModel);
      console.log('- gristDoc.getTable:', typeof gristDocPageModel.gristDoc.getTable);
      
      // Essayer d'accéder à la table
      try {
        const tableModel = gristDocPageModel.gristDoc.getTable('Ssir_principale_task');
        console.log('✅ Table Ssir_principale_task trouvée:', typeof tableModel);
        
        if (tableModel) {
          console.log('- tableModel.getAllRows:', typeof tableModel.getAllRows);
          console.log('- tableModel.getRowModel:', typeof tableModel.getRowModel);
          
          // Récupérer les données
          const allRows = tableModel.getAllRows();
          console.log(`📊 ${allRows.length} lignes trouvées`);
          
          // Analyser un échantillon
          let jalonsStats = { vide: 0, ancienFormat: 0, nouveauFormat: 0, corrompu: 0 };
          let strategiesStats = { vide: 0, ancienFormatNum: 0, ancienFormatStr: 0, nouveauFormat: 0, corrompu: 0 };
          
          const maxSample = Math.min(allRows.length, 20); // Échantillon réduit
          console.log(`🔬 Analyse d'un échantillon de ${maxSample} lignes...`);
          
          for (let i = 0; i < maxSample; i++) {
            const row = allRows[i];
            const rowModel = tableModel.getRowModel(row.id());
            
            // Analyser jalons
            try {
              const jalonsCell = rowModel.cells.jalons;
              if (jalonsCell) {
                const jalonsValue = jalonsCell.displayValue();
                console.log(`Ligne ${i}: jalons =`, jalonsValue);
                
                if (!jalonsValue || jalonsValue === '') {
                  jalonsStats.vide++;
                } else {
                  try {
                    const parsed = JSON.parse(jalonsValue);
                    if (parsed.lastModified) {
                      if (typeof parsed.lastModified === 'number') {
                        jalonsStats.ancienFormat++;
                      } else if (typeof parsed.lastModified === 'string') {
                        jalonsStats.nouveauFormat++;
                      }
                    } else {
                      jalonsStats.corrompu++;
                    }
                  } catch (e) {
                    jalonsStats.corrompu++;
                  }
                }
              } else {
                jalonsStats.vide++;
              }
            } catch (e) {
              console.log(`Erreur jalons ligne ${i}:`, e.message);
              jalonsStats.corrompu++;
            }
            
            // Analyser stratégies
            try {
              const strategieCell = rowModel.cells.strategie_id;
              if (strategieCell) {
                const strategieValue = strategieCell.displayValue();
                console.log(`Ligne ${i}: strategie_id =`, strategieValue);
                
                if (!strategieValue || strategieValue === '' || strategieValue === null) {
                  strategiesStats.vide++;
                } else if (typeof strategieValue === 'number') {
                  strategiesStats.ancienFormatNum++;
                } else if (typeof strategieValue === 'string') {
                  try {
                    const parsed = JSON.parse(strategieValue);
                    if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && parsed[0][0] === 'L') {
                      strategiesStats.nouveauFormat++;
                    } else {
                      strategiesStats.corrompu++;
                    }
                  } catch (e) {
                    strategiesStats.ancienFormatStr++;
                  }
                } else {
                  strategiesStats.corrompu++;
                }
              } else {
                strategiesStats.vide++;
              }
            } catch (e) {
              console.log(`Erreur stratégie ligne ${i}:`, e.message);
              strategiesStats.corrompu++;
            }
          }
          
          // Rapport final
          console.log('\n📊 === RAPPORT D\'ANALYSE DIRECTE ===');
          console.log(`📋 Échantillon analysé: ${maxSample} lignes sur ${allRows.length}`);
          
          console.log('\n🗓️ JALONS:');
          console.log(`   Vides: ${jalonsStats.vide}`);
          console.log(`   ❌ Ancien format: ${jalonsStats.ancienFormat}`);
          console.log(`   ✅ Nouveau format: ${jalonsStats.nouveauFormat}`);
          console.log(`   🚨 Corrompus: ${jalonsStats.corrompu}`);
          
          console.log('\n🎯 STRATÉGIES:');
          console.log(`   Vides: ${strategiesStats.vide}`);
          console.log(`   ❌ Ancien format (number): ${strategiesStats.ancienFormatNum}`);
          console.log(`   ❌ Ancien format (string): ${strategiesStats.ancienFormatStr}`);
          console.log(`   ✅ Nouveau format: ${strategiesStats.nouveauFormat}`);
          console.log(`   🚨 Corrompus: ${strategiesStats.corrompu}`);
          
          // Estimations
          const facteur = allRows.length / maxSample;
          console.log('\n📈 === ESTIMATIONS TOTALES ===');
          console.log(`🗓️ Jalons à corriger: ${Math.round((jalonsStats.ancienFormat + jalonsStats.corrompu) * facteur)}`);
          console.log(`🎯 Stratégies à corriger: ${Math.round((strategiesStats.ancienFormatNum + strategiesStats.ancienFormatStr + strategiesStats.corrompu) * facteur)}`);
          
          // Sauvegarde
          const results = {
            timestamp: new Date().toISOString(),
            totalRecords: allRows.length,
            sampledRecords: maxSample,
            jalons: jalonsStats,
            strategies: strategiesStats,
            estimations: {
              jalonsToFix: Math.round((jalonsStats.ancienFormat + jalonsStats.corrompu) * facteur),
              strategiesToFix: Math.round((strategiesStats.ancienFormatNum + strategiesStats.ancienFormatStr + strategiesStats.corrompu) * facteur)
            }
          };
          
          localStorage.setItem('gristDirectAnalysis', JSON.stringify(results));
          console.log('\n💾 Résultats sauvegardés dans localStorage.gristDirectAnalysis');
          
          return results;
        }
      } catch (e) {
        console.error('❌ Erreur accès table:', e);
      }
    }
    
    // Explorer gristApp aussi
    if (typeof gristApp !== 'undefined') {
      console.log('\n🔍 Exploration gristApp:');
      console.log('- gristApp.comm:', typeof gristApp.comm);
      console.log('- gristApp.topAppModel:', typeof gristApp.topAppModel);
      
      if (gristApp.topAppModel) {
        console.log('- topAppModel.appModel:', typeof gristApp.topAppModel.appModel);
        
        if (gristApp.topAppModel.appModel) {
          console.log('- appModel.currentDoc:', typeof gristApp.topAppModel.appModel.currentDoc);
          
          if (gristApp.topAppModel.appModel.currentDoc) {
            const currentDoc = gristApp.topAppModel.appModel.currentDoc;
            console.log('- currentDoc.tables:', typeof currentDoc.tables);
            
            if (currentDoc.tables) {
              console.log('Tables disponibles:', currentDoc.tables.all().map(t => t.tableId()));
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur analyse directe:', error);
    
    // Diagnostic complet
    console.log('\n🔍 === DIAGNOSTIC COMPLET ===');
    
    if (typeof gristDocPageModel !== 'undefined') {
      console.log('gristDocPageModel disponible:');
      Object.keys(gristDocPageModel).forEach(key => {
        console.log(`  - ${key}:`, typeof gristDocPageModel[key]);
      });
    }
    
    if (typeof gristApp !== 'undefined') {
      console.log('gristApp disponible:');
      Object.keys(gristApp).forEach(key => {
        console.log(`  - ${key}:`, typeof gristApp[key]);
      });
    }
    
    throw error;
  }
}

// Lancer l'analyse
window.analyzeDirectAccess = analyzeDirectAccess;

console.log('🚀 Lancement de l\'analyse directe...');
analyzeDirectAccess();