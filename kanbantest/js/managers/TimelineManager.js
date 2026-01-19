// === managers/TimelineManager.js ===
// Timeline V3 pour la planification des tâches

import { PREVISIBILITE, TYPE_TACHES, SEUILS_AGE } from '../config/constants.js';
import { normalizeDate } from '../utils/dates.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

export class TimelineManager {
  constructor(kanban) {
    this.kanban = kanban;
    this.logger = createModuleLogger('TimelineManager');
    this.timeline = null;
    this.currentView = 'kanban';
    this.timelineGroupement = 'personne';
    this.timelineContainer = document.getElementById('timeline-container');
    this.kanbanWrapper = document.querySelector('.kanban-wrapper');
    this.timelineControls = document.querySelector('.timeline-controls');
    this.btnKanban = document.getElementById('btn-view-kanban');
    this.btnTimeline = document.getElementById('btn-view-timeline');
    this.groupSelect = document.getElementById('timeline-groupby');
    this.initListeners();
  }

  initListeners() {
    if (this.btnKanban) {
      this.btnKanban.addEventListener('click', () => this.switchView('kanban'));
    }
    if (this.btnTimeline) {
      this.btnTimeline.addEventListener('click', () => this.switchView('timeline'));
    }
    if (this.groupSelect) {
      this.groupSelect.addEventListener('change', (event) => this.changeTimelineGroupement(event.target.value));
    }
  }

  switchView(view) {
    this.currentView = view;
    if (!this.timelineContainer) return;

    if (view === 'timeline') {
      this.timelineContainer.style.display = 'block';
      if (this.kanbanWrapper) {
        this.kanbanWrapper.style.display = 'none';
      }
      this.timelineControls?.style.setProperty('display', 'block');
      this.btnTimeline?.classList.add('active');
      this.btnKanban?.classList.remove('active');
      this.initTimeline();
    } else {
      this.timelineContainer.style.display = 'none';
      if (this.kanbanWrapper) {
        this.kanbanWrapper.style.display = '';
      }
      this.timelineControls?.style.setProperty('display', 'none');
      this.btnTimeline?.classList.remove('active');
      this.btnKanban?.classList.add('active');
    }
  }

  changeTimelineGroupement(groupement) {
    this.timelineGroupement = groupement;
    if (this.currentView === 'timeline') {
      this.initTimeline();
    }
  }

  initTimeline() {
    if (!this.timelineContainer || typeof vis === 'undefined') {
      this.logger.warn('Timeline indisponible (container ou vis.js manquant)');
      return;
    }

    const records = this.kanban?.currentRecords || [];
    const items = this.convertRecordsToTimelineItems(records);

    if (items.length === 0) {
      this.timelineContainer.innerHTML = `
        <div class="timeline-empty">
          <i class="bi bi-calendar-x me-2"></i>
          Aucune tâche avec date disponible pour la timeline.
        </div>
      `;
      this.timeline = null;
      return;
    }
    const groups = this.createTimelineGroups(items);

    const options = {
      stack: true,
      zoomable: true,
      moveable: true,
      orientation: 'top',
      start: new Date(Date.now() - 7 * 86400000),
      end: new Date(Date.now() + 30 * 86400000),
      editable: {
        updateTime: true,
        updateGroup: true,
        remove: false
      },
      locale: 'fr',
      template: (item) => this.createTimelineItemTemplate(item),
      onMove: (item, callback) => this.handleTimelineMove(item, callback)
    };

    if (this.timeline) {
      this.timeline.setGroups(groups);
      this.timeline.setItems(items);
      this.timeline.setOptions(options);
    } else {
      this.timeline = new vis.Timeline(this.timelineContainer, items, groups, options);
    }
  }

  convertRecordsToTimelineItems(records) {
    const items = [];
    const activeRecords = records.filter(record => !['Terminé', 'En pause'].includes(record.statut));

    activeRecords.forEach(record => {
      const startDate = normalizeDate(
        record.date_debut || record.date_echeance || record.date_creation || record.datenow
      );
      const endDate = normalizeDate(record.date_echeance);

      if (!startDate) return;

      const group = this.getTimelineGroup(record);
      const typeValue = this.getTypeValue(record);
      const previsibiliteValue = this.getPrevisibiliteValue(record);
      const type = startDate && endDate && startDate !== endDate ? 'range' : 'point';
      const color = this.getTypeColor(typeValue);
      const previsibiliteClass = this.getPrevisibiliteClass(previsibiliteValue);

      items.push({
        id: record.id,
        content: record.titre || `Tâche ${record.id}`,
        start: new Date(startDate),
        end: endDate ? new Date(endDate) : null,
        type,
        group,
        className: previsibiliteClass,
        style: `background-color: ${color}; border-color: ${color};`,
        customData: {
          priorite: record.priorite,
          type: typeValue,
          previsibilite: previsibiliteValue,
          statut: record.statut,
          projet: record.projet,
          est_dette: record.est_dette_technique,
          age: this.getAgeBadge(record.date_debut)
        }
      });
    });

    return items;
  }

  getTimelineGroup(record) {
    switch (this.timelineGroupement) {
      case 'personne':
        return this.getFirstListValue(record.qui);
      case 'type':
        return this.getTypeValue(record) || 'Non défini';
      case 'previsibilite':
        return this.getPrevisibiliteValue(record) || 'Non défini';
      case 'bureau':
        return this.getFirstListValue(record.bureau);
      case 'projet':
        return record.projet || 'Non défini';
      default:
        return 'Non défini';
    }
  }

  createTimelineGroups(items) {
    const uniqueGroups = new Map();

    items.forEach(item => {
      const groupId = item.group || 'Non défini';
      if (!uniqueGroups.has(groupId)) {
        uniqueGroups.set(groupId, {
          id: groupId,
          content: groupId,
          order: uniqueGroups.size
        });
      }
    });

    if (!uniqueGroups.size) {
      uniqueGroups.set('Non défini', { id: 'Non défini', content: 'Non défini', order: 0 });
    }

    return Array.from(uniqueGroups.values());
  }

  createTimelineItemTemplate(item) {
    const data = item.customData || {};
    const badges = [];
    if (data.previsibilite) badges.push(`<span class="timeline-badge">${data.previsibilite}</span>`);
    if (data.type) badges.push(`<span class="timeline-badge">${data.type}</span>`);
    if (data.est_dette) badges.push(`<span class="timeline-badge">⚙️ Dette</span>`);
    if (data.age) badges.push(`<span class="timeline-badge">${data.age}</span>`);

    return `
      <div class="timeline-item-content">
        <div class="timeline-item-title">${item.content}</div>
        <div class="timeline-item-meta">
          ${badges.join('')}
        </div>
      </div>
    `;
  }

  async handleTimelineMove(item, callback) {
    try {
      if (!item?.id) {
        callback(null);
        return;
      }

      const updates = {};
      const start = normalizeDate(item.start);
      const end = normalizeDate(item.end);

      if (this.hasColumn('date_debut')) {
        updates.date_debut = start;
      }
      if (this.hasColumn('date_echeance')) {
        updates.date_echeance = end;
      }

      const groupField = this.getGroupField();
      if (groupField && this.hasColumn(groupField)) {
        updates[groupField] = this.formatGroupValue(groupField, item.group);
      }

      if (Object.keys(updates).length === 0) {
        callback(item);
        return;
      }

      await window.grist.docApi.applyUserActions([
        ['UpdateRecord', 'Ssir_principale_task', item.id, updates]
      ]);

      this.updateLocalRecord(item.id, updates);
      callback(item);
    } catch (error) {
      this.logger.error('Erreur déplacement timeline:', error);
      callback(null);
    }
  }

  updateLocalRecord(id, updates) {
    const record = (this.kanban?.currentRecords || []).find(rec => rec.id === id);
    if (!record) return;
    Object.assign(record, updates);
  }

  getGroupField() {
    switch (this.timelineGroupement) {
      case 'personne':
        return 'qui';
      case 'type':
        return this.hasColumn('type_tache') ? 'type_tache' : null;
      case 'previsibilite':
        return this.hasColumn('previsibilite') ? 'previsibilite' : (this.hasColumn('previsibilité') ? 'previsibilité' : null);
      case 'bureau':
        return 'bureau';
      case 'projet':
        return 'projet';
      default:
        return null;
    }
  }

  formatGroupValue(field, groupValue) {
    if (!groupValue || groupValue === 'Non défini') {
      return field === 'qui' || field === 'bureau' ? ['L'] : '';
    }
    if (field === 'qui' || field === 'bureau') {
      return ['L', groupValue];
    }
    return groupValue;
  }

  getFirstListValue(value) {
    if (Array.isArray(value) && value.length > 1) {
      return value[1];
    }
    return 'Non défini';
  }

  getTypeColor(typeValue) {
    const type = TYPE_TACHES.find(item => item.id === typeValue);
    return type ? type.couleur : '#0ea5e9';
  }

  getPrevisibiliteClass(previsibilite) {
    const prev = PREVISIBILITE.find(item => item.id === previsibilite);
    if (!prev) return '';
    return prev.id === 'Imprévisible' ? 'timeline-imprevisible' : 'timeline-previsible';
  }

  getTypeValue(record) {
    return record.type_tache || record.type_tache_id || '';
  }

  getPrevisibiliteValue(record) {
    return record.previsibilite || record['previsibilité'] || '';
  }

  getAgeBadge(dateDebut) {
    const normalized = normalizeDate(dateDebut);
    if (!normalized) return null;
    const date = new Date(normalized);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
    if (diff <= SEUILS_AGE.FRESH) return '🟢';
    if (diff <= SEUILS_AGE.NORMAL) return '🟡';
    if (diff <= SEUILS_AGE.WARNING) return '🟠';
    return '🔴';
  }

  hasColumn(columnName) {
    const availableColumns = this.kanban?.gristManager?.availableColumns || this.kanban?.availableColumns;
    return availableColumns instanceof Set ? availableColumns.has(columnName) : false;
  }
}
