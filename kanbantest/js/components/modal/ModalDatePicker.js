/**
 * ModalDatePicker - Gestion du date picker dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 2)
 * Charge via <script> avant SharedTaskModal.js
 */
export class ModalDatePicker {
  constructor(modal) {
    this.modal = modal;
    this.instance = null;
  }

  /**
   * Initialise le date picker avec bouton clear
   */
  init() {
    const input = document.getElementById('stm-echeance');
    const btnPick = document.getElementById('stm-btn-pick-date');
    const btnClear = document.getElementById('stm-btn-clear-date');

    if (!input) {
      console.warn('[ModalDatePicker] Date input not found');
      return;
    }

    // Verifier flatpickr globalement (window.flatpickr)
    const fp = window.flatpickr || (typeof flatpickr !== 'undefined' ? flatpickr : null);

    if (fp) {
      try {
        // Detruire l'instance precedente si elle existe
        if (this.instance) {
          this.instance.destroy();
        }

        this.instance = fp(input, {
          dateFormat: 'd/m/Y',
          locale: 'fr',
          allowInput: true,
          clickOpens: true,
          onChange: (dates) => {
            this.updateStatus(dates[0]);
            this.modal.updateTimelineVisual();
            this.modal.updateCompletionRing();
          }
        });
        console.log('[ModalDatePicker] Flatpickr initialized');
      } catch (error) {
        console.warn('[ModalDatePicker] Flatpickr init error:', error);
        this.initFallback(input);
      }
    } else {
      console.warn('[ModalDatePicker] Flatpickr not available, using fallback');
      this.initFallback(input);
    }

    // Bouton pour ouvrir le picker
    if (btnPick) {
      // Supprimer les anciens listeners en clonant le bouton
      const newBtnPick = btnPick.cloneNode(true);
      btnPick.parentNode.replaceChild(newBtnPick, btnPick);

      newBtnPick.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.instance && typeof this.instance.open === 'function') {
          this.instance.open();
        } else {
          // Fallback: utiliser input date natif
          const dateInput = document.getElementById('stm-echeance');
          if (dateInput) {
            if (dateInput.type === 'date') {
              try {
                dateInput.showPicker?.();
              } catch (err) {
                dateInput.focus();
                dateInput.click();
              }
            } else {
              // Convertir temporairement en input date
              const currentValue = dateInput.value;
              dateInput.type = 'date';
              dateInput.removeAttribute('readonly');
              try {
                dateInput.showPicker?.();
              } catch (err) {
                dateInput.focus();
              }
            }
          }
        }
      });
    }

    // Bouton pour effacer la date
    if (btnClear) {
      // Supprimer les anciens listeners en clonant le bouton
      const newBtnClear = btnClear.cloneNode(true);
      btnClear.parentNode.replaceChild(newBtnClear, btnClear);

      newBtnClear.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.instance && typeof this.instance.clear === 'function') {
          this.instance.clear();
        } else {
          const dateInput = document.getElementById('stm-echeance');
          if (dateInput) dateInput.value = '';
        }
        this.updateStatus(null);
      });
    }
  }

  /**
   * Fallback pour le date picker sans flatpickr
   */
  initFallback(input) {
    input.type = 'date';
    input.removeAttribute('readonly');
    input.style.cursor = 'pointer';
    input.addEventListener('change', () => {
      this.updateStatus(input.value ? new Date(input.value) : null);
      this.modal.updateTimelineVisual();
      this.modal.updateCompletionRing();
    });
    // Permettre l'ouverture au clic
    input.addEventListener('click', () => {
      try {
        input.showPicker?.();
      } catch (e) {
        // Ignorer si showPicker n'est pas supporte
      }
    });
  }

  /**
   * Met a jour le statut de la date (badge J-X)
   */
  updateStatus(date) {
    const btnClear = document.getElementById('stm-btn-clear-date');
    const statusSpan = document.getElementById('stm-date-status');

    if (date) {
      if (btnClear) btnClear.style.display = 'block';
      if (statusSpan) {
        const now = new Date();
        const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
          statusSpan.className = 'text-danger small';
          statusSpan.textContent = `En retard de ${Math.abs(diff)} jour(s)`;
        } else if (diff === 0) {
          statusSpan.className = 'text-warning small';
          statusSpan.textContent = "Échéance aujourd'hui";
        } else if (diff <= 7) {
          statusSpan.className = 'text-warning small';
          statusSpan.textContent = `Dans ${diff} jour(s)`;
        } else {
          statusSpan.className = 'text-muted small';
          statusSpan.textContent = `Dans ${diff} jours`;
        }
      }
    } else {
      if (btnClear) btnClear.style.display = 'none';
      if (statusSpan) {
        statusSpan.className = 'text-muted small';
        statusSpan.textContent = 'Aucune date définie';
      }
    }
  }

  /**
   * Definit la date depuis populateForm
   * @param {Date} date
   */
  setDate(date) {
    if (this.instance) {
      this.instance.setDate(date);
    } else {
      const input = document.getElementById('stm-echeance');
      if (input && date) {
        input.value = date.toISOString().split('T')[0];
      }
    }
  }

  /**
   * Vide la date
   */
  clear() {
    if (this.instance && typeof this.instance.clear === 'function') {
      this.instance.clear();
    } else {
      const input = document.getElementById('stm-echeance');
      if (input) input.value = '';
    }
    this.updateStatus(null);
  }

  /**
   * Retourne la date selectionnee
   * @returns {Date|null}
   */
  getDate() {
    if (this.instance) {
      const dates = this.instance.selectedDates;
      if (dates && dates.length > 0) {
        return dates[0];
      }
      return null;
    }
    // Fallback input natif
    const input = document.getElementById('stm-echeance');
    if (input && input.value) {
      const d = new Date(input.value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  /**
   * Detruit l'instance flatpickr
   */
  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}
