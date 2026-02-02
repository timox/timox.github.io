// === managers/view/CardRenderer.js ===
// Sous-module de ViewManager : rendu des cartes de taches

import { escapeHTML } from '../../utils/safe-dom.js';
import { VIEW_MODES, getStatusAccent } from '../../config/constants.js';
import {
  generateBureauBadges,
  generatePriorityBadge,
  generateProjectBadge,
  generateResponsablesBadges
} from '../../utils/badges.js';
import { generateDatesContainer } from '../../utils/dates.js';

export class CardRenderer {
  constructor(viewManager) {
    this.manager = viewManager;
  }

  /**
   * Calcule la priorite d'une tache
   * @param {string} urgence - Niveau d'urgence
   * @param {string} impact - Niveau d'impact
   * @returns {number} Priorite (1-4)
   */
  calculatePriority(urgence, impact) {
    const imp = String(impact || '').trim().toLowerCase();
    const urg = String(urgence || '').trim().toLowerCase();

    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'imm\u00e9diate' || urg === 'courte') ? 1 : 2;
    if (imp === 'mod\u00e9r\u00e9') return (urg === 'imm\u00e9diate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }

  /**
   * Obtient les informations des strategies multiples
   * @param {string} strategieId - IDs des strategies (separes par virgules)
   * @returns {Array} Informations des strategies
   */
  getMultipleStrategiesInfo(strategieId) {
    if (!strategieId || !this.manager.kanban.strategyData) return [];

    const ids = String(strategieId)
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));

    return ids
      .map(id => this.manager.kanban.strategyData.find(s => s.id === id))
      .filter(Boolean);
  }

  /**
   * Genere le bouton timeline
   * @param {object} record - Donnees de la tache
   * @returns {string} HTML du bouton timeline
   */
  generateTimelineButton(record) {
    let notesEventCount = 0;
    if (record?.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData && Array.isArray(notesData.history)) {
          notesEventCount = notesData.history.length;
        }
      } catch {
        notesEventCount = 0;
      }
    }

    if (!notesEventCount) {
      return `<button class="btn btn-sm timeline-btn"
                      data-task-id="${record.id}"
                      title="Aucun evenement"
                      style="border: none; background: none; color: #6c757d;">
                <i class="bi bi-clock-history"></i>
              </button>`;
    }

    return `<button class="btn btn-sm timeline-btn"
                    data-task-id="${record.id}"
                    title="${notesEventCount} evenement${notesEventCount > 1 ? 's' : ''}"
                    style="border: none; background: none; color: #0dcaf0;">
              <i class="bi bi-clock-history"></i>
            </button>`;
  }

  /**
   * Rend une carte de tache
   * @param {object} record - Donnees de la tache
   * @param {string} viewMode - Mode de vue (compact, detailed, focus)
   * @returns {string} HTML de la carte
   */
  renderTaskCard(record, viewMode = VIEW_MODES.COMPACT) {
    if (!record?.id) {
      this.manager.logger.warn('Tentative de rendu de carte sans identifiant', record);
      return '';
    }

    const priority = this.calculatePriority(record.urgence, record.impact);
    const priorityBadge = generatePriorityBadge(priority);
    const strategiesInfo = this.getMultipleStrategiesInfo(record.strategie_id);
    const hasStrategy = strategiesInfo.length > 0 ||
      record.strategie_objectif ||
      record.strategie_sous_objectif ||
      record.strategie_action;

    const strategiesText = strategiesInfo.length > 0
      ? strategiesInfo.map(s => `\u2022 ${s.objectif}`).join('\\n')
      : '';
    const strategyTooltip = strategiesText
      ? `title="${strategiesInfo.length} strategie${strategiesInfo.length > 1 ? 's' : ''} liee${strategiesInfo.length > 1 ? 's' : ''}"`
      : (hasStrategy ? 'title="Strategie associee"' : '');
    const strategyIcon = hasStrategy
      ? `<i class="bi bi-crosshair strategie-icon" ${strategyTooltip} style="font-size: 1.1em; color: #28a745;"></i>`
      : '';

    const projectBadge = record.projet
      ? generateProjectBadge({
          projet: record.projet,
          strategie_objectif: strategiesInfo[0]?.objectif,
          strategie_sous_objectif: strategiesInfo[0]?.sous_objectif,
          strategie_action: strategiesInfo[0]?.axe_strategique
        })
      : '';

    let resumeDesc = '';
    if (record.notes) {
      try {
        const notesData = JSON.parse(record.notes);
        if (notesData?.content) {
          const content = notesData.content.substring(0, 80);
          resumeDesc = `<div class="desc-resume">${content}${notesData.content.length > 80 ? '\u2026' : ''}</div>`;
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    const datesElement = generateDatesContainer({
      date_debut: record.date_debut,
      date_echeance: record.date_echeance
    }, viewMode === VIEW_MODES.COMPACT);

    const bureauBadges = generateBureauBadges(record.bureau, viewMode === VIEW_MODES.COMPACT);
    const responsablesBadges = generateResponsablesBadges(record.qui);
    const timelineButton = this.generateTimelineButton(record);

    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    const hasDateDebutClass = record.date_debut ? 'has-debut' : '';
    const cardClass = viewMode === VIEW_MODES.COMPACT ? 'kanban-item-compact' : 'kanban-item';

    // XSS FIX: escapeHTML on record.titre (user data)
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

      <div class="item-title editable-zone">${escapeHTML(record.titre || 'Sans titre')}</div>

      ${this.generateExpandedContent(record, viewMode)}

      ${resumeDesc}

      ${datesElement}

      ${viewMode !== VIEW_MODES.COMPACT ? responsablesBadges : ''}
    </div>`;
  }

  generateReferenceIcon(record, viewMode) {
    if (viewMode === VIEW_MODES.COMPACT) return '';

    const hasReference = record?.notes && (
      record.notes.includes('\\\\') ||
      record.notes.includes('http') ||
      record.notes.includes('file://') ||
      record.notes.includes('C:') ||
      record.notes.includes('D:')
    );

    if (!hasReference) return '';

    const tooltip = viewMode === VIEW_MODES.FOCUS
      ? 'title="Contient des references - cliquer pour voir le detail"'
      : 'title="Contient des references"';

    return `<i class="bi bi-link-45deg reference-icon" ${tooltip} style="font-size: 1.1em; color: #6f42c1;"></i>`;
  }

  generateJalonIcon(record, viewMode) {
    if (viewMode === VIEW_MODES.COMPACT) return '';

    const hasJalons = record?.jalons && record.jalons !== '[]' && record.jalons.trim() !== '';
    if (!hasJalons) return '';

    let jalonCount = 0;
    try {
      const jalons = JSON.parse(record.jalons);
      jalonCount = Array.isArray(jalons) ? jalons.length : 0;
    } catch {
      jalonCount = 1;
    }

    const tooltip = viewMode === VIEW_MODES.FOCUS
      ? `title="${jalonCount} jalon${jalonCount > 1 ? 's' : ''} planifie${jalonCount > 1 ? 's' : ''} - cliquer pour voir"`
      : `title="${jalonCount} jalon${jalonCount > 1 ? 's' : ''}"`;

    return `<i class="bi bi-calendar-event jalon-icon" ${tooltip} style="font-size: 1.1em; color: #fd7e14;"></i>`;
  }

  generateExpandedContent(record, viewMode) {
    if (viewMode !== VIEW_MODES.FOCUS) return '';

    let expandedContent = '';
    const strategiesInfo = this.getMultipleStrategiesInfo(record.strategie_id);
    if (strategiesInfo.length > 0) {
      // XSS FIX: escapeHTML on s.objectif and s.axe_strategique (user data)
      expandedContent += `
        <div class="expanded-strategies">
          <h6><i class="bi bi-crosshair me-1"></i>Strategies:</h6>
          <ul class="list-unstyled ms-3">
            ${strategiesInfo.map(s => `<li>\u2022 ${escapeHTML(s.objectif)} \u2192 ${escapeHTML(s.axe_strategique)}</li>`).join('')}
          </ul>
        </div>`;
    }

    if (record?.jalons && record.jalons !== '[]') {
      try {
        const jalons = JSON.parse(record.jalons);
        if (Array.isArray(jalons) && jalons.length > 0) {
          // XSS FIX: escapeHTML on j.titre (user data)
          expandedContent += `
            <div class="expanded-jalons">
              <h6><i class="bi bi-calendar-event me-1"></i>Jalons:</h6>
              <ul class="list-unstyled ms-3">
                ${jalons.map(j => `<li>\u2022 ${escapeHTML(j.titre)} (${j.date})</li>`).join('')}
              </ul>
            </div>`;
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    if (record?.notes && (record.notes.includes('\\\\') || record.notes.includes('http'))) {
      const references = this.extractReferences(record.notes);
      if (references.length > 0) {
        expandedContent += `
          <div class="expanded-references">
            <h6><i class="bi bi-link-45deg me-1"></i>References:</h6>
            <ul class="list-unstyled ms-3">
              ${references.map(ref => `<li>\u2022 <code>${ref}</code></li>`).join('')}
            </ul>
          </div>`;
      }
    }

    return expandedContent;
  }

  extractReferences(text) {
    const references = [];
    const networkPaths = text.match(/\\\\[^\s]+/g) || [];
    references.push(...networkPaths);
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    references.push(...urls);
    const localPaths = text.match(/[A-Z]:[^\s]+/g) || [];
    references.push(...localPaths);
    return [...new Set(references)];
  }

  handleKeyboardNavigation(e) {
    const focusedElement = document.activeElement;
    const currentColumn = focusedElement?.closest('.kanban-board');

    if (!currentColumn) return;

    const allColumns = Array.from(document.querySelectorAll('.kanban-board:not(.board-hidden)'));
    const currentIndex = allColumns.indexOf(currentColumn);

    let nextIndex;
    if (e.key === 'ArrowLeft') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : allColumns.length - 1;
    } else {
      nextIndex = currentIndex < allColumns.length - 1 ? currentIndex + 1 : 0;
    }

    const nextColumn = allColumns[nextIndex];
    if (nextColumn) {
      const firstCard = nextColumn.querySelector('.kanban-item');
      if (firstCard) {
        firstCard.focus();
      } else {
        nextColumn.querySelector('.kanban-board-body')?.focus();
      }
    }
  }
}
