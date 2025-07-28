// === Stats App ===
// Application de statistiques pour le Kanban SSIR

import { 
  STATUTS, 
  DEFAULT_BUREAUX, 
  DEFAULT_RESPONSABLES, 
  TABLE_ID,
  STRATEGY_DATA
} from './config/constants.js';

import { generateSingleBureauBadge } from './utils/badges.js';

class StatsManager {
  constructor() {
    this.tasks = [];
    this.strategiesData = STRATEGY_DATA || [];
    this.charts = {};
    
    console.log('📊 StatsManager créé avec', this.strategiesData.length, 'stratégies');
    
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Initialisation des statistiques...');
      
      await this.waitForGristReady();
      await this.loadTasks();
      this.generateStats();
      
      console.log('✅ Statistiques générées');
      
    } catch (error) {
      console.error('❌ Erreur initialisation stats:', error);
      this.showError('Erreur lors du chargement des données');
    }
  }

  async waitForGristReady() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 secondes max
      
      const checkGrist = () => {
        attempts++;
        
        if (typeof grist !== 'undefined') {
          console.log('✅ API Grist détectée');
          grist.ready();
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error('❌ API Grist non disponible après', maxAttempts, 'tentatives');
          reject(new Error('API Grist non disponible'));
        } else {
          console.log('⏳ Attente API Grist... tentative', attempts);
          setTimeout(checkGrist, 100);
        }
      };
      
      checkGrist();
    });
  }

  async loadTasks() {
    try {
      console.log('📥 Chargement des tâches...');
      
      const records = await grist.docApi.fetchTable(TABLE_ID);
      this.tasks = this.mapGristRecords(records);
      
      console.log(`✅ ${this.tasks.length} tâches chargées`);
      
      // Debug complet: Afficher TOUS les champs de la première tâche
      if (this.tasks.length > 0) {
        const firstTask = this.tasks[0];
        console.log('🔍 TOUS les champs de la première tâche:');
        Object.keys(firstTask).sort().forEach(key => {
          const value = firstTask[key];
          if (value !== null && value !== undefined && value !== '') {
            console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
          }
        });
        
        // Chercher spécifiquement les champs qui pourraient contenir des stratégies
        const potentialStrategyFields = Object.keys(firstTask).filter(key => 
          key.toLowerCase().includes('strat') || 
          key.toLowerCase().includes('object') || 
          key.toLowerCase().includes('action') ||
          key.toLowerCase().includes('sous')
        );
        console.log('🎯 Champs potentiels pour stratégies:', potentialStrategyFields);
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement tâches:', error);
      throw error;
    }
  }

  mapGristRecords(gristData) {
    const records = [];
    if (!gristData || !gristData.id) return records;

    gristData.id.forEach((id, index) => {
      const record = { id };
      
      // Mapper tous les champs disponibles
      Object.keys(gristData).forEach(key => {
        if (key !== 'id') {
          record[key] = gristData[key][index];
        }
      });

      records.push(record);
    });

    return records;
  }

  generateStats() {
    console.log('📊 Génération des statistiques...');
    
    this.generateGlobalMetrics();
    this.generatePersonBureauStats();
    this.generateStrategicObjectiveStats();
    this.generateBureauObjectiveMatrix();
    this.generateCharts();
  }

  generateGlobalMetrics() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.statut === 'Terminé').length;
    const inProgress = this.tasks.filter(t => ['En cours', 'À faire'].includes(t.statut)).length;
    
    // Calcul alignement stratégique
    const withStrategy = this.tasks.filter(t => 
      t.strategie_ids || t.strategie_id || 
      t.strategie_objectif || t.strategie_sous_objectif
    ).length;
    const alignmentPercent = total > 0 ? Math.round((withStrategy / total) * 100) : 0;

    // Mise à jour de l'interface
    document.getElementById('total-tasks').textContent = total;
    document.getElementById('completed-tasks').textContent = completed;
    document.getElementById('in-progress-tasks').textContent = inProgress;
    document.getElementById('strategic-alignment').textContent = `${alignmentPercent}%`;
  }

  generatePersonBureauStats() {
    console.log('👥 Génération stats personne/bureau...');
    
    const personStats = {};
    
    // Analyser chaque tâche
    this.tasks.forEach(task => {
      const responsables = this.parseMultipleValues(task.qui);
      const bureaux = this.parseMultipleValues(task.bureau);
      
      responsables.forEach(person => {
        if (!personStats[person]) {
          personStats[person] = {
            name: person,
            bureaux: new Set(),
            total: 0,
            enCours: 0,
            termine: 0,
            p1: 0,
            p2: 0,
            p3plus: 0
          };
        }
        
        const stats = personStats[person];
        
        // Ajouter les bureaux
        bureaux.forEach(bureau => stats.bureaux.add(bureau));
        
        // Compter les tâches
        stats.total++;
        
        if (['En cours', 'À faire'].includes(task.statut)) {
          stats.enCours++;
        }
        
        if (task.statut === 'Terminé') {
          stats.termine++;
        }
        
        // Priorités
        if (task.urgence === 'P1' || task.urgence === 'Immédiate') {
          stats.p1++;
        } else if (task.urgence === 'P2' || task.urgence === 'Courte') {
          stats.p2++;
        } else {
          stats.p3plus++;
        }
      });
    });

    // Générer le tableau
    this.renderPersonBureauTable(personStats);
  }

  renderPersonBureauTable(personStats) {
    const tbody = document.querySelector('#person-bureau-table tbody');
    
    // Trier par nombre total de tâches (décroissant)
    const sortedPersons = Object.values(personStats)
      .sort((a, b) => b.total - a.total);

    tbody.innerHTML = sortedPersons.map(stats => {
      const bureauxBadges = Array.from(stats.bureaux).map(bureau => {
        return generateSingleBureauBadge(bureau, true); // Mode compact pour les tableaux
      }).join(' ');

      return `
        <tr>
          <td><strong>${stats.name}</strong></td>
          <td>${bureauxBadges}</td>
          <td><span class="badge bg-primary">${stats.total}</span></td>
          <td><span class="badge bg-warning">${stats.enCours}</span></td>
          <td><span class="badge bg-success">${stats.termine}</span></td>
          <td><span class="badge bg-danger">${stats.p1}</span></td>
          <td><span class="badge bg-warning">${stats.p2}</span></td>
          <td><span class="badge bg-secondary">${stats.p3plus}</span></td>
        </tr>
      `;
    }).join('');
  }

  generateStrategicObjectiveStats() {
    console.log('🎯 Génération stats objectifs stratégiques...');
    
    // Debug: Regarder les champs stratégie dans les tâches
    if (this.tasks.length > 0) {
      const firstTask = this.tasks[0];
      const strategyFields = Object.keys(firstTask).filter(key => key.toLowerCase().includes('strat'));
      console.log('🔍 Champs stratégie trouvés:', strategyFields);
      
      // Tester quelques tâches
      const tasksWithStrategy = this.tasks.filter(task => 
        task.strategie_ids || task.strategie_id || task.strategie_objectif || 
        task.strategie || task.strategy || task.objectif || task.sous_objectif
      );
      console.log('📊 Tâches avec champs stratégie:', tasksWithStrategy.length, '/', this.tasks.length);
      
      if (tasksWithStrategy.length > 0) {
        console.log('📋 Exemple tâche avec stratégie:', {
          id: tasksWithStrategy[0].id,
          titre: tasksWithStrategy[0].titre,
          strategie_ids: tasksWithStrategy[0].strategie_ids,
          strategie_id: tasksWithStrategy[0].strategie_id,
          strategie_objectif: tasksWithStrategy[0].strategie_objectif,
          objectif: tasksWithStrategy[0].objectif,
          sous_objectif: tasksWithStrategy[0].sous_objectif
        });
      }
    }
    
    // Définir les 5 objectifs principaux (raccourcis)
    const objectifs = [
      'Assurer le fonctionnement des systèmes d\'information',
      'Garantir la sécurité des systèmes d\'information', 
      'Répondre aux demandes des métiers',
      'Assurer la transition vers les systèmes d\'information de demain'
    ];

    const objectifStats = {};
    
    // Initialiser les stats
    objectifs.forEach(objectif => {
      objectifStats[objectif] = {
        name: this.shortenObjectifName(objectif),
        total: 0,
        termine: 0,
        enCours: 0,
        percentage: 0
      };
    });
    
    objectifStats['Sans stratégie'] = {
      name: 'Sans stratégie',
      total: 0,
      termine: 0,
      enCours: 0,
      percentage: 0
    };

    // Analyser chaque tâche
    this.tasks.forEach(task => {
      const taskObjectifs = this.getTaskObjectives(task);
      
      if (taskObjectifs.length === 0) {
        // Tâche sans stratégie
        objectifStats['Sans stratégie'].total++;
        if (task.statut === 'Terminé') {
          objectifStats['Sans stratégie'].termine++;
        } else if (['En cours', 'À faire'].includes(task.statut)) {
          objectifStats['Sans stratégie'].enCours++;
        }
      } else {
        // Tâche avec stratégie(s)
        taskObjectifs.forEach(objectif => {
          if (objectifStats[objectif]) {
            objectifStats[objectif].total++;
            if (task.statut === 'Terminé') {
              objectifStats[objectif].termine++;
            } else if (['En cours', 'À faire'].includes(task.statut)) {
              objectifStats[objectif].enCours++;
            }
          }
        });
      }
    });

    // Calculer les pourcentages
    Object.values(objectifStats).forEach(stats => {
      stats.percentage = stats.total > 0 ? Math.round((stats.termine / stats.total) * 100) : 0;
    });

    this.renderObjectivesProgress(objectifStats);
  }

  renderObjectivesProgress(objectifStats) {
    const container = document.getElementById('objectives-progress');
    
    container.innerHTML = Object.values(objectifStats).map(stats => `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <span class="fw-bold">${stats.name}</span>
          <small class="text-muted">${stats.termine}/${stats.total} (${stats.percentage}%)</small>
        </div>
        <div class="objectif-progress">
          <div class="objectif-bar bg-success" style="width: ${stats.percentage}%"></div>
        </div>
        <small class="text-muted">
          <i class="bi bi-play-circle text-warning"></i> ${stats.enCours} en cours
        </small>
      </div>
    `).join('');
  }

  generateBureauObjectiveMatrix() {
    console.log('🏢 Génération matrice bureau × objectif...');
    
    const matrix = {};
    const bureaux = [...DEFAULT_BUREAUX];
    
    // Initialiser la matrice
    bureaux.forEach(bureau => {
      matrix[bureau] = {
        'Fonctionnement SI': 0,
        'Sécurité SI': 0,
        'Demandes Métiers': 0,
        'Transition Future': 0,
        'Sans Stratégie': 0,
        'Total': 0
      };
    });

    // Analyser chaque tâche
    this.tasks.forEach(task => {
      const taskBureaux = this.parseMultipleValues(task.bureau);
      const taskObjectifs = this.getTaskObjectives(task);
      
      taskBureaux.forEach(bureau => {
        if (matrix[bureau]) {
          matrix[bureau]['Total']++;
          
          if (taskObjectifs.length === 0) {
            matrix[bureau]['Sans Stratégie']++;
          } else {
            taskObjectifs.forEach(objectif => {
              const shortName = this.shortenObjectifName(objectif);
              if (matrix[bureau][shortName]) {
                matrix[bureau][shortName]++;
              }
            });
          }
        }
      });
    });

    this.renderBureauObjectiveMatrix(matrix);
  }

  renderBureauObjectiveMatrix(matrix) {
    const tbody = document.querySelector('#bureau-objective-matrix tbody');
    
    tbody.innerHTML = Object.entries(matrix).map(([bureau, stats]) => `
      <tr>
        <td><strong>${bureau}</strong></td>
        <td class="text-center">${stats['Fonctionnement SI']}</td>
        <td class="text-center">${stats['Sécurité SI']}</td>
        <td class="text-center">${stats['Demandes Métiers']}</td>
        <td class="text-center">${stats['Transition Future']}</td>
        <td class="text-center">${stats['Sans Stratégie']}</td>
        <td class="text-center"><strong>${stats['Total']}</strong></td>
      </tr>
    `).join('');
  }

  generateCharts() {
    console.log('📈 Génération des graphiques...');
    
    this.generateBureauChart();
    this.generateStrategyChart();
  }

  generateBureauChart() {
    const bureauCounts = {};
    
    this.tasks.forEach(task => {
      const bureaux = this.parseMultipleValues(task.bureau);
      bureaux.forEach(bureau => {
        bureauCounts[bureau] = (bureauCounts[bureau] || 0) + 1;
      });
    });

    const ctx = document.getElementById('bureau-chart').getContext('2d');
    this.charts.bureau = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(bureauCounts),
        datasets: [{
          data: Object.values(bureauCounts),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  generateStrategyChart() {
    const strategyCounts = {
      'Avec stratégie': 0,
      'Sans stratégie': 0
    };
    
    this.tasks.forEach(task => {
      const taskObjectifs = this.getTaskObjectives(task);
      if (taskObjectifs.length > 0) {
        strategyCounts['Avec stratégie']++;
      } else {
        strategyCounts['Sans stratégie']++;
      }
    });

    const ctx = document.getElementById('strategy-chart').getContext('2d');
    this.charts.strategy = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(strategyCounts),
        datasets: [{
          data: Object.values(strategyCounts),
          backgroundColor: ['#28a745', '#dc3545']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  // === UTILITAIRES ===

  parseMultipleValues(value) {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.filter(v => v && v.trim() && v.trim() !== 'L');
    }
    
    if (typeof value === 'string') {
      // Grist format : ['value1', 'value2'] ou "value1, value2"
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value).filter(v => v && v.trim() && v.trim() !== 'L');
        } catch (e) {
          return [value.replace(/[\[\]']/g, '').trim()].filter(v => v && v !== 'L');
        }
      }
      return value.split(',').map(v => v.trim()).filter(v => v && v !== 'L');
    }
    
    return [String(value)].filter(v => v && v.trim() && v.trim() !== 'L');
  }

  getTaskObjectives(task) {
    const objectifs = [];
    
    // Debug: Logger cette tâche si elle a des champs stratégie
    const hasStrategyField = task.strategie_ids || task.strategie_id || task.strategie_objectif || 
                            task.strategie || task.strategy || task.objectif || task.sous_objectif;
    
    if (hasStrategyField) {
      console.log('🎯 Analyse tâche avec stratégie:', {
        id: task.id,
        titre: task.titre?.substring(0, 50),
        strategie_ids: task.strategie_ids,
        strategie_id: task.strategie_id,
        objectif: task.objectif,
        sous_objectif: task.sous_objectif
      });
    }
    
    // Méthode 1: Via strategie_ids
    if (task.strategie_ids) {
      try {
        const ids = typeof task.strategie_ids === 'string' 
          ? JSON.parse(task.strategie_ids) 
          : task.strategie_ids;
        
        if (Array.isArray(ids)) {
          ids.forEach(id => {
            const strategy = this.strategiesData.find(s => s.id == id);
            if (strategy && !objectifs.includes(strategy.objectif)) {
              objectifs.push(strategy.objectif);
              console.log('✅ Objectif trouvé via strategie_ids:', strategy.objectif);
            }
          });
        }
      } catch (e) {
        console.warn('Erreur parsing strategie_ids:', e);
      }
    }
    
    // Méthode 2: Via strategie_id (ancien système)
    if (objectifs.length === 0 && task.strategie_id) {
      const strategy = this.strategiesData.find(s => s.id == task.strategie_id);
      if (strategy) {
        objectifs.push(strategy.objectif);
        console.log('✅ Objectif trouvé via strategie_id:', strategy.objectif);
      }
    }
    
    // Méthode 3: Via champ objectif direct
    if (objectifs.length === 0 && task.objectif) {
      objectifs.push(task.objectif);
      console.log('✅ Objectif trouvé via champ objectif:', task.objectif);
    }
    
    // Méthode 4: Via champ strategie_objectif
    if (objectifs.length === 0 && task.strategie_objectif) {
      objectifs.push(task.strategie_objectif);
      console.log('✅ Objectif trouvé via strategie_objectif:', task.strategie_objectif);
    }
    
    return objectifs;
  }

  shortenObjectifName(objectif) {
    const mapping = {
      'Assurer le fonctionnement des systèmes d\'information': 'Fonctionnement SI',
      'Garantir la sécurité des systèmes d\'information': 'Sécurité SI',
      'Répondre aux demandes des métiers': 'Demandes Métiers',
      'Assurer la transition vers les systèmes d\'information de demain': 'Transition Future'
    };
    
    return mapping[objectif] || objectif;
  }


  showError(message) {
    console.error('Stats Error:', message);
    // ⚠️ CORRECTION: NE PAS détruire le DOM Kanban ! Utiliser seulement le container d'erreur
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger alert-dismissible fade show';
      errorDiv.innerHTML = `
        <strong>Erreur Stats:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      errorContainer.appendChild(errorDiv);
    } else {
      // Fallback - alerter sans détruire le DOM
      console.warn('Container d\'erreur non trouvé, erreur ignorée:', message);
    }
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  new StatsManager();
});