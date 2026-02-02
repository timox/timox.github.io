/**
 * ModalReferenceData - Chargement des donnees de reference dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere le chargement des programmes, agents, strategies et MEO depuis Grist
 */

import { extractGristRefId } from '../../utils/grist-helpers.js';

export class ModalReferenceData {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Charge les donnees de reference (programmes, agents, strategies)
   */
  async loadReferenceData() {
    // Peupler les checkboxes de bureaux (statique)
    this.modal.affectationModule.populateBureauCheckboxes();

    if (typeof grist === 'undefined') {
      console.warn('[SharedTaskModal] Grist not available, skipping reference data');
      return;
    }

    try {
      // Charger les programmes
      await this.loadProgrammes();

      // Charger les agents
      await this.loadAgents();

      // Peupler les checkboxes responsables apres chargement agents
      this.modal.affectationModule.populateQuiCheckboxes();

      // Charger les strategies
      await this.loadStrategies();

      // Charger les MEO (apres les strategies)
      await this.loadMeos();

      // Initialiser le strategy browser
      this.modal.strategyModule.initStrategyBrowser();

      // Initialiser le date picker (sous-module)
      this.modal.datePickerModule.init();

      // Charger les taches pour les liens (sous-module)
      await this.modal.taskLinksModule.loadAllTasks();

      console.log('[SharedTaskModal] Reference data loaded');
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load some reference data:', error);
    }
  }

  /**
   * Charge les programmes depuis Grist
   */
  async loadProgrammes() {
    try {
      const data = await grist.docApi.fetchTable('Ssir_programmes');
      this.modal.programmes = [];
      const count = data.id?.length || 0;

      for (let i = 0; i < count; i++) {
        this.modal.programmes.push({
          id: data.id[i],
          code: data.code?.[i] || '',
          nom: data.nom?.[i] || ''
        });
      }

      this.modal.selectsModule.populateProgrammeSelect();
    } catch (error) {
      console.warn('[SharedTaskModal] No programmes table:', error.message);
    }
  }

  /**
   * Charge les agents - Utilise la liste par defaut (constants.js)
   * ConfigManager/localStorage peuvent enrichir les donnees mais pas les remplacer
   */
  async loadAgents() {
    // Utiliser la liste par defaut definie dans le constructeur (synchronisee avec constants.js)
    // Ne PAS ecraser avec ConfigManager/localStorage qui peut contenir des donnees incorrectes
    console.log('[SharedTaskModal] Using default agents list:', this.modal.agents.length, 'agents');

    // Trier par nom
    this.modal.agents.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));

    this.modal.selectsModule.populateAgentSelect();
  }

  /**
   * Charge les strategies depuis Grist
   */
  async loadStrategies() {
    try {
      const data = await grist.docApi.fetchTable('Ssir_strategie2');
      this.modal.strategies = [];
      // Utiliser id2 car c'est le seul champ id disponible dans cette table
      const count = data.id2?.length || 0;

      for (let i = 0; i < count; i++) {
        this.modal.strategies.push({
          id: data.id2[i],
          objectif: data.objectif?.[i] || '',
          sous_objectif: data.sous_objectif?.[i] || '',
          axe_strategique: data.axe_strategique?.[i] || ''
        });
      }

      this.modal.selectsModule.populateStrategySelect();
    } catch (error) {
      console.warn('[SharedTaskModal] No strategies table:', error.message);
    }
  }

  /**
   * Charge les MEO depuis les taches (agregees)
   */
  async loadMeos() {
    try {
      // Charger toutes les taches pour extraire les MEO
      const data = await grist.docApi.fetchTable('Ssir_principale_task');
      const meoMap = new Map();

      const count = data.id?.length || 0;
      for (let i = 0; i < count; i++) {
        const meoCode = data.mise_en_oeuvre_code?.[i];
        // Extraire l'ID depuis le format Grist ["L", id] si necessaire
        const strategieId = extractGristRefId(data.strategie_id?.[i]);

        if (meoCode && strategieId && !meoMap.has(meoCode)) {
          meoMap.set(meoCode, {
            code: meoCode,
            nom: data.mise_en_oeuvre_nom?.[i] || 'Sans nom',
            categorie: data.categorie?.[i] || 'Projet',
            strategie_id: strategieId
          });
        }
      }

      this.modal.meos = Array.from(meoMap.values());

      // Enrichir avec les infos de strategie
      console.log('[SharedTaskModal] Enriching MEOs with strategy info...');
      console.log('[SharedTaskModal] Available strategies:', this.modal.strategies.slice(0, 3));

      this.modal.meos.forEach(meo => {
        // Essayer de matcher par ID (peut etre string ou number)
        const strat = this.modal.strategies.find(s =>
          s.id === meo.strategie_id ||
          String(s.id) === String(meo.strategie_id)
        );

        if (strat) {
          meo.mission = strat.axe_strategique || '';
          meo.strategie = strat.sous_objectif || '';
          meo.programme = strat.objectif || '';
          console.log('[SharedTaskModal] MEO enriched:', meo.code, '→', {
            mission: meo.mission,
            strategie: meo.strategie,
            programme: meo.programme
          });
        } else {
          console.warn('[SharedTaskModal] No strategy found for MEO:', meo.code, 'strategie_id:', meo.strategie_id);
        }
      });

      // Trier par programme > mission > code
      this.modal.meos.sort((a, b) => {
        if (a.programme !== b.programme) return (a.programme || '').localeCompare(b.programme || '');
        if (a.mission !== b.mission) return (a.mission || '').localeCompare(b.mission || '');
        return (a.code || '').localeCompare(b.code || '');
      });

      this.modal.selectsModule.populateMeoSelect();
      console.log('[SharedTaskModal] Loaded', this.modal.meos.length, 'MEOs');
    } catch (error) {
      console.warn('[SharedTaskModal] Failed to load MEOs:', error.message);
      this.modal.meos = [];
    }
  }
}
