#!/usr/bin/env node
// === debug-frontend-jalons.js ===
// Debug de la logique frontend des jalons

/**
 * Simulation de la logique frontend des jalons
 */

// Simuler JalonManager.getJalonsForSave()
function simulateGetJalonsForSave(jalons) {
  console.log(`🔍 getJalonsForSave: ${jalons?.length || 0} jalons en mémoire`);
  console.log(`   Jalons:`, jalons?.map(j => ({ id: j.id, titre: j.titre })) || []);
  
  // IMPORTANT: Même si pas de jalons, retourner la structure vide pour bien nettoyer la DB
  const jalonsData = {
    jalons: jalons || [],
    lastModified: new Date().toISOString()
  };
  
  const jsonString = JSON.stringify(jalonsData);
  console.log(`💾 getJalonsForSave - Retour:`, jsonString);
  
  // Retourner la string JSON directement pour Grist
  return jsonString;
}

// Simuler ModalManager.collectFormData()
function simulateCollectFormData(jalonManagerData) {
  const data = {
    titre: 'Test Task',
    statut: 'A faire',
    jalons: jalonManagerData // Récupéré via this.kanban.jalonManager.getJalonsForSave()
  };
  
  console.log(`🔍 collectFormData - jalons:`, data.jalons);
  console.log(`   Type:`, typeof data.jalons);
  
  return data;
}

// Simuler ModalManager.prepareTaskDataForGrist()
function simulatePrepareTaskDataForGrist(formData) {
  console.log('🔍 DEBUG prepareTaskDataForGrist - jalons:', formData.jalons);
  console.log('   Type:', typeof formData.jalons);
  console.log('   Valeur brute:', formData.jalons);
  
  if (formData.jalons !== null && formData.jalons !== undefined) {
    if (typeof formData.jalons !== 'string') {
      console.log('⚠️ Jalons pas au format string, conversion...');
      formData.jalons = JSON.stringify(formData.jalons || []);
    }
    console.log('✅ Jalons après traitement:', formData.jalons);
  } else {
    console.log('❌ Jalons null/undefined, valeur par défaut');
    formData.jalons = '{"jalons":[],"lastModified":0}'; // Valeur par défaut
  }
  
  return formData;
}

/**
 * Test des scénarios
 */
function debugFrontendJalons() {
  console.log('🧪 DEBUG LOGIQUE FRONTEND JALONS');
  console.log('=================================\n');

  // Scénario 1: Jalons présents
  console.log('📝 Scénario 1: Tâche avec jalons');
  const jalonsWithData = [
    { id: 'j1', titre: 'Jalon 1', date: '2025-08-01', type: 'livraison', statut: 'planifie' },
    { id: 'j2', titre: 'Jalon 2', date: '2025-08-15', type: 'validation', statut: 'planifie' }
  ];
  
  const jalonDataString = simulateGetJalonsForSave(jalonsWithData);
  const formDataWithJalons = simulateCollectFormData(jalonDataString);
  const gristDataWithJalons = simulatePrepareTaskDataForGrist(formDataWithJalons);
  
  console.log('📊 Résultat final pour Grist:', gristDataWithJalons.jalons);
  console.log('');
  
  // Scénario 2: Jalons supprimés (array vide)
  console.log('📝 Scénario 2: Tâche avec jalons supprimés (array vide)');
  const jalonsEmpty = [];
  
  const emptyJalonDataString = simulateGetJalonsForSave(jalonsEmpty);
  const formDataEmpty = simulateCollectFormData(emptyJalonDataString);
  const gristDataEmpty = simulatePrepareTaskDataForGrist(formDataEmpty);
  
  console.log('📊 Résultat final pour Grist:', gristDataEmpty.jalons);
  console.log('');
  
  // Scénario 3: JalonManager null (pas de gestionnaire)
  console.log('📝 Scénario 3: JalonManager non disponible');
  const formDataNull = simulateCollectFormData(null);
  const gristDataNull = simulatePrepareTaskDataForGrist(formDataNull);
  
  console.log('📊 Résultat final pour Grist:', gristDataNull.jalons);
  console.log('');

  // Scénario 4: Vérifier si un jalon reste "en mémoire" mais n'est pas sauvegardé
  console.log('📝 Scénario 4: Simulation bug - jalon en mémoire mais pas dans getJalonsForSave()');
  
  // Simuler que JalonManager a des jalons en mémoire
  const jalonsInMemory = [
    { id: 'phantom', titre: 'Jalon Fantôme', date: '2025-08-01', type: 'livraison', statut: 'planifie' }
  ];
  console.log('   🧠 Jalons en mémoire JalonManager:', jalonsInMemory.map(j => j.titre));
  
  // Mais getJalonsForSave() retourne vide (bug potentiel)
  const phantomResult = simulateGetJalonsForSave([]);  // Array vide au lieu de jalonsInMemory
  const phantomFormData = simulateCollectFormData(phantomResult);
  const phantomGristData = simulatePrepareTaskDataForGrist(phantomFormData);
  
  console.log('   👻 Résultat: Les jalons en mémoire ne sont pas sauvegardés !');
  console.log('   📊 Données finales pour Grist:', phantomGristData.jalons);
}

// Exécuter les tests
debugFrontendJalons();