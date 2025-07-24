// === utils/badges.js ===
// Utilitaires pour la génération des badges bureaux

import { BUREAU_ICONS } from '../config/constants.js';

/**
 * Normalise le nom d'un bureau pour les classes CSS
 * @param {string} bureau - Nom du bureau
 * @returns {string} Nom normalisé
 */
export function normalizeBureauName(bureau) {
  return bureau.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^chef-/, '');
}

/**
 * Récupère l'icône appropriée pour un bureau
 * @param {string} bureau - Nom du bureau
 * @returns {string} Classe CSS de l'icône Bootstrap
 */
export function getBureauIcon(bureau) {
  const bureauLower = bureau.toLowerCase();
  
  // Recherche dans les mots clés
  for (const [keyword, icon] of Object.entries(BUREAU_ICONS)) {
    if (keyword !== 'default' && bureauLower.includes(keyword)) {
      return icon;
    }
  }
  
  return BUREAU_ICONS.default;
}

/**
 * Génère un badge individuel pour un bureau
 * @param {string} bureau - Nom du bureau
 * @param {boolean} isCompact - Mode compact ou non
 * @returns {string} HTML du badge
 */
export function generateSingleBureauBadge(bureau, isCompact = false) {
  const normalizedName = normalizeBureauName(bureau);
  const icon = getBureauIcon(bureau);
  const badgeClass = `bureau-badge bureau-${normalizedName}`;
  const displayName = bureau; // Suppression de la troncature pour éviter les problèmes de filtres
  
  return `
    <span class="${badgeClass}" title="Bureau lead: ${bureau}">
      <i class="${icon}"></i>
      ${displayName}
    </span>
  `;
}

/**
 * Génère les badges bureaux pour une liste de bureaux
 * @param {Array} bureauList - Liste des bureaux (format Grist avec 'L' en premier)
 * @param {boolean} isCompact - Mode compact pour l'affichage
 * @returns {string} HTML des badges bureaux
 */
export function generateBureauBadges(bureauList, isCompact = false) {
  // Vérification de la validité de la liste
  if (!Array.isArray(bureauList) || bureauList.length <= 1) {
    return '';
  }
  
  // Extraction des bureaux (sans le 'L' initial de Grist)
  const bureaux = bureauList.filter(item => item !== 'L' && Boolean(item));
  
  if (bureaux.length === 0) {
    return '';
  }
  
  // Classe du container selon le nombre de bureaux
  const containerClass = bureaux.length > 1 ? 'bureau-badges multiple-bureaux' : 'bureau-badges';
  
  let badgesHTML = `<div class="${containerClass}">`;
  
  // Génération des badges individuels
  bureaux.forEach(bureau => {
    badgesHTML += generateSingleBureauBadge(bureau, isCompact);
  });
  
  badgesHTML += '</div>';
  
  return badgesHTML;
}

/**
 * Génère un badge de priorité
 * @param {number} priorityLevel - Niveau de priorité (1-4)
 * @returns {string} HTML du badge de priorité
 */
export function generatePriorityBadge(priorityLevel) {
  if (!priorityLevel || priorityLevel < 1 || priorityLevel > 4) {
    priorityLevel = 3; // Priorité par défaut
  }
  
  return `<span class="priority-badge priority-${priorityLevel}">P${priorityLevel}</span>`;
}

/**
 * Génère un badge de projet avec tooltip stratégique
 * @param {object} projectData - Données du projet
 * @returns {string} HTML du badge projet
 */
export function generateProjectBadge(projectData) {
  const { 
    projet, 
    strategie_objectif, 
    strategie_sous_objectif, 
    strategie_action,
    strategiesInfo // NOUVEAU: Support des stratégies multiples
  } = projectData;
  
  if (!projet) return '';
  
  let tooltip = projet;
  
  // Support des stratégies multiples (nouveau format)
  if (strategiesInfo && Array.isArray(strategiesInfo) && strategiesInfo.length > 0) {
    const strategiesText = strategiesInfo.map(s => `${s.objectif} → ${s.action}`).join(' | ');
    tooltip = `${projet}\nStratégies: ${strategiesText}`;
  }
  // Support de l'ancien format (single stratégie)
  else if (strategie_objectif || strategie_sous_objectif || strategie_action) {
    const tooltipParts = [
      strategie_objectif ? `Objectif: ${strategie_objectif}` : '',
      strategie_sous_objectif ? `Sous-objectif: ${strategie_sous_objectif}` : '',
      strategie_action ? `Action: ${strategie_action}` : ''
    ].filter(Boolean);
    
    if (tooltipParts.length > 0) {
      tooltip = `${projet}\n${tooltipParts.join('\n')}`;
    }
  }
  
  return `<span class="badge bg-info text-dark" title="${tooltip.replace(/"/g, '&quot;')}">${projet}</span>`;
}

/**
 * Génère un badge de responsable
 * @param {string} responsable - Nom du responsable
 * @returns {string} HTML du badge responsable
 */
export function generateResponsableBadge(responsable) {
  if (!responsable) return '';
  
  return `<span class="personne-badge">${responsable}</span>`;
}

/**
 * Génère les badges de responsables
 * @param {Array} responsablesList - Liste des responsables (format Grist avec 'L' en premier)
 * @returns {string} HTML des badges responsables
 */
export function generateResponsablesBadges(responsablesList) {
  if (!Array.isArray(responsablesList) || responsablesList.length <= 1) {
    return '';
  }
  
  const responsables = responsablesList.filter(item => item !== 'L' && Boolean(item));
  
  if (responsables.length === 0) {
    return '';
  }
  
  const badgesHTML = responsables
    .map(responsable => generateResponsableBadge(responsable))
    .join(' ');
  
  return `<div class="personnes-list">${badgesHTML}</div>`;
}

/**
 * Génère un badge d'historique
 * @param {number} historyCount - Nombre d'étapes dans l'historique
 * @param {number} taskId - ID de la tâche
 * @returns {string} HTML du badge historique
 */
export function generateHistoryBadge(historyCount, taskId) {
  if (!historyCount || historyCount <= 1) return '';
  
  return `<button class="btn-history" title="Voir l'historique (${historyCount} étapes)" data-task-id="${taskId}">
    <i class="bi bi-clock-history"></i> ${historyCount}
  </button>`;
}

/**
 * Génère un badge de statut pour l'historique
 * @param {string} statut - Nom du statut
 * @param {boolean} isCurrent - Si c'est le statut actuel
 * @returns {string} HTML du badge statut
 */
export function generateStatusBadge(statut, isCurrent = false) {
  const currentClass = isCurrent ? 'bg-success' : 'bg-primary';
  const currentText = isCurrent ? 'En cours' : '';
  
  return `
    <span class="badge ${currentClass}">
      ${statut}
      ${currentText ? ` <small>(${currentText})</small>` : ''}
    </span>
  `;
}

/**
 * Génère un badge d'urgence/impact
 * @param {string} urgence - Niveau d'urgence
 * @param {string} impact - Niveau d'impact
 * @returns {string} HTML du badge urgence/impact
 */
export function generateUrgenceImpactBadge(urgence, impact) {
  if (!urgence && !impact) return '';
  
  let badgeClass = 'badge bg-secondary';
  let text = '';
  
  // Détermination de la couleur selon l'urgence/impact
  if (urgence === 'Immédiate' || impact === 'Critique') {
    badgeClass = 'badge bg-danger';
  } else if (urgence === 'Courte' || impact === 'Important') {
    badgeClass = 'badge bg-warning';
  } else if (urgence === 'Moyenne' || impact === 'Modéré') {
    badgeClass = 'badge bg-info';
  }
  
  // Construction du texte
  if (urgence && impact) {
    text = `${urgence} / ${impact}`;
  } else {
    text = urgence || impact;
  }
  
  return `<span class="${badgeClass}" title="Urgence: ${urgence || 'Non définie'} | Impact: ${impact || 'Non défini'}">${text}</span>`;
}

/**
 * Génère tous les badges pour une carte de tâche
 * @param {object} task - Données de la tâche
 * @param {boolean} isCompact - Mode compact
 * @returns {object} Objet contenant tous les badges générés
 */
export function generateAllTaskBadges(task, isCompact = false) {
  const badges = {
    bureaux: generateBureauBadges(task.bureau, isCompact),
    priority: generatePriorityBadge(task.priority),
    project: generateProjectBadge({
      projet: task.projet,
      strategie_objectif: task.strategie_objectif,
      strategie_sous_objectif: task.strategie_sous_objectif,
      strategie_action: task.strategie_action
    }),
    responsables: generateResponsablesBadges(task.qui),
    urgenceImpact: generateUrgenceImpactBadge(task.urgence, task.impact),
    history: (() => {
      let count = 0;
      
      // Compter les entrées d'historique de statuts
      if (task.historique_statuts) {
        try {
          const historyData = JSON.parse(task.historique_statuts);
          count += historyData?.historique?.length || 0;
        } catch (e) {
          // Ignore les erreurs de parsing
        }
      }
      
      // Compter les entrées dans les notes JSON
      if (task.notes) {
        try {
          const notesData = JSON.parse(task.notes);
          count += notesData?.history?.length || 0;
        } catch (e) {
          // Ignore les erreurs de parsing
        }
      }
      
      return count > 0 ? generateHistoryBadge(count, task.id) : '';
    })()
  };
  
  return badges;
}

/**
 * Valide si un bureau existe dans la liste des bureaux disponibles
 * @param {string} bureau - Nom du bureau à valider
 * @param {Array} availableBureaux - Liste des bureaux disponibles
 * @returns {boolean} True si le bureau est valide
 */
export function isValidBureau(bureau, availableBureaux = []) {
  return availableBureaux.includes(bureau);
}

/**
 * Filtre et valide une liste de bureaux
 * @param {Array} bureauList - Liste des bureaux (format Grist)
 * @param {Array} availableBureaux - Liste des bureaux disponibles
 * @returns {Array} Liste des bureaux valides
 */
export function validateBureauList(bureauList, availableBureaux = []) {
  if (!Array.isArray(bureauList) || bureauList.length <= 1) {
    return [];
  }
  
  return bureauList
    .filter(item => item !== 'L' && Boolean(item))
    .filter(bureau => isValidBureau(bureau, availableBureaux));
}

/**
 * Génère des badges de couleur personnalisée
 * @param {string} text - Texte du badge
 * @param {string} color - Couleur (primary, secondary, success, etc.)
 * @param {string} icon - Classe d'icône Bootstrap (optionnel)
 * @returns {string} HTML du badge personnalisé
 */
export function generateCustomBadge(text, color = 'secondary', icon = '') {
  const iconHTML = icon ? `<i class="${icon} me-1"></i>` : '';
  return `<span class="badge bg-${color}">${iconHTML}${text}</span>`;
}

/**
 * Génère un badge de compteur
 * @param {number} count - Nombre à afficher
 * @param {string} label - Label du compteur
 * @returns {string} HTML du badge compteur
 */
export function generateCountBadge(count, label = '') {
  const displayLabel = label ? ` ${label}` : '';
  return `<span class="board-count">${count}${displayLabel}</span>`;
}

/**
 * Génère un indicateur de nouveau/modifié
 * @param {Date} lastModified - Date de dernière modification
 * @param {number} hoursThreshold - Seuil en heures pour "nouveau" (défaut: 24h)
 * @returns {string} HTML de l'indicateur ou chaîne vide
 */
export function generateNewIndicator(lastModified, hoursThreshold = 24) {
  if (!lastModified) return '';
  
  const now = new Date();
  const modifiedDate = new Date(lastModified);
  const hoursDiff = (now - modifiedDate) / (1000 * 60 * 60);
  
  if (hoursDiff <= hoursThreshold) {
    const isVeryNew = hoursDiff <= 1;
    const badgeClass = isVeryNew ? 'bg-success' : 'bg-info';
    const text = isVeryNew ? 'NOUVEAU' : 'MODIFIÉ';
    
    return `<span class="badge ${badgeClass} new-indicator">${text}</span>`;
  }
  
  return '';
}