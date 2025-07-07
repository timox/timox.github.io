// === CODE KANBAN COMPLET ET ORDONNÉ ===
const STATUTS = [
  { id: 'Backlog', libelle: 'Backlog', classe: 'backlog' },
  { id: 'À faire', libelle: 'À faire', classe: 'a-faire' },
  { id: 'En cours', libelle: 'En cours', classe: 'en-cours' },
  { id: 'En attente', libelle: 'En attente', classe: 'en-attente' },
  { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque' },
  { id: 'Validation', libelle: 'Validation', classe: 'validation' },
  { id: 'Terminé', libelle: 'Terminé', classe: 'termine' }
];

const DEFAULT_BUREAUX = ['Exploit', 'Réseau', 'BDD', 'Chef SSIR'];
const DEFAULT_RESPONSABLES = ['Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo', 'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta'];
const DEFAULT_URGENCES = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
const DEFAULT_IMPACTS = ['Critique', 'Important', 'Modéré', 'Mineur'];
const DEFAULT_STATUTS = STATUTS.map(s => s.id);
const DEFAULT_PROJETS = [
  'accès distants', 'AD', 'SSI', 'caméras pièton', 'astre finances', 'correspondants', 'autre projet',
  'conformité systèmes', 'MCO', 'conformité RZO', 'firewall', 'Libriciel', 'intranet-extranet',
  'optimops', 'attestation assurances', 'horoquartz', 'administratif-budget'
];

const TABLE_ID = "Ssir_principale_task";

// 
const HISTORY_COLUMNS = ['historique_statuts', 'date_derniere_maj', 'statut_precedent'];

// 
const REQUIRED_COLUMNS = [
  'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_objectif', 'strategie_sous_objectif', 'strategie_action', 'notes',
  // NOUVELLES COLONNES POUR L'HISTORIQUE
  'historique_statuts', 'date_derniere_maj', 'statut_precedent'
];

// Colonnes optionnelles pour les dates
const OPTIONAL_COLUMNS = ['date_debut', 'date_echeance'];

let projetsDynamiques = [];
//fonction utilitaires
function updateStatusHistory(record, newStatus, userId = null) {
  const now = new Date().toISOString();
  
  try {
    let historyData;
    if (record.historique_statuts) {
      historyData = JSON.parse(record.historique_statuts);
    } else {
      // Première utilisation : créer l'historique
      historyData = {
        historique: [],
        version: 1
      };
      
      // Ajouter le statut précédent si il existe
      if (record.statut) {
        const estimatedStartDate = record.date_creation || 
                                 record.date_debut || 
                                 new Date(Date.now() - 24*60*60*1000).toISOString();
        
        historyData.historique.push({
          statut: record.statut,
          date_entree: estimatedStartDate,
          date_sortie: now,
          duree_minutes: Math.round((new Date(now) - new Date(estimatedStartDate)) / (1000 * 60)),
          utilisateur: userId,
          note: "Reconstitué automatiquement"
        });
      }
    }
    
    // Fermer le statut actuel s'il existe
    if (historyData.historique.length > 0) {
      const dernierStatut = historyData.historique[historyData.historique.length - 1];
      if (dernierStatut.date_sortie === null) {
        dernierStatut.date_sortie = now;
        dernierStatut.duree_minutes = Math.round(
          (new Date(now) - new Date(dernierStatut.date_entree)) / (1000 * 60)
        );
      }
    }
    
    // Ajouter le nouveau statut
    historyData.historique.push({
      statut: newStatus,
      date_entree: now,
      date_sortie: null,
      duree_minutes: null,
      utilisateur: userId
    });
    
    return {
      historique_statuts: JSON.stringify(historyData),
      date_derniere_maj: now,
      statut_precedent: record.statut
    };
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'historique:', error);
    
    // Fallback simple
    const fallbackHistory = {
      historique: [{
        statut: newStatus,
        date_entree: now,
        date_sortie: null,
        duree_minutes: null,
        utilisateur: userId,
        note: "Historique reconstruit après erreur"
      }],
      version: 1
    };
    
    return {
      historique_statuts: JSON.stringify(fallbackHistory),
      date_derniere_maj: now,
      statut_precedent: record.statut || 'Inconnu'
    };
  }
}

function displayError(message) {
  console.error("ERREUR:", message);
  const el = document.getElementById('error-container');
  if (el) {
    const p = document.createElement('div');
    p.className = 'alert alert-danger m-3';
    p.textContent = `Erreur Kanban: ${message}`;
    el.innerHTML = '';
    el.appendChild(p);
  }
  const k = document.getElementById('kanban-container');
  if (k && k.innerHTML.includes('Chargement')) k.innerHTML = '';
}

class KanbanManager {
  constructor() {
    this.kanbanContainer = document.getElementById('kanban-container');
    this.currentRecords = [];
    this.modalElement = document.getElementById('popup-tache');
    this.modal = null;
    this.currentTaskId = null;
    this.isUpdating = false;
    this.canEdit = true;
    this.gristOptions = {};
    this.ignoreNextOnRecords = false;
    this.filters = { bureau: '', qui: '', projet: '', statut: '' };
    this.showTermine = true;
    this.sortableInstances = [];
    this.flatpickr = null;
    this.availableColumns = new Set();
    
    // Modes de vue
    this.viewMode = 'compact'; // 'compact', 'detailed', 'focus'
    this.focusColumn = null;
    this.expandedCards = new Set();
    
    this.init();
  }

  async init() {
    await this.waitForGristReady();
    await this.loadGristDataAndOptions();
    this.initFilters();
    this.initModalWithOptions();
    this.initFlatpickr();
    this.initViewModeControls();
    this.refreshKanban();
    this.initEventListeners();
  }

  async waitForGristReady() {
    return new Promise((resolve) => {
      grist.ready({ requiredAccess: 'full' });
      grist.onRecords(this.handleGristUpdate.bind(this));
      setTimeout(resolve, 50);
    });
  }

  async loadGristDataAndOptions() {
    try {
      const records = await grist.docApi.fetchTable(TABLE_ID);
      
      // Détecter les colonnes disponibles
      if (records && typeof records === 'object') {
        this.availableColumns = new Set(Object.keys(records));
        console.log('Colonnes disponibles:', Array.from(this.availableColumns));
      }
      
      this.currentRecords = this.mapGristRecords(records);
      this.gristOptions.statut = DEFAULT_STATUTS;
      this.gristOptions.urgence = DEFAULT_URGENCES;
      this.gristOptions.impact = DEFAULT_IMPACTS;
      
      const bureaux = this.getUniqueValuesFromData('bureau', true);
      this.gristOptions.bureau = [...new Set([...DEFAULT_BUREAUX, ...bureaux])].sort();
      
      const responsables = this.getUniqueValuesFromData('qui', true);
      this.gristOptions.qui = [...new Set([...DEFAULT_RESPONSABLES, ...responsables])].sort();
      
      const projets = this.getUniqueValuesFromData('projet');
      this.gristOptions.projet = [...new Set([...DEFAULT_PROJETS, ...projets, ...projetsDynamiques])].sort();
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.gristOptions.statut = DEFAULT_STATUTS;
      this.gristOptions.urgence = DEFAULT_URGENCES;
      this.gristOptions.impact = DEFAULT_IMPACTS;
      this.gristOptions.bureau = DEFAULT_BUREAUX;
      this.gristOptions.qui = DEFAULT_RESPONSABLES;
      this.gristOptions.projet = DEFAULT_PROJETS;
      if (!this.currentRecords) this.currentRecords = [];
    }
  }

  getUniqueValuesFromData(key, isList = false) {
    const values = new Set();
    (this.currentRecords || []).forEach(rec => {
      const v = rec[key];
      if (isList && Array.isArray(v)) {
        v.slice(1).forEach(i => i && values.add(String(i).trim()));
      } else if (!isList && v !== null && typeof v !== 'undefined') {
        values.add(String(v).trim());
      }
    });
    return Array.from(values).filter(v => v).sort();
  }

  mapGristRecords(gristData) {
    const records = [];
    if (!gristData || typeof gristData !== 'object') return [];
    
    const keys = Object.keys(gristData);
    if (!keys.includes('id') || !Array.isArray(gristData.id)) return [];
    
    const num = gristData.id.length;
    
    for (let i = 0; i < num; i++) {
      const rec = {};
      let ok = true;
      
      // Traitement des colonnes obligatoires
      for (const key of REQUIRED_COLUMNS) {
        if (gristData.hasOwnProperty(key) && Array.isArray(gristData[key]) && gristData[key].length > i) {
          const v = gristData[key][i];
          if ((key === 'bureau' || key === 'qui') && Array.isArray(v) && v[0] === 'L') {
            rec[key] = v;
          } else if ((key === 'bureau' || key === 'qui') && (!Array.isArray(v) || v[0] !== 'L')) {
            rec[key] = ['L'];
          } else {
            rec[key] = v;
          }
        } else if (key === 'id') { 
          ok = false; 
          break; 
        } else {
          rec[key] = null;
        }
      }
      
      // Traitement des colonnes optionnelles
      for (const key of OPTIONAL_COLUMNS) {
        if (gristData.hasOwnProperty(key) && Array.isArray(gristData[key]) && gristData[key].length > i) {
          rec[key] = gristData[key][i];
        } else {
          rec[key] = null;
        }
      }
      
      if (ok) { 
        rec.id = parseInt(rec.id, 10); 
        if (!isNaN(rec.id)) records.push(rec); 
      }
    }
    return records;
  }

  // === GESTION DES MODES DE VUE ===
  initViewModeControls() {
    const controlsContainer = document.querySelector('.kanban-controls .row');
    if (!controlsContainer) return;
    
    const viewModeHTML = `
      <div class="col-md-3">
        <div class="btn-group" role="group" aria-label="Mode de vue">
          <button type="button" class="btn btn-outline-primary btn-sm active" id="view-compact">
            <i class="bi bi-grid"></i> Compact
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm" id="view-detailed">
            <i class="bi bi-card-text"></i> Détaillé
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm" id="view-focus">
            <i class="bi bi-eye"></i> Focus
          </button>
        </div>
      </div>
    `;
    
    controlsContainer.insertAdjacentHTML('afterbegin', viewModeHTML);
    
    document.getElementById('view-compact')?.addEventListener('click', () => this.setViewMode('compact'));
    document.getElementById('view-detailed')?.addEventListener('click', () => this.setViewMode('detailed'));
    document.getElementById('view-focus')?.addEventListener('click', () => this.setViewMode('focus'));
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.expandedCards.clear();
    
    document.querySelectorAll('.btn-group button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${mode}`)?.classList.add('active');
    
    this.refreshKanban();
  }
 //hist
  howTaskHistory(taskId) {
  const task = this.currentRecords.find(r => r.id === taskId);
  if (!task) {
    console.error('Tâche non trouvée:', taskId);
    return;
  }
  
  // Afficher dans la console (pour debug)
  this.logTaskHistory(task);
  
  // Afficher dans la modal
  this.openHistoryModal(task);
}

logTaskHistory(task) {
  if (!task.historique_statuts) {
    console.log('Pas d\'historique disponible pour cette tâche');
    return;
  }
  
  try {
    const historyData = JSON.parse(task.historique_statuts);
    console.log('=== HISTORIQUE DE LA TÂCHE ===');
    console.log(`Tâche: ${task.titre}`);
    console.log('Statuts:');
    
    historyData.historique.forEach((entry, index) => {
      const duration = entry.duree_minutes ? 
        `${Math.floor(entry.duree_minutes / 60)}h ${entry.duree_minutes % 60}m` : 
        'En cours...';
      
      console.log(`${index + 1}. ${entry.statut}`);
      console.log(`   Du: ${new Date(entry.date_entree).toLocaleString('fr-FR')}`);
      console.log(`   Au: ${entry.date_sortie ? new Date(entry.date_sortie).toLocaleString('fr-FR') : 'En cours'}`);
      console.log(`   Durée: ${duration}`);
      if (entry.note) console.log(`   Note: ${entry.note}`);
      console.log('');
    });
    
  } catch (e) {
    console.error('Erreur lors de l\'affichage de l\'historique:', e);
  }
}

openHistoryModal(task) {
  if (!task.historique_statuts) {
    alert('Pas d\'historique disponible pour cette tâche');
    return;
  }
  
  try {
    const historyData = JSON.parse(task.historique_statuts);
    const history = historyData.historique || [];
    
    // Mettre à jour le titre
    document.getElementById('history-modal-label').innerHTML = 
      `<i class="bi bi-clock-history me-2"></i>Historique : ${task.titre}`;
    
    // Calculer les statistiques
    const totalDuration = history.reduce((sum, entry) => sum + (entry.duree_minutes || 0), 0);
    const totalDays = Math.round(totalDuration / (60 * 24) * 10) / 10;
    const avgDuration = history.length > 0 ? Math.round(totalDuration / history.length) : 0;
    
    const statsHTML = `
      <div class="row">
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${history.length}</div>
            <div class="stat-label">Étapes</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${totalDays}j</div>
            <div class="stat-label">Durée totale</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${Math.round(avgDuration/60)}h</div>
            <div class="stat-label">Moy. par étape</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${task.statut}</div>
            <div class="stat-label">Statut actuel</div>
          </div>
        </div>
      </div>
    `;
    
    // Créer la timeline
    let timelineHTML = '';
    history.forEach((entry, index) => {
      const isCurrentStatus = index === history.length - 1 && !entry.date_sortie;
      const duration = entry.duree_minutes ? 
        `${Math.floor(entry.duree_minutes / 60)}h ${entry.duree_minutes % 60}m` : 
        'En cours...';
      
      timelineHTML += `
        <div class="timeline-entry ${isCurrentStatus ? 'current' : ''}">
          <div class="timeline-status">${entry.statut}</div>
          <div class="timeline-dates">
            Du ${new Date(entry.date_entree).toLocaleString('fr-FR')}
            ${entry.date_sortie ? `au ${new Date(entry.date_sortie).toLocaleString('fr-FR')}` : '(en cours)'}
          </div>
          <div class="timeline-duration">Durée: ${duration}</div>
          ${entry.note ? `<div class="timeline-note"><i class="bi bi-info-circle me-1"></i>${entry.note}</div>` : ''}
        </div>
      `;
    });
    
    document.getElementById('history-stats').innerHTML = statsHTML;
    document.getElementById('history-timeline').innerHTML = timelineHTML;
    
    // Stocker l'ID de la tâche pour l'export
    document.getElementById('btn-export-task-history').dataset.taskId = task.id;
    
    // Afficher la modal
    new bootstrap.Modal(document.getElementById('history-modal')).show();
    
  } catch (e) {
    console.error('Erreur lors de l\'ouverture de la modal:', e);
    alert('Erreur lors de l\'affichage de l\'historique');
  }
}

// 5. EXPORT DES DONNÉES POUR GANTT
exportSingleTaskHistory(taskId) {
  const task = this.currentRecords.find(r => r.id === taskId);
  if (!task || !task.historique_statuts) return;
  
  try {
    const historyData = JSON.parse(task.historique_statuts);
    const history = historyData.historique || [];
    
    let csv = 'Tâche,Statut,Date_Début,Date_Fin,Durée_Minutes,Durée_Heures,Note\n';
    
    history.forEach(entry => {
      const dureeHeures = entry.duree_minutes ? (entry.duree_minutes / 60).toFixed(1) : '';
      csv += `"${task.titre}","${entry.statut}","${entry.date_entree}","${entry.date_sortie || ''}",${entry.duree_minutes || ''},${dureeHeures},"${entry.note || ''}"\n`;
    });
    
    // Télécharger
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_tache_${taskId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
  } catch (e) {
    console.error('Erreur export:', e);
  }
}
// === SYSTÈME D'HISTORIQUE AUTOMATIQUE DES DESCRIPTIONS ===
// === NOUVELLES MÉTHODES POUR L'HISTORIQUE DES DESCRIPTIONS ===

  // Ajouter un horodatage à la description
  addTimestampToDescription(currentDescription, newContent, userName = null) {
    const now = new Date();
    const timestamp = now.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const user = userName ? ` (${userName})` : '';
    const separator = '---';
    
    // Si pas de nouvelle description, retourner l'ancienne
    if (!newContent || newContent.trim() === '') {
      return currentDescription || '';
    }
    
    // Si pas d'ancienne description, créer la première entrée
    if (!currentDescription || currentDescription.trim() === '') {
      return `[${timestamp}${user}]\n${newContent.trim()}`;
    }
    
    // Vérifier si on modifie vraiment le contenu
    const lines = currentDescription.split('\n');
    const lastContentIndex = lines.findIndex(line => line.startsWith('[') && line.includes(']'));
    
    if (lastContentIndex >= 0) {
      // Extraire le dernier contenu (après le dernier timestamp)
      const lastContent = lines.slice(lastContentIndex + 1)
        .join('\n')
        .replace(/^---\s*$/gm, '') // Enlever les séparateurs
        .trim();
      
      // Si le contenu n'a pas changé, ne pas ajouter d'entrée
      if (lastContent === newContent.trim()) {
        return currentDescription;
      }
    }
    
    // Ajouter la nouvelle entrée avec séparateur
    return `[${timestamp}${user}]\n${newContent.trim()}\n\n${separator}\n\n${currentDescription}`;
  }

  // Formater l'affichage de la description
  formatDescriptionForDisplay(description) {
    if (!description) return '';
    
    // Diviser en sections par les timestamps
    const sections = description.split(/\n\s*---\s*\n/);
    
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const timestampLine = lines.find(line => line.match(/^\[.*\]$/));
      
      if (timestampLine) {
        const content = lines.slice(1).join('\n').trim();
        const isLatest = index === 0;
        
        return `
          <div class="description-entry ${isLatest ? 'latest' : 'historical'}">
            <div class="description-timestamp">${timestampLine}</div>
            <div class="description-content">${content}</div>
          </div>
        `;
      } else {
        // Ancienne description sans timestamp
        return `
          <div class="description-entry legacy">
            <div class="description-content">${section}</div>
          </div>
        `;
      }
    }).join('');
  }

  // Extraire seulement la dernière description
  getLatestDescription(description) {
    if (!description) return '';
    
    const lines = description.split('\n');
    const firstTimestampIndex = lines.findIndex(line => line.match(/^\[.*\]$/));
    
    if (firstTimestampIndex >= 0) {
      // Trouver la fin de cette section (avant le prochain séparateur)
      const separatorIndex = lines.findIndex((line, index) => 
        index > firstTimestampIndex && line.trim() === '---'
      );
      
      const endIndex = separatorIndex >= 0 ? separatorIndex : lines.length;
      return lines.slice(firstTimestampIndex + 1, endIndex).join('\n').trim();
    }
    
    return description; // Ancienne description sans timestamp
  }

  // Afficher l'historique des descriptions dans la modal
  displayDescriptionHistory(tache) {
    // Créer ou mettre à jour la zone d'historique des descriptions
    let historyContainer = document.getElementById('description-history');
    
    if (!historyContainer) {
      // Créer le conteneur s'il n'existe pas
      const descriptionField = document.getElementById('popup-description');
      historyContainer = document.createElement('div');
      historyContainer.id = 'description-history';
      historyContainer.className = 'description-history mt-2';
      
      // Insérer après le champ description
      descriptionField.parentNode.insertBefore(historyContainer, descriptionField.nextSibling);
    }
    
    if (!tache.description) {
      historyContainer.innerHTML = '';
      return;
    }
    
    const formattedHistory = this.formatDescriptionForDisplay(tache.description);
    
    historyContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="bi bi-clock-history me-2"></i>Historique des modifications
            <button class="btn btn-sm btn-outline-secondary float-end" type="button" data-bs-toggle="collapse" data-bs-target="#description-history-content">
              <i class="bi bi-chevron-down"></i>
            </button>
          </h6>
        </div>
        <div class="collapse" id="description-history-content">
          <div class="card-body description-history-content">
            ${formattedHistory}
          </div>
        </div>
      </div>
    `;
  }

  // Extraire les commentaires par statut
  getCommentsPerStatus(task) {
    if (!task.description || !task.historique_statuts) return {};
    
    try {
      const historyData = JSON.parse(task.historique_statuts);
      const statusHistory = historyData.historique || [];
      
      // Extraire les commentaires avec leurs timestamps
      const sections = task.description.split(/\n\s*---\s*\n/);
      const comments = {};
      
      sections.forEach(section => {
        const lines = section.trim().split('\n');
        const timestampLine = lines.find(line => line.match(/^\[.*\]$/));
        
        if (timestampLine) {
          const content = lines.slice(1).join('\n').trim();
          const dateMatch = timestampLine.match(/\[([\d\/\s:]+)/);
          
          if (dateMatch) {
            const commentDate = new Date(dateMatch[1].replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
            
            // Trouver le statut correspondant à cette date
            const correspondingStatus = statusHistory.find(status => {
              const entryDate = new Date(status.date_entree);
              const exitDate = status.date_sortie ? new Date(status.date_sortie) : new Date();
              return commentDate >= entryDate && commentDate <= exitDate;
            });
            
            const statusName = correspondingStatus?.statut || 'Inconnu';
            
            if (!comments[statusName]) {
              comments[statusName] = [];
            }
            
            comments[statusName].push({
              date: commentDate,
              content: content,
              timestamp: timestampLine
            });
          }
        }
      });
      
      return comments;
      
    } catch (e) {
      console.error('Erreur extraction commentaires:', e);
      return {};
    }
  }

  // === CRÉATION DES CARTES ===
  createTaskElementHTML(record) {
    const isExpanded = this.expandedCards.has(record.id);
    
    if (this.viewMode === 'compact' && !isExpanded) {
      return this.createCompactTaskHTML(record);
    } else {
      return this.createDetailedTaskHTML(record);
    }
  }

  createCompactTaskHTML(record) {
    const prio = this.calculerPriorite(record.urgence, record.impact);
    let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
    
    let echeanceElement = '';
    if (record.date_echeance) {
      const echeanceDate = new Date(record.date_echeance);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      echeanceDate.setHours(0, 0, 0, 0);
      
      const diffTime = echeanceDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let echeanceClass = 'echeance-ok';
      if (diffDays < 0) echeanceClass = 'echeance-depassee';
      else if (diffDays === 0) echeanceClass = 'echeance-aujourd-hui';
      else if (diffDays <= 3) echeanceClass = 'echeance-urgent';
      else if (diffDays <= 7) echeanceClass = 'echeance-bientot';
      
      const echeanceText = diffDays < 0 ? `J${diffDays}` : 
                          diffDays === 0 ? "Auj." : `J+${diffDays}`;
      
      echeanceElement = `<span class="date-echeance-compact ${echeanceClass}">
        <i class="bi bi-calendar-x"></i> ${echeanceText}
      </span>`;
    }
    
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    
    return `<div class="kanban-item kanban-item-compact ${hasEcheanceClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      <div class="compact-header">
        <div class="compact-priority">${prioBadge}</div>
        <div class="compact-echeance">${echeanceElement}</div>
        <button class="btn-expand" title="Voir détails">
          <i class="bi bi-chevron-down"></i>
        </button>
      </div>
      <div class="compact-title editable-zone">${record.titre || ''}</div>
    </div>`;
  }
  //
createDetailedTaskHTML(record) {
  const isExpanded = this.expandedCards.has(record.id);
  
  const prio = this.calculerPriorite(record.urgence, record.impact);
  let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
  
  // NOUVEAU : Bouton historique
  let historyButton = '';
  if (record.historique_statuts) {
    try {
      const historyData = JSON.parse(record.historique_statuts);
      const historyCount = historyData.historique ? historyData.historique.length : 0;
      if (historyCount > 1) {
        historyButton = `<button class="btn-history" title="Voir l'historique (${historyCount} étapes)" data-task-id="${record.id}">
          <i class="bi bi-clock-history"></i> ${historyCount}
        </button>`;
      }
    } catch (e) {
      // Ignore les erreurs de parsing
    }
  }
  
  let projetTag = '';
  if (record.projet) {
    const tooltip = [
      record.strategie_objectif ? `Objectif: ${record.strategie_objectif}` : '',
      record.strategie_sous_objectif ? `Sous-objectif: ${record.strategie_sous_objectif}` : '',
      record.strategie_action ? `Action: ${record.strategie_action}` : ''
    ].filter(Boolean).join('\n');
    projetTag = `<span class="badge bg-info text-dark" title="${tooltip.replace(/"/g, '&quot;')}">${record.projet}</span>`;
  }
  
  let resumeDesc = '';
  if (record.description) {
    const mots = record.description.split(/\s+/).slice(0, 10).join(' ');
    resumeDesc = `<div class="desc-resume">${mots}${record.description.split(/\s+/).length > 10 ? '…' : ''}</div>`;
  }
  
  let personnes = '';
  if (Array.isArray(record.qui) && record.qui.length > 1) {
    personnes = '<div class="personnes-list">' +
      record.qui.slice(1).map(q => `<span class="personne-badge">${q}</span>`).join(' ') +
      '</div>';
  }
  
  let datesElement = '';
  const hasDateDebut = record.date_debut;
  const hasDateEcheance = record.date_echeance;
  
  if (hasDateDebut || hasDateEcheance) {
    let dateInfo = [];
    
    if (hasDateDebut) {
      const debutFormatted = this.formatDate(record.date_debut);
      dateInfo.push(`<span class="date-debut" title="Début: ${debutFormatted}">
        <i class="bi bi-play-circle"></i> ${debutFormatted}
      </span>`);
    }
    
    if (hasDateEcheance) {
      const echeanceDate = new Date(record.date_echeance);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      echeanceDate.setHours(0, 0, 0, 0);
      
      const diffTime = echeanceDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let echeanceClass = 'echeance-ok';
      let echeanceText = '';
      
      if (diffDays < 0) {
        echeanceClass = 'echeance-depassee';
        echeanceText = `Dépassé (${Math.abs(diffDays)}j)`;
      } else if (diffDays === 0) {
        echeanceClass = 'echeance-aujourd-hui';
        echeanceText = "Aujourd'hui";
      } else if (diffDays <= 3) {
        echeanceClass = 'echeance-urgent';
        echeanceText = `${diffDays}j restant${diffDays > 1 ? 's' : ''}`;
      } else if (diffDays <= 7) {
        echeanceClass = 'echeance-bientot';
        echeanceText = `${diffDays}j restant${diffDays > 1 ? 's' : ''}`;
      } else {
        echeanceText = `J+${diffDays}`;
      }
      
      const echeanceFormatted = this.formatDate(record.date_echeance);
      dateInfo.push(`<span class="date-echeance ${echeanceClass}" title="Échéance: ${echeanceFormatted}">
        <i class="bi bi-calendar-x"></i> ${echeanceText}
      </span>`);
    }
    
    if (dateInfo.length > 0) {
      datesElement = `<div class="dates-container">${dateInfo.join('')}</div>`;
    }
  }
  
  const hasEcheanceClass = hasDateEcheance ? 'has-echeance' : '';
  const hasDateDebutClass = hasDateDebut ? 'has-debut' : '';
  const collapseButton = (this.viewMode === 'compact' && isExpanded) ? 
    `<button class="btn-collapse" title="Réduire"><i class="bi bi-chevron-up"></i></button>` : '';
  
  return `<div class="kanban-item kanban-item-detailed ${hasEcheanceClass} ${hasDateDebutClass}" data-id="${record.id}">
    <div class="drag-handle">
      <i class="bi bi-grip-vertical"></i>
    </div>
    <div class="kanban-item-header">
      <div>${prioBadge}</div>
      <div class="item-badges">
        ${projetTag}
        ${historyButton}
        ${collapseButton}
      </div>
    </div>
    <div class="item-title editable-zone">${record.titre || ''}</div>
    ${resumeDesc}
    ${datesElement}
    ${personnes}
  </div>`;
}


  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const options = { weekday: 'short', day: 'numeric', month: 'short' };
      return new Date(dateStr).toLocaleDateString('fr-FR', options);
    } catch (e) {
      return dateStr;
    }
  }

  // === RENDU DU KANBAN ===
  refreshKanban() {
    if (!this.kanbanContainer) return;
    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];
    const filteredRecords = this.currentRecords || [];
    const statutsToShow = this.showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
    
    if (this.viewMode === 'focus') {
      this.renderFocusMode(statutsToShow, filteredRecords);
    } else {
      this.renderColumnMode(statutsToShow, filteredRecords);
    }
  }

  renderFocusMode(statutsToShow, filteredRecords) {
    if (!this.focusColumn) {
      this.focusColumn = statutsToShow[0]?.id || 'Backlog';
    }
    
    const navHTML = `
      <div class="focus-navigation">
        ${statutsToShow.map(statut => {
          const count = filteredRecords.filter(r => r.statut === statut.id).length;
          const activeClass = this.focusColumn === statut.id ? 'active' : '';
          return `<button class="btn btn-outline-secondary ${activeClass}" data-status="${statut.id}">
            ${statut.libelle} <span class="badge bg-secondary">${count}</span>
          </button>`;
        }).join('')}
      </div>
    `;
    
    const activeStatus = statutsToShow.find(s => s.id === this.focusColumn);
    const boardRecords = filteredRecords.filter(r => r.statut === this.focusColumn);
    // Tri par priorité puis par ID
    boardRecords.sort((a, b) => {
      const prioA = this.calculerPriorite(a.urgence, a.impact);
      const prioB = this.calculerPriorite(b.urgence, b.impact);
      if (prioA !== prioB) return prioA - prioB; // P1 avant P2, etc.
      return a.id - b.id; // Si même priorité, tri par ID
    });
    const itemsHTML = boardRecords.map(record => this.createTaskElementHTML(record)).join('');
    
    const columnHTML = `
      <div class="focus-column">
        <div class="kanban-board-header">
          <span class="board-title">${activeStatus?.libelle || ''}</span>
          <span class="board-count">${boardRecords.length}</span>
        </div>
        <div class="kanban-board-body" id="items-focus" data-status="${this.focusColumn}">
          ${itemsHTML}
        </div>
      </div>
    `;
    
    this.kanbanContainer.innerHTML = navHTML + columnHTML;
    
    document.querySelectorAll('.focus-navigation button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.focusColumn = e.target.dataset.status;
        this.refreshKanban();
      });
    });
    
    const el = document.getElementById('items-focus');
    if (el) {
      const sortable = new Sortable(el, {
        group: 'kanban-focus',
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: evt => this.handleDragEnd(evt, this.focusColumn)
      });
      this.sortableInstances.push(sortable);
    }
    
    this.attachCardEventListeners();
  }

  renderColumnMode(statutsToShow, filteredRecords) {
    const modeClass = this.viewMode === 'compact' ? 'kanban-compact' : 'kanban-detailed';
    this.kanbanContainer.className = `kanban-container ${modeClass}`;
    
    let kanbanHTML = '';
    statutsToShow.forEach(statut => {
      const boardId = statut.classe;
      const boardRecords = filteredRecords.filter(r => r.statut === statut.id);
      // Tri par priorité puis par ID
      boardRecords.sort((a, b) => {
        const prioA = this.calculerPriorite(a.urgence, a.impact);
        const prioB = this.calculerPriorite(b.urgence, b.impact);
        if (prioA !== prioB) return prioA - prioB; // P1 avant P2, etc.
        return a.id - b.id; // Si même priorité, tri par ID
      });
      const itemsHTML = boardRecords.map(record => this.createTaskElementHTML(record)).join('');
      const count = boardRecords.length;
      const isHidden = (count === 0 && statut.id !== 'Terminé' && this.showTermine);
      const hiddenClass = isHidden ? ' board-hidden' : '';
      
      kanbanHTML += `
        <div id="board-${boardId}" class="kanban-board board-${boardId}${hiddenClass}">
          <div class="kanban-board-header">
            <span class="board-title">${statut.libelle}</span>
            <span class="board-count">${count}</span>
          </div>
          <div class="kanban-board-body" id="items-${boardId}" data-status="${statut.id}">
            ${itemsHTML}
          </div>
        </div>
      `;
    });
    this.kanbanContainer.innerHTML = kanbanHTML;

    statutsToShow.forEach(statut => {
      const boardId = statut.classe;
      const el = document.getElementById(`items-${boardId}`);
      if (el) {
        const sortable = new Sortable(el, {
          group: 'kanban',
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          onEnd: evt => this.handleDragEnd(evt, statut.id)
        });
        this.sortableInstances.push(sortable);
      }
    });

    this.attachCardEventListeners();
  }

  attachCardEventListeners() {
    Array.from(this.kanbanContainer.querySelectorAll('.kanban-item .editable-zone')).forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const item = el.closest('.kanban-item');
        const id = parseInt(item.dataset.id, 10);
        const tache = this.currentRecords.find(r => r.id === id);
        if (tache) this.openPopup(tache);
      });
    });
    
    Array.from(this.kanbanContainer.querySelectorAll('.btn-expand')).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const item = btn.closest('.kanban-item');
        const id = parseInt(item.dataset.id, 10);
        this.expandedCards.add(id);
        this.refreshKanban();
      });
    });
    
    Array.from(this.kanbanContainer.querySelectorAll('.btn-collapse')).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const item = btn.closest('.kanban-item');
        const id = parseInt(item.dataset.id, 10);
        this.expandedCards.delete(id);
        this.refreshKanban();
      });
    });
  }

  // === SAUVEGARDE ET GESTION DES DONNÉES ===
// === MODIFICATION DE saveTask() EXISTANTE ===
  async saveTask() {
    try {
      let dateEcheance = '';
      let dateDebut = '';
      
      const delaiInput = document.getElementById('popup-delai');
      if (delaiInput && delaiInput.value.trim()) {
        dateEcheance = delaiInput.value.trim();
        
        if (!this.currentTaskId) {
          dateDebut = new Date().toISOString().slice(0,10);
        } else {
          const existingRecord = this.currentRecords.find(r => r.id === this.currentTaskId);
          dateDebut = existingRecord?.date_debut || '';
        }
      } else {
        dateEcheance = null;
        dateDebut = null;
      }
      
      const titre = document.getElementById('popup-titre').value;
      const newDescription = document.getElementById('popup-description').value;
      const statut = document.getElementById('popup-statut-text').value;
      const projet = document.getElementById('popup-projet').value;
      const urgence = document.getElementById('popup-urgence').value;
      const impact = document.getElementById('popup-impact').value;
      const bureau = Array.from(document.getElementById('popup-bureau').selectedOptions).map(o => o.value);
      const qui = Array.from(document.getElementById('popup-qui').selectedOptions).map(o => o.value);
      
      const strategie_objectif = document.getElementById('strategie-objectif').value;
      const strategie_sous_objectif = document.getElementById('strategie-sous-objectif').value;
      const strategie_action = document.getElementById('strategie-action').value;
      
      // NOUVEAU : Gestion de l'historique de description
      let finalDescription = newDescription;
      
      if (this.currentTaskId) {
        // Modification d'une tâche existante
        const existingRecord = this.currentRecords.find(r => r.id === this.currentTaskId);
        const currentDescription = existingRecord?.description || '';
        
        // Obtenir l'utilisateur actuel (si disponible)
        let currentUser = null;
        try {
          const userInfo = await grist.docApi.getDocInfo();
          currentUser = userInfo?.user?.name || userInfo?.user?.email || null;
        } catch (e) {
          console.log('Info utilisateur non disponible');
        }
        
        // Ajouter l'horodatage si la description a changé
        finalDescription = this.addTimestampToDescription(currentDescription, newDescription, currentUser);
        
        console.log('Description mise à jour:', {
          avant: currentDescription,
          nouveau: newDescription,
          final: finalDescription
        });
        
      } else {
        // Nouvelle tâche - ajouter un timestamp si il y a une description
        if (newDescription && newDescription.trim()) {
          let currentUser = null;
          try {
            const userInfo = await grist.docApi.getDocInfo();
            currentUser = userInfo?.user?.name || userInfo?.user?.email || null;
          } catch (e) {
            // Ignore
          }
          
          const now = new Date().toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const user = currentUser ? ` (${currentUser})` : '';
          finalDescription = `[${now}${user}]\n${newDescription.trim()}`;
        }
      }
      
      const row = {
        titre, 
        description: finalDescription, 
        statut, 
        projet, 
        urgence, 
        impact,
        bureau: ['L', ...bureau],
        qui: ['L', ...qui],
        strategie_objectif,
        strategie_sous_objectif,
        strategie_action
      };

      if (this.availableColumns.has('date_debut')) {
        row.date_debut = dateDebut;
      }
      
      if (this.availableColumns.has('date_echeance')) {
        row.date_echeance = dateEcheance;
      }

      if (this.currentTaskId) {
        await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, this.currentTaskId, row]
        ]);
        console.log(`Tâche ${this.currentTaskId} mise à jour avec succès`);
        
        const recordIndex = this.currentRecords.findIndex(r => r.id === this.currentTaskId);
        if (recordIndex !== -1) {
          this.currentRecords[recordIndex] = { ...this.currentRecords[recordIndex], ...row };
          this.currentRecords[recordIndex].date_debut = dateDebut;
          this.currentRecords[recordIndex].date_echeance = dateEcheance;
        }
        
      } else {
        const result = await grist.docApi.applyUserActions([
          ['AddRecord', TABLE_ID, null, row]
        ]);
        console.log('Nouvelle tâche créée avec succès');
        
        if (result && result[0] && result[0].id) {
          const newRecord = { id: result[0].id, ...row };
          newRecord.date_debut = dateDebut;
          newRecord.date_echeance = dateEcheance;
          this.currentRecords.push(newRecord);
        }
      }
      
      this.modal.hide();
      this.refreshKanban();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes("KeyError 'date_debut'") || errorMessage.includes("KeyError 'date_echeance'")) {
        errorMessage = "Les colonnes de dates (date_debut/date_echeance) n'existent pas dans votre table Grist. Vous pouvez continuer à utiliser l'application, mais les dates ne seront pas sauvegardées.";
      }
      
      displayError(`Erreur lors de la sauvegarde: ${errorMessage}`);
    }
  }

//
showTaskHistory(taskId) {
  const task = this.currentRecords.find(r => r.id === taskId);
  if (!task) {
    console.error('Tâche non trouvée:', taskId);
    return;
  }
  
  // Afficher dans la console (pour debug)
  this.logTaskHistory(task);
  
  // Afficher dans la modal
  this.openHistoryModal(task);
}

logTaskHistory(task) {
  if (!task.historique_statuts) {
    console.log('Pas d\'historique disponible pour cette tâche');
    return;
  }
  
  try {
    const historyData = JSON.parse(task.historique_statuts);
    console.log('=== HISTORIQUE DE LA TÂCHE ===');
    console.log(`Tâche: ${task.titre}`);
    console.log('Statuts:');
    
    historyData.historique.forEach((entry, index) => {
      const duration = entry.duree_minutes ? 
        `${Math.floor(entry.duree_minutes / 60)}h ${entry.duree_minutes % 60}m` : 
        'En cours...';
      
      console.log(`${index + 1}. ${entry.statut}`);
      console.log(`   Du: ${new Date(entry.date_entree).toLocaleString('fr-FR')}`);
      console.log(`   Au: ${entry.date_sortie ? new Date(entry.date_sortie).toLocaleString('fr-FR') : 'En cours'}`);
      console.log(`   Durée: ${duration}`);
      if (entry.note) console.log(`   Note: ${entry.note}`);
      console.log('');
    });
    
  } catch (e) {
    console.error('Erreur lors de l\'affichage de l\'historique:', e);
  }
}

openHistoryModal(task) {
  if (!task.historique_statuts) {
    alert('Pas d\'historique disponible pour cette tâche');
    return;
  }
  
  try {
    const historyData = JSON.parse(task.historique_statuts);
    const history = historyData.historique || [];
    
    // Mettre à jour le titre
    document.getElementById('history-modal-label').innerHTML = 
      `<i class="bi bi-clock-history me-2"></i>Historique : ${task.titre}`;
    
    // Calculer les statistiques
    const totalDuration = history.reduce((sum, entry) => sum + (entry.duree_minutes || 0), 0);
    const totalDays = Math.round(totalDuration / (60 * 24) * 10) / 10;
    const avgDuration = history.length > 0 ? Math.round(totalDuration / history.length) : 0;
    
    const statsHTML = `
      <div class="row">
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${history.length}</div>
            <div class="stat-label">Étapes</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${totalDays}j</div>
            <div class="stat-label">Durée totale</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${Math.round(avgDuration/60)}h</div>
            <div class="stat-label">Moy. par étape</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-item">
            <div class="stat-value">${task.statut}</div>
            <div class="stat-label">Statut actuel</div>
          </div>
        </div>
      </div>
    `;
    
    // Créer la timeline
    let timelineHTML = '';
    history.forEach((entry, index) => {
      const isCurrentStatus = index === history.length - 1 && !entry.date_sortie;
      const duration = entry.duree_minutes ? 
        `${Math.floor(entry.duree_minutes / 60)}h ${entry.duree_minutes % 60}m` : 
        'En cours...';
      
      timelineHTML += `
        <div class="timeline-entry ${isCurrentStatus ? 'current' : ''}">
          <div class="timeline-status">${entry.statut}</div>
          <div class="timeline-dates">
            Du ${new Date(entry.date_entree).toLocaleString('fr-FR')}
            ${entry.date_sortie ? `au ${new Date(entry.date_sortie).toLocaleString('fr-FR')}` : '(en cours)'}
          </div>
          <div class="timeline-duration">Durée: ${duration}</div>
          ${entry.note ? `<div class="timeline-note"><i class="bi bi-info-circle me-1"></i>${entry.note}</div>` : ''}
        </div>
      `;
    });
    
    document.getElementById('history-stats').innerHTML = statsHTML;
    document.getElementById('history-timeline').innerHTML = timelineHTML;
    
    // Stocker l'ID de la tâche pour l'export
    document.getElementById('btn-export-task-history').dataset.taskId = task.id;
    
    // Afficher la modal
    new bootstrap.Modal(document.getElementById('history-modal')).show();
    
  } catch (e) {
    console.error('Erreur lors de l\'ouverture de la modal:', e);
    alert('Erreur lors de l\'affichage de l\'historique');
  }
}

// 5. EXPORT DES DONNÉES POUR GANTT
exportSingleTaskHistory(taskId) {
  const task = this.currentRecords.find(r => r.id === taskId);
  if (!task || !task.historique_statuts) return;
  
  try {
    const historyData = JSON.parse(task.historique_statuts);
    const history = historyData.historique || [];
    
    let csv = 'Tâche,Statut,Date_Début,Date_Fin,Durée_Minutes,Durée_Heures,Note\n';
    
    history.forEach(entry => {
      const dureeHeures = entry.duree_minutes ? (entry.duree_minutes / 60).toFixed(1) : '';
      csv += `"${task.titre}","${entry.statut}","${entry.date_entree}","${entry.date_sortie || ''}",${entry.duree_minutes || ''},${dureeHeures},"${entry.note || ''}"\n`;
    });
    
    // Télécharger
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_tache_${taskId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
  } catch (e) {
    console.error('Erreur export:', e);
  }
}


//
async handleDragEnd(evt, targetStatus) {
  if (!evt.item || !evt.item.dataset) return;
  
  const id = parseInt(evt.item.dataset.id, 10);
  if (isNaN(id)) return;
  
  const record = this.currentRecords.find(r => r.id === id);
  if (!record) return;
  
  const newStatus = evt.to.dataset.status;
  
  if (record.statut === newStatus) return;
  
  console.log(`Déplacement de la tâche ${id} de "${record.statut}" vers "${newStatus}"`);
  
  try {
    // NOUVEAU : Préparer les données avec historique
    const historyUpdate = updateStatusHistory(record, newStatus, null);
    const updateData = {
      statut: newStatus,
      ...historyUpdate
    };
    
    await grist.docApi.applyUserActions([
      ['UpdateRecord', TABLE_ID, id, updateData]
    ]);
    
    console.log(`Tâche ${id} mise à jour avec historique`);
    
    // Mettre à jour localement
    const recordIndex = this.currentRecords.findIndex(r => r.id === id);
    if (recordIndex !== -1) {
      this.currentRecords[recordIndex] = { 
        ...this.currentRecords[recordIndex], 
        ...updateData 
      };
    }
    
    this.refreshKanban();
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour avec historique:', error);
    
    // Fallback vers l'ancienne méthode si les colonnes n'existent pas
    try {
      await grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, id, { statut: newStatus }]
      ]);
      
      const recordIndex = this.currentRecords.findIndex(r => r.id === id);
      if (recordIndex !== -1) {
        this.currentRecords[recordIndex].statut = newStatus;
      }
      
      this.refreshKanban();
      console.log('Fallback réussi - historique non sauvegardé');
      
    } catch (fallbackError) {
      console.error('Erreur même en fallback:', fallbackError);
      displayError(`Erreur lors du déplacement de la tâche: ${fallbackError.message}`);
      this.refreshKanban();
    }
  }
}


  calculerPriorite(u, i) {
    const imp = String(i || '').trim().toLowerCase();
    const urg = String(u || '').trim().toLowerCase();
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }

  async deleteTask(taskId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }
    
    try {
      await grist.docApi.applyUserActions([
        ['RemoveRecord', TABLE_ID, taskId]
      ]);
      
      console.log(`Tâche ${taskId} supprimée avec succès`);
      
      this.currentRecords = this.currentRecords.filter(r => r.id !== taskId);
      
      if (this.modal && this.currentTaskId === taskId) {
        this.modal.hide();
      }
      
      this.refreshKanban();
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      displayError(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  // === GESTION DES ÉVÉNEMENTS GRIST ===
  handleGristUpdate(gristRecords, mappings = null) {
    if (this.isUpdating) return;
    if (this.ignoreNextOnRecords) { 
      this.ignoreNextOnRecords = false; 
      return; 
    }
    
    console.log('Mise à jour Grist reçue, rechargement des données...');
    this.isUpdating = true;
    
    grist.docApi.fetchTable(TABLE_ID).then(fresh => {
      this.currentRecords = this.mapGristRecords(fresh);
      this.initFilters();
      this.refreshKanban();
      console.log('Données mises à jour avec succès');
    }).catch(error => {
      console.error('Erreur lors du rechargement des données:', error);
      displayError(`Erreur lors du rechargement: ${error.message}`);
    }).finally(() => { 
      this.isUpdating = false; 
    });
  }

  signalLocalUpdate() {
    this.ignoreNextOnRecords = true;
    setTimeout(() => { this.ignoreNextOnRecords = false; }, 500);
  }

  // === INITIALISATION DES COMPOSANTS ===
  initFilters() {
    this.populateSelectWithOptions('filter-bureau', this.gristOptions.bureau || []);
    this.populateSelectWithOptions('filter-qui', this.gristOptions.qui || []);
    this.populateSelectWithOptions('filter-projet', this.gristOptions.projet || []);
    this.populateSelectWithOptions('filter-statut', DEFAULT_STATUTS);
  }

  initModalWithOptions() {
    if (this.modalElement) {
      this.modal = new bootstrap.Modal(this.modalElement, { backdrop: 'static', keyboard: false });
      this.populateSelectWithOptions('popup-urgence', this.gristOptions.urgence || [], true);
      this.populateSelectWithOptions('popup-impact', this.gristOptions.impact || [], true);
      this.populateSelectWithOptions('popup-bureau', this.gristOptions.bureau || [], false);
      this.populateSelectWithOptions('popup-qui', this.gristOptions.qui || [], false);
      this.populateSelectWithOptions('popup-projet', this.gristOptions.projet || [], true);
      
      const btnAjoutProjet = document.getElementById('btn-ajout-projet');
      if (btnAjoutProjet) {
        btnAjoutProjet.onclick = () => {
          const champ = document.getElementById('projet-ajout');
          const val = champ.value.trim();
          if(val && !this.gristOptions.projet.includes(val) && !projetsDynamiques.includes(val)) {
            projetsDynamiques.push(val);
            this.populateSelectWithOptions('popup-projet', [...this.gristOptions.projet, ...projetsDynamiques], true);
            champ.value = '';
          }
        };
      }
    }
  }

  populateSelectWithOptions(selectId, options, addEmptyOption = true) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '';
    if (!Array.isArray(options)) return;
    if (addEmptyOption && !sel.multiple) {
      const opt = document.createElement('option');
      opt.value = "";
      opt.text = selectId.startsWith('filter-') ? "Tous" : "-- Choisir --";
      sel.appendChild(opt);
    }
    options.forEach(v => {
      if (v !== null && typeof v !== 'undefined') {
        const o = document.createElement('option');
        o.value = v;
        o.text = v;
        sel.appendChild(o);
      }
    });
  }

  getStratOptionsFromTasks() {
    const set = new Set();
    (this.currentRecords || []).forEach(rec => {
      const obj = rec.strategie_objectif || "";
      const sous = rec.strategie_sous_objectif || "";
      const act = rec.strategie_action || "";
      if (obj || sous || act) {
        set.add(JSON.stringify({objectif: obj, sous_objectif: sous, action: act}));
      }
    });
    return Array.from(set).map(s => JSON.parse(s));
  }

  populateStrategieLists(selected = {}) {
    const STRATEGIES = this.getStratOptionsFromTasks();

    const objectifs = [...new Set(STRATEGIES.map(s => s.objectif))].filter(Boolean).sort();
    const selObj = document.getElementById('strategie-objectif');
    if (!selObj) return;
    selObj.innerHTML = objectifs.map(obj => `<option value="${obj}">${obj}</option>`).join('');
    if (selected.objectif) selObj.value = selected.objectif;

    function updateSousObjectif() {
      const obj = selObj.value;
      const sousObj = [...new Set(STRATEGIES.filter(s => s.objectif === obj).map(s => s.sous_objectif))].filter(Boolean).sort();
      const selSous = document.getElementById('strategie-sous-objectif');
      selSous.innerHTML = sousObj.map(so => `<option value="${so}">${so}</option>`).join('');
      if (selected.sous_objectif) selSous.value = selected.sous_objectif;
      updateAction();
    }

    function updateAction() {
      const obj = selObj.value;
      const sousObj = document.getElementById('strategie-sous-objectif').value;
      const actions = [...new Set(STRATEGIES.filter(s => s.objectif === obj && s.sous_objectif === sousObj).map(s => s.action))].filter(Boolean).sort();
      const selAct = document.getElementById('strategie-action');
      selAct.innerHTML = actions.map(a => `<option value="${a}">${a}</option>`).join('');
      if (selected.action) selAct.value = selected.action;
    }

    selObj.onchange = updateSousObjectif;
    document.getElementById('strategie-sous-objectif').onchange = updateAction;

    updateSousObjectif();
  }

  // 5. MODIFICATION DE openPopup POUR AFFICHER SEULEMENT LA DERNIÈRE DESCRIPTION
  openPopup(tache = {}) {
    if (!this.modal || !this.modalElement) return;
    const isNewTask = !tache.id;
    this.currentTaskId = tache.id || null;
    
    const btnDelete = document.getElementById('btn-delete-task');
    if (btnDelete) {
      btnDelete.style.display = isNewTask ? 'none' : 'inline-block';
    }
    
    const trySet = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ""; };
    trySet('popup-id', tache.id || '');
    trySet('popup-titre', tache.titre || '');
    
    // NOUVEAU : Afficher seulement la dernière description dans le champ d'édition
    const latestDescription = this.getLatestDescription(tache.description || '');
    trySet('popup-description', latestDescription);
    
    trySet('popup-statut-text', tache.statut || (isNewTask ? (STATUTS[0]?.id || '') : ''));
    trySet('popup-projet', tache.projet || '');
    trySet('popup-urgence', tache.urgence || '');
    trySet('popup-impact', tache.impact || '');
    this.setSelectedOptions('popup-bureau', tache.bureau);
    this.setSelectedOptions('popup-qui', tache.qui);
    
    this.populateStrategieLists({
      objectif: tache.strategie_objectif,
      sous_objectif: tache.strategie_sous_objectif,
      action: tache.strategie_action
    });
    
    const delaiInput = document.getElementById('popup-delai');
    if (delaiInput && tache.date_echeance) {
      delaiInput.value = tache.date_echeance;
    }
    
    // NOUVEAU : Afficher l'historique complet des descriptions sous le champ
    this.displayDescriptionHistory(tache);
    
    this.modal.show();
  }

  // === NOUVELLE MÉTHODE POUR EXPORTER L'HISTORIQUE COMPLET ===
  exportTaskWithCommentsHistory(taskId) {
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task) return;
    
    const comments = this.getCommentsPerStatus(task);
    
    let csv = 'Tâche_ID,Tâche_Titre,Statut,Date_Commentaire,Auteur,Commentaire\n';
    
    Object.keys(comments).forEach(status => {
      comments[status].forEach(comment => {
        const titre = (task.titre || '').replace(/"/g, '""');
        const contenu = comment.content.replace(/"/g, '""');
        const auteur = comment.timestamp.match(/\((.*?)\)/) ? comment.timestamp.match(/\((.*?)\)/)[1] : '';
        
        csv += `${task.id},"${titre}","${status}","${comment.date.toISOString()}","${auteur}","${contenu}"\n`;
      });
    });
    
    // Télécharger
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_commentaires_tache_${taskId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // === MÉTHODE POUR AFFICHER UN RAPPORT COMPLET ===
  showTaskCompleteReport(taskId) {
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task) return;
    
    console.log('=== RAPPORT COMPLET DE LA TÂCHE ===');
    console.log(`ID: ${task.id}`);
    console.log(`Titre: ${task.titre}`);
    console.log(`Statut actuel: ${task.statut}`);
    
    // Historique des statuts
    if (task.historique_statuts) {
      try {
        const historyData = JSON.parse(task.historique_statuts);
        console.log('\n--- HISTORIQUE DES STATUTS ---');
        historyData.historique.forEach((entry, index) => {
          const duration = entry.duree_minutes ? 
            `${Math.floor(entry.duree_minutes / 60)}h ${entry.duree_minutes % 60}m` : 
            'En cours...';
          console.log(`${index + 1}. ${entry.statut} (${duration})`);
        });
      } catch (e) {
        console.log('Erreur parsing historique statuts');
      }
    }
    
    // Commentaires par statut
    const comments = this.getCommentsPerStatus(task);
    console.log('\n--- COMMENTAIRES PAR STATUT ---');
    Object.keys(comments).forEach(status => {
      console.log(`\n${status}:`);
      comments[status].forEach(comment => {
        console.log(`  ${comment.timestamp}`);
        console.log(`  ${comment.content}`);
      });
    });
  }

// 6. FONCTION POUR AFFICHER L'HISTORIQUE DES DESCRIPTIONS
displayDescriptionHistory(tache) {
  // Créer ou mettre à jour la zone d'historique des descriptions
  let historyContainer = document.getElementById('description-history');
  
  if (!historyContainer) {
    // Créer le conteneur s'il n'existe pas
    const descriptionField = document.getElementById('popup-description');
    historyContainer = document.createElement('div');
    historyContainer.id = 'description-history';
    historyContainer.className = 'description-history mt-2';
    
    // Insérer après le champ description
    descriptionField.parentNode.insertBefore(historyContainer, descriptionField.nextSibling);
  }
  
  if (!tache.description) {
    historyContainer.innerHTML = '';
    return;
  }
  
  
  historyContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-clock-history me-2"></i>Historique des modifications
          <button class="btn btn-sm btn-outline-secondary float-end" type="button" data-bs-toggle="collapse" data-bs-target="#description-history-content">
            <i class="bi bi-chevron-down"></i>
          </button>
        </h6>
      </div>
      <div class="collapse" id="description-history-content">
        <div class="card-body description-history-content">
          ${formattedHistory}
        </div>
      </div>
    </div>
  `;
}

//
  setSelectedOptions(selectId, valuesWithL) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const values = Array.isArray(valuesWithL) && valuesWithL[0] === 'L' ? valuesWithL.slice(1) : [];
    const lowerVals = values.map(v => String(v).trim().toLowerCase());
    Array.from(sel.options).forEach(o => {
      const vClean = String(o.value).trim().toLowerCase();
      o.selected = lowerVals.includes(vClean);
    });
  }

  initFlatpickr() {
    const delaiInput = document.getElementById('popup-delai');
    const delaiType = document.getElementById('delai-type');
    
    if (!delaiInput || !delaiType) return;
    
    this.flatpickr = flatpickr(delaiInput, {
      locale: 'fr',
      dateFormat: 'Y-m-d',
      allowInput: true,
      disableMobile: true,
      allowClear: true,
      placeholder: 'Cliquer pour choisir une date ou laisser vide'
    });
    
    delaiType.style.display = 'none';
    delaiInput.placeholder = 'Cliquer pour choisir une date ou laisser vide';
  }

  initEventListeners() {
    document.getElementById('btn-save-task').onclick = () => this.saveTask();
    document.getElementById('btn-nouvelle-tache').onclick = () => this.openPopup();
    const btnExportHistory = document.getElementById('btn-export-history');
    if (btnExportHistory) {
      btnExportHistory.onclick = () => this.exportHistoryData();
    }
    const btnDelete = document.getElementById('btn-delete-task');
    if (btnDelete) {
      btnDelete.onclick = () => {
        if (this.currentTaskId) {
          this.deleteTask(this.currentTaskId);
        }
      };
    }


   document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-history')) {
    e.stopPropagation();
    const taskId = parseInt(e.target.closest('.btn-history').dataset.taskId);
    if (taskId) this.showTaskHistory(taskId);
  }
});

// Event listener pour l'export depuis la modal
document.getElementById('btn-export-task-history')?.addEventListener('click', (e) => {
  const taskId = parseInt(e.target.dataset.taskId);
  if (taskId) this.exportSingleTaskHistory(taskId);
});
    
    const filterElements = ['filter-bureau', 'filter-qui', 'filter-projet', 'filter-statut'];
    filterElements.forEach(filterId => {
      const filterEl = document.getElementById(filterId);
      if (filterEl) {
        filterEl.addEventListener('change', () => this.applyFilters());
      }
    });
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
    
    const showTermineCheckbox = document.getElementById('show-termine');
    if (showTermineCheckbox) {
      showTermineCheckbox.addEventListener('change', (e) => {
        this.showTermine = e.target.checked;
        this.refreshKanban();
      });
    }
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' || e.key === 'N') {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          this.openPopup();
        }
      }
      if ((e.key === 'Delete' || e.key === 'Suppr') && this.currentTaskId) {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          this.deleteTask(this.currentTaskId);
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          const searchInput = document.getElementById('search-input');
          if (searchInput) searchInput.focus();
        }
      }
      if (e.key === '1' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.setViewMode('compact');
      }
      if (e.key === '2' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.setViewMode('detailed');
      }
      if (e.key === '3' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.setViewMode('focus');
      }
    });
  }

  applyFilters() {
    this.filters.bureau = document.getElementById('filter-bureau')?.value || '';
    this.filters.qui = document.getElementById('filter-qui')?.value || '';
    this.filters.projet = document.getElementById('filter-projet')?.value || '';
    this.filters.statut = document.getElementById('filter-statut')?.value || '';
    
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    
    let filteredRecords = this.currentRecords.filter(record => {
      if (this.filters.bureau && Array.isArray(record.bureau)) {
        const bureaux = record.bureau.slice(1);
        if (!bureaux.includes(this.filters.bureau)) return false;
      }
      
      if (this.filters.qui && Array.isArray(record.qui)) {
        const responsables = record.qui.slice(1);
        if (!responsables.includes(this.filters.qui)) return false;
      }
      
      if (this.filters.projet && record.projet !== this.filters.projet) return false;
      
      if (this.filters.statut && record.statut !== this.filters.statut) return false;
      
      if (searchTerm) {
        const searchableText = [
          record.titre || '',
          record.description || '',
          record.projet || '',
          record.strategie_objectif || '',
          record.strategie_sous_objectif || '',
          record.strategie_action || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      return true;
    });
    
    const originalRecords = this.currentRecords;
    this.currentRecords = filteredRecords;
    
    this.refreshKanban();
    
    this.currentRecords = originalRecords;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new KanbanManager();
});
