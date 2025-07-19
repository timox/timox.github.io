// Script direct pour exporter les données SSIR_strategie2
// À coller directement dans la console du navigateur

async function exportStrategyDataFromGrist() {
  try {
    console.log('🔄 Export des données stratégiques depuis Grist...');
    
    // Charger les données depuis Grist
    const strategyRecords = await grist.docApi.fetchTable('SSIR_strategie2');
    
    if (!strategyRecords || typeof strategyRecords !== 'object') {
      throw new Error('Impossible de charger les données depuis SSIR_strategie2');
    }
    
    // Convertir au format JavaScript
    const exportData = [];
    const ids = Object.keys(strategyRecords.id || {});
    
    ids.forEach(key => {
      const strategy = {
        id: strategyRecords.id[key],
        objectif: strategyRecords.objectif?.[key] || '',
        sous_objectif: strategyRecords.sous_objectif?.[key] || '',
        action: strategyRecords.action?.[key] || '',
        responsable: strategyRecords.responsable?.[key] || '',
        echeance: strategyRecords.echeance?.[key] || '',
        portee: strategyRecords.portee?.[key] || ''
      };
      
      // Ne garder que les stratégies complètes
      if (strategy.objectif && strategy.sous_objectif && strategy.action) {
        exportData.push(strategy);
      }
    });
    
    // Générer le code JavaScript
    const jsCode = `// === config/strategyDataHardcoded.js ===
// Données stratégiques intégrées (équivalent SSIR_strategie2)
// Exporté le ${new Date().toLocaleDateString('fr-FR')}

export const STRATEGY_DATA = ${JSON.stringify(exportData, null, 2)};

/**
 * Simule le mapping Grist pour compatibilité
 * @param {Array} data - Données stratégiques
 * @returns {Object} Format compatible avec mapStrategyRecords
 */
export function convertToGristFormat(data) {
  const gristFormat = {
    id: {},
    objectif: {},
    sous_objectif: {},
    action: {},
    responsable: {},
    echeance: {},
    portee: {}
  };
  
  data.forEach((item, index) => {
    const key = index.toString();
    gristFormat.id[key] = item.id;
    gristFormat.objectif[key] = item.objectif;
    gristFormat.sous_objectif[key] = item.sous_objectif;
    gristFormat.action[key] = item.action;
    gristFormat.responsable[key] = item.responsable;
    gristFormat.echeance[key] = item.echeance;
    gristFormat.portee[key] = item.portee;
  });
  
  return gristFormat;
}`;
    
    console.log('✅ Export terminé !');
    console.log(`📊 ${exportData.length} stratégies exportées`);
    console.log('📋 Copiez le code ci-dessous dans strategyDataHardcoded.js :');
    console.log('='.repeat(80));
    console.log(jsCode);
    console.log('='.repeat(80));
    
    // Copier dans le presse-papiers si possible
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(jsCode);
      console.log('📎 Code copié dans le presse-papiers !');
    }
    
    return {
      success: true,
      count: exportData.length,
      code: jsCode
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

console.log('🛠️ Fonction exportStrategyDataFromGrist() disponible !');
console.log('📝 Tapez : exportStrategyDataFromGrist()');