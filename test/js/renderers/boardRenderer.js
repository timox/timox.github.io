// === renderers/BoardRenderer.js ===
// Gestionnaire pour le rendu des colonnes et modes de vue du Kanban

import { STATUTS, VIEW_MODES, getStatusAccent } from '../config/constants.js';

/**
 * Gestionnaire pour le rendu des colonnes et modes de vue
 */
export class BoardRenderer {
  constructor(kanbanManager, cardRenderer) {
    this.kanban = kanbanManager;
    this.cardRenderer = cardRenderer;
    this.sortableInstances = [];
  }
  
  /**
   * Rend le Kanban selon le mode de vue spécifié
   * @param {string} viewMode - Mode de vue (compact, detailed, focus)
   * @param {Array} records - Enregistrements à afficher
   * @param {object} options - Options de rendu
   */
  renderKanban(viewMode, records = [], options = {}) {
    const {
      showTermine = true,
      focusColumn = null,
      container = null
    } = options;
    
    const kanbanContainer = container || this.kanban.kanbanContainer;
    if (!kanbanContainer) {
      console.error('BoardRenderer: Container Kanban non trouvé');
      return;
    }
    
    // Nettoyer les instances Sortable existantes
    this.destroySortableInstances();
    
    // Filtrer les statuts à afficher
    const statutsToShow = showTermine ? STATUTS : STATUTS.filter(s => s.id !== 'Terminé');
    
    // Rendu selon le mode de vue
    switch (viewMode) {
      case VIEW_MODES.FOCUS:
        this.renderFocusMode(kanbanContainer, statutsToShow, records, focusColumn);
        break;
      case VIEW_MODES.DETAILED:
        this.renderColumnMode(kanbanContainer, statutsToShow, records, VIEW_MODES.DETAILED);
        break;
      case VIEW_MODES.COMPACT:
      default:
        this.renderColumnMode(kanbanContainer, statutsToShow, records, VIEW_MODES.COMPACT);
        break;
    }
    
    // Attacher les écouteurs d'événements
    this.attachEventListeners(kanbanContainer);
    
    // Initialiser les flèches de navigation
    this.initializeScrollArrows();
  }
  
  /**
   * Rend le mode colonnes (compact ou détaillé)
   * @param {HTMLElement} container - Container principal
   * @param {Array} statuts - Statuts à afficher
   * @param {Array} records - Enregistrements
   * @param {string} mode - Mode de vue
   */
  renderColumnMode(container, statuts, records, mode) {
    // Appliquer la classe CSS appropriée
    const modeClass = mode === VIEW_MODES.COMPACT ? 'kanban-compact' : 'kanban-detailed';
    container.className = `kanban-container ${modeClass}`;
    
    let kanbanHTML = '';
    
    statuts.forEach(statut => {
      const boardId = statut.classe;
      const boardRecords = this.filterRecordsByStatus(records, statut.id);
      
      // Trier les enregistrements
      this.sortRecords(boardRecords);
      
      // Générer le HTML des cartes
      const itemsHTML = boardRecords
        .map(record => this.cardRenderer.renderTaskCard(record, mode))
        .join('');
      
      // Statistiques de la colonne
      const stats = this.calculateColumnStats(boardRecords);
      const count = boardRecords.length;
      
      // Classes CSS pour la colonne (masquer toutes les colonnes vides pour gagner de l'espace)
      const isHidden = (count === 0);
      const hiddenClass = isHidden ? ' board-hidden' : '';
      const statusClass = this.getStatusClass(statut.id);
      
      kanbanHTML += this.generateColumnHTML({
        boardId,
        statut,
        count,
        stats,
        itemsHTML,
        hiddenClass,
        statusClass,
        mode
      });
    });
    
    container.innerHTML = kanbanHTML;
    
    // Initialiser le drag & drop
    this.initializeSortable(statuts, mode);
  }
  
  /**
   * Rend le mode focus (une seule colonne)
   * @param {HTMLElement} container - Container principal
   * @param {Array} statuts - Statuts disponibles
   * @param {Array} records - Enregistrements
   * @param {string} focusColumn - Colonne en focus
   */
  renderFocusMode(container, statuts, records, focusColumn) {
    // Déterminer la colonne active
    const activeColumn = focusColumn || statuts[0]?.id || 'Backlog';
    
    // Navigation des colonnes
    const navigationHTML = this.generateFocusNavigation(statuts, records, activeColumn);
    
    // Colonne active
    const activeStatus = statuts.find(s => s.id === activeColumn);
    const boardRecords = this.filterRecordsByStatus(records, activeColumn);
    
    // Trier les enregistrements
    this.sortRecords(boardRecords);
    
    // Générer le HTML des cartes
    const itemsHTML = boardRecords
      .map(record => this.cardRenderer.renderTaskCard(record, VIEW_MODES.FOCUS))
      .join('');
    
    // Statistiques de la colonne
    const stats = this.calculateColumnStats(boardRecords);
    
    // HTML de la colonne focus
    const columnHTML = this.generateFocusColumnHTML({
      activeStatus,
      boardRecords,
      itemsHTML,
      stats,
      activeColumn
    });
    
    // Appliquer la classe CSS
    container.className = 'kanban-container kanban-focus';
    container.innerHTML = navigationHTML + columnHTML;
    
    // Initialiser le drag & drop pour le mode focus
    this.initializeFocusSortable(activeColumn);
  }
  
  /**
   * Génère le HTML d'une colonne
   * @param {object} params - Paramètres de la colonne
   * @returns {string} HTML de la colonne
   */
  generateColumnHTML(params) {
    const {
      boardId,
      statut,
      count,
      stats,
      itemsHTML,
      hiddenClass,
      statusClass,
      mode
    } = params;

    // Icône du statut
    const statusIcon = this.getStatusIcon(statut.id);

    // Couleur d'accent pour la colonne
    const accentColor = getStatusAccent(statut.id);

    // Indicateurs de performance
    const performanceIndicators = this.generatePerformanceIndicators(stats);

    return `
      <div id="board-${boardId}"
           class="kanban-board board-${boardId} ${statusClass}${hiddenClass}"
           style="--column-accent: ${accentColor};"
           data-status="${statut.id}"
           role="region"
           aria-label="Colonne ${statut.libelle}">

        <!-- Header de la colonne -->
        <div class="kanban-board-header">
          <span class="board-title">
            ${statusIcon}
            ${statut.libelle}
          </span>
          <div class="board-meta">
            ${mode === VIEW_MODES.DETAILED ? this.generateCollapseButton(statut.id, accentColor) : ''}
            <button class="board-count"
                    data-status="${statut.id}"
                    title="Filtrer par ${statut.libelle} (${count} tâche${count !== 1 ? 's' : ''})"
                    aria-label="Filtrer par ${statut.libelle}">
              ${count}
            </button>
            ${performanceIndicators}
          </div>
        </div>
        
        <!-- Corps de la colonne avec les cartes -->
        <div class="kanban-board-body" 
             id="items-${boardId}" 
             data-status="${statut.id}"
             role="list"
             aria-label="Liste des tâches ${statut.libelle}">
          ${itemsHTML}
          
          <!-- Zone de drop vide -->
          ${count === 0 ? this.generateEmptyDropZone(statut) : ''}
        </div>
        
        <!-- Footer de la colonne (optionnel) -->
        ${this.generateColumnFooter(stats, mode)}
      </div>
    `;
  }
  
  /**
   * Génère la navigation du mode focus
   * @param {Array} statuts - Statuts disponibles
   * @param {Array} records - Tous les enregistrements
   * @param {string} activeColumn - Colonne active
   * @returns {string} HTML de la navigation
   */
  generateFocusNavigation(statuts, records, activeColumn) {
    const navItems = statuts.map(statut => {
      const count = this.filterRecordsByStatus(records, statut.id).length;
      const isActive = activeColumn === statut.id;
      const activeClass = isActive ? 'active' : '';
      const icon = this.getStatusIcon(statut.id);
      
      return `
        <button class="btn btn-outline-secondary ${activeClass}" 
                data-status="${statut.id}"
                title="Voir les tâches ${statut.libelle}"
                aria-pressed="${isActive}">
          ${icon}
          ${statut.libelle} 
          <span class="badge bg-secondary">${count}</span>
        </button>
      `;
    }).join('');
    
    return `
      <div class="focus-navigation" role="tablist" aria-label="Navigation des statuts">
        ${navItems}
      </div>
    `;
  }
  
  /**
   * Génère le HTML de la colonne focus
   * @param {object} params - Paramètres de la colonne focus
   * @returns {string} HTML de la colonne focus
   */
  generateFocusColumnHTML(params) {
    const { activeStatus, boardRecords, itemsHTML, stats, activeColumn } = params;
    
    const statusIcon = this.getStatusIcon(activeStatus?.id || '');
    const performanceIndicators = this.generatePerformanceIndicators(stats);
    
    const accentColor = activeStatus ? getStatusAccent(activeStatus.id) : getStatusAccent();

    return `
      <div class="focus-column" role="tabpanel" aria-label="Tâches ${activeStatus?.libelle}" style="--column-accent: ${accentColor};">
        <div class="kanban-board-header">
          <span class="board-title">
            ${statusIcon}
            ${activeStatus?.libelle || 'Statut inconnu'}
          </span>
          <div class="board-meta">
            <span class="board-count">${boardRecords.length}</span>
            ${performanceIndicators}
          </div>
        </div>
        
        <div class="kanban-board-body" 
             id="items-focus" 
             data-status="${activeColumn}"
             role="list"
             aria-label="Liste des tâches">
          ${itemsHTML}
          
          ${boardRecords.length === 0 ? this.generateEmptyDropZone(activeStatus) : ''}
        </div>
        
        ${this.generateColumnFooter(stats, VIEW_MODES.FOCUS)}
      </div>
    `;
  }
  
  /**
   * Génère une zone de drop vide
   * @param {object} statut - Statut de la colonne
   * @returns {string} HTML de la zone vide
   */
  generateEmptyDropZone(statut) {
    const encouragementText = this.getEncouragementText(statut?.id);
    
    return `
      <div class="empty-drop-zone" role="region" aria-label="Zone de dépôt vide">
        <div class="empty-zone-content">
          <i class="bi bi-plus-circle-dotted text-muted"></i>
          <p class="text-muted small mt-2">${encouragementText}</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Génère le footer d'une colonne
   * @param {object} stats - Statistiques de la colonne
   * @param {string} mode - Mode de vue
   * @returns {string} HTML du footer
   */
  generateColumnFooter(stats, mode) {
    if (mode === VIEW_MODES.COMPACT) return '';
    
    if (!stats.totalTasks) return '';
    
    const priorityDistribution = this.generatePriorityDistribution(stats);
    
    return `
      <div class="kanban-board-footer">
        ${priorityDistribution}
      </div>
    `;
  }
  
  /**
   * Génère les indicateurs de performance d'une colonne
   * @param {object} stats - Statistiques de la colonne
   * @returns {string} HTML des indicateurs
   */
  generatePerformanceIndicators(stats) {
    const indicators = [];
    
    // Indicateur de tâches urgentes
    if (stats.urgentTasks > 0) {
      indicators.push(`
        <span class="indicator urgent" title="${stats.urgentTasks} tâche${stats.urgentTasks > 1 ? 's' : ''} urgente${stats.urgentTasks > 1 ? 's' : ''}">
          <i class="bi bi-exclamation-triangle text-danger"></i>
          ${stats.urgentTasks}
        </span>
      `);
    }
    
    // Indicateur de tâches en retard
    if (stats.overdueTasks > 0) {
      indicators.push(`
        <span class="indicator overdue" title="${stats.overdueTasks} tâche${stats.overdueTasks > 1 ? 's' : ''} en retard">
          <i class="bi bi-clock text-warning"></i>
          ${stats.overdueTasks}
        </span>
      `);
    }
    
    // Indicateur de priorité élevée
    // Indicateur de priorité élevée supprimé - trop lourd visuellement
    
    return indicators.length > 0 ? `<div class="performance-indicators">${indicators.join('')}</div>` : '';
  }

  /**
   * Génère le bouton de repliage de colonne
   * @param {string} statusId - ID du statut
   * @returns {string} HTML du bouton
   */
  generateCollapseButton(statusId, accentColor = getStatusAccent(statusId)) {
    return `
      <button class="btn-collapse-column"
              data-status="${statusId}"
              data-accent="${accentColor}"
              style="--column-accent: ${accentColor};"
              title="Replier/Déplier la colonne"
              aria-label="Replier ou déplier la colonne">
        <i class="bi bi-arrow-bar-left" aria-hidden="true"></i>
        <span class="visually-hidden">Replier la colonne ${statusId}</span>
      </button>
    `;
  }
  
  /**
   * Génère la distribution des priorités
   * @param {object} stats - Statistiques de la colonne
   * @returns {string} HTML de la distribution
   */
  generatePriorityDistribution(stats) {
    if (!stats.priorityDistribution) return '';
    
    const { priorityDistribution } = stats;
    const total = stats.totalTasks;
    
    const priorityBars = [1, 2, 3, 4].map(priority => {
      const count = priorityDistribution[priority] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const priorityClass = `priority-${priority}`;
      
      if (count === 0) return '';
      
      return `
        <div class="priority-bar ${priorityClass}" 
             style="width: ${percentage}%" 
             title="P${priority}: ${count} tâche${count > 1 ? 's' : ''} (${percentage}%)">
        </div>
      `;
    }).filter(Boolean);
    
    if (priorityBars.length === 0) return '';
    
    return `
      <div class="priority-distribution" title="Distribution des priorités">
        ${priorityBars.join('')}
      </div>
    `;
  }
  
  /**
   * Filtre les enregistrements par statut
   * @param {Array} records - Enregistrements à filtrer
   * @param {string} statusId - ID du statut
   * @returns {Array} Enregistrements filtrés
   */
  filterRecordsByStatus(records, statusId) {
    return records.filter(record => record.statut === statusId);
  }
  
  /**
   * Trie les enregistrements dans une colonne
   * @param {Array} records - Enregistrements à trier
   */
  sortRecords(records) {
    records.sort((a, b) => {
      // Tri par priorité d'abord
      const prioA = this.cardRenderer.calculatePriority(a.urgence, a.impact);
      const prioB = this.cardRenderer.calculatePriority(b.urgence, b.impact);
      
      if (prioA !== prioB) {
        return prioA - prioB; // Priorité 1 en premier
      }
      
      // Puis par échéance (plus proche en premier)
      if (a.date_echeance && b.date_echeance) {
        return new Date(a.date_echeance) - new Date(b.date_echeance);
      }
      
      if (a.date_echeance && !b.date_echeance) return -1;
      if (!a.date_echeance && b.date_echeance) return 1;
      
      // Enfin par ID (plus récent en premier)
      return b.id - a.id;
    });
  }
  
  /**
   * Calcule les statistiques d'une colonne
   * @param {Array} records - Enregistrements de la colonne
   * @returns {object} Statistiques
   */
  calculateColumnStats(records) {
    const stats = {
      totalTasks: records.length,
      urgentTasks: 0,
      overdueTasks: 0,
      highPriorityTasks: 0,
      priorityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
      averagePriority: 0
    };
    
    if (records.length === 0) return stats;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalPriority = 0;
    
    records.forEach(record => {
      const priority = this.cardRenderer.calculatePriority(record.urgence, record.impact);
      
      // Compter par priorité
      stats.priorityDistribution[priority]++;
      totalPriority += priority;
      
      // Tâches haute priorité (P1 et P2)
      if (priority <= 2) {
        stats.highPriorityTasks++;
      }
      
      // Tâches en retard
      if (record.date_echeance) {
        const echeance = new Date(record.date_echeance);
        echeance.setHours(0, 0, 0, 0);
        
        if (echeance < today) {
          stats.overdueTasks++;
        }
        
        // Tâches urgentes (échéance dans les 3 jours)
        const diffDays = Math.ceil((echeance - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          stats.urgentTasks++;
        }
      }
    });
    
    stats.averagePriority = Math.round(totalPriority / records.length * 10) / 10;
    
    return stats;
  }
  
  /**
   * Retourne l'icône appropriée pour un statut
   * @param {string} statusId - ID du statut
   * @returns {string} HTML de l'icône
   */
  getStatusIcon(statusId) {
    const icons = {
      'Backlog': '<i class="bi bi-list-ul"></i>',
      'À faire': '<i class="bi bi-calendar-plus"></i>',
      'En cours': '<i class="bi bi-play-circle"></i>',
      'En attente': '<i class="bi bi-pause-circle"></i>',
      'Bloqué': '<i class="bi bi-x-octagon"></i>',
      'Validation': '<i class="bi bi-check-circle"></i>',
      'Terminé': '<i class="bi bi-check-circle-fill"></i>'
    };
    
    return icons[statusId] || '<i class="bi bi-circle"></i>';
  }
  
  /**
   * Retourne la classe CSS pour un statut
   * @param {string} statusId - ID du statut
   * @returns {string} Classe CSS
   */
  getStatusClass(statusId) {
    const classes = {
      'Backlog': 'status-backlog',
      'À faire': 'status-todo',
      'En cours': 'status-progress',
      'En attente': 'status-waiting',
      'Bloqué': 'status-blocked',
      'Validation': 'status-validation',
      'Terminé': 'status-done'
    };
    
    return classes[statusId] || 'status-unknown';
  }
  
  /**
   * Retourne un texte d'encouragement pour les colonnes vides
   * @param {string} statusId - ID du statut
   * @returns {string} Texte d'encouragement
   */
  getEncouragementText(statusId) {
    const messages = {
      'Backlog': 'Glissez des tâches ici pour les planifier',
      'À faire': 'Prêt à démarrer de nouvelles tâches ?',
      'En cours': 'Aucune tâche en cours pour le moment',
      'En attente': 'Pas de tâches en attente actuellement',
      'Bloqué': 'Heureusement, rien n\'est bloqué !',
      'Validation': 'Rien à valider pour l\'instant',
      'Terminé': 'Aucune tâche terminée récemment'
    };
    
    return messages[statusId] || 'Glissez des tâches ici';
  }
  
  /**
   * Initialise le système de drag & drop pour les colonnes
   * @param {Array} statuts - Statuts disponibles
   * @param {string} mode - Mode de vue
   */
  initializeSortable(statuts, mode) {
    statuts.forEach(statut => {
      const boardId = statut.classe;
      const element = document.getElementById(`items-${boardId}`);
      
      if (element) {
        const sortable = new Sortable(element, {
          group: 'kanban',
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          onEnd: (evt) => this.handleDragEnd(evt, statut.id),
          onStart: (evt) => this.handleDragStart(evt),
          onMove: (evt) => this.handleDragMove(evt)
        });
        
        this.sortableInstances.push(sortable);
      }
    });
  }
  
  /**
   * Initialise le drag & drop pour le mode focus
   * @param {string} activeColumn - Colonne active
   */
  initializeFocusSortable(activeColumn) {
    const element = document.getElementById('items-focus');
    
    if (element) {
      const sortable = new Sortable(element, {
        group: 'kanban-focus',
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: (evt) => this.handleDragEnd(evt, activeColumn),
        onStart: (evt) => this.handleDragStart(evt)
      });
      
      this.sortableInstances.push(sortable);
    }
  }
  
  /**
   * Gestionnaire de début de drag
   * @param {Event} evt - Événement drag
   */
  handleDragStart(evt) {
    if (evt.item) {
      evt.item.classList.add('dragging');
      
      // Ajouter des indicateurs visuels sur les zones de drop valides
      document.querySelectorAll('.kanban-board-body').forEach(zone => {
        zone.classList.add('drop-zone-active');
      });
    }
  }
  
  /**
   * Gestionnaire de mouvement de drag
   * @param {Event} evt - Événement move
   * @returns {boolean} True pour autoriser le drop
   */
  handleDragMove(evt) {
    // Ici on pourrait ajouter des règles métier
    // Par exemple, empêcher de passer de "Terminé" à "Backlog"
    
    const fromStatus = evt.from.dataset.status;
    const toStatus = evt.to.dataset.status;
    
    // Exemple de règle : ne pas permettre de revenir en arrière depuis "Terminé"
    if (fromStatus === 'Terminé' && toStatus !== 'Terminé') {
      // On pourrait afficher un message ou demander confirmation
      return true; // Pour l'instant on autorise tout
    }
    
    return true;
  }
  
  /**
   * Gestionnaire de fin de drag
   * @param {Event} evt - Événement drag
   * @param {string} targetStatus - Statut de destination
   */
  handleDragEnd(evt, targetStatus) {
    // Nettoyer les classes visuelles
    if (evt.item) {
      evt.item.classList.remove('dragging');
    }
    
    document.querySelectorAll('.kanban-board-body').forEach(zone => {
      zone.classList.remove('drop-zone-active');
    });
    
    // Déléguer à la méthode du KanbanManager
    if (this.kanban.handleDragEnd) {
      this.kanban.handleDragEnd(evt, targetStatus);
    }
  }
  
  /**
   * Initialise les flèches de navigation horizontale
   */
  initializeScrollArrows() {
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');
    const kanbanContainer = this.kanban.kanbanContainer;
    
    if (!leftArrow || !rightArrow || !kanbanContainer) return;
    
    // Fonction pour mettre à jour la visibilité des flèches
    const updateArrows = () => {
      const scrollLeft = kanbanContainer.scrollLeft;
      const scrollWidth = kanbanContainer.scrollWidth;
      const clientWidth = kanbanContainer.clientWidth;
      
      // Afficher/masquer les flèches selon la position de scroll
      if (scrollLeft <= 0) {
        leftArrow.classList.add('hidden');
      } else {
        leftArrow.classList.remove('hidden');
      }
      
      if (scrollLeft >= scrollWidth - clientWidth - 10) {
        rightArrow.classList.add('hidden');
      } else {
        rightArrow.classList.remove('hidden');
      }
    };
    
    // Événements de scroll
    kanbanContainer.addEventListener('scroll', updateArrows);
    
    // Événements des boutons
    leftArrow.addEventListener('click', () => {
      kanbanContainer.scrollBy({ left: -300, behavior: 'smooth' });
    });
    
    rightArrow.addEventListener('click', () => {
      kanbanContainer.scrollBy({ left: 300, behavior: 'smooth' });
    });
    
    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(updateArrows);
    resizeObserver.observe(kanbanContainer);
    
    // Mettre à jour initialement
    setTimeout(updateArrows, 100);
  }
  
  /**
   * Attache les écouteurs d'événements
   * @param {HTMLElement} container - Container principal
   */
  attachEventListeners(container) {
    // Déléguer aux cartes
    if (this.cardRenderer) {
      this.cardRenderer.attachCardEventListeners(container);
    }
    
    // Navigation focus supprimée - utilise maintenant le filtre statut directement
    
    // Écouteurs pour les badges de count (filtres par statut)
    container.querySelectorAll('.board-count').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const statut = e.currentTarget.dataset.status;
        
        if (this.kanban.filterManager) {
          // Toggle du filtre statut
          const currentStatut = this.kanban.filterManager.filters.statut;
          const newStatut = currentStatut === statut ? '' : statut;
          
          // Mettre à jour le filtre
          this.kanban.filterManager.setFilter('statut', newStatut);
          
          // Mettre à jour l'interface
          this.updateBadgeStates(container, newStatut);
        }
      });
    });
    
    // Support des raccourcis clavier dans les colonnes
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.handleKeyboardNavigation(e);
      }
    });
  }
  
  /**
   * Met à jour l'état visuel des badges selon le filtre actif
   * @param {HTMLElement} container - Container principal
   * @param {string} activeStatut - Statut actuellement filtré
   */
  updateBadgeStates(container, activeStatut) {
    container.querySelectorAll('.board-count').forEach(badge => {
      const statut = badge.dataset.status;
      if (activeStatut && statut === activeStatut) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    });
  }
  
  /**
   * Gère la navigation clavier entre les colonnes
   * @param {KeyboardEvent} e - Événement clavier
   */
  handleKeyboardNavigation(e) {
    const focusedElement = document.activeElement;
    const currentColumn = focusedElement.closest('.kanban-board');
    
    if (!currentColumn) return;
    
    const allColumns = Array.from(document.querySelectorAll('.kanban-board:not(.board-hidden)'));
    const currentIndex = allColumns.indexOf(currentColumn);
    
    let nextIndex;
    if (e.key === 'ArrowLeft') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : allColumns.length - 1;
    } else {
      nextIndex = currentIndex < allColumns.length - 1 ? currentIndex + 1 : 0;
    }
    
    const nextColumn = allColumns[nextIndex];
    if (nextColumn) {
      const firstCard = nextColumn.querySelector('.kanban-item');
      if (firstCard) {
        firstCard.focus();
      } else {
        nextColumn.querySelector('.kanban-board-body').focus();
      }
    }
  }
  
  /**
   * Détruit toutes les instances Sortable
   */
  destroySortableInstances() {
    this.sortableInstances.forEach(instance => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    this.sortableInstances = [];
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    this.destroySortableInstances();
    console.log('BoardRenderer: Ressources nettoyées');
  }
}