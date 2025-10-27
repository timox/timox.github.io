// === managers/DatePickerManager.js ===
// Gestionnaire pour le sélecteur de dates avec Flatpickr

import { normalizeDate, prepareDateForGrist } from '../utils/dates.js';
import { setFieldValue, getFieldValue, toggleVisibility } from '../utils/dom.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour le sélecteur de dates et la gestion des échéances
 */
export class DatePickerManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.logger = createModuleLogger('DatePickerManager');
    this.flatpickrInstance = null;
    this.currentDate = null;
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire de dates
   */
  init() {
    this.setupDatePicker();
    this.setupEventListeners();
    this.logger.debug('DatePickerManager initialized');
  }
  
  /**
   * Configure le sélecteur de dates Flatpickr
   */
  setupDatePicker() {
    const dateInput = document.getElementById('popup-delai');
    if (!dateInput) {
      this.logger.warn('Date field not found');
      return;
    }
    
    // Configuration Flatpickr
    this.flatpickrInstance = flatpickr(dateInput, {
      locale: 'fr',
      dateFormat: 'Y-m-d',
      enableTime: false,
      allowInput: false,
      clickOpens: false, // On ouvre manuellement
      onChange: (selectedDates, dateStr) => {
        this.handleDateChange(selectedDates, dateStr);
      },
      onReady: () => {
        this.logger.debug('Flatpickr ready');
      }
    });
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Bouton pour ouvrir le sélecteur
    const btnPickDate = document.getElementById('btn-pick-date');
    if (btnPickDate) {
      btnPickDate.addEventListener('click', () => {
        this.openDatePicker();
      });
    }
    
    // Bouton pour effacer la date
    const btnClearDate = document.getElementById('btn-clear-date');
    if (btnClearDate) {
      btnClearDate.addEventListener('click', () => {
        this.clearDate();
      });
    }
    
    // Raccourcis clavier dans le champ de date
    const dateInput = document.getElementById('popup-delai');
    if (dateInput) {
      dateInput.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          this.clearDate();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openDatePicker();
        }
      });
    }
  }
  
  /**
   * Ouvre le sélecteur de dates
   */
  openDatePicker() {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.open();
    }
  }
  
  /**
   * Ferme le sélecteur de dates
   */
  closeDatePicker() {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.close();
    }
  }
  
  /**
   * Définit une date dans le sélecteur
   * @param {string|Date} dateValue - Date à définir
   */
  setDate(dateValue) {
    const normalizedDate = normalizeDate(dateValue);
    this.currentDate = normalizedDate;
    
    if (this.flatpickrInstance) {
      if (normalizedDate) {
        this.flatpickrInstance.setDate(normalizedDate, false);
        setFieldValue('popup-delai', normalizedDate);
      } else {
        this.flatpickrInstance.clear();
        setFieldValue('popup-delai', '');
      }
    }
    
    this.updateDateStatus();
    this.updateButtonsVisibility();
  }
  
  /**
   * Récupère la date actuelle du sélecteur
   * @returns {string|null} Date au format YYYY-MM-DD ou null
   */
  getDate() {
    return this.currentDate;
  }
  
  /**
   * Efface la date sélectionnée
   */
  clearDate() {
    this.setDate(null);
  }
  
  /**
   * Gestionnaire de changement de date
   * @param {Array} selectedDates - Dates sélectionnées
   * @param {string} dateStr - Date formatée
   */
  handleDateChange(selectedDates, dateStr) {
    if (selectedDates.length > 0) {
      const selectedDate = selectedDates[0];
      this.currentDate = selectedDate.toISOString().slice(0, 10);
    } else {
      this.currentDate = null;
    }
    
    this.updateDateStatus();
    this.updateButtonsVisibility();
  }
  
  /**
   * Met à jour l'affichage du statut de la date
   */
  updateDateStatus() {
    const statusElement = document.getElementById('date-status');
    if (!statusElement) return;
    
    if (!this.currentDate) {
      statusElement.textContent = 'Aucune date définie';
      statusElement.className = 'text-muted';
      return;
    }
    
    const today = new Date();
    const selectedDate = new Date(this.currentDate);
    
    // Réinitialiser les heures pour une comparaison précise
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let statusText = '';
    let statusClass = 'text-muted';
    
    if (diffDays < 0) {
      statusText = `Date dépassée de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
      statusClass = 'text-danger';
    } else if (diffDays === 0) {
      statusText = 'Échéance aujourd\'hui';
      statusClass = 'text-warning fw-bold';
    } else if (diffDays <= 3) {
      statusText = `${diffDays} jour${diffDays > 1 ? 's' : ''} restant${diffDays > 1 ? 's' : ''} (urgent)`;
      statusClass = 'text-danger';
    } else if (diffDays <= 7) {
      statusText = `${diffDays} jours restants (bientôt)`;
      statusClass = 'text-warning';
    } else {
      statusText = `${diffDays} jours restants`;
      statusClass = 'text-success';
    }
    
    statusElement.textContent = statusText;
    statusElement.className = statusClass;
  }
  
  /**
   * Met à jour la visibilité des boutons
   */
  updateButtonsVisibility() {
    const hasDate = this.currentDate !== null;
    toggleVisibility('btn-clear-date', hasDate, 'inline-flex');
  }
  
  /**
   * Définit une date rapide (aujourd'hui, demain, etc.)
   * @param {string} preset - Preset de date ('today', 'tomorrow', 'next_week', etc.)
   */
  setDatePreset(preset) {
    const today = new Date();
    let targetDate;
    
    switch (preset) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'next_week':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 7);
        break;
      case 'next_month':
        targetDate = new Date(today);
        targetDate.setMonth(today.getMonth() + 1);
        break;
      default:
        this.logger.warn(`Unknown date preset: ${preset}`);
        return;
    }
    
    this.setDate(targetDate.toISOString().slice(0, 10));
  }
  
  /**
   * Ajoute des boutons de dates rapides à l'interface
   */
  createQuickDateButtons() {
    const dateContainer = document.querySelector('#popup-delai').closest('.col-md-6');
    if (!dateContainer) return;
    
    // Vérifier si les boutons existent déjà
    if (dateContainer.querySelector('.quick-date-buttons')) return;
    
    const quickButtonsDiv = document.createElement('div');
    quickButtonsDiv.className = 'quick-date-buttons mt-2';
    quickButtonsDiv.innerHTML = `
      <div class="d-flex flex-wrap gap-1">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-preset="today">
          Aujourd'hui
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-preset="tomorrow">
          Demain
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-preset="next_week">
          +1 semaine
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-preset="next_month">
          +1 mois
        </button>
      </div>
    `;
    
    dateContainer.appendChild(quickButtonsDiv);
    
    // Ajouter les écouteurs d'événements
    quickButtonsDiv.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const preset = e.target.dataset.preset;
        this.setDatePreset(preset);
      });
    });
  }
  
  /**
   * Valide si une date est valide
   * @param {string} dateStr - Date à valider
   * @returns {boolean} True si valide
   */
  isValidDate(dateStr) {
    if (!dateStr) return true; // null/undefined sont acceptables
    
    const normalizedDate = normalizeDate(dateStr);
    return normalizedDate !== null;
  }
  
  /**
   * Prépare la date pour l'envoi à Grist
   * @returns {string|null} Date formatée pour Grist
   */
  getDateForGrist() {
    return prepareDateForGrist(this.currentDate);
  }
  
  /**
   * Configure des dates limites (min/max)
   * @param {object} limits - Limites de dates
   */
  setDateLimits(limits = {}) {
    if (!this.flatpickrInstance) return;
    
    const { minDate, maxDate } = limits;
    
    if (minDate) {
      this.flatpickrInstance.set('minDate', normalizeDate(minDate));
    }
    
    if (maxDate) {
      this.flatpickrInstance.set('maxDate', normalizeDate(maxDate));
    }
  }
  
  /**
   * Active/désactive le sélecteur de dates
   * @param {boolean} enabled - Activer ou désactiver
   */
  setEnabled(enabled) {
    const dateInput = document.getElementById('popup-delai');
    const btnPickDate = document.getElementById('btn-pick-date');
    const btnClearDate = document.getElementById('btn-clear-date');
    
    if (dateInput) dateInput.disabled = !enabled;
    if (btnPickDate) btnPickDate.disabled = !enabled;
    if (btnClearDate) btnClearDate.disabled = !enabled;
    
    if (this.flatpickrInstance) {
      if (enabled) {
        this.flatpickrInstance.redraw();
      } else {
        this.flatpickrInstance.close();
      }
    }
  }
  
  /**
   * Réinitialise le sélecteur de dates
   */
  reset() {
    this.clearDate();
    this.setDateLimits({}); // Supprimer les limites
  }
  
  /**
   * Exporte l'état du gestionnaire
   * @returns {object} État exporté
   */
  exportState() {
    return {
      currentDate: this.currentDate,
      hasInstance: this.flatpickrInstance !== null,
      timestamp: Date.now()
    };
  }
  
  /**
   * Importe un état
   * @param {object} state - État à importer
   */
  importState(state) {
    if (state && state.currentDate !== undefined) {
      this.setDate(state.currentDate);
    }
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.destroy();
      this.flatpickrInstance = null;
    }
    
    this.currentDate = null;
    
    // Supprimer les boutons rapides
    const quickButtons = document.querySelector('.quick-date-buttons');
    if (quickButtons) {
      quickButtons.remove();
    }
    
    this.logger.debug('DatePickerManager resources cleaned up');
  }
}
