// === taches-app.js ===
// Application de gestion des tâches et liaisons

import { GristManager } from './managers/GristManager.js';
import { initTaskLinksManager, getTaskLinksManager } from './managers/TaskLinksManager.js';
import { initConfigManager } from './managers/ConfigManager.js';
import {
  TASK_TYPES,
  TASK_TYPE_CATEGORIES,
  TASK_LINK_TYPES,
  STATUTS,
  getAllTaskTypes,
  getTaskType,
  getLinkType
} from './config/constants.js';

/**
 * Application de gestion des tâches
 */
class TachesApp {
  constructor() {
    this.gristManager = null;
    this.taskLinksManager = null;
    this.sharedTaskModal = null;
    this.network = null;
    this.nodes = null;
    this.edges = null;
    this.tasks = [];
    this.missions = []; // Missions depuis Ssir_strategie2
    this.meos = []; // Mises en œuvre agrégées depuis les tâches
    this.selectedTaskId = null;
    this.pendingLinkType = null;
    this.physicsEnabled = true;
    this.originalNodeColors = null;
    this.contextMenuTaskId = null;
    this.missionClustersEnabled = false;
  }

  /**
   * Initialise l'application
   */
  async init() {
    console.log('TachesApp: Initializing...');

    // Initialiser le ConfigManager (pour les personnes/bureaux)
    initConfigManager();

    // Initialiser les managers
    this.gristManager = new GristManager(null);

    // Attendre Grist
    await this.waitForGrist();

    // Initialiser le gestionnaire de liaisons avec les données Grist
    this.taskLinksManager = initTaskLinksManager(this.gristManager);
    this.taskLinksManager.syncFromGrist(this.gristManager.currentRecords);

    // Charger les tâches
    this.tasks = this.gristManager.currentRecords || [];

    // Charger les missions depuis Ssir_strategie2
    await this.loadMissions();

    // Agréger les MEOs depuis les tâches
    this.aggregateMeos();

    // Initialiser la modale partagée
    await this.initSharedTaskModal();

    // Initialiser l'interface
    this.setupFilters();
    this.setupEventListeners();
    this.renderTasksList();
    this.initGraph();
    this.updateStats();

    console.log('TachesApp: Ready with', this.tasks.length, 'tasks');
  }

  /**
   * Initialise la modale partagée pour l'édition des tâches
   */
  async initSharedTaskModal() {
    if (typeof SharedTaskModal === 'undefined') {
      console.warn('SharedTaskModal not available, using fallback modal');
      return;
    }

    this.sharedTaskModal = new SharedTaskModal({
      showTimes: true,
      showLinks: true,
      gristManager: this.gristManager,
      onSave: async (taskData) => {
        await this.saveTask(taskData);
      },
      onDelete: async (taskId) => {
        await this.deleteTask(taskId);
      },
      onAddLink: (task) => {
        this.sharedTaskModal.close();
        this.openAddLinkModal('RELATED_TO', task?.id);
      }
    });

    await this.sharedTaskModal.init();
    console.log('TachesApp: SharedTaskModal initialized');
  }

  /**
   * Charge les missions depuis Ssir_strategie2
   */
  async loadMissions() {
    try {
      const data = await window.grist.docApi.fetchTable('Ssir_strategie2');
      if (!data || !data.id2) {
        this.missions = [];
        return;
      }

      this.missions = [];
      for (let i = 0; i < data.id2.length; i++) {
        this.missions.push({
          id: data.id2[i],
          nom: data.axe_strategique?.[i] || '',
          objectif: data.objectif?.[i] || '',
          sous_objectif: data.sous_objectif?.[i] || ''
        });
      }
      console.log('TachesApp: Loaded', this.missions.length, 'missions');
    } catch (e) {
      console.warn('TachesApp: Could not load missions:', e);
      this.missions = [];
    }
  }

  /**
   * Agrège les MEOs depuis les tâches
   */
  aggregateMeos() {
    const meoMap = new Map();

    for (const task of this.tasks) {
      const code = task.mise_en_oeuvre_code;
      if (!code) continue;

      if (!meoMap.has(code)) {
        meoMap.set(code, {
          code: code,
          nom: task.mise_en_oeuvre_nom || code,
          strategie_id: task.strategie_id,
          mission_code: task.mission_code,
          mission_nom: task.mission_nom,
          taskCount: 0,
          tempsEstime: 0,
          tempsReel: 0
        });
      }

      const meo = meoMap.get(code);
      meo.taskCount++;
      meo.tempsEstime += parseFloat(task.temps_estime) || 0;
      meo.tempsReel += parseFloat(task.temps_reel) || 0;
    }

    // Enrichir avec les noms de mission
    this.meos = Array.from(meoMap.values()).map(meo => {
      const mission = this.missions.find(m => m.id === meo.strategie_id);
      if (mission) {
        meo.missionNom = mission.nom || `Mission #${mission.id}`;
      }
      return meo;
    });

    // Trier par mission puis par code
    this.meos.sort((a, b) => {
      const mA = a.missionNom || '';
      const mB = b.missionNom || '';
      if (mA !== mB) return mA.localeCompare(mB);
      return (a.code || '').localeCompare(b.code || '');
    });

    console.log('TachesApp: Aggregated', this.meos.length, 'MEOs');
  }

  /**
   * Retourne le nom d'une mission par son ID
   */
  getMissionName(missionId) {
    if (!missionId) return null;
    const mission = this.missions.find(m => m.id === missionId);
    return mission ? (mission.nom || `Mission #${mission.id}`) : null;
  }

  /**
   * Extrait la valeur d'un ChoiceList Grist
   */
  extractChoiceValue(value) {
    if (!value) return '';
    if (Array.isArray(value)) {
      // Format ChoiceList: ['L', 'val1', 'val2']
      if (value[0] === 'L') return value.slice(1).join(', ');
      return value.join(', ');
    }
    return String(value);
  }

  /**
   * Sauvegarde une tâche
   */
  async saveTask(taskData) {
    try {
      // Mise à jour des temps dans le gestionnaire local
      if (taskData.id && this.taskLinksManager) {
        if (taskData.temps_estime !== undefined) {
          this.taskLinksManager.setTempsEstime(taskData.id, taskData.temps_estime);
        }
        if (taskData.temps_reel !== undefined) {
          this.taskLinksManager.setTempsReel(taskData.id, taskData.temps_reel);
        }
      }

      // Sauvegarder dans Grist
      await this.gristManager.saveRecord(taskData);

      // Rafraîchir les données
      this.tasks = this.gristManager.currentRecords || [];
      this.renderTasksList();
      this.updateStats();
      this.updateGraph();

      this.showToast('Tâche enregistrée', 'success');
    } catch (error) {
      console.error('TachesApp: Save error:', error);
      this.showToast('Erreur lors de la sauvegarde', 'danger');
      throw error;
    }
  }

  /**
   * Supprime une tâche
   */
  async deleteTask(taskId) {
    try {
      await this.gristManager.deleteRecord(taskId);

      // Supprimer les liaisons
      if (this.taskLinksManager) {
        const links = this.taskLinksManager.getTaskLinks(taskId);
        for (const link of links) {
          this.taskLinksManager.removeLink(taskId, link.targetId);
        }
      }

      // Rafraîchir
      this.tasks = this.gristManager.currentRecords || [];
      this.renderTasksList();
      this.updateStats();
      this.updateGraph();

      this.showToast('Tâche supprimée', 'success');
    } catch (error) {
      console.error('TachesApp: Delete error:', error);
      this.showToast('Erreur lors de la suppression', 'danger');
      throw error;
    }
  }

  /**
   * Attend que Grist soit prêt
   */
  async waitForGrist() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.gristManager.isConnected && this.gristManager.currentRecords.length >= 0) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  // === INTERFACE ===

  /**
   * Configure les filtres
   */
  setupFilters() {
    // Filtres types de tâches
    const $filterType = $('#filter-type');
    for (const [code, type] of Object.entries(TASK_TYPES)) {
      $filterType.append(`<option value="${code}">${type.nom}</option>`);
    }

    // Filtres statuts
    const $filterStatus = $('#filter-status');
    for (const statut of STATUTS) {
      $filterStatus.append(`<option value="${statut.id}">${statut.libelle}</option>`);
    }

    // Filtres missions
    const $filterMission = $('#filter-mission');
    $filterMission.html('<option value="">Toutes missions</option>');
    for (const mission of this.missions) {
      const label = mission.nom || `Mission #${mission.id}`;
      $filterMission.append(`<option value="${mission.id}">${this.escapeHtml(label)}</option>`);
    }

    // Filtres MEO
    this.populateMeoFilter();
  }

  /**
   * Peuple le filtre MEO (optionnellement filtré par mission)
   */
  populateMeoFilter(missionId = null) {
    const $filterMeo = $('#filter-meo');
    $filterMeo.html('<option value="">Toutes MEO</option>');

    // Filtrer les MEOs si une mission est sélectionnée
    let meosToShow = this.meos;
    if (missionId) {
      meosToShow = this.meos.filter(m => m.strategie_id === parseInt(missionId));
    }

    // Grouper par mission
    const grouped = new Map();
    for (const meo of meosToShow) {
      const groupKey = meo.missionNom || 'Sans mission';
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey).push(meo);
    }

    // Ajouter les optgroups
    for (const [missionName, meosList] of grouped) {
      if (grouped.size > 1) {
        const $optgroup = $(`<optgroup label="${this.escapeHtml(missionName)}"></optgroup>`);
        for (const meo of meosList) {
          $optgroup.append(`<option value="${this.escapeHtml(meo.code)}">[${this.escapeHtml(meo.code)}] ${this.escapeHtml(meo.nom)} (${meo.taskCount})</option>`);
        }
        $filterMeo.append($optgroup);
      } else {
        for (const meo of meosList) {
          $filterMeo.append(`<option value="${this.escapeHtml(meo.code)}">[${this.escapeHtml(meo.code)}] ${this.escapeHtml(meo.nom)} (${meo.taskCount})</option>`);
        }
      }
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Recherche
    $('#search-tasks').on('input', () => this.renderTasksList());
    $('#filter-type').on('change', () => this.renderTasksList());
    $('#filter-status').on('change', () => this.renderTasksList());

    // Filtres Mission et MEO
    $('#filter-mission').on('change', () => {
      const missionId = $('#filter-mission').val();
      this.populateMeoFilter(missionId);
      $('#filter-meo').val(''); // Reset MEO filter
      this.renderTasksList();
    });
    $('#filter-meo').on('change', () => this.renderTasksList());

    // Graphe
    $('#btn-zoom-fit').on('click', () => this.network?.fit());
    $('#btn-toggle-physics').on('click', () => this.togglePhysics());
    $('#btn-group-missions').on('click', () => this.toggleMissionClusters());

    // Recherche dans le graphe avec surbrillance
    $('#graph-search').on('input', () => this.highlightGraphNodes());
    $('#graph-highlight-color').on('change', () => this.highlightGraphNodes());
    $('#btn-clear-highlight').on('click', () => this.clearGraphHighlight());

    // Ajout de liaison depuis dropdown
    $('[data-link-type]').on('click', (e) => {
      e.preventDefault();
      const linkType = $(e.currentTarget).data('link-type');
      this.openAddLinkModal(linkType);
    });

    // Modal ajout liaison
    $('#btn-confirm-add-link').on('click', () => this.confirmAddLink());
    $('#link-source-task, #link-target-task').on('change', () => this.updateLinkPreview());

    // Modal détail tâche
    $('#btn-save-task-detail').on('click', () => this.saveTaskDetail());
    $('#btn-add-link-from-detail').on('click', () => {
      const modal = bootstrap.Modal.getInstance($('#modal-task-detail')[0]);
      modal?.hide();
      this.openAddLinkModal('RELATED_TO', this.selectedTaskId);
    });

    // Clic sur tâche dans la liste
    $(document).on('click', '.task-card', (e) => {
      const taskId = parseInt($(e.currentTarget).data('task-id'));
      this.selectTask(taskId);
    });

    // Double-clic pour ouvrir le détail
    $(document).on('dblclick', '.task-card', (e) => {
      const taskId = parseInt($(e.currentTarget).data('task-id'));
      this.openTaskDetail(taskId);
    });

    // === Menu contextuel (clic droit) ===
    this.setupContextMenu();
  }

  /**
   * Configure le menu contextuel pour les tâches
   */
  setupContextMenu() {
    const $contextMenu = $('#task-context-menu');

    // Clic droit sur tâche
    $(document).on('contextmenu', '.task-card', (e) => {
      e.preventDefault();
      const taskId = parseInt($(e.currentTarget).data('task-id'));
      this.contextMenuTaskId = taskId;
      this.selectTask(taskId);

      // Positionner et afficher le menu
      $contextMenu.css({
        display: 'block',
        left: e.pageX,
        top: e.pageY
      });
    });

    // Fermer le menu au clic ailleurs
    $(document).on('click', () => {
      $contextMenu.hide();
    });

    // Fermer au scroll
    $(document).on('scroll', () => {
      $contextMenu.hide();
    });

    // Actions du menu contextuel
    $('#ctx-edit-task').on('click', (e) => {
      e.preventDefault();
      $contextMenu.hide();
      if (this.contextMenuTaskId) {
        this.openTaskDetail(this.contextMenuTaskId);
      }
    });

    $('#ctx-view-detail').on('click', (e) => {
      e.preventDefault();
      $contextMenu.hide();
      if (this.contextMenuTaskId) {
        this.openTaskDetail(this.contextMenuTaskId);
      }
    });

    $('#ctx-add-link').on('click', (e) => {
      e.preventDefault();
      $contextMenu.hide();
      if (this.contextMenuTaskId) {
        this.openAddLinkModal('RELATED_TO', this.contextMenuTaskId);
      }
    });

    $('#ctx-focus-graph').on('click', (e) => {
      e.preventDefault();
      $contextMenu.hide();
      if (this.contextMenuTaskId && this.network) {
        this.network.focus(this.contextMenuTaskId, { scale: 1.5, animation: true });
        this.network.selectNodes([this.contextMenuTaskId]);
      }
    });
  }

  /**
   * Affiche la liste des tâches
   */
  renderTasksList() {
    const search = $('#search-tasks').val().toLowerCase();
    const filterType = $('#filter-type').val();
    const filterStatus = $('#filter-status').val();
    const filterMission = $('#filter-mission').val();
    const filterMeo = $('#filter-meo').val();

    let filtered = this.tasks.filter(task => {
      // Recherche textuelle
      if (search) {
        const searchIn = `${task.titre || ''} ${task.description || ''} ${task.qui || ''}`.toLowerCase();
        if (!searchIn.includes(search)) return false;
      }

      // Filtre type
      if (filterType && task.type_tache_id !== filterType) return false;

      // Filtre statut
      if (filterStatus && task.statut !== filterStatus) return false;

      // Filtre mission
      if (filterMission && task.strategie_id !== parseInt(filterMission)) return false;

      // Filtre MEO
      if (filterMeo && task.mise_en_oeuvre_code !== filterMeo) return false;

      return true;
    });

    const $list = $('#tasks-list');

    if (filtered.length === 0) {
      $list.html(`
        <div class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1"></i>
          <p class="mt-2">Aucune tâche trouvée</p>
        </div>
      `);
      return;
    }

    const html = filtered.map(task => {
      const type = getTaskType(task.type_tache_id);
      const time = this.taskLinksManager.getTaskTime(task.id);
      const links = this.taskLinksManager.getTaskLinks(task.id);
      const isSelected = task.id === this.selectedTaskId;

      // Extraire les trigrammes V3
      const nature = this.extractChoiceValue(task.nature_activite);
      const genre = this.extractChoiceValue(task.genre_action);
      const etape = this.extractChoiceValue(task.etape_code);
      const missionName = this.getMissionName(task.strategie_id);
      const meoCode = task.mise_en_oeuvre_code;

      // Construire les badges trigrammes
      let trigrammes = '';
      if (nature || genre || etape || missionName || meoCode) {
        trigrammes = '<div class="task-card-trigrammes">';
        if (nature) trigrammes += `<span class="trigramme nature">${this.escapeHtml(nature)}</span>`;
        if (genre) trigrammes += `<span class="trigramme genre">${this.escapeHtml(genre)}</span>`;
        if (etape) trigrammes += `<span class="trigramme etape">${this.escapeHtml(etape)}</span>`;
        if (missionName) trigrammes += `<span class="trigramme mission" title="${this.escapeHtml(missionName)}">${this.escapeHtml(missionName.substring(0, 15))}${missionName.length > 15 ? '...' : ''}</span>`;
        if (meoCode) trigrammes += `<span class="trigramme meo" title="${this.escapeHtml(task.mise_en_oeuvre_nom || meoCode)}">${this.escapeHtml(meoCode)}</span>`;
        trigrammes += '</div>';
      }

      return `
        <div class="task-card ${isSelected ? 'selected' : ''}" data-task-id="${task.id}">
          <div class="task-card-title">${this.escapeHtml(task.titre || 'Sans titre')}</div>
          <div class="task-card-meta">
            ${type ? `<span class="task-type-badge ${type.categorie}"><i class="${type.icone}"></i> ${type.code}</span>` : ''}
            <span class="badge bg-secondary">${task.statut || 'N/A'}</span>
            ${time.estime > 0 ? `<span><i class="bi bi-clock"></i> ${time.estime}h</span>` : ''}
            ${links.length > 0 ? `<span><i class="bi bi-link-45deg"></i> ${links.length}</span>` : ''}
          </div>
          ${trigrammes}
        </div>
      `;
    }).join('');

    $list.html(html);
  }

  /**
   * Sélectionne une tâche
   */
  selectTask(taskId) {
    this.selectedTaskId = taskId;
    this.renderTasksList();

    // Centrer sur le nœud dans le graphe
    if (this.network && this.nodes.get(taskId)) {
      this.network.focus(taskId, { scale: 1.5, animation: true });
      this.network.selectNodes([taskId]);
    }
  }

  // === GRAPHE VIS.JS ===

  /**
   * Initialise le graphe
   */
  initGraph() {
    const container = document.getElementById('task-graph');

    if (!container) {
      console.error('Container task-graph non trouvé');
      return;
    }

    // S'assurer que le container a des dimensions
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      container.style.width = '100%';
      container.style.height = '500px';
    }

    // Créer les données
    this.nodes = new vis.DataSet();
    this.edges = new vis.DataSet();

    // Ajouter les nœuds (tâches)
    for (const task of this.tasks) {
      const type = getTaskType(task.type_tache_id);
      const color = type ? type.couleur : '#6b7280';

      this.nodes.add({
        id: task.id,
        label: this.truncate(task.titre || 'Sans titre', 30),
        color: {
          background: color,
          border: this.adjustColor(color, -20),
          highlight: {
            background: this.adjustColor(color, 20),
            border: this.adjustColor(color, -40)
          }
        },
        font: { color: '#ffffff', size: 12 },
        shape: 'box',
        margin: 10,
        borderWidth: 2
      });
    }

    // Ajouter les arêtes (liaisons)
    this.refreshEdges();

    // Options du graphe
    const options = {
      nodes: {
        shape: 'box',
        margin: { top: 10, bottom: 10, left: 10, right: 10 },
        font: { size: 12, color: '#ffffff' }
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
        smooth: { type: 'curvedCW', roundness: 0.2 },
        width: 2
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 100, fit: true },
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.5,
          springLength: 120,
          springConstant: 0.08,
          avoidOverlap: 0.5
        },
        maxVelocity: 50,
        minVelocity: 0.1
      },
      interaction: {
        hover: true,
        selectConnectedEdges: true,
        tooltipDelay: 0,
        hideNodesOnDrag: false,
        dragNodes: true,
        dragView: true,
        zoomView: true
      },
      manipulation: {
        enabled: true,
        initiallyActive: false,
        addNode: false,
        deleteNode: false,
        addEdge: (edgeData, callback) => {
          this.handleAddEdge(edgeData, callback);
        },
        deleteEdge: (edgeData, callback) => {
          this.handleDeleteEdge(edgeData, callback);
        }
      },
      layout: {
        improvedLayout: true
      }
    };

    // Créer le réseau
    this.network = new vis.Network(container, { nodes: this.nodes, edges: this.edges }, options);

    // Événements
    this.network.on('click', (params) => {
      if (params.nodes.length > 0) {
        this.selectTask(params.nodes[0]);
      }
    });

    this.network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        // Vérifier si c'est un cluster
        if (this.network.isCluster(nodeId)) {
          this.network.openCluster(nodeId);
        } else {
          this.openTaskDetail(nodeId);
        }
      }
    });

    // Menu contextuel sur les nœuds
    this.network.on('oncontext', (params) => {
      params.event.preventDefault();
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        // Ne pas afficher le menu pour les clusters
        if (this.network.isCluster(nodeId)) return;

        this.contextMenuTaskId = nodeId;
        this.selectTask(nodeId);

        const $contextMenu = $('#task-context-menu');
        $contextMenu.css({
          display: 'block',
          left: params.event.pageX,
          top: params.event.pageY
        });
      }
    });

    // Ajuster la vue après stabilisation
    this.network.once('stabilizationIterationsDone', () => {
      this.network.fit();
    });
  }

  /**
   * Rafraîchit les arêtes du graphe
   */
  refreshEdges() {
    this.edges.clear();

    const allLinks = this.taskLinksManager.getAllLinks();

    for (const link of allLinks) {
      const linkType = getLinkType(link.type);
      if (!linkType) continue;

      // Vérifier que les nœuds existent
      if (!this.nodes.get(link.source) || !this.nodes.get(link.target)) continue;

      this.edges.add({
        from: link.source,
        to: link.target,
        color: { color: linkType.couleur, highlight: linkType.couleur },
        dashes: linkType.style === 'dashed' ? [5, 5] : (linkType.style === 'dotted' ? [2, 4] : false),
        title: linkType.nom,
        arrows: link.type === 'RELATED_TO' ? { to: false } : { to: true }
      });
    }
  }

  /**
   * Met à jour le graphe avec les données actuelles
   */
  updateGraph() {
    if (!this.nodes || !this.edges) return;

    // Mettre à jour les nœuds existants et ajouter les nouveaux
    const existingIds = new Set(this.nodes.getIds());
    const currentIds = new Set(this.tasks.map(t => t.id));

    // Supprimer les nœuds qui n'existent plus
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        this.nodes.remove(id);
      }
    }

    // Ajouter ou mettre à jour les nœuds
    for (const task of this.tasks) {
      const type = getTaskType(task.type_tache_id);
      const color = type ? type.couleur : '#6b7280';

      const nodeData = {
        id: task.id,
        label: this.truncate(task.titre || 'Sans titre', 30),
        title: `#${task.id} - ${task.titre}\nStatut: ${task.statut || 'N/A'}\nType: ${type?.nom || 'Non défini'}`,
        color: {
          background: color,
          border: this.adjustColor(color, -20),
          highlight: {
            background: this.adjustColor(color, 20),
            border: this.adjustColor(color, -40)
          }
        }
      };

      if (existingIds.has(task.id)) {
        this.nodes.update(nodeData);
      } else {
        this.nodes.add({
          ...nodeData,
          font: { color: '#ffffff', size: 12 },
          shape: 'box',
          margin: 10,
          borderWidth: 2
        });
      }
    }

    // Rafraîchir les arêtes
    this.refreshEdges();
  }

  /**
   * Active/désactive la physique
   */
  togglePhysics() {
    if (!this.network) return;
    this.physicsEnabled = !this.physicsEnabled;

    try {
      // Stabiliser d'abord si on active la physique
      if (this.physicsEnabled) {
        this.network.setOptions({
          physics: {
            enabled: true,
            stabilization: { enabled: true, iterations: 50 }
          }
        });
      } else {
        this.network.setOptions({ physics: { enabled: false } });
      }
    } catch (e) {
      console.warn('Erreur toggle physique:', e);
    }

    const $btn = $('#btn-toggle-physics');
    if (this.physicsEnabled) {
      $btn.html('<i class="bi bi-snow3"></i>');
      $btn.attr('title', 'Figer les positions');
    } else {
      $btn.html('<i class="bi bi-wind"></i>');
      $btn.attr('title', 'Activer la physique');
    }
  }

  /**
   * Surbrillance des nœuds correspondant à la recherche
   */
  highlightGraphNodes() {
    if (!this.nodes || !this.network) return;

    const search = $('#graph-search').val().toLowerCase().trim();
    const highlightColor = $('#graph-highlight-color').val() || '#ff6b6b';

    // Stocker les couleurs originales si pas déjà fait
    if (!this.originalNodeColors) {
      this.originalNodeColors = {};
      this.nodes.forEach(node => {
        this.originalNodeColors[node.id] = { ...node.color };
      });
    }

    // Si recherche vide, restaurer les couleurs
    if (!search) {
      this.clearGraphHighlight();
      return;
    }

    // Parcourir tous les nœuds et mettre en surbrillance ceux qui correspondent
    const updates = [];
    const matchingIds = [];

    this.tasks.forEach(task => {
      const searchIn = `${task.id} ${task.titre || ''} ${task.description || ''} ${task.qui || ''} ${task.projet || ''}`.toLowerCase();
      const matches = searchIn.includes(search);

      if (matches) {
        matchingIds.push(task.id);
        updates.push({
          id: task.id,
          color: {
            background: highlightColor,
            border: this.adjustColor(highlightColor, -30),
            highlight: {
              background: this.adjustColor(highlightColor, 20),
              border: this.adjustColor(highlightColor, -50)
            }
          },
          borderWidth: 4
        });
      } else {
        // Remettre la couleur originale mais en plus pâle pour le contexte
        const original = this.originalNodeColors[task.id];
        if (original) {
          updates.push({
            id: task.id,
            color: {
              background: this.adjustColor(original.background || '#6b7280', 40),
              border: this.adjustColor(original.border || '#6b7280', 20),
              highlight: original.highlight
            },
            borderWidth: 2
          });
        }
      }
    });

    // Appliquer les mises à jour
    this.nodes.update(updates);

    // Afficher le compteur
    const count = matchingIds.length;
    if (count > 0) {
      this.showToast(`${count} tâche(s) trouvée(s)`, 'info');
      // Optionnel: centrer la vue sur les nœuds trouvés
      if (count <= 10) {
        this.network.fit({ nodes: matchingIds, animation: true });
      }
    }
  }

  /**
   * Effacer la surbrillance et restaurer les couleurs originales
   */
  clearGraphHighlight() {
    $('#graph-search').val('');

    if (!this.nodes || !this.originalNodeColors) return;

    const updates = [];
    this.tasks.forEach(task => {
      const original = this.originalNodeColors[task.id];
      if (original) {
        updates.push({
          id: task.id,
          color: original,
          borderWidth: 2
        });
      }
    });

    this.nodes.update(updates);
  }

  /**
   * Active/désactive le clustering par mission
   */
  toggleMissionClusters() {
    if (!this.network) return;

    this.missionClustersEnabled = !this.missionClustersEnabled;
    const $btn = $('#btn-group-missions');

    if (this.missionClustersEnabled) {
      // Créer les clusters par mission
      this.createMissionClusters();
      $btn.removeClass('btn-outline-primary').addClass('btn-primary');
      this.showToast('Groupement par mission activé', 'info');
    } else {
      // Ouvrir tous les clusters
      this.openAllClusters();
      $btn.removeClass('btn-primary').addClass('btn-outline-primary');
      this.showToast('Groupement par mission désactivé', 'info');
    }
  }

  /**
   * Crée les clusters par mission
   */
  createMissionClusters() {
    if (!this.network || !this.missions) return;

    // Couleurs pour les missions
    const missionColors = [
      '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
      '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800'
    ];

    // Cluster pour chaque mission
    this.missions.forEach((mission, index) => {
      const missionTasks = this.tasks.filter(t => t.strategie_id === mission.id);
      if (missionTasks.length === 0) return;

      const clusterColor = missionColors[index % missionColors.length];
      const missionName = mission.nom || `Mission #${mission.id}`;

      const clusterOptions = {
        joinCondition: (nodeOptions) => {
          const task = this.tasks.find(t => t.id === nodeOptions.id);
          return task && task.strategie_id === mission.id;
        },
        clusterNodeProperties: {
          id: `cluster_mission_${mission.id}`,
          label: `📁 ${missionName}\n(${missionTasks.length} tâches)`,
          shape: 'box',
          color: {
            background: clusterColor,
            border: this.adjustColor(clusterColor, -30)
          },
          font: { color: '#ffffff', size: 14, bold: true },
          margin: 15,
          borderWidth: 3
        }
      };

      this.network.cluster(clusterOptions);
    });

    // Cluster pour les tâches orphelines (sans mission)
    const orphanTasks = this.tasks.filter(t => !t.strategie_id);
    if (orphanTasks.length > 0) {
      const clusterOptions = {
        joinCondition: (nodeOptions) => {
          const task = this.tasks.find(t => t.id === nodeOptions.id);
          return task && !task.strategie_id;
        },
        clusterNodeProperties: {
          id: 'cluster_orphan',
          label: `📁 Sans mission\n(${orphanTasks.length} tâches)`,
          shape: 'box',
          color: {
            background: '#6b7280',
            border: '#4b5563'
          },
          font: { color: '#ffffff', size: 14, bold: true },
          margin: 15,
          borderWidth: 3
        }
      };

      this.network.cluster(clusterOptions);
    }

    // Ajuster la vue
    setTimeout(() => this.network.fit(), 100);
  }

  /**
   * Ouvre tous les clusters
   */
  openAllClusters() {
    if (!this.network) return;

    // Récupérer tous les nœuds qui sont des clusters
    const allNodeIds = this.network.body.data.nodes.getIds();

    for (const nodeId of allNodeIds) {
      if (this.network.isCluster(nodeId)) {
        this.network.openCluster(nodeId);
      }
    }

    // Ajuster la vue
    setTimeout(() => this.network.fit(), 100);
  }

  /**
   * Handler pour ajouter une arête graphiquement
   */
  handleAddEdge(edgeData, callback) {
    if (edgeData.from === edgeData.to) {
      this.showToast('Impossible de lier une tâche à elle-même', 'warning');
      callback(null);
      return;
    }

    // Ouvrir le modal pour choisir le type de lien
    this.pendingEdgeData = edgeData;
    this.pendingEdgeCallback = callback;
    this.openAddLinkModal('RELATED_TO', edgeData.from);

    // Pré-remplir la cible
    $('#link-target-task').val(edgeData.to);
    this.updateLinkPreview();
  }

  /**
   * Handler pour supprimer une arête graphiquement
   */
  handleDeleteEdge(edgeData, callback) {
    const edgeId = edgeData.edges[0];
    const edge = this.edges.get(edgeId);

    if (!edge) {
      callback(null);
      return;
    }

    if (confirm('Supprimer cette liaison ?')) {
      try {
        this.taskLinksManager.removeLink(edge.from, edge.to);
        callback(edgeData);
        this.showToast('Liaison supprimée', 'success');
      } catch (e) {
        this.showToast('Erreur: ' + e.message, 'danger');
        callback(null);
      }
    } else {
      callback(null);
    }
  }

  // === MODAL DÉTAIL TÂCHE ===

  /**
   * Ouvre le modal de détail d'une tâche
   */
  openTaskDetail(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    this.selectedTaskId = taskId;

    // Utiliser la modale partagée si disponible
    if (this.sharedTaskModal) {
      // Enrichir la tâche avec les données de temps du gestionnaire local
      const time = this.taskLinksManager.getTaskTime(taskId);
      const enrichedTask = {
        ...task,
        temps_estime: time.estime,
        temps_reel: time.reel
      };
      this.sharedTaskModal.open(enrichedTask);
      return;
    }

    // Fallback: ancienne modale (si SharedTaskModal non disponible)
    this.openLegacyTaskDetail(taskId, task);
  }

  /**
   * Ouvre l'ancienne modale de détail (fallback)
   */
  openLegacyTaskDetail(taskId, task) {
    const type = getTaskType(task.type_tache_id);
    const time = this.taskLinksManager.getTaskTime(taskId);
    const totalTime = this.taskLinksManager.getTotalEstimatedTime(taskId);
    const links = this.taskLinksManager.getTaskLinks(taskId);
    const incomingLinks = this.taskLinksManager.getIncomingLinks(taskId);

    // Remplir le modal
    $('#detail-title').text(task.titre || 'Sans titre');
    $('#detail-status').html(`<span class="badge bg-secondary">${task.statut || 'N/A'}</span>`);
    $('#detail-responsable').text(task.qui || 'Non assigné');

    if (type) {
      $('#detail-type').html(`
        <span class="task-type-badge ${type.categorie}">
          <i class="${type.icone}"></i> ${type.nom}
        </span>
      `);
    } else {
      $('#detail-type').html('<span class="text-muted">Non défini</span>');
    }

    $('#detail-temps-estime').val(time.estime || '');
    $('#detail-temps-reel').val(time.reel || '');
    $('#detail-temps-total').text(totalTime + 'h');
    $('#detail-links-count').text(links.length + incomingLinks.length);

    // Afficher les liaisons
    const allLinks = [
      ...links.map(l => ({ ...l, direction: 'out', sourceId: taskId })),
      ...incomingLinks.map(l => ({ ...l, direction: 'in', targetId: taskId }))
    ];

    if (allLinks.length === 0) {
      $('#detail-links-list').html('<p class="text-muted small">Aucune liaison</p>');
    } else {
      const linksHtml = allLinks.map(link => {
        const linkType = getLinkType(link.type);
        const otherTaskId = link.direction === 'out' ? link.targetId : link.sourceId;
        const otherTask = this.tasks.find(t => t.id === otherTaskId);
        const arrow = link.direction === 'out' ? 'bi-arrow-right' : 'bi-arrow-left';
        const label = link.direction === 'out' ? linkType?.nom : linkType?.nomInverse;

        return `
          <div class="link-list-item">
            <div class="link-info">
              <i class="${arrow} link-arrow"></i>
              <span class="badge" style="background-color: ${linkType?.couleur || '#6b7280'}">${label}</span>
              <span>#${otherTaskId} - ${this.truncate(otherTask?.titre || 'Tâche inconnue', 40)}</span>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="app.removeLink(${link.direction === 'out' ? taskId : otherTaskId}, ${link.direction === 'out' ? otherTaskId : taskId})">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        `;
      }).join('');

      $('#detail-links-list').html(linksHtml);
    }

    // Ouvrir le modal
    const modal = new bootstrap.Modal($('#modal-task-detail')[0]);
    modal.show();
  }

  /**
   * Sauvegarde les détails de la tâche
   */
  async saveTaskDetail() {
    if (!this.selectedTaskId) return;

    const tempsEstime = parseFloat($('#detail-temps-estime').val()) || 0;
    const tempsReel = parseFloat($('#detail-temps-reel').val()) || 0;

    try {
      this.taskLinksManager.setTempsEstime(this.selectedTaskId, tempsEstime);
      this.taskLinksManager.setTempsReel(this.selectedTaskId, tempsReel);

      // Sauvegarder dans Grist si possible
      const gristData = this.taskLinksManager.prepareForGrist(this.selectedTaskId);
      await this.gristManager.saveRecord({
        id: this.selectedTaskId,
        ...gristData
      });

      this.showToast('Temps enregistré', 'success');
      this.updateStats();
      this.renderTasksList();

      // Fermer le modal
      const modal = bootstrap.Modal.getInstance($('#modal-task-detail')[0]);
      modal?.hide();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      this.showToast('Erreur lors de la sauvegarde', 'danger');
    }
  }

  // === MODAL AJOUT LIAISON ===

  /**
   * Ouvre le modal d'ajout de liaison
   */
  openAddLinkModal(linkType, sourceTaskId = null) {
    this.pendingLinkType = linkType;

    // Remplir les sélecteurs de tâches
    const tasksOptions = this.tasks.map(t =>
      `<option value="${t.id}">#${t.id} - ${this.truncate(t.titre || 'Sans titre', 50)}</option>`
    ).join('');

    $('#link-source-task').html(`<option value="">Sélectionner...</option>${tasksOptions}`);
    $('#link-target-task').html(`<option value="">Sélectionner...</option>${tasksOptions}`);

    // Pré-sélectionner si fourni
    if (sourceTaskId) {
      $('#link-source-task').val(sourceTaskId);
    }

    // Afficher le sélecteur de type
    const typesHtml = Object.values(TASK_LINK_TYPES).map(type => `
      <div class="link-type-btn ${type.code === linkType ? 'selected' : ''}"
           data-type="${type.code}"
           onclick="app.selectLinkType('${type.code}')">
        <span class="badge" style="background-color: ${type.couleur}">${type.nom}</span>
      </div>
    `).join('');
    $('#link-type-selector').html(typesHtml);

    this.updateLinkPreview();

    // Ouvrir le modal
    const modal = new bootstrap.Modal($('#modal-add-link')[0]);
    modal.show();
  }

  /**
   * Sélectionne un type de liaison
   */
  selectLinkType(typeCode) {
    this.pendingLinkType = typeCode;
    $('.link-type-btn').removeClass('selected');
    $(`.link-type-btn[data-type="${typeCode}"]`).addClass('selected');
    this.updateLinkPreview();
  }

  /**
   * Met à jour la prévisualisation de la liaison
   */
  updateLinkPreview() {
    const sourceId = $('#link-source-task').val();
    const targetId = $('#link-target-task').val();
    const linkType = getLinkType(this.pendingLinkType);

    const sourceTask = this.tasks.find(t => t.id === parseInt(sourceId));
    const targetTask = this.tasks.find(t => t.id === parseInt(targetId));

    $('#link-preview-source').text(sourceTask ? `#${sourceTask.id}` : '?');
    $('#link-preview-target').text(targetTask ? `#${targetTask.id}` : '?');
    $('#link-preview-type').text(linkType?.nom || '?').css('background-color', linkType?.couleur || '#6b7280');
  }

  /**
   * Confirme l'ajout d'une liaison
   */
  confirmAddLink() {
    const sourceId = parseInt($('#link-source-task').val());
    const targetId = parseInt($('#link-target-task').val());

    if (!sourceId || !targetId) {
      this.showToast('Veuillez sélectionner les deux tâches', 'warning');
      return;
    }

    if (!this.pendingLinkType) {
      this.showToast('Veuillez sélectionner un type de liaison', 'warning');
      return;
    }

    try {
      this.taskLinksManager.addLink(sourceId, targetId, this.pendingLinkType);

      // Rafraîchir le graphe
      this.refreshEdges();
      this.updateStats();
      this.renderTasksList();

      this.showToast('Liaison créée', 'success');

      // Fermer le modal
      const modal = bootstrap.Modal.getInstance($('#modal-add-link')[0]);
      modal?.hide();
    } catch (error) {
      this.showToast(error.message, 'danger');
    }
  }

  /**
   * Supprime une liaison
   */
  removeLink(sourceId, targetId) {
    if (!confirm('Supprimer cette liaison ?')) return;

    try {
      this.taskLinksManager.removeLink(sourceId, targetId);
      this.refreshEdges();
      this.updateStats();

      // Rafraîchir le modal si ouvert
      if (this.selectedTaskId) {
        this.openTaskDetail(this.selectedTaskId);
      }

      this.showToast('Liaison supprimée', 'success');
    } catch (error) {
      this.showToast('Erreur lors de la suppression', 'danger');
    }
  }

  // === STATISTIQUES ===

  /**
   * Met à jour les statistiques
   */
  updateStats() {
    const stats = this.taskLinksManager.getStats();

    $('#stat-tasks-count').text(this.tasks.length);
    $('#stat-links-count').text(stats.totalLinks);
    $('#stat-hours-total').text(stats.totalEstimatedHours);
  }

  // === UTILITAIRES ===

  /**
   * Tronque un texte
   */
  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Échappe le HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Ajuste une couleur
   */
  adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Affiche un toast
   */
  showToast(message, type = 'info') {
    const toastHtml = `
      <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">${this.escapeHtml(message)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;

    const $toast = $(toastHtml);
    $('#toast-container').append($toast);

    const toast = new bootstrap.Toast($toast[0], { delay: 3000 });
    toast.show();

    $toast.on('hidden.bs.toast', () => $toast.remove());
  }
}

// === INITIALISATION ===

const app = new TachesApp();

// Exposer globalement pour les événements onclick
window.app = app;

$(document).ready(() => {
  app.init();
});
