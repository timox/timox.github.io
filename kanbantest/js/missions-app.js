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
let currentFilters = {
  search: '',
  priorite: '',
  categorie: '',
  bureau: ''
};
let currentViewMode = 'missions';

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

  // Délégation pour les boutons des cartes
  $('#missions-container').on('click', '.btn-voir-taches', handleVoirTaches);
  $('#missions-container').on('click', '.btn-edit-mission', handleEditMission);
  $('#sous-actions-container').on('click', '.btn-remove-sa', handleRemoveSousAction);

  logger.debug('Event listeners configured');
}

/**
 * Gère le changement de stratégie sélectionnée
 * Pré-remplit le nom de la mission et le responsable
 */
function handleStrategyChange() {
  const $selected = $('#mission-strategie option:selected');
  const strategyId = $('#mission-strategie').val();

  if (!strategyId) {
    // Aucune stratégie sélectionnée, vider les champs pré-remplis
    $('#strategy-preview').hide();
    return;
  }

  // Récupérer les données de l'option sélectionnée
  const action = $selected.data('action') || '';
  const responsable = $selected.data('responsable') || '';
  const sousObjectif = $selected.data('sous-objectif') || '';

  // Pré-remplir le nom de la mission si vide
  const $missionNom = $('#mission-nom');
  if (!$missionNom.val().trim()) {
    $missionNom.val(action);
  }

  // Pré-remplir le responsable si vide
  const $missionResponsable = $('#mission-responsable');
  if (!$missionResponsable.val().trim() && responsable) {
    $missionResponsable.val(responsable);
  }

  // Afficher l'aperçu de la stratégie
  const previewHtml = `
    <div class="alert alert-info py-2 mb-0">
      <small>
        <strong><i class="bi bi-link-45deg me-1"></i>Stratégie liée :</strong><br>
        ${sousObjectif ? `<span class="text-muted">${escapeHtml(sousObjectif)} →</span> ` : ''}
        <strong>${escapeHtml(action)}</strong>
        ${responsable ? `<br><i class="bi bi-person me-1"></i>${escapeHtml(responsable)}` : ''}
      </small>
    </div>
  `;
  $('#strategy-preview').html(previewHtml).show();

  logger.debug('Strategy selected:', { strategyId, action, responsable });
}

/**
 * Charge les données
 */
async function loadData() {
  try {
    showLoading(true);

    // Charger les stratégies depuis Ssir_strategie2
    await loadStrategies();

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
        action: gristData.action ? gristData.action[i] : '',
        responsable: gristData.responsable ? gristData.responsable[i] : '',
        echeance: gristData.echeance ? gristData.echeance[i] : '',
        portee: gristData.portee ? gristData.portee[i] : ''
      });
    }

    // Trier par objectif puis sous_objectif puis action
    strategies.sort((a, b) => {
      if (a.objectif !== b.objectif) return a.objectif.localeCompare(b.objectif);
      if (a.sous_objectif !== b.sous_objectif) return a.sous_objectif.localeCompare(b.sous_objectif);
      return a.action.localeCompare(b.action);
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
 */
function populateStrategySelector() {
  const $selector = $('#mission-strategie');
  $selector.empty();

  // Option par défaut
  $selector.append('<option value="">-- Créer sans lien stratégique --</option>');

  // Grouper par objectif
  const objectifs = [...new Set(strategies.map(s => s.objectif))];

  for (const objectif of objectifs) {
    const $optgroup = $(`<optgroup label="${escapeHtml(objectif)}"></optgroup>`);

    const strategiesForObjectif = strategies.filter(s => s.objectif === objectif);

    for (const strat of strategiesForObjectif) {
      const label = strat.sous_objectif
        ? `${strat.sous_objectif} → ${strat.action}`
        : strat.action;

      $optgroup.append(`<option value="${strat.id}"
        data-action="${escapeHtml(strat.action)}"
        data-responsable="${escapeHtml(strat.responsable)}"
        data-echeance="${escapeHtml(strat.echeance)}"
        data-sous-objectif="${escapeHtml(strat.sous_objectif)}">
        ${escapeHtml(label)}
      </option>`);
    }

    $selector.append($optgroup);
  }

  logger.debug('Strategy selector populated');
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

    if (currentViewMode === 'missions') {
      // Vue normale des missions
      missions = await missionsManager.getMissions();

      // Appliquer les filtres
      missions = await applyFilters(missions);

      if (missions.length === 0) {
        $('#empty-state').show();
        $('#missions-container').empty();
        return;
      }

      $('#empty-state').hide();
      renderMissionCards(missions);

    } else if (currentViewMode === 'categories') {
      // Vue par catégories
      await renderCategoriesView();

    } else if (currentViewMode === 'non-classifiees') {
      // Vue tâches non classifiées
      await renderUnclassifiedView();
    }
  } catch (error) {
    logger.error('Failed to display missions:', error);
    showError('Erreur d\'affichage des missions');
  }
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
  $('#modal-mission').modal('show');
}

/**
 * Ajoute un formulaire de sous-action
 */
function addSousActionForm() {
  const $template = $($('#template-sous-action-form').html());
  const count = $('#sous-actions-container .sous-action-form').length + 1;
  $template.find('.sa-code').val(`SA-${String(count).padStart(3, '0')}`);
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

    // Récupérer les données du formulaire
    const missionData = {
      code: $('#mission-code').val().trim(),
      nom: $('#mission-nom').val().trim(),
      responsable: $('#mission-responsable').val().trim(),
      bureau: $('#mission-bureau').val(),
      priorite: $('#mission-priorite').val(),
      date_debut: $('#mission-date-debut').val() || null,
      date_fin: $('#mission-date-fin').val() || null,
      // Données de liaison stratégique
      strategie_id: strategyId ? parseInt(strategyId) : null,
      strategie_objectif: selectedStrategy ? selectedStrategy.objectif : null,
      strategie_sous_objectif: selectedStrategy ? selectedStrategy.sous_objectif : null,
      strategie_action: selectedStrategy ? selectedStrategy.action : null
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
  const mission = $(e.currentTarget).closest('.mission-card-wrapper').data('mission');
  if (mission) {
    // Rediriger vers le kanban avec filtre sur la mission
    window.location.href = `index.html?mission=${encodeURIComponent(mission.code)}`;
  }
}

/**
 * Éditer une mission
 */
function handleEditMission(e) {
  const mission = $(e.currentTarget).closest('.mission-card-wrapper').data('mission');
  if (mission) {
    // TODO: Implémenter l'édition
    alert('Fonctionnalité d\'édition à venir');
  }
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

// Initialiser l'app au chargement
$(document).ready(initApp);
