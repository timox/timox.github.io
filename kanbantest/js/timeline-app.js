// === timeline-app.js ===
// Application Gantt Timeline compacte

const TABLE_ID = 'Ssir_principale_task';
const STRATEGY_TABLE_ID = 'Ssir_strategie2';

// Configuration
const CONFIG = {
  dayWidth: 40,      // Largeur d'un jour en pixels (vue jour)
  weekDayWidth: 80,  // Largeur d'un jour en pixels (vue semaine)
  monthDayWidth: 20, // Largeur d'un jour en pixels (vue mois)
  rowHeight: 56
};

/**
 * Application Gantt Timeline
 */
class GanttTimeline {
  constructor() {
    this.tasks = [];
    this.missions = {};
    this.viewMode = 'day'; // day, week, month
    this.viewStart = new Date();
    this.viewEnd = new Date();
    this.sortBy = 'priority';
    this.selectedTaskId = null;

    // Références DOM
    this.taskListEl = document.getElementById('task-list');
    this.timelineHeaderEl = document.getElementById('timeline-header');
    this.timelineBodyEl = document.getElementById('timeline-body');
    this.loadingEl = document.getElementById('loading');

    // Initialiser la période de vue
    this.initViewPeriod();
  }

  /**
   * Initialise l'application
   */
  async init() {
    console.log('[GanttTimeline] Initialisation...');

    // Attendre Grist
    await this.waitForGrist();

    // Charger les données
    await this.loadData();

    // Configurer les événements
    this.setupEventListeners();

    // Rendu initial
    this.render();

    // Masquer le chargement
    this.loadingEl.style.display = 'none';

    console.log('[GanttTimeline] Prêt');
  }

  /**
   * Attend que Grist soit prêt
   */
  async waitForGrist() {
    return new Promise((resolve, reject) => {
      if (typeof grist === 'undefined') {
        console.error('[GanttTimeline] Grist non disponible');
        reject(new Error('Grist not available'));
        return;
      }

      grist.ready({ requiredAccess: 'full' });
      setTimeout(resolve, 300);
    });
  }

  /**
   * Charge les données depuis Grist
   */
  async loadData() {
    try {
      // Charger les tâches
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
          statut: data.statut?.[i] || '',
          urgence: data.urgence?.[i] || '',
          date_debut: this.parseDate(data.date_debut?.[i]),
          date_echeance: this.parseDate(data.date_echeance?.[i] || data.echeance?.[i]),
          date_creation: this.parseDate(data.date_creation?.[i]),
          strategie_id: data.strategie_id?.[i] || null,
          code_mission: data.code_mission?.[i] || '',
          avancement: this.parseProgress(data.avancement?.[i])
        };

        // Ne garder que les tâches avec au moins une date
        if (task.date_debut || task.date_echeance || task.date_creation) {
          this.tasks.push(task);
        }
      }

      // Charger les missions
      try {
        const missionData = await grist.docApi.fetchTable(STRATEGY_TABLE_ID);
        if (missionData && missionData.id2) {
          for (let i = 0; i < missionData.id2.length; i++) {
            const id = missionData.id2[i];
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
      // Timestamp Unix en secondes
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
   * Initialise la période de vue
   */
  initViewPeriod() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vue par défaut: 1 mois centré sur aujourd'hui
    this.viewStart = new Date(today);
    this.viewStart.setDate(this.viewStart.getDate() - 7);

    this.viewEnd = new Date(this.viewStart);
    this.viewEnd.setDate(this.viewEnd.getDate() + 30);
  }

  /**
   * Configure les événements
   */
  setupEventListeners() {
    // Navigation
    document.getElementById('btn-prev').addEventListener('click', () => this.navigate(-1));
    document.getElementById('btn-next').addEventListener('click', () => this.navigate(1));
    document.getElementById('btn-today').addEventListener('click', () => this.goToToday());

    // Vue
    document.querySelectorAll('.view-toggle button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.viewMode = e.target.dataset.view;
        this.render();
      });
    });

    // Tri
    document.getElementById('sort-by').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });

    // Synchronisation du scroll
    const leftBody = this.taskListEl;
    const rightBody = this.timelineBodyEl;

    leftBody.addEventListener('scroll', () => {
      rightBody.scrollTop = leftBody.scrollTop;
    });

    rightBody.addEventListener('scroll', () => {
      leftBody.scrollTop = rightBody.scrollTop;
      // Sync header scroll
      this.timelineHeaderEl.scrollLeft = rightBody.scrollLeft;
    });

    // Menu contextuel
    document.addEventListener('click', () => this.hideContextMenu());

    document.getElementById('ctx-edit').addEventListener('click', () => {
      if (this.selectedTaskId) {
        this.openTaskModal(this.selectedTaskId);
      }
    });

    document.getElementById('ctx-kanban').addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    document.getElementById('ctx-focus').addEventListener('click', () => {
      if (this.selectedTaskId) {
        this.focusOnTask(this.selectedTaskId);
      }
    });
  }

  /**
   * Navigation temporelle
   */
  navigate(direction) {
    const days = this.viewMode === 'day' ? 7 :
                 this.viewMode === 'week' ? 14 : 30;

    this.viewStart.setDate(this.viewStart.getDate() + (direction * days));
    this.viewEnd.setDate(this.viewEnd.getDate() + (direction * days));

    this.render();
  }

  /**
   * Aller à aujourd'hui
   */
  goToToday() {
    this.initViewPeriod();
    this.render();

    // Scroller pour centrer sur aujourd'hui
    setTimeout(() => {
      const todayMarker = document.querySelector('.today-marker');
      if (todayMarker) {
        const container = this.timelineBodyEl;
        const markerLeft = parseInt(todayMarker.style.left);
        container.scrollLeft = markerLeft - container.clientWidth / 2;
      }
    }, 100);
  }

  /**
   * Trier les tâches
   */
  sortTasks(tasks) {
    const sorted = [...tasks];

    switch (this.sortBy) {
      case 'priority':
        const priorityOrder = { 'Immédiate': 0, 'Courte': 1, 'Moyenne': 2, 'Longue': 3, '': 4 };
        sorted.sort((a, b) => (priorityOrder[a.urgence] || 4) - (priorityOrder[b.urgence] || 4));
        break;
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.date_debut || a.date_echeance || a.date_creation;
          const dateB = b.date_debut || b.date_echeance || b.date_creation;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA - dateB;
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.titre.localeCompare(b.titre));
        break;
      case 'progress':
        sorted.sort((a, b) => b.avancement - a.avancement);
        break;
    }

    return sorted;
  }

  /**
   * Obtenir la couleur selon la priorité
   */
  getPriorityClass(task) {
    if (task.statut === 'Terminé' || task.statut === 'Annulé') return 'done';

    switch (task.urgence) {
      case 'Immédiate': return 'high';
      case 'Courte': return 'medium';
      case 'Moyenne': return 'normal';
      case 'Longue': return 'low';
      default: return 'normal';
    }
  }

  /**
   * Formater une date courte
   */
  formatDateShort(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  /**
   * Formater une date très courte
   */
  formatDateCompact(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    return `${day} ${month}`;
  }

  /**
   * Rendu complet
   */
  render() {
    const sortedTasks = this.sortTasks(this.tasks);

    this.renderTaskList(sortedTasks);
    this.renderTimeline(sortedTasks);
    this.updateDateRange();

    document.getElementById('task-count').textContent = sortedTasks.length;
  }

  /**
   * Rendu de la liste des tâches (panneau gauche)
   */
  renderTaskList(tasks) {
    if (tasks.length === 0) {
      this.taskListEl.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-calendar-x"></i>
          <p>Aucune tâche avec des dates</p>
        </div>
      `;
      return;
    }

    let html = '';

    for (const task of tasks) {
      const priorityClass = this.getPriorityClass(task);
      const startDate = task.date_debut || task.date_creation;
      const endDate = task.date_echeance;
      const dateStr = startDate && endDate ?
        `${this.formatDateCompact(startDate)} - ${this.formatDateCompact(endDate)}` :
        startDate ? this.formatDateCompact(startDate) :
        endDate ? `Éch: ${this.formatDateCompact(endDate)}` : '';

      html += `
        <div class="task-row" data-task-id="${task.id}">
          <div class="task-drag-handle">
            <i class="bi bi-grip-vertical"></i>
          </div>
          <div class="task-color-bar color-${priorityClass}"></div>
          <div class="task-info">
            <div class="task-name" title="${this.escapeHtml(task.titre)}">${this.escapeHtml(task.titre)}</div>
            <div class="task-dates">${dateStr}</div>
          </div>
          <div class="task-progress">${task.avancement}%</div>
        </div>
      `;
    }

    this.taskListEl.innerHTML = html;

    // Événements clic sur les lignes
    this.taskListEl.querySelectorAll('.task-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const taskId = parseInt(row.dataset.taskId);
        this.openTaskModal(taskId);
      });

      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.selectedTaskId = parseInt(row.dataset.taskId);
        this.showContextMenu(e.clientX, e.clientY);
      });
    });
  }

  /**
   * Rendu de la timeline (panneau droit)
   */
  renderTimeline(tasks) {
    const dayWidth = this.viewMode === 'day' ? CONFIG.dayWidth :
                     this.viewMode === 'week' ? CONFIG.weekDayWidth :
                     CONFIG.monthDayWidth;

    const days = this.getDaysInRange();
    const totalWidth = days.length * dayWidth;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Rendu de l'en-tête
    let headerHtml = '<div class="timeline-header" style="width: ' + totalWidth + 'px;">';

    for (const day of days) {
      const isToday = day.getTime() === today.getTime();
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const classes = ['timeline-day'];
      if (isToday) classes.push('today');
      if (isWeekend) classes.push('weekend');

      const label = this.viewMode === 'month' ?
        day.getDate() :
        day.getDate();

      headerHtml += `<div class="${classes.join(' ')}" style="width: ${dayWidth}px;">${label}</div>`;
    }

    headerHtml += '</div>';
    this.timelineHeaderEl.innerHTML = headerHtml;

    // Rendu du corps
    if (tasks.length === 0) {
      this.timelineBodyEl.innerHTML = '';
      return;
    }

    let bodyHtml = '<div class="timeline-grid" style="width: ' + totalWidth + 'px;">';

    // Marqueur aujourd'hui
    const todayOffset = this.getDayOffset(today);
    if (todayOffset >= 0 && todayOffset < days.length) {
      const todayLeft = todayOffset * dayWidth + dayWidth / 2;
      bodyHtml += `<div class="today-marker" style="left: ${todayLeft}px;"></div>`;
    }

    // Lignes de tâches
    for (const task of tasks) {
      bodyHtml += this.renderTimelineRow(task, days, dayWidth, totalWidth);
    }

    bodyHtml += '</div>';
    this.timelineBodyEl.innerHTML = bodyHtml;

    // Événements sur les barres
    this.timelineBodyEl.querySelectorAll('.task-bar').forEach(bar => {
      bar.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = parseInt(bar.dataset.taskId);
        this.openTaskModal(taskId);
      });

      bar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectedTaskId = parseInt(bar.dataset.taskId);
        this.showContextMenu(e.clientX, e.clientY);
      });
    });
  }

  /**
   * Rendu d'une ligne de timeline
   */
  renderTimelineRow(task, days, dayWidth, totalWidth) {
    const priorityClass = this.getPriorityClass(task);

    // Cellules de fond
    let rowHtml = `<div class="timeline-row" data-task-id="${task.id}">`;

    for (const day of days) {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      rowHtml += `<div class="timeline-cell${isWeekend ? ' weekend' : ''}" style="width: ${dayWidth}px;"></div>`;
    }

    // Barre de tâche
    const startDate = task.date_debut || task.date_creation;
    const endDate = task.date_echeance || startDate;

    if (startDate) {
      const startOffset = this.getDayOffset(startDate);
      const endOffset = this.getDayOffset(endDate);

      // Calculer position et largeur
      const barStart = Math.max(0, startOffset) * dayWidth;
      const barEnd = Math.min(days.length, endOffset + 1) * dayWidth;
      const barWidth = Math.max(dayWidth, barEnd - barStart);

      // Ne pas afficher si complètement hors vue
      if (startOffset < days.length && endOffset >= 0) {
        rowHtml += `
          <div class="task-bar-container" style="left: ${barStart}px; width: ${barWidth}px;">
            <div class="task-bar priority-${priorityClass}"
                 data-task-id="${task.id}"
                 style="width: 100%; position: relative;">
              <div class="task-bar-progress" style="width: ${task.avancement}%;"></div>
              <span style="position: relative; z-index: 1;">${this.escapeHtml(task.titre)}</span>
            </div>
          </div>
        `;
      }
    }

    rowHtml += '</div>';
    return rowHtml;
  }

  /**
   * Obtenir les jours dans la période
   */
  getDaysInRange() {
    const days = [];
    const current = new Date(this.viewStart);

    while (current <= this.viewEnd) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  /**
   * Obtenir l'offset en jours depuis viewStart
   */
  getDayOffset(date) {
    if (!date) return -1;
    const start = new Date(this.viewStart);
    start.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d - start) / (24 * 60 * 60 * 1000));
  }

  /**
   * Mettre à jour l'affichage de la plage de dates
   */
  updateDateRange() {
    const start = this.formatDateShort(this.viewStart);
    const end = this.formatDateShort(this.viewEnd);
    document.getElementById('date-range').textContent = `${start} - ${end}`;
  }

  /**
   * Afficher le menu contextuel
   */
  showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
  }

  /**
   * Masquer le menu contextuel
   */
  hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
  }

  /**
   * Ouvrir la modale de tâche
   */
  openTaskModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Utiliser SharedTaskModal si disponible
    if (typeof SharedTaskModal !== 'undefined') {
      const modal = new SharedTaskModal({
        onSave: async (data) => {
          await this.saveTask(data);
          await this.loadData();
          this.render();
        },
        onDelete: async (id) => {
          await this.deleteTask(id);
          await this.loadData();
          this.render();
        }
      });
      modal.init().then(() => modal.open(task));
    } else {
      console.log('[GanttTimeline] Tâche sélectionnée:', task);
      alert(`Tâche: ${task.titre}\nStatut: ${task.statut}\nAvancement: ${task.avancement}%`);
    }
  }

  /**
   * Sauvegarde une tâche dans Grist
   */
  async saveTask(data) {
    if (typeof grist === 'undefined') {
      console.error('[GanttTimeline] Grist non disponible pour la sauvegarde');
      return;
    }

    try {
      const record = { ...data };
      const taskId = record.id;
      delete record.id;

      // Convertir les jalons et liens en JSON string si nécessaire
      if (record.jalons) {
        record.jalons = JSON.stringify(record.jalons);
      }
      if (record.liens) {
        record.liens = JSON.stringify(record.liens);
      }

      if (taskId) {
        // Mise à jour
        await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, taskId, record]
        ]);
        console.log('[GanttTimeline] Tâche mise à jour:', taskId);
      } else {
        // Création
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
    if (typeof grist === 'undefined') {
      console.error('[GanttTimeline] Grist non disponible pour la suppression');
      return;
    }

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

  /**
   * Centrer sur une tâche
   */
  focusOnTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const startDate = task.date_debut || task.date_creation;
    if (startDate) {
      // Centrer la vue sur la date de début
      const newStart = new Date(startDate);
      newStart.setDate(newStart.getDate() - 7);
      this.viewStart = newStart;
      this.viewEnd = new Date(newStart);
      this.viewEnd.setDate(this.viewEnd.getDate() + 30);
      this.render();
    }

    // Surligner la ligne
    const row = this.taskListEl.querySelector(`[data-task-id="${taskId}"]`);
    if (row) {
      row.style.background = '#fef3c7';
      setTimeout(() => {
        row.style.background = '';
      }, 2000);
    }
  }

  /**
   * Échapper HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
  const app = new GanttTimeline();
  app.init();
});
