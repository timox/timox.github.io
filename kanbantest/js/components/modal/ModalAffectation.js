/**
 * ModalAffectation - Gestion des affectations (bureaux, responsables) dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere les checkboxes de bureaux et responsables, ainsi que le recapitulatif
 */

import { escapeHTML } from '../../utils/safe-dom.js';

export class ModalAffectation {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Peuple les boutons de bureaux (toggle buttons)
   */
  populateBureauCheckboxes() {
    const container = document.getElementById('stm-bureau-checkboxes');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'toggle-button-group';

    this.modal.bureaux.forEach(bureau => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle-btn toggle-btn-bureau';
      btn.dataset.value = bureau;
      btn.innerHTML = `<i class="bi bi-building me-1"></i>${escapeHTML(bureau)}`;

      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        this.updateAffectationSummary();
      });

      container.appendChild(btn);
    });
  }

  /**
   * Peuple les boutons de responsables (toggle buttons) - liste simple sans groupement
   */
  populateQuiCheckboxes() {
    const container = document.getElementById('stm-qui-checkboxes');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'toggle-button-group';

    // Trier les agents par nom
    const sortedAgents = [...this.modal.agents].sort((a, b) =>
      (a.nom || '').localeCompare(b.nom || '')
    );

    // Afficher tous les agents sans groupement
    sortedAgents.forEach(agent => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle-btn toggle-btn-person';
      btn.dataset.value = agent.nom;
      btn.innerHTML = `<i class="bi bi-person me-1"></i>${escapeHTML(agent.nom)}`;

      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        this.updateAffectationSummary();
      });

      container.appendChild(btn);
    });
  }

  /**
   * Recupere les valeurs des boutons bureaux selectionnes
   */
  getSelectedBureaux() {
    const buttons = document.querySelectorAll('#stm-bureau-checkboxes .toggle-btn.active');
    return Array.from(buttons).map(btn => btn.dataset.value);
  }

  /**
   * Recupere les valeurs des boutons responsables selectionnes
   */
  getSelectedQui() {
    const buttons = document.querySelectorAll('#stm-qui-checkboxes .toggle-btn.active');
    return Array.from(buttons).map(btn => btn.dataset.value);
  }

  /**
   * Definit les bureaux selectionnes
   */
  setSelectedBureaux(bureaux) {
    document.querySelectorAll('#stm-bureau-checkboxes .toggle-btn').forEach(btn => {
      btn.classList.toggle('active', bureaux.includes(btn.dataset.value));
    });
    this.updateAffectationSummary();
  }

  /**
   * Definit les responsables selectionnes
   */
  setSelectedQui(noms) {
    document.querySelectorAll('#stm-qui-checkboxes .toggle-btn').forEach(btn => {
      btn.classList.toggle('active', noms.includes(btn.dataset.value));
    });
    this.updateAffectationSummary();
  }

  /**
   * Met a jour le recapitulatif d'affectation
   */
  updateAffectationSummary() {
    const summary = document.getElementById('stm-affectation-summary');
    if (!summary) return;

    const selectedQui = this.getSelectedQui();
    const selectedBureaux = this.getSelectedBureaux();

    if (selectedQui.length === 0 && selectedBureaux.length === 0) {
      summary.innerHTML = `
        <div class="summary-card">
          <i class="bi bi-info-circle text-muted me-2"></i>
          <span class="text-muted small">Sélectionnez des responsables et/ou bureaux pour les afficher ici</span>
        </div>
      `;
      return;
    }

    let html = '<div class="summary-badges">';

    selectedQui.forEach(nom => {
      html += `<span class="summary-badge responsable"><i class="bi bi-person-fill"></i>${escapeHTML(nom)}</span>`;
    });

    selectedBureaux.forEach(bureau => {
      html += `<span class="summary-badge bureau"><i class="bi bi-building-fill"></i>${escapeHTML(bureau)}</span>`;
    });

    html += '</div>';
    summary.innerHTML = html;
  }
}
