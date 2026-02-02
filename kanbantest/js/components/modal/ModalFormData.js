/**
 * ModalFormData - Gestion du formulaire (populate, clear, get) dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere le remplissage, le vidage et la recuperation des donnees du formulaire
 */

import { extractGristRefId, extractGristRefIds } from '../../utils/grist-helpers.js';

export class ModalFormData {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Definit la valeur d'un champ par son ID
   */
  setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.value = value || '';
    }
  }

  /**
   * Recupere la valeur d'un champ par son ID
   */
  getFieldValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  /**
   * Remplit le formulaire avec les donnees de la tache
   */
  populateForm(task) {
    this.setFieldValue('stm-task-id', task.id);
    this.setFieldValue('stm-titre', task.titre);
    this.setFieldValue('stm-description', task.description);
    this.setFieldValue('stm-statut', task.statut);
    this.setFieldValue('stm-projet', task.projet);
    this.setFieldValue('stm-urgence', task.urgence);
    this.setFieldValue('stm-impact', task.impact);

    // Classification V3
    this.setFieldValue('stm-nature', task.nature_activite);
    this.setFieldValue('stm-genre', task.genre_action);
    this.setFieldValue('stm-etape', task.etape_cycle);
    this.setFieldValue('stm-previsibilite', task.previsibilite);

    // Priority buttons (urgence & impact)
    this.modal.visualsModule.setPriorityButtonValue('stm-urgence-buttons', task.urgence);
    this.modal.visualsModule.setPriorityButtonValue('stm-impact-buttons', task.impact);

    // Update status badge
    this.modal.visualsModule.updateStatusBadge();

    // Rattachement hierarchique via MEO
    this.setFieldValue('stm-meo-code', task.mise_en_oeuvre_code || '');
    this.setFieldValue('stm-meo-nom', task.mise_en_oeuvre_nom || '');
    // Extraire l'ID depuis le format Grist ["L", id] si necessaire
    const strategieId = extractGristRefId(task.strategie_id);
    this.setFieldValue('stm-strategie', strategieId || '');
    const programmeId = extractGristRefId(task.programme_id);
    this.setFieldValue('stm-programme', programmeId || '');

    // Selectionner la MEO dans le dropdown
    const meoSelect = document.getElementById('stm-meo');
    if (meoSelect && task.mise_en_oeuvre_code) {
      meoSelect.value = task.mise_en_oeuvre_code;
      this.modal.selectsModule.handleMeoChange();
    } else if (meoSelect) {
      meoSelect.value = '';
      const infoDiv = document.getElementById('stm-hierarchy-info');
      if (infoDiv) infoDiv.style.display = 'none';
    }

    // Bureaux (checkboxes) - peut etre une string separee par virgules ou un tableau
    const bureaux = task.bureau
      ? (Array.isArray(task.bureau) ? task.bureau : task.bureau.split(',').map(b => b.trim()))
      : [];
    this.modal.affectationModule.setSelectedBureaux(bureaux);

    // Responsables/Qui (checkboxes) - peut etre une string separee par virgules ou un tableau
    const qui = task.qui
      ? (Array.isArray(task.qui) ? task.qui : task.qui.split(',').map(q => q.trim()))
      : [];
    this.modal.affectationModule.setSelectedQui(qui);

    // Echeance (conversion timestamp si necessaire) - sous-module
    if (task.date_echeance) {
      const date = typeof task.date_echeance === 'number'
        ? new Date(task.date_echeance * 1000)
        : new Date(task.date_echeance);
      if (!isNaN(date.getTime())) {
        this.modal.datePickerModule.setDate(date);
        this.modal.datePickerModule.updateStatus(date);
      }
    } else {
      this.modal.datePickerModule.updateStatus(null);
    }

    // References
    this.setFieldValue('stm-references', task.reference || '');
    this.modal.referencesModule.updateReferencesPreview();

    // Jalons - sous-module
    this.modal.jalonModule.setData(task.jalons);

    // Avancement
    const avancement = task.avancement || 0;
    const sliderAvancement = document.getElementById('stm-avancement');
    if (sliderAvancement) {
      sliderAvancement.value = avancement;
      this.modal.visualsModule.updateAvancementDisplay(avancement);
    }

    // Date de debut
    if (task.date_debut) {
      const dateDebut = typeof task.date_debut === 'number'
        ? new Date(task.date_debut * 1000)
        : new Date(task.date_debut);
      if (!isNaN(dateDebut.getTime())) {
        this.setFieldValue('stm-date-debut', dateDebut.toISOString().split('T')[0]);
      }
    }

    // Durees (en heures)
    this.setFieldValue('stm-duree-estimee', task.temps_estime_heures || '');
    this.setFieldValue('stm-duree-reelle', task.temps_reel_heures || '');
    // Les champs sont en heures dans Grist, on fixe l'unite a 'h'
    this.setFieldValue('stm-duree-estimee-unite', 'h');
    this.setFieldValue('stm-duree-reelle-unite', 'h');
    this.modal.visualsModule.updateDureeEcart();

    // Liens entre taches - sous-module
    this.modal.taskLinksModule.setData(task.liens);
    this.modal.taskLinksModule.populateSelect();

    // Strategies multiples - strategie_id est une ReferenceList ["L", id1, id2, ...]
    const strategieIds = extractGristRefIds(task.strategie_id);
    if (strategieIds.length > 0) {
      this.modal.strategyModule.setSelectedStrategies(strategieIds);
    } else if (task.strategie_ids) {
      // Fallback sur strategie_ids si present
      const ids = Array.isArray(task.strategie_ids) ? task.strategie_ids : task.strategie_ids.split(',').map(Number);
      this.modal.strategyModule.setSelectedStrategies(ids);
    } else {
      this.modal.strategyModule.setSelectedStrategies([]);
    }

    // Temps
    if (this.modal.options.showTimes) {
      this.setFieldValue('stm-temps-estime', task.temps_estime || '');
      this.setFieldValue('stm-temps-reel', task.temps_reel || '');
    }

    // Update all visual indicators
    this.modal.visualsModule.updateCompletionRing();
    this.modal.visualsModule.updateTimelineVisual();

    // Update description counter
    const descCounter = document.getElementById('stm-desc-counter');
    if (descCounter) {
      const len = (task.description || '').length;
      descCounter.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
    }

    // Charger l'historique automatiquement
    this.modal.historyModule.loadTaskHistory();
  }

  /**
   * Vide le formulaire
   */
  clearForm() {
    const form = document.getElementById('shared-task-form');
    if (form) {
      form.reset();
    }
    this.setFieldValue('stm-task-id', '');

    // Vider les checkboxes
    this.modal.affectationModule.setSelectedBureaux([]);
    this.modal.affectationModule.setSelectedQui([]);

    // Vider les strategies
    this.modal.strategyModule.setSelectedStrategies([]);

    // Vider les jalons (sous-module)
    this.modal.jalonModule.clear();

    // Vider la date (sous-module)
    this.modal.datePickerModule.clear();

    // Vider les references
    this.setFieldValue('stm-references', '');
    this.modal.referencesModule.updateReferencesPreview();

    // Cacher les infos hierarchie
    const infoDiv = document.getElementById('stm-hierarchy-info');
    if (infoDiv) infoDiv.style.display = 'none';

    // Reinitialiser l'avancement
    const sliderAvancement = document.getElementById('stm-avancement');
    if (sliderAvancement) {
      sliderAvancement.value = 0;
      this.modal.visualsModule.updateAvancementDisplay(0);
    }

    // Vider les durees et dates
    this.setFieldValue('stm-date-debut', '');
    this.setFieldValue('stm-duree-estimee', '');
    this.setFieldValue('stm-duree-reelle', '');
    const ecartDiv = document.getElementById('stm-duree-ecart');
    if (ecartDiv) ecartDiv.textContent = '';

    // Vider les liens (sous-module)
    this.modal.taskLinksModule.clear();

    // Reset priority buttons
    this.modal.visualsModule.setPriorityButtonValue('stm-urgence-buttons', '');
    this.modal.visualsModule.setPriorityButtonValue('stm-impact-buttons', '');

    // Reset completion ring and other visual indicators
    this.modal.visualsModule.updateCompletionRing();
    this.modal.visualsModule.updateTimelineVisual();
    this.modal.visualsModule.updateStatusBadge();
  }

  /**
   * Recupere les donnees du formulaire
   */
  getFormData() {
    // Recuperer les bureaux et responsables depuis les checkboxes
    const selectedBureaux = this.modal.affectationModule.getSelectedBureaux();
    const selectedQui = this.modal.affectationModule.getSelectedQui();

    const data = {
      titre: this.getFieldValue('stm-titre'),
      description: this.getFieldValue('stm-description'),
      statut: this.getFieldValue('stm-statut'),
      qui: selectedQui.join(', '),
      bureau: selectedBureaux.join(', '),
      projet: this.getFieldValue('stm-projet'),
      urgence: this.getFieldValue('stm-urgence'),
      impact: this.getFieldValue('stm-impact'),
      nature_activite: this.getFieldValue('stm-nature'),
      genre_action: this.getFieldValue('stm-genre'),
      etape_cycle: this.getFieldValue('stm-etape'),
      previsibilite: this.getFieldValue('stm-previsibilite'),
      reference: this.getFieldValue('stm-references')
    };

    // ID de la tache
    const taskId = this.getFieldValue('stm-task-id');
    if (taskId) {
      data.id = parseInt(taskId, 10);
    }

    // Rattachement hierarchique via MEO
    data.mise_en_oeuvre_code = this.getFieldValue('stm-meo-code');
    data.mise_en_oeuvre_nom = this.getFieldValue('stm-meo-nom');

    // Strategies multiples (ReferenceList dans Grist)
    if (this.modal.selectedStrategies.length > 0) {
      // Envoyer le tableau d'IDs pour que GristManager cree la ReferenceList
      data.strategie_ids = this.modal.selectedStrategies.map(s => s.id);
      data.est_classifiee = true;
    } else {
      // Si aucune strategie selectionnee, verifier le champ cache (fallback)
      const strategieIdStr = this.getFieldValue('stm-strategie');
      if (strategieIdStr) {
        data.strategie_ids = [parseInt(strategieIdStr, 10)];
        data.est_classifiee = true;
      } else {
        // Liste vide - GristManager convertira en ["L"]
        data.strategie_id = null;
      }
    }

    const programmeIdStr = this.getFieldValue('stm-programme');
    if (programmeIdStr) {
      data.programme_id = parseInt(programmeIdStr, 10);
    }

    // Echeance (sous-module)
    const echeanceDate = this.modal.datePickerModule.getDate();
    if (echeanceDate && !isNaN(echeanceDate.getTime())) {
      data.date_echeance = Math.floor(echeanceDate.getTime() / 1000);
    }

    // Jalons (sous-module)
    const jalons = this.modal.jalonModule.getData();
    if (jalons.length > 0) {
      data.jalons = jalons;
    }

    // Temps
    if (this.modal.options.showTimes) {
      const tempsEstime = parseFloat(this.getFieldValue('stm-temps-estime'));
      const tempsReel = parseFloat(this.getFieldValue('stm-temps-reel'));
      if (!isNaN(tempsEstime)) data.temps_estime = tempsEstime;
      if (!isNaN(tempsReel)) data.temps_reel = tempsReel;
    }

    // Avancement
    const avancement = parseInt(this.getFieldValue('stm-avancement')) || 0;
    data.avancement = avancement;

    // Date de debut
    const dateDebut = this.getFieldValue('stm-date-debut');
    if (dateDebut) {
      data.date_debut = Math.floor(new Date(dateDebut).getTime() / 1000);
    }

    // Durees (en heures pour Grist)
    const dureeEstimee = parseFloat(this.getFieldValue('stm-duree-estimee'));
    const dureeReelle = parseFloat(this.getFieldValue('stm-duree-reelle'));
    if (!isNaN(dureeEstimee)) {
      data.temps_estime_heures = dureeEstimee;
    }
    if (!isNaN(dureeReelle)) {
      data.temps_reel_heures = dureeReelle;
    }

    // Liens entre taches (sous-module)
    const liens = this.modal.taskLinksModule.getData();
    if (liens.length > 0) {
      data.liens = liens;
    }

    return data;
  }
}
