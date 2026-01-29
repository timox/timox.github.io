// === timeline-app.js ===
// Application Gantt Timeline utilisant vis-timeline (unifié avec TimelineManager)

const TABLE_ID = 'Ssir_principale_task';
const STRATEGY_TABLE_ID = 'Ssir_strategie2';

// Couleurs par statut
const STATUS_COLORS = {
  'Backlog': '#9ca3af',
  'À faire': '#3b82f6',
  'En cours': '#f59e0b',
  'Terminé': '#10b981',
  'Bloqué': '#ef4444'
};

// Couleurs par urgence
const URGENCE_COLORS = {
  'Critique': '#dc2626',
  'Haute': '#f97316',
  'Moyenne': '#eab308',
  'Faible': '#22c55e'
};

/**
 * Application Gantt Timeline avec vis-timeline
 */
class GanttTimeline {
  constructor() {
    this.tasks = [];
    this.missions = {};
    this.timeline = null;
    this.items = null;
    this.groups = null;
    this.selectedTaskId = null;
    this.groupBy = 'status'; // status, urgence, mission

    // Modale partagée (instance unique)
    this.sharedTaskModal = null;

    // Références DOM
    this.timelineContainer = document.getElementById('timeline-container');
    this.loadingEl = document.getElementById('loading');
  }

  /**
   * Initialise l'application
   */
  async init() {
    console.log('[GanttTimeline] Initialisation...');

    try {
      // Attendre Grist
      await this.waitForGrist();

      // Charger les données
      await this.loadData();

      // Initialiser la modale partagée
      await this.initSharedTaskModal();

      // Configurer les événements UI
      this.setupEventListeners();

      // Créer la timeline vis.js
      this.createTimeline();

      // Masquer le chargement
      if (this.loadingEl) {
        this.loadingEl.style.display = 'none';
      }

      console.log('[GanttTimeline] Prêt');
    } catch (error) {
      console.error('[GanttTimeline] Erreur initialisation:', error);
      if (this.loadingEl) {
        this.loadingEl.innerHTML = `<div class="alert alert-danger">Erreur: ${error.message}</div>`;
      }
    }
  }

  /**
   * Attend que Grist soit prêt
   */
  async waitForGrist() {
    return new Promise((resolve, reject) => {
      if (typeof grist === 'undefined') {
        reject(new Error('Grist non disponible'));
        return;
      }

      grist.ready({ requiredAccess: 'full' });
      setTimeout(resolve, 300);
    });
  }

  /**
   * Initialise SharedTaskModal (instance unique)
   */
  async initSharedTaskModal() {
    if (typeof SharedTaskModal === 'undefined') {
      console.warn('[GanttTimeline] SharedTaskModal non disponible');
      return;
    }

    this.sharedTaskModal = new SharedTaskModal({
      showTimes: true,
      showLinks: false,
      showJalons: true,
      showHistory: true,
      onSave: async (data) => {
        await this.saveTask(data);
        await this.loadData();
        this.updateTimeline();
      },
      onDelete: async (id) => {
        await this.deleteTask(id);
        await this.loadData();
        this.updateTimeline();
      }
    });

    await this.sharedTaskModal.init();
    console.log('[GanttTimeline] SharedTaskModal initialisé');
  }

  /**
   * Charge les données depuis Grist
   */
  async loadData() {
    try {
      const data = await grist.docApi.fetchTable(TABLE_ID);

      if (!data || !data.id) {
        this.tasks = [];
        return;
      }

      this.tasks = [];
      for (let i = 0; i < data.id.length; i++) {
        const task = {
          id: data.id[i],
          titre: data.titre?.[i] || 'Sans titre',
          statut: data.statut?.[i] || 'Backlog',
          urgence: data.urgence?.[i] || 'Moyenne',
          date_debut: this.parseDate(data.date_debut?.[i]),
          date_echeance: this.parseDate(data.date_echeance?.[i] || data.echeance?.[i]),
          date_creation: this.parseDate(data.date_creation?.[i]),
          strategie_id: data.strategie_id?.[i] || null,
          code_mission: data.code_mission?.[i] || '',
          avancement: this.parseProgress(data.avancement?.[i]),
          qui: data.qui?.[i] || null,
          bureau: data.bureau?.[i] || null
        };

        this.tasks.push(task);
      }

      // Charger les missions
      try {
        const missionData = await grist.docApi.fetchTable(STRATEGY_TABLE_ID);
        if (missionData && missionData.id) {
          for (let i = 0; i < missionData.id.length; i++) {
            const id = missionData.id[i];
            this.missions[id] = {
              code: missionData.axe_strategique?.[i] || '',
              nom: missionData.action?.[i] || ''
            };
          }
        }
      } catch (e) {
        console.warn('[GanttTimeline] Pas de table missions');
      }

      console.log(`[GanttTimeline] ${this.tasks.length} tâches chargées`);

    } catch (error) {
      console.error('[GanttTimeline] Erreur chargement:', error);
      this.tasks = [];
    }
  }

  /**
   * Parse une date Grist
   */
  parseDate(value) {
    if (!value) return null;
    if (typeof value === 'number') {
      return new Date(value * 1000);
    }
    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  /**
   * Parse la progression
   */
  parseProgress(value) {
    if (typeof value === 'number') return Math.min(100, Math.max(0, Math.round(value)));
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : Math.min(100, Math.max(0, Math.round(num)));
    }
    return 0;
  }

  /**
   * Configure les événements UI
   */
  setupEventListeners() {
    // Navigation
    document.getElementById('btn-prev')?.addEventListener('click', () => this.navigate(-1));
    document.getElementById('btn-next')?.addEventListener('click', () => this.navigate(1));
    document.getElementById('btn-today')?.addEventListener('click', () => this.goToToday());

    // Vue (jour/semaine/mois)
    document.querySelectorAll('.view-toggle button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.setTimeScale(e.target.dataset.view);
      });
    });

    // Tri/Groupement
    document.getElementById('sort-by')?.addEventListener('change', (e) => {
      this.groupBy = e.target.value;
      this.updateTimeline();
    });

    // Menu contextuel
    document.getElementById('ctx-edit')?.addEventListener('click', () => {
      if (this.selectedTaskId) {
        this.openTaskModal(this.selectedTaskId);
      }
    });

    document.getElementById('ctx-kanban')?.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    document.getElementById('ctx-focus')?.addEventListener('click', () => {
      if (this.selectedTaskId) {
        this.focusOnTask(this.selectedTaskId);
      }
    });

    // Fermer menu contextuel au clic ailleurs
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.hideContextMenu();
      }
    });
  }

  /**
   * Crée la timeline vis.js
   */
  createTimeline() {
    if (!this.timelineContainer) {
      console.error('[GanttTimeline] Container non trouvé');
      return;
    }

    // Préparer les items et groupes
    const { items, groups } = this.prepareTimelineData();

    // Options de la timeline
    const options = {
      orientation: 'top',
      stack: true,
      showCurrentTime: true,
      zoomMin: 1000 * 60 * 60 * 24 * 1, // 1 jour
      zoomMax: 1000 * 60 * 60 * 24 * 365, // 1 an
      editable: {
        add: false,
        updateTime: true,
        updateGroup: false,
        remove: false
      },
      snap: (date) => {
        // Snap aux jours
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      },
      onMove: (item, callback) => {
        this.handleItemMove(item, callback);
      },
      template: (item) => this.itemTemplate(item),
      groupTemplate: (group) => this.groupTemplate(group)
    };

    // Stocker les DataSets
    this.items = new vis.DataSet(items);
    this.groups = new vis.DataSet(groups);

    // Créer la timeline
    this.timeline = new vis.Timeline(
      this.timelineContainer,
      this.items,
      this.groups,
      options
    );

    // Événements timeline
    this.timeline.on('select', (props) => {
      if (props.items.length > 0) {
        this.selectedTaskId = props.items[0];
      }
    });

    this.timeline.on('doubleClick', (props) => {
      if (props.item) {
        this.openTaskModal(props.item);
      }
    });

    this.timeline.on('contextmenu', (props) => {
      if (props.item) {
        this.selectedTaskId = props.item;
        this.showContextMenu(props.event);
        props.event.preventDefault();
      }
    });

    // Centrer sur aujourd'hui
    this.goToToday();

    // Mettre à jour le compteur
    document.getElementById('task-count')?.textContent = this.tasks.length;
  }

  /**
   * Prépare les données pour vis-timeline
   */
  prepareTimelineData() {
    const items = [];
    const groupsMap = new Map();

    for (const task of this.tasks) {
      // Déterminer les dates
      let start = task.date_debut || task.date_creation || new Date();
      let end = task.date_echeance || new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 jours par défaut

      // S'assurer que end > start
      if (end <= start) {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // +1 jour
      }

      // Déterminer le groupe
      let groupId, groupLabel, groupOrder;
      switch (this.groupBy) {
        case 'urgence':
          groupId = task.urgence || 'Non défini';
          groupLabel = groupId;
          groupOrder = ['Critique', 'Haute', 'Moyenne', 'Faible', 'Non défini'].indexOf(groupId);
          break;
        case 'mission':
          groupId = task.strategie_id || 'Sans mission';
          const mission = this.missions[task.strategie_id];
          groupLabel = mission ? `${mission.code} - ${mission.nom}` : 'Sans mission';
          groupOrder = groupId === 'Sans mission' ? 999 : parseInt(groupId) || 0;
          break;
        default: // status
          groupId = task.statut || 'Backlog';
          groupLabel = groupId;
          groupOrder = ['Backlog', 'À faire', 'En cours', 'Bloqué', 'Terminé'].indexOf(groupId);
      }

      // Ajouter le groupe s'il n'existe pas
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, {
          id: groupId,
          content: groupLabel,
          order: groupOrder
        });
      }

      // Déterminer la couleur
      const color = this.groupBy === 'urgence'
        ? URGENCE_COLORS[task.urgence] || '#9ca3af'
        : STATUS_COLORS[task.statut] || '#9ca3af';

      // Créer l'item
      items.push({
        id: task.id,
        group: groupId,
        content: task.titre,
        start: start,
        end: end,
        className: `task-item status-${(task.statut || 'backlog').toLowerCase().replace(/\s+/g, '-')}`,
        style: `background-color: ${color}; border-color: ${color};`,
        title: `${task.titre}\n${task.statut} | ${task.urgence}\nAvancement: ${task.avancement}%`,
        task: task // Garder la référence pour le template
      });
    }

    // Convertir Map en array et trier
    const groups = Array.from(groupsMap.values()).sort((a, b) => a.order - b.order);

    return { items, groups };
  }

  /**
   * Template pour les items
   */
  itemTemplate(item) {
    const task = item.task;
    if (!task) return item.content;

    const progress = task.avancement || 0;
    return `
      <div class="timeline-item-content">
        <span class="item-title">${item.content}</span>
        ${progress > 0 ? `<span class="item-progress">${progress}%</span>` : ''}
      </div>
    `;
  }

  /**
   * Template pour les groupes
   */
  groupTemplate(group) {
    const color = STATUS_COLORS[group.id] || URGENCE_COLORS[group.id] || '#6b7280';
    return `
      <div class="timeline-group-content">
        <span class="group-color" style="background-color: ${color}"></span>
        <span class="group-label">${group.content}</span>
      </div>
    `;
  }

  /**
   * Met à jour la timeline avec les nouvelles données
   */
  updateTimeline() {
    if (!this.timeline) return;

    const { items, groups } = this.prepareTimelineData();

    this.items.clear();
    this.items.add(items);

    this.groups.clear();
    this.groups.add(groups);

    document.getElementById('task-count')?.textContent = this.tasks.length;
  }

  /**
   * Gère le déplacement d'un item
   */
  async handleItemMove(item, callback) {
    try {
      const task = this.tasks.find(t => t.id === item.id);
      if (!task) {
        callback(null);
        return;
      }

      // Mettre à jour les dates
      const updates = {
        date_debut: Math.floor(item.start.getTime() / 1000),
        date_echeance: Math.floor(item.end.getTime() / 1000)
      };

      await grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, item.id, updates]
      ]);

      console.log('[GanttTimeline] Tâche déplacée:', item.id);
      callback(item);

      // Recharger les données
      await this.loadData();

    } catch (error) {
      console.error('[GanttTimeline] Erreur déplacement:', error);
      callback(null);
    }
  }

  /**
   * Navigation temporelle
   */
  navigate(direction) {
    if (!this.timeline) return;

    const range = this.timeline.getWindow();
    const interval = range.end - range.start;
    const step = interval * 0.3 * direction;

    this.timeline.setWindow(
      range.start.getTime() + step,
      range.end.getTime() + step
    );
  }

  /**
   * Aller à aujourd'hui
   */
  goToToday() {
    if (!this.timeline) return;

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);

    const end = new Date(today);
    end.setDate(end.getDate() + 21);

    this.timeline.setWindow(start, end);
  }

  /**
   * Change l'échelle de temps
   */
  setTimeScale(scale) {
    if (!this.timeline) return;

    const today = new Date();
    let start, end;

    switch (scale) {
      case 'day':
        start = new Date(today);
        start.setDate(start.getDate() - 3);
        end = new Date(today);
        end.setDate(end.getDate() + 11);
        break;
      case 'week':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        end = new Date(today);
        end.setDate(end.getDate() + 21);
        break;
      case 'month':
        start = new Date(today);
        start.setDate(1);
        end = new Date(today);
        end.setMonth(end.getMonth() + 2);
        end.setDate(0);
        break;
    }

    this.timeline.setWindow(start, end);
  }

  /**
   * Focus sur une tâche
   */
  focusOnTask(taskId) {
    if (!this.timeline) return;

    this.timeline.focus(taskId, {
      animation: { duration: 500, easingFunction: 'easeInOutQuad' }
    });
  }

  /**
   * Ouvre la modale de tâche
   */
  openTaskModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (this.sharedTaskModal) {
      this.sharedTaskModal.open(task);
    } else {
      console.warn('[GanttTimeline] SharedTaskModal non initialisé');
      alert(`Tâche: ${task.titre}\nStatut: ${task.statut}\nAvancement: ${task.avancement}%`);
    }
  }

  /**
   * Affiche le menu contextuel
   */
  showContextMenu(event) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.style.display = 'block';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
  }

  /**
   * Cache le menu contextuel
   */
  hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) {
      menu.style.display = 'none';
    }
  }

  /**
   * Sauvegarde une tâche dans Grist
   */
  async saveTask(data) {
    try {
      const record = { ...data };
      const taskId = record.id;
      delete record.id;

      // Convertir strategie_ids en strategie_id (format Grist ReferenceList)
      if (record.strategie_ids && Array.isArray(record.strategie_ids) && record.strategie_ids.length > 0) {
        record.strategie_id = ['L', ...record.strategie_ids];
      }
      // Supprimer strategie_ids qui n'est pas une colonne Grist
      delete record.strategie_ids;

      // Convertir les jalons et liens en JSON string si nécessaire
      if (record.jalons && typeof record.jalons !== 'string') {
        record.jalons = JSON.stringify(record.jalons);
      }
      if (record.liens && typeof record.liens !== 'string') {
        record.liens = JSON.stringify(record.liens);
      }

      if (taskId) {
        await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, taskId, record]
        ]);
        console.log('[GanttTimeline] Tâche mise à jour:', taskId);
      } else {
        await grist.docApi.applyUserActions([
          ['AddRecord', TABLE_ID, null, record]
        ]);
        console.log('[GanttTimeline] Nouvelle tâche créée');
      }
    } catch (error) {
      console.error('[GanttTimeline] Erreur sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Supprime une tâche
   */
  async deleteTask(taskId) {
    try {
      await grist.docApi.applyUserActions([
        ['RemoveRecord', TABLE_ID, taskId]
      ]);
      console.log('[GanttTimeline] Tâche supprimée:', taskId);
    } catch (error) {
      console.error('[GanttTimeline] Erreur suppression:', error);
      throw error;
    }
  }
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', async () => {
  const app = new GanttTimeline();
  await app.init();

  // Exposer pour debug
  window.ganttTimeline = app;
});
