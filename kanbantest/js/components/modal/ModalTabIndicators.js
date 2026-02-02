/**
 * ModalTabIndicators - Gestion des indicateurs d'onglets dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere les indicateurs visuels sur chaque onglet (contenu rempli ou non)
 */

export class ModalTabIndicators {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Initialise les indicateurs d'onglets
   */
  initTabIndicators() {
    // Surveiller les changements pour mettre a jour les indicateurs
    const updateIndicators = () => {
      this.updateTabIndicator('essential', this.checkEssentialFields());
      this.updateTabIndicator('planning', this.checkPlanningFields());
      this.updateTabIndicator('organization', this.checkOrganizationFields());
      this.updateTabIndicator('affectation', this.checkAffectationFields());
      this.updateTabIndicator('advanced', this.checkAdvancedFields());
    };

    // Observer les changements sur le formulaire
    const form = document.getElementById('shared-task-form');
    if (form) {
      form.addEventListener('change', updateIndicators);
      form.addEventListener('input', updateIndicators);
    }

    updateIndicators();
  }

  /**
   * Met a jour un indicateur d'onglet
   */
  updateTabIndicator(tabName, hasContent) {
    const indicator = document.getElementById(`indicator-${tabName}`);
    if (!indicator) return;

    indicator.className = 'tab-indicator';
    if (hasContent) {
      indicator.classList.add('has-content');
    }
  }

  /**
   * Verifie si les champs essentiels sont remplis
   */
  checkEssentialFields() {
    return !!this.modal.getFieldValue('stm-titre') ||
           !!this.modal.getFieldValue('stm-description') ||
           !!this.modal.getFieldValue('stm-urgence') ||
           !!this.modal.getFieldValue('stm-impact');
  }

  /**
   * Verifie si les champs d'affectation sont remplis
   */
  checkAffectationFields() {
    return this.modal.affectationModule.getSelectedQui().length > 0 ||
           this.modal.affectationModule.getSelectedBureaux().length > 0 ||
           !!this.modal.getFieldValue('stm-equipe');
  }

  /**
   * Verifie si les champs de planification sont remplis
   */
  checkPlanningFields() {
    const hasDate = this.modal.datePicker ?
      this.modal.datePicker.selectedDates.length > 0 :
      !!this.modal.getFieldValue('stm-echeance');

    return hasDate ||
           !!this.modal.getFieldValue('stm-date-debut') ||
           !!this.modal.getFieldValue('stm-duree-estimee') ||
           !!this.modal.getFieldValue('stm-duree-reelle') ||
           this.modal.jalons.length > 0;
  }

  /**
   * Verifie si les champs d'organisation sont remplis
   */
  checkOrganizationFields() {
    return !!this.modal.getFieldValue('stm-meo') ||
           !!this.modal.getFieldValue('stm-projet') ||
           this.modal.selectedStrategies.length > 0 ||
           this.modal.taskLinks.length > 0;
  }

  /**
   * Verifie si les champs avances sont remplis
   */
  checkAdvancedFields() {
    return !!this.modal.getFieldValue('stm-nature') ||
           !!this.modal.getFieldValue('stm-genre') ||
           !!this.modal.getFieldValue('stm-etape') ||
           !!this.modal.getFieldValue('stm-references');
  }
}
