// === History App ===
// Application d'historique des modifications pour le Kanban SSIR

import { 
  STATUTS, 
  DEFAULT_BUREAUX, 
  DEFAULT_RESPONSABLES, 
  TABLE_ID
} from './config/constants.js';

import { generateSingleBureauBadge } from './utils/badges.js';

class HistoryAppManager {
  constructor() {
    this.tasks = [];
    this.modifications = [];
    this.filteredModifications = [];
    this.users = new Set();
    
    this.init();
  }

  async init() {
    try {
      await this.waitForGristReady();
      await this.loadTasks();
      this.parseModifications();
      this.generateMetrics();
      this.renderHistory();
      this.setupFilters();
      
    } catch (error) {
      console.error('❌ Erreur initialisation history:', error);
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

  async loadTasks() {
    try {
      const records = await grist.docApi.fetchTable(TABLE_ID);
      this.tasks = this.mapGristRecords(records);
      
      console.log(`✅ ${this.tasks.length} tâches chargées pour l'historique`);
      
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

  parseModifications() {
    this.modifications = [];
    
    this.tasks.forEach(task => {
      // Extraire les modifications depuis le champ notes (JSON)
      if (task.notes) {
        try {
          const notesData = typeof task.notes === 'string' 
            ? JSON.parse(task.notes) 
            : task.notes;
          
          if (notesData && notesData.history && Array.isArray(notesData.history)) {
            notesData.history.forEach(entry => {
              this.modifications.push({
                taskId: task.id,
                taskTitle: task.titre || 'Sans titre',
                taskBureau: task.bureau,
                timestamp: new Date(entry.timestamp),
                user: entry.user || 'Utilisateur inconnu',
                changeType: this.getChangeType(entry),
                oldValue: entry.oldValue,
                newValue: entry.newValue,
                field: entry.field || 'Contenu',
                entry: entry
              });
              
              // Collecter les utilisateurs
              if (entry.user) {
                this.users.add(entry.user);
              }
            });
          }
        } catch (e) {
          console.warn('Erreur parsing notes pour task', task.id, ':', e);
        }
      }
      
      // Ajouter modification pour date de dernière MAJ si disponible
      if (task.date_derniere_maj) {
        this.modifications.push({
          taskId: task.id,
          taskTitle: task.titre || 'Sans titre',
          taskBureau: task.bureau,
          timestamp: new Date(task.date_derniere_maj),
          user: 'Système',
          changeType: 'update',
          oldValue: null,
          newValue: null,
          field: 'Dernière modification',
          entry: null
        });
      }
    });
    
    // Trier par date décroissante (plus récent en premier)
    this.modifications.sort((a, b) => b.timestamp - a.timestamp);
    this.filteredModifications = [...this.modifications];
    
    console.log(`📋 ${this.modifications.length} modifications trouvées`);
  }

  getChangeType(entry) {
    if (!entry.field) return 'content';
    
    const field = entry.field.toLowerCase();
    
    if (field.includes('statut')) return 'status';
    if (field.includes('qui') || field.includes('bureau') || field.includes('responsable')) return 'assignment';
    if (field.includes('creation') || field.includes('créé')) return 'creation';
    
    return 'content';
  }

  generateMetrics() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const todayChanges = this.modifications.filter(m => m.timestamp >= startOfDay).length;
    const weekChanges = this.modifications.filter(m => m.timestamp >= startOfWeek).length;
    
    document.getElementById('today-changes').textContent = todayChanges;
    document.getElementById('week-changes').textContent = weekChanges;
    document.getElementById('active-users').textContent = this.users.size;
    document.getElementById('total-changes').textContent = this.modifications.length;
  }

  setupFilters() {
    // Remplir le filtre utilisateurs
    const userFilter = document.getElementById('user-filter');
    Array.from(this.users).sort().forEach(user => {
      const option = document.createElement('option');
      option.value = user;
      option.textContent = user;
      userFilter.appendChild(option);
    });
    
    // Event listeners pour les filtres
    document.getElementById('period-filter').addEventListener('change', () => this.applyFilters());
    document.getElementById('change-type-filter').addEventListener('change', () => this.applyFilters());
    document.getElementById('user-filter').addEventListener('change', () => this.applyFilters());
    document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
  }

  applyFilters() {
    const periodFilter = document.getElementById('period-filter').value;
    const typeFilter = document.getElementById('change-type-filter').value;
    const userFilter = document.getElementById('user-filter').value;
    
    this.filteredModifications = this.modifications.filter(mod => {
      // Filtre période
      if (periodFilter !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (periodFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        
        if (mod.timestamp < startDate) return false;
      }
      
      // Filtre type
      if (typeFilter !== 'all' && mod.changeType !== typeFilter) {
        return false;
      }
      
      // Filtre utilisateur
      if (userFilter !== 'all' && mod.user !== userFilter) {
        return false;
      }
      
      return true;
    });
    
    this.renderHistory();
  }

  renderHistory() {
    const container = document.getElementById('history-list');
    
    if (this.filteredModifications.length === 0) {
      container.innerHTML = `
        <div class="text-center p-4 text-muted">
          <i class="bi bi-inbox display-4"></i>
          <p class="mt-2">Aucune modification trouvée avec les filtres actuels</p>
        </div>
      `;
      return;
    }
    
    const groupedByDate = this.groupModificationsByDate(this.filteredModifications);
    
    let html = '';
    
    Object.entries(groupedByDate).forEach(([dateKey, modifications]) => {
      html += `
        <div class="border-bottom">
          <div class="bg-light px-3 py-2">
            <h6 class="mb-0 text-muted">
              <i class="bi bi-calendar3 me-2"></i>
              ${this.formatDateHeader(dateKey)}
              <span class="badge bg-secondary ms-2">${modifications.length}</span>
            </h6>
          </div>
          <div class="p-3">
      `;
      
      modifications.forEach(mod => {
        html += this.renderModificationItem(mod);
      });
      
      html += '</div></div>';
    });
    
    container.innerHTML = html;
  }

  groupModificationsByDate(modifications) {
    const groups = {};
    
    modifications.forEach(mod => {
      const dateKey = mod.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(mod);
    });
    
    return groups;
  }

  formatDateHeader(dateKey) {
    const date = new Date(dateKey);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    
    if (date.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (date.getTime() === yesterday.getTime()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }

  renderModificationItem(mod) {
    const timeString = mod.timestamp.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const typeClass = this.getTypeClass(mod.changeType);
    const typeIcon = this.getTypeIcon(mod.changeType);
    const typeLabel = this.getTypeLabel(mod.changeType);
    
    // Badges bureau
    const bureaux = this.parseMultipleValues(mod.taskBureau);
    const bureauxBadges = bureaux.map(bureau => 
      generateSingleBureauBadge(bureau, true)
    ).join(' ');
    
    let changeDetails = '';
    if (mod.oldValue !== null && mod.newValue !== null) {
      changeDetails = `
        <div class="change-details">
          <strong>${mod.field}:</strong>
          <span class="old-value">${mod.oldValue || 'Vide'}</span>
          →
          <span class="new-value">${mod.newValue || 'Vide'}</span>
        </div>
      `;
    }
    
    return `
      <div class="d-flex align-items-start mb-3 pb-3 border-bottom border-light">
        <div class="flex-shrink-0 me-3">
          <span class="time-badge badge bg-light text-dark">${timeString}</span>
        </div>
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-2">
            <span class="change-type ${typeClass} me-2">
              <i class="${typeIcon} me-1"></i>
              ${typeLabel}
            </span>
            <span class="badge bg-primary me-2">${mod.user}</span>
            ${bureauxBadges}
          </div>
          <div class="task-title mb-1">
            ${mod.taskTitle}
            <small class="text-muted">(#${mod.taskId})</small>
          </div>
          ${changeDetails}
        </div>
      </div>
    `;
  }

  getTypeClass(type) {
    switch (type) {
      case 'status': return 'bg-info text-white';
      case 'assignment': return 'bg-warning text-dark';
      case 'content': return 'bg-secondary text-white';
      case 'creation': return 'bg-success text-white';
      default: return 'bg-light text-dark';
    }
  }

  getTypeIcon(type) {
    switch (type) {
      case 'status': return 'bi bi-arrow-right-circle';
      case 'assignment': return 'bi bi-person-check';
      case 'content': return 'bi bi-pencil';
      case 'creation': return 'bi bi-plus-circle';
      default: return 'bi bi-circle';
    }
  }

  getTypeLabel(type) {
    switch (type) {
      case 'status': return 'Statut';
      case 'assignment': return 'Affectation';
      case 'content': return 'Contenu';
      case 'creation': return 'Création';
      default: return 'Modification';
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

  async refresh() {
    const refreshBtn = document.getElementById('refresh-btn');
    const originalContent = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>Actualisation...';
    refreshBtn.disabled = true;
    
    try {
      await this.loadTasks();
      this.parseModifications();
      this.generateMetrics();
      this.applyFilters(); // Réappliquer les filtres actuels
    } catch (error) {
      console.error('Erreur lors de l\'actualisation:', error);
      this.showError('Erreur lors de l\'actualisation');
    } finally {
      refreshBtn.innerHTML = originalContent;
      refreshBtn.disabled = false;
    }
  }

  showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger alert-dismissible fade show';
      errorDiv.innerHTML = `
        <strong>Erreur History:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      errorContainer.appendChild(errorDiv);
    }
  }
}

// 🔧 CORRECTION: Réutiliser le HistoryManager du KanbanManager principal
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que le KanbanManager principal soit disponible
  if (window.kanbanManager && window.kanbanManager.historyManager) {
    console.log('♻️ Réutilisation du HistoryManager existant');
    // Le HistoryManager est déjà initialisé par KanbanManager
  } else {
    console.warn('⚠️ KanbanManager non trouvé, création standalone');
    new HistoryAppManager();
  }
});