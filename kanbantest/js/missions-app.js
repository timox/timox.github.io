// === missions-app.js ===
// Application pour la gestion des missions et mises en œuvre
// Layout: Missions (Ssir_strategie2) → Mises en œuvre → Tâches

import { GristManager } from './managers/GristManager.js';
import { createModuleLogger } from './utils/LoggerManager.js';

const logger = createModuleLogger('MissionsApp');

// Variables globales
let gristManager = null;
let missions = []; // Missions depuis Ssir_strategie2
let tasks = []; // Tâches depuis Ssir_principale_task
let selectedMission = null;
let selectedMeo = null;
let selectedTaskIds = new Set();
let taskViewMode = 'meo'; // 'meo' ou 'orphan'
let editingMeoCode = null; // Pour le mode édition
let sharedTaskModal = null; // Instance du modal de tâche partagé

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
          { name: 'mise_en_oeuvre_code', title: 'Code MEO', optional: true },
          { name: 'mise_en_oeuvre_nom', title: 'Nom MEO', optional: true },
          { name: 'titre', title: 'Titre', optional: true },
          { name: 'statut', title: 'Statut', optional: true }
        ]
      });
      window._gristReadyInitialized = true;
    }

    // Initialiser le GristManager
    gristManager = new GristManager(null);

    // Attendre que Grist soit prêt
    await waitForGrist();

    // Charger le SharedTaskModal
    await loadSharedTaskModal();

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
 * Attend que Grist soit prêt
 */
async function waitForGrist() {
  return new Promise((resolve) => {
    const checkReady = () => {
      if (gristManager.isConnected && gristManager.currentRecords.length >= 0) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
}

/**
 * Charge le script SharedTaskModal et initialise la modale
 */
async function loadSharedTaskModal() {
  try {
    // Charger le script SharedTaskModal dynamiquement
    await new Promise((resolve, reject) => {
      if (window.SharedTaskModal) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'js/components/SharedTaskModal.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    // Créer l'instance du modal
    sharedTaskModal = new window.SharedTaskModal({
      containerId: 'shared-modal-container',
      onSave: handleTaskSave,
      onDelete: handleTaskDelete,
      showLinks: true,
      showTimes: true,
      showJalons: true,
      gristManager: gristManager
    });

    await sharedTaskModal.init();
    logger.debug('SharedTaskModal initialized');
  } catch (error) {
    logger.error('Failed to load SharedTaskModal:', error);
  }
}

/**
 * Gère la sauvegarde d'une tâche depuis le modal
 */
async function handleTaskSave(taskData) {
  try {
    const isNew = !taskData.id;

    // Convertir strategie_ids en strategie_id (format Grist ReferenceList)
    if (taskData.strategie_ids && Array.isArray(taskData.strategie_ids) && taskData.strategie_ids.length > 0) {
      taskData.strategie_id = ['L', ...taskData.strategie_ids];
    }
    // Supprimer strategie_ids qui n'est pas une colonne Grist
    delete taskData.strategie_ids;

    if (isNew) {
      // Création d'une nouvelle tâche
      const result = await window.grist.docApi.applyUserActions([
        ['AddRecord', 'Ssir_principale_task', null, taskData]
      ]);
      logger.debug('Task created:', result);
      showToast('Tâche créée', 'success');
    } else {
      // Mise à jour d'une tâche existante
      const { id, ...updateData } = taskData;
      await window.grist.docApi.applyUserActions([
        ['UpdateRecord', 'Ssir_principale_task', id, updateData]
      ]);
      logger.debug('Task updated:', id);
      showToast('Tâche modifiée', 'success');
    }

    // Recharger les données
    await reloadTasks();
    renderMeoList();
    renderTasksList();
    updateCounts();
    renderMissionsList();

    return true;
  } catch (error) {
    logger.error('Failed to save task:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
    return false;
  }
}

/**
 * Gère la suppression d'une tâche depuis le modal
 */
async function handleTaskDelete(taskId) {
  try {
    await window.grist.docApi.applyUserActions([
      ['RemoveRecord', 'Ssir_principale_task', taskId]
    ]);
    logger.debug('Task deleted:', taskId);
    showToast('Tâche supprimée', 'success');

    // Recharger les données
    await reloadTasks();
    renderMeoList();
    renderTasksList();
    updateCounts();
    renderMissionsList();

    return true;
  } catch (error) {
    logger.error('Failed to delete task:', error);
    showToast('Erreur lors de la suppression', 'danger');
    return false;
  }
}

/**
 * Ouvre le modal pour créer une nouvelle tâche rattachée à la MEO sélectionnée
 */
function openNewTaskModal() {
  if (!selectedMission || !selectedMeo) {
    showToast('Sélectionnez une mise en œuvre', 'warning');
    return;
  }

  if (!sharedTaskModal) {
    showToast('Modal non disponible', 'danger');
    return;
  }

  // Ouvrir le modal en mode création
  sharedTaskModal.openNew({ statut: 'À faire' });

  // Pré-remplir les champs MEO après ouverture
  setTimeout(() => {
    // Sélectionner la MEO dans le dropdown
    const meoSelect = document.getElementById('stm-meo');
    if (meoSelect) {
      meoSelect.value = selectedMeo.code;
      // Déclencher le changement pour mettre à jour les champs dérivés
      meoSelect.dispatchEvent(new Event('change'));
    }

    // Remplir les champs cachés
    const meoCodeField = document.getElementById('stm-meo-code');
    const meoNomField = document.getElementById('stm-meo-nom');
    const strategieField = document.getElementById('stm-strategie');

    if (meoCodeField) meoCodeField.value = selectedMeo.code;
    if (meoNomField) meoNomField.value = selectedMeo.nom;
    if (strategieField) strategieField.value = selectedMission.id;

    // Afficher les infos de hiérarchie
    const hierarchyInfo = document.getElementById('stm-hierarchy-info');
    if (hierarchyInfo) {
      hierarchyInfo.style.display = 'block';
      const programmeDisplay = document.getElementById('stm-programme-display');
      const strategieDisplay = document.getElementById('stm-strategie-display');
      const missionDisplay = document.getElementById('stm-mission-display');

      if (programmeDisplay) programmeDisplay.textContent = selectedMission.objectif || '-';
      if (strategieDisplay) strategieDisplay.textContent = selectedMission.sous_objectif || '-';
      if (missionDisplay) missionDisplay.textContent = selectedMission.axe_strategique || '-';
    }
  }, 100);
}

/**
 * Ouvre le modal pour modifier une tâche existante
 */
function openEditTaskModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    showToast('Tâche non trouvée', 'warning');
    return;
  }

  if (!sharedTaskModal) {
    showToast('Modal non disponible', 'danger');
    return;
  }

  sharedTaskModal.open(task);
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Recherche missions
  $('#search-missions').on('input', debounce(renderMissionsList, 300));

  // Click sur mission
  $('#missions-list').on('click', '.mission-item', function() {
    const missionId = $(this).data('mission-id');
    selectMission(missionId);
  });

  // Click sur MEO
  $('#meo-list').on('click', '.meo-item', function() {
    const meoCode = $(this).data('meo-code');
    selectMeo(meoCode);
  });

  // Click sur tâche (sélection)
  $('#tasks-list').on('click', '.task-item', function(e) {
    // Ne pas sélectionner si on clique sur la checkbox
    if ($(e.target).hasClass('task-checkbox')) return;
    const taskId = $(this).data('task-id');
    toggleTaskSelection(taskId, $(this));
  });

  // Double-click sur tâche (édition)
  $('#tasks-list').on('dblclick', '.task-item', function() {
    const taskId = $(this).data('task-id');
    openEditTaskModal(taskId);
  });

  // Bouton ajouter tâche
  $('#btn-add-task').on('click', openNewTaskModal);

  // Bouton ajouter MEO
  $('#btn-add-meo').on('click', () => openMeoModal(false));

  // Bouton sauvegarder MEO
  $('#btn-save-meo').on('click', saveMeo);

  // Bouton éditer MEO
  $('#btn-edit-meo').on('click', editSelectedMeo);

  // Bouton supprimer MEO
  $('#btn-delete-meo').on('click', deleteSelectedMeo);

  // Toggle vue tâches (MEO / orphelines)
  $('#btn-view-meo-tasks').on('click', function() {
    taskViewMode = 'meo';
    $(this).addClass('active');
    $('#btn-view-orphan-tasks').removeClass('active');
    renderTasksList();
    updateTasksActionButtons();
  });

  $('#btn-view-orphan-tasks').on('click', function() {
    taskViewMode = 'orphan';
    $(this).addClass('active');
    $('#btn-view-meo-tasks').removeClass('active');
    renderTasksList();
    updateTasksActionButtons();
  });

  // Sélectionner toutes les tâches
  $('#btn-select-all-tasks').on('click', selectAllTasks);

  // Affecter tâches
  $('#btn-attach-tasks').on('click', openAttachModal);
  $('#btn-confirm-attach').on('click', confirmAttach);

  // Détacher tâches
  $('#btn-detach-tasks').on('click', detachTasks);

  logger.debug('Event listeners configured');
}

/**
 * Charge les données
 */
async function loadData() {
  try {
    await loadMissions();
    await reloadTasks();

    renderMissionsList();
    updateCounts();

    logger.debug(`Loaded ${missions.length} missions, ${tasks.length} tasks`);
  } catch (error) {
    logger.error('Failed to load data:', error);
    showToast('Erreur de chargement', 'danger');
  }
}

/**
 * Recharge les tâches depuis Grist
 */
async function reloadTasks() {
  try {
    const data = await window.grist.docApi.fetchTable('Ssir_principale_task');
    tasks = [];

    if (data?.id) {
      for (let i = 0; i < data.id.length; i++) {
        const task = { id: data.id[i] };
        Object.keys(data).forEach(key => {
          if (key !== 'id') {
            task[key] = data[key][i];
          }
        });
        tasks.push(task);
      }
    }

    console.log(`[MEO] Reloaded ${tasks.length} tasks`);
    // Compter les tâches avec mise_en_oeuvre_code
    const tasksWithMeo = tasks.filter(t => t.mise_en_oeuvre_code);
    console.log(`[MEO] Tasks with mise_en_oeuvre_code: ${tasksWithMeo.length}`);
    if (tasksWithMeo.length > 0) {
      console.log('[MEO] Sample tasks with MEO:', tasksWithMeo.slice(0, 3).map(t => ({
        id: t.id,
        titre: t.titre,
        strategie_id: t.strategie_id,
        mise_en_oeuvre_code: t.mise_en_oeuvre_code
      })));
    }
  } catch (error) {
    logger.error('Failed to reload tasks:', error);
    // Fallback sur gristManager
    tasks = gristManager.currentRecords || [];
  }
}

/**
 * Charge les missions depuis Ssir_strategie2
 */
async function loadMissions() {
  try {
    const data = await window.grist.docApi.fetchTable('Ssir_strategie2');
    missions = [];

    if (!data?.id2) return;

    const count = data.id2.length;
    for (let i = 0; i < count; i++) {
      missions.push({
        id: data.id2[i],
        objectif: data.objectif?.[i] || '',
        sous_objectif: data.sous_objectif?.[i] || '',
        axe_strategique: data.axe_strategique?.[i] || '',
        responsable: data.responsable?.[i] || '',
        echeance: data.echeance?.[i] || '',
        portee: data.portee?.[i] || ''
      });
    }

    // Trier par programme, stratégie, mission
    missions.sort((a, b) => {
      if (a.objectif !== b.objectif) return a.objectif.localeCompare(b.objectif);
      if (a.sous_objectif !== b.sous_objectif) return a.sous_objectif.localeCompare(b.sous_objectif);
      return a.axe_strategique.localeCompare(b.axe_strategique);
    });

    console.log(`[MEO] Loaded ${missions.length} missions from Ssir_strategie2`);
    console.log('[MEO] Sample missions:', missions.slice(0, 3).map(m => ({ id: m.id, nom: m.axe_strategique })));
  } catch (error) {
    logger.error('Failed to load missions:', error);
    missions = [];
  }
}

/**
 * Met à jour les compteurs
 */
function updateCounts() {
  $('#count-missions').text(missions.length);

  // Compter les MEO de la mission sélectionnée
  if (selectedMission) {
    const meos = getMeosForMission(selectedMission.id);
    $('#count-meo').text(meos.length);
  } else {
    $('#count-meo').text(0);
  }

  // Compter les tâches visibles
  if (taskViewMode === 'orphan') {
    const orphans = getOrphanTasks();
    $('#count-tasks').text(orphans.length);
  } else if (selectedMeo) {
    const meoTasks = getTasksForMeo(selectedMeo.code);
    $('#count-tasks').text(meoTasks.length);
  } else {
    $('#count-tasks').text(0);
  }
}

/**
 * Extrait l'ID réel depuis un champ de référence Grist
 * Format Grist: ["L", id] ou nombre direct ou null
 */
function extractGristRefId(value) {
  if (value === null || value === undefined) {
    return null;
  }
  // Format Grist ["L", id]
  if (Array.isArray(value) && value.length >= 2 && value[0] === 'L') {
    return value[1];
  }
  // Nombre direct
  if (typeof value === 'number') {
    return value;
  }
  // String numérique
  if (typeof value === 'string' && !isNaN(parseInt(value, 10))) {
    return parseInt(value, 10);
  }
  return null;
}

/**
 * Récupère les MEO pour une mission donnée (agrégées depuis les tâches)
 */
function getMeosForMission(missionId) {
  const meoMap = new Map();

  console.log(`[MEO] getMeosForMission: Looking for missionId=${missionId} (type: ${typeof missionId}) in ${tasks.length} tasks`);

  // Log quelques tâches pour voir les valeurs de strategie_id
  const sampleTasks = tasks.slice(0, 5);
  sampleTasks.forEach((t, i) => {
    const extractedId = extractGristRefId(t.strategie_id);
    console.log(`[MEO] Task ${i}: strategie_id=${t.strategie_id} → extracted=${extractedId}, mise_en_oeuvre_code=${t.mise_en_oeuvre_code}`);
  });

  tasks.forEach(task => {
    // Extraire l'ID réel depuis le format Grist ["L", id]
    const taskMissionId = extractGristRefId(task.strategie_id);
    const matchesMission = taskMissionId !== null && taskMissionId === missionId;
    if (matchesMission && task.mise_en_oeuvre_code) {
      const code = task.mise_en_oeuvre_code;
      if (!meoMap.has(code)) {
        meoMap.set(code, {
          code: code,
          nom: task.mise_en_oeuvre_nom || 'Sans nom',
          categorie: task.categorie || 'Projet',
          charge_estimee: task.mise_en_oeuvre_charge_estimee || 0,
          charge_reelle: task.mise_en_oeuvre_charge_reelle || 0,
          taskCount: 0,
          completedCount: 0
        });
      }
      const meo = meoMap.get(code);
      meo.taskCount++;
      if (task.statut === 'Terminé') {
        meo.completedCount++;
      }
    }
  });

  const result = Array.from(meoMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  console.log(`[MEO] getMeosForMission: Found ${result.length} MEOs`, result.map(m => m.code));
  return result;
}

/**
 * Récupère les tâches pour une MEO donnée
 */
function getTasksForMeo(meoCode) {
  return tasks.filter(t => {
    const taskMissionId = extractGristRefId(t.strategie_id);
    return taskMissionId === selectedMission?.id && t.mise_en_oeuvre_code === meoCode;
  });
}

/**
 * Récupère les tâches orphelines (sans strategie_id ni mise_en_oeuvre_code)
 */
function getOrphanTasks() {
  return tasks.filter(t => {
    const missionId = extractGristRefId(t.strategie_id);
    return missionId === null || !t.mise_en_oeuvre_code;
  });
}

/**
 * Rend la liste des missions
 */
function renderMissionsList() {
  const $list = $('#missions-list');
  const query = ($('#search-missions').val() || '').toLowerCase();

  let filtered = missions;
  if (query) {
    filtered = missions.filter(m =>
      m.axe_strategique.toLowerCase().includes(query) ||
      m.objectif.toLowerCase().includes(query) ||
      m.sous_objectif.toLowerCase().includes(query) ||
      m.responsable.toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    $list.html(`
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        ${query ? 'Aucun résultat' : 'Aucune mission'}
      </div>
    `);
    return;
  }

  // Compter les tâches et MEO par mission
  const missionStats = {};
  missions.forEach(m => {
    missionStats[m.id] = { tasks: 0, meos: new Set() };
  });

  tasks.forEach(t => {
    const missionId = extractGristRefId(t.strategie_id);
    if (missionId !== null && missionStats[missionId]) {
      missionStats[missionId].tasks++;
      if (t.mise_en_oeuvre_code) {
        missionStats[missionId].meos.add(t.mise_en_oeuvre_code);
      }
    }
  });

  let html = '';
  filtered.forEach(m => {
    const isSelected = selectedMission && selectedMission.id === m.id;
    const stats = missionStats[m.id] || { tasks: 0, meos: new Set() };

    html += `
      <div class="mission-item ${isSelected ? 'selected' : ''}" data-mission-id="${m.id}">
        <div class="mission-name">${escapeHtml(m.axe_strategique || 'Sans nom')}</div>
        <div class="mission-meta">
          <i class="bi bi-folder me-1"></i>${escapeHtml(m.objectif || '-')}
          ${m.responsable ? `<span class="ms-2"><i class="bi bi-person me-1"></i>${escapeHtml(m.responsable)}</span>` : ''}
        </div>
        <div class="d-flex gap-2 mt-1">
          <span class="badge bg-secondary" title="Mises en œuvre">
            <i class="bi bi-collection me-1"></i>${stats.meos.size}
          </span>
          <span class="badge bg-primary" title="Tâches">
            <i class="bi bi-list-task me-1"></i>${stats.tasks}
          </span>
        </div>
      </div>
    `;
  });

  $list.html(html);
}

/**
 * Sélectionne une mission
 */
function selectMission(missionId) {
  selectedMission = missions.find(m => m.id === missionId);
  selectedMeo = null;
  selectedTaskIds.clear();

  // Mettre à jour l'UI
  $('.mission-item').removeClass('selected');
  $(`.mission-item[data-mission-id="${missionId}"]`).addClass('selected');

  // Activer le bouton ajouter MEO
  $('#btn-add-meo').prop('disabled', !selectedMission);

  // Mettre à jour le chemin
  if (selectedMission) {
    $('#meo-path').html(`
      <i class="bi bi-flag text-warning me-1"></i>
      <span class="current">${escapeHtml(selectedMission.axe_strategique)}</span>
    `);
    $('#meo-actions').show();
  } else {
    $('#meo-path').html('<span class="text-muted">Sélectionnez une mission</span>');
    $('#meo-actions').hide();
  }

  // Rendre les MEO
  renderMeoList();
  renderTasksList();
  updateCounts();
  updateMeoActionButtons();
  updateTasksActionButtons();

  logger.debug('Selected mission:', selectedMission?.axe_strategique);
}

/**
 * Rend la liste des MEO
 */
function renderMeoList() {
  const $list = $('#meo-list');
  console.log('[MEO] renderMeoList called, selectedMission:', selectedMission?.id, selectedMission?.axe_strategique);

  if (!selectedMission) {
    $list.html(`
      <div class="empty-state">
        <i class="bi bi-hand-index"></i>
        Sélectionnez une mission<br>pour voir ses mises en œuvre
      </div>
    `);
    return;
  }

  const meos = getMeosForMission(selectedMission.id);
  console.log('[MEO] renderMeoList: meos to render:', meos.length);

  if (meos.length === 0) {
    $list.html(`
      <div class="empty-state">
        <i class="bi bi-collection"></i>
        Aucune mise en œuvre<br>
        <button class="btn btn-sm btn-primary mt-2" id="btn-add-meo-empty">
          <i class="bi bi-plus me-1"></i>Créer
        </button>
      </div>
    `);
    // Event listener pour le bouton dans l'empty state
    $('#btn-add-meo-empty').on('click', () => openMeoModal(false));
    return;
  }

  let html = '';
  meos.forEach(meo => {
    const isSelected = selectedMeo && selectedMeo.code === meo.code;
    const progress = meo.taskCount > 0 ? Math.round((meo.completedCount / meo.taskCount) * 100) : 0;
    const catClass = getCategoryClass(meo.categorie);

    html += `
      <div class="meo-item ${isSelected ? 'selected' : ''}" data-meo-code="${escapeHtml(meo.code)}">
        <div class="d-flex justify-content-between align-items-start">
          <span class="meo-code">${escapeHtml(meo.code)}</span>
          <span class="badge badge-categorie ${catClass}">${escapeHtml(meo.categorie)}</span>
        </div>
        <div class="meo-name">${escapeHtml(meo.nom)}</div>
        <div class="meo-stats">
          <i class="bi bi-list-task me-1"></i>${meo.taskCount} tâches
          ${meo.charge_estimee ? `<span class="ms-2"><i class="bi bi-clock me-1"></i>${meo.charge_estimee}j</span>` : ''}
        </div>
        <div class="progress progress-mini">
          <div class="progress-bar bg-success" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
  });

  $list.html(html);
}

/**
 * Sélectionne une MEO
 */
function selectMeo(meoCode) {
  const meos = getMeosForMission(selectedMission.id);
  selectedMeo = meos.find(m => m.code === meoCode);
  selectedTaskIds.clear();

  // Mettre à jour l'UI
  $('.meo-item').removeClass('selected');
  $(`.meo-item[data-meo-code="${meoCode}"]`).addClass('selected');

  // Mettre à jour le chemin des tâches
  if (selectedMeo) {
    $('#tasks-path').html(`
      <i class="bi bi-flag text-warning me-1"></i>${escapeHtml(selectedMission.axe_strategique)}
      <span class="sep">›</span>
      <span class="current" style="color: var(--color-meo);">${escapeHtml(selectedMeo.nom)}</span>
    `);
  } else {
    $('#tasks-path').html('<span class="text-muted">Sélectionnez une mise en œuvre</span>');
  }

  renderTasksList();
  updateCounts();
  updateMeoActionButtons();
  updateTasksActionButtons();

  logger.debug('Selected MEO:', selectedMeo?.code);
}

/**
 * Rend la liste des tâches
 */
function renderTasksList() {
  const $list = $('#tasks-list');
  selectedTaskIds.clear();

  let filteredTasks = [];
  let emptyMessage = '';

  if (taskViewMode === 'orphan') {
    filteredTasks = getOrphanTasks();
    emptyMessage = `
      <div class="empty-state">
        <i class="bi bi-check-circle text-success"></i>
        Aucune tâche orpheline !
      </div>
    `;
    $('#tasks-path').html(`
      <i class="bi bi-exclamation-triangle text-warning me-1"></i>
      <span class="current">Tâches orphelines</span>
      <span class="badge bg-warning text-dark ms-2">${filteredTasks.length}</span>
    `);
    // En mode orphan, on peut affecter mais pas détacher
    $('#btn-attach-tasks').show();
    $('#btn-detach-tasks').hide();
  } else {
    if (!selectedMeo) {
      $list.html(`
        <div class="empty-state">
          <i class="bi bi-hand-index"></i>
          Sélectionnez une mise en œuvre<br>pour voir ses tâches
        </div>
      `);
      return;
    }
    filteredTasks = getTasksForMeo(selectedMeo.code);
    emptyMessage = `
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        Aucune tâche dans cette mise en œuvre
      </div>
    `;
    // En mode MEO, on peut détacher mais pas affecter
    $('#btn-attach-tasks').hide();
    $('#btn-detach-tasks').show();
  }

  if (filteredTasks.length === 0) {
    $list.html(emptyMessage);
    return;
  }

  // Trier par statut puis titre
  filteredTasks.sort((a, b) => {
    const statusOrder = { 'À faire': 0, 'En cours': 1, 'Bloqué': 2, 'Terminé': 3, 'Annulé': 4 };
    const statusA = statusOrder[a.statut] ?? 99;
    const statusB = statusOrder[b.statut] ?? 99;
    if (statusA !== statusB) return statusA - statusB;
    return (a.titre || '').localeCompare(b.titre || '');
  });

  const statusColors = {
    'À faire': 'secondary',
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
            <div class="d-flex align-items-center gap-2">
              <input type="checkbox" class="form-check-input task-checkbox">
              <span class="task-title">${escapeHtml(t.titre || 'Sans titre')}</span>
            </div>
            <div class="task-meta">
              ${t.qui ? `<i class="bi bi-person"></i> ${escapeHtml(formatQui(t.qui))}` : ''}
              ${t.projet ? `<span class="ms-2"><i class="bi bi-folder"></i> ${escapeHtml(t.projet)}</span>` : ''}
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
 * Extrait le prénom d'une chaîne qui peut être au format "Initiale, Prénom" ou juste "Prénom"
 * @param {string} name - Le nom à traiter
 * @returns {string} Le prénom extrait
 */
function extractPrenom(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  // Si le format est "X, Nom" où X est une seule lettre majuscule, extraire "Nom"
  const match = trimmed.match(/^[A-Z],\s*(.+)$/);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Format le champ qui (peut être un array)
 */
function formatQui(qui) {
  if (!qui) return '';
  if (Array.isArray(qui)) {
    // Format Grist ChoiceList: ['L', 'val1', 'val2']
    if (qui[0] === 'L') {
      return qui.slice(1).map(extractPrenom).filter(Boolean).join(', ');
    }
    return qui.map(extractPrenom).filter(Boolean).join(', ');
  }
  return extractPrenom(String(qui));
}

/**
 * Toggle sélection d'une tâche
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
  updateTasksActionButtons();
}

/**
 * Sélectionne toutes les tâches visibles
 */
function selectAllTasks() {
  const $visible = $('#tasks-list .task-item');
  const allSelected = $visible.length > 0 && selectedTaskIds.size === $visible.length;

  if (allSelected) {
    selectedTaskIds.clear();
    $visible.removeClass('selected').find('.task-checkbox').prop('checked', false);
  } else {
    $visible.each(function() {
      const id = $(this).data('task-id');
      selectedTaskIds.add(id);
      $(this).addClass('selected').find('.task-checkbox').prop('checked', true);
    });
  }
  updateTasksActionButtons();
}

/**
 * Met à jour les boutons d'action des tâches
 */
function updateTasksActionButtons() {
  const count = selectedTaskIds.size;
  $('#count-selected').text(count);
  $('#count-detach').text(count);

  // Bouton sélectionner tout
  const hasVisibleTasks = $('#tasks-list .task-item').length > 0;
  $('#btn-select-all-tasks').prop('disabled', !hasVisibleTasks);

  // Bouton ajouter tâche (actif uniquement si MEO sélectionnée et pas en mode orphan)
  $('#btn-add-task').prop('disabled', !selectedMeo || taskViewMode === 'orphan');

  if (taskViewMode === 'orphan') {
    // Pour affecter, il faut des tâches sélectionnées ET une MEO sélectionnée
    $('#btn-attach-tasks').prop('disabled', count === 0 || !selectedMeo);
    $('#btn-add-task').hide();
  } else {
    // Pour détacher, il suffit d'avoir des tâches sélectionnées
    $('#btn-detach-tasks').prop('disabled', count === 0);
    $('#btn-add-task').show();
  }
}

/**
 * Met à jour les boutons d'action des MEO
 */
function updateMeoActionButtons() {
  const hasMeo = selectedMeo !== null;
  $('#btn-edit-meo').prop('disabled', !hasMeo);
  $('#btn-delete-meo').prop('disabled', !hasMeo);
}

/**
 * Ouvre le modal de création/édition de MEO
 */
function openMeoModal(editMode = false) {
  if (!selectedMission) {
    showToast('Sélectionnez d\'abord une mission', 'warning');
    return;
  }

  // Réinitialiser le formulaire
  $('#meo-code').val('');
  $('#meo-nom').val('');
  $('#meo-categorie').val('Projet');
  $('#meo-charge').val(0);
  editingMeoCode = null;

  // Afficher la mission parente
  $('#meo-parent-mission').text(selectedMission.axe_strategique);

  if (editMode && selectedMeo) {
    $('#modal-meo-title').text('Modifier la mise en œuvre');
    $('#meo-code').val(selectedMeo.code).prop('readonly', true);
    $('#meo-nom').val(selectedMeo.nom);
    $('#meo-categorie').val(selectedMeo.categorie);
    $('#meo-charge').val(selectedMeo.charge_estimee || 0);
    editingMeoCode = selectedMeo.code;
  } else {
    $('#modal-meo-title').text('Nouvelle mise en œuvre');
    $('#meo-code').prop('readonly', false);
    // Générer un code unique basé sur l'ID mission et timestamp
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const missionPrefix = String(selectedMission.id).padStart(2, '0');
    $('#meo-code').val(`M${missionPrefix}-${timestamp}`);
  }

  const modalEl = document.getElementById('modal-meo');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

/**
 * Édite la MEO sélectionnée
 */
function editSelectedMeo() {
  if (selectedMeo) {
    openMeoModal(true);
  }
}

/**
 * Sauvegarde une MEO (création ou mise à jour)
 */
async function saveMeo() {
  const code = $('#meo-code').val().trim();
  const nom = $('#meo-nom').val().trim();
  const categorie = $('#meo-categorie').val();
  const charge = parseFloat($('#meo-charge').val()) || 0;

  if (!code || !nom) {
    showToast('Code et nom requis', 'warning');
    return;
  }

  try {
    if (editingMeoCode) {
      // Mode édition : mettre à jour toutes les tâches avec ce code MEO
      const meoTasks = tasks.filter(t => {
        const taskMissionId = extractGristRefId(t.strategie_id);
        return taskMissionId === selectedMission.id && t.mise_en_oeuvre_code === editingMeoCode;
      });

      const updates = meoTasks.map(t => [
        'UpdateRecord', 'Ssir_principale_task', t.id, {
          mise_en_oeuvre_nom: nom,
          categorie: categorie,
          mise_en_oeuvre_charge_estimee: charge
        }
      ]);

      if (updates.length > 0) {
        await window.grist.docApi.applyUserActions(updates);

        // Mettre à jour localement
        meoTasks.forEach(t => {
          t.mise_en_oeuvre_nom = nom;
          t.categorie = categorie;
          t.mise_en_oeuvre_charge_estimee = charge;
        });
      }

      showToast('Mise en œuvre modifiée', 'success');
    } else {
      // Mode création : créer une tâche support [MEO]
      const newTask = {
        titre: `[MEO] ${nom}`,
        description: `Mise en œuvre: ${nom}\nCode: ${code}\nCatégorie: ${categorie}`,
        statut: 'À faire',
        strategie_id: selectedMission.id,
        mise_en_oeuvre_code: code,
        mise_en_oeuvre_nom: nom,
        categorie: categorie,
        mise_en_oeuvre_charge_estimee: charge,
        est_classifiee: true
      };

      logger.debug('Creating MEO task:', newTask);

      const result = await window.grist.docApi.applyUserActions([
        ['AddRecord', 'Ssir_principale_task', null, newTask]
      ]);

      logger.debug('MEO task created, result:', result);
      showToast('Mise en œuvre créée', 'success');
    }

    const modalEl = document.getElementById('modal-meo');
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal?.hide();

    // Attendre un peu pour que Grist synchronise
    await new Promise(r => setTimeout(r, 500));

    // Forcer le rechargement via Grist
    await reloadTasks();

    renderMeoList();
    renderTasksList();
    updateCounts();
    renderMissionsList(); // Aussi rafraîchir les stats des missions

    // Resélectionner la MEO
    const meoCodeToSelect = editingMeoCode || code;
    if (meoCodeToSelect) {
      selectMeo(meoCodeToSelect);
    }

  } catch (error) {
    logger.error('Failed to save MEO:', error);
    showToast('Erreur lors de la sauvegarde', 'danger');
  }
}

/**
 * Supprime la MEO sélectionnée
 */
async function deleteSelectedMeo() {
  if (!selectedMeo) return;

  const meoTasks = getTasksForMeo(selectedMeo.code);

  if (meoTasks.length > 0) {
    if (!confirm(`Cette mise en œuvre contient ${meoTasks.length} tâche(s).\n\nLes tâches seront détachées (mais pas supprimées).\n\nContinuer ?`)) {
      return;
    }
  } else {
    if (!confirm(`Supprimer la mise en œuvre "${selectedMeo.nom}" ?`)) {
      return;
    }
  }

  try {
    const updates = meoTasks.map(t => [
      'UpdateRecord', 'Ssir_principale_task', t.id, {
        mise_en_oeuvre_code: '',
        mise_en_oeuvre_nom: '',
        categorie: '',
        mise_en_oeuvre_charge_estimee: 0
      }
    ]);

    // Supprimer aussi les tâches support [MEO] si elles existent
    const supportTasks = meoTasks.filter(t => t.titre?.startsWith('[MEO]'));
    supportTasks.forEach(t => {
      updates.push(['RemoveRecord', 'Ssir_principale_task', t.id]);
    });

    if (updates.length > 0) {
      await window.grist.docApi.applyUserActions(updates);
    }

    // Mettre à jour localement
    meoTasks.forEach(t => {
      if (!t.titre?.startsWith('[MEO]')) {
        t.mise_en_oeuvre_code = '';
        t.mise_en_oeuvre_nom = '';
        t.categorie = '';
        t.mise_en_oeuvre_charge_estimee = 0;
      }
    });

    // Supprimer les tâches support du cache local
    tasks = tasks.filter(t => !supportTasks.includes(t));

    selectedMeo = null;
    renderMeoList();
    renderTasksList();
    updateCounts();
    updateMeoActionButtons();
    updateTasksActionButtons();

    showToast('Mise en œuvre supprimée', 'success');
  } catch (error) {
    logger.error('Failed to delete MEO:', error);
    showToast('Erreur lors de la suppression', 'danger');
  }
}

/**
 * Ouvre le modal d'affectation
 */
function openAttachModal() {
  if (selectedTaskIds.size === 0) {
    showToast('Sélectionnez des tâches', 'warning');
    return;
  }

  if (!selectedMeo) {
    showToast('Sélectionnez une mise en œuvre cible', 'warning');
    return;
  }

  $('#attach-count').text(selectedTaskIds.size);
  $('#attach-target').html(`
    <i class="bi bi-flag text-warning me-1"></i>${escapeHtml(selectedMission.axe_strategique)}<br>
    <i class="bi bi-collection me-1" style="color: var(--color-meo);"></i>${escapeHtml(selectedMeo.nom)}
  `);

  const modalEl = document.getElementById('modal-attach');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

/**
 * Confirme l'affectation des tâches
 */
async function confirmAttach() {
  if (!selectedMission || !selectedMeo || selectedTaskIds.size === 0) return;

  try {
    const updates = [];
    selectedTaskIds.forEach(taskId => {
      updates.push(['UpdateRecord', 'Ssir_principale_task', taskId, {
        strategie_id: selectedMission.id,
        mise_en_oeuvre_code: selectedMeo.code,
        mise_en_oeuvre_nom: selectedMeo.nom,
        categorie: selectedMeo.categorie,
        est_classifiee: true
      }]);
    });

    await window.grist.docApi.applyUserActions(updates);

    // Mettre à jour localement
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.strategie_id = selectedMission.id;
        task.mise_en_oeuvre_code = selectedMeo.code;
        task.mise_en_oeuvre_nom = selectedMeo.nom;
        task.categorie = selectedMeo.categorie;
        task.est_classifiee = true;
      }
    });

    const modalEl = document.getElementById('modal-attach');
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
    selectedTaskIds.clear();

    renderMeoList();
    renderTasksList();
    updateCounts();
    updateTasksActionButtons();

    showToast(`${updates.length} tâche(s) affectée(s)`, 'success');
  } catch (error) {
    logger.error('Failed to attach tasks:', error);
    showToast('Erreur lors de l\'affectation', 'danger');
  }
}

/**
 * Détache les tâches sélectionnées de la MEO
 */
async function detachTasks() {
  if (selectedTaskIds.size === 0) return;

  if (!confirm(`Détacher ${selectedTaskIds.size} tâche(s) de la mise en œuvre ?`)) return;

  try {
    const updates = [];
    selectedTaskIds.forEach(taskId => {
      updates.push(['UpdateRecord', 'Ssir_principale_task', taskId, {
        mise_en_oeuvre_code: '',
        mise_en_oeuvre_nom: '',
        categorie: ''
      }]);
    });

    await window.grist.docApi.applyUserActions(updates);

    // Mettre à jour localement
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.mise_en_oeuvre_code = '';
        task.mise_en_oeuvre_nom = '';
        task.categorie = '';
      }
    });

    selectedTaskIds.clear();

    renderMeoList();
    renderTasksList();
    updateCounts();
    updateTasksActionButtons();

    showToast(`${updates.length} tâche(s) détachée(s)`, 'success');
  } catch (error) {
    logger.error('Failed to detach tasks:', error);
    showToast('Erreur lors du détachement', 'danger');
  }
}

/**
 * Retourne la classe CSS pour une catégorie
 */
function getCategoryClass(categorie) {
  switch (categorie) {
    case 'MCO': return 'badge-mco';
    case 'Projet': return 'badge-projet';
    case 'Imprévisible': return 'badge-imprevisible';
    default: return 'bg-secondary';
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
