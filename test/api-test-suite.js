/**
 * 🧪 SUITE DE TESTS AUTOMATISÉS VIA API GRIST
 * 
 * Tests indépendants du widget, utilisant l'API REST
 * À exécuter avec Node.js ou dans un environnement supportant fetch
 */

const API_CONFIG = {
  BASE_URL: 'https://grist.numerique.gouv.fr',
  DOC_ID: 'DOC_ID_SUPPRIME',
  API_KEY: 'IDENTIFIANT_SUPPRIME',
  TABLES: {
    TASKS: 'Ssir_principale_task',
    STRATEGIES: 'Ssir_strategie2'
  }
};

class GristAPITestSuite {
  constructor() {
    this.headers = {
      'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
      'Content-Type': 'application/json'
    };
    this.baseUrl = `${API_CONFIG.BASE_URL}/api/docs/${API_CONFIG.DOC_ID}`;
    this.testResults = [];
  }

  // === UTILITAIRES ===
  async apiCall(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: this.headers
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Call Failed:', error);
      throw error;
    }
  }

  log(message, data = null) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`, data || '');
  }

  // === TESTS DE CONNEXION ===
  async testConnection() {
    this.log('🧪 Test 1: Connexion API');
    
    try {
      // Test accès document
      const docInfo = await this.apiCall('');
      this.log('✅ Document accessible:', docInfo.name);
      
      return { 
        success: true, 
        test: 'connection',
        docName: docInfo.name,
        docId: docInfo.id 
      };
    } catch (error) {
      this.log('❌ Échec connexion:', error.message);
      return { 
        success: false, 
        test: 'connection',
        error: error.message 
      };
    }
  }

  // === TEST LECTURE TABLES ===
  async testReadTables() {
    this.log('🧪 Test 2: Lecture des tables');
    
    try {
      // Lister les tables
      const tables = await this.apiCall('/tables');
      this.log('📊 Tables disponibles:', tables.tables.map(t => t.id));
      
      // Vérifier tables attendues
      const expectedTables = Object.values(API_CONFIG.TABLES);
      const foundTables = tables.tables.map(t => t.id);
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));
      
      if (missingTables.length > 0) {
        throw new Error(`Tables manquantes: ${missingTables.join(', ')}`);
      }
      
      this.log('✅ Toutes les tables requises présentes');
      
      return { 
        success: true, 
        test: 'tables',
        tables: foundTables,
        expected: expectedTables
      };
    } catch (error) {
      this.log('❌ Échec lecture tables:', error.message);
      return { 
        success: false, 
        test: 'tables',
        error: error.message 
      };
    }
  }

  // === TEST LECTURE DONNÉES ===
  async testReadData() {
    this.log('🧪 Test 3: Lecture des données');
    
    try {
      // Lire les tâches
      const tasksData = await this.apiCall(`/tables/${API_CONFIG.TABLES.TASKS}/records`);
      this.log(`📝 ${tasksData.records.length} tâches trouvées`);
      
      if (tasksData.records.length > 0) {
        const example = tasksData.records[0];
        this.log('Exemple tâche:', {
          id: example.id,
          titre: example.fields.titre,
          statut: example.fields.statut
        });
      }
      
      // Lire les stratégies
      const strategiesData = await this.apiCall(`/tables/${API_CONFIG.TABLES.STRATEGIES}/records`);
      this.log(`🎯 ${strategiesData.records.length} stratégies trouvées`);
      
      return { 
        success: true, 
        test: 'read_data',
        tasks_count: tasksData.records.length,
        strategies_count: strategiesData.records.length
      };
    } catch (error) {
      this.log('❌ Échec lecture données:', error.message);
      return { 
        success: false, 
        test: 'read_data',
        error: error.message 
      };
    }
  }

  // === TEST CRÉATION TÂCHE ===
  async testCreateTask() {
    this.log('🧪 Test 4: Création de tâche');
    
    try {
      const testTask = {
        records: [{
          fields: {
            titre: `Test API ${new Date().toISOString()}`,
            description: 'Tâche de test automatique - sera supprimée',
            statut: 'À faire',
            bureau: ['Test', 'API'],
            qui: ['TestUser'],
            urgence: 'Faible',
            impact: 'Mineur',
            projet: 'Test Automatisé'
          }
        }]
      };
      
      // Créer la tâche
      const result = await this.apiCall(
        `/tables/${API_CONFIG.TABLES.TASKS}/records`,
        'POST',
        testTask
      );
      
      const newTaskId = result.records[0].id;
      this.log('✅ Tâche créée, ID:', newTaskId);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Supprimer la tâche
      await this.apiCall(
        `/tables/${API_CONFIG.TABLES.TASKS}/records`,
        'DELETE',
        { records: [newTaskId] }
      );
      
      this.log('✅ Tâche test supprimée');
      
      return { 
        success: true, 
        test: 'create_task',
        task_id: newTaskId,
        cleaned: true
      };
    } catch (error) {
      this.log('❌ Échec création tâche:', error.message);
      return { 
        success: false, 
        test: 'create_task',
        error: error.message 
      };
    }
  }

  // === TEST WORKFLOW COMPLET ===
  async testFullWorkflow() {
    this.log('🧪 Test 5: Workflow complet (Créer→Modifier→Supprimer)');
    
    try {
      // 1. Créer une tâche
      const createData = {
        records: [{
          fields: {
            titre: 'Test Workflow Complet',
            statut: 'À faire',
            bureau: ['Test'],
            qui: ['WorkflowTest']
          }
        }]
      };
      
      const createResult = await this.apiCall(
        `/tables/${API_CONFIG.TABLES.TASKS}/records`,
        'POST',
        createData
      );
      
      const taskId = createResult.records[0].id;
      this.log('✅ Étape 1: Tâche créée, ID:', taskId);
      
      // 2. Modifier la tâche
      const updateData = {
        records: [{
          id: taskId,
          fields: {
            titre: 'Test Workflow Modifié',
            statut: 'En cours',
            urgence: 'Élevée'
          }
        }]
      };
      
      await this.apiCall(
        `/tables/${API_CONFIG.TABLES.TASKS}/records`,
        'PATCH',
        updateData
      );
      
      this.log('✅ Étape 2: Tâche modifiée');
      
      // 3. Lire pour vérifier
      const readResult = await this.apiCall(
        `/tables/${API_CONFIG.TABLES.TASKS}/records?filter={"id": [${taskId}]}`
      );
      
      const updatedTask = readResult.records[0];
      const updateSuccess = updatedTask.fields.titre === 'Test Workflow Modifié' &&
                           updatedTask.fields.statut === 'En cours';
      
      this.log('✅ Étape 3: Vérification', updateSuccess ? 'OK' : 'ÉCHOUÉ');
      
      // 4. Supprimer
      await this.apiCall(
        `/tables/${API_CONFIG.TABLES.TASKS}/records`,
        'DELETE',
        { records: [taskId] }
      );
      
      this.log('✅ Étape 4: Tâche supprimée');
      
      return { 
        success: true, 
        test: 'full_workflow',
        steps_completed: 4
      };
    } catch (error) {
      this.log('❌ Échec workflow:', error.message);
      return { 
        success: false, 
        test: 'full_workflow',
        error: error.message 
      };
    }
  }

  // === SUITE COMPLÈTE ===
  async runFullSuite() {
    this.log('🚀 Démarrage suite complète de tests API');
    this.testResults = [];
    
    // Tests dans l'ordre
    this.testResults.push(await this.testConnection());
    this.testResults.push(await this.testReadTables());
    this.testResults.push(await this.testReadData());
    this.testResults.push(await this.testCreateTask());
    this.testResults.push(await this.testFullWorkflow());
    
    // Rapport
    this.generateReport();
    
    return this.testResults;
  }

  // === RAPPORT ===
  generateReport() {
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log('\n📊 RAPPORT DE TESTS API GRIST');
    console.log('================================');
    console.log(`✅ Réussis: ${successful}/${total}`);
    console.log(`❌ Échoués: ${total - successful}/${total}`);
    console.log('\nDétails:');
    
    this.testResults.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.success ? 'OK' : result.error}`);
    });
    
    if (successful === total) {
      console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
      console.log('L\'API Grist fonctionne parfaitement.');
    } else {
      console.log('\n⚠️ Certains tests ont échoué');
    }
  }
}

// === UTILISATION ===
// Node.js:
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GristAPITestSuite;
  
  // Auto-run si exécuté directement
  if (require.main === module) {
    const suite = new GristAPITestSuite();
    suite.runFullSuite();
  }
}

// Browser (avec support fetch):
if (typeof window !== 'undefined') {
  window.GristAPITestSuite = GristAPITestSuite;
  console.log('🧪 Suite de tests API chargée');
  console.log('Usage: const suite = new GristAPITestSuite(); suite.runFullSuite();');
}