// Script de debug pour diagnostiquer les stratégies
// Exécuter dans la console navigateur : copy/paste ce code

console.log('🎯 === DEBUG STRATÉGIES ===');

// Vérifier si kanbanManager existe
if (typeof window.kanbanManager !== 'undefined') {
  console.log('✅ KanbanManager trouvé');
  
  // Récupérer les données actuelles
  const records = window.kanbanManager.currentRecords || [];
  console.log(`📊 ${records.length} tâches trouvées`);
  
  // Analyser chaque tâche pour les stratégies
  records.forEach((record, index) => {
    if (index < 5) { // Limiter aux 5 premières pour éviter le flood
      console.log(`\n🔍 TÂCHE ${record.id}: "${record.titre}"`);
      console.log('  strategie_id:', record.strategie_id);
      console.log('  strategie_objectif:', record.strategie_objectif);
      console.log('  strategiesInfo:', record.strategiesInfo);
      
      // Tester notre fonction
      if (typeof generateStrategyBadge !== 'undefined') {
        const badge = generateStrategyBadge(record);
        console.log('  🎯 Badge généré:', badge ? 'OUI' : 'NON');
      }
    }
  });
  
  // Statistiques
  const withStrategyId = records.filter(r => Array.isArray(r.strategie_id) && r.strategie_id.length > 1).length;
  const withObjectif = records.filter(r => r.strategie_objectif).length;
  const withStrategiesInfo = records.filter(r => r.strategiesInfo && r.strategiesInfo.length > 0).length;
  
  console.log('\n📈 STATISTIQUES:');
  console.log(`  Avec strategie_id: ${withStrategyId}`);
  console.log(`  Avec strategie_objectif: ${withObjectif}`);  
  console.log(`  Avec strategiesInfo: ${withStrategiesInfo}`);
  
} else {
  console.log('❌ KanbanManager non trouvé - Assurez-vous d\'être sur la page kanban');
}

console.log('\n💡 Pour voir les badges, inspectez une carte avec:');
console.log('document.querySelector(".kanban-item").innerHTML');