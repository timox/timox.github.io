// === Timeline App ===
// Application de timeline graphique pour le suivi d'évolution des tâches

import { 
  STATUTS, 
  TABLE_ID
} from './config/constants.js';

import { generateSingleBureauBadge } from './utils/badges.js';

class TimelineManager {
  constructor() {
    this.tasks = [];
    this.selectedTask = null;
    this.timeline = null;
    
    this.init();
  }

  async init() {
    try {
      await this.waitForGristReady();
      await this.loadTasks();
      this.populateTaskSelector();
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ Erreur initialisation timeline:', error);
      this.showError('Erreur lors du chargement des données');
    }
  }

  async waitForGristReady() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      
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

  async loadTasks() {
    try {
      const records = await grist.docApi.fetchTable(TABLE_ID);
      this.tasks = this.mapGristRecords(records);
      
      console.log(`✅ ${this.tasks.length} tâches chargées pour la timeline`);
      
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
      
      Object.keys(gristData).forEach(key => {
        if (key !== 'id') {
          record[key] = gristData[key][index];
        }
      });

      records.push(record);
    });

    return records;
  }

  populateTaskSelector() {
    const selector = document.getElementById('task-selector');
    
    // Trier les tâches par titre
    const sortedTasks = this.tasks
      .filter(task => task.titre && task.titre.trim())
      .sort((a, b) => (a.titre || '').localeCompare(b.titre || ''));
    
    sortedTasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = `#${task.id} - ${task.titre}`;
      selector.appendChild(option);
    });
    
    console.log(`📋 ${sortedTasks.length} tâches ajoutées au sélecteur`);
  }

  setupEventListeners() {
    const selector = document.getElementById('task-selector');
    const loadBtn = document.getElementById('load-timeline-btn');
    
    selector.addEventListener('change', () => {
      loadBtn.disabled = !selector.value;
    });
    
    loadBtn.addEventListener('click', () => {
      const taskId = parseInt(selector.value);
      if (taskId) {
        this.loadTaskTimeline(taskId);
      }
    });
  }

  async loadTaskTimeline(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      this.showError('Tâche non trouvée');
      return;
    }
    
    this.selectedTask = task;
    
    // Afficher les informations de la tâche
    this.displayTaskInfo(task);
    
    // Extraire et afficher la timeline
    const timelineData = this.extractTimelineData(task);
    this.renderTimeline(timelineData);
    
    // Afficher les sections
    document.getElementById('task-info').style.display = 'block';
    document.getElementById('legend').style.display = 'block';
    document.getElementById('timeline-container').style.display = 'block';
  }

  displayTaskInfo(task) {
    document.getElementById('task-id').textContent = `Tâche #${task.id}`;
    document.getElementById('task-title').textContent = task.titre || 'Sans titre';
    document.getElementById('task-description').textContent = task.description || 'Pas de description';
    
    // Badges
    const badgesContainer = document.getElementById('task-badges');
    let badges = [];
    
    // Badge statut actuel
    const statusClass = this.getStatusClass(task.statut);
    badges.push(`<span class="badge ${statusClass}">${task.statut || 'Non défini'}</span>`);
    
    // Badges bureaux
    const bureaux = this.parseMultipleValues(task.bureau);
    bureaux.forEach(bureau => {
      badges.push(generateSingleBureauBadge(bureau, false));
    });
    
    // Badges responsables
    const responsables = this.parseMultipleValues(task.qui);
    responsables.forEach(resp => {
      badges.push(`<span class="badge bg-secondary">${resp}</span>`);
    });
    
    badgesContainer.innerHTML = badges.join(' ');
  }

  extractTimelineData(task) {
    const timelineEvents = [];
    
    // Événement de création (date de dernière MAJ comme fallback)
    if (task.date_derniere_maj) {
      timelineEvents.push({
        date: new Date(task.date_derniere_maj),
        status: 'Création',
        details: 'Tâche créée dans le système',
        user: 'Système',
        type: 'creation'
      });
    }
    
    // Extraire les événements depuis le champ notes (JSON)
    if (task.notes) {
      try {
        const notesData = typeof task.notes === 'string' 
          ? JSON.parse(task.notes) 
          : task.notes;
        
        if (notesData && notesData.history && Array.isArray(notesData.history)) {
          notesData.history.forEach(entry => {
            timelineEvents.push({
              date: new Date(entry.timestamp),
              status: this.getEventStatus(entry),
              details: this.getEventDetails(entry),
              user: entry.user || 'Utilisateur inconnu',
              type: 'status_change',
              oldValue: entry.oldValue,
              newValue: entry.newValue,
              field: entry.field
            });
          });
        }
      } catch (e) {
        console.warn('Erreur parsing notes pour task', task.id, ':', e);
      }
    }
    
    // Ajouter l'état actuel comme dernier événement
    timelineEvents.push({
      date: new Date(),
      status: task.statut || 'Non défini',
      details: 'État actuel',
      user: 'Système',
      type: 'current'
    });
    
    // Trier par date
    timelineEvents.sort((a, b) => a.date - b.date);
    
    // Calculer les durées entre étapes
    for (let i = 1; i < timelineEvents.length; i++) {
      const duration = timelineEvents[i].date - timelineEvents[i-1].date;
      timelineEvents[i].duration = this.formatDuration(duration);
      timelineEvents[i].durationMs = duration;
    }
    
    return timelineEvents;
  }

  getEventStatus(entry) {
    if (entry.field && entry.field.toLowerCase().includes('statut')) {
      return entry.newValue || 'Changement de statut';
    }
    
    if (entry.field) {
      return `Modification ${entry.field}`;
    }
    
    return 'Modification';
  }

  getEventDetails(entry) {
    if (entry.oldValue && entry.newValue) {
      return `${entry.field || 'Champ'}: "${entry.oldValue}" → "${entry.newValue}"`;
    }
    
    if (entry.newValue) {
      return `${entry.field || 'Champ'}: "${entry.newValue}"`;
    }
    
    return entry.field || 'Modification';
  }

  renderTimeline(timelineData) {
    if (timelineData.length === 0) {
      document.getElementById('visualization').innerHTML = `
        <div class="text-center p-4 text-muted">
          <i class="bi bi-clock display-4"></i>
          <p class="mt-2">Aucun historique disponible pour cette tâche</p>
        </div>
      `;
      return;
    }
    
    // Mettre à jour les statistiques
    const totalDuration = timelineData[timelineData.length - 1].date - timelineData[0].date;
    document.getElementById('total-duration').textContent = this.formatDuration(totalDuration);
    document.getElementById('steps-count').textContent = timelineData.length;
    
    // Préparer les données pour Vis.js
    const items = new vis.DataSet();
    const groups = new vis.DataSet([
      {id: 1, content: this.selectedTask.titre, style: 'color: #2c3e50; font-weight: bold;'}
    ]);
    
    timelineData.forEach((event, index) => {
      const statusColor = this.getStatusColor(event.status);
      
      items.add({
        id: index,
        group: 1,
        content: `<div style="padding: 4px;">
          <strong style="color: ${statusColor};">${event.status}</strong><br>
          <small>${event.details}</small><br>
          <small style="color: #666;"><i class="bi bi-person"></i> ${event.user}</small>
        </div>`,
        start: event.date,
        end: index < timelineData.length - 1 ? timelineData[index + 1].date : new Date(event.date.getTime() + 3600000), // +1h pour le dernier
        type: 'range',
        style: `background-color: ${statusColor}; border-color: ${statusColor}; color: white;`,
        className: this.getStatusCSSClass(event.status)
      });
    });
    
    // Configuration de la timeline
    const options = {
      width: '100%',
      height: '400px',
      margin: {
        item: 10,
        axis: 40
      },
      orientation: 'top',
      showCurrentTime: true,
      zoomMin: 1000 * 60 * 60 * 24, // 1 jour
      zoomMax: 1000 * 60 * 60 * 24 * 365, // 1 an
      format: {
        minorLabels: {
          millisecond:'SSS',
          second:     's',
          minute:     'HH:mm',
          hour:       'HH:mm',
          weekday:    'ddd D',
          day:        'D',
          week:       'w',
          month:      'MMM',
          year:       'YYYY'
        },
        majorLabels: {
          millisecond:'HH:mm:ss',
          second:     'D MMMM HH:mm',
          minute:     'ddd D MMMM',
          hour:       'ddd D MMMM',
          weekday:    'MMMM YYYY',
          day:        'MMMM YYYY',
          week:       'MMMM YYYY',
          month:      'YYYY',
          year:       ''
        }
      },
      locale: 'fr'
    };
    
    // Créer la timeline
    const container = document.getElementById('visualization');
    const timeline = new vis.Timeline(container, items, groups, options);
    
    // Générer la timeline détaillée
    this.renderDetailedTimeline(timelineData);
  }
  
  renderDetailedTimeline(timelineData) {
    const container = document.getElementById('detailed-timeline');
    
    let html = '<div class="timeline-detailed">';
    
    timelineData.forEach((event, index) => {
      const statusColor = this.getStatusColor(event.status);
      const isLast = index === timelineData.length - 1;
      
      html += `
        <div class="d-flex align-items-start mb-3 ${isLast ? '' : 'border-bottom pb-3'}">
          <div class="flex-shrink-0 me-3">
            <div class="rounded-circle d-flex align-items-center justify-content-center" 
                 style="width: 40px; height: 40px; background-color: ${statusColor}; color: white;">
              <i class="bi bi-${this.getStatusIcon(event.status)}"></i>
            </div>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="mb-1" style="color: ${statusColor};">${event.status}</h6>
                <p class="mb-1 text-muted">${event.details}</p>
                <small class="text-muted">
                  <i class="bi bi-clock me-1"></i>
                  ${event.date.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </small>
                ${event.duration ? `<small class="text-info ms-3">Durée: ${event.duration}</small>` : ''}
              </div>
              <div class="text-end">
                <small class="text-muted">
                  <i class="bi bi-person me-1"></i>
                  ${event.user}
                </small>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  getStatusColor(status) {
    const colorMap = {
      'Backlog': '#6c757d',
      'À faire': '#0d6efd', 
      'En cours': '#fd7e14',
      'En attente': '#20c997',
      'Bloqué': '#dc3545',
      'Validation': '#ffc107',
      'Terminé': '#198754',
      'Création': '#6f42c1'
    };
    
    return colorMap[status] || '#6c757d';
  }
  
  getStatusIcon(status) {
    const iconMap = {
      'Backlog': 'archive',
      'À faire': 'tools',
      'En cours': 'lightning',
      'En attente': 'pause-circle',
      'Bloqué': 'x-circle',
      'Validation': 'clipboard-check',
      'Terminé': 'check-circle',
      'Création': 'plus-circle'
    };
    
    return iconMap[status] || 'circle';
  }

  getStatusCSSClass(status) {
    const statusMap = {
      'Backlog': 'status-backlog',
      'À faire': 'status-afaire', 
      'En cours': 'status-encours',
      'En attente': 'status-enattente',
      'Bloqué': 'status-bloque',
      'Validation': 'status-validation',
      'Terminé': 'status-termine'
    };
    
    return statusMap[status] || 'status-backlog';
  }

  getStatusClass(status) {
    switch (status) {
      case 'Terminé': return 'bg-success';
      case 'En cours': return 'bg-primary';
      case 'À faire': return 'bg-warning';
      case 'Bloqué': return 'bg-danger';
      case 'En attente': return 'bg-secondary';
      case 'Validation': return 'bg-info';
      case 'Backlog': return 'bg-dark';
      default: return 'bg-light text-dark';
    }
  }

  formatDuration(milliseconds) {
    if (milliseconds < 0) return '0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}j ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  parseMultipleValues(value) {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.filter(v => {
        if (!v) return false;
        const str = String(v);
        return str.trim() && str.trim() !== 'L';
      });
    }
    
    if (typeof value === 'string') {
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

  showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger alert-dismissible fade show';
      errorDiv.innerHTML = `
        <strong>Erreur Timeline:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      errorContainer.appendChild(errorDiv);
    }
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  new TimelineManager();
});