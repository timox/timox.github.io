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
          ${this.generateReferenceIcon(record, viewMode)}
          ${this.generateJalonIcon(record, viewMode)}
        </div>
        <div class="item-badges">
          ${projectBadge}
          ${timelineButton}
        </div>
      </div>
      
      <div class="item-title editable-zone">${record.titre || 'Sans titre'}</div>
      
      ${this.generateExpandedContent(record, viewMode)}
      
      ${resumeDesc}
      
      ${datesElement}
      
      ${viewMode !== VIEW_MODES.COMPACT ? responsablesBadges : ''}
    </div>`;
  }
  
  /**
   * Génère l'icône de référence pour une tâche
   * @param {object} record - Données de la tâche
   * @param {string} viewMode - Mode de vue
   * @returns {string} HTML de l'icône de référence
   */
  generateReferenceIcon(record, viewMode) {
    if (viewMode === VIEW_MODES.COMPACT) return '';
    
    // Vérifier s'il y a des références (chemins réseau, liens, etc.)
    const hasReference = record.notes && (
      record.notes.includes('\\\\') || 
      record.notes.includes('http') ||
      record.notes.includes('file://')  ||
      record.notes.includes('C:') ||
      record.notes.includes('D:')
    );
    
    if (!hasReference) return '';
    
    const tooltip = viewMode === VIEW_MODES.FOCUS ? 
      'title="Contient des références - cliquer pour voir le détail"' : 
      'title="Contient des références"';
      
    return `<i class="bi bi-link-45deg reference-icon" ${tooltip} style="font-size: 1.1em; color: #6f42c1;"></i>`;
  }

  /**
   * Génère l'icône de jalon pour une tâche
   * @param {object} record - Données de la tâche
   * @param {string} viewMode - Mode de vue
   * @returns {string} HTML de l'icône de jalon
   */
  generateJalonIcon(record, viewMode) {
    if (viewMode === VIEW_MODES.COMPACT) return '';
    
    // Vérifier s'il y a des jalons
    const hasJalons = record.jalons && record.jalons !== '[]' && record.jalons.trim() !== '';
    
    if (!hasJalons) return '';
    
    let jalonCount = 0;
    try {
      const jalons = JSON.parse(record.jalons);
      jalonCount = Array.isArray(jalons) ? jalons.length : 0;
    } catch {
      jalonCount = 1; // Assume au moins un jalon si pas JSON
    }
    
    const tooltip = viewMode === VIEW_MODES.FOCUS ? 
      `title="${jalonCount} jalon${jalonCount > 1 ? 's' : ''} planifié${jalonCount > 1 ? 's' : ''} - cliquer pour voir"` : 
      `title="${jalonCount} jalon${jalonCount > 1 ? 's' : ''}"`;
      
    return `<i class="bi bi-calendar-event jalon-icon" ${tooltip} style="font-size: 1.1em; color: #fd7e14;"></i>`;
  }

  /**
   * Génère le contenu étendu selon le mode de vue
   * @param {object} record - Données de la tâche
   * @param {string} viewMode - Mode de vue
   * @returns {string} HTML du contenu étendu
   */
  generateExpandedContent(record, viewMode) {
    if (viewMode !== VIEW_MODES.FOCUS) return '';
    
    let expandedContent = '';
    
    // Stratégies détaillées
    const strategiesInfo = this.getMultipleStrategiesInfo(record.strategie_id);
    if (strategiesInfo.length > 0) {
      expandedContent += `
        <div class="expanded-strategies">
          <h6><i class="bi bi-crosshair me-1"></i>Stratégies:</h6>
          <ul class="list-unstyled ms-3">
            ${strategiesInfo.map(s => `<li>• ${s.objectif} → ${s.action}</li>`).join('')}
          </ul>
        </div>`;
    }
    
    // Jalons détaillés
    if (record.jalons && record.jalons !== '[]') {
      try {
        const jalons = JSON.parse(record.jalons);
        if (Array.isArray(jalons) && jalons.length > 0) {
          expandedContent += `
            <div class="expanded-jalons">
              <h6><i class="bi bi-calendar-event me-1"></i>Jalons:</h6>
              <ul class="list-unstyled ms-3">
                ${jalons.map(j => `<li>• ${j.titre} (${j.date})</li>`).join('')}
              </ul>
            </div>`;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Références détaillées
    if (record.notes && (record.notes.includes('\\\\') || record.notes.includes('http'))) {
      const references = this.extractReferences(record.notes);
      if (references.length > 0) {
        expandedContent += `
          <div class="expanded-references">
            <h6><i class="bi bi-link-45deg me-1"></i>Références:</h6>
            <ul class="list-unstyled ms-3">
              ${references.map(ref => `<li>• <code>${ref}</code></li>`).join('')}
            </ul>
          </div>`;
      }
    }
    
    return expandedContent;
  }

  /**
   * Extrait les références d'un texte
   * @param {string} text - Texte à analyser
   * @returns {Array} Liste des références trouvées
   */
  extractReferences(text) {
    const references = [];
    
    // Regex pour chemins réseau
    const networkPaths = text.match(/\\\\[^\s]+/g) || [];
    references.push(...networkPaths);
    
    // Regex pour URLs
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    references.push(...urls);
    
    // Regex pour chemins locaux
    const localPaths = text.match(/[A-Z]:[^\s]+/g) || [];
    references.push(...localPaths);
    
    return [...new Set(references)]; // Supprimer les doublons
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