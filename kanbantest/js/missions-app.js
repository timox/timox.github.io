// === missions-app.js ===
// Application pour la gestion des missions - Rattachement des tâches aux missions stratégiques (Ssir_strategie2)

import { GristManager } from './managers/GristManager.js';
import { createModuleLogger } from './utils/LoggerManager.js';

const logger = createModuleLogger('MissionsApp');

// Variables globales
let gristManager = null;
let strategies = []; // Liste des missions depuis Ssir_strategie2
let tasks = []; // Liste des tâches
let selectedMission = null; // Mission actuellement sélectionnée
let selectedTaskIds = new Set(); // Tâches sélectionnées
let currentTaskView = 'orphelines'; // 'orphelines' ou 'mission'

/**
 * Initialise l'application
 */
async function initApp() {
  try {
    logger.debug('Initializing Missions App...');

    // Initialiser Grist
    if (typeof grist !== 'undefined' && !window._gristReadyInitialized) {
      grist.ready({
        requiredAccess: 'full',
        columns: [
          { name: 'strategie_id', title: 'Lien Mission', optional: true },
          { name: 'titre', title: 'Titre', optional: true },
          { name: 'statut', title: 'Statut', optional: true }
        ]
      });
      window._gristReadyInitialized = true;
    }

    // Initialiser le GristManager
    gristManager = new GristManager(null);

    // Attendre que Grist soit prêt
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

    // Configurer les écouteurs
    setupEventListeners();

    // Charger les données
    await loadData();

    logger.debug('Missions App initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize app:', error);
    showToast('Erreur d\'initialisation', 'danger');
  }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Recherche missions
  $('#search-missions').on('input', debounce(renderMissionsTree, 300));

  // Expand/Collapse
  $('#btn-expand-all').on('click', () => {
    $('.programme-content, .strategie-content').addClass('show');
  });
  $('#btn-collapse-all').on('click', () => {
    $('.programme-content, .strategie-content').removeClass('show');
  });

  // Toggle task view (orphelines / mission)
  $('input[name="task-view"]').on('change', function () {
    currentTaskView = $(this).val();
    renderTasksList();
    updateActionButtons();
  });

  // Select all tasks
  $('#btn-select-all').on('click', () => {
    const $visible = $('#tasks-list .task-item:visible');
    const allSelected = $visible.length > 0 && $visible.length === $visible.filter('.selected').length;

    if (allSelected) {
      // Deselect all
      selectedTaskIds.clear();
      $visible.removeClass('selected');
    } else {
      // Select all
      $visible.each(function () {
        const id = $(this).data('task-id');
        selectedTaskIds.add(id);
        $(this).addClass('selected');
      });
    }
    updateActionButtons();
  });

  // Attach tasks button
  $('#btn-attach-tasks').on('click', openAttachModal);
  $('#btn-confirm-attach').on('click', confirmAttach);

  // Detach tasks button
  $('#btn-detach-tasks').on('click', detachTasks);

  // Délégation: click sur mission dans l'arbre
  $('#missions-tree').on('click', '.mission-item', function (e) {
    e.stopPropagation();
    const missionId = $(this).data('mission-id');
    selectMission(missionId);
  });

  // Délégation: click sur tâche
  $('#tasks-list').on('click', '.task-item', function () {
    const taskId = $(this).data('task-id');
    toggleTaskSelection(taskId, $(this));
  });

  logger.debug('Event listeners configured');
}

/**
 * Charge les données
 */
async function loadData() {
  try {
    // Charger les missions depuis Ssir_strategie2
    await loadStrategies();

    // Récupérer les tâches depuis GristManager
    tasks = gristManager.currentRecords || [];

    // Mettre à jour les stats et l'affichage
    updateStats();
    renderMissionsTree();
    renderTasksList();

    logger.debug(`Loaded ${strategies.length} missions, ${tasks.length} tasks`);
  } catch (error) {
    logger.error('Failed to load data:', error);
    showToast('Erreur de chargement', 'danger');
  }
}

/**
 * Charge les stratégies/missions depuis Ssir_strategie2
 */
async function loadStrategies() {
  try {
    const data = await window.grist.docApi.fetchTable('Ssir_strategie2');
    strategies = [];

    // Utiliser id2 car c'est le seul champ id disponible dans cette table
    if (!data?.id2) return;

    const count = data.id2.length;
    for (let i = 0; i < count; i++) {
      strategies.push({
        id: data.id2[i],
        objectif: data.objectif?.[i] || '',
        sous_objectif: data.sous_objectif?.[i] || '',
        axe_strategique: data.axe_strategique?.[i] || '',
        responsable: data.responsable?.[i] || '',
        echeance: data.echeance?.[i] || '',
        portee: data.portee?.[i] || ''
      });
    }

    // Trier
    strategies.sort((a, b) => {
      if (a.objectif !== b.objectif) return a.objectif.localeCompare(b.objectif);
      if (a.sous_objectif !== b.sous_objectif) return a.sous_objectif.localeCompare(b.sous_objectif);
      return a.axe_strategique.localeCompare(b.axe_strategique);
    });

    logger.debug(`Loaded ${strategies.length} strategies from Ssir_strategie2`);
  } catch (error) {
    logger.error('Failed to load strategies:', error);
    strategies = [];
  }
}

/**
 * Met à jour les statistiques
 */
function updateStats() {
  const totalTasks = tasks.length;
  const attachedTasks = tasks.filter(t => t.strategie_id).length;
  const orphanTasks = totalTasks - attachedTasks;

  $('#stat-missions-total').text(strategies.length);
  $('#stat-taches-total').text(totalTasks);
  $('#stat-taches-rattachees').text(attachedTasks);
  $('#stat-taches-orphelines').text(orphanTasks);
  $('#badge-orphelines').text(orphanTasks);
}

/**
 * Rend l'arbre des missions groupé par Programme → Stratégie → Mission
 */
function renderMissionsTree() {
  const $tree = $('#missions-tree');
  const searchQuery = ($('#search-missions').val() || '').toLowerCase();

  // Filtrer si recherche
  let filteredStrategies = strategies;
  if (searchQuery) {
    filteredStrategies = strategies.filter(s =>
      s.objectif.toLowerCase().includes(searchQuery) ||
      s.sous_objectif.toLowerCase().includes(searchQuery) ||
      s.axe_strategique.toLowerCase().includes(searchQuery) ||
      s.responsable.toLowerCase().includes(searchQuery)
    );
  }

  if (filteredStrategies.length === 0) {
    $tree.html(`
      <div class="text-center py-5 text-muted">
        <i class="bi bi-inbox" style="font-size: 3rem;"></i>
        <p class="mt-2">Aucune mission trouvée</p>
        <a href="config.html#strategies" class="btn btn-sm btn-primary">
          <i class="bi bi-plus me-1"></i>Créer des missions
        </a>
      </div>
    `);
    return;
  }

  // Compter les tâches par mission
  const taskCounts = {};
  tasks.forEach(t => {
    if (t.strategie_id) {
      taskCounts[t.strategie_id] = (taskCounts[t.strategie_id] || 0) + 1;
    }
  });

  // Grouper par Programme → Stratégie
  const grouped = {};
  filteredStrategies.forEach(s => {
    const prog = s.objectif || '(Sans programme)';
    const strat = s.sous_objectif || '(Sans stratégie)';

    if (!grouped[prog]) grouped[prog] = {};
    if (!grouped[prog][strat]) grouped[prog][strat] = [];
    grouped[prog][strat].push(s);
  });

  let html = '';
  const programmes = Object.keys(grouped).sort();

  programmes.forEach((prog, progIdx) => {
    const progId = `prog-${progIdx}`;
    const strategies = grouped[prog];
    const stratKeys = Object.keys(strategies).sort();

    // Compter les tâches du programme
    let progTaskCount = 0;
    stratKeys.forEach(strat => {
      strategies[strat].forEach(m => {
        progTaskCount += taskCounts[m.id] || 0;
      });
    });

    html += `
      <div class="programme-group mb-2">
        <div class="programme-header d-flex justify-content-between align-items-center"
             data-bs-toggle="collapse" data-bs-target="#${progId}">
          <span>
            <i class="bi bi-folder me-2"></i>${escapeHtml(prog)}
          </span>
          <span class="badge bg-white text-primary badge-task-count">${progTaskCount}</span>
        </div>
        <div class="collapse show" id="${progId}">
          <div class="programme-content">
    `;

    stratKeys.forEach((strat, stratIdx) => {
      const stratId = `strat-${progIdx}-${stratIdx}`;
      const missions = strategies[strat];

      // Compter les tâches de la stratégie
      let stratTaskCount = 0;
      missions.forEach(m => {
        stratTaskCount += taskCounts[m.id] || 0;
      });

      html += `
        <div class="strategie-group">
          <div class="strategie-header d-flex justify-content-between align-items-center"
               data-bs-toggle="collapse" data-bs-target="#${stratId}">
            <span>
              <i class="bi bi-diagram-2 me-2"></i>${escapeHtml(strat)}
            </span>
            <span class="badge bg-secondary badge-task-count">${stratTaskCount}</span>
          </div>
          <div class="collapse show" id="${stratId}">
            <div class="strategie-content">
      `;

      missions.forEach(m => {
        const count = taskCounts[m.id] || 0;
        const isSelected = selectedMission && selectedMission.id === m.id;
        const selectedClass = isSelected ? 'selected' : '';
        const badgeClass = count > 0 ? 'bg-success' : 'bg-secondary';

        html += `
          <div class="mission-item ${selectedClass}" data-mission-id="${m.id}">
            <div>
              <i class="bi bi-bullseye me-2 text-primary"></i>
              <strong>${escapeHtml(m.axe_strategique)}</strong>
              ${m.responsable ? `<br><small class="text-muted"><i class="bi bi-person me-1"></i>${escapeHtml(m.responsable)}</small>` : ''}
            </div>
            <span class="badge ${badgeClass} badge-task-count" title="Tâches rattachées">${count}</span>
          </div>
        `;
      });

      html += `
            </div>
          </div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;
  });

  $tree.html(html);
}

/**
 * Sélectionne une mission
 */
function selectMission(missionId) {
  // Désélectionner l'ancienne
  $('.mission-item.selected').removeClass('selected');

  // Trouver la nouvelle
  selectedMission = strategies.find(s => s.id === missionId);

  if (selectedMission) {
    $(`.mission-item[data-mission-id="${missionId}"]`).addClass('selected');

    // Mettre à jour le badge des tâches de la mission
    const missionTasks = tasks.filter(t => t.strategie_id === missionId);
    $('#badge-mission-tasks').text(missionTasks.length);

    // Si on est en vue "mission", rafraîchir la liste
    if (currentTaskView === 'mission') {
      renderTasksList();
    }
  }

  updateActionButtons();
  logger.debug('Selected mission:', selectedMission?.axe_strategique);
}

/**
 * Rend la liste des tâches (orphelines ou de la mission sélectionnée)
 */
function renderTasksList() {
  const $list = $('#tasks-list');
  selectedTaskIds.clear();

  let filteredTasks = [];
  let emptyMessage = '';

  if (currentTaskView === 'orphelines') {
    // Tâches sans strategie_id
    filteredTasks = tasks.filter(t => !t.strategie_id);
    emptyMessage = `
      <div class="text-center py-4 text-success">
        <i class="bi bi-check-circle" style="font-size: 2rem;"></i>
        <p class="mt-2 mb-0">Toutes les tâches sont rattachées !</p>
      </div>
    `;
    $('#panel-title').html('<i class="bi bi-list-task me-2"></i>Tâches orphelines');
    $('#btn-attach-tasks').show();
    $('#btn-detach-tasks').hide();
  } else {
    // Tâches de la mission sélectionnée
    if (selectedMission) {
      filteredTasks = tasks.filter(t => t.strategie_id === selectedMission.id);
      emptyMessage = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-inbox" style="font-size: 2rem;"></i>
          <p class="mt-2 mb-0">Aucune tâche rattachée à cette mission</p>
        </div>
      `;
      $('#panel-title').html(`<i class="bi bi-link me-2"></i>Tâches de: ${escapeHtml(selectedMission.axe_strategique)}`);
    } else {
      emptyMessage = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-hand-index" style="font-size: 2rem;"></i>
          <p class="mt-2 mb-0">Sélectionnez une mission pour voir ses tâches</p>
        </div>
      `;
      $('#panel-title').html('<i class="bi bi-link me-2"></i>Tâches de la mission');
    }
    $('#btn-attach-tasks').hide();
    $('#btn-detach-tasks').show();
  }

  if (filteredTasks.length === 0) {
    $list.html(emptyMessage);
    return;
  }

  // Trier par statut puis titre
  filteredTasks.sort((a, b) => {
    const statusOrder = { 'A faire': 0, 'En cours': 1, 'Bloqué': 2, 'Terminé': 3, 'Annulé': 4 };
    const statusA = statusOrder[a.statut] ?? 99;
    const statusB = statusOrder[b.statut] ?? 99;
    if (statusA !== statusB) return statusA - statusB;
    return (a.titre || '').localeCompare(b.titre || '');
  });

  const statusColors = {
    'A faire': 'secondary',
    'En cours': 'primary',
    'Bloqué': 'danger',
    'Terminé': 'success',
    'Annulé': 'dark'
  };

  let html = '';
  filteredTasks.forEach(t => {
    const badgeColor = statusColors[t.statut] || 'secondary';
    html += `
      <div class="task-item" data-task-id="${t.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="form-check">
              <input class="form-check-input task-checkbox" type="checkbox" id="task-${t.id}">
              <label class="form-check-label" for="task-${t.id}">
                <strong>${escapeHtml(t.titre || 'Sans titre')}</strong>
              </label>
            </div>
            <div class="small text-muted mt-1">
              ${t.qui ? `<span class="me-2"><i class="bi bi-person"></i> ${escapeHtml(t.qui)}</span>` : ''}
              ${t.projet ? `<span><i class="bi bi-folder"></i> ${escapeHtml(t.projet)}</span>` : ''}
            </div>
          </div>
          <span class="badge bg-${badgeColor}">${escapeHtml(t.statut || 'N/A')}</span>
        </div>
      </div>
    `;
  });

  $list.html(html);
}

/**
 * Toggle la sélection d'une tâche
 */
function toggleTaskSelection(taskId, $element) {
  if (selectedTaskIds.has(taskId)) {
    selectedTaskIds.delete(taskId);
    $element.removeClass('selected');
    $element.find('.task-checkbox').prop('checked', false);
  } else {
    selectedTaskIds.add(taskId);
    $element.addClass('selected');
    $element.find('.task-checkbox').prop('checked', true);
  }
  updateActionButtons();
}

/**
 * Met à jour les boutons d'action
 */
function updateActionButtons() {
  const count = selectedTaskIds.size;
  $('#count-selected').text(count);
  $('#count-detach').text(count);

  if (currentTaskView === 'orphelines') {
    // Pour rattacher, il faut des tâches sélectionnées ET une mission sélectionnée
    $('#btn-attach-tasks').prop('disabled', count === 0 || !selectedMission);
  } else {
    // Pour détacher, il suffit d'avoir des tâches sélectionnées
    $('#btn-detach-tasks').prop('disabled', count === 0);
  }
}

/**
 * Ouvre le modal de rattachement
 */
function openAttachModal() {
  if (!selectedMission || selectedTaskIds.size === 0) return;

  $('#attach-count').text(selectedTaskIds.size);
  $('#attach-target-info').html(`
    <div class="mb-2">
      <i class="bi bi-folder me-1"></i><strong>Programme:</strong> ${escapeHtml(selectedMission.objectif)}
    </div>
    ${selectedMission.sous_objectif ? `
      <div class="mb-2">
        <i class="bi bi-diagram-2 me-1"></i><strong>Stratégie:</strong> ${escapeHtml(selectedMission.sous_objectif)}
      </div>
    ` : ''}
    <div class="mb-2">
      <i class="bi bi-bullseye me-1"></i><strong>Mission:</strong> ${escapeHtml(selectedMission.axe_strategique)}
    </div>
    ${selectedMission.responsable ? `
      <div class="small text-muted">
        <i class="bi bi-person me-1"></i>Responsable: ${escapeHtml(selectedMission.responsable)}
      </div>
    ` : ''}
  `);

  $('#modal-attach').modal('show');
}

/**
 * Confirme le rattachement des tâches
 */
async function confirmAttach() {
  if (!selectedMission || selectedTaskIds.size === 0) return;

  try {
    const updates = [];
    selectedTaskIds.forEach(taskId => {
      updates.push(['UpdateRecord', 'Ssir_principale_task', taskId, {
        strategie_id: selectedMission.id
      }]);
    });

    await window.grist.docApi.applyUserActions(updates);

    // Mettre à jour localement
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) task.strategie_id = selectedMission.id;
    });

    $('#modal-attach').modal('hide');
    selectedTaskIds.clear();

    // Rafraîchir
    updateStats();
    renderMissionsTree();
    renderTasksList();

    showToast(`${updates.length} tâche(s) rattachée(s)`, 'success');
    logger.debug(`Attached ${updates.length} tasks to mission ${selectedMission.id}`);
  } catch (error) {
    logger.error('Failed to attach tasks:', error);
    showToast('Erreur lors du rattachement', 'danger');
  }
}

/**
 * Détache les tâches sélectionnées
 */
async function detachTasks() {
  if (selectedTaskIds.size === 0) return;

  if (!confirm(`Détacher ${selectedTaskIds.size} tâche(s) de la mission ?`)) return;

  try {
    const updates = [];
    selectedTaskIds.forEach(taskId => {
      updates.push(['UpdateRecord', 'Ssir_principale_task', taskId, {
        strategie_id: null
      }]);
    });

    await window.grist.docApi.applyUserActions(updates);

    // Mettre à jour localement
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) task.strategie_id = null;
    });

    selectedTaskIds.clear();

    // Rafraîchir
    updateStats();
    renderMissionsTree();
    renderTasksList();

    showToast(`${updates.length} tâche(s) détachée(s)`, 'success');
    logger.debug(`Detached ${updates.length} tasks`);
  } catch (error) {
    logger.error('Failed to detach tasks:', error);
    showToast('Erreur lors du détachement', 'danger');
  }
}

/**
 * Affiche un toast
 */
function showToast(message, type = 'info') {
  const toastHtml = `
    <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
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
 * Debounce
 */
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

// Initialiser au chargement
$(document).ready(initApp);
