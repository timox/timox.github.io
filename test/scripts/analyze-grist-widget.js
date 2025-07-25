// === Script d'Analyse Simplifié pour Widget Grist ===
// Version adaptée aux contraintes du widget Grist

console.log('🔍 === ANALYSE DES DONNÉES GRIST (Widget) ===');

/**
 * Analyse simplifiée pour environnement widget
 */
async function analyzeGristDataWidget() {
  try {
    console.log('📊 Récupération des données depuis le widget...');
    
    // Essayer différentes méthodes d'accès aux données Grist
    let gristData;
    
    // Méthode 1: Via grist.selectedTable si disponible
    if (typeof grist !== 'undefined' && grist.selectedTable) {
      console.log('🔄 Tentative via grist.selectedTable...');
      gristData = await grist.selectedTable.fetchSelectedTable();
    }
    // Méthode 2: Via grist.getTable si disponible  
    else if (typeof grist !== 'undefined' && grist.getTable) {
      console.log('🔄 Tentative via grist.getTable...');
      gristData = await grist.getTable('Ssir_principale_task');
    }
    // Méthode 3: Via l'API minimale disponible
    else if (typeof grist !== 'undefined' && grist.ready) {
      console.log('🔄 Tentative via grist.ready...');
      await grist.ready();
      gristData = await grist.docApi.fetchTable('Ssir_principale_task');
    }
    else {
      throw new Error('Aucune méthode d\'accès Grist disponible dans ce widget');
    }
    
    if (!gristData || !gristData.id) {
      console.log('⚠️ Essai d\'une approche alternative...');
      
      // Alternative: utiliser les données visibles dans le widget
      if (typeof gristDocPageModel !== 'undefined') {
        console.log('🔄 Tentative via gristDocPageModel...');
        const tableModel = gristDocPageModel.gristDoc.getTable('Ssir_principale_task');
        if (tableModel) {
          // Créer une structure de données similaire
          gristData = {
            id: [],
            jalons: [],
            strategie_id: []
          };
          
          // Récupérer les données ligne par ligne
          const rowIds = tableModel.getAllRows().map(r => r.id());
          for (const rowId of rowIds) {
            const row = tableModel.getRowModel(rowId);
            gristData.id.push(rowId);
            gristData.jalons.push(row.cells.jalons ? row.cells.jalons.displayValue() : '');
            gristData.strategie_id.push(row.cells.strategie_id ? row.cells.strategie_id.displayValue() : '');
          }
        }
      }
    }
    
    if (!gristData || !gristData.id) {
      throw new Error('Impossible de récupérer les données dans cet environnement widget');
    }
    
    const totalRecords = gristData.id.length;
    console.log(`✅ ${totalRecords} enregistrements trouvés`);
    
    // === ANALYSE SIMPLIFIÉE JALONS ===
    console.log('\n🗓️ === ANALYSE COLONNE JALONS ===');
    
    let jalonsVides = 0;
    let jalonsAncienFormat = 0;
    let jalonsNouveauFormat = 0;
    let jalonsCorrompus = 0;
    let jalonsAvecDonnees = 0;
    
    for (let i = 0; i < Math.min(totalRecords, 50); i++) { // Limiter à 50 pour éviter les timeouts
      const jalons = gristData.jalons[i];
      
      if (!jalons || jalons === '') {
        jalonsVides++;
        continue;
      }
      
      jalonsAvecDonnees++;
      
      try {
        const parsed = JSON.parse(jalons);
        if (parsed.lastModified) {
          if (typeof parsed.lastModified === 'number') {
            jalonsAncienFormat++;
          } else if (typeof parsed.lastModified === 'string') {
            jalonsNouveauFormat++;
          }
        } else {
          jalonsCorrompus++;
        }
      } catch (e) {
        jalonsCorrompus++;
      }
    }
    
    // === ANALYSE SIMPLIFIÉE STRATÉGIES ===
    console.log('\n🎯 === ANALYSE COLONNE STRATEGIE_ID ===');
    
    let strategiesVides = 0;
    let strategiesAncienFormatNumber = 0;
    let strategiesAncienFormatString = 0;
    let strategiesNouveauFormat = 0;
    let strategiesCorrompues = 0;
    let strategiesAvecDonnees = 0;
    
    for (let i = 0; i < Math.min(totalRecords, 50); i++) { // Limiter à 50 pour éviter les timeouts
      const strategie = gristData.strategie_id[i];
      
      if (!strategie || strategie === '' || strategie === null) {
        strategiesVides++;
        continue;
      }
      
      strategiesAvecDonnees++;
      
      if (typeof strategie === 'number') {
        strategiesAncienFormatNumber++;
      } else if (typeof strategie === 'string') {
        try {
          const parsed = JSON.parse(strategie);
          if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && parsed[0][0] === 'L') {
            strategiesNouveauFormat++;
          } else {
            strategiesCorrompues++;
          }
        } catch (e) {
          strategiesAncienFormatString++;
        }
      } else {
        strategiesCorrompues++;
      }
    }
    
    // === RAPPORT SIMPLIFIÉ ===
    console.log('\n📊 === RAPPORT D\'ANALYSE (ÉCHANTILLON) ===');
    console.log(`📋 Analysé: ${Math.min(totalRecords, 50)} enregistrements sur ${totalRecords}`);
    
    console.log('\n🗓️ JALONS:');
    console.log(`   Avec données: ${jalonsAvecDonnees}`);
    console.log(`   Vides: ${jalonsVides}`);
    console.log(`   ❌ Ancien format: ${jalonsAncienFormat}`);
    console.log(`   ✅ Nouveau format: ${jalonsNouveauFormat}`);
    console.log(`   🚨 Corrompus: ${jalonsCorrompus}`);
    
    console.log('\n🎯 STRATÉGIES:');
    console.log(`   Avec données: ${strategiesAvecDonnees}`);
    console.log(`   Vides: ${strategiesVides}`);
    console.log(`   ❌ Ancien format (number): ${strategiesAncienFormatNumber}`);
    console.log(`   ❌ Ancien format (string): ${strategiesAncienFormatString}`);
    console.log(`   ✅ Nouveau format: ${strategiesNouveauFormat}`);
    console.log(`   🚨 Corrompus: ${strategiesCorrompues}`);
    
    // === ESTIMATIONS ===
    const facteurMultiplicateur = totalRecords / Math.min(totalRecords, 50);
    
    console.log('\n📈 === ESTIMATIONS TOTALES ===');
    console.log(`🗓️ Jalons à corriger (estimation): ${Math.round((jalonsAncienFormat + jalonsCorrompus) * facteurMultiplicateur)}`);
    console.log(`🎯 Stratégies à corriger (estimation): ${Math.round((strategiesAncienFormatNumber + strategiesAncienFormatString + strategiesCorrompues) * facteurMultiplicateur)}`);
    
    if ((jalonsAncienFormat + jalonsCorrompus + strategiesAncienFormatNumber + strategiesAncienFormatString + strategiesCorrompues) === 0) {
      console.log('\n✅ AUCUNE CORRECTION NÉCESSAIRE dans l\'échantillon analysé !');
    } else {
      console.log('\n⚠️ Des corrections semblent nécessaires. Utilisez le script de correction.');
    }
    
    // === SAUVEGARDE RÉSULTATS ===
    const results = {
      timestamp: new Date().toISOString(),
      totalRecords,
      sampledRecords: Math.min(totalRecords, 50),
      jalons: {
        avecDonnees: jalonsAvecDonnees,
        vides: jalonsVides,
        ancienFormat: jalonsAncienFormat,
        nouveauFormat: jalonsNouveauFormat,
        corrompus: jalonsCorrompus
      },
      strategies: {
        avecDonnees: strategiesAvecDonnees,
        vides: strategiesVides,
        ancienFormatNumber: strategiesAncienFormatNumber,
        ancienFormatString: strategiesAncienFormatString,
        nouveauFormat: strategiesNouveauFormat,
        corrompus: strategiesCorrompues
      },
      estimations: {
        jalonsToFix: Math.round((jalonsAncienFormat + jalonsCorrompus) * facteurMultiplicateur),
        strategiesToFix: Math.round((strategiesAncienFormatNumber + strategiesAncienFormatString + strategiesCorrompues) * facteurMultiplicateur)
      }
    };
    
    localStorage.setItem('gristDataAnalysisWidget', JSON.stringify(results));
    console.log('\n💾 Résultats sauvegardés dans localStorage.gristDataAnalysisWidget');
    
    return results;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse widget:', error);
    
    // Diagnostic des APIs disponibles
    console.log('\n🔍 === DIAGNOSTIC DES APIS DISPONIBLES ===');
    console.log('typeof grist:', typeof grist);
    console.log('typeof gristApp:', typeof gristApp);
    console.log('typeof gristDocPageModel:', typeof gristDocPageModel);
    
    if (typeof grist !== 'undefined') {
      console.log('grist.docApi:', typeof grist.docApi);
      console.log('grist.selectedTable:', typeof grist.selectedTable);
      console.log('grist.getTable:', typeof grist.getTable);
      console.log('grist.ready:', typeof grist.ready);
    }
    
    throw error;
  }
}

// Rendre la fonction disponible globalement
window.analyzeGristDataWidget = analyzeGristDataWidget;

// Lancement conditionnel
if (typeof grist !== 'undefined' || typeof gristDocPageModel !== 'undefined') {
  console.log('🚀 Lancement de l\'analyse widget...');
  analyzeGristDataWidget().then(() => {
    console.log('✅ Analyse widget terminée !');
  }).catch(error => {
    console.error('❌ Échec de l\'analyse widget:', error);
  });
} else {
  console.log('⚠️ APIs Grist non détectées. Lancez manuellement: analyzeGristDataWidget()');
}