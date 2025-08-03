// === renderers/CardRenderer.js ===
// Gestionnaire pour le rendu des cartes de tâches (style original restauré)

import { 
  generateBureauBadges, 
  generatePriorityBadge, 
  generateProjectBadge, 
  generateResponsablesBadges 
} from '../utils/badges.js';
import { generateDatesContainer } from '../utils/dates.js';
import { VIEW_MODES } from '../config/constants.js';

/**
 * Gestionnaire pour le rendu des cartes de tâches (style original restauré)
 */
export class CardRenderer {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
  }
  
  /**
   * Calcule la priorité d'une tâche (méthode originale)
   * @param {string} urgence - Niveau d'urgence
   * @param {string} impact - Niveau d'impact
   * @returns {number} Priorité (1-4)
   */
  calculatePriority(urgence, impact) {
    const imp = String(impact || '').trim().toLowerCase();
    const urg = String(urgence || '').trim().toLowerCase();
    
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }
  
  /**
   * Obtient les informations des stratégies multiples
   * @param {string} strategieId - IDs des stratégies (séparés par virgules)
   * @returns {Array} Informations des stratégies
   */
  getMultipleStrategiesInfo(strategieId) {
    if (!strategieId || !this.kanban.strategyData) return [];
    
    const ids = String(strategieId).split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    return ids.map(id => this.kanban.strategyData.find(s => s.id === id)).filter(Boolean);
  }
  
  /**
   * Génère le bouton timeline
   * @param {object} record - Données de la tâche
   * @returns {string} HTML du bouton timeline
   */
  generateTimelineButton(record) {
    // Compter les événements depuis les notes JSON
    let notesEventCount = 0;
    if (record.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData && notesData.history && Array.isArray(notesData.history)) {
          notesEventCount = notesData.history.length;
        }
      } catch (e) {
        notesEventCount = 0;
      }
    }
    
    const totalEvents = notesEventCount;
    
    if (totalEvents === 0) {
      return `<button class="btn btn-sm timeline-btn" 
                      data-task-id="${record.id}" 
                      title="Aucun événement"
                      style="border: none; background: none; color: #6c757d;">
                <i class="bi bi-clock-history"></i>
              </button>`;
    }
    
    return `<button class="btn btn-sm timeline-btn" 
                    data-task-id="${record.id}" 
                    title="${totalEvents} événement${totalEvents > 1 ? 's' : ''}"
                    style="border: none; background: none; color: #0dcaf0;">
              <i class="bi bi-clock-history"></i>
            </button>`;
  }
  
  /**
   * Rend une carte de tâche selon le style original
   * @param {object} record - Données de la tâche
   * @param {string} viewMode - Mode de vue (compact, detailed, focus)
   * @returns {string} HTML de la carte
   */
  renderTaskCard(record, viewMode = VIEW_MODES.COMPACT) {
    if (!record?.id) {
      console.warn('CardRenderer: record sans ID', record);
      return '';
    }
    
    console.log(`Création HTML pour tâche ${record.id}: ${record.titre}`);
    
    const priority = this.calculatePriority(record.urgence, record.impact);
    const priorityBadge = generatePriorityBadge(priority);
    
    // Stratégies multiples avec tooltip
    const strategiesInfo = this.getMultipleStrategiesInfo(record.strategie_id);
    
    // Vérifier aussi s'il y a des champs de stratégie directement dans le record
    const hasStrategy = strategiesInfo.length > 0 || 
                       record.strategie_objectif || 
                       record.strategie_sous_objectif || 
                       record.strategie_action;
    
    const strategiesText = strategiesInfo.length > 0 
      ? strategiesInfo.map(s => `• ${s.objectif}`).join('\\n')
      : '';
    const strategyTooltip = strategiesText ? 
      `title="${strategiesInfo.length} stratégie${strategiesInfo.length > 1 ? 's' : ''} liée${strategiesInfo.length > 1 ? 's' : ''}"` : 
      (hasStrategy ? 'title="Stratégie associée"' : '');
    const strategyIcon = hasStrategy ? 
      `<i class="bi bi-crosshair strategie-icon" ${strategyTooltip} style="font-size: 1.1em; color: #28a745;"></i>` : '';

    // Projet
    const projectBadge = record.projet ? 
      generateProjectBadge({
        projet: record.projet,
        strategie_objectif: strategiesInfo[0]?.objectif,
        strategie_sous_objectif: strategiesInfo[0]?.sous_objectif,
        strategie_action: strategiesInfo[0]?.action
      }) : '';

    // Description résumée depuis notes.content
    let resumeDesc = '';
    if (record.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData && notesData.content) {
          const content = notesData.content.substring(0, 80);
          resumeDesc = `<div class="desc-resume">${content}${notesData.content.length > 80 ? '…' : ''}</div>`;
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }
    
    // Dates
    const datesElement = generateDatesContainer({
      date_debut: record.date_debut,
      date_echeance: record.date_echeance
    }, viewMode === VIEW_MODES.COMPACT);
    
    // Badges bureaux
    const bureauBadges = generateBureauBadges(record.bureau, viewMode === VIEW_MODES.COMPACT);
    
    // Badges responsables
    const responsablesBadges = generateResponsablesBadges(record.qui);
    
    // Timeline button
    const timelineButton = this.generateTimelineButton(record);
    
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    const hasDateDebutClass = record.date_debut ? 'has-debut' : '';
    
    // Classe selon le mode de vue
    const cardClass = viewMode === VIEW_MODES.COMPACT ? 'kanban-item-compact' : 'kanban-item';
    
    return `<div class="kanban-item ${cardClass} ${hasEcheanceClass} ${hasDateDebutClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      
      ${bureauBadges}
      
      <div class="kanban-item-header">
        <div class="priority-section">
          ${priorityBadge}
          ${strategyIcon}
        </div>
        <div class="item-badges">
          ${projectBadge}
          ${timelineButton}
        </div>
      </div>
      
      <div class="item-title editable-zone">${record.titre || 'Sans titre'}</div>
      
      ${resumeDesc}
      
      ${datesElement}
      
      ${responsablesBadges}
    </div>`;
  }
  
  /**
   * Attache les écouteurs d'événements pour les cartes
   * @param {HTMLElement} container - Container des cartes
   */
  attachCardEventListeners(container) {
    // Événements pour les zones éditables (pour ouvrir le modal)
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
    });
    
    // Événements pour les boutons timeline
    container.querySelectorAll('.timeline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const taskId = parseInt(btn.dataset.taskId, 10);
        if (!isNaN(taskId)) {
          const task = this.kanban.currentRecords?.find(r => r.id === taskId);
          if (task) {
            // Ouvrir la timeline pour cette tâche
            window.open(`timeline.html?task=${taskId}`, '_blank');
          }
        }
      });
    });
    
    // Écouteurs pour l'accessibilité (navigation clavier)
    container.querySelectorAll('.kanban-item').forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const editableZone = card.querySelector('.editable-zone');
          if (editableZone) {
            editableZone.click();
          }
        }
      });
    });
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    console.log('CardRenderer: Ressources nettoyées');
  }
}