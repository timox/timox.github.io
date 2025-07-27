#!/usr/bin/env node

/**
 * 🎯 ANALYSE DES JALONS - KANBAN GSSI
 * 
 * Analyse automatisée des tâches avec jalons
 */

const https = require('https');

const API_CONFIG = {
  HOST: 'grist.numerique.gouv.fr',
  DOC_ID: 'DOC_ID_SUPPRIME',
  API_KEY: 'IDENTIFIANT_SUPPRIME'
};

function apiCall(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_CONFIG.HOST,
      path: `/api/docs/${API_CONFIG.DOC_ID}${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function parseJalons(jalonsField) {
  if (!jalonsField) return null;
  
  try {
    // Le champ jalons peut être un JSON string
    const parsed = JSON.parse(jalonsField);
    if (parsed.jalons && Array.isArray(parsed.jalons)) {
      return parsed.jalons;
    }
  } catch (e) {
    // Si ce n'est pas du JSON, on retourne null
  }
  
  return null;
}

async function analyzeJalons() {
  console.log('🎯 ANALYSE DES JALONS - KANBAN GSSI');
  console.log('='.repeat(50));
  
  try {
    const allTasks = await apiCall('/tables/Ssir_principale_task/records');
    console.log(`📊 Analyse de ${allTasks.records.length} tâches...\n`);
    
    const tasksWithJalons = [];
    let totalJalons = 0;
    
    allTasks.records.forEach(task => {
      const jalons = parseJalons(task.fields.jalons);
      
      if (jalons && jalons.length > 0) {
        tasksWithJalons.push({
          id: task.id,
          titre: task.fields.titre,
          statut: task.fields.statut,
          jalons: jalons,
          nombreJalons: jalons.length
        });
        totalJalons += jalons.length;
      }
    });
    
    console.log(`✅ ${tasksWithJalons.length} tâches ont des jalons`);
    console.log(`📋 Total de ${totalJalons} jalons définis\n`);
    
    if (tasksWithJalons.length === 0) {
      console.log('ℹ️  Aucune tâche avec jalons trouvée');
      return;
    }
    
    // Afficher les tâches avec jalons
    console.log('📝 TÂCHES AVEC JALONS:');
    console.log('='.repeat(50));
    
    tasksWithJalons
      .sort((a, b) => b.nombreJalons - a.nombreJalons)
      .forEach((task, index) => {
        console.log(`\n${index + 1}. 📌 ${task.titre}`);
        console.log(`   ID: ${task.id} | Statut: ${task.statut}`);
        console.log(`   Jalons (${task.nombreJalons}):`);
        
        task.jalons.forEach((jalon, jIndex) => {
          const date = jalon.date ? new Date(jalon.date).toLocaleDateString('fr-FR') : 'Date non définie';
          const titre = jalon.titre || jalon.name || 'Titre non défini';
          const description = jalon.description || '';
          
          console.log(`     ${jIndex + 1}. ${titre} - ${date}`);
          if (description) {
            console.log(`        ${description}`);
          }
        });
      });
    
    // Statistiques des jalons
    console.log('\n📊 STATISTIQUES DES JALONS:');
    console.log('='.repeat(50));
    
    const jalonsParStatut = {};
    tasksWithJalons.forEach(task => {
      const statut = task.statut || 'Non défini';
      jalonsParStatut[statut] = (jalonsParStatut[statut] || 0) + task.nombreJalons;
    });
    
    console.log('Jalons par statut de tâche:');
    Object.entries(jalonsParStatut)
      .sort(([,a], [,b]) => b - a)
      .forEach(([statut, count]) => {
        console.log(`   ${statut}: ${count} jalons`);
      });
    
    // Jalons par mois (si dates disponibles)
    const jalonsAvecDates = [];
    tasksWithJalons.forEach(task => {
      task.jalons.forEach(jalon => {
        if (jalon.date) {
          try {
            const date = new Date(jalon.date);
            if (!isNaN(date.getTime())) {
              jalonsAvecDates.push({
                date: date,
                mois: date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }),
                titre: jalon.titre || jalon.name,
                tache: task.titre
              });
            }
          } catch (e) {
            // Ignorer les dates invalides
          }
        }
      });
    });
    
    if (jalonsAvecDates.length > 0) {
      console.log('\nJalons par mois:');
      const jalonsParMois = {};
      jalonsAvecDates.forEach(jalon => {
        jalonsParMois[jalon.mois] = (jalonsParMois[jalon.mois] || 0) + 1;
      });
      
      Object.entries(jalonsParMois)
        .sort(([,a], [,b]) => b - a)
        .forEach(([mois, count]) => {
          console.log(`   ${mois}: ${count} jalons`);
        });
      
      // Prochains jalons
      const maintenant = new Date();
      const prochainsJalons = jalonsAvecDates
        .filter(jalon => jalon.date >= maintenant)
        .sort((a, b) => a.date - b.date)
        .slice(0, 5);
      
      if (prochainsJalons.length > 0) {
        console.log('\n🔔 PROCHAINS JALONS:');
        prochainsJalons.forEach((jalon, index) => {
          const dateStr = jalon.date.toLocaleDateString('fr-FR');
          console.log(`   ${index + 1}. ${dateStr} - ${jalon.titre} (${jalon.tache})`);
        });
      }
    }
    
    return {
      success: true,
      totalTasks: allTasks.records.length,
      tasksWithJalons: tasksWithJalons.length,
      totalJalons: totalJalons,
      tasks: tasksWithJalons
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
    return { success: false, error: error.message };
  }
}

// === LANCEMENT ===
if (require.main === module) {
  analyzeJalons();
}