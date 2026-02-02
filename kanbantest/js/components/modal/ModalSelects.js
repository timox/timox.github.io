/**
 * ModalSelects - Gestion des selects dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere les selects MEO, Programme, Agent, Strategie
 */

export class ModalSelects {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Peuple le selecteur de MEO
   */
  populateMeoSelect() {
    const select = document.getElementById('stm-meo');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner une mise en œuvre --</option>';

    // Grouper par Mission
    const missionGroups = {};
    this.modal.meos.forEach(meo => {
      const missionKey = meo.mission || '(Sans mission)';
      if (!missionGroups[missionKey]) {
        missionGroups[missionKey] = [];
      }
      missionGroups[missionKey].push(meo);
    });

    // Creer les optgroups
    for (const [mission, meoList] of Object.entries(missionGroups)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = mission;

      for (const meo of meoList) {
        const option = document.createElement('option');
        option.value = meo.code;
        option.textContent = `${meo.code} - ${meo.nom}`;
        option.dataset.strategieId = meo.strategie_id;
        option.dataset.meoNom = meo.nom;
        option.dataset.mission = meo.mission || '';
        option.dataset.strategie = meo.strategie || '';
        option.dataset.programme = meo.programme || '';
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }

    // Listener pour remplir la hierarchie automatiquement
    select.addEventListener('change', () => this.handleMeoChange());
  }

  /**
   * Gere le changement de MEO selectionnee
   */
  handleMeoChange() {
    const select = document.getElementById('stm-meo');
    const infoDiv = document.getElementById('stm-hierarchy-info');

    if (!select || !infoDiv) return;

    const selectedOption = select.options[select.selectedIndex];

    console.log('[SharedTaskModal] MEO changed:', {
      value: selectedOption?.value,
      dataset: selectedOption?.dataset,
      meoNom: selectedOption?.dataset?.meoNom,
      programme: selectedOption?.dataset?.programme,
      strategie: selectedOption?.dataset?.strategie,
      mission: selectedOption?.dataset?.mission
    });

    if (selectedOption && selectedOption.value) {
      // Remplir les champs caches
      this.modal.setFieldValue('stm-meo-code', selectedOption.value);
      this.modal.setFieldValue('stm-meo-nom', selectedOption.dataset.meoNom || '');
      this.modal.setFieldValue('stm-strategie', selectedOption.dataset.strategieId || '');

      // Synchroniser avec le navigateur de strategies
      const strategieId = selectedOption.dataset.strategieId;
      if (strategieId) {
        this.modal.strategyModule.setSelectedStrategies([parseInt(strategieId, 10)]);
      } else {
        this.modal.strategyModule.setSelectedStrategies([]);
      }

      // Afficher les infos deduites
      const progDisplay = document.getElementById('stm-programme-display');
      const stratDisplay = document.getElementById('stm-strategie-display');
      const missDisplay = document.getElementById('stm-mission-display');

      if (progDisplay) progDisplay.textContent = selectedOption.dataset.programme || '-';
      if (stratDisplay) stratDisplay.textContent = selectedOption.dataset.strategie || '-';
      if (missDisplay) missDisplay.textContent = selectedOption.dataset.mission || '-';

      infoDiv.style.display = 'block';
    } else {
      // Vider les champs
      this.modal.setFieldValue('stm-meo-code', '');
      this.modal.setFieldValue('stm-meo-nom', '');
      this.modal.setFieldValue('stm-strategie', '');
      this.modal.strategyModule.setSelectedStrategies([]);
      infoDiv.style.display = 'none';
    }
  }

  /**
   * Peuple le selecteur de programmes
   */
  populateProgrammeSelect() {
    const select = document.getElementById('stm-programme');
    if (!select) return;

    select.innerHTML = '<option value="">-- Aucun programme --</option>';
    for (const prog of this.modal.programmes) {
      const option = document.createElement('option');
      option.value = prog.id;
      option.textContent = `${prog.code} - ${prog.nom}`;
      select.appendChild(option);
    }
  }

  /**
   * Peuple le selecteur d'agents (responsables)
   */
  populateAgentSelect() {
    const select = document.getElementById('stm-responsable');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner --</option>';

    // Grouper par bureau
    const bureaux = [...new Set(this.modal.agents.map(a => a.bureau))];

    for (const bureau of bureaux) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = bureau || 'Sans bureau';

      const agentsBureau = this.modal.agents.filter(a => a.bureau === bureau);
      for (const agent of agentsBureau) {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = agent.fullName;
        option.dataset.bureau = agent.bureau;
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }
  }

  /**
   * Peuple le selecteur de strategies
   */
  populateStrategySelect() {
    const select = document.getElementById('stm-strategie');
    if (!select) return;

    select.innerHTML = '<option value="">-- Aucune stratégie --</option>';

    // Grouper par objectif
    const objectifs = [...new Set(this.modal.strategies.map(s => s.objectif))];

    for (const objectif of objectifs) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = objectif || 'Sans objectif';

      const strategiesObj = this.modal.strategies.filter(s => s.objectif === objectif);
      for (const strat of strategiesObj) {
        const option = document.createElement('option');
        option.value = strat.id;
        const label = strat.sous_objectif
          ? `${strat.sous_objectif} > ${strat.axe_strategique}`
          : strat.axe_strategique;
        option.textContent = label;
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }
  }
}
