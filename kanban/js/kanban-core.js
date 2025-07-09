// === js/kanban-core.js - CODE COMPLET ===

// === CONFIGURATION ===
const STATUTS = [
  { id: 'Backlog', libelle: 'Backlog', classe: 'backlog' },
  { id: 'À faire', libelle: 'À faire', classe: 'a-faire' },
  { id: 'En cours', libelle: 'En cours', classe: 'en-cours' },
  { id: 'En attente', libelle: 'En attente', classe: 'en-attente' },
  { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque' },
  { id: 'Validation', libelle: 'Validation', classe: 'validation' },
  { id: 'Terminé', libelle: 'Terminé', classe: 'termine' }
];

const DEFAULT_BUREAUX = ['Exploit', 'Réseau', 'BDD', 'Chef SSIR', 'SIG','NEXSIS-RRF','COMSIC', 'RSSI','DPO'];
const DEFAULT_RESPONSABLES = ['Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo', 'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta','Yvon','Clarisse','Hervé','Didier'];
const DEFAULT_URGENCES = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
const DEFAULT_IMPACTS = ['Critique', 'Important', 'Modéré', 'Mineur'];
const DEFAULT_STATUTS = STATUTS.map(s => s.id);
const DEFAULT_PROJETS = [
];

const TABLE_ID = "Ssir_principale_task";

const REQUIRED_COLUMNS = [
  'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_objectif', 'strategie_sous_objectif', 'strategie_action', 'notes',
  'historique_statuts', 'date_derniere_maj', 'statut_precedent'
];

const OPTIONAL_COLUMNS = ['date_debut', 'date_echeance'];

let projetsDynamiques = [];

// === FONCTIONS UTILITAIRES ===
// === FONCTION DE DEBUG SIMPLE ===


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

//classe pickmanager pour les dates
class DatePickerManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.dateInput = null;
    this.clearBtn = null;
    this.pickBtn = null;
    this.statusDiv = null;
    this.flatpickrInstance = null;
    
    this.init();
  }
  
  init() {
    this.dateInput = document.getElementById('popup-delai');
    this.clearBtn = document.getElementById('btn-clear-date');
    this.pickBtn = document.getElementById('btn-pick-date');
    this.statusDiv = document.getElementById('date-status');
    
    if (!this.dateInput) return;
    
    this.setupFlatpickr();
    this.setupEventListeners();
    this.updateDisplay();
  }
  
  setupFlatpickr() {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.destroy();
    }
    
    this.flatpickrInstance = flatpickr(this.dateInput, {
      locale: 'fr',
      dateFormat: 'Y-m-d',
      allowInput: false,
      disableMobile: true,
      minDate: 'today',
      position: 'below',
      onChange: (selectedDates, dateStr) => {
        this.onDateChange(dateStr);
      },
      onOpen: () => {
        this.pickBtn?.classList.add('active');
      },
      onClose: () => {
        this.pickBtn?.classList.remove('active');
      }
    });
  }
  
  setupEventListeners() {
    // Bouton de sélection de date
    this.pickBtn?.addEventListener('click', () => {
      this.flatpickrInstance.open();
    });
    
    // Bouton de suppression
    this.clearBtn?.addEventListener('click', () => {
      this.clearDate();
    });
    
    // Clic sur le champ
    this.dateInput?.addEventListener('click', () => {
      this.flatpickrInstance.open();
    });
    
    // Empêcher la saisie manuelle
    this.dateInput?.addEventListener('keydown', (e) => {
      e.preventDefault();
    });
  }
  
  onDateChange(dateStr) {
    if (dateStr) {
      this.dateInput.value = dateStr;
      this.updateDisplay(dateStr);
    }
  }
  
  clearDate() {
    this.dateInput.value = '';
    this.flatpickrInstance.clear();
    this.updateDisplay();
  }
  
  setDate(dateStr) {
    if (dateStr) {
      this.dateInput.value = dateStr;
      this.flatpickrInstance.setDate(dateStr, false);
      this.updateDisplay(dateStr);
    } else {
      this.clearDate();
    }
  }
  
  updateDisplay(dateStr = null) {
    const currentDate = dateStr || this.dateInput?.value || '';
    
    if (!this.dateInput || !this.statusDiv) return;
    
    if (currentDate) {
      // Il y a une date
      this.dateInput.classList.add('has-date');
      this.statusDiv.classList.add('has-date');
      this.clearBtn.style.display = 'block';
      
      // Calculer le délai
      const targetDate = new Date(currentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Formater la date
      const formattedDate = targetDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Déterminer le statut et le message
      let statusClass = 'ok';
      let statusText = '';
      let countdownClass = 'ok';
      
      if (diffDays < 0) {
        statusClass = 'urgent';
        countdownClass = 'urgent';
        statusText = `Dépassé de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
      } else if (diffDays === 0) {
        statusClass = 'urgent';
        countdownClass = 'urgent';
        statusText = "Aujourd'hui !";
      } else if (diffDays <= 3) {
        statusClass = 'urgent';
        countdownClass = 'urgent';
        statusText = `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      } else if (diffDays <= 7) {
        statusClass = 'soon';
        countdownClass = 'soon';
        statusText = `Dans ${diffDays} jours`;
      } else {
        statusText = `Dans ${diffDays} jours`;
      }
      
      this.statusDiv.innerHTML = `
        <div class="date-info">
          <i class="bi bi-calendar-check"></i>
          <span>${formattedDate}</span>
          <span class="date-countdown ${countdownClass}">${statusText}</span>
        </div>
      `;
      
    } else {
      // Pas de date
      this.dateInput.classList.remove('has-date');
      this.statusDiv.classList.remove('has-date');
      this.clearBtn.style.display = 'none';
      
      this.statusDiv.innerHTML = `
        <i class="bi bi-calendar-x text-muted"></i>
        <span>Aucune date butoir définie</span>
      `;
    }
  }
  
  getDate() {
    return this.dateInput?.value || null;
  }
  
  destroy() {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.destroy();
      this.flatpickrInstance = null;
    }
  }
}


// === CLASSE PRINCIPALE KANBAN ===
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
    this.USER_ACTIONS_TABLE = "User_Actions";
    this.sortableInstances = [];
    this.flatpickr = null;
    this.datePickerManager = null;
    this.availableColumns = new Set();
    
    // Modes de vue
    this.viewMode = 'compact';
    this.focusColumn = null;
    this.expandedCards = new Set();
    //user
    this.currentUser = null;           // NOUVEAU
    this.userInitialized = false;      // NOUVEAU
    this.init();
  }

  async init() {
  await this.waitForGristReady();
  
  await this.loadGristDataAndOptions();
  await this.initializeUser();        // NOUVEAU : après Grist ready
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
async debugGristUser() {
  console.log('=== TEST UTILISATEUR GRIST ===');
  
  const userName = this.currentUser; // ← CORRECTION : currentUser au lieu de currentuser
  
  if (userName) {
    console.log('🎉 Succès ! Nom d\'utilisateur:', userName);
    console.log('📝 Les commentaires apparaîtront comme:');
    console.log(`[${new Date().toLocaleString('fr-FR')} (${userName})]`);
  } else {
    console.log('⚠️ Aucun nom d\'utilisateur Grist disponible');
    console.log('📝 Les commentaires apparaîtront comme:');
    console.log(`[${new Date().toLocaleString('fr-FR')}]`);
  }
  
  return userName;
}



async getCurrentGristUser() {
  try {
    console.log('🔍 Récupération utilisateur Grist...');
    
    // Essayer d'obtenir les infos utilisateur via l'API
    const userInfo = await grist.docApi.getDocInfo();
    console.log('Info Grist reçue:', userInfo);
    
    // Chercher le nom d'utilisateur dans différentes propriétés possibles
    const user = userInfo?.user || userInfo?.users?.[0] || null;
    
    if (user) {
      console.log('Objet utilisateur trouvé:', user);
      
      // Priorité : name > displayName > email > id
      const userName = user.name || 
                      user.displayName || 
                      user.email || 
                      user.id || 
                      null;
      
      if (userName) {
        console.log('✅ Nom utilisateur trouvé:', userName);
        this.currentUser = userName; // ← CORRECTION : currentUser au lieu de currentuser
        return this.currentUser;
      }
    }
    
    // Essayer d'autres propriétés possibles
    if (userInfo?.metadata?.updatedBy) {
      console.log('✅ Nom trouvé dans metadata:', userInfo.metadata.updatedBy);
      this.currentUser = userInfo.metadata.updatedBy; // ← CORRECTION
      return this.currentUser;
    }
    
    if (userInfo?.owner) {
      console.log('✅ Nom trouvé dans owner:', userInfo.owner);
      this.currentUser = userInfo.owner; // ← CORRECTION
      return this.currentUser;
    }
    
    console.log('❌ Aucun nom d\'utilisateur trouvé');
    this.currentUser = null; // ← CORRECTION
    return this.currentUser;
    
  } catch (error) {
    console.log('❌ Erreur API getDocInfo:', error.message);
    this.currentUser = null; // ← CORRECTION
    return this.currentUser;
  }
}

  // Ajoutez cette fonction pour tester le système utilisateur :
async testUserSystem() {
  console.log('=== TEST COMPLET DU SYSTÈME UTILISATEUR ===');
  
  // 1. Tester la récupération utilisateur
  console.log('\n1. Test récupération utilisateur...');
  await this.initializeUser();
  
  // 2. Afficher le résultat
  console.log('\n2. Résultat:');
  if (this.currentUser) {
    console.log(`✅ Utilisateur: ${this.currentUser}`);
  } else {
    console.log('❌ Pas d\'utilisateur détecté');
  }
  
  // 3. Tester l'ajout de timestamp
  console.log('\n3. Test timestamp...');
  const testDescription = this.addTimestampToDescription('', 'Test de commentaire', null);
  console.log('Résultat timestamp:', testDescription);
  
  // 4. Vérifier les colonnes Grist
  console.log('\n4. Colonnes utilisateur Grist:');
  console.log('- last_modified_by:', this.availableColumns.has('last_modified_by') ? '✅' : '❌');
  console.log('- last_modified_at:', this.availableColumns.has('last_modified_at') ? '✅' : '❌');
  
  // 5. Tester la table User_Actions
  console.log('\n5. Test table User_Actions...');
  try {
    await this.logUserAction(999, 'test', 'ancienne_valeur', 'nouvelle_valeur', 'Test système');
    console.log('✅ Logging User_Actions fonctionne');
  } catch (e) {
    console.log('❌ Erreur User_Actions:', e.message);
  }
  
  return {
    userDetected: !!this.currentUser,
    userName: this.currentUser,
    columnsOk: this.availableColumns.has('last_modified_by'),
    testComplete: true
  };
}

  async initializeUser() {
  if (this.userInitialized) return this.currentUser;
  
  console.log('Initialisation de l\'utilisateur Grist...');
  this.currentUser = await this.getCurrentGristUser();
  this.userInitialized = true;
  
  if (this.currentUser) {
    console.log('✅ Utilisateur Grist initialisé:', this.currentUser);
  } else {
    console.log('⚠️ Pas de nom d\'utilisateur Grist disponible');
  }
  
  return this.currentUser;
}
// === 2. REMPLACEZ VOTRE updateStatusHistory PAR CELLE-CI ===
updateStatusHistory(record, newStatus) {
  const now = new Date().toISOString();
  
  try {
    let historyData;
    
    // Détecter le nom correct de la colonne d'historique
    const historyColumn = this.getHistoryColumnName ? this.getHistoryColumnName() : 'historique_statuts';
    const existingHistory = record[historyColumn];
    
    if (existingHistory) {
      historyData = JSON.parse(existingHistory);
    } else {
      historyData = { historique: [], version: 1 };
      
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
          utilisateur: record.last_modified_by || 'Système',
          note: "Reconstitué automatiquement"
        });
      }
    }
    
    // Fermer le statut actuel
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
      utilisateur: record.last_modified_by || 'En cours...'
    });
    
    return {
      [historyColumn]: JSON.stringify(historyData),
      date_derniere_maj: now,
      statut_precedent: record.statut
    };
    
  } catch (error) {
    console.error('Erreur historique:', error);
    
    // Fallback simple
    const fallbackHistory = {
      historique: [{
        statut: newStatus,
        date_entree: now,
        date_sortie: null,
        duree_minutes: null,
        utilisateur: 'Système',
        note: "Historique reconstruit après erreur"
      }],
      version: 1
    };
    
    const historyColumn = this.getHistoryColumnName ? this.getHistoryColumnName() : 'historique_statuts';
    
    return {
      [historyColumn]: JSON.stringify(fallbackHistory),
      date_derniere_maj: now,
      statut_precedent: record.statut || 'Inconnu'
    };
  }
}

  async loadGristDataAndOptions() {
    try {
      const records = await grist.docApi.fetchTable(TABLE_ID);
      
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

  // === GESTION DES DATES ===
  normalizeDate(dateValue) {
    if (!dateValue) return null;
    
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }
    
    if (typeof dateValue === 'number' || (typeof dateValue === 'string' && !isNaN(dateValue))) {
      const timestamp = typeof dateValue === 'string' ? parseFloat(dateValue) : dateValue;
      
      let date;
      if (timestamp > 1000000000000) {
        date = new Date(timestamp);
      } else if (timestamp > 1000000000) {
        date = new Date(timestamp * 1000);
      } else {
        date = new Date((timestamp - 25569) * 86400 * 1000);
      }
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
    
    if (typeof dateValue === 'string') {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
      } catch (e) {
        console.warn('Format de date non reconnu:', dateValue);
      }
    }
    
    return null;
  }

  formatDate(dateValue) {
    const normalizedDate = this.normalizeDate(dateValue);
    if (!normalizedDate) return '';
    
    try {
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(normalizedDate).toLocaleDateString('fr-FR', options);
    } catch (e) {
      return normalizedDate;
    }
  }

  prepareDateForGrist(dateString) {
    if (!dateString || dateString.trim() === '') {
      return null;
    }
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    } catch (e) {
      console.warn('Impossible de convertir la date:', dateString);
    }
    
    return null;
  }

  // === GESTION DES COMMENTAIRES ===
 addTimestampToDescription(currentDescription, newContent, userName = null) {
  const now = new Date();
  const timestamp = now.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Utiliser l'utilisateur Grist s'il est disponible
  const user = userName || this.currentUser;
  const userSuffix = user ? ` (${user})` : '';
  const separator = '---';
  
  if (!newContent || newContent.trim() === '') {
    return currentDescription || '';
  }
  
  if (!currentDescription || currentDescription.trim() === '') {
    return `[${timestamp}${userSuffix}]\n${newContent.trim()}`;
  }
  
  const lines = currentDescription.split('\n');
  const lastContentIndex = lines.findIndex(line => line.startsWith('[') && line.includes(']'));
  
  if (lastContentIndex >= 0) {
    const lastContent = lines.slice(lastContentIndex + 1)
      .join('\n')
      .replace(/^---\s*$/gm, '')
      .trim();
    
    if (lastContent === newContent.trim()) {
      return currentDescription;
    }
  }
  
  return `[${timestamp}${userSuffix}]\n${newContent.trim()}\n\n${separator}\n\n${currentDescription}`;
}

  getLatestDescription(description) {
    if (!description) return '';
    
    const lines = description.split('\n');
    const firstTimestampIndex = lines.findIndex(line => line.match(/^\[.*\]$/));
    
    if (firstTimestampIndex >= 0) {
      const separatorIndex = lines.findIndex((line, index) => 
        index > firstTimestampIndex && line.trim() === '---'
      );
      
      const endIndex = separatorIndex >= 0 ? separatorIndex : lines.length;
      return lines.slice(firstTimestampIndex + 1, endIndex).join('\n').trim();
    }
    
    return description;
  }

  formatDescriptionForDisplay(description) {
    if (!description) return '';
    
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
        return `
          <div class="description-entry legacy">
            <div class="description-content">${section}</div>
          </div>
        `;
      }
    }).join('');
  }

  displayDescriptionHistory(tache) {
    let historyContainer = document.getElementById('description-history');
    
    if (!historyContainer) {
      const descriptionField = document.getElementById('popup-description');
      historyContainer = document.createElement('div');
      historyContainer.id = 'description-history';
      historyContainer.className = 'description-history mt-2';
      
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

  getCommentsPerStatus(task) {
    if (!task.description || !task.historique_statuts) return {};
    
    try {
      const historyData = JSON.parse(task.historique_statuts);
      const statusHistory = historyData.historique || [];
      
      const sections = task.description.split(/\n\s*---\s*\n/);
      const comments = {};
      
      sections.forEach(section => {
        const lines = section.trim().split('\n');
        const timestampLine = lines.find(line => line.match(/^\[.*\]$/));
        
        if (timestampLine) {
          const content = lines.slice(1).join('\n').trim();
          const dateMatch = timestampLine.match(/\[(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
          
          if (dateMatch && content) {
            const [datePart, timePart] = dateMatch[1].split(' ');
            const [day, month, year] = datePart.split('/');
            const commentDate = new Date(`${year}-${month}-${day}T${timePart}:00`);
            
            if (isNaN(commentDate.getTime())) return;
            
            let correspondingStatus = statusHistory.find(status => {
              const entryDate = new Date(status.date_entree);
              const exitDate = status.date_sortie ? new Date(status.date_sortie) : new Date();
              const marginBefore = new Date(entryDate.getTime() - 5 * 60000);
              const marginAfter = new Date(exitDate.getTime() + 5 * 60000);
              
              return commentDate >= marginBefore && commentDate <= marginAfter;
            });
            
            if (!correspondingStatus && statusHistory.length > 0) {
              correspondingStatus = statusHistory.reduce((closest, status) => {
                const statusDate = new Date(status.date_entree);
                const closestDate = new Date(closest.date_entree);
                
                return Math.abs(commentDate - statusDate) < Math.abs(commentDate - closestDate) 
                  ? status : closest;
              });
            }
            
            const statusName = correspondingStatus?.statut || 'Non classé';
            
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
      
      Object.keys(comments).forEach(status => {
        comments[status].sort((a, b) => b.date - a.date);
      });
      
      return comments;
      
    } catch (e) {
      console.error('Erreur extraction commentaires:', e);
      return {};
    }
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

  createDetailedTaskHTML(record) {
    const isExpanded = this.expandedCards.has(record.id);
    
    const prio = this.calculerPriorite(record.urgence, record.impact);
    let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
    
    // Bouton historique
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
      const latestDesc = this.getLatestDescription(record.description);
      const mots = latestDesc.split(/\s+/).slice(0, 10).join(' ');
      resumeDesc = `<div class="desc-resume">${mots}${latestDesc.split(/\s+/).length > 10 ? '…' : ''}</div>`;
    }
    
    let personnes = '';
    if (Array.isArray(record.qui) && record.qui.length > 1) {
      personnes = '<div class="personnes-list">' +
        record.qui.slice(1).map(q => `<span class="personne-badge">${q}</span>`).join(' ') +
        '</div>';
    }
    
    let datesElement = '';
    const dateDebut = this.normalizeDate(record.date_debut);
    const dateEcheance = this.normalizeDate(record.date_echeance);
    
    if (dateDebut || dateEcheance) {
      let dateInfo = [];
      
      if (dateDebut) {
        const debutFormatted = this.formatDate(dateDebut);
        dateInfo.push(`<span class="date-debut" title="Début: ${debutFormatted}">
          <i class="bi bi-play-circle"></i> ${debutFormatted}
        </span>`);
      }
      
      if (dateEcheance) {
        const echeanceDate = new Date(dateEcheance);
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
        
        const echeanceFormatted = this.formatDate(dateEcheance);
        dateInfo.push(`<span class="date-echeance ${echeanceClass}" title="Échéance: ${echeanceFormatted}">
          <i class="bi bi-calendar-x"></i> ${echeanceText}
        </span>`);
      }
      
      if (dateInfo.length > 0) {
        datesElement = `<div class="dates-container">${dateInfo.join('')}</div>`;
      }
    }
    
    const hasEcheanceClass = dateEcheance ? 'has-echeance' : '';
    const hasDateDebutClass = dateDebut ? 'has-debut' : '';
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
    boardRecords.sort((a, b) => {
      const prioA = this.calculerPriorite(a.urgence, a.impact);
      const prioB = this.calculerPriorite(b.urgence, b.impact);
      if (prioA !== prioB) return prioA - prioB;
      return a.id - b.id;
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
      boardRecords.sort((a, b) => {
        const prioA = this.calculerPriorite(a.urgence, a.impact);
        const prioB = this.calculerPriorite(b.urgence, b.impact);
        if (prioA !== prioB) return prioA - prioB;
        return a.id - b.id;
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

  // === GESTION DES MODALS ===
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
    
    // Gérer la date d'échéance avec le nouveau gestionnaire
if (this.datePickerManager) {
  const normalizedDate = this.normalizeDate(tache.date_echeance);
  this.datePickerManager.setDate(normalizedDate);
  
  if (tache.date_echeance) {
    console.log('Date échéance:', {
      original: tache.date_echeance,
      type: typeof tache.date_echeance,
      normalized: normalizedDate
    });
  }
}
    
    this.displayDescriptionHistory(tache);
    this.modal.show();
  }

  openHistoryModal(task) {
    if (!task.historique_statuts) {
      alert('Pas d\'historique disponible pour cette tâche');
      return;
    }
    
    try {
      const historyData = JSON.parse(task.historique_statuts);
      const history = historyData.historique || [];
      
      const modalLabel = document.getElementById('history-modal-label');
      if (modalLabel) {
        modalLabel.innerHTML = `<i class="bi bi-clock-history me-2"></i>Historique : ${task.titre}`;
      }
      
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
      
      const commentsByStatus = this.getCommentsPerStatus(task);
      
      let timelineHTML = '';
      history.forEach((entry, index) => {
        const isCurrentStatus = index === history.length - 1 && !entry.date_sortie;
        const duration = entry.duree_minutes ? 
          `${Math.floor(entry.duree_minutes / 60)}h ${entry.duree_minutes % 60}m` : 
          'En cours...';
        
        const statusComments = commentsByStatus[entry.statut] || [];
        
        let commentsHTML = '';
        if (statusComments.length > 0) {
          commentsHTML = `
            <div class="timeline-comments">
              <div class="timeline-comments-title">
                <i class="bi bi-chat-text"></i>
                Commentaires (${statusComments.length})
              </div>
              ${statusComments.map(comment => `
                <div class="timeline-comment">
                  <div class="comment-timestamp">${comment.timestamp}</div>
                  <div class="comment-content">${comment.content}</div>
                </div>
              `).join('')}
            </div>
          `;
        }
        
        timelineHTML += `
          <div class="timeline-entry ${isCurrentStatus ? 'current' : ''}">
            <div class="timeline-status">
              ${entry.statut}
              ${isCurrentStatus ? '<span class="badge bg-success ms-2">En cours</span>' : ''}
            </div>
            <div class="timeline-dates">
              <i class="bi bi-calendar-event"></i>
              Du ${new Date(entry.date_entree).toLocaleString('fr-FR')}
              ${entry.date_sortie ? `au ${new Date(entry.date_sortie).toLocaleString('fr-FR')}` : '(en cours)'}
            </div>
            <div class="timeline-duration">
              <i class="bi bi-stopwatch"></i>
              Durée: ${duration}
            </div>
            ${entry.note ? `<div class="timeline-note"><i class="bi bi-info-circle me-1"></i>${entry.note}</div>` : ''}
            ${commentsHTML}
          </div>
        `;
      });
      
      const statsElement = document.getElementById('history-stats');
      const timelineElement = document.getElementById('history-timeline');
      
      if (statsElement) {
        statsElement.innerHTML = statsHTML;
      }
      
      if (timelineElement) {
        timelineElement.innerHTML = timelineHTML;
      }
      
      const exportBtn = document.getElementById('btn-export-task-history');
      if (exportBtn) {
        exportBtn.dataset.taskId = task.id;
      }
      
      const modalElement = document.getElementById('history-modal');
      if (modalElement) {
        new bootstrap.Modal(modalElement).show();
      }
      
    } catch (e) {
      console.error('Erreur lors de l\'ouverture de la modal:', e);
      alert('Erreur lors de l\'affichage de l\'historique');
    }
  }

  showAllComments(taskId) {
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task || !task.description) {
      alert('Pas de commentaires pour cette tâche');
      return;
    }
    
    const comments = this.getCommentsPerStatus(task);
    const allComments = [];
    
    Object.keys(comments).forEach(status => {
      comments[status].forEach(comment => {
        allComments.push({
          ...comment,
          status: status
        });
      });
    });
    
    allComments.sort((a, b) => b.date - a.date);
    
    if (allComments.length === 0) {
      alert('Aucun commentaire trouvé pour cette tâche');
      return;
    }
    
    let commentsHTML = '<div class="all-comments-container">';
    
    allComments.forEach(comment => {
      commentsHTML += `
        <div class="comment-item">
          <div class="comment-header">
            <span class="comment-status badge bg-primary">${comment.status}</span>
            <span class="comment-timestamp">${comment.timestamp}</span>
          </div>
          <div class="comment-content">${comment.content}</div>
        </div>
      `;
    });
    
    commentsHTML += '</div>';
    
    const timelineElement = document.getElementById('history-timeline');
    if (!timelineElement) return;
    
    const originalContent = timelineElement.innerHTML;
    
    timelineElement.innerHTML = `
      <div class="text-center mb-4">
        <h6><i class="bi bi-chat-square-text me-2"></i>Tous les commentaires (${allComments.length})</h6>
        <button class="btn btn-sm btn-outline-secondary" id="btn-back-to-timeline">
          <i class="bi bi-arrow-left me-1"></i>Retour à la timeline
        </button>
      </div>
      ${commentsHTML}
    `;
    
    const backBtn = document.getElementById('btn-back-to-timeline');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        timelineElement.innerHTML = originalContent;
      });
    }
  }

  showTaskHistory(taskId) {
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task) {
      console.error('Tâche non trouvée:', taskId);
      return;
    }
    
    this.logTaskHistory(task);
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
clearAllDates() {
  if (confirm('Supprimer toutes les dates butoir de toutes les tâches ?')) {
    this.currentRecords.forEach(async (record) => {
      if (record.date_echeance) {
        try {
          await grist.docApi.applyUserActions([
            ['UpdateRecord', TABLE_ID, record.id, { date_echeance: null }]
          ]);
          console.log(`Date supprimée pour tâche ${record.id}`);
        } catch (error) {
          console.error(`Erreur suppression date tâche ${record.id}:`, error);
        }
      }
    });
    
    setTimeout(() => {
      this.refreshKanban();
    }, 1000);
  }
}

// Fonction pour définir des dates par lot
bulkSetDates() {
  const days = prompt('Définir une échéance dans combien de jours pour toutes les tâches sélectionnées ?');
  if (days && !isNaN(days)) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    const dateStr = futureDate.toISOString().slice(0, 10);
    
    console.log(`Date calculée: ${dateStr} (dans ${days} jours)`);
    // Logique pour appliquer à des tâches sélectionnées
  }
}
  // === SAUVEGARDE ET GESTION DES DONNÉES ===
 // === 4. REMPLACEZ VOTRE saveTask PAR CELLE-CI ===
async saveTask() {
  try {
    const isNewTask = !this.currentTaskId;
    const existingRecord = isNewTask ? null : this.currentRecords.find(r => r.id === this.currentTaskId);
    
    // Préparer les données de dates
    let dateEcheance = null;
    let dateDebut = null;
    
    const dateFromPicker = this.datePickerManager ? this.datePickerManager.getDate() : null;
if (dateFromPicker && dateFromPicker.trim()) {
  dateEcheance = this.prepareDateForGrist ? this.prepareDateForGrist(dateFromPicker.trim()) : dateFromPicker.trim();

      
      if (!this.currentTaskId) {
        dateDebut = new Date().toISOString().slice(0,10);
      } else {
        const existingDateDebut = existingRecord?.date_debut;
        dateDebut = existingDateDebut ? (this.normalizeDate ? this.normalizeDate(existingDateDebut) : existingDateDebut) : null;
      }
    }
    
    // Récupérer les données du formulaire
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
    
    // Gestion description avec historique
    let finalDescription = newDescription;
    
    if (this.currentTaskId && existingRecord) {
      const currentDescription = existingRecord.description || '';
      // Utiliser la méthode d'historique si elle existe
      if (this.addTimestampToDescription) {
        finalDescription = this.addTimestampToDescription(currentDescription, newDescription, null);
      } else {
        finalDescription = newDescription;
      }
    } else if (newDescription && newDescription.trim()) {
      // Nouvelle tâche - timestamp simple
      const now = new Date().toLocaleString('fr-FR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      finalDescription = `[${now}]\n${newDescription.trim()}`;
    }
    
    // Préparer les données à sauvegarder
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

    // Ajouter les dates si les colonnes existent
    if (this.availableColumns.has('date_debut') && dateDebut !== null) {
      row.date_debut = dateDebut;
    }
    
    if (this.availableColumns.has('date_echeance') && dateEcheance !== null) {
      row.date_echeance = dateEcheance;
    }

    // Sauvegarder
    if (isNewTask) {
      const result = await grist.docApi.applyUserActions([
        ['AddRecord', TABLE_ID, null, row]
      ]);
      
      console.log('Nouvelle tâche créée avec succès');
      
      if (result && result[0] && result[0].id) {
        const newRecord = { id: result[0].id, ...row };
        this.currentRecords.push(newRecord);
        
        // Logger création
        await this.logUserAction(result[0].id, 'creation', '', titre, 'Tâche créée via Kanban');
      }
      
    } else {
      await grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, this.currentTaskId, row]
      ]);
      
      console.log(`Tâche ${this.currentTaskId} mise à jour avec succès`);
      
      // Logger modifications importantes
      if (existingRecord.titre !== titre) {
        await this.logUserAction(this.currentTaskId, 'title_change', existingRecord.titre, titre);
      }
      
      if (existingRecord.statut !== statut) {
        await this.logUserAction(this.currentTaskId, 'status_change', existingRecord.statut, statut);
      }
      
      // Mise à jour locale
      const recordIndex = this.currentRecords.findIndex(r => r.id === this.currentTaskId);
      if (recordIndex !== -1) {
        this.currentRecords[recordIndex] = { ...this.currentRecords[recordIndex], ...row };
      }
    }
    
    this.modal.hide();
    this.refreshKanban();
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    displayError(`Erreur: ${error.message}`);
  }
}
    // === MÉTHODE POUR VOIR LES ACTIONS (optionnelle) ===
// Méthode pour voir les actions utilisateur
async showUserActions(taskId = null) {
  try {
    const userActions = await grist.docApi.fetchTable(this.USER_ACTIONS_TABLE);
    
    if (!userActions || !userActions.id) {
      console.log('Pas d\'actions utilisateur disponibles');
      return;
    }
    
    const actions = this.mapGristRecords(userActions)
      .filter(action => !taskId || action.task_id === taskId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log('=== ACTIONS UTILISATEUR ===');
    if (taskId) {
      const task = this.currentRecords.find(r => r.id === taskId);
      console.log(`Tâche: ${task?.titre || taskId}`);
    }
    
    actions.forEach(action => {
      const date = new Date(action.timestamp).toLocaleString('fr-FR');
      console.log(`${date} - ${action.user_name || 'Système'}`);
      console.log(`  ${action.action_type}: ${action.old_value} → ${action.new_value}`);
      if (action.details) console.log(`  ${action.details}`);
      console.log('');
    });
    
  } catch (error) {
    console.warn('Impossible d\'afficher les actions:', error);
  }
}
  // Méthode de diagnostic
async diagnosticUserSystem() {
  console.log('=== DIAGNOSTIC SYSTÈME UTILISATEUR ===');
  
  try {
    const userActions = await grist.docApi.fetchTable(this.USER_ACTIONS_TABLE);
    console.log('✅ Table User_Actions accessible');
    console.log(`   Actions: ${userActions.id?.length || 0}`);
  } catch (e) {
    console.log('❌ Table User_Actions:', e.message);
  }
  
  const hasUserColumns = this.availableColumns.has('last_modified_by');
  console.log(`${hasUserColumns ? '✅' : '❌'} Colonnes utilisateur détectées`);
  
  if (this.currentRecords && hasUserColumns) {
    const users = [...new Set(this.currentRecords
      .map(r => r.last_modified_by)
      .filter(Boolean))];
    console.log('Utilisateurs actifs:', users);
  }
}
  

getHistoryColumnName() {
  const variants = [
    'historique_statuts',
    'historique _statuts',
    'historique__statuts'
  ];
  
  for (const variant of variants) {
    if (this.availableColumns.has(variant)) {
      return variant;
    }
  }
  return 'historique_statuts'; // Fallback
}
  
  async logUserAction(taskId, actionType, oldValue = '', newValue = '', details = '') {
    try {
      const actionRecord = {
        task_id: taskId,
        action_type: actionType,
        old_value: String(oldValue).substring(0, 500),
        new_value: String(newValue).substring(0, 500), 
        details: String(details).substring(0, 200)
        // user_name et timestamp sont automatiquement remplis par Grist
      };

      await grist.docApi.applyUserActions([
        ['AddRecord', this.USER_ACTIONS_TABLE, null, actionRecord]
      ]);

      console.log('Action loggée:', actionRecord);

    } catch (error) {
      console.warn('Erreur logging (non bloquante):', error);
      // Ne pas faire échouer l'opération principale
    }
  }
  // === 3. REMPLACEZ VOTRE handleDragEnd PAR CELLE-CI ===
async handleDragEnd(evt, targetStatus) {
  if (!evt.item || !evt.item.dataset) return;
  
  const id = parseInt(evt.item.dataset.id, 10);
  if (isNaN(id)) return;
  
  const record = this.currentRecords.find(r => r.id === id);
  if (!record) return;
  
  const newStatus = evt.to.dataset.status;
  const oldStatus = record.statut;
  
  if (oldStatus === newStatus) return;
  
  console.log(`Déplacement de la tâche ${id} de "${oldStatus}" vers "${newStatus}"`);
  
  try {
    const updateData = { statut: newStatus };
    
    // Historique si disponible
    const historyColumn = this.getHistoryColumnName ? this.getHistoryColumnName() : 'historique_statuts';
    if (this.availableColumns.has(historyColumn) && this.availableColumns.has('date_derniere_maj')) {
      const historyUpdate = this.updateStatusHistory(record, newStatus);
      Object.assign(updateData, historyUpdate);
    }
    
    await grist.docApi.applyUserActions([
      ['UpdateRecord', TABLE_ID, id, updateData]
    ]);
    
    console.log(`Tâche ${id} mise à jour avec succès`);
    
    // Logger l'action (utilisateur automatique via Grist)
    await this.logUserAction(id, 'status_change', oldStatus, newStatus, 'Drag & drop via Kanban');
    
    // Mise à jour locale
    const recordIndex = this.currentRecords.findIndex(r => r.id === id);
    if (recordIndex !== -1) {
      this.currentRecords[recordIndex] = { 
        ...this.currentRecords[recordIndex], 
        ...updateData 
      };
    }
    
    this.refreshKanban();
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    displayError(`Erreur: ${error.message}`);
    this.refreshKanban();
  }
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

  calculerPriorite(u, i) {
    const imp = String(i || '').trim().toLowerCase();
    const urg = String(u || '').trim().toLowerCase();
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }

  // === EXPORT ===
  exportHistoryData() {
    const exportData = this.currentRecords.map(task => {
      let history = [];
      try {
        if (task.historique_statuts) {
          const historyData = JSON.parse(task.historique_statuts);
          history = historyData.historique || [];
        }
      } catch (e) {
        console.warn(`Erreur parsing historique tâche ${task.id}:`, e);
      }
      
      return {
        id: task.id,
        titre: task.titre,
        projet: task.projet,
        statut_actuel: task.statut,
        historique: history,
        duree_totale_minutes: history.reduce((total, entry) => {
          return total + (entry.duree_minutes || 0);
        }, 0)
      };
    }).filter(task => task.historique.length > 0);
    
    console.log('Données d\'historique:', exportData);
    
    let csv = 'ID,Titre,Projet,Statut,Historique_Statut,Date_Entree,Date_Sortie,Duree_Minutes\n';
    
    exportData.forEach(task => {
      task.historique.forEach(entry => {
        csv += `${task.id},"${task.titre}","${task.projet}","${task.statut_actuel}","${entry.statut}","${entry.date_entree}","${entry.date_sortie || ''}",${entry.duree_minutes || ''}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_kanban_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

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

  // === GESTION GRIST ===
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

  // === INITIALISATIONS ===
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

    const updateSousObjectif = () => {
      const obj = selObj.value;
      const sousObj = [...new Set(STRATEGIES.filter(s => s.objectif === obj).map(s => s.sous_objectif))].filter(Boolean).sort();
      const selSous = document.getElementById('strategie-sous-objectif');
      selSous.innerHTML = sousObj.map(so => `<option value="${so}">${so}</option>`).join('');
      if (selected.sous_objectif) selSous.value = selected.sous_objectif;
      updateAction();
    };

    const updateAction = () => {
      const obj = selObj.value;
      const sousObj = document.getElementById('strategie-sous-objectif').value;
      const actions = [...new Set(STRATEGIES.filter(s => s.objectif === obj && s.sous_objectif === sousObj).map(s => s.action))].filter(Boolean).sort();
      const selAct = document.getElementById('strategie-action');
      selAct.innerHTML = actions.map(a => `<option value="${a}">${a}</option>`).join('');
      if (selected.action) selAct.value = selected.action;
    };

    selObj.onchange = updateSousObjectif;
    document.getElementById('strategie-sous-objectif').onchange = updateAction;

    updateSousObjectif();
  }

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
  // Détruire l'ancien gestionnaire s'il existe
  if (this.datePickerManager) {
    this.datePickerManager.destroy();
  }
  
  // Créer le nouveau gestionnaire
  this.datePickerManager = new DatePickerManager(this);
}
  initEventListeners() {
    document.getElementById('btn-save-task')?.addEventListener('click', () => this.saveTask());
    document.getElementById('btn-nouvelle-tache')?.addEventListener('click', () => this.openPopup());
    
    const btnDelete = document.getElementById('btn-delete-task');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        if (this.currentTaskId) {
          this.deleteTask(this.currentTaskId);
        }
      });
    }

    const btnExportHistory = document.getElementById('btn-export-history');
    if (btnExportHistory) {
      btnExportHistory.addEventListener('click', () => this.exportHistoryData());
    }
    
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

    // Event listeners pour l'historique
    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-history')) {
        e.stopPropagation();
        const taskId = parseInt(e.target.closest('.btn-history').dataset.taskId);
        if (taskId && !isNaN(taskId)) {
          this.showTaskHistory(taskId);
        }
      }
    });

    const exportBtn = document.getElementById('btn-export-task-history');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        const taskId = parseInt(e.target.dataset.taskId);
        if (taskId && !isNaN(taskId)) {
          this.exportSingleTaskHistory(taskId);
        }
      });
    }

    const commentsBtn = document.getElementById('btn-show-comments-only');
    if (commentsBtn) {
      commentsBtn.addEventListener('click', (e) => {
        const exportBtn = document.getElementById('btn-export-task-history');
        if (exportBtn && exportBtn.dataset.taskId) {
          const taskId = parseInt(exportBtn.dataset.taskId);
          if (taskId && !isNaN(taskId)) {
            this.showAllComments(taskId);
          }
        }
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

  // === FONCTIONS DE DEBUG ===
  debugDates(taskId) {
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task) {
      console.log('Tâche non trouvée');
      return;
    }
    
    console.log('=== DEBUG DATES ===');
    console.log('Tâche:', task.titre);
    console.log('date_debut original:', task.date_debut, typeof task.date_debut);
    console.log('date_echeance original:', task.date_echeance, typeof task.date_echeance);
    console.log('date_debut normalisé:', this.normalizeDate(task.date_debut));
    console.log('date_echeance normalisé:', this.normalizeDate(task.date_echeance));
    console.log('date_debut formaté:', this.formatDate(task.date_debut));
    console.log('date_echeance formaté:', this.formatDate(task.date_echeance));
  }

  showTaskCompleteReport(taskId) {
    const task = this.currentRecords.find(r => r.id === taskId);
    if (!task) return;
    
    console.log('=== RAPPORT COMPLET DE LA TÂCHE ===');
    console.log(`ID: ${task.id}`);
    console.log(`Titre: ${task.titre}`);
    console.log(`Statut actuel: ${task.statut}`);
    
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
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
  window.kanbanManager = new KanbanManager();
});
