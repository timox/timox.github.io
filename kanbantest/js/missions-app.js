// === missions-app.js ===
// Application principale pour la gestion des missions

import { GristManager } from './managers/GristManager.js';
import { MissionsManager } from './managers/MissionsManager.js';
import { createModuleLogger } from './utils/LoggerManager.js';

const logger = createModuleLogger('MissionsApp');

// Variables globales
let gristManager = null;
let missionsManager = null;
let strategies = []; // Liste des stratégies chargées depuis Ssir_strategie2
let agents = []; // Liste des agents chargés depuis Ssir_agents
let currentFilters = {
  search: '',
  priorite: '',
  categorie: '',
  bureau: ''
};
let currentViewMode = 'missions';
let currentEditingMissionCode = null;

/**
 * Initialise l'application
 */
async function initApp() {
  try {
    logger.debug('Initializing Missions App...');

    // Initialiser Grist (si non déjà initialisé)
    if (typeof grist !== 'undefined' && !window._gristReadyInitialized) {
      grist.ready({
        requiredAccess: 'full',
        columns: [
          { name: 'mission_code', title: 'Code Mission', optional: true },
          { name: 'mission_nom', title: 'Nom Mission', optional: true },
          { name: 'mission_responsable', title: 'Responsable Mission', optional: true },
          { name: 'mission_bureau', title: 'Bureau Mission', optional: true },
          { name: 'mission_priorite', title: 'Priorité Mission', optional: true },
          { name: 'mission_date_debut', title: 'Date Début Mission', optional: true },
          { name: 'mission_date_fin', title: 'Date Fin Mission', optional: true },
          { name: 'sous_action_code', title: 'Code Sous-action', optional: true },
          { name: 'sous_action_nom', title: 'Nom Sous-action', optional: true },
          { name: 'categorie', title: 'Catégorie', optional: true },
          { name: 'sous_action_charge_estimee', title: 'Charge Estimée', optional: true },
          { name: 'sous_action_charge_reelle', title: 'Charge Réelle', optional: true },
          { name: 'est_classifiee', title: 'Classifiée', optional: true }
        ]
      });
      window._gristReadyInitialized = true;
    }

    // Initialiser les managers
    // Note: GristManager attend un kanbanManager, on lui passe null pour l'instant
    gristManager = new GristManager(null);

    // Attendre que Grist soit prêt et les données chargées
    await new Promise((resolve) => {
      const checkReady = () => {
        if (gristManager.isConnected && gristManager.currentRecords.length >= 0) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });

    missionsManager = new MissionsManager(gristManager);

    // Initialiser l'interface
    setupEventListeners();
    await loadData();

    logger.debug('Missions App initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize app:', error);
    showError('Erreur d\'initialisation de l\'application');
  }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Boutons principaux
  $('#btn-nouvelle-mission, #btn-create-first-mission').on('click', openNewMissionModal);
  $('#btn-save-mission').on('click', saveMission);
  $('#btn-refresh').on('click', refreshData);
  $('#btn-export').on('click', exportMissions);

  // Sous-actions
  $('#btn-add-sous-action').on('click', addSousActionForm);

  // Sélecteur de stratégie - pré-remplir le nom de la mission
  $('#mission-strategie').on('change', handleStrategyChange);

  // Filtres et recherche
  $('#search-missions').on('input', debounce(handleSearch, 300));
  $('#filter-priorite').on('change', handleFilterChange);
  $('#filter-categorie').on('change', handleFilterChange);
  $('#vue-mode').on('change', handleViewModeChange);

  // Délégation pour les boutons des cartes et du tableau
  $('#missions-container, #missions-table-container').on('click', '.btn-voir-taches', handleVoirTaches);
  $('#missions-container, #missions-table-container').on('click', '.btn-edit-mission', handleEditMission);
  $('#sous-actions-container').on('click', '.btn-remove-sa', handleRemoveSousAction);

  // Bouton Classifier pour les tâches non classifiées
  $('#missions-container').on('click', '.btn-classify-task', handleClassifyTask);
  $('#btn-save-classification').on('click', saveClassification);

  logger.debug('Event listeners configured');
}

/**
 * Gère le changement de stratégie sélectionnée
 * Pré-remplit le nom de la mission et le responsable
 * Note: Une stratégie = objectif + sous_objectif + axe_strategique (une ligne de Ssir_strategie2)
 */
function handleStrategyChange() {
  const $selected = $('#mission-strategie option:selected');
  const strategyId = $('#mission-strategie').val();

  if (!strategyId) {
    // Aucune stratégie sélectionnée
    $('#strategy-preview').hide();
    return;
  }

  // Récupérer les données de l'option sélectionnée
  const objectif = $selected.data('objectif') || '';
  const sousObjectif = $selected.data('sous-objectif') || '';
  const action = $selected.data('action') || '';
  const responsable = $selected.data('responsable') || '';

  // Pré-remplir le nom de la mission si vide (avec l'axe stratégique qui est le niveau le plus précis)
  const $missionNom = $('#mission-nom');
  if (!$missionNom.val().trim()) {
    $missionNom.val(action);
  }

  // Pré-remplir le responsable si vide
  const $missionResponsable = $('#mission-responsable');
  if (!$missionResponsable.val().trim() && responsable) {
    $missionResponsable.val(responsable);
  }

  // Afficher l'aperçu de la stratégie complète (objectif > sous_objectif > axe stratégique)
  let hierarchyHtml = '';
  if (objectif) {
    hierarchyHtml += `<span class="text-primary">${escapeHtml(objectif)}</span>`;
  }
  if (sousObjectif) {
    hierarchyHtml += ` <i class="bi bi-chevron-right small"></i> <span class="text-secondary">${escapeHtml(sousObjectif)}</span>`;
  }
  if (action) {
    hierarchyHtml += ` <i class="bi bi-chevron-right small"></i> <strong>${escapeHtml(action)}</strong>`;
  }

  const previewHtml = `
    <div class="alert alert-info py-2 mb-0">
      <small>
        <strong><i class="bi bi-link-45deg me-1"></i>Stratégie liée :</strong><br>
        ${hierarchyHtml}
        ${responsable ? `<br><i class="bi bi-person me-1"></i>${escapeHtml(responsable)}` : ''}
      </small>
    </div>
  `;
  $('#strategy-preview').html(previewHtml).show();

  logger.debug('Strategy selected:', { strategyId, objectif, sousObjectif, action, responsable });
}

/**
 * Charge les données
 */
async function loadData() {
  try {
    showLoading(true);

    // Charger les stratégies depuis Ssir_strategie2
    await loadStrategies();

    // Charger les agents depuis Ssir_agents
    await loadAgents();

    // Charger les statistiques
    await updateStats();

    // Charger et afficher les missions
    await displayMissions();

    showLoading(false);
  } catch (error) {
    logger.error('Failed to load data:', error);
    showError('Erreur de chargement des données');
    showLoading(false);
  }
}

/**
 * Charge les stratégies depuis la table Ssir_strategie2
 */
async function loadStrategies() {
  try {
    logger.debug('Loading strategies from Ssir_strategie2...');

    const gristData = await window.grist.docApi.fetchTable('Ssir_strategie2');

    // Convertir les données Grist en tableau d'objets
    strategies = [];
    const count = gristData.id.length;

    for (let i = 0; i < count; i++) {
      strategies.push({
        id: gristData.id[i],
        id2: gristData.id2 ? gristData.id2[i] : gristData.id[i],
        objectif: gristData.objectif ? gristData.objectif[i] : '',
        sous_objectif: gristData.sous_objectif ? gristData.sous_objectif[i] : '',
        axe_strategique: gristData.axe_strategique ? gristData.axe_strategique[i] : '',
        responsable: gristData.responsable ? gristData.responsable[i] : '',
        echeance: gristData.echeance ? gristData.echeance[i] : '',
        portee: gristData.portee ? gristData.portee[i] : ''
      });
    }

    // Trier par objectif puis sous_objectif puis axe stratégique
    strategies.sort((a, b) => {
      if (a.objectif !== b.objectif) return a.objectif.localeCompare(b.objectif);
      if (a.sous_objectif !== b.sous_objectif) return a.sous_objectif.localeCompare(b.sous_objectif);
      return a.axe_strategique.localeCompare(b.axe_strategique);
    });

    logger.debug(`Loaded ${strategies.length} strategies`);

    // Peupler le sélecteur de stratégie
    populateStrategySelector();

  } catch (error) {
    logger.error('Failed to load strategies:', error);
    strategies = [];
  }
}

/**
 * Peuple le sélecteur de stratégie avec les données chargées
 * Une stratégie = objectif + sous_objectif + axe stratégique (une ligne complète)
 */
function populateStrategySelector() {
  const $selector = $('#mission-strategie');
  $selector.empty();

  // Option par défaut
  $selector.append('<option value="">-- Créer sans lien stratégique --</option>');

  // Grouper par objectif pour une meilleure lisibilité
  const objectifs = [...new Set(strategies.map(s => s.objectif))];

  for (const objectif of objectifs) {
    const $optgroup = $(`<optgroup label="${escapeHtml(objectif)}"></optgroup>`);

    const strategiesForObjectif = strategies.filter(s => s.objectif === objectif);

    for (const strat of strategiesForObjectif) {
      // Afficher sous_objectif > axe stratégique pour identifier la stratégie
      const label = strat.sous_objectif
        ? `${strat.sous_objectif} > ${strat.axe_strategique}`
        : strat.axe_strategique;

      $optgroup.append(`<option value="${strat.id}"
        data-objectif="${escapeHtml(strat.objectif)}"
        data-sous-objectif="${escapeHtml(strat.sous_objectif)}"
        data-action="${escapeHtml(strat.axe_strategique)}"
        data-responsable="${escapeHtml(strat.responsable)}"
        data-echeance="${escapeHtml(strat.echeance)}">
        ${escapeHtml(label)}
      </option>`);
    }

    $selector.append($optgroup);
  }

  logger.debug('Strategy selector populated with', strategies.length, 'strategies');
}

/**
 * Charge les agents depuis la table Ssir_agents
 */
async function loadAgents() {
  try {
    logger.debug('Loading agents from Ssir_agents...');

    const gristData = await window.grist.docApi.fetchTable('Ssir_agents');

    // Convertir les données Grist en tableau d'objets
    agents = [];
    const count = gristData.id?.length || 0;

    for (let i = 0; i < count; i++) {
      // Ne garder que les agents actifs
      if (gristData.actif?.[i] !== false) {
        agents.push({
          id: gristData.id[i],
          nom: gristData.nom ? gristData.nom[i] : '',
          prenom: gristData.prenom ? gristData.prenom[i] : '',
          bureau: gristData.bureau ? gristData.bureau[i] : '',
          fullName: `${gristData.prenom?.[i] || ''} ${gristData.nom?.[i] || ''}`.trim()
        });
      }
    }

    // Trier par bureau puis par nom
    agents.sort((a, b) => {
      if (a.bureau !== b.bureau) return a.bureau.localeCompare(b.bureau);
      return a.fullName.localeCompare(b.fullName);
    });

    logger.debug(`Loaded ${agents.length} agents`);

    // Peupler le sélecteur de responsable
    populateAgentSelector();

  } catch (error) {
    logger.warn('Failed to load agents:', error);
    agents = [];
  }
}

/**
 * Peuple le sélecteur de responsable avec les agents groupés par bureau
 */
function populateAgentSelector() {
  const $selector = $('#mission-responsable');
  $selector.empty();

  // Option par défaut
  $selector.append('<option value="">-- Sélectionner un responsable --</option>');

  if (agents.length === 0) {
    // Fallback si pas d'agents
    logger.debug('No agents loaded, using empty selector');
    return;
  }

  // Grouper par bureau
  const bureaux = [...new Set(agents.map(a => a.bureau))];

  for (const bureau of bureaux) {
    const $optgroup = $(`<optgroup label="${escapeHtml(bureau || 'Sans bureau')}"></optgroup>`);

    const agentsBureau = agents.filter(a => a.bureau === bureau);

    for (const agent of agentsBureau) {
      $optgroup.append(`<option value="${agent.id}" data-fullname="${escapeHtml(agent.fullName)}" data-bureau="${escapeHtml(agent.bureau)}">
        ${escapeHtml(agent.fullName)}
      </option>`);
    }

    $selector.append($optgroup);
  }

  logger.debug('Agent selector populated with', agents.length, 'agents');
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Affiche les missions
 */
async function displayMissions() {
  try {
    let missions = [];

    // Masquer tous les conteneurs
    $('#missions-container').hide();
    $('#missions-table-container').hide();
    $('#empty-state').hide();

    if (currentViewMode === 'missions') {
      // Vue cartes des missions
      missions = await missionsManager.getMissions();
      missions = await applyFilters(missions);

      if (missions.length === 0) {
        $('#empty-state').show();
        return;
      }

      renderMissionCards(missions);
      $('#missions-container').show();

    } else if (currentViewMode === 'table') {
      // Vue tableau
      missions = await missionsManager.getMissions();
      missions = await applyFilters(missions);

      if (missions.length === 0) {
        $('#empty-state').show();
        return;
      }

      renderTableView(missions);
      $('#missions-table-container').show();

    } else if (currentViewMode === 'categories') {
      // Vue par catégories
      await renderCategoriesView();
      $('#missions-container').show();

    } else if (currentViewMode === 'non-classifiees') {
      // Vue tâches non classifiées
      await renderUnclassifiedView();
      $('#missions-container').show();
    }
  } catch (error) {
    logger.error('Failed to display missions:', error);
    showError('Erreur d\'affichage des missions');
  }
}

/**
 * Rend la vue tableau des missions
 */
function renderTableView(missions) {
  const $tbody = $('#missions-table-body').empty();

  for (const mission of missions) {
    const prioriteColors = {
      'Critique': 'danger',
      'Haute': 'warning',
      'Moyenne': 'primary',
      'Basse': 'secondary'
    };

    // Calculer la progression
    const progress = mission.stats.total > 0
      ? Math.round((mission.stats.completed / mission.stats.total) * 100)
      : 0;

    // Formater les dates
    let datesText = '-';
    if (mission.date_debut || mission.date_fin) {
      const debut = mission.date_debut ? new Date(mission.date_debut).toLocaleDateString('fr-FR') : '?';
      const fin = mission.date_fin ? new Date(mission.date_fin).toLocaleDateString('fr-FR') : '?';
      datesText = `${debut} → ${fin}`;
    }

    const $row = $(`
      <tr data-mission-code="${escapeHtml(mission.code)}">
        <td><code>${escapeHtml(mission.code)}</code></td>
        <td>
          <strong>${escapeHtml(mission.nom)}</strong>
          ${mission.sous_actions.size > 0 ? `<br><small class="text-muted">${mission.sous_actions.size} sous-actions</small>` : ''}
        </td>
        <td>${escapeHtml(mission.responsable) || '<span class="text-muted">-</span>'}</td>
        <td>${escapeHtml(mission.bureau) || '<span class="text-muted">-</span>'}</td>
        <td><span class="badge bg-${prioriteColors[mission.priorite] || 'secondary'}">${escapeHtml(mission.priorite)}</span></td>
        <td><small>${datesText}</small></td>
        <td>
          <span class="badge bg-info">${mission.stats.total}</span>
          <span class="badge bg-success">${mission.stats.completed} ✓</span>
        </td>
        <td>
          <div class="progress" style="width: 80px; height: 8px;">
            <div class="progress-bar bg-success" style="width: ${progress}%"></div>
          </div>
          <small class="text-muted">${progress}%</small>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary btn-voir-taches" title="Voir tâches">
              <i class="bi bi-kanban"></i>
            </button>
            <button class="btn btn-outline-secondary btn-edit-mission" title="Modifier">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
        </td>
      </tr>
    `);

    // Stocker les données de mission pour les boutons
    $row.data('mission', mission);

    $tbody.append($row);
  }

  logger.debug(`Rendered ${missions.length} missions in table view`);
}

/**
 * Rend les cartes de missions
 */
function renderMissionCards(missions) {
  const $container = $('#missions-container').empty();

  for (const mission of missions) {
    const $card = createMissionCard(mission);
    $container.append($card);
  }

  logger.debug(`Rendered ${missions.length} mission cards`);
}

/**
 * Crée une carte de mission
 */
function createMissionCard(mission) {
  const $template = $($('#template-mission-card').html());

  // Remplir les données
  $template.find('.mission-code').text(mission.code);
  $template.find('.mission-nom').text(mission.nom);
  $template.find('.mission-responsable').text(mission.responsable || 'Non assigné');
  $template.find('.mission-bureau').text(mission.bureau || 'N/A');

  // Priorité
  const prioriteColors = {
    'Critique': 'danger',
    'Haute': 'warning',
    'Moyenne': 'primary',
    'Basse': 'secondary'
  };
  $template.find('.mission-priorite')
    .text(mission.priorite)
    .addClass(`bg-${prioriteColors[mission.priorite] || 'secondary'}`);

  // Classe de priorité pour border
  $template.find('.mission-card').addClass(`priority-${mission.priorite}`);

  // Dates
  let datesText = 'Pas de dates';
  if (mission.date_debut || mission.date_fin) {
    const debut = mission.date_debut ? new Date(mission.date_debut).toLocaleDateString() : '?';
    const fin = mission.date_fin ? new Date(mission.date_fin).toLocaleDateString() : '?';
    datesText = `${debut} → ${fin}`;
  }
  $template.find('.mission-dates').text(datesText);

  // Sous-actions
  const $saList = $template.find('.sous-actions-list').empty();
  if (mission.sous_actions.size > 0) {
    for (const sa of mission.sous_actions.values()) {
      const $saBadge = $($('#template-sous-action-badge').html());
      $saBadge.find('.badge-categorie')
        .text(getCategorieIcon(sa.categorie))
        .addClass(`badge-${sa.categorie}`);
      $saBadge.find('.sous-action-nom').text(sa.nom);
      $saBadge.find('.sous-action-code').text(sa.code);
      $saList.append($saBadge);
    }
  } else {
    $saList.html('<small class="text-muted">Aucune sous-action</small>');
  }

  // Statistiques
  $template.find('.tasks-count').text(mission.stats.total);
  $template.find('.tasks-completed').text(mission.stats.completed);

  // Stocker les données
  $template.data('mission', mission);

  return $template;
}

/**
 * Rend la vue par catégories
 */
async function renderCategoriesView() {
  const missions = await missionsManager.getMissions();
  const $container = $('#missions-container').empty();

  const categories = ['MCO', 'Projet', 'Imprévisible'];
  const categoriesData = {
    'MCO': { missions: [], taches: 0 },
    'Projet': { missions: [], taches: 0 },
    'Imprévisible': { missions: [], taches: 0 }
  };

  // Organiser par catégorie
  for (const mission of missions) {
    for (const sa of mission.sous_actions.values()) {
      if (sa.categorie && categoriesData[sa.categorie]) {
        if (!categoriesData[sa.categorie].missions.includes(mission)) {
          categoriesData[sa.categorie].missions.push(mission);
        }
        categoriesData[sa.categorie].taches += sa.taches.length;
      }
    }
  }

  // Afficher par catégorie
  for (const cat of categories) {
    const data = categoriesData[cat];
    const $section = $(`
      <div class="col-12 mb-3">
        <h4>
          ${getCategorieIcon(cat)} ${cat}
          <span class="badge bg-secondary">${data.taches} tâches</span>
        </h4>
        <div class="row g-3 category-missions-${cat}"></div>
      </div>
    `);

    const $missionsContainer = $section.find(`.category-missions-${cat}`);
    for (const mission of data.missions) {
      const $card = createMissionCard(mission);
      $missionsContainer.append($card);
    }

    $container.append($section);
  }
}

/**
 * Rend la vue des tâches non classifiées
 */
async function renderUnclassifiedView() {
  const tasks = await missionsManager.getUnclassifiedTasks();
  const $container = $('#missions-container').empty();

  if (tasks.length === 0) {
    $container.html(`
      <div class="col-12 text-center text-success py-5">
        <i class="bi bi-check-circle" style="font-size: 4rem;"></i>
        <h3>Toutes les tâches sont classifiées !</h3>
        <p>Excellent travail, aucune tâche orpheline.</p>
      </div>
    `);
    return;
  }

  $container.html(`
    <div class="col-12">
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>${tasks.length} tâches non classifiées</strong> - Elles doivent être rattachées à une mission.
      </div>
    </div>
  `);

  // TODO: Afficher la liste des tâches avec bouton "Classifier"
  for (const task of tasks.slice(0, 20)) { // Limiter à 20 pour l'affichage
    const $taskCard = $(`
      <div class="col-md-6">
        <div class="card">
          <div class="card-body">
            <h6>${task.titre}</h6>
            <p class="small text-muted">${task.description || ''}</p>
            <button class="btn btn-sm btn-primary btn-classify-task" data-task-id="${task.id}">
              <i class="bi bi-tag"></i> Classifier
            </button>
          </div>
        </div>
      </div>
    `);
    $container.append($taskCard);
  }
}

/**
 * Applique les filtres
 */
async function applyFilters(missions) {
  let filtered = missions;

  // Recherche textuelle
  if (currentFilters.search) {
    const query = currentFilters.search.toLowerCase();
    filtered = filtered.filter(m =>
      m.code.toLowerCase().includes(query) ||
      m.nom.toLowerCase().includes(query) ||
      m.responsable.toLowerCase().includes(query)
    );
  }

  // Filtre priorité
  if (currentFilters.priorite) {
    filtered = filtered.filter(m => m.priorite === currentFilters.priorite);
  }

  // Filtre catégorie
  if (currentFilters.categorie) {
    filtered = filtered.filter(m => {
      for (const sa of m.sous_actions.values()) {
        if (sa.categorie === currentFilters.categorie) return true;
      }
      return false;
    });
  }

  return filtered;
}

/**
 * Met à jour les statistiques
 */
async function updateStats() {
  try {
    const stats = await missionsManager.getStats();

    $('#stat-missions-total').text(stats.missions_actives);
    $('#stat-taches-total').text(stats.taches_total);
    $('#stat-taches-non-classifiees').text(stats.taches_non_classifiees);
    $('#stat-missions-en-retard').text(stats.missions_en_retard);

    logger.debug('Stats updated:', stats);
  } catch (error) {
    logger.error('Failed to update stats:', error);
  }
}

/**
 * Ouvre le modal de nouvelle mission
 */
function openNewMissionModal() {
  $('#modal-mission-title').text('Nouvelle Mission');
  $('#form-mission')[0].reset();
  $('#sous-actions-container').empty();
  $('#mission-code').val(generateMissionCode());
  $('#mission-strategie').val(''); // Réinitialiser le sélecteur de stratégie
  $('#strategy-preview').hide(); // Masquer l'aperçu
  $('#mission-code').prop('disabled', false);
  currentEditingMissionCode = null;
  $('#modal-mission').modal('show');
}

/**
 * Ajoute un formulaire de sous-action
 */
function addSousActionForm(initialData = {}) {
  const $template = $($('#template-sous-action-form').html());
  const count = $('#sous-actions-container .sous-action-form').length + 1;
  $template.find('.sa-code').val(initialData.code || `SA-${String(count).padStart(3, '0')}`);
  $template.find('.sa-nom').val(initialData.nom || '');
  $template.find('.sa-categorie').val(initialData.categorie || 'Projet');
  if (initialData.charge !== undefined && initialData.charge !== null) {
    $template.find('.sa-charge').val(initialData.charge);
  }
  $('#sous-actions-container').append($template);
}

/**
 * Supprime un formulaire de sous-action
 */
function handleRemoveSousAction(e) {
  $(e.currentTarget).closest('.sous-action-form').remove();
}

/**
 * Sauvegarde la mission
 */
async function saveMission() {
  try {
    // Récupérer la stratégie sélectionnée
    const strategyId = $('#mission-strategie').val();
    const selectedStrategy = strategyId ? strategies.find(s => s.id === parseInt(strategyId)) : null;

    // Récupérer le responsable sélectionné
    const responsableId = $('#mission-responsable').val();
    const $selectedAgent = $('#mission-responsable option:selected');
    const responsableFullName = $selectedAgent.data('fullname') || $selectedAgent.text().trim() || '';

    // Récupérer les données du formulaire
    const missionData = {
      code: ($('#mission-code').val().trim()) || currentEditingMissionCode,
      nom: $('#mission-nom').val().trim(),
      responsable: responsableFullName,
      responsable_id: responsableId ? parseInt(responsableId) : null,
      bureau: $('#mission-bureau').val(),
      priorite: $('#mission-priorite').val(),
      date_debut: $('#mission-date-debut').val() || null,
      date_fin: $('#mission-date-fin').val() || null,
      // Données de liaison stratégique
      strategie_id: strategyId ? parseInt(strategyId) : null,
      strategie_objectif: selectedStrategy ? selectedStrategy.objectif : null,
      strategie_sous_objectif: selectedStrategy ? selectedStrategy.sous_objectif : null,
      strategie_action: selectedStrategy ? selectedStrategy.axe_strategique : null
    };

    // Valider
    if (!missionData.code || !missionData.nom) {
      alert('Le code et le nom de la mission sont requis');
      return;
    }

    // Récupérer les sous-actions
    const sousActions = [];
    $('#sous-actions-container .sous-action-form').each(function() {
      const $form = $(this);
      const code = $form.find('.sa-code').val().trim();
      const nom = $form.find('.sa-nom').val().trim();

      if (code && nom) {
        sousActions.push({
          code: code,
          nom: nom,
          categorie: $form.find('.sa-categorie').val(),
          charge: parseFloat($form.find('.sa-charge').val()) || 0
        });
      }
    });

    // Sauvegarder
    showLoading(true);
    await missionsManager.saveMission(missionData, sousActions);

    // Fermer modal et rafraîchir
    $('#modal-mission').modal('hide');
    await refreshData();

    logger.debug('Mission saved successfully:', missionData.code);
  } catch (error) {
    logger.error('Failed to save mission:', error);
    alert('Erreur lors de la sauvegarde de la mission');
  } finally {
    showLoading(false);
  }
}

/**
 * Rafraîchit les données
 */
async function refreshData() {
  await missionsManager.refresh();
  await loadData();
  logger.debug('Data refreshed');
}

/**
 * Exporte les missions
 */
async function exportMissions() {
  try {
    const json = await missionsManager.exportMissions();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missions_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.debug('Missions exported');
  } catch (error) {
    logger.error('Failed to export missions:', error);
    alert('Erreur lors de l\'export');
  }
}

/**
 * Gère la recherche
 */
function handleSearch(e) {
  currentFilters.search = $(e.currentTarget).val();
  displayMissions();
}

/**
 * Gère le changement de filtre
 */
function handleFilterChange() {
  currentFilters.priorite = $('#filter-priorite').val();
  currentFilters.categorie = $('#filter-categorie').val();
  displayMissions();
}

/**
 * Gère le changement de mode de vue
 */
function handleViewModeChange() {
  currentViewMode = $('#vue-mode').val();
  displayMissions();
}

/**
 * Voir les tâches d'une mission
 */
function handleVoirTaches(e) {
  // Chercher dans carte ou ligne de tableau
  let mission = $(e.currentTarget).closest('.mission-card-wrapper').data('mission');
  if (!mission) {
    mission = $(e.currentTarget).closest('tr').data('mission');
  }
  if (mission) {
    // Rediriger vers le kanban avec filtre sur la mission
    window.location.href = `index.html?mission=${encodeURIComponent(mission.code)}`;
  }
}

/**
 * Éditer une mission
 */
function handleEditMission(e) {
  // Chercher dans carte ou ligne de tableau
  let mission = $(e.currentTarget).closest('.mission-card-wrapper').data('mission');
  if (!mission) {
    mission = $(e.currentTarget).closest('tr').data('mission');
  }
  if (mission) {
    $('#modal-mission-title').text('Modifier la Mission');
    $('#form-mission')[0].reset();
    $('#sous-actions-container').empty();
    $('#mission-code').val(mission.code).prop('disabled', true);
    $('#mission-nom').val(mission.nom);

    // Sélectionner le responsable (par ID ou par nom)
    if (mission.responsable_id) {
      $('#mission-responsable').val(mission.responsable_id);
    } else if (mission.responsable) {
      // Chercher l'agent par nom (legacy)
      const agent = agents.find(a => a.fullName === mission.responsable);
      if (agent) {
        $('#mission-responsable').val(agent.id);
      } else {
        $('#mission-responsable').val('');
      }
    } else {
      $('#mission-responsable').val('');
    }

    $('#mission-bureau').val(mission.bureau || '');
    $('#mission-priorite').val(mission.priorite || 'Moyenne');
    $('#mission-date-debut').val(mission.date_debut || '');
    $('#mission-date-fin').val(mission.date_fin || '');
    currentEditingMissionCode = mission.code;

    const strategyOption = findStrategyOption(mission);
    if (strategyOption) {
      $('#mission-strategie').val(String(strategyOption.id));
      handleStrategyChange();
    } else {
      $('#mission-strategie').val('');
      $('#strategy-preview').hide();
    }

    if (mission.sous_actions && mission.sous_actions.size > 0) {
      for (const sa of mission.sous_actions.values()) {
        addSousActionForm({
          code: sa.code,
          nom: sa.nom,
          categorie: sa.categorie,
          charge: sa.charge_estimee
        });
      }
    }

    $('#modal-mission').modal('show');
  }
}

function findStrategyOption(mission) {
  if (!mission || strategies.length === 0) return null;
  if (mission.strategie_id) {
    const direct = strategies.find(s => s.id === mission.strategie_id);
    if (direct) return direct;
  }
  return strategies.find(s =>
    s.objectif === mission.strategie_objectif &&
    s.sous_objectif === mission.strategie_sous_objectif &&
    s.axe_strategique === mission.strategie_action
  );
}

/**
 * Utilitaires
 */
function showLoading(show) {
  if (show) {
    $('#loading-missions').show();
    $('#missions-container').hide();
  } else {
    $('#loading-missions').hide();
    $('#missions-container').show();
  }
}

function showError(message) {
  console.error(message);
  // TODO: Afficher une notification
}

function generateMissionCode() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MIS-${year}-${random}`;
}

function getCategorieIcon(categorie) {
  const icons = {
    'MCO': '🔧',
    'Projet': '🎯',
    'Imprévisible': '⚡'
  };
  return icons[categorie] || '';
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Variable pour stocker la tâche en cours de classification
let currentTaskToClassify = null;

/**
 * Ouvre le modal de classification pour une tâche
 */
async function handleClassifyTask(e) {
  const taskId = $(e.currentTarget).data('task-id');
  const tasks = gristManager.currentRecords || [];
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    logger.error('Task not found:', taskId);
    alert('Tâche non trouvée');
    return;
  }

  currentTaskToClassify = task;
  logger.debug('Opening classification modal for task:', taskId, task.titre);

  // Peupler le sélecteur de missions
  const missions = await missionsManager.getMissions();
  const $missionSelector = $('#classify-mission-select').empty();
  $missionSelector.append('<option value="">-- Sélectionner une mission --</option>');

  for (const mission of missions) {
    $missionSelector.append(`<option value="${escapeHtml(mission.code)}"
      data-mission='${JSON.stringify({
        code: mission.code,
        nom: mission.nom,
        responsable: mission.responsable,
        bureau: mission.bureau,
        priorite: mission.priorite,
        date_debut: mission.date_debut,
        date_fin: mission.date_fin,
        strategie_id: mission.strategie_id,
        strategie_objectif: mission.strategie_objectif,
        strategie_sous_objectif: mission.strategie_sous_objectif,
        strategie_action: mission.strategie_action
      }).replace(/'/g, "&#39;")}'>
      [${escapeHtml(mission.code)}] ${escapeHtml(mission.nom)}
    </option>`);
  }

  // Mettre à jour le titre du modal avec le nom de la tâche
  $('#classify-task-title').text(task.titre);

  // Vider le sélecteur de sous-action
  $('#classify-sous-action-select').empty().append('<option value="">-- Optionnel: Sous-action --</option>');

  // Ouvrir le modal
  $('#modal-classify').modal('show');
}

/**
 * Met à jour les sous-actions disponibles quand on change de mission
 */
$('#classify-mission-select').on('change', async function() {
  const missionCode = $(this).val();
  const $sousActionSelector = $('#classify-sous-action-select').empty();
  $sousActionSelector.append('<option value="">-- Optionnel: Sous-action --</option>');

  if (!missionCode) return;

  const mission = await missionsManager.getMission(missionCode);
  if (mission && mission.sous_actions.size > 0) {
    for (const sa of mission.sous_actions.values()) {
      $sousActionSelector.append(`<option value="${escapeHtml(sa.code)}"
        data-sa='${JSON.stringify({
          code: sa.code,
          nom: sa.nom,
          categorie: sa.categorie,
          charge_estimee: sa.charge_estimee
        }).replace(/'/g, "&#39;")}'>
        [${escapeHtml(sa.code)}] ${escapeHtml(sa.nom)} (${sa.categorie || 'N/A'})
      </option>`);
    }
  }
});

/**
 * Sauvegarde la classification d'une tâche
 */
async function saveClassification() {
  if (!currentTaskToClassify) {
    alert('Aucune tâche sélectionnée');
    return;
  }

  const missionCode = $('#classify-mission-select').val();
  if (!missionCode) {
    alert('Veuillez sélectionner une mission');
    return;
  }

  try {
    showLoading(true);

    // Récupérer les données de la mission depuis l'option
    const $missionOption = $('#classify-mission-select option:selected');
    const missionData = JSON.parse($missionOption.attr('data-mission') || '{}');

    // Récupérer les données de la sous-action si sélectionnée
    let sousActionData = null;
    const sousActionCode = $('#classify-sous-action-select').val();
    if (sousActionCode) {
      const $saOption = $('#classify-sous-action-select option:selected');
      sousActionData = JSON.parse($saOption.attr('data-sa') || 'null');
    }

    logger.debug('Classifying task:', currentTaskToClassify.id, 'to mission:', missionCode);

    // Appeler attachTaskToMission
    await missionsManager.attachTaskToMission(
      currentTaskToClassify.id,
      missionCode,
      missionData,
      sousActionData
    );

    // Fermer le modal et rafraîchir
    $('#modal-classify').modal('hide');
    currentTaskToClassify = null;
    await refreshData();

    logger.debug('Task classified successfully');
  } catch (error) {
    logger.error('Failed to classify task:', error);
    alert('Erreur lors de la classification: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Initialiser l'app au chargement
$(document).ready(initApp);
