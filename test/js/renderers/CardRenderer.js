// === renderers/CardRenderer.js ===
// Gestionnaire pour le rendu des cartes de tâches

import { generateAllTaskBadges } from '../utils/badges.js';
import { generateDatesContainer } from '../utils/dates.js';
import { VIEW_MODES } from '../config/constants.js';

/**
 * Gestionnaire pour le rendu des cartes de tâches
 */
export class CardRenderer {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.expandedCards = new Set();
  }
  
  /**
   * Rend une carte de tâche selon le mode de vue
   * @param {object} record - Données de la tâche
   * @param {string} viewMode - Mode de vue (compact, detailed, focus)
   * @returns {string} HTML de la carte
   */
  renderTaskCard(record, viewMode = VIEW_MODES.COMPACT) {
    if (!record || !record.id) {
      console.warn('CardRenderer: Données de tâche invalides');
      return '';
    }
    
    const isExpanded = this.expandedCards.has(record.id);
    
    // Décider du rendu selon le mode et l'état d'expansion
    if (viewMode === VIEW_MODES.COMPACT && !isExpanded) {
      return this.renderCompactCard(record);
    } else {
      return this.renderDetailedCard(record, viewMode, isExpanded);
    }
  }
  
  /**
   * Rend une carte en mode compact
   * @param {object} record - Données de la tâche
   * @returns {string} HTML de la carte compacte
   */
  renderCompactCard(record) {
    const priority = this.calculatePriority(record.urgence, record.impact);
    const badges = generateAllTaskBadges({
      ...record,
      priority: priority
    }, true);
    
    // Générer l'élément d'échéance pour le mode compact
    const echeanceElement = generateDatesContainer({
      date_echeance: record.date_echeance
    }, true);
    
    // Classes CSS pour les bordures d'échéance
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    const urgencyClass = this.getUrgencyClass(record.date_echeance);
    
    return `
      <div class="kanban-item kanban-item-compact ${hasEcheanceClass} ${urgencyClass}" 
           data-id="${record.id}" 
           data-priority="${priority}"
           data-status="${record.statut || ''}"
           role="button" 
           tabindex="0"
           aria-label="Tâche: ${record.titre || 'Sans titre'}">
        
        <!-- Handle de drag & drop -->
        <div class="drag-handle" title="Glisser pour déplacer">
          <i class="bi bi-grip-vertical"></i>
        </div>
        
        <!-- Badges des bureaux -->
        ${badges.bureaux}
        
        <!-- Header avec priorité, échéance et bouton expand -->
        <div class="compact-header">
          <div class="compact-priority">${badges.priority}</div>
          <div class="compact-echeance">${echeanceElement}</div>
          <button class="btn-expand" title="Voir les détails" aria-label="Développer la tâche">
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>
        
        <!-- Titre de la tâche -->
        <div class="compact-title editable-zone" title="${record.titre || ''}">${this.truncateText(record.titre || 'Sans titre', 50)}</div>
        
        <!-- Indicateurs visuels cachés (pour les lecteurs d'écran) -->
        <div class="sr-only">
          Statut: ${record.statut || 'Non défini'}
          ${record.projet ? `Projet: ${record.projet}` : ''}
          ${record.date_echeance ? `Échéance: ${record.date_echeance}` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Rend une carte en mode détaillé
   * @param {object} record - Données de la tâche
   * @param {string} viewMode - Mode de vue
   * @param {boolean} isExpanded - Si la carte est expandée (pour mode compact)
   * @returns {string} HTML de la carte détaillée
   */
  renderDetailedCard(record, viewMode, isExpanded = false) {
    const priority = this.calculatePriority(record.urgence, record.impact);
    const badges = generateAllTaskBadges({
      ...record,
      priority: priority
    }, false);
    
    // Résumé de description
    const resumeDesc = this.generateDescriptionResume(record);
    
    // Container des dates
    const datesElement = generateDatesContainer({
      date_debut: record.date_debut,
      date_echeance: record.date_echeance
    }, false);
    
    // Classes CSS
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    const hasDateDebutClass = record.date_debut ? 'has-debut' : '';
    const urgencyClass = this.getUrgencyClass(record.date_echeance);
    
    // Bouton collapse pour les cartes expandées en mode compact
    const collapseButton = (viewMode === VIEW_MODES.COMPACT && isExpanded) ? 
      `<button class="btn-collapse" title="Réduire" aria-label="Réduire la tâche">
        <i class="bi bi-chevron-up"></i>
      </button>` : '';
    
    // Indicateurs de progression si disponibles
    const progressIndicators = this.generateProgressIndicators(record);
    
    return `
      <div class="kanban-item kanban-item-detailed ${hasEcheanceClass} ${hasDateDebutClass} ${urgencyClass}" 
           data-id="${record.id}" 
           data-priority="${priority}"
           data-status="${record.statut || ''}"
           role="button" 
           tabindex="0"
           aria-label="Tâche: ${record.titre || 'Sans titre'}">
        
        <!-- Handle de drag & drop -->
        <div class="drag-handle" title="Glisser pour déplacer">
          <i class="bi bi-grip-vertical"></i>
        </div>
        
        <!-- Badges des bureaux -->
        ${badges.bureaux}
        
        <!-- Header avec priorité et actions -->
        <div class="kanban-item-header">
          <div class="priority-section">${badges.priority}</div>
          <div class="item-badges">
            ${badges.project}
            ${badges.history}
            ${collapseButton}
          </div>
        </div>
        
        <!-- Titre de la tâche -->
        <div class="item-title editable-zone" title="${record.titre || ''}">${record.titre || 'Sans titre'}</div>
        
        <!-- Résumé de description -->
        ${resumeDesc}
        
        <!-- Dates et échéances -->
        ${datesElement}
        
        <!-- Badges responsables -->
        ${badges.responsables}
        
        <!-- Indicateurs de progression -->
        ${progressIndicators}
        
        <!-- Informations cachées pour accessibilité -->
        <div class="sr-only">
          ID: ${record.id}
          Statut: ${record.statut || 'Non défini'}
          ${record.urgence ? `Urgence: ${record.urgence}` : ''}
          ${record.impact ? `Impact: ${record.impact}` : ''}
          ${record.projet ? `Projet: ${record.projet}` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Calcule la priorité d'une tâche
   * @param {string} urgence - Niveau d'urgence
   * @param {string} impact - Niveau d'impact
   * @returns {number} Niveau de priorité (1-4)
   */
  calculatePriority(urgence, impact) {
    const imp = String(impact || '').trim().toLowerCase();
    const urg = String(urgence || '').trim().toLowerCase();
    
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3; // Priorité par défaut
  }
  
  /**
   * Génère le résumé de description
   * @param {object} record - Données de la tâche
   * @returns {string} HTML du résumé
   */
  generateDescriptionResume(record) {
    let latestDesc = '';
    
    // Utiliser UNIQUEMENT notes.content (synchronisé avec le dernier commentaire)
    if (record.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData && notesData.content) {
          latestDesc = notesData.content;
        }
      } catch (error) {
        console.warn('CardRenderer: Error parsing notes JSON for record', record.id);
        return '';
      }
    }
    
    if (!latestDesc || !latestDesc.trim()) {
      return '';
    }
    
    // Tronquer à 12 mots pour le résumé
    const mots = latestDesc.split(/\s+/).slice(0, 12);
    const resume = mots.join(' ');
    const isTruncated = latestDesc.split(/\s+/).length > 12;
    
    return `
      <div class="desc-resume" title="${latestDesc.replace(/"/g, '&quot;')}">
        ${resume}${isTruncated ? '…' : ''}
      </div>
    `;
  }
  
  /**
   * Génère les indicateurs de progression
   * @param {object} record - Données de la tâche
   * @returns {string} HTML des indicateurs
   */
  generateProgressIndicators(record) {
    const indicators = [];
    
    // Indicateur de tâche récente (créée il y a moins de 24h)
    if (this.isRecentTask(record)) {
      indicators.push('<span class="badge bg-success badge-sm" title="Tâche récente">Nouveau</span>');
    }
    
    // Indicateur de tâche mise à jour récemment
    if (this.isRecentlyUpdated(record)) {
      indicators.push('<span class="badge bg-info badge-sm" title="Mise à jour récente">MAJ</span>');
    }
    
    // Indicateur de tâche bloquée depuis longtemps
    if (record.statut === 'Bloqué' && this.isLongBlocked(record)) {
      indicators.push('<span class="badge bg-warning badge-sm" title="Bloqué depuis longtemps">⚠️</span>');
    }
    
    // Indicateur de tâche en retard
    if (this.isOverdue(record)) {
      indicators.push('<span class="badge bg-danger badge-sm" title="En retard">Retard</span>');
    }
    
    if (indicators.length === 0) return '';
    
    return `
      <div class="progress-indicators mt-2">
        ${indicators.join(' ')}
      </div>
    `;
  }
  
  /**
   * Détermine la classe CSS d'urgence selon l'échéance
   * @param {string} dateEcheance - Date d'échéance
   * @returns {string} Classe CSS
   */
  getUrgencyClass(dateEcheance) {
    if (!dateEcheance) return '';
    
    const today = new Date();
    const echeance = new Date(dateEcheance);
    const diffDays = Math.ceil((echeance - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'card-overdue';
    if (diffDays === 0) return 'card-due-today';
    if (diffDays <= 3) return 'card-due-soon';
    if (diffDays <= 7) return 'card-due-week';
    
    return '';
  }
  
  /**
   * Tronque un texte à une longueur donnée
   * @param {string} text - Texte à tronquer
   * @param {number} maxLength - Longueur maximale
   * @returns {string} Texte tronqué
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 1) + '…';
  }
  
  /**
   * Vérifie si une tâche est récente (moins de 24h)
   * @param {object} record - Données de la tâche
   * @returns {boolean} True si récente
   */
  isRecentTask(record) {
    if (!record.date_creation && !record.id) return false;
    
    // Si on a une date de création
    if (record.date_creation) {
      const creation = new Date(record.date_creation);
      const now = new Date();
      return (now - creation) < (24 * 60 * 60 * 1000); // 24h en ms
    }
    
    // Fallback: considérer les IDs élevés comme récents (approximation)
    if (record.id && this.kanban.currentRecords) {
      const maxId = Math.max(...this.kanban.currentRecords.map(r => r.id));
      return record.id > (maxId - 5); // 5 dernières tâches créées
    }
    
    return false;
  }
  
  /**
   * Vérifie si une tâche a été mise à jour récemment
   * @param {object} record - Données de la tâche
   * @returns {boolean} True si mise à jour récemment
   */
  isRecentlyUpdated(record) {
    if (!record.date_derniere_maj) return false;
    
    const lastUpdate = new Date(record.date_derniere_maj);
    const now = new Date();
    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
    
    return diffHours < 4; // Mise à jour dans les 4 dernières heures
  }
  
  /**
   * Vérifie si une tâche est bloquée depuis longtemps
   * @param {object} record - Données de la tâche
   * @returns {boolean} True si bloquée depuis longtemps
   */
  isLongBlocked(record) {
    if (record.statut !== 'Bloqué') return false;
    
    // Analyser l'historique pour voir depuis quand elle est bloquée
    if (record.historique_statuts) {
      try {
        const history = JSON.parse(record.historique_statuts);
        if (history.historique && history.historique.length > 0) {
          const lastEntry = history.historique[history.historique.length - 1];
          if (lastEntry.statut === 'Bloqué' && lastEntry.date_entree) {
            const blockedSince = new Date(lastEntry.date_entree);
            const now = new Date();
            const diffDays = (now - blockedSince) / (1000 * 60 * 60 * 24);
            return diffDays > 3; // Bloqué depuis plus de 3 jours
          }
        }
      } catch (e) {
        // Ignore les erreurs de parsing
      }
    }
    
    return false;
  }
  
  /**
   * Vérifie si une tâche est en retard
   * @param {object} record - Données de la tâche
   * @returns {boolean} True si en retard
   */
  isOverdue(record) {
    if (!record.date_echeance || record.statut === 'Terminé') return false;
    
    const today = new Date();
    const echeance = new Date(record.date_echeance);
    today.setHours(0, 0, 0, 0);
    echeance.setHours(0, 0, 0, 0);
    
    return echeance < today;
  }
  
  /**
   * Attache les écouteurs d'événements aux cartes rendues
   * @param {HTMLElement} container - Container des cartes
   */
  attachCardEventListeners(container) {
    if (!container) return;
    
    // Écouteurs pour l'édition des tâches
    container.querySelectorAll('.editable-zone').forEach(zone => {
      zone.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const card = zone.closest('.kanban-item');
        const taskId = parseInt(card.dataset.id, 10);
        
        if (!isNaN(taskId) && this.kanban.modalManager) {
          const task = this.kanban.currentRecords?.find(r => r.id === taskId);
          if (task) {
            this.kanban.modalManager.openTaskModal(task);
          }
        }
      });
      
      // Support clavier
      zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          zone.click();
        }
      });
    });
    
    // Écouteurs pour les boutons expand/collapse
    container.querySelectorAll('.btn-expand').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const card = btn.closest('.kanban-item');
        const taskId = parseInt(card.dataset.id, 10);
        
        if (!isNaN(taskId)) {
          this.expandCard(taskId);
        }
      });
    });
    
    container.querySelectorAll('.btn-collapse').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const card = btn.closest('.kanban-item');
        const taskId = parseInt(card.dataset.id, 10);
        
        if (!isNaN(taskId)) {
          this.collapseCard(taskId);
        }
      });
    });
    
    // Écouteurs pour les boutons d'historique
    container.querySelectorAll('.btn-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const taskId = parseInt(btn.dataset.taskId, 10);
        
        if (!isNaN(taskId) && this.kanban.historyManager) {
          this.kanban.historyManager.openTaskHistory(taskId);
        }
      });
    });
  }
  
  /**
   * Expand une carte
   * @param {number} taskId - ID de la tâche
   */
  expandCard(taskId) {
    this.expandedCards.add(taskId);
    this.refreshCard(taskId);
  }
  
  /**
   * Collapse une carte
   * @param {number} taskId - ID de la tâche
   */
  collapseCard(taskId) {
    this.expandedCards.delete(taskId);
    this.refreshCard(taskId);
  }
  
  /**
   * Rafraîchit une carte spécifique
   * @param {number} taskId - ID de la tâche
   */
  refreshCard(taskId) {
    if (this.kanban.refreshKanban) {
      this.kanban.refreshKanban();
    }
  }
  
  /**
   * Obtient l'état d'expansion d'une carte
   * @param {number} taskId - ID de la tâche
   * @returns {boolean} True si expandée
   */
  isCardExpanded(taskId) {
    return this.expandedCards.has(taskId);
  }
  
  /**
   * Réinitialise l'état d'expansion de toutes les cartes
   */
  clearExpandedCards() {
    this.expandedCards.clear();
  }
  
  /**
   * Exporte l'état du renderer
   * @returns {object} État du renderer
   */
  exportState() {
    return {
      expandedCards: Array.from(this.expandedCards),
      timestamp: Date.now()
    };
  }
  
  /**
   * Importe un état du renderer
   * @param {object} state - État à importer
   */
  importState(state) {
    if (state && Array.isArray(state.expandedCards)) {
      this.expandedCards = new Set(state.expandedCards);
    }
  }
}