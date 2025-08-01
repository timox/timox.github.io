#!/usr/bin/env node

/**
 * 🔍 DEBUG API FORMAT - Comprendre le format attendu par Grist
 */

const https = require('https');

const API_CONFIG = {
  HOST: 'grist.numerique.gouv.fr',
  DOC_ID: 'e4navPUHoV29jnDQfqMFwo',
  API_KEY: '246a54fe9f95afca85b8d0f1acb4c421406200e9'
};

function apiCall(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_CONFIG.HOST,
      path: `/api/docs/${API_CONFIG.DOC_ID}${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('🔍 Request:', method, options.path);
    if (body) console.log('📤 Body:', JSON.stringify(body, null, 2));

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 Response Status:', res.statusCode);
        console.log('📥 Response Body:', data);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            reject(new Error('Invalid JSON: ' + data));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function debugFormat() {
  console.log('🔍 DEBUG FORMAT API GRIST\n');
  
  try {
    // 1. Examiner la structure d'une tâche existante
    console.log('📊 1. Structure tâche existante:');
    const existing = await apiCall('/tables/Ssir_principale_task/records?limit=1');
    
    if (existing.records.length > 0) {
      const task = existing.records[0];
      console.log('✅ Exemple de tâche:');
      console.log('   ID:', task.id);
      console.log('   Fields keys:', Object.keys(task.fields));
      console.log('   Fields sample:');
      
      // Afficher quelques champs pour comprendre le format
      Object.entries(task.fields).slice(0, 5).forEach(([key, value]) => {
        console.log(`   - ${key}:`, typeof value, Array.isArray(value) ? `(array: ${value})` : value);
      });
    }
    
    console.log('\n');
    
    // 2. Examiner le schéma de table
    console.log('📊 2. Schéma de table:');
    const tableInfo = await apiCall('/tables/Ssir_principale_task');
    console.log('✅ Colonnes disponibles:');
    tableInfo.columns.forEach(col => {
      console.log(`   - ${col.id} (${col.type})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

debugFormat();