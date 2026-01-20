// === managers/MissionsManager.js ===
// Gestionnaire pour les missions et sous-actions

import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour les missions et sous-actions (approche dénormalisée)
 */
export class MissionsManager {
  constructor(gristManager) {
    this.grist = gristManager;
    this.logger = createModuleLogger('MissionsManager');

    // Cache des missions agrégées
    this.missionsCache = new Map();
    this.lastUpdate = null;

    this.logger.debug('MissionsManager initialized');
  }

  /**
   * Charge toutes les tâches et agrège par mission
   * @returns {Promise<Map>} Map des missions
   */
  async loadMissions() {
    try {
      this.logger.debug('Loading missions from tasks...');

      // Récupérer toutes les tâches depuis le cache du GristManager
      const tasks = this.grist.currentRecords || [];

      // Agréger par mission
      this.missionsCache.clear();

      for (const task of tasks) {
        const missionCode = task.mission_code;

        if (!missionCode) {
          // Tâche non classifiée
          continue;
        }

        // Récupérer ou créer la mission dans le cache
        if (!this.missionsCache.has(missionCode)) {
          this.missionsCache.set(missionCode, {
            code: missionCode,
            nom: task.mission_nom || 'Sans nom',
            responsable: task.mission_responsable || '',
            bureau: task.mission_bureau || '',
            priorite: task.mission_priorite || 'Moyenne',
            date_debut: task.mission_date_debut || null,
            date_fin: task.mission_date_fin || null,
            sous_actions: new Map(),
            taches: [],
            stats: {
              total: 0,
              completed: 0,
              inProgress: 0
            }
          });
        }

        const mission = this.missionsCache.get(missionCode);

        // Ajouter la tâche
        mission.taches.push(task);
        mission.stats.total++;

        if (task.statut === 'Terminé') {
          mission.stats.completed++;
        } else if (task.statut === 'En cours') {
          mission.stats.inProgress++;
        }

        // Gérer les sous-actions
        const sousActionCode = task.sous_action_code;
        if (sousActionCode) {
          if (!mission.sous_actions.has(sousActionCode)) {
            mission.sous_actions.set(sousActionCode, {
              code: sousActionCode,
              nom: task.sous_action_nom || 'Sans nom',
              categorie: task.categorie || '',
              charge_estimee: task.sous_action_charge_estimee || 0,
              charge_reelle: task.sous_action_charge_reelle || 0,
              taches: []
            });
          }

          mission.sous_actions.get(sousActionCode).taches.push(task);
        }
      }

      this.lastUpdate = new Date();
      this.logger.debug(`Loaded ${this.missionsCache.size} missions`);

      return this.missionsCache;
    } catch (error) {
      this.logger.error('Failed to load missions:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les missions
   * @returns {Promise<Array>} Array des missions
   */
  async getMissions() {
    if (this.missionsCache.size === 0) {
      await this.loadMissions();
    }

    return Array.from(this.missionsCache.values());
  }

  /**
   * Récupère une mission par code
   * @param {string} missionCode - Code de la mission
   * @returns {Promise<Object|null>} Mission ou null
   */
  async getMission(missionCode) {
    if (this.missionsCache.size === 0) {
      await this.loadMissions();
    }

    return this.missionsCache.get(missionCode) || null;
  }

  /**
   * Récupère les tâches non classifiées
   * @returns {Promise<Array>} Tâches sans mission
   */
  async getUnclassifiedTasks() {
    try {
      const tasks = this.grist.currentRecords || [];
      return tasks.filter(task => !task.mission_code || task.mission_code === '');
    } catch (error) {
      this.logger.error('Failed to get unclassified tasks:', error);
      return [];
    }
  }

  /**
   * Crée ou met à jour une mission (en créant une tâche support)
   * @param {Object} missionData - Données de la mission
   * @param {Array} sousActions - Liste des sous-actions
   * @returns {Promise<Object>} Mission créée
   */
  async saveMission(missionData, sousActions = []) {
    try {
      this.logger.debug('Saving mission:', missionData);

      // Valider les données
      if (!missionData.code || !missionData.nom) {
        throw new Error('Code et nom de mission requis');
      }

      // Vérifier si la mission existe déjà
      const existingTasks = this.grist.currentRecords || [];
      const missionExists = existingTasks.some(t => t.mission_code === missionData.code);

      if (!missionExists) {
        const responsableList = this.normalizeListValue(missionData.responsable);
        const bureauList = this.normalizeListValue(missionData.bureau);

        // Créer une tâche "support" pour la mission
        const supportTask = {
          titre: `[MISSION] ${missionData.nom}`,
          description: `Mission: ${missionData.nom}\nCode: ${missionData.code}`,
          statut: 'En cours',
          qui: responsableList,
          bureau: bureauList,
          priorite: missionData.priorite || 'Moyenne',
          mission_code: missionData.code,
          mission_nom: missionData.nom,
          mission_responsable: missionData.responsable || '',
          mission_bureau: missionData.bureau || '',
          mission_priorite: missionData.priorite || 'Moyenne',
          mission_date_debut: missionData.date_debut || null,
          mission_date_fin: missionData.date_fin || null,
          est_classifiee: true
        };

        await this.grist.saveRecord(supportTask);
        this.logger.debug('Mission support task created');
      }

      // Créer les sous-actions si fournies
      for (const sa of sousActions) {
        if (sa.code && sa.nom) {
          const responsableList = this.normalizeListValue(missionData.responsable);
          const bureauList = this.normalizeListValue(missionData.bureau);

          const saTask = {
            titre: `[SA] ${sa.nom}`,
            description: `Sous-action: ${sa.nom}\nCode: ${sa.code}\nCatégorie: ${sa.categorie}`,
            statut: 'À faire',
            qui: responsableList,
            bureau: bureauList,
            mission_code: missionData.code,
            mission_nom: missionData.nom,
            mission_responsable: missionData.responsable || '',
            mission_bureau: missionData.bureau || '',
            mission_priorite: missionData.priorite || 'Moyenne',
            mission_date_debut: missionData.date_debut || null,
            mission_date_fin: missionData.date_fin || null,
            sous_action_code: sa.code,
            sous_action_nom: sa.nom,
            categorie: sa.categorie || 'Projet',
            sous_action_charge_estimee: sa.charge || 0,
            est_classifiee: true
          };

          await this.grist.saveRecord(saTask);
          this.logger.debug('Sous-action task created:', sa.code);
        }
      }

      // Recharger le cache
      await this.loadMissions();

      return this.missionsCache.get(missionData.code);
    } catch (error) {
      this.logger.error('Failed to save mission:', error);
      throw error;
    }
  }

  normalizeListValue(value) {
    if (Array.isArray(value)) {
      return value.length ? value : ['L'];
    }

    if (typeof value === 'string' && value.trim()) {
      return ['L', value.trim()];
    }

    return ['L'];
  }

  /**
   * Rattache une tâche existante à une mission/sous-action
   * @param {number} taskId - ID de la tâche
   * @param {string} missionCode - Code de la mission
   * @param {Object} missionData - Données complètes de la mission
   * @param {Object} sousActionData - Données de la sous-action (optionnel)
   * @returns {Promise<void>}
   */
  async attachTaskToMission(taskId, missionCode, missionData, sousActionData = null) {
    try {
      this.logger.debug(`Attaching task ${taskId} to mission ${missionCode}`);

      const updates = {
        mission_code: missionCode,
        mission_nom: missionData.nom,
        mission_responsable: missionData.responsable || '',
        mission_bureau: missionData.bureau || '',
        mission_priorite: missionData.priorite || 'Moyenne',
        mission_date_debut: missionData.date_debut || null,
        mission_date_fin: missionData.date_fin || null,
        est_classifiee: true
      };

      if (sousActionData) {
        updates.sous_action_code = sousActionData.code;
        updates.sous_action_nom = sousActionData.nom;
        updates.categorie = sousActionData.categorie;
        updates.sous_action_charge_estimee = sousActionData.charge_estimee || 0;
      }

      await this.grist.saveRecord(updates, taskId);

      // Recharger le cache
      await this.loadMissions();

      this.logger.debug(`Task ${taskId} attached successfully`);
    } catch (error) {
      this.logger.error('Failed to attach task:', error);
      throw error;
    }
  }

  /**
   * Détache une tâche de sa mission
   * @param {number} taskId - ID de la tâche
   * @returns {Promise<void>}
   */
  async detachTaskFromMission(taskId) {
    try {
      this.logger.debug(`Detaching task ${taskId} from mission`);

      const updates = {
        mission_code: '',
        mission_nom: '',
        mission_responsable: '',
        mission_bureau: '',
        mission_priorite: '',
        mission_date_debut: null,
        mission_date_fin: null,
        sous_action_code: '',
        sous_action_nom: '',
        categorie: '',
        sous_action_charge_estimee: 0,
        sous_action_charge_reelle: 0,
        est_classifiee: false
      };

      await this.grist.saveRecord(updates, taskId);

      // Recharger le cache
      await this.loadMissions();

      this.logger.debug(`Task ${taskId} detached successfully`);
    } catch (error) {
      this.logger.error('Failed to detach task:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques globales
   * @returns {Promise<Object>} Statistiques
   */
  async getStats() {
    try {
      const missions = await this.getMissions();
      const unclassified = await this.getUnclassifiedTasks();

      const stats = {
        missions_total: missions.length,
        missions_actives: missions.filter(m => m.stats.total > m.stats.completed).length,
        taches_total: 0,
        taches_non_classifiees: unclassified.length,
        missions_en_retard: 0,
        par_categorie: {
          MCO: 0,
          Projet: 0,
          Imprévisible: 0
        }
      };

      const today = new Date();

      for (const mission of missions) {
        stats.taches_total += mission.stats.total;

        // Missions en retard
        if (mission.date_fin) {
          const dateFin = new Date(mission.date_fin);
          if (dateFin < today && mission.stats.completed < mission.stats.total) {
            stats.missions_en_retard++;
          }
        }

        // Compter par catégorie
        for (const sa of mission.sous_actions.values()) {
          if (sa.categorie && stats.par_categorie[sa.categorie] !== undefined) {
            stats.par_categorie[sa.categorie] += sa.taches.length;
          }
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      return {
        missions_total: 0,
        missions_actives: 0,
        taches_total: 0,
        taches_non_classifiees: 0,
        missions_en_retard: 0,
        par_categorie: { MCO: 0, Projet: 0, Imprévisible: 0 }
      };
    }
  }

  /**
   * Recherche dans les missions
   * @param {string} query - Terme de recherche
   * @returns {Promise<Array>} Missions correspondantes
   */
  async searchMissions(query) {
    const missions = await this.getMissions();
    const lowerQuery = query.toLowerCase();

    return missions.filter(mission => {
      return mission.code.toLowerCase().includes(lowerQuery) ||
             mission.nom.toLowerCase().includes(lowerQuery) ||
             mission.responsable.toLowerCase().includes(lowerQuery);
    });
  }

  /**
   * Filtre les missions
   * @param {Object} filters - Filtres à appliquer
   * @returns {Promise<Array>} Missions filtrées
   */
  async filterMissions(filters) {
    let missions = await this.getMissions();

    if (filters.priorite) {
      missions = missions.filter(m => m.priorite === filters.priorite);
    }

    if (filters.categorie) {
      missions = missions.filter(m => {
        // Vérifier si au moins une sous-action a cette catégorie
        for (const sa of m.sous_actions.values()) {
          if (sa.categorie === filters.categorie) {
            return true;
          }
        }
        return false;
      });
    }

    if (filters.bureau) {
      missions = missions.filter(m => m.bureau === filters.bureau);
    }

    return missions;
  }

  /**
   * Exporte les missions en JSON
   * @returns {Promise<string>} JSON des missions
   */
  async exportMissions() {
    const missions = await this.getMissions();

    const exportData = missions.map(mission => ({
      code: mission.code,
      nom: mission.nom,
      responsable: mission.responsable,
      bureau: mission.bureau,
      priorite: mission.priorite,
      date_debut: mission.date_debut,
      date_fin: mission.date_fin,
      stats: mission.stats,
      sous_actions: Array.from(mission.sous_actions.values()).map(sa => ({
        code: sa.code,
        nom: sa.nom,
        categorie: sa.categorie,
        charge_estimee: sa.charge_estimee,
        charge_reelle: sa.charge_reelle,
        nb_taches: sa.taches.length
      }))
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Rafraîchit le cache
   * @returns {Promise<void>}
   */
  async refresh() {
    this.missionsCache.clear();
    await this.loadMissions();
    this.logger.debug('Missions cache refreshed');
  }
}
