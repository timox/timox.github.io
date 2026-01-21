// === Timeline App ===
// Application de timeline pour la planification des tâches avec coloration par mission

import {
  STATUTS,
  TABLE_ID
} from './config/constants.js';

class TimelineAppManager {
  constructor() {
    this.tasks = [];
    this.missions = [];
    this.timeline = null;
    this.items = null;
    this.groups = null;
    this.sharedTaskModal = null;
    this.contextMenuTaskId = null;

    // Configuration
    this.colorMode = 'status';
    this.groupMode = 'none';
    this.currentPeriod = 'month';
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterMission = '';

    // Couleurs par statut
    this.statusColors = {
      'Backlog': '#6c757d',
      'À faire': '#0d6efd',
      'En cours': '#fd7e14',
      'En attente': '#20c997',
      'Bloqué': '#dc3545',
      'Validation': '#ffc107',
      'Terminé': '#198754'
    };

    // Couleurs pour les missions (générées dynamiquement)
    this.missionColors = {};
    this.missionColorPalette = [
      '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
      '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548'
    ];

    // Couleurs par bureau
    this.bureauColors = {
      'DSS': '#3b82f6',
      'DDI': '#8b5cf6',
      'DPRS': '#ec4899',
      'DGAI': '#f97316',
      'DGS': '#10b981',
      'default': '#6b7280'
    };

    this.init();
  }

  async init() {
    try {
      await this.waitForGristReady();
      await this.loadData();
      this.initSharedTaskModal();
      this.setupFilters();
      this.setupEventListeners();
      this.renderTimeline();
      this.updateStats();
      this.updateLegend();

      console.log('Timeline initialisée avec', this.tasks.length, 'tâches');

    } catch (error) {
      console.error('Erreur initialisation timeline:', error);
      this.showError('Erreur lors du chargement des données');
    }
  }

  async waitForGristReady() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkGrist = () => {
        attempts++;

        if (typeof window.grist !== 'undefined') {
          window.grist.ready();
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('API Grist non disponible'));
        } else {
          setTimeout(checkGrist, 100);
        }
      };

      checkGrist();
    });
  }

  async loadData() {
    // Charger les tâches
    const records = await window.grist.docApi.fetchTable(TABLE_ID);
    this.tasks = this.mapGristRecords(records);

    // Charger les missions depuis Ssir_strategie2
    try {
      const strategies = await window.grist.docApi.fetchTable('Ssir_strategie2');
      this.missions = this.mapMissionRecords(strategies);

      // Générer les couleurs pour les missions
      this.missions.forEach((mission, index) => {
        this.missionColors[mission.id] = this.missionColorPalette[index % this.missionColorPalette.length];
      });
    } catch (e) {
      console.warn('Impossible de charger les missions:', e);
      this.missions = [];
    }

    console.log(`Chargé: ${this.tasks.length} tâches, ${this.missions.length} missions`);
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

  mapMissionRecords(gristData) {
    const records = [];
    if (!gristData || !gristData.id2) return records;

    gristData.id2.forEach((id, index) => {
      records.push({
        id: id,
        nom: gristData.axe_strategique?.[index] || '',
        objectif: gristData.objectif?.[index] || '',
        sous_objectif: gristData.sous_objectif?.[index] || ''
      });
    });

    return records;
  }

  initSharedTaskModal() {
    if (typeof SharedTaskModal === 'undefined') {
      console.warn('SharedTaskModal non disponible');
      return;
    }

    this.sharedTaskModal = new SharedTaskModal({
      showTimes: false,
      showLinks: false,
      onSave: async (taskData) => {
        await this.saveTask(taskData);
      }
    });

    this.sharedTaskModal.init();
  }

  async saveTask(taskData) {
    try {
      await window.grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, taskData.id, taskData]
      ]);

      // Recharger les données et rafraîchir
      await this.loadData();
      this.renderTimeline();
      this.updateStats();

      this.showToast('Tâche enregistrée', 'success');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      this.showToast('Erreur lors de la sauvegarde', 'danger');
    }
  }

  setupFilters() {
    // Remplir les statuts
    const statusSelect = document.getElementById('filter-status');
    STATUTS.forEach(statut => {
      const option = document.createElement('option');
      option.value = statut.id;
      option.textContent = statut.libelle;
      statusSelect.appendChild(option);
    });

    // Remplir les missions
    const missionSelect = document.getElementById('filter-mission');
    this.missions.forEach(mission => {
      const option = document.createElement('option');
      option.value = mission.id;
      option.textContent = mission.nom || `Mission #${mission.id}`;
      missionSelect.appendChild(option);
    });
  }

  setupEventListeners() {
    // Filtres
    document.getElementById('filter-status').addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this.renderTimeline();
      this.updateStats();
    });

    document.getElementById('filter-mission').addEventListener('change', (e) => {
      this.filterMission = e.target.value;
      this.renderTimeline();
      this.updateStats();
    });

    document.getElementById('color-mode').addEventListener('change', (e) => {
      this.colorMode = e.target.value;
      this.renderTimeline();
      this.updateLegend();
    });

    document.getElementById('group-mode').addEventListener('change', (e) => {
      this.groupMode = e.target.value;
      this.renderTimeline();
    });

    // Recherche
    document.getElementById('search-tasks').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.renderTimeline();
      this.updateStats();
    });

    // Période
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentPeriod = e.target.dataset.period;
        this.adjustTimelineView();
      });
    });

    // Boutons
    document.getElementById('btn-refresh').addEventListener('click', async () => {
      await this.loadData();
      this.renderTimeline();
      this.updateStats();
      this.showToast('Données actualisées', 'success');
    });

    document.getElementById('btn-fit').addEventListener('click', () => {
      if (this.timeline) this.timeline.fit();
    });

    document.getElementById('btn-today').addEventListener('click', () => {
      if (this.timeline) {
        this.timeline.moveTo(new Date());
      }
    });

    // Menu contextuel
    this.setupContextMenu();

    // Fermer le menu au clic ailleurs
    document.addEventListener('click', () => {
      document.getElementById('task-context-menu').style.display = 'none';
    });
  }

  setupContextMenu() {
    const contextMenu = document.getElementById('task-context-menu');

    document.getElementById('ctx-edit-task').addEventListener('click', (e) => {
      e.preventDefault();
      contextMenu.style.display = 'none';
      if (this.contextMenuTaskId) {
        this.openTaskModal(this.contextMenuTaskId);
      }
    });

    document.getElementById('ctx-view-kanban').addEventListener('click', (e) => {
      e.preventDefault();
      contextMenu.style.display = 'none';
      if (this.contextMenuTaskId) {
        window.location.href = `index.html?taskId=${this.contextMenuTaskId}`;
      }
    });

    document.getElementById('ctx-focus').addEventListener('click', (e) => {
      e.preventDefault();
      contextMenu.style.display = 'none';
      if (this.contextMenuTaskId && this.timeline) {
        const item = this.items.get(this.contextMenuTaskId);
        if (item && item.start) {
          this.timeline.moveTo(item.start);
        }
      }
    });
  }

  getFilteredTasks() {
    return this.tasks.filter(task => {
      // Filtre par statut
      if (this.filterStatus && task.statut !== this.filterStatus) {
        return false;
      }

      // Filtre par mission
      if (this.filterMission) {
        if (this.filterMission === 'orphan') {
          if (task.strategie_id) return false;
        } else {
          if (task.strategie_id !== parseInt(this.filterMission)) return false;
        }
      }

      // Recherche textuelle
      if (this.searchTerm) {
        const searchIn = `${task.titre || ''} ${task.description || ''} ${task.qui || ''}`.toLowerCase();
        if (!searchIn.includes(this.searchTerm)) return false;
      }

      return true;
    });
  }

  renderTimeline() {
    const container = document.getElementById('timeline-visualization');
    const filteredTasks = this.getFilteredTasks();

    // Créer les items
    this.items = new vis.DataSet();
    this.groups = new vis.DataSet();

    // Créer les groupes si nécessaire
    if (this.groupMode !== 'none') {
      this.createGroups(filteredTasks);
    }

    // Ajouter les tâches à la timeline
    const now = new Date();

    filteredTasks.forEach(task => {
      // Déterminer les dates
      let startDate = null;
      let endDate = null;

      // Utiliser echeance comme date principale
      if (task.echeance && task.echeance > 0) {
        // Grist stocke les dates en timestamp Unix (secondes depuis 1970)
        endDate = new Date(task.echeance * 1000);
        // La date de début est soit date_creation soit 7 jours avant l'échéance
        if (task.date_creation && task.date_creation > 0) {
          startDate = new Date(task.date_creation * 1000);
        } else {
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
      } else if (task.date_creation && task.date_creation > 0) {
        // Si pas d'échéance, utiliser date_creation comme point
        startDate = new Date(task.date_creation * 1000);
        endDate = startDate;
      } else {
        // Pas de date, placer à aujourd'hui
        startDate = now;
        endDate = now;
      }

      // Ignorer les dates invalides
      if (startDate.getFullYear() < 2020) return;

      // Déterminer la couleur
      const color = this.getTaskColor(task);

      // Déterminer le groupe
      let groupId = null;
      if (this.groupMode !== 'none') {
        groupId = this.getGroupId(task);
      }

      // Créer l'item
      const isRange = startDate.getTime() !== endDate.getTime();
      const isOverdue = endDate < now && task.statut !== 'Terminé';

      const item = {
        id: task.id,
        content: this.truncate(task.titre || 'Sans titre', 40),
        start: startDate,
        end: isRange ? endDate : undefined,
        type: isRange ? 'range' : 'point',
        style: `background-color: ${color}; border-color: ${this.adjustColor(color, -20)}; color: white;`,
        title: this.buildTooltip(task, startDate, endDate, isOverdue),
        className: isOverdue ? 'overdue-task' : ''
      };

      if (groupId !== null) {
        item.group = groupId;
      }

      this.items.add(item);
    });

    // Options de la timeline
    const options = {
      width: '100%',
      height: this.groupMode !== 'none' ? '600px' : '500px',
      margin: { item: 10, axis: 40 },
      orientation: 'top',
      showCurrentTime: true,
      zoomMin: 1000 * 60 * 60 * 24,       // 1 jour
      zoomMax: 1000 * 60 * 60 * 24 * 365, // 1 an
      moveable: true,
      zoomable: true,
      stack: true,
      stackSubgroups: true,
      locale: 'fr',
      format: {
        minorLabels: {
          hour: 'HH:mm',
          day: 'D',
          weekday: 'ddd D',
          month: 'MMM',
          year: 'YYYY'
        },
        majorLabels: {
          hour: 'ddd D MMMM',
          day: 'MMMM YYYY',
          week: 'MMMM YYYY',
          month: 'YYYY',
          year: ''
        }
      }
    };

    // Créer ou mettre à jour la timeline
    if (this.timeline) {
      this.timeline.destroy();
    }

    if (this.groupMode !== 'none') {
      this.timeline = new vis.Timeline(container, this.items, this.groups, options);
    } else {
      this.timeline = new vis.Timeline(container, this.items, options);
    }

    // Événements
    this.timeline.on('click', (params) => {
      if (params.item) {
        this.openTaskModal(params.item);
      }
    });

    this.timeline.on('contextmenu', (params) => {
      if (params.item) {
        params.event.preventDefault();
        this.contextMenuTaskId = params.item;

        const contextMenu = document.getElementById('task-context-menu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = params.pageX + 'px';
        contextMenu.style.top = params.pageY + 'px';
      }
    });

    this.timeline.on('rangechanged', () => {
      this.updateVisibleRange();
    });

    // Ajuster la vue initiale
    this.adjustTimelineView();
  }

  createGroups(tasks) {
    const groupSet = new Set();

    tasks.forEach(task => {
      const groupId = this.getGroupId(task);
      const groupLabel = this.getGroupLabel(task);

      if (groupId !== null && !groupSet.has(groupId)) {
        groupSet.add(groupId);
        this.groups.add({
          id: groupId,
          content: groupLabel,
          style: 'font-weight: bold;'
        });
      }
    });

    // Ajouter un groupe "Non classé" si nécessaire
    if (this.groupMode === 'mission') {
      this.groups.add({
        id: 'orphan',
        content: 'Sans mission',
        style: 'font-weight: bold; color: #6b7280;'
      });
    }
  }

  getGroupId(task) {
    switch (this.groupMode) {
      case 'mission':
        return task.strategie_id || 'orphan';
      case 'status':
        return task.statut || 'Non défini';
      case 'bureau':
        const bureaux = this.parseBureau(task.bureau);
        return bureaux[0] || 'Non attribué';
      default:
        return null;
    }
  }

  getGroupLabel(task) {
    switch (this.groupMode) {
      case 'mission':
        if (task.strategie_id) {
          const mission = this.missions.find(m => m.id === task.strategie_id);
          return mission ? (mission.nom || `Mission #${mission.id}`) : `Mission #${task.strategie_id}`;
        }
        return 'Sans mission';
      case 'status':
        return task.statut || 'Non défini';
      case 'bureau':
        const bureaux = this.parseBureau(task.bureau);
        return bureaux[0] || 'Non attribué';
      default:
        return '';
    }
  }

  getTaskColor(task) {
    switch (this.colorMode) {
      case 'status':
        return this.statusColors[task.statut] || '#6b7280';

      case 'mission':
        if (task.strategie_id) {
          return this.missionColors[task.strategie_id] || '#6b7280';
        }
        return '#6b7280';

      case 'bureau':
        const bureaux = this.parseBureau(task.bureau);
        if (bureaux.length > 0) {
          return this.bureauColors[bureaux[0]] || this.bureauColors.default;
        }
        return this.bureauColors.default;

      default:
        return '#3b82f6';
    }
  }

  parseBureau(bureau) {
    if (!bureau) return [];

    if (Array.isArray(bureau)) {
      return bureau.filter(v => v && String(v).trim() && String(v).trim() !== 'L');
    }

    if (typeof bureau === 'string') {
      if (bureau.startsWith('[')) {
        try {
          return JSON.parse(bureau).filter(v => v && v !== 'L');
        } catch (e) {
          return [bureau];
        }
      }
      return [bureau];
    }

    return [];
  }

  buildTooltip(task, startDate, endDate, isOverdue) {
    const mission = task.strategie_id ? this.missions.find(m => m.id === task.strategie_id) : null;
    const missionName = mission ? (mission.nom || `Mission #${mission.id}`) : 'Sans mission';

    let tooltip = `#${task.id} - ${task.titre || 'Sans titre'}\n`;
    tooltip += `Statut: ${task.statut || 'Non défini'}\n`;
    tooltip += `Mission: ${missionName}\n`;

    if (startDate && endDate && startDate.getTime() !== endDate.getTime()) {
      tooltip += `Du: ${startDate.toLocaleDateString('fr-FR')}\n`;
      tooltip += `Au: ${endDate.toLocaleDateString('fr-FR')}\n`;
    } else if (endDate) {
      tooltip += `Échéance: ${endDate.toLocaleDateString('fr-FR')}\n`;
    }

    if (isOverdue) {
      tooltip += '⚠️ EN RETARD';
    }

    return tooltip;
  }

  adjustTimelineView() {
    if (!this.timeline) return;

    const now = new Date();
    let start, end;

    switch (this.currentPeriod) {
      case 'week':
        start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        start = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        this.timeline.fit();
        return;
    }

    this.timeline.setWindow(start, end);
  }

  updateVisibleRange() {
    const range = this.timeline.getWindow();
    const start = new Date(range.start).toLocaleDateString('fr-FR');
    const end = new Date(range.end).toLocaleDateString('fr-FR');
    document.getElementById('visible-range').textContent = `${start} - ${end}`;
  }

  updateStats() {
    const filteredTasks = this.getFilteredTasks();
    const now = new Date();

    const total = filteredTasks.length;
    const withDate = filteredTasks.filter(t => t.echeance && t.echeance > 0).length;
    const overdue = filteredTasks.filter(t => {
      if (!t.echeance || t.statut === 'Terminé') return false;
      const echeance = new Date(t.echeance * 1000);
      return echeance < now;
    }).length;

    const missionsUsed = new Set(filteredTasks.filter(t => t.strategie_id).map(t => t.strategie_id));

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-with-date').textContent = withDate;
    document.getElementById('stat-overdue').textContent = overdue;
    document.getElementById('stat-missions').textContent = missionsUsed.size;
  }

  updateLegend() {
    const container = document.getElementById('legend-container');
    let html = '';

    switch (this.colorMode) {
      case 'status':
        Object.entries(this.statusColors).forEach(([status, color]) => {
          html += `
            <div class="legend-item">
              <div class="legend-color" style="background-color: ${color};"></div>
              <span>${status}</span>
            </div>
          `;
        });
        break;

      case 'mission':
        this.missions.forEach(mission => {
          const color = this.missionColors[mission.id];
          html += `
            <div class="legend-item">
              <div class="legend-color" style="background-color: ${color};"></div>
              <span>${mission.nom || `Mission #${mission.id}`}</span>
            </div>
          `;
        });
        html += `
          <div class="legend-item">
            <div class="legend-color" style="background-color: #6b7280;"></div>
            <span>Sans mission</span>
          </div>
        `;
        break;

      case 'bureau':
        Object.entries(this.bureauColors).forEach(([bureau, color]) => {
          if (bureau !== 'default') {
            html += `
              <div class="legend-item">
                <div class="legend-color" style="background-color: ${color};"></div>
                <span>${bureau}</span>
              </div>
            `;
          }
        });
        break;
    }

    container.innerHTML = html;
  }

  openTaskModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (this.sharedTaskModal) {
      this.sharedTaskModal.open(task);
    } else {
      // Fallback: afficher une alerte avec les infos
      alert(`Tâche #${task.id}\n${task.titre || 'Sans titre'}\nStatut: ${task.statut}`);
    }
  }

  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  showError(message) {
    const container = document.getElementById('error-container');
    if (container) {
      const div = document.createElement('div');
      div.className = 'alert alert-danger alert-dismissible fade show';
      div.innerHTML = `
        <strong>Erreur:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      container.appendChild(div);
    }
  }

  showToast(message, type = 'info') {
    // Créer un toast simple
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('timeline-visualization')) {
    console.log('Initialisation TimelineManager');
    new TimelineAppManager();
  }
});
