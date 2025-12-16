// === managers/TaskLinksManager.js ===
// Gestionnaire des liaisons entre tâches et du volume horaire

import { createModuleLogger } from '../utils/LoggerManager.js';
import { TASK_LINK_TYPES, getLinkType } from '../config/constants.js';

/**
 * Gestionnaire des liaisons entre tâches
 * Stockage hybride : localStorage + colonnes Grist (tache_liens, temps_estime_heures)
 */
export class TaskLinksManager {
  constructor(gristManager) {
    this.logger = createModuleLogger('TaskLinksManager');
    this.gristManager = gristManager;

    // Clé de stockage localStorage (backup/cache)
    this.STORAGE_KEY = 'kanban_task_links';

    // Cache des liaisons
    // Format: { taskId: [{ targetId, type, createdAt }] }
    this.linksCache = {};

    // Cache des temps estimés
    // Format: { taskId: { estime: number, reel: number } }
    this.timeCache = {};

    this.init();
  }

  init() {
    this.loadFromStorage();
    this.logger.debug('TaskLinksManager initialized');
  }

  // === STOCKAGE LOCAL ===

  /**
   * Charge les liaisons depuis localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.linksCache = data.links || {};
        this.timeCache = data.times || {};
        this.logger.debug('Links loaded from localStorage');
      }
    } catch (error) {
      this.logger.error('Failed to load links from storage:', error);
      this.linksCache = {};
      this.timeCache = {};
    }
  }

  /**
   * Sauvegarde les liaisons dans localStorage
   */
  saveToStorage() {
    try {
      const data = {
        links: this.linksCache,
        times: this.timeCache,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      this.logger.debug('Links saved to localStorage');
    } catch (error) {
      this.logger.error('Failed to save links to storage:', error);
    }
  }

  // === GESTION DES LIAISONS ===

  /**
   * Ajoute une liaison entre deux tâches
   * @param {number} sourceTaskId - ID de la tâche source
   * @param {number} targetTaskId - ID de la tâche cible
   * @param {string} linkType - Type de liaison (DEPENDS_ON, BLOCKS, etc.)
   * @returns {Object} La liaison créée
   */
  addLink(sourceTaskId, targetTaskId, linkType = 'RELATED_TO') {
    // Validation
    if (sourceTaskId === targetTaskId) {
      throw new Error('Une tâche ne peut pas être liée à elle-même');
    }

    if (!TASK_LINK_TYPES[linkType]) {
      throw new Error(`Type de liaison invalide: ${linkType}`);
    }

    // Vérifier les dépendances circulaires pour DEPENDS_ON et SUBTASK_OF
    if (['DEPENDS_ON', 'SUBTASK_OF'].includes(linkType)) {
      if (this.wouldCreateCycle(sourceTaskId, targetTaskId, linkType)) {
        throw new Error('Cette liaison créerait une dépendance circulaire');
      }
    }

    // Vérifier si la liaison existe déjà
    if (this.hasLink(sourceTaskId, targetTaskId)) {
      throw new Error('Cette liaison existe déjà');
    }

    // Créer la liaison
    if (!this.linksCache[sourceTaskId]) {
      this.linksCache[sourceTaskId] = [];
    }

    const link = {
      targetId: targetTaskId,
      type: linkType,
      createdAt: new Date().toISOString()
    };

    this.linksCache[sourceTaskId].push(link);
    this.saveToStorage();

    this.logger.info(`Link added: ${sourceTaskId} -> ${targetTaskId} (${linkType})`);
    return link;
  }

  /**
   * Supprime une liaison entre deux tâches
   * @param {number} sourceTaskId - ID de la tâche source
   * @param {number} targetTaskId - ID de la tâche cible
   * @returns {boolean} Succès de la suppression
   */
  removeLink(sourceTaskId, targetTaskId) {
    const links = this.linksCache[sourceTaskId];
    if (!links) return false;

    const index = links.findIndex(l => l.targetId === targetTaskId);
    if (index === -1) return false;

    links.splice(index, 1);

    // Nettoyer si plus de liaisons
    if (links.length === 0) {
      delete this.linksCache[sourceTaskId];
    }

    this.saveToStorage();
    this.logger.info(`Link removed: ${sourceTaskId} -> ${targetTaskId}`);
    return true;
  }

  /**
   * Vérifie si une liaison existe
   * @param {number} sourceTaskId - ID de la tâche source
   * @param {number} targetTaskId - ID de la tâche cible
   * @returns {boolean}
   */
  hasLink(sourceTaskId, targetTaskId) {
    const links = this.linksCache[sourceTaskId];
    if (!links) return false;
    return links.some(l => l.targetId === targetTaskId);
  }

  /**
   * Récupère toutes les liaisons d'une tâche
   * @param {number} taskId - ID de la tâche
   * @returns {Array} Liaisons sortantes
   */
  getTaskLinks(taskId) {
    return this.linksCache[taskId] || [];
  }

  /**
   * Récupère les liaisons entrantes d'une tâche
   * @param {number} taskId - ID de la tâche
   * @returns {Array} Liaisons entrantes { sourceId, type }
   */
  getIncomingLinks(taskId) {
    const incoming = [];
    for (const [sourceId, links] of Object.entries(this.linksCache)) {
      for (const link of links) {
        if (link.targetId === taskId) {
          incoming.push({
            sourceId: parseInt(sourceId),
            type: link.type
          });
        }
      }
    }
    return incoming;
  }

  /**
   * Récupère toutes les liaisons (pour visualisation)
   * @returns {Array} [{source, target, type}]
   */
  getAllLinks() {
    const allLinks = [];
    for (const [sourceId, links] of Object.entries(this.linksCache)) {
      for (const link of links) {
        allLinks.push({
          source: parseInt(sourceId),
          target: link.targetId,
          type: link.type,
          createdAt: link.createdAt
        });
      }
    }
    return allLinks;
  }

  /**
   * Détecte les dépendances circulaires
   * @param {number} sourceTaskId - Tâche source
   * @param {number} targetTaskId - Tâche cible potentielle
   * @param {string} linkType - Type de liaison
   * @returns {boolean} True si créerait un cycle
   */
  wouldCreateCycle(sourceTaskId, targetTaskId, linkType) {
    // Uniquement pour les liaisons directionnelles
    if (!['DEPENDS_ON', 'SUBTASK_OF', 'BLOCKS'].includes(linkType)) {
      return false;
    }

    // Parcours en profondeur depuis la cible
    const visited = new Set();
    const stack = [targetTaskId];

    while (stack.length > 0) {
      const currentId = stack.pop();

      if (currentId === sourceTaskId) {
        return true; // Cycle détecté
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Ajouter les dépendances du nœud courant
      const links = this.linksCache[currentId] || [];
      for (const link of links) {
        if (['DEPENDS_ON', 'SUBTASK_OF'].includes(link.type)) {
          stack.push(link.targetId);
        }
      }
    }

    return false;
  }

  /**
   * Récupère les tâches bloquantes (dont cette tâche dépend)
   * @param {number} taskId - ID de la tâche
   * @returns {Array} IDs des tâches bloquantes
   */
  getBlockingTasks(taskId) {
    const links = this.getTaskLinks(taskId);
    return links
      .filter(l => l.type === 'DEPENDS_ON')
      .map(l => l.targetId);
  }

  /**
   * Récupère les tâches bloquées par cette tâche
   * @param {number} taskId - ID de la tâche
   * @returns {Array} IDs des tâches bloquées
   */
  getBlockedTasks(taskId) {
    const incoming = this.getIncomingLinks(taskId);
    return incoming
      .filter(l => l.type === 'DEPENDS_ON')
      .map(l => l.sourceId);
  }

  /**
   * Récupère les sous-tâches
   * @param {number} taskId - ID de la tâche parente
   * @returns {Array} IDs des sous-tâches
   */
  getSubtasks(taskId) {
    const incoming = this.getIncomingLinks(taskId);
    return incoming
      .filter(l => l.type === 'SUBTASK_OF')
      .map(l => l.sourceId);
  }

  /**
   * Récupère la tâche parente
   * @param {number} taskId - ID de la sous-tâche
   * @returns {number|null} ID de la tâche parente
   */
  getParentTask(taskId) {
    const links = this.getTaskLinks(taskId);
    const parentLink = links.find(l => l.type === 'SUBTASK_OF');
    return parentLink ? parentLink.targetId : null;
  }

  // === GESTION DU TEMPS ===

  /**
   * Définit le temps estimé pour une tâche
   * @param {number} taskId - ID de la tâche
   * @param {number} heures - Nombre d'heures estimées
   */
  setTempsEstime(taskId, heures) {
    if (heures < 0) {
      throw new Error('Le temps estimé ne peut pas être négatif');
    }

    if (!this.timeCache[taskId]) {
      this.timeCache[taskId] = { estime: 0, reel: 0 };
    }
    this.timeCache[taskId].estime = heures;
    this.saveToStorage();

    this.logger.debug(`Temps estimé défini pour tâche ${taskId}: ${heures}h`);
  }

  /**
   * Définit le temps réel pour une tâche
   * @param {number} taskId - ID de la tâche
   * @param {number} heures - Nombre d'heures réelles
   */
  setTempsReel(taskId, heures) {
    if (heures < 0) {
      throw new Error('Le temps réel ne peut pas être négatif');
    }

    if (!this.timeCache[taskId]) {
      this.timeCache[taskId] = { estime: 0, reel: 0 };
    }
    this.timeCache[taskId].reel = heures;
    this.saveToStorage();

    this.logger.debug(`Temps réel défini pour tâche ${taskId}: ${heures}h`);
  }

  /**
   * Récupère les temps d'une tâche
   * @param {number} taskId - ID de la tâche
   * @returns {Object} { estime, reel }
   */
  getTaskTime(taskId) {
    return this.timeCache[taskId] || { estime: 0, reel: 0 };
  }

  /**
   * Calcule le temps total estimé d'une tâche et ses sous-tâches
   * @param {number} taskId - ID de la tâche
   * @returns {number} Temps total en heures
   */
  getTotalEstimatedTime(taskId) {
    let total = this.getTaskTime(taskId).estime;

    // Ajouter le temps des sous-tâches
    const subtasks = this.getSubtasks(taskId);
    for (const subtaskId of subtasks) {
      total += this.getTotalEstimatedTime(subtaskId);
    }

    return total;
  }

  /**
   * Calcule le temps total réel d'une tâche et ses sous-tâches
   * @param {number} taskId - ID de la tâche
   * @returns {number} Temps total en heures
   */
  getTotalRealTime(taskId) {
    let total = this.getTaskTime(taskId).reel;

    // Ajouter le temps des sous-tâches
    const subtasks = this.getSubtasks(taskId);
    for (const subtaskId of subtasks) {
      total += this.getTotalRealTime(subtaskId);
    }

    return total;
  }

  // === SYNCHRONISATION GRIST ===

  /**
   * Synchronise les liaisons depuis les données Grist
   * Lit les colonnes tache_liens et temps_estime_heures
   * @param {Array} gristRecords - Enregistrements Grist
   */
  syncFromGrist(gristRecords) {
    if (!gristRecords || !Array.isArray(gristRecords)) return;

    for (const record of gristRecords) {
      const taskId = record.id;

      // Synchroniser les liaisons si la colonne existe
      if (record.tache_liens) {
        try {
          const liens = typeof record.tache_liens === 'string'
            ? JSON.parse(record.tache_liens)
            : record.tache_liens;

          if (Array.isArray(liens)) {
            this.linksCache[taskId] = liens;
          }
        } catch (e) {
          this.logger.warn(`Failed to parse tache_liens for task ${taskId}`);
        }
      }

      // Synchroniser les temps
      if (record.temps_estime_heures !== undefined) {
        if (!this.timeCache[taskId]) {
          this.timeCache[taskId] = { estime: 0, reel: 0 };
        }
        this.timeCache[taskId].estime = record.temps_estime_heures || 0;
      }

      if (record.temps_reel_heures !== undefined) {
        if (!this.timeCache[taskId]) {
          this.timeCache[taskId] = { estime: 0, reel: 0 };
        }
        this.timeCache[taskId].reel = record.temps_reel_heures || 0;
      }
    }

    this.saveToStorage();
    this.logger.info('Links synced from Grist');
  }

  /**
   * Prépare les données de liaisons pour sauvegarde Grist
   * @param {number} taskId - ID de la tâche
   * @returns {Object} Données à sauvegarder
   */
  prepareForGrist(taskId) {
    const links = this.getTaskLinks(taskId);
    const time = this.getTaskTime(taskId);

    return {
      tache_liens: JSON.stringify(links),
      temps_estime_heures: time.estime,
      temps_reel_heures: time.reel
    };
  }

  // === STATISTIQUES ===

  /**
   * Calcule les statistiques de liaisons
   * @returns {Object} Statistiques
   */
  getStats() {
    const allLinks = this.getAllLinks();
    const taskCount = Object.keys(this.linksCache).length;

    const byType = {};
    for (const linkType of Object.keys(TASK_LINK_TYPES)) {
      byType[linkType] = allLinks.filter(l => l.type === linkType).length;
    }

    // Temps total
    let totalEstime = 0;
    let totalReel = 0;
    for (const time of Object.values(this.timeCache)) {
      totalEstime += time.estime || 0;
      totalReel += time.reel || 0;
    }

    return {
      totalLinks: allLinks.length,
      tasksWithLinks: taskCount,
      linksByType: byType,
      totalEstimatedHours: totalEstime,
      totalRealHours: totalReel,
      tasksWithTime: Object.keys(this.timeCache).length
    };
  }

  /**
   * Supprime toutes les liaisons d'une tâche (appelé lors de suppression de tâche)
   * @param {number} taskId - ID de la tâche
   */
  removeAllLinksForTask(taskId) {
    // Supprimer les liaisons sortantes
    delete this.linksCache[taskId];

    // Supprimer les liaisons entrantes
    for (const [sourceId, links] of Object.entries(this.linksCache)) {
      this.linksCache[sourceId] = links.filter(l => l.targetId !== taskId);
      if (this.linksCache[sourceId].length === 0) {
        delete this.linksCache[sourceId];
      }
    }

    // Supprimer les temps
    delete this.timeCache[taskId];

    this.saveToStorage();
    this.logger.info(`All links removed for task ${taskId}`);
  }

  /**
   * Exporte toutes les données
   * @returns {Object} Données exportées
   */
  exportData() {
    return {
      links: this.linksCache,
      times: this.timeCache,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Importe des données
   * @param {Object} data - Données à importer
   */
  importData(data) {
    if (data.links) {
      this.linksCache = { ...this.linksCache, ...data.links };
    }
    if (data.times) {
      this.timeCache = { ...this.timeCache, ...data.times };
    }
    this.saveToStorage();
    this.logger.info('Data imported');
  }
}

// Instance singleton
let taskLinksManagerInstance = null;

/**
 * Initialise le TaskLinksManager (singleton)
 */
export function initTaskLinksManager(gristManager) {
  if (!taskLinksManagerInstance) {
    taskLinksManagerInstance = new TaskLinksManager(gristManager);
  }
  return taskLinksManagerInstance;
}

/**
 * Récupère l'instance du TaskLinksManager
 */
export function getTaskLinksManager() {
  return taskLinksManagerInstance;
}
