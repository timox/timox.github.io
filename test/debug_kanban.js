// === Script de diagnostic Kanban ===
// Utilise ce script dans la console pour diagnostiquer les problèmes

console.log('=== DIAGNOSTIC KANBAN COMPLET ===');

// 1. Vérifier la présence de Grist
console.log('1. GRIST API:');
console.log('  - grist disponible:', typeof grist !== 'undefined');
console.log('  - grist.ready:', typeof grist?.ready);
console.log('  - grist.onRecords:', typeof grist?.onRecords);

// 2. Vérifier l'état du KanbanManager
console.log('\n2. KANBAN MANAGER:');
console.log('  - kanbanManager existe:', !!window.kanbanManager);
if (window.kanbanManager) {
  console.log('  - isInitialized:', window.kanbanManager.isInitialized);
  console.log('  - records length:', window.kanbanManager.currentRecords?.length || 0);
  console.log('  - gristManager connecté:', window.kanbanManager.gristManager?.isConnected);
  console.log('  - records sample:', window.kanbanManager.currentRecords?.slice(0, 3));
}

// 3. Vérifier l'initializer
console.log('\n3. APP INITIALIZER:');
console.log('  - initializer existe:', !!window.kanbanAppInitializer);
if (window.kanbanAppInitializer) {
  console.log('  - isInitialized:', window.kanbanAppInitializer.isInitialized);
  console.log('  - components:', Object.keys(window.kanbanAppInitializer.components || {}));
}

// 4. Vérifier les éléments DOM
console.log('\n4. ÉLÉMENTS DOM:');
console.log('  - kanban-container:', !!document.getElementById('kanban-container'));
console.log('  - colonnes kanban:', document.querySelectorAll('.kanban-column').length);
console.log('  - cartes tâches:', document.querySelectorAll('.task-card').length);

// 5. Vérifier les erreurs dans la console
console.log('\n5. DIAGNOSTIC AUTOMATIQUE:');

// Test de chargement des données
if (window.kanbanManager?.gristManager) {
  console.log('  - Test reload des données...');
  window.kanbanManager.gristManager.reloadData()
    .then(() => {
      console.log('  ✅ Reload réussi, nouvelles données:', window.kanbanManager.currentRecords?.length);
    })
    .catch(err => {
      console.log('  ❌ Erreur reload:', err);
    });
}

// 6. Test de rechargement manuel
console.log('\n6. ACTIONS DE RÉCUPÉRATION:');
console.log('Pour recharger manuellement:');
console.log('  window.kanbanManager?.refreshKanban()');
console.log('  window.KanbanAPI?.refresh()');

// 7. Fonction de récupération d'urgence
window.debugKanbanRecover = function() {
  console.log('🚨 RÉCUPÉRATION D\'URGENCE');
  
  if (window.kanbanManager?.gristManager?.currentRecords?.length > 2) {
    console.log('✅ Données disponibles, forcer le rendu...');
    window.kanbanManager.refreshKanban();
    return true;
  }
  
  console.log('❌ Pas de données, redémarrage complet nécessaire');
  location.reload();
  return false;
};

console.log('\n💡 Utilisez debugKanbanRecover() pour tenter une récupération');