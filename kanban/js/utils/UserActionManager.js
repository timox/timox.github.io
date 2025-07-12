// === utils/UserActionManager.js ===
// Gestionnaire des actions utilisateur pour la table User_Actions2

import { USER_ACTIONS_TABLE } from '../config/constants.js';

/**
 * Gestionnaire des actions utilisateur
 */
export class UserActionManager {
  constructor(gristApi) {
    this.grist = gristApi;
  }

  /**
   * Crée un enregistrement d'action utilisateur pour une nouvelle tâche
   * @param {number} taskId - ID de la tâche créée
   * @param {Object} taskData - Données de la tâche
   * @returns {Promise<void>}
   */
  async createTaskAction(taskId, taskData) {
    try {
      const actionData = {
        task_id: taskId,
        action_type: 'create',
        timestamp: new Date().toISOString(),
        old_value: '',
        new_value: 'Task created',
        details: `Initial creation - ${taskData.titre || 'New task'}`
        // user_name sera automatiquement rempli par la fonction _default_user_name de Grist
      };

      console.log('UserActionManager: Creating task action:', actionData);

      await this.grist.docApi.applyUserActions([
        ['AddRecord', USER_ACTIONS_TABLE, null, actionData]
      ]);

      console.log('UserActionManager: Task creation action recorded successfully');

    } catch (error) {
      console.error('UserActionManager: Error creating task action:', error);
      // Ne pas faire échouer l'opération principale si l'enregistrement de l'action échoue
    }
  }

  /**
   * Crée un enregistrement d'action utilisateur pour une mise à jour de tâche
   * @param {number} taskId - ID de la tâche mise à jour
   * @param {Object} oldData - Anciennes données
   * @param {Object} newData - Nouvelles données
   * @param {string} details - Détails de la modification
   * @returns {Promise<void>}
   */
  async updateTaskAction(taskId, oldData, newData, details = 'Task updated') {
    try {
      const actionData = {
        task_id: taskId,
        action_type: 'update',
        timestamp: new Date().toISOString(),
        old_value: this.extractRelevantChanges(oldData),
        new_value: this.extractRelevantChanges(newData),
        details: details
        // user_name sera automatiquement rempli par la fonction _default_user_name de Grist
      };

      console.log('UserActionManager: Creating update action:', actionData);

      await this.grist.docApi.applyUserActions([
        ['AddRecord', USER_ACTIONS_TABLE, null, actionData]
      ]);

      console.log('UserActionManager: Task update action recorded successfully');

    } catch (error) {
      console.error('UserActionManager: Error creating update action:', error);
      // Ne pas faire échouer l'opération principale si l'enregistrement de l'action échoue
    }
  }

  /**
   * Crée un enregistrement d'action utilisateur pour une suppression de tâche
   * @param {number} taskId - ID de la tâche supprimée
   * @param {Object} taskData - Données de la tâche supprimée
   * @returns {Promise<void>}
   */
  async deleteTaskAction(taskId, taskData) {
    try {
      const actionData = {
        task_id: taskId,
        action_type: 'delete',
        timestamp: new Date().toISOString(),
        old_value: `Task: ${taskData.titre || 'Unknown'}`,
        new_value: 'Task deleted',
        details: `Task deleted - ${taskData.titre || 'Unknown task'}`
        // user_name sera automatiquement rempli par la fonction _default_user_name de Grist
      };

      console.log('UserActionManager: Creating delete action:', actionData);

      await this.grist.docApi.applyUserActions([
        ['AddRecord', USER_ACTIONS_TABLE, null, actionData]
      ]);

      console.log('UserActionManager: Task deletion action recorded successfully');

    } catch (error) {
      console.error('UserActionManager: Error creating delete action:', error);
      // Ne pas faire échouer l'opération principale si l'enregistrement de l'action échoue
    }
  }

  /**
   * Crée un enregistrement d'action pour un changement de statut
   * @param {number} taskId - ID de la tâche
   * @param {string} oldStatus - Ancien statut
   * @param {string} newStatus - Nouveau statut
   * @returns {Promise<void>}
   */
  async statusChangeAction(taskId, oldStatus, newStatus) {
    await this.updateTaskAction(
      taskId,
      { statut: oldStatus },
      { statut: newStatus },
      `Status changed from ${oldStatus} to ${newStatus}`
    );
  }


  /**
   * Extrait les changements pertinents d'un objet de données
   * @param {Object} data - Données à extraire
   * @returns {string}
   */
  extractRelevantChanges(data) {
    if (!data) return '';

    const relevantFields = ['statut', 'titre', 'description', 'bureau', 'qui', 'urgence', 'impact'];
    const changes = [];

    for (const field of relevantFields) {
      if (data[field] !== undefined) {
        changes.push(`${field}: ${data[field]}`);
      }
    }

    return changes.join(', ');
  }

  /**
   * Récupère l'historique des actions pour une tâche
   * @param {number} taskId - ID de la tâche
   * @returns {Promise<Array>}
   */
  async getTaskHistory(taskId) {
    try {
      // Cette méthode nécessiterait l'accès aux données de la table User_Actions2
      // Pour l'instant, on retourne un tableau vide
      console.log('UserActionManager: Getting history for task:', taskId);
      return [];
    } catch (error) {
      console.error('UserActionManager: Error getting task history:', error);
      return [];
    }
  }
}

// Instance singleton
let userActionManagerInstance = null;

/**
 * Initialise le gestionnaire d'actions utilisateur
 * @param {Object} gristApi - API Grist
 * @returns {UserActionManager}
 */
export function initUserActionManager(gristApi) {
  if (!userActionManagerInstance) {
    userActionManagerInstance = new UserActionManager(gristApi);
  }
  return userActionManagerInstance;
}

/**
 * Récupère l'instance du gestionnaire d'actions utilisateur
 * @returns {UserActionManager|null}
 */
export function getUserActionManager() {
  return userActionManagerInstance;
}