// === Script de chargement des données prod en test ===
// Simule le chargement du CSV prod dans l'environnement test

console.log('📊 CHARGEMENT DONNÉES PROD EN TEST');
console.log('==================================');

/**
 * Parse un CSV simple (sans guillemets complexes)
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { headers: [], data: [] };
  
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }
  
  return { headers, data };
}

/**
 * Convertit les données CSV au format Grist (colonnes → objets indexés)
 */
function convertToGristFormat(csvData) {
  const gristData = {};
  
  // Initialiser toutes les colonnes
  csvData.headers.forEach(header => {
    gristData[header] = [];
  });
  
  // Remplir les données
  csvData.data.forEach(row => {
    csvData.headers.forEach(header => {
      let value = row[header];
      
      // Traitement spécial pour les listes Grist
      if (header === 'bureau' || header === 'qui') {
        if (value && value !== '') {
          // Simuler format Grist: ['L', 'valeur1', 'valeur2']
          const items = value.split(',').map(s => s.trim()).filter(s => s);
          value = ['L', ...items];
        } else {
          value = ['L']; // Liste vide
        }
      }
      
      // Traitement spécial pour les JSON (notes, jalons)
      else if (header === 'notes' || header === 'jalons') {
        if (value && value.startsWith('{')) {
          try {
            JSON.parse(value); // Valider JSON
          } catch (e) {
            value = '{}'; // JSON vide si invalide
          }
        } else {
          value = value || '{}';
        }
      }
      
      // Traitement spécial pour les IDs
      else if (header === 'id_task' || header === 'strategie_id') {
        value = value && !isNaN(value) ? parseInt(value, 10) : null;
      }
      
      gristData[header].push(value);
    });
  });
  
  return gristData;
}

/**
 * Charge et applique les données prod
 */
async function loadProdData() {
  try {
    console.log('🔄 Chargement du fichier CSV prod...');
    
    // Charger le CSV (simulé - en réalité il faudrait fetch)
    const csvPath = '/test/debug/kanban-Ssir_principale_task_prod_310820252.csv';
    console.log(`📁 Lecture: ${csvPath}`);
    
    // Pour ce test, on simule quelques données prod réalistes
    const mockProdData = {
      headers: ['id_task', 'type_tache_id', 'titre', 'description', 'reference', 'bureau', 'qui', 'priorite', 'impact', 'statut', 'historique_statuts', 'date_derniere_maj', 'statut_precedent', 'date_debut', 'date_echeance', 'jalons', 'notes', 'projet', 'urgence', 'datenow', 'str_statut', 'str_urgence', 'str_qui', 'str_bureau', 'str_impact', 'date_creation', 'date_modif', 'Créé par', 'strategie_id'],
      data: [
        {
          id_task: '9',
          titre: 'Charte correspondants',
          description: 'Élaborer une charte pour les correspondants informatiques',
          reference: '',
          bureau: 'Chef SSIR',
          qui: 'Timothée',
          urgence: 'Immédiate',
          impact: 'Important',
          statut: 'Terminé',
          projet: 'Charte 2024',
          strategie_id: '3',
          notes: '{"content":"Élaborer une charte pour les correspondants informatiques\\nok une première version est dans le dossier dta","history":[]}',
          jalons: '',
          date_derniere_maj: '2025-07-18T20:26:48.045058+02:00',
          date_echeance: '',
          statut_precedent: 'En cours'
        },
        {
          id_task: '11',
          titre: 'SSO',
          description: 'Cluster pour fiabiliser keycloak',
          reference: 'KEYCLOAK-2024-001',
          bureau: 'Exploit,RSSI',
          qui: 'Alex,Paul',
          urgence: 'Courte',
          impact: 'Critique',
          statut: 'En cours',
          projet: 'Sécurité 2024',
          strategie_id: '1',
          notes: '{"content":"a faire : Cluster pour fiabiliser keycloak ?\\nclarifier les notions et concepts oidc","history":[]}',
          jalons: '{"jalons":[{"type":"validation","titre":"Validation architecture SSO","date":"2024-04-15","statut":"planifie"}]}',
          date_derniere_maj: '2025-07-15T19:16:38.440453+02:00',
          date_echeance: '2024-03-30',
          statut_precedent: 'À faire'
        },
        {
          id_task: '15',
          titre: 'Migration test',
          description: 'Test de migration des serveurs',
          reference: '',
          bureau: 'Réseau,BDD',
          qui: 'Gaël,Thomas',
          urgence: 'Moyenne',
          impact: 'Modéré',
          statut: 'À faire',
          projet: 'Infrastructure',
          strategie_id: '7',
          notes: '{"content":"Test de migration","history":[]}',
          jalons: '',
          date_derniere_maj: '2025-07-16T11:45:35.393Z',
          date_echeance: '',
          statut_precedent: 'Backlog'
        }
      ]
    };
    
    console.log(`✅ ${mockProdData.data.length} enregistrements de test chargés`);
    
    // Convertir au format Grist
    const gristData = convertToGristFormat(mockProdData);
    console.log('🔄 Conversion au format Grist...');
    console.log('   Colonnes:', Object.keys(gristData));
    console.log('   Premiers IDs:', gristData.id_task.slice(0, 5));
    
    // Appliquer à KanbanManager si disponible
    if (window.kanbanManager && window.kanbanManager.gristManager) {
      console.log('🔄 Application au KanbanManager...');
      
      // Simuler les données Grist
      const mappedRecords = window.kanbanManager.gristManager.mapGristRecords(gristData);
      console.log(`✅ ${mappedRecords.length} enregistrements mappés`);
      
      // Remplacer les données actuelles
      window.kanbanManager.currentRecords = mappedRecords;
      window.kanbanManager.gristManager.currentRecords = mappedRecords;
      
      // Rafraîchir l'affichage
      if (window.kanbanManager.refreshKanban) {
        window.kanbanManager.refreshKanban();
        console.log('🎨 Kanban rafraîchi avec les nouvelles données');
      }
      
      console.log('✅ Données prod appliquées avec succès !');
      console.log(`📊 Résultat: ${mappedRecords.length} tâches chargées`);
      
      // Afficher un échantillon
      console.log('\n📋 Échantillon des données:');
      mappedRecords.slice(0, 3).forEach((record, i) => {
        console.log(`   ${i + 1}. ${record.titre} (${record.statut}) - ${record.bureau}`);
      });
      
    } else {
      console.log('❌ KanbanManager non disponible');
    }
    
  } catch (error) {
    console.error('❌ Erreur chargement données prod:', error);
  }
}

// Auto-exécution si on est dans le bon contexte
if (typeof window !== 'undefined' && window.kanbanManager) {
  console.log('🚀 Démarrage automatique...');
  loadProdData();
} else {
  console.log('⏳ En attente de KanbanManager...');
  
  // Attendre que KanbanManager soit prêt
  const checkKanban = setInterval(() => {
    if (window.kanbanManager) {
      clearInterval(checkKanban);
      loadProdData();
    }
  }, 1000);
  
  // Timeout après 10 secondes
  setTimeout(() => {
    clearInterval(checkKanban);
    console.log('⏰ Timeout - KanbanManager non trouvé');
  }, 10000);
}

// Exposer la fonction pour usage manuel
window.loadProdData = loadProdData;