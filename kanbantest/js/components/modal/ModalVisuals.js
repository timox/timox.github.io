/**
 * ModalVisuals - Gestion des elements visuels dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere avancement, durees, priorites, completion ring, description counter,
 * timeline visual et status badge
 */

export class ModalVisuals {
  constructor(modal) {
    this.modal = modal;
  }

  // === Avancement ===

  /**
   * Initialise le slider d'avancement
   */
  initAvancement() {
    const slider = document.getElementById('stm-avancement');
    const statutSelect = document.getElementById('stm-statut');

    if (!slider) return;

    slider.addEventListener('input', () => {
      const value = parseInt(slider.value);
      this.updateAvancementDisplay(value);
    });

    // Synchroniser statut et avancement
    if (statutSelect) {
      statutSelect.addEventListener('change', () => {
        const statut = statutSelect.value;
        if (statut === 'Terminé') {
          slider.value = 100;
          this.updateAvancementDisplay(100);
        } else if (statut === 'Backlog' || statut === 'À faire') {
          if (parseInt(slider.value) === 100) {
            slider.value = 0;
            this.updateAvancementDisplay(0);
          }
        }
      });
    }
  }

  /**
   * Met a jour l'affichage de l'avancement
   */
  updateAvancementDisplay(value) {
    const badge = document.getElementById('stm-avancement-badge');
    const bar = document.getElementById('stm-avancement-bar');

    if (badge) badge.textContent = `${value}%`;
    if (bar) {
      bar.style.width = `${value}%`;
      bar.className = 'progress-bar';
      if (value === 100) {
        bar.classList.add('bg-success');
      } else if (value >= 75) {
        bar.classList.add('bg-info');
      } else if (value >= 50) {
        bar.classList.add('bg-primary');
      } else if (value >= 25) {
        bar.classList.add('bg-warning');
      }
    }
  }

  // === Durees ===

  /**
   * Initialise les champs de duree
   */
  initDuree() {
    const dureeEstimee = document.getElementById('stm-duree-estimee');
    const dureeReelle = document.getElementById('stm-duree-reelle');

    if (dureeEstimee && dureeReelle) {
      const updateEcart = () => this.updateDureeEcart();
      dureeEstimee.addEventListener('input', updateEcart);
      dureeReelle.addEventListener('input', updateEcart);
    }
  }

  /**
   * Met a jour l'ecart de duree
   */
  updateDureeEcart() {
    const estimee = parseFloat(document.getElementById('stm-duree-estimee')?.value) || 0;
    const reelle = parseFloat(document.getElementById('stm-duree-reelle')?.value) || 0;
    const ecartDiv = document.getElementById('stm-duree-ecart');

    if (!ecartDiv || estimee === 0) {
      if (ecartDiv) ecartDiv.textContent = '';
      return;
    }

    const ecart = reelle - estimee;
    const pct = Math.round((ecart / estimee) * 100);

    if (ecart > 0) {
      ecartDiv.className = 'form-text small text-danger';
      ecartDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> +${ecart.toFixed(1)} (+${pct}%)`;
    } else if (ecart < 0) {
      ecartDiv.className = 'form-text small text-success';
      ecartDiv.innerHTML = `<i class="bi bi-check-circle"></i> ${ecart.toFixed(1)} (${pct}%)`;
    } else {
      ecartDiv.className = 'form-text small text-muted';
      ecartDiv.textContent = 'Dans les temps';
    }
  }

  // === Priority (now using selects - no special logic needed) ===

  /**
   * Initialise les selects de priorite (plus de boutons)
   */
  initPriorityButtons() {
    // Les selects fonctionnent automatiquement - juste ajouter listener pour completion ring
    ['stm-urgence', 'stm-impact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.updateCompletionRing());
      }
    });
  }

  /**
   * Definit la valeur des selects de priorite (pour compatibilite)
   */
  setPriorityButtonValue(containerId, value) {
    // Mapping des anciens IDs vers les nouveaux
    const mapping = {
      'stm-urgence-buttons': 'stm-urgence',
      'stm-impact-buttons': 'stm-impact'
    };
    const selectId = mapping[containerId] || containerId;
    this.modal.setFieldValue(selectId, value);
  }

  // === Completion Ring ===

  /**
   * Initialise l'indicateur de completude
   */
  initCompletionRing() {
    // Liste des champs a surveiller pour calculer la completude
    const fieldsToWatch = [
      'stm-titre', 'stm-description', 'stm-statut', 'stm-avancement',
      'stm-echeance', 'stm-date-debut', 'stm-meo', 'stm-projet'
    ];

    fieldsToWatch.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.addEventListener('change', () => this.updateCompletionRing());
        el.addEventListener('input', () => this.updateCompletionRing());
      }
    });

    // Surveiller les checkboxes
    const checkboxContainers = ['stm-bureau-checkboxes', 'stm-qui-checkboxes'];
    checkboxContainers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.addEventListener('change', () => this.updateCompletionRing());
      }
    });

    this.updateCompletionRing();
  }

  /**
   * Met a jour l'indicateur de completude
   */
  updateCompletionRing() {
    const circle = document.getElementById('stm-completion-circle');
    const text = document.getElementById('stm-completion-text');

    if (!circle || !text) return;

    // Calculer la completude (ponderee)
    const weights = {
      titre: { weight: 20, check: () => !!this.modal.getFieldValue('stm-titre') },
      description: { weight: 15, check: () => !!this.modal.getFieldValue('stm-description') },
      statut: { weight: 10, check: () => !!this.modal.getFieldValue('stm-statut') },
      urgence: { weight: 10, check: () => !!this.modal.getFieldValue('stm-urgence') },
      impact: { weight: 10, check: () => !!this.modal.getFieldValue('stm-impact') },
      echeance: { weight: 10, check: () => {
        if (this.modal.datePicker) {
          return this.modal.datePicker.selectedDates.length > 0;
        }
        return !!this.modal.getFieldValue('stm-echeance');
      }},
      responsables: { weight: 15, check: () => this.modal.affectationModule.getSelectedQui().length > 0 },
      meo: { weight: 10, check: () => !!this.modal.getFieldValue('stm-meo') }
    };

    let score = 0;
    let total = 0;

    for (const [key, config] of Object.entries(weights)) {
      total += config.weight;
      if (config.check()) {
        score += config.weight;
      }
    }

    const percentage = Math.round((score / total) * 100);

    // Mettre a jour le SVG
    circle.setAttribute('stroke-dasharray', `${percentage}, 100`);
    text.textContent = `${percentage}%`;

    // Changer la couleur selon le niveau
    if (percentage >= 80) {
      circle.style.stroke = '#22c55e'; // green
    } else if (percentage >= 50) {
      circle.style.stroke = '#f59e0b'; // yellow
    } else {
      circle.style.stroke = '#ef4444'; // red
    }
  }

  // === Description Counter ===

  /**
   * Initialise le compteur de caracteres de description
   */
  initDescriptionCounter() {
    const textarea = document.getElementById('stm-description');
    const counter = document.getElementById('stm-desc-counter');

    if (!textarea || !counter) return;

    const updateCounter = () => {
      const len = textarea.value.length;
      counter.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
    };

    textarea.addEventListener('input', updateCounter);
    updateCounter();
  }

  // === Timeline Visual ===

  /**
   * Met a jour la visualisation de la timeline
   */
  updateTimelineVisual() {
    const startPoint = document.getElementById('stm-timeline-start');
    const endPoint = document.getElementById('stm-timeline-end');
    const progress = document.getElementById('stm-timeline-progress');

    if (!startPoint || !endPoint || !progress) return;

    const dateDebut = this.modal.getFieldValue('stm-date-debut');
    let dateEcheance = null;

    if (this.modal.datePicker) {
      const dates = this.modal.datePicker.selectedDates;
      if (dates.length > 0) dateEcheance = dates[0];
    } else {
      const val = this.modal.getFieldValue('stm-echeance');
      if (val) dateEcheance = new Date(val);
    }

    // Mettre a jour les points
    startPoint.classList.toggle('has-date', !!dateDebut);
    endPoint.classList.toggle('has-date', !!dateEcheance);

    // Verifier si en retard
    if (dateEcheance) {
      const now = new Date();
      endPoint.classList.toggle('overdue', dateEcheance < now);
    } else {
      endPoint.classList.remove('overdue');
    }

    // Calculer la progression si les deux dates sont definies
    if (dateDebut && dateEcheance) {
      const start = new Date(dateDebut);
      const end = dateEcheance;
      const now = new Date();

      const totalDuration = end - start;
      const elapsed = now - start;

      if (totalDuration > 0) {
        const pct = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
        progress.style.width = `${pct}%`;
      }
    } else {
      progress.style.width = '0%';
    }
  }

  // === Status Badge Update ===

  /**
   * Met a jour le badge de statut dans le header
   */
  updateStatusBadge() {
    const badge = document.getElementById('stm-status-badge');
    const select = document.getElementById('stm-statut');

    if (!badge || !select) return;

    const statut = select.value;
    const option = select.options[select.selectedIndex];
    const color = option?.dataset?.color || 'secondary';

    badge.className = `badge bg-${color}`;
    badge.textContent = statut;
  }
}
