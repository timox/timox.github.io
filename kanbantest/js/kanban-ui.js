class KanbanUI {
  static createTaskElementHTML(record, viewMode, expandedCards, kanbanManager) {
    const isExpanded = expandedCards.has(record.id);
    
    if (viewMode === 'compact' && !isExpanded) {
      return this.createCompactTaskHTML(record, kanbanManager);
    } else {
      return this.createDetailedTaskHTML(record, viewMode, isExpanded, kanbanManager);
    }
  }

  static createCompactTaskHTML(record, kanbanManager) {
    const prio = KanbanUtils.calculerPriorite(record.urgence, record.impact);
    let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
    
    let echeanceElement = '';
    if (record.date_echeance) {
      const echeanceDate = new Date(record.date_echeance);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      echeanceDate.setHours(0, 0, 0, 0);
      
      const diffTime = echeanceDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let echeanceClass = 'echeance-ok';
      if (diffDays < 0) echeanceClass = 'echeance-depassee';
      else if (diffDays === 0) echeanceClass = 'echeance-aujourd-hui';
      else if (diffDays <= 3) echeanceClass = 'echeance-urgent';
      else if (diffDays <= 7) echeanceClass = 'echeance-bientot';
      
      const echeanceText = diffDays < 0 ? `J${diffDays}` : 
                          diffDays === 0 ? "Auj." : `J+${diffDays}`;
      
      echeanceElement = `<span class="date-echeance-compact ${echeanceClass}">
        <i class="bi bi-calendar-x"></i> ${echeanceText}
      </span>`;
    }
    
    const hasEcheanceClass = record.date_echeance ? 'has-echeance' : '';
    
    return `<div class="kanban-item kanban-item-compact ${hasEcheanceClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      <div class="compact-header">
        <div class="compact-priority">${prioBadge}</div>
        <div class="compact-echeance">${echeanceElement}</div>
        <button class="btn-expand" title="Voir détails">
          <i class="bi bi-chevron-down"></i>
        </button>
      </div>
      <div class="compact-title editable-zone">${record.titre || ''}</div>
    </div>`;
  }

  static createDetailedTaskHTML(record, viewMode, isExpanded, kanbanManager) {
    const prio = KanbanUtils.calculerPriorite(record.urgence, record.impact);
    let prioBadge = `<span class="priority-badge priority-${prio}">P${prio}</span>`;
    
    // Bouton historique
    let historyButton = '';
    if (record.historique_statuts) {
      try {
        const historyData = JSON.parse(record.historique_statuts);
        const historyCount = historyData.historique ? historyData.historique.length : 0;
        if (historyCount > 1) {
          historyButton = `<button class="btn-history" title="Voir l'historique (${historyCount} étapes)" data-task-id="${record.id}">
            <i class="bi bi-clock-history"></i> ${historyCount}
          </button>`;
        }
      } catch (e) {
        // Ignore les erreurs de parsing
      }
    }
    
    let projetTag = '';
    if (record.projet) {
      const tooltip = [
        record.strategie_objectif ? `Objectif: ${record.strategie_objectif}` : '',
        record.strategie_sous_objectif ? `Sous-objectif: ${record.strategie_sous_objectif}` : '',
        record.strategie_action ? `Action: ${record.strategie_action}` : ''
      ].filter(Boolean).join('\n');
      projetTag = `<span class="badge bg-info text-dark" title="${tooltip.replace(/"/g, '&quot;')}">${record.projet}</span>`;
    }
    
    let resumeDesc = '';
    if (record.description) {
      const latestDesc = KanbanComments.getLatestDescription(record.description);
      const mots = latestDesc.split(/\s+/).slice(0, 10).join(' ');
      resumeDesc = `<div class="desc-resume">${mots}${latestDesc.split(/\s+/).length > 10 ? '…' : ''}</div>`;
    }
    
    let personnes = '';
    if (Array.isArray(record.qui) && record.qui.length > 1) {
      personnes = '<div class="personnes-list">' +
        record.qui.slice(1).map(q => `<span class="personne-badge">${q}</span>`).join(' ') +
        '</div>';
    }
    
    let datesElement = '';
    const dateDebut = KanbanUtils.normalizeDate(record.date_debut);
    const dateEcheance = KanbanUtils.normalizeDate(record.date_echeance);
    
    if (dateDebut || dateEcheance) {
      let dateInfo = [];
      
      if (dateDebut) {
        const debutFormatted = KanbanUtils.formatDate(dateDebut);
        dateInfo.push(`<span class="date-debut" title="Début: ${debutFormatted}">
          <i class="bi bi-play-circle"></i> ${debutFormatted}
        </span>`);
      }
      
      if (dateEcheance) {
        // ... logique d'échéance (comme dans votre code existant)
        const echeanceFormatted = KanbanUtils.formatDate(dateEcheance);
        dateInfo.push(`<span class="date-echeance" title="Échéance: ${echeanceFormatted}">
          <i class="bi bi-calendar-x"></i> ${echeanceFormatted}
        </span>`);
      }
      
      if (dateInfo.length > 0) {
        datesElement = `<div class="dates-container">${dateInfo.join('')}</div>`;
      }
    }
    
    const hasEcheanceClass = dateEcheance ? 'has-echeance' : '';
    const hasDateDebutClass = dateDebut ? 'has-debut' : '';
    const collapseButton = (viewMode === 'compact' && isExpanded) ? 
      `<button class="btn-collapse" title="Réduire"><i class="bi bi-chevron-up"></i></button>` : '';
    
    return `<div class="kanban-item kanban-item-detailed ${hasEcheanceClass} ${hasDateDebutClass}" data-id="${record.id}">
      <div class="drag-handle">
        <i class="bi bi-grip-vertical"></i>
      </div>
      <div class="kanban-item-header">
        <div>${prioBadge}</div>
        <div class="item-badges">
          ${projetTag}
          ${historyButton}
          ${collapseButton}
        </div>
      </div>
      <div class="item-title editable-zone">${record.titre || ''}</div>
      ${resumeDesc}
      ${datesElement}
      ${personnes}
    </div>`;
  }
}
