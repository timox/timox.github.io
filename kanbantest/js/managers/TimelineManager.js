// === managers/TimelineManager.js ===
// Timeline V3 pour la planification des tâches

import {
  PREVISIBILITE,
  TYPE_TACHES,
  SEUILS_AGE,
  STATUS_ACCENTS,
  NATURE_ACTIVITE,
  GENRE_ACTION,
  ETAPE_CYCLE,
  FAMILLE_ACTION,
  getNatureActiviteByLegacyId,
  getGenreAction,
  getEtapeCycle,
  calculerPrevisibilite,
  getBureauFromAgent,
  ORGANISATION_HIERARCHY
} from '../config/constants.js';
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
    this.lastSelectedTaskId = null;
    this.highlightedTaskId = null;
    this.timelineListenersAttached = false;
    this.currentRangeDays = 7;
    this.zoomButtons = Array.from(document.querySelectorAll('[data-timeline-range]'));
    this.contextMenu = this.createContextMenu();
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
    if (this.zoomButtons.length > 0) {
      this.zoomButtons.forEach(button => {
        button.addEventListener('click', () => {
          const range = Number(button.dataset.timelineRange);
          if (Number.isFinite(range)) {
            this.setTimelineRange(range, button);
          }
        });
      });
    }
  }

  switchView(view) {
    this.currentView = view;
    if (!this.timelineContainer) return;

    if (view === 'timeline') {
      document.body.classList.add('timeline-active');
      this.timelineContainer.style.display = 'block';
      if (this.kanbanWrapper) {
        this.kanbanWrapper.style.display = 'none';
      }
      this.timelineControls?.style.setProperty('display', 'block');
      this.btnTimeline?.classList.add('active');
      this.btnKanban?.classList.remove('active');
      this.initTimeline();
    } else {
      document.body.classList.remove('timeline-active');
      this.timelineContainer.style.display = 'none';
      if (this.kanbanWrapper) {
        this.kanbanWrapper.style.display = '';
      }
      this.timelineControls?.style.setProperty('display', 'none');
      this.btnTimeline?.classList.remove('active');
      this.btnKanban?.classList.add('active');
      this.highlightKanbanCard(this.lastSelectedTaskId, { scroll: true });
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
      horizontalScroll: true,
      verticalScroll: true,
      height: '70vh',
      orientation: 'top',
      margin: { item: 8, axis: 8 },
      start: new Date(Date.now() - 7 * 86400000),
      end: new Date(Date.now() + 30 * 86400000),
      editable: {
        updateTime: true,
        updateGroup: true,
        remove: false
      },
      locale: 'fr',
      xss: { disabled: true },
      showTooltips: false,
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

    this.applyTimelineRange({ animate: false });
    this.attachTimelineListeners();
  }

  setTimelineRange(rangeDays, button) {
    this.currentRangeDays = rangeDays;
    this.updateZoomButtons(button);
    this.applyTimelineRange();
  }

  applyTimelineRange({ animate = true } = {}) {
    if (!this.timeline) return;
    const now = new Date();
    const halfRange = (this.currentRangeDays / 2) * 86400000;
    const start = new Date(now.getTime() - halfRange);
    const end = new Date(now.getTime() + halfRange);
    this.timeline.setWindow(start, end, {
      animation: animate ? { duration: 350, easingFunction: 'easeInOutQuad' } : false
    });
  }

  updateZoomButtons(activeButton) {
    if (this.zoomButtons.length === 0) return;
    this.zoomButtons.forEach(button => button.classList.remove('active'));
    if (activeButton) {
      activeButton.classList.add('active');
    } else {
      const match = this.zoomButtons.find(button => Number(button.dataset.timelineRange) === this.currentRangeDays);
      match?.classList.add('active');
    }
  }

  attachTimelineListeners() {
    if (!this.timeline || this.timelineListenersAttached) return;
    this.timeline.on('select', (props) => this.handleTimelineSelect(props));
    this.timeline.on('doubleClick', (props) => this.handleTimelineOpen(props));
    this.timeline.on('click', (props) => this.handleTimelineClick(props));
    this.timeline.on('contextmenu', (props) => this.handleTimelineContextMenu(props));
    this.timelineListenersAttached = true;
  }

  handleTimelineSelect(props) {
    const rawId = props?.items?.[0];
    if (!rawId) return;
    const taskId = this.getRealTaskId(rawId);
    this.lastSelectedTaskId = taskId;
    this.highlightKanbanCard(taskId);
  }

  handleTimelineOpen(props) {
    const rawId = props?.item;
    if (!rawId) return;
    const taskId = this.getRealTaskId(rawId);
    const record = (this.kanban?.currentRecords || []).find(rec => rec.id === taskId);
    if (record && typeof this.kanban?.openPopup === 'function') {
      this.kanban.openPopup(record);
    }
  }

  handleTimelineClick(props) {
    const rawId = props?.item;
    if (!rawId) return;
    const taskId = this.getRealTaskId(rawId);
    const record = (this.kanban?.currentRecords || []).find(rec => rec.id === taskId);
    if (record && typeof this.kanban?.openPopup === 'function') {
      this.kanban.openPopup(record);
    }
  }

  handleTimelineContextMenu(props) {
    const event = props?.event;
    if (!event?.preventDefault) return;
    event.preventDefault();
    const rawId = props?.item;
    if (!rawId || !this.contextMenu) return;
    const taskId = this.getRealTaskId(rawId);
    const record = (this.kanban?.currentRecords || []).find(rec => rec.id === taskId);
    if (!record) return;
    this.contextMenu.dataset.taskId = String(taskId);
    this.contextMenu.dataset.taskTitle = record.titre || `Tâche ${taskId}`;
    this.contextMenu.style.top = `${event.pageY}px`;
    this.contextMenu.style.left = `${event.pageX}px`;
    this.contextMenu.classList.add('is-visible');
  }

  createContextMenu() {
    if (document.querySelector('.timeline-context-menu')) {
      return document.querySelector('.timeline-context-menu');
    }
    const menu = document.createElement('div');
    menu.className = 'timeline-context-menu';
    menu.innerHTML = `
      <button type="button" data-action="open">
        <i class="bi bi-pencil-square"></i> Modifier la tâche
      </button>
      <button type="button" data-action="kanban">
        <i class="bi bi-columns-gap"></i> Voir dans le Kanban
      </button>
    `;
    document.body.appendChild(menu);
    menu.addEventListener('click', (event) => {
      const action = event.target.closest('button')?.dataset?.action;
      if (!action) return;
      const taskId = Number(menu.dataset.taskId);
      const record = (this.kanban?.currentRecords || []).find(rec => rec.id === taskId);
      if (!record) return;
      if (action === 'open') {
        this.kanban?.openPopup?.(record);
      }
      if (action === 'kanban') {
        this.switchView('kanban');
      }
      menu.classList.remove('is-visible');
    });
    document.addEventListener('click', () => menu.classList.remove('is-visible'));
    window.addEventListener('scroll', () => menu.classList.remove('is-visible'), true);
    return menu;
  }

  highlightKanbanCard(taskId, { scroll = false } = {}) {
    if (!taskId) return;
    if (this.highlightedTaskId && this.highlightedTaskId !== taskId) {
      const previous = document.querySelector(`.kanban-item[data-id="${this.highlightedTaskId}"]`);
      previous?.classList.remove('timeline-highlight');
    }
    const element = document.querySelector(`.kanban-item[data-id="${taskId}"]`);
    if (!element) return;
    element.classList.add('timeline-highlight');
    this.highlightedTaskId = taskId;
    if (scroll) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
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

      // Déterminer les groupes cibles (expansion multi-valeurs pour personne/bureau)
      const groups = this.getTimelineGroups(record);
      const typeValue = this.getTypeValue(record);
      const previsibiliteValue = this.getPrevisibiliteValue(record);
      const assignee = this.getFirstListValue(record.qui);
      const strategySummary = this.getStrategySummary(record);
      const tempsEstime = this.hasColumn('temps_estime_heures')
        ? Number(record.temps_estime_heures || 0)
        : null;
      const type = startDate && endDate && startDate !== endDate ? 'range' : 'point';
      const previsibiliteClass = this.getPrevisibiliteClass(previsibiliteValue);
      const typeClass = this.getTypeClass(typeValue);
      const statusClass = `timeline-status-${(record.statut || 'backlog').toLowerCase().replace(/\s+/g, '-').replace(/[àâ]/g, 'a').replace(/[éèê]/g, 'e')}`;
      const classList = [previsibiliteClass, typeClass, statusClass];
      if (!strategySummary) classList.push('timeline-dimmed-strategy');
      if (!assignee || assignee === 'Non défini') classList.push('timeline-dimmed-assignee');

      // Données V3
      const natureValue = this.getNatureActiviteValue(record);
      const genreValue = this.getGenreActionValue(record);
      const etapeValue = this.getEtapeCycleValue(record);
      const familleValue = this.getFamilleActionValue(record);
      const calculatedPrevisibilite = this.getCalculatedPrevisibilite(record);

      // Créer un item par groupe (duplique la tâche si multi-personnes ou multi-bureaux)
      groups.forEach((group, idx) => {
        items.push({
          id: groups.length > 1 ? `${record.id}_g${idx}` : record.id,
          content: record.titre || `Tâche ${record.id}`,
          start: new Date(startDate),
          end: endDate ? new Date(endDate) : null,
          type,
          group,
          className: classList.filter(Boolean).join(' ').trim(),
          title: this.getItemTitle(record, startDate, endDate),
          customData: {
            priorite: record.priorite,
            type: typeValue,
            previsibilite: previsibiliteValue || calculatedPrevisibilite,
            statut: record.statut,
            statut_color: this.getStatusColor(record.statut),
            projet: record.projet,
            assignee: groups.length > 1 ? group : assignee,
            strategy_summary: strategySummary,
            est_dette: record.est_dette_technique,
            age: this.getAgeBadge(record.date_debut),
            temps_estime: tempsEstime,
            // V3 data
            nature: natureValue,
            genre: genreValue,
            etape: etapeValue,
            famille: familleValue,
            // ID réel pour les actions (drag, click)
            realTaskId: record.id
          }
        });
      });
    });

    return items;
  }

  getTimelineGroup(record) {
    return this.getTimelineGroups(record)[0];
  }

  /**
   * Retourne TOUS les groupes pour un record.
   * Pour 'personne' et 'bureau', expanse les listes multi-valeurs
   * afin qu'une tâche apparaisse dans chaque groupe correspondant.
   */
  getTimelineGroups(record) {
    switch (this.timelineGroupement) {
      case 'personne': {
        const people = this.getAllListValues(record.qui);
        return people.length > 0 ? people : ['Non défini'];
      }
      case 'bureau': {
        const bureaux = this.getAllListValues(record.bureau);
        if (bureaux.length > 0) return bureaux;
        // Fallback : déduire depuis l'agent assigné
        const fromAgent = this.getBureauFromRecord(record);
        return [fromAgent || 'Non défini'];
      }
      case 'type':
        return [this.getTypeValue(record) || 'Non défini'];
      case 'previsibilite':
        return [this.getPrevisibiliteValue(record) || 'Non défini'];
      case 'projet':
        return [record.projet || 'Non défini'];
      case 'nature':
        return [this.getNatureActiviteValue(record) || 'Non défini'];
      case 'genre':
        return [this.getGenreActionValue(record) || 'Non défini'];
      case 'etape':
        return [this.getEtapeCycleValue(record) || 'Non défini'];
      case 'famille':
        return [this.getFamilleActionValue(record) || 'Non défini'];
      default:
        return ['Non défini'];
    }
  }

  // Déduit le bureau à partir du prénom de l'agent assigné
  getBureauFromRecord(record) {
    const agentName = this.getFirstListValue(record.qui);
    if (!agentName || agentName === 'Non défini') {
      return 'Non défini';
    }
    // Utiliser le mapping prénom → bureau
    const bureau = getBureauFromAgent(agentName);
    return bureau || 'Non défini';
  }

  createTimelineGroups(items) {
    const uniqueGroups = new Map();

    items.forEach(item => {
      const groupId = item.group || 'Non défini';
      if (!uniqueGroups.has(groupId)) {
        uniqueGroups.set(groupId, {
          id: groupId,
          content: groupId,
          order: uniqueGroups.size,
          count: 0
        });
      }
      uniqueGroups.get(groupId).count += 1;
    });

    if (!uniqueGroups.size) {
      uniqueGroups.set('Non défini', { id: 'Non défini', content: 'Non défini', order: 0, count: 0 });
    }

    const groupLabel = this.getGroupLabelText();
    return Array.from(uniqueGroups.values()).map(group => ({
      id: group.id,
      content: `<span class="timeline-group-label" title="Ligne = ${groupLabel}">${group.content}</span>&nbsp;<span class="timeline-group-count">${group.count}</span>`,
      order: group.order
    }));
  }

  createTimelineItemTemplate(item) {
    const data = item.customData || {};
    const badges = [];

    // Icones par nature
    const NATURE_INFO = {
      'Projet': { icon: 'bi-folder', bg: '#6366f1' },
      'PRJ': { icon: 'bi-folder', bg: '#6366f1' },
      'Support': { icon: 'bi-wrench', bg: '#f97316' },
      'SUP': { icon: 'bi-wrench', bg: '#f97316' },
      'Incident': { icon: 'bi-lightning', bg: '#ef4444' },
      'INC': { icon: 'bi-lightning', bg: '#ef4444' },
      'MCO': { icon: 'bi-gear', bg: '#10b981' },
      'Overhead': { icon: 'bi-clock', bg: '#78716c' },
      'OVH': { icon: 'bi-clock', bg: '#78716c' }
    };

    // Icones par statut
    const STATUT_INFO = {
      'En cours': { icon: 'bi-caret-right-fill', bg: '#3b82f6' },
      'À faire': { icon: 'bi-circle', bg: '#f59e0b' },
      'Terminé': { icon: 'bi-check', bg: '#10b981' },
      'Bloqué': { icon: 'bi-dash', bg: '#ef4444' },
      'En attente': { icon: 'bi-hourglass', bg: '#8b5cf6' },
      'Backlog': { icon: 'bi-inbox', bg: '#9ca3af' },
      'Validation': { icon: 'bi-check-circle', bg: '#06b6d4' }
    };

    // Badge Nature
    if (data.nature) {
      const info = NATURE_INFO[data.nature] || { icon: 'bi-question', bg: '#6b7280' };
      badges.push(`<span class="tl-b" style="background:${info.bg}"><i class="${info.icon}"></i></span>`);
    }

    // Badge Statut
    if (data.statut) {
      const info = STATUT_INFO[data.statut] || { icon: 'bi-circle', bg: '#6b7280' };
      badges.push(`<span class="tl-b" style="background:${info.bg}"><i class="${info.icon}"></i></span>`);
    }

    // Assignee (initiales)
    if (data.assignee && data.assignee !== 'Non défini') {
      const initials = data.assignee.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      badges.push(`<span class="tl-b tl-u">${initials}</span>`);
    }

    return `<div class="tl-item"><span class="tl-title">${item.content}</span><span class="tl-badges">${badges.join('')}</span></div>`;
  }

  /**
   * Extrait l'ID réel d'une tâche depuis un ID timeline (qui peut être "123_g1" pour les doublons)
   */
  getRealTaskId(timelineId) {
    if (typeof timelineId === 'number') return timelineId;
    const str = String(timelineId);
    const match = str.match(/^(\d+)(_g\d+)?$/);
    return match ? parseInt(match[1], 10) : timelineId;
  }

  async handleTimelineMove(item, callback) {
    try {
      if (!item?.id) {
        callback(null);
        return;
      }

      const realId = this.getRealTaskId(item.id);
      const updates = {};
      const startValue = item.start instanceof Date ? item.start.getTime() : item.start;
      const endValue = item.end instanceof Date ? item.end.getTime() : item.end;
      const start = normalizeDate(startValue);
      const end = normalizeDate(endValue);

      if (this.hasColumn('date_debut') && start !== null) {
        updates.date_debut = start;
      }
      if (this.hasColumn('date_echeance') && end !== null) {
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
        ['UpdateRecord', 'Ssir_principale_task', realId, updates]
      ]);

      this.updateLocalRecord(realId, updates);
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
        // Bureau est déduit du prénom, pas éditable directement
        return null;
      case 'projet':
        return 'projet';
      // === NOUVEAUX AXES V3 ===
      case 'nature':
        return this.hasColumn('nature_activite') ? 'nature_activite' : (this.hasColumn('type_tache') ? 'type_tache' : null);
      case 'genre':
        return this.hasColumn('genre_action') ? 'genre_action' : null;
      case 'etape':
        return this.hasColumn('etape_cycle') ? 'etape_cycle' : null;
      case 'famille':
        return null; // Calculé depuis genre_action, pas éditable directement
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
    if (typeof value === 'string' && value.trim()) {
      return value.split(',')[0].trim();
    }
    return 'Non défini';
  }

  /**
   * Extrait TOUTES les valeurs d'un champ Grist ChoiceList ou CSV string
   * @returns {Array<string>} Liste de valeurs (sans 'L')
   */
  getAllListValues(value) {
    if (Array.isArray(value) && value.length > 1) {
      return value.slice(1).filter(v => v && v !== 'L');
    }
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
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

  getTypeClass(typeValue) {
    const type = TYPE_TACHES.find(item => item.id === typeValue);
    return type ? `timeline-${type.classe}` : 'timeline-type-default';
  }

  getGroupLabelText() {
    switch (this.timelineGroupement) {
      case 'personne':
        return 'personne assignée';
      case 'type':
        return 'type de tâche';
      case 'previsibilite':
        return 'prévisibilité';
      case 'bureau':
        return 'bureau';
      case 'projet':
        return 'projet';
      // === NOUVEAUX AXES V3 ===
      case 'nature':
        return 'nature d\'activité';
      case 'genre':
        return 'genre d\'action';
      case 'etape':
        return 'étape du cycle';
      case 'famille':
        return 'famille d\'action';
      default:
        return 'valeur';
    }
  }

  getStatusColor(status) {
    if (!status) return STATUS_ACCENTS.default;
    return STATUS_ACCENTS[status] || STATUS_ACCENTS.default;
  }

  getStrategySummary(record) {
    const strategies = this.getStrategiesForRecord(record);
    if (strategies.length === 0) return '';
    const [first] = strategies;
    const parts = [first.objectif, first.sous_objectif, first.axe_strategique].filter(Boolean);
    const label = parts.join(' → ');
    if (strategies.length > 1) {
      return `${label} (+${strategies.length - 1})`;
    }
    return label;
  }

  getStrategiesForRecord(record) {
    const strategiesData = this.kanban?.strategiesData || [];
    const ids = this.parseStrategyIds(record.strategie_id);
    if (ids.length > 0 && strategiesData.length > 0) {
      return ids
        .map(id => strategiesData.find(strategy => strategy.id === id))
        .filter(Boolean);
    }
    if (record.strategie_objectif || record.strategie_sous_objectif || record.strategie_action) {
      return [{
        objectif: record.strategie_objectif || '',
        sous_objectif: record.strategie_sous_objectif || '',
        axe_strategique: record.strategie_action || ''
      }];
    }
    return [];
  }

  parseStrategyIds(strategieId) {
    if (!strategieId) return [];
    if (Array.isArray(strategieId)) {
      if (strategieId[0] === 'L') return strategieId.slice(1).filter(id => typeof id === 'number');
      return strategieId.filter(id => typeof id === 'number');
    }
    if (typeof strategieId === 'string' && strategieId.startsWith('L,')) {
      return strategieId
        .split(',')
        .slice(1)
        .map(value => Number(value))
        .filter(Number.isFinite);
    }
    if (typeof strategieId === 'number') return [strategieId];
    return [];
  }

  getItemTitle(record, startDate, endDate) {
    const dateLabel = endDate ? `${startDate} → ${endDate}` : startDate;
    const projet = record.projet ? `Projet: ${record.projet}` : 'Projet: -';
    const type = this.getTypeValue(record);
    const previsibilite = this.getPrevisibiliteValue(record);
    const strategySummary = this.getStrategySummary(record);
    const strategyLine = strategySummary ? `\nMission: ${strategySummary}` : '';
    return `${record.titre || record.id}\n${dateLabel}\n${projet}${strategyLine}\n${previsibilite || '-'} • ${type || '-'}`;
  }

  getTypeValue(record) {
    return record.type_tache || record.type_tache_id || '';
  }

  getPrevisibiliteValue(record) {
    return record.previsibilite || record['previsibilité'] || '';
  }

  // === NOUVELLES MÉTHODES V3 ===

  getNatureActiviteValue(record) {
    // Priorité: nature_activite (V3) > type_tache (legacy)
    if (record.nature_activite) {
      const nature = NATURE_ACTIVITE[record.nature_activite];
      return nature ? nature.nom : record.nature_activite;
    }
    // Fallback sur type_tache legacy
    const typeValue = this.getTypeValue(record);
    if (typeValue) {
      const nature = getNatureActiviteByLegacyId(typeValue);
      return nature ? nature.nom : typeValue;
    }
    return '';
  }

  getNatureActiviteCode(record) {
    if (record.nature_activite) return record.nature_activite;
    const typeValue = this.getTypeValue(record);
    if (typeValue) {
      const nature = getNatureActiviteByLegacyId(typeValue);
      return nature ? nature.code : null;
    }
    return null;
  }

  getGenreActionValue(record) {
    if (record.genre_action) {
      const genre = getGenreAction(record.genre_action);
      return genre ? genre.nom : record.genre_action;
    }
    return '';
  }

  getEtapeCycleValue(record) {
    if (record.etape_cycle) {
      const etape = getEtapeCycle(record.etape_cycle);
      return etape ? etape.nom : record.etape_cycle;
    }
    return '';
  }

  getFamilleActionValue(record) {
    if (record.genre_action) {
      const genre = getGenreAction(record.genre_action);
      if (genre?.famille) {
        const famille = FAMILLE_ACTION[genre.famille];
        return famille ? famille.nom : genre.famille;
      }
    }
    return '';
  }

  getCalculatedPrevisibilite(record) {
    // Prévisibilité explicite ou calculée depuis nature_activite
    const explicit = this.getPrevisibiliteValue(record);
    if (explicit) return explicit;
    const natureCode = this.getNatureActiviteCode(record);
    if (natureCode) {
      return calculerPrevisibilite(natureCode, null) || '';
    }
    return '';
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
