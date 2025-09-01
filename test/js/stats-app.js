// === Stats App ===
// Application de statistiques pour le Kanban SSIR

import { 
  STATUTS, 
  DEFAULT_BUREAUX, 
  DEFAULT_RESPONSABLES, 
  TABLE_ID
} from './config/constants.js';

import { generateSingleBureauBadge } from './utils/badges.js';

class StatsAppManager {
  constructor() {
    this.tasks = [];
    this.strategiesData = [];
    this.charts = {};
    
    
    this.init();
  }

  async init() {
    try {
      
      await this.waitForGristReady();
      await this.loadStrategies();
      await this.loadTasks();
      this.generateStats();
      
      
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
          grist.ready();
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error('❌ API Grist non disponible après', maxAttempts, 'tentatives');
          reject(new Error('API Grist non disponible'));
        } else {
          setTimeout(checkGrist, 100);
        }
      };
      
      checkGrist();
    });
  }

  async loadStrategies() {
    try {
      const gristData = await grist.docApi.fetchTable('Ssir_strategie2');
      
      // Convertir le format Grist en tableau d'objets
      this.strategiesData = [];
      if (gristData && gristData.id) {
        const count = gristData.id.length;
        for (let i = 0; i < count; i++) {
          this.strategiesData.push({
            id: gristData.id[i],
            objectif: gristData.objectif?.[i] || '',
            sous_objectif: gristData.sous_objectif?.[i] || '',
            action: gristData.action?.[i] || ''
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement stratégies:', error);
      // Ne pas faire échouer si les stratégies ne sont pas disponibles
      this.strategiesData = [];
    }
  }

  async loadTasks() {
    try {
      
      const records = await grist.docApi.fetchTable(TABLE_ID);
      this.tasks = this.mapGristRecords(records);
      
      
      
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
    // Calculs de base
    this.tasksByBureau = this.calculateTasksByBureau();
    this.tasksByObjective = this.calculateTasksByObjective();
    this.tasksByPerson = this.calculateTasksByPerson();
    this.tasksByPriority = this.calculateTasksByPriority();
    
    // Génération des affichages
    this.generateGlobalMetrics();
    this.generatePersonBureauStats();
    this.generatePriorityStatusTable();
    this.generateActivityHeatmap();
    this.generateBureauObjectiveMatrix();
    this.generateTasksObjectivesTable();
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
        
        // Priorités (utiliser le champ priority calculé par Grist)
        if (task.priority === 1) {
          stats.p1++;
        } else if (task.priority === 2) {
          stats.p2++;
        } else {
          stats.p3plus++;
        }
      });
    });

    // Générer le tableau
    this.renderPersonBureauTable(personStats);
  }

  generatePriorityStatusTable() {
    // Calculer la répartition priorité/statut
    const priorityStatusData = {};
    
    // Initialiser la structure pour tous les statuts
    Object.values(STATUTS).forEach(statut => {
      priorityStatusData[statut] = {
        p1: 0,
        p2: 0,
        p3plus: 0,
        total: 0
      };
    });
    
    // Analyser chaque tâche
    this.tasks.forEach(task => {
      const statut = task.statut || 'Sans statut';
      
      if (!priorityStatusData[statut]) {
        priorityStatusData[statut] = { p1: 0, p2: 0, p3plus: 0, total: 0 };
      }
      
      const stats = priorityStatusData[statut];
      stats.total++;
      
      // Priorité basée sur le champ priority de Grist
      if (task.priority === 1) {
        stats.p1++;
      } else if (task.priority === 2) {
        stats.p2++;
      } else {
        stats.p3plus++;
      }
    });
    
    // Générer le tableau HTML
    this.renderPriorityStatusTable(priorityStatusData);
  }

  renderPriorityStatusTable(priorityStatusData) {
    const tbody = document.querySelector('#priority-status-table tbody');
    
    // Trier par total décroissant
    const sortedStatuts = Object.entries(priorityStatusData)
      .sort(([,a], [,b]) => b.total - a.total)
      .filter(([statut, data]) => data.total > 0); // Exclure les statuts vides
    
    tbody.innerHTML = sortedStatuts.map(([statut, data]) => {
      const p1Percent = data.total > 0 ? Math.round((data.p1 / data.total) * 100) : 0;
      const p2Percent = data.total > 0 ? Math.round((data.p2 / data.total) * 100) : 0;
      const p3Percent = data.total > 0 ? Math.round((data.p3plus / data.total) * 100) : 0;
      
      return `
        <tr>
          <td><strong>${statut}</strong></td>
          <td class="text-center">
            <span class="badge bg-danger">${data.p1}</span>
            <small class="text-muted d-block">${p1Percent}%</small>
          </td>
          <td class="text-center">
            <span class="badge bg-warning">${data.p2}</span>
            <small class="text-muted d-block">${p2Percent}%</small>
          </td>
          <td class="text-center">
            <span class="badge bg-secondary">${data.p3plus}</span>
            <small class="text-muted d-block">${p3Percent}%</small>
          </td>
          <td class="text-center">
            <strong>${data.total}</strong>
          </td>
        </tr>
      `;
    }).join('');
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

  generateActivityHeatmap() {
    const bureaux = Object.keys(this.tasksByBureau).sort();
    const objectifs = ['Fonctionnement', 'Sécurité', 'Métier', 'Transition', 'Sans Stratégie'];
    
    const heatmapData = {};
    let maxValue = 0;
    
    // Initialiser la heatmap
    bureaux.forEach(bureau => {
      heatmapData[bureau] = {};
      objectifs.forEach(obj => {
        heatmapData[bureau][obj] = 0;
      });
    });
    
    // Remplir la heatmap en utilisant exactement la même logique que la matrice
    Object.entries(this.tasksByBureau).forEach(([bureau, tasks]) => {
      tasks.forEach(task => {
        const objectifs = this.getTaskObjectives(task);
        
        if (objectifs.length === 0) {
          heatmapData[bureau]['Sans Stratégie']++;
          maxValue = Math.max(maxValue, heatmapData[bureau]['Sans Stratégie']);
        } else {
          objectifs.forEach(objectif => {
            const shortName = this.shortenObjectifName(objectif);
            if (heatmapData[bureau][shortName] !== undefined) {
              heatmapData[bureau][shortName]++;
              maxValue = Math.max(maxValue, heatmapData[bureau][shortName]);
            }
          });
        }
      });
    });
    
    this.renderActivityHeatmap(heatmapData, objectifs, bureaux, maxValue);
  }

  renderActivityHeatmap(heatmapData, objectifs, bureaux, maxValue) {
    const container = document.getElementById('activity-heatmap');
    
    // Créer le tableau HTML pour la heatmap
    let html = '<div class="table-responsive">';
    html += '<table class="table table-sm table-bordered mb-0">';
    
    // En-tête avec les objectifs
    html += '<thead><tr><th style="width: 120px;">Bureau</th>';
    objectifs.forEach(obj => {
      html += `<th class="text-center" style="font-size: 0.85rem;">${obj}</th>`;
    });
    html += '<th class="text-center">Total</th></tr></thead>';
    
    // Corps du tableau avec les données
    html += '<tbody>';
    bureaux.forEach(bureau => {
      html += `<tr><td class="fw-bold" style="font-size: 0.85rem;">${bureau}</td>`;
      
      let bureauTotal = 0;
      objectifs.forEach(obj => {
        const value = heatmapData[bureau][obj];
        bureauTotal += value;
        
        // Calculer l'intensité de la couleur (0 à 1)
        const intensity = maxValue > 0 ? value / maxValue : 0;
        
        // Couleur: du blanc au bleu foncé pour les stratégies, rouge pour sans stratégie
        let bgColor;
        if (obj === 'Sans Stratégie') {
          bgColor = intensity > 0 ? `rgba(220, 53, 69, ${0.2 + intensity * 0.8})` : '#ffffff';
        } else {
          bgColor = intensity > 0 ? `rgba(13, 110, 253, ${0.1 + intensity * 0.9})` : '#ffffff';
        }
        
        const textColor = intensity > 0.5 ? '#ffffff' : '#212529';
        
        html += `<td class="text-center" style="background-color: ${bgColor}; color: ${textColor}; font-weight: ${value > 0 ? 'bold' : 'normal'};">`;
        html += value > 0 ? value : '-';
        html += '</td>';
      });
      
      // Total par bureau
      html += `<td class="text-center fw-bold">${bureauTotal}</td>`;
      html += '</tr>';
    });
    
    // Ligne des totaux
    html += '<tr class="table-secondary"><td class="fw-bold">Total</td>';
    let grandTotal = 0;
    objectifs.forEach(obj => {
      const colTotal = Object.values(heatmapData).reduce((sum, bureau) => sum + bureau[obj], 0);
      grandTotal += colTotal;
      html += `<td class="text-center fw-bold">${colTotal}</td>`;
    });
    html += `<td class="text-center fw-bold">${grandTotal}</td>`;
    html += '</tr>';
    
    html += '</tbody></table></div>';
    
    // Ajouter une légende
    html += '<div class="heatmap-legend">';
    html += '<div class="heatmap-legend-item">';
    html += '<div class="heatmap-color-box" style="background-color: #ffffff;"></div>';
    html += '<span>Aucune activité</span>';
    html += '</div>';
    html += '<div class="heatmap-legend-item">';
    html += '<div class="heatmap-color-box" style="background-color: rgba(13, 110, 253, 0.3);"></div>';
    html += '<span>Activité faible</span>';
    html += '</div>';
    html += '<div class="heatmap-legend-item">';
    html += '<div class="heatmap-color-box" style="background-color: rgba(13, 110, 253, 0.6);"></div>';
    html += '<span>Activité moyenne</span>';
    html += '</div>';
    html += '<div class="heatmap-legend-item">';
    html += '<div class="heatmap-color-box" style="background-color: rgba(13, 110, 253, 1);"></div>';
    html += '<span>Activité élevée</span>';
    html += '</div>';
    html += '<div class="heatmap-legend-item">';
    html += '<div class="heatmap-color-box" style="background-color: rgba(220, 53, 69, 0.8);"></div>';
    html += '<span>Sans stratégie</span>';
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
  }

  generateTasksObjectivesTable() {
    const tbody = document.querySelector('#tasks-objectives-table tbody');
    const objectifsGroups = {};
    
    // Grouper les tâches par objectif
    this.tasks.forEach(task => {
      const objectifs = this.getTaskObjectives(task);
      
      if (objectifs.length > 0) {
        objectifs.forEach(objectif => {
          if (!objectifsGroups[objectif]) {
            objectifsGroups[objectif] = [];
          }
          objectifsGroups[objectif].push(task);
        });
      } else {
        // Tâches sans objectif stratégique
        const sansStrategie = 'Sans stratégie définie';
        if (!objectifsGroups[sansStrategie]) {
          objectifsGroups[sansStrategie] = [];
        }
        objectifsGroups[sansStrategie].push(task);
      }
    });
    
    // Trier les objectifs par nom
    const sortedObjectifs = Object.keys(objectifsGroups).sort();
    
    let htmlRows = [];
    
    // Générer le HTML du tableau avec regroupement
    sortedObjectifs.forEach(objectif => {
      const tasks = objectifsGroups[objectif];
      const taskCount = tasks.length;
      
      // Trier les tâches par titre
      tasks.sort((a, b) => (a.titre || '').localeCompare(b.titre || ''));
      
      // Première ligne avec l'objectif et le compteur
      htmlRows.push(`
        <tr class="table-info">
          <td rowspan="${taskCount}">
            <strong>${objectif}</strong>
            <br>
            <span class="badge bg-primary">${taskCount} tâche${taskCount > 1 ? 's' : ''}</span>
          </td>
          ${this.generateTaskRow(tasks[0], false)}
        </tr>
      `);
      
      // Lignes suivantes pour les autres tâches du même objectif
      for (let i = 1; i < tasks.length; i++) {
        htmlRows.push(`
          <tr>
            ${this.generateTaskRow(tasks[i], false)}
          </tr>
        `);
      }
    });
    
    tbody.innerHTML = htmlRows.join('');
  }

  generateTaskRow(task, includeObjectif = true) {
    const responsables = this.parseMultipleValues(task.qui);
    const bureaux = this.parseMultipleValues(task.bureau);
    
    // Badges pour responsables
    const responsablesBadges = responsables.map(resp => 
      `<span class="badge bg-secondary me-1">${resp}</span>`
    ).join('');
    
    // Badges pour bureaux
    const bureauxBadges = bureaux.map(bureau => {
      return generateSingleBureauBadge(bureau, true);
    }).join(' ');
    
    // Badge de priorité
    const priorityClass = this.getPriorityClass(task.urgence, task.impact);
    const priorityBadge = `<span class="badge ${priorityClass}">${this.getPriorityLabel(task.urgence, task.impact)}</span>`;
    
    // Badge de statut
    const statusClass = this.getStatusClass(task.statut);
    const statusBadge = `<span class="badge ${statusClass}">${task.statut || 'Non défini'}</span>`;
    
    // Date d'échéance
    const echeance = task.date_echeance ? 
      new Date(task.date_echeance).toLocaleDateString('fr-FR') : 
      '<span class="text-muted">-</span>';
    
    return `
      <td>${task.titre || 'Sans titre'}</td>
      <td>${statusBadge}</td>
      <td>${responsablesBadges || '<span class="text-muted">-</span>'}</td>
      <td>${bureauxBadges || '<span class="text-muted">-</span>'}</td>
      <td>${priorityBadge}</td>
      <td>${echeance}</td>
    `;
  }

  getPriorityClass(urgence, impact) {
    if (urgence === 'Immédiate' || impact === 'Critique') {
      return 'bg-danger';
    } else if (urgence === 'Courte' || impact === 'Important') {
      return 'bg-warning';
    } else if (urgence === 'Moyenne' || impact === 'Modéré') {
      return 'bg-info';
    }
    return 'bg-secondary';
  }

  getPriorityLabel(urgence, impact) {
    if (urgence === 'Immédiate' || impact === 'Critique') {
      return 'P1 - Critique';
    } else if (urgence === 'Courte' || impact === 'Important') {
      return 'P2 - Important';
    } else if (urgence === 'Moyenne' || impact === 'Modéré') {
      return 'P3 - Modéré';
    }
    return 'P4 - Faible';
  }

  getStatusClass(statut) {
    switch (statut) {
      case 'Terminé': return 'bg-success';
      case 'En cours': return 'bg-primary';
      case 'À faire': return 'bg-warning';
      case 'Bloqué': return 'bg-danger';
      case 'En attente': return 'bg-secondary';
      default: return 'bg-light text-dark';
    }
  }

  generateBureauObjectiveMatrix() {
    const bureaux = Object.keys(this.tasksByBureau).sort();
    const objectifs = ['Fonctionnement', 'Sécurité', 'Métier', 'Transition', 'Sans Stratégie'];
    
    const matrix = {};
    
    // Initialiser la matrice
    bureaux.forEach(bureau => {
      matrix[bureau] = {};
      objectifs.forEach(obj => {
        matrix[bureau][obj] = 0;
      });
      matrix[bureau]['Total'] = 0;
    });

    // Remplir la matrice en utilisant les calculs de base
    Object.entries(this.tasksByBureau).forEach(([bureau, tasks]) => {
      tasks.forEach(task => {
        const objectifs = this.getTaskObjectives(task);
        
        matrix[bureau]['Total']++;
        
        if (objectifs.length === 0) {
          matrix[bureau]['Sans Stratégie']++;
        } else {
          objectifs.forEach(objectif => {
            const shortName = this.shortenObjectifName(objectif);
            if (matrix[bureau][shortName] !== undefined) {
              matrix[bureau][shortName]++;
            }
          });
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
        <td class="text-center">${stats['Fonctionnement']}</td>
        <td class="text-center">${stats['Sécurité']}</td>
        <td class="text-center">${stats['Métier']}</td>
        <td class="text-center">${stats['Transition']}</td>
        <td class="text-center">${stats['Sans Stratégie']}</td>
        <td class="text-center"><strong>${stats['Total']}</strong></td>
      </tr>
    `).join('');
  }

  generateCharts() {
    
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
    
    // Compter par sous-objectifs
    const sousObjectifCounts = {};
    let sansSousObjectif = 0;
    
    this.tasks.forEach(task => {
      // Récupérer les IDs de stratégie
      const strategieIds = this.parseMultipleValues(task.strategie_id);
      
      if (strategieIds.length === 0) {
        sansSousObjectif++;
      } else {
        strategieIds.forEach(id => {
          const strategy = this.strategiesData.find(s => s.id == id);
          if (strategy && strategy.sous_objectif) {
            // Raccourcir le nom du sous-objectif pour l'affichage
            const shortName = strategy.sous_objectif.length > 50 
              ? strategy.sous_objectif.substring(0, 47) + '...' 
              : strategy.sous_objectif;
            
            if (!sousObjectifCounts[shortName]) {
              sousObjectifCounts[shortName] = {
                count: 0,
                objectif: this.shortenObjectifName(strategy.objectif)
              };
            }
            sousObjectifCounts[shortName].count++;
          }
        });
      }
    });
    
    // Préparer les données pour le graphique
    const labels = ['Sans stratégie'];
    const data = [sansSousObjectif];
    const backgroundColors = ['#dc3545']; // Rouge pour sans stratégie
    
    // Ajouter les sous-objectifs triés par count
    const sortedSousObjectifs = Object.entries(sousObjectifCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10); // Top 10 pour ne pas surcharger
    
    sortedSousObjectifs.forEach(([label, info]) => {
      labels.push(`${label} (${info.objectif})`);
      data.push(info.count);
      
      // Couleur selon l'objectif principal  
      switch(info.objectif) {
        case 'Fonctionnement': backgroundColors.push('#0d6efd'); break;
        case 'Sécurité': backgroundColors.push('#ffc107'); break;
        case 'Métier': backgroundColors.push('#198754'); break;
        case 'Transition': backgroundColors.push('#6f42c1'); break;
        default: backgroundColors.push('#6c757d');
      }
    });
    
    // Si d'autres sous-objectifs non affichés
    const othersCount = Object.values(sousObjectifCounts)
      .slice(10)
      .reduce((sum, info) => sum + info.count, 0);
    
    if (othersCount > 0) {
      labels.push('Autres sous-objectifs');
      data.push(othersCount);
      backgroundColors.push('#6c757d');
    }

    const ctx = document.getElementById('strategy-chart').getContext('2d');
    this.charts.strategy = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 10,
              font: {
                size: 11
              },
              generateLabels: function(chart) {
                const data = chart.data;
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const percentage = ((value / total) * 100).toFixed(1);
                  
                  return {
                    text: `${label}: ${percentage}%`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} tâches (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  // === FONCTIONS DE CALCUL DE BASE ===
  
  calculateTasksByBureau() {
    const result = {};
    
    this.tasks.forEach(task => {
      const bureaux = this.parseMultipleValues(task.bureau);
      
      if (bureaux.length === 0) {
        result['Non attribué'] = result['Non attribué'] || [];
        result['Non attribué'].push(task);
      } else {
        bureaux.forEach(bureau => {
          result[bureau] = result[bureau] || [];
          result[bureau].push(task);
        });
      }
    });
    
    return result;
  }
  
  calculateTasksByObjective() {
    const result = {};
    
    this.tasks.forEach(task => {
      const objectifs = this.getTaskObjectives(task);
      
      if (objectifs.length === 0) {
        result['Sans stratégie'] = result['Sans stratégie'] || [];
        result['Sans stratégie'].push(task);
      } else {
        objectifs.forEach(objectif => {
          result[objectif] = result[objectif] || [];
          result[objectif].push(task);
        });
      }
    });
    
    return result;
  }
  
  calculateTasksByPerson() {
    const result = {};
    
    this.tasks.forEach(task => {
      const personnes = this.parseMultipleValues(task.qui);
      
      if (personnes.length === 0) {
        result['Non assigné'] = result['Non assigné'] || [];
        result['Non assigné'].push(task);
      } else {
        personnes.forEach(personne => {
          result[personne] = result[personne] || [];
          result[personne].push(task);
        });
      }
    });
    
    return result;
  }
  
  calculateTasksByPriority() {
    const result = {
      1: [],
      2: [],
      3: [],
      4: [],
      'Non définie': []
    };
    
    this.tasks.forEach(task => {
      const priority = task.priority;
      if (priority && result[priority]) {
        result[priority].push(task);
      } else {
        result['Non définie'].push(task);
      }
    });
    
    return result;
  }

  // === UTILITAIRES ===

  parseStrategyIds(value) {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.filter(v => {
        if (!v) return false;
        const str = String(v);
        return str.trim() && str.trim() !== 'L' && !isNaN(str);
      }).map(v => parseInt(v));
    }
    
    return [];
  }

  parseMultipleValues(value) {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      const result = value.filter(v => {
        if (!v) return false;
        const str = String(v);
        return str.trim() && str.trim() !== 'L';
      });
      
      
      return result;
    }
    
    if (typeof value === 'string') {
      // Grist format : ['value1', 'value2'] ou "value1, value2"
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value).filter(v => {
            if (!v) return false;
            const str = String(v);
            return str.trim() && str.trim() !== 'L';
          });
        } catch (e) {
          return [value.replace(/[\[\]']/g, '').trim()].filter(v => v && v !== 'L');
        }
      }
      return value.split(',').map(v => v.trim()).filter(v => v && v !== 'L');
    }
    
    const str = String(value);
    return [str].filter(v => v && v.trim() && v.trim() !== 'L');
  }

  getTaskObjectives(task) {
    const objectifs = [];
    
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
            }
          });
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Méthode 2: Via strategie_id (traiter comme un tableau Grist)
    if (objectifs.length === 0 && task.strategie_id) {
      const strategieIds = this.parseStrategyIds(task.strategie_id);
      
      strategieIds.forEach(id => {
        const strategy = this.strategiesData.find(s => s.id == id);
        if (strategy && !objectifs.includes(strategy.objectif)) {
          objectifs.push(strategy.objectif);
        }
      });
    }
    
    // Méthode 3: Via champ objectif direct
    if (objectifs.length === 0 && task.objectif) {
      objectifs.push(task.objectif);
    }
    
    // Méthode 4: Via champ strategie_objectif
    if (objectifs.length === 0 && task.strategie_objectif) {
      objectifs.push(task.strategie_objectif);
    }
    
    return objectifs;
  }

  shortenObjectifName(objectif) {
    // Nettoyer les espaces en trop avant le mapping
    const cleanObjectif = objectif?.trim();
    
    const mapping = {
      'Assurer le fonctionnement des systèmes d\'information': 'Fonctionnement',
      'Garantir la sécurité des systèmes d\'information': 'Sécurité',
      'Répondre aux demandes des métiers': 'Métier',
      'Assurer la transition vers les systèmes d\'information de demain': 'Transition'
    };
    
    return mapping[cleanObjectif] || cleanObjectif;
  }


  showError(message) {
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
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('stats-container')) {
    new StatsAppManager();
  }
});

// Export pour utilisation par KanbanManager si nécessaire
if (typeof window !== 'undefined') {
  window.StatsAppManager = StatsAppManager;
}