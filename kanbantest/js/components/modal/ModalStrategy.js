/**
 * ModalStrategy - Gestion du navigateur de strategies dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere le strategy browser (accordion), les tags et la selection
 */

import { escapeHTML } from '../../utils/safe-dom.js';

export class ModalStrategy {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Initialise le navigateur de strategies (accordion)
   */
  initStrategyBrowser() {
    const container = document.getElementById('stm-strategy-browser');
    if (!container) return;

    // Grouper par objectif > sous_objectif > axe
    const hierarchy = {};
    this.modal.strategies.forEach(s => {
      const obj = s.objectif || '(Sans objectif)';
      const sousObj = s.sous_objectif || '(Sans sous-objectif)';
      if (!hierarchy[obj]) hierarchy[obj] = {};
      if (!hierarchy[obj][sousObj]) hierarchy[obj][sousObj] = [];
      hierarchy[obj][sousObj].push(s);
    });

    let html = '<div class="strategy-tree">';
    for (const [objectif, sousObjectifs] of Object.entries(hierarchy)) {
      html += `<div class="strategy-objectif mb-2">
        <div class="fw-bold text-primary small mb-1"><i class="bi bi-bullseye me-1"></i>${escapeHTML(objectif)}</div>`;

      for (const [sousObjectif, axes] of Object.entries(sousObjectifs)) {
        html += `<div class="strategy-sous-objectif ms-3 mb-1">
          <div class="text-muted small">${escapeHTML(sousObjectif)}</div>
          <div class="strategy-axes ms-3">`;

        for (const axe of axes) {
          html += `<div class="strategy-axe form-check">
            <input class="form-check-input strategy-checkbox" type="checkbox"
              id="stm-strat-${axe.id}" value="${axe.id}"
              data-objectif="${escapeHTML(objectif)}" data-sous-objectif="${escapeHTML(sousObjectif)}" data-axe="${escapeHTML(axe.axe_strategique)}">
            <label class="form-check-label small" for="stm-strat-${axe.id}">${escapeHTML(axe.axe_strategique)}</label>
          </div>`;
        }

        html += '</div></div>';
      }
      html += '</div>';
    }
    html += '</div>';

    container.innerHTML = html;

    // Listeners pour mise a jour des tags
    container.querySelectorAll('.strategy-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this.updateStrategyTags());
    });
  }

  /**
   * Met a jour les tags de strategies selectionnees
   */
  updateStrategyTags() {
    const tagsContainer = document.getElementById('stm-strategy-tags');
    const countBadge = document.getElementById('stm-strategy-count');
    const selectedSection = document.getElementById('stm-selected-strategies');

    if (!tagsContainer) return;

    const checked = document.querySelectorAll('#stm-strategy-browser .strategy-checkbox:checked');
    this.modal.selectedStrategies = Array.from(checked).map(cb => ({
      id: parseInt(cb.value),
      objectif: cb.dataset.objectif,
      sousObjectif: cb.dataset.sousObjectif,
      axe: cb.dataset.axe
    }));

    if (this.modal.selectedStrategies.length === 0) {
      if (selectedSection) selectedSection.style.display = 'none';
      return;
    }

    if (selectedSection) selectedSection.style.display = 'block';
    if (countBadge) countBadge.textContent = this.modal.selectedStrategies.length;

    tagsContainer.innerHTML = this.modal.selectedStrategies.map(s => `
      <span class="badge bg-primary me-1 mb-1">
        ${escapeHTML(s.axe)}
        <button type="button" class="btn-close btn-close-white ms-1"
          style="font-size: 0.6em;" data-strat-id="${s.id}"></button>
      </span>
    `).join('');

    // Listeners pour supprimer les tags
    tagsContainer.querySelectorAll('.btn-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stratId = e.target.dataset.stratId;
        const checkbox = document.getElementById(`stm-strat-${stratId}`);
        if (checkbox) {
          checkbox.checked = false;
          this.updateStrategyTags();
        }
      });
    });

    // Mettre a jour le champ cache
    const idsField = document.getElementById('stm-strategie-ids');
    if (idsField) {
      idsField.value = this.modal.selectedStrategies.map(s => s.id).join(',');
    }
  }

  /**
   * Definit les strategies selectionnees
   */
  setSelectedStrategies(ids) {
    document.querySelectorAll('#stm-strategy-browser .strategy-checkbox').forEach(cb => {
      cb.checked = ids.includes(parseInt(cb.value));
    });
    this.updateStrategyTags();
  }
}
