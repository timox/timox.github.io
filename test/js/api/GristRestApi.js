// === GristRestApi.js ===
// Test de connexion API REST Grist en remplacement de l'iframe

export class GristRestApi {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'https://docs.getgrist.com/api/docs';
    this.docId = config.docId || 'YOUR_DOC_ID';
    this.apiKey = config.apiKey || 'YOUR_API_KEY';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Test de connexion
  async testConnection() {
    try {
      console.log('🔌 Test connexion API REST Grist...');
      const response = await fetch(`${this.baseUrl}/${this.docId}`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const docInfo = await response.json();
      console.log('✅ Connexion API REST réussie !', docInfo);
      return docInfo;
    } catch (error) {
      console.error('❌ Erreur connexion API REST:', error);
      throw error;
    }
  }

  // Équivalent de grist.docApi.fetchTable()
  async fetchTable(tableId) {
    try {
      console.log(`📥 Récupération table: ${tableId}`);
      const response = await fetch(`${this.baseUrl}/${this.docId}/tables/${tableId}/records`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Table ${tableId} récupérée:`, data.records?.length, 'enregistrements');
      
      // Convertir au format Grist classique
      return this.convertToGristFormat(data);
    } catch (error) {
      console.error(`❌ Erreur récupération table ${tableId}:`, error);
      throw error;
    }
  }

  // Équivalent de grist.docApi.applyUserActions()
  async applyUserActions(actions) {
    try {
      console.log('📝 Application actions:', actions);
      const response = await fetch(`${this.baseUrl}/${this.docId}/apply`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ actions })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Actions appliquées avec succès');
      return result;
    } catch (error) {
      console.error('❌ Erreur application actions:', error);
      throw error;
    }
  }

  // Convertir le format API REST vers le format Grist classique
  convertToGristFormat(restData) {
    if (!restData.records) return {};
    
    const gristFormat = {
      id: [],
      manualSort: []
    };
    
    // Extraire les colonnes dynamiquement
    const sampleRecord = restData.records[0];
    if (sampleRecord) {
      Object.keys(sampleRecord.fields).forEach(fieldName => {
        gristFormat[fieldName] = [];
      });
    }
    
    // Remplir les données
    restData.records.forEach(record => {
      gristFormat.id.push(record.id);
      gristFormat.manualSort.push(record.id);
      
      Object.entries(record.fields).forEach(([fieldName, value]) => {
        gristFormat[fieldName].push(value);
      });
    });
    
    return gristFormat;
  }

  // Émulation de grist.ready() pour compatibilité
  static createCompatibilityLayer(restApi) {
    return {
      ready: (options = {}) => {
        console.log('🔄 Grist compatibility layer ready');
        return Promise.resolve();
      },
      onRecords: (callback) => {
        console.log('🔄 onRecords callback registered (REST mode)');
        // En mode REST, on pourrait implémenter un polling ou WebSocket
      },
      docApi: {
        fetchTable: (tableId) => restApi.fetchTable(tableId),
        applyUserActions: (actions) => restApi.applyUserActions(actions),
        getDocInfo: () => restApi.testConnection()
      }
    };
  }
}

// Configuration par défaut (à adapter à votre instance)
export const DEFAULT_CONFIG = {
  baseUrl: 'https://grist.numerique.gouv.fr/api/docs',
  docId: '5UqT5e2BAEUt6An73e1pTd',
  apiKey: 'IDENTIFIANT_SUPPRIME'
};

// Fonction d'initialisation simplifiée
export async function initGristRestApi(config = DEFAULT_CONFIG) {
  console.log('🚀 Initialisation API REST Grist...');
  
  const restApi = new GristRestApi(config);
  
  // Test de connexion
  await restApi.testConnection();
  
  // Créer la couche de compatibilité
  const grist = GristRestApi.createCompatibilityLayer(restApi);
  
  // Remplacer window.grist
  window.grist = grist;
  window.gristRestApi = restApi;
  
  console.log('✅ API REST Grist prête !');
  return { grist, restApi };
}