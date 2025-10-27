// === Timeline App ===
// Application de timeline graphique pour le suivi d'évolution des tâches

import { 
  STATUTS, 
  TABLE_ID
} from './config/constants.js';

import { generateSingleBureauBadge } from './utils/badges.js';

class TimelineAppManager {
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
        
        if (typeof window.grist !== 'undefined') {
          window.grist.ready();
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
      const records = await window.grist.docApi.fetchTable(TABLE_ID);
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
    
    // Ajouter les options de filtrage par statut
    const optionsGroups = [
      { value: 'single', label: '--- Tâches individuelles ---', disabled: true },
      { value: 'group-terminé', label: '🎯 Toutes les tâches terminées', group: true },
      { value: 'group-encours', label: '⚡ Toutes les tâches en cours', group: true },
      { value: 'group-bloque', label: '🚫 Toutes les tâches bloquées', group: true },
      { value: 'group-validation', label: '✅ Toutes les tâches en validation', group: true },
      { value: 'separator', label: '--- Tâches individuelles ---', disabled: true }
    ];
    
    optionsGroups.forEach(optGroup => {
      const option = document.createElement('option');
      option.value = optGroup.value;
      option.textContent = optGroup.label;
      if (optGroup.disabled) option.disabled = true;
      if (optGroup.group) option.style.fontWeight = 'bold';
      selector.appendChild(option);
    });
    
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
      const value = selector.value;
      if (value.startsWith('group-')) {
        const status = value.replace('group-', '');
        this.loadGroupTimeline(status);
      } else {
        const taskId = parseInt(value);
        if (taskId) {
          this.loadTaskTimeline(taskId);
        }
      }
    });
  }

  async loadGroupTimeline(status) {
    // Normaliser le statut
    const statusMap = {
      'terminé': 'Terminé',
      'encours': 'En cours', 
      'bloque': 'Bloqué',
      'validation': 'Validation'
    };
    
    const targetStatus = statusMap[status];
    const filteredTasks = this.tasks.filter(task => task.statut === targetStatus);
    
    if (filteredTasks.length === 0) {
      this.showError(`Aucune tâche trouvée avec le statut: ${targetStatus}`);
      return;
    }
    
    console.log(`📊 Chargement timeline groupe: ${filteredTasks.length} tâches "${targetStatus}"`);
    
    // Afficher les informations du groupe
    this.displayGroupInfo(filteredTasks, targetStatus);
    
    // Extraire et afficher la timeline de groupe
    const groupTimelineData = this.extractGroupTimelineData(filteredTasks);
    this.renderGroupTimeline(groupTimelineData, targetStatus);
    
    // Afficher les sections
    document.getElementById('task-info').style.display = 'block';
    document.getElementById('legend').style.display = 'block';
    document.getElementById('timeline-container').style.display = 'block';
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

  displayGroupInfo(tasks, status) {
    document.getElementById('task-id').textContent = `Groupe: ${tasks.length} tâches`;
    document.getElementById('task-title').textContent = `Toutes les tâches "${status}"`;
    document.getElementById('task-description').textContent = `Timeline de toutes les tâches ayant le statut ${status}`;
    
    // Badges pour le groupe
    const badgesContainer = document.getElementById('task-badges');
    const statusClass = this.getStatusClass(status);
    badgesContainer.innerHTML = `<span class="badge ${statusClass}">${status}</span> <span class="badge bg-info">${tasks.length} tâches</span>`;
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
    
    // Événement de création avec la vraie date de création
    if (task.date_creation) {
      const creationDate = new Date(task.date_creation);
      if (creationDate.getFullYear() > 2020) { // Vérifier que la date est valide
        timelineEvents.push({
          date: creationDate,
          status: 'Création',
          details: 'Tâche créée',
          user: 'Système',
          type: 'creation'
        });
      }
    }
    
    // Ajouter les jalons si ils existent
    if (task.jalons) {
      try {
        let jalons = [];
        if (typeof task.jalons === 'string') {
          // Si c'est une chaîne, essayer de parser le JSON ou traiter comme texte
          if (task.jalons.startsWith('[') || task.jalons.startsWith('{')) {
            jalons = JSON.parse(task.jalons);
          } else {
            // Traiter comme une liste séparée par des virgules ou des retours à la ligne
            jalons = task.jalons.split(/[,\n]/)
              .map(j => j.trim())
              .filter(j => j)
              .map(j => ({ titre: j, date: null }));
          }
        } else if (Array.isArray(task.jalons)) {
          jalons = task.jalons;
        }
        
        jalons.forEach((jalon, index) => {
          if (jalon && (jalon.titre || typeof jalon === 'string')) {
            const jalonTitle = jalon.titre || jalon;
            let jalonDate = null;
            
            // Essayer d'extraire une date du jalon
            if (jalon.date) {
              jalonDate = new Date(jalon.date);
            } else if (jalon.echeance) {
              jalonDate = new Date(jalon.echeance);
            } else {
              // Utiliser une date estimée basée sur la création + index
              const creationDate = task.date_creation ? new Date(task.date_creation) : new Date();
              jalonDate = new Date(creationDate.getTime() + (index + 1) * 7 * 24 * 60 * 60 * 1000); // +1 semaine par jalon
            }
            
            if (jalonDate && jalonDate.getFullYear() > 2020) {
              timelineEvents.push({
                date: jalonDate,
                status: 'Jalon',
                details: jalonTitle,
                user: 'Planification',
                type: 'milestone',
                milestone: true,
                milestoneTitle: jalonTitle
              });
            }
          }
        });
      } catch (e) {
        console.warn('Erreur parsing jalons pour task', task.id, ':', e);
      }
    }
    
    // Extraire les événements depuis le champ notes (JSON)
    if (task.notes) {
      try {
        const notesData = typeof task.notes === 'string' 
          ? JSON.parse(task.notes) 
          : task.notes;
        
        if (notesData && notesData.history && Array.isArray(notesData.history)) {
          notesData.history.forEach(entry => {
            // Vérifier que le timestamp est valide
            const eventDate = new Date(entry.timestamp);
            if (eventDate.getFullYear() > 2020) { // Ignorer les dates de migration
              timelineEvents.push({
                date: eventDate,
                status: this.getEventStatus(entry),
                details: this.getEventDetails(entry),
                user: entry.user || 'Utilisateur inconnu',
                type: 'history_event',
                oldValue: entry.oldValue,
                newValue: entry.newValue,
                field: entry.field
              });
            }
          });
        }
      } catch (e) {
        console.warn('Erreur parsing notes pour task', task.id, ':', e);
      }
    }
    
    // Si aucun événement trouvé, créer un événement "état actuel"
    if (timelineEvents.length === 0) {
      timelineEvents.push({
        date: new Date(),
        status: task.statut || 'Non défini',
        details: 'État actuel de la tâche',
        user: 'Système',
        type: 'current_state'
      });
    } else {
      // Ajouter l'état actuel seulement s'il diffère du dernier événement
      const lastEvent = timelineEvents[timelineEvents.length - 1];
      const currentStatus = task.statut || 'Non défini';
      
      if (lastEvent.status !== currentStatus) {
        timelineEvents.push({
          date: new Date(),
          status: currentStatus,
          details: 'État actuel',
          user: 'Système',
          type: 'current_state'
        });
      }
    }
    
    // Trier par date
    timelineEvents.sort((a, b) => a.date - b.date);
    
    // Calculer les durées entre étapes
    for (let i = 1; i < timelineEvents.length; i++) {
      const duration = timelineEvents[i].date - timelineEvents[i-1].date;
      timelineEvents[i].duration = this.formatDuration(duration);
      timelineEvents[i].durationMs = duration;
    }
    
    console.log(`📋 Timeline task ${task.id}:`, {
      totalEventsFound: timelineEvents.length,
      dateRange: timelineEvents.length > 0 ? 
        `${timelineEvents[0].date.toLocaleDateString()} → ${timelineEvents[timelineEvents.length-1].date.toLocaleDateString()}` : 
        'Aucune date',
      events: timelineEvents.map(e => ({ date: e.date.toLocaleDateString(), status: e.status }))
    });
    
    return timelineEvents;
  }

  extractGroupTimelineData(tasks) {
    const allEvents = [];
    
    tasks.forEach(task => {
      const taskEvents = this.extractTimelineData(task);
      taskEvents.forEach(event => {
        allEvents.push({
          ...event,
          taskId: task.id,
          taskTitle: task.titre,
          groupName: `#${task.id} - ${task.titre}`
        });
      });
    });
    
    // Trier tous les événements par date
    allEvents.sort((a, b) => a.date - b.date);
    
    console.log(`📊 Timeline groupe: ${allEvents.length} événements de ${tasks.length} tâches`);
    
    return allEvents;
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
    // Limiter la longueur du contenu
    const truncate = (str, length = 50) => {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + '...' : str;
    };
    
    if (entry.oldValue && entry.newValue) {
      const oldVal = truncate(String(entry.oldValue), 30);
      const newVal = truncate(String(entry.newValue), 30);
      return `${entry.field || 'Champ'}: "${oldVal}" → "${newVal}"`;
    }
    
    if (entry.newValue) {
      const newVal = truncate(String(entry.newValue), 40);
      return `${entry.field || 'Champ'}: "${newVal}"`;
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
    
    // Préparer les données pour Vis.js avec plusieurs groupes
    const items = new vis.DataSet();
    const groups = new vis.DataSet([
      {id: 1, content: 'Création', style: 'color: #6f42c1; font-weight: bold;'},
      {id: 2, content: 'Changements de statut', style: 'color: #fd7e14; font-weight: bold;'},
      {id: 3, content: 'Autres modifications', style: 'color: #20c997; font-weight: bold;'},
      {id: 4, content: 'État actuel', style: 'color: #0d6efd; font-weight: bold;'}
    ]);
    
    timelineData.forEach((event, index) => {
      const statusColor = this.getStatusColor(event.status);
      
      // Déterminer le groupe selon le type d'événement
      let groupId = 2; // Par défaut: changements de statut
      if (event.type === 'creation') {
        groupId = 1;
      } else if (event.type === 'current_state') {
        groupId = 4;
      } else if (event.field && !event.field.toLowerCase().includes('statut')) {
        groupId = 3; // Autres modifications (non-statut)
      }
      
      // Style spécial pour les jalons
      let itemStyle = `background-color: ${statusColor}; border-color: ${statusColor}; color: white; font-size: 11px;`;
      let itemContent = `<div style="padding: 2px 4px; font-size: 11px; line-height: 1.2;">
        <strong style="color: white; font-size: 12px;">${event.status}</strong><br>
        <small style="font-size: 10px; color: #f0f0f0;">${event.details}</small><br>
        <small style="color: #e0e0e0; font-size: 9px;"><i class="bi bi-person"></i> ${event.user}</small>
      </div>`;
      
      if (event.milestone) {
        itemStyle = `background-color: #ff6b35; border: 3px solid #ff6b35; color: white; font-size: 11px; border-radius: 0; transform: rotate(45deg);`;
        itemContent = `<div style="padding: 2px 4px; font-size: 11px; line-height: 1.2; transform: rotate(-45deg);">
          <strong style="color: white; font-size: 12px;">🏁</strong><br>
          <small style="font-size: 10px; color: #f0f0f0;">${event.milestoneTitle}</small>
        </div>`;
      }
      
      items.add({
        id: index,
        group: groupId,
        content: itemContent,
        start: event.date,
        type: 'point',
        style: itemStyle,
        className: event.milestone ? 'milestone-item' : this.getStatusCSSClass(event.status),
        title: event.milestone ? `Jalon: ${event.milestoneTitle}` : `${event.status}: ${event.details}` // Infobulle
      });
    });
    
    // Filtrer les dates invalides (1970, etc.) et calculer la plage de dates
    const validDates = timelineData
      .map(d => d.date)
      .filter(date => date.getFullYear() > 2020); // Ignorer les dates avant 2020
    
    let startDate, endDate;
    
    if (validDates.length > 0) {
      startDate = new Date(Math.min(...validDates));
      endDate = new Date(Math.max(...validDates));
    } else {
      // Si aucune date valide, prendre la première date non-1970 et ajuster
      const sortedDates = timelineData
        .map(d => d.date)
        .sort((a, b) => a - b)
        .filter(date => date.getFullYear() > 1980); // Un peu plus large pour être sûr
      
      if (sortedDates.length > 0) {
        startDate = new Date(sortedDates[0].getTime() - (24 * 60 * 60 * 1000)); // -1 jour
        endDate = new Date(Math.max(...sortedDates));
      } else {
        // Fallback: utiliser les dates actuelles
        const now = new Date();
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // -7 jours
        endDate = now;
      }
    }
    
    const now = new Date();
    
    // S'assurer que la vue se centre sur les données récentes
    let viewStart = startDate;
    let viewEnd = endDate;
    
    // Si les données sont récentes, inclure maintenant dans la vue
    if ((now - endDate) < (30 * 24 * 60 * 60 * 1000)) { // Si moins de 30 jours
      viewEnd = now;
      viewStart = new Date(startDate.getTime() - (2 * 24 * 60 * 60 * 1000)); // -2 jours avant le début
    }
    
    console.log('📅 Plage de dates timeline:', {
      originalRange: `${new Date(Math.min(...timelineData.map(d => d.date)))} → ${new Date(Math.max(...timelineData.map(d => d.date)))}`,
      validRange: `${startDate} → ${endDate}`,
      viewRange: `${viewStart} → ${viewEnd}`,
      totalEvents: timelineData.length,
      validEvents: validDates.length
    });
    
    // Ajuster la hauteur du conteneur pour timeline simple
    const container = document.getElementById('visualization');
    container.style.height = '400px';
    
    // Configuration de la timeline
    const options = {
      width: '100%',
      height: '400px',
      margin: {
        item: 5,
        axis: 30
      },
      orientation: 'top',
      showCurrentTime: true,
      start: viewStart,
      end: viewEnd,
      zoomMin: 1000 * 60 * 60, // 1 heure
      zoomMax: 1000 * 60 * 60 * 24 * 90, // 90 jours
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
    const timeline = new vis.Timeline(container, items, groups, options);
    
    // Générer la timeline détaillée
    this.renderDetailedTimeline(timelineData);
  }

  renderGroupTimeline(groupTimelineData, status) {
    if (groupTimelineData.length === 0) {
      document.getElementById('visualization').innerHTML = `
        <div class="text-center p-4 text-muted">
          <i class="bi bi-clock display-4"></i>
          <p class="mt-2">Aucun historique disponible pour ces tâches</p>
        </div>
      `;
      return;
    }
    
    // Mettre à jour les statistiques
    const totalDuration = groupTimelineData[groupTimelineData.length - 1].date - groupTimelineData[0].date;
    document.getElementById('total-duration').textContent = this.formatDuration(totalDuration);
    document.getElementById('steps-count').textContent = groupTimelineData.length;
    
    // Créer un groupe par tâche
    const items = new vis.DataSet();
    const groups = new vis.DataSet();
    const taskGroups = {};
    let groupId = 1;
    
    // Créer les groupes pour chaque tâche
    groupTimelineData.forEach(event => {
      if (!taskGroups[event.taskId]) {
        taskGroups[event.taskId] = groupId;
        groups.add({
          id: groupId,
          content: event.groupName,
          style: 'color: #2c3e50; font-weight: bold; font-size: 12px;'
        });
        groupId++;
      }
    });
    
    // Ajouter les événements
    groupTimelineData.forEach((event, index) => {
      const statusColor = this.getStatusColor(event.status);
      const taskGroupId = taskGroups[event.taskId];
      
      // Style spécial pour les jalons
      let itemStyle = `background-color: ${statusColor}; border-color: ${statusColor}; color: white; font-size: 10px;`;
      let itemContent = `<div style="padding: 2px 4px; font-size: 10px; line-height: 1.2;">
        <strong style="color: white; font-size: 11px;">${event.status}</strong><br>
        <small style="font-size: 9px; color: #f0f0f0;">${event.details}</small><br>
        <small style="color: #e0e0e0; font-size: 8px;"><i class="bi bi-person"></i> ${event.user}</small>
      </div>`;
      
      if (event.milestone) {
        itemStyle = `background-color: #ff6b35; border: 3px solid #ff6b35; color: white; font-size: 10px; border-radius: 0; transform: rotate(45deg);`;
        itemContent = `<div style="padding: 1px 2px; font-size: 10px; line-height: 1.1; transform: rotate(-45deg);">
          <strong style="color: white; font-size: 11px;">🏁</strong><br>
          <small style="font-size: 8px; color: #f0f0f0;">${event.milestoneTitle || event.details}</small>
        </div>`;
      }
      
      items.add({
        id: index,
        group: taskGroupId,
        content: itemContent,
        start: event.date,
        type: 'point',
        style: itemStyle,
        className: event.milestone ? 'milestone-item' : this.getStatusCSSClass(event.status),
        title: event.milestone ? `Jalon: ${event.milestoneTitle || event.details}` : `${event.status}: ${event.details}` // Infobulle
      });
    });
    
    // Calculer la plage de dates
    const validDates = groupTimelineData
      .map(d => d.date)
      .filter(date => date.getFullYear() > 2020);
    
    let startDate, endDate;
    
    if (validDates.length > 0) {
      startDate = new Date(Math.min(...validDates));
      endDate = new Date(Math.max(...validDates));
    } else {
      const now = new Date();
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      endDate = now;
    }
    
    const now = new Date();
    let viewStart = startDate;
    let viewEnd = endDate;
    
    if ((now - endDate) < (30 * 24 * 60 * 60 * 1000)) {
      viewEnd = now;
      viewStart = new Date(startDate.getTime() - (2 * 24 * 60 * 60 * 1000));
    }
    
    console.log(`📅 Timeline groupe: ${Object.keys(taskGroups).length} tâches, ${groupTimelineData.length} événements`);
    
    // Configuration de la timeline
    const timelineHeight = Math.max(400, Object.keys(taskGroups).length * 60);
    
    // Ajuster la hauteur du conteneur
    const container = document.getElementById('visualization');
    container.style.height = `${timelineHeight}px`;
    
    const options = {
      width: '100%',
      height: `${timelineHeight}px`, // Hauteur dynamique
      margin: {
        item: 3,
        axis: 25
      },
      orientation: 'top',
      showCurrentTime: true,
      start: viewStart,
      end: viewEnd,
      zoomMin: 1000 * 60 * 60, // 1 heure
      zoomMax: 1000 * 60 * 60 * 24 * 90, // 90 jours
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
    const timeline = new vis.Timeline(container, items, groups, options);
    
    // Générer la timeline détaillée
    this.renderDetailedGroupTimeline(groupTimelineData);
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
  
  renderDetailedGroupTimeline(groupTimelineData) {
    const container = document.getElementById('detailed-timeline');
    
    let html = '<div class="timeline-detailed">';
    
    groupTimelineData.forEach((event, index) => {
      const statusColor = this.getStatusColor(event.status);
      const isLast = index === groupTimelineData.length - 1;
      
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
                <small class="text-primary fw-bold">${event.groupName}</small><br>
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
      'Création': '#6f42c1',
      'Jalon': '#ff6b35'
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
      'Création': 'plus-circle',
      'Jalon': 'flag'
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

  // Vérifier si on est sur la page timeline (pas sur index.html)
  if (document.getElementById('timeline-container')) {
    console.log('📅 Initialisation TimelineManager (page dédiée)');
    new TimelineAppManager();
  }
});
