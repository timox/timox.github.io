// === utils/UserActionManager.js ===
// Gestionnaire des actions utilisateur utilisant le champ notes en JSON

import { TABLE_ID } from '../config/constants.js';
import { getNotesJsonMigrator } from './NotesJsonMigrator.js';

/**
 * Gestionnaire des actions utilisateur utilisant JSON dans le champ notes
 */
export class UserActionManager {
  constructor(gristApi) {
    this.grist = gristApi;
    this.cachedUserName = null; // Cache pour éviter les appels répétés
  }

  /**
   * Récupère l'utilisateur actuel depuis Grist via un enregistrement tampon
   * @returns {string}
   */
  async getCurrentUser() {
    // Utiliser le cache si disponible
    if (this.cachedUserName) {
      return this.cachedUserName;
    }
    
    try {
      console.log('UserActionManager: Getting current user via buffer record...');
      
      // Créer un enregistrement temporaire pour déclencher le trigger user.Name
      const tempRecord = await this.grist.docApi.applyUserActions([
        ['AddRecord', TABLE_ID, null, {
          titre: '___TEMP_USER_RECORD___',
          statut: 'Backlog',
          description: 'Temporary record to get user name',
          bureau: ['L'],
          qui: ['L'],
          urgence: 'Longue',
          impact: 'Mineur'
        }]
      ]);
      
      if (!tempRecord || !tempRecord.retValues || !tempRecord.retValues[0]) {
        console.warn('UserActionManager: Failed to create temp record');
        return 'Unknown User';
      }
      
      const tempRecordId = tempRecord.retValues[0];
      console.log('UserActionManager: Created temp record with ID:', tempRecordId);
      
      // Attendre un peu pour que le trigger se déclenche
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Récupérer l'enregistrement avec le nom d'utilisateur
      const gristData = await this.grist.docApi.fetchTable(TABLE_ID);
      let userName = 'Unknown User';
      
      if (gristData && gristData.id && Array.isArray(gristData.id)) {
        const index = gristData.id.findIndex(id => id === tempRecordId);
        if (index !== -1 && gristData.Cree_par && gristData.Cree_par[index]) {
          userName = gristData.Cree_par[index];
          console.log('UserActionManager: Found user name:', userName);
        }
      }
      
      // Supprimer l'enregistrement temporaire
      try {
        await this.grist.docApi.applyUserActions([
          ['RemoveRecord', TABLE_ID, tempRecordId]
        ]);
        console.log('UserActionManager: Deleted temp record');
      } catch (deleteError) {
        console.warn('UserActionManager: Failed to delete temp record:', deleteError);
      }
      
      // Mettre en cache le nom d'utilisateur
      this.cachedUserName = userName;
      return userName;
      
    } catch (error) {
      console.error('UserActionManager: Error getting current user:', error);
      return 'Unknown User';
    }
  }

  /**
   * Initialise et met en cache le nom d'utilisateur
   * @returns {Promise<string>}
   */
  async initializeUser() {
    console.log('UserActionManager: Initializing user...');
    const userName = await this.getCurrentUser();
    console.log('UserActionManager: User initialized:', userName);
    return userName;
  }

  /**
   * Ajoute une entrée d'historique à une tâche
   * @param {number} taskId - ID de la tâche
   * @param {string} action - Type d'action (create, update, status_change, delete)
   * @param {string} details - Détails de l'action
   * @param {string} oldValue - Ancienne valeur
   * @param {string} newValue - Nouvelle valeur
   * @param {string} status - Statut actuel
   * @returns {Promise<void>}
   */
  async addHistoryEntry(taskId, action, details, oldValue = '', newValue = '', status = '') {
    try {
      // Récupérer l'enregistrement actuel depuis les données Grist
      const gristData = await this.grist.docApi.fetchTable(TABLE_ID);
      
      // Mapper les données Grist vers un format utilisable
      let record = null;
      if (gristData && gristData.id && Array.isArray(gristData.id)) {
        const index = gristData.id.findIndex(id => id === taskId);
        if (index !== -1) {
          record = {};
          Object.keys(gristData).forEach(key => {
            if (Array.isArray(gristData[key]) && gristData[key].length > index) {
              record[key] = gristData[key][index];
            }
          });
        }
      }
      
      if (!record) {
        console.error(`UserActionManager: Task ${taskId} not found`);
        return;
      }

      const migrator = getNotesJsonMigrator();
      if (!migrator) {
        console.error('UserActionManager: NotesJsonMigrator not initialized');
        return;
      }

      // Préparer l'entrée d'historique
      const historyEntry = {
        user: this.cachedUserName || 'User', // Utiliser le cache ou un nom par défaut
        action: action,
        details: details,
        oldValue: oldValue,
        newValue: newValue,
        status: status || record.statut
      };

      // Ajouter l'entrée via le migrator
      await migrator.addHistoryEntry(record, historyEntry);

      // Mettre à jour la date de dernière modification
      await this.grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, taskId, { 
          date_derniere_maj: new Date().toISOString(),
          historique_statuts: action === 'status_change' ? new Date().toISOString() : record.historique_statuts
        }]
      ]);

      console.log(`UserActionManager: Added ${action} history entry for task ${taskId}`);

    } catch (error) {
      console.error('UserActionManager: Error adding history entry:', error);
    }
  }

  /**
   * Enregistre la création d'une nouvelle tâche
   * @param {number} taskId - ID de la tâche créée
   * @param {Object} taskData - Données de la tâche
   * @returns {Promise<void>}
   */
  async createTaskAction(taskId, taskData) {
    await this.addHistoryEntry(
      taskId,
      'create',
      `Task created: ${taskData.titre || 'New task'}`,
      '',
      'Task created',
      taskData.statut || 'À faire'
    );
  }

  /**
   * Enregistre la mise à jour d'une tâche
   * @param {number} taskId - ID de la tâche
   * @param {Object} oldData - Anciennes données
   * @param {Object} newData - Nouvelles données
   * @param {string} details - Détails de la modification
   * @returns {Promise<void>}
   */
  async updateTaskAction(taskId, oldData, newData, details = 'Task updated') {
    const changes = this.extractChanges(oldData, newData);
    
    await this.addHistoryEntry(
      taskId,
      'update',
      details,
      changes.oldValue,
      changes.newValue,
      newData.statut || oldData?.statut
    );
  }

  /**
   * Enregistre un changement de statut
   * @param {number} taskId - ID de la tâche
   * @param {string} oldStatus - Ancien statut
   * @param {string} newStatus - Nouveau statut
   * @returns {Promise<void>}
   */
  async statusChangeAction(taskId, oldStatus, newStatus) {
    await this.addHistoryEntry(
      taskId,
      'status_change',
      `Status changed from ${oldStatus} to ${newStatus}`,
      oldStatus,
      newStatus,
      newStatus
    );
  }

  /**
   * Enregistre la suppression d'une tâche
   * @param {number} taskId - ID de la tâche
   * @param {Object} taskData - Données de la tâche supprimée
   * @returns {Promise<void>}
   */
  async deleteTaskAction(taskId, taskData) {
    await this.addHistoryEntry(
      taskId,
      'delete',
      `Task deleted: ${taskData.titre || 'Unknown task'}`,
      `Task: ${taskData.titre || 'Unknown'}`,
      'Task deleted',
      taskData.statut || 'Unknown'
    );
  }

  /**
   * Extrait les changements significatifs entre deux objets
   * @param {Object} oldData - Anciennes données
   * @param {Object} newData - Nouvelles données
   * @returns {Object} - {oldValue, newValue}
   */
  extractChanges(oldData, newData) {
    const relevantFields = ['statut', 'titre', 'description', 'bureau', 'qui', 'urgence', 'impact', 'notes'];
    const changes = [];

    for (const field of relevantFields) {
      if (oldData && newData && oldData[field] !== newData[field]) {
        changes.push(`${field}: ${oldData[field]} → ${newData[field]}`);
      }
    }

    return {
      oldValue: changes.length > 0 ? changes.join(', ') : 'No changes detected',
      newValue: 'Updated'
    };
  }

  /**
   * Récupère l'historique d'une tâche
   * @param {number} taskId - ID de la tâche
   * @returns {Promise<Array>}
   */
  async getTaskHistory(taskId) {
    try {
      // Récupérer l'enregistrement actuel depuis les données Grist
      const gristData = await this.grist.docApi.fetchTable(TABLE_ID);
      
      // Mapper les données Grist vers un format utilisable
      let record = null;
      if (gristData && gristData.id && Array.isArray(gristData.id)) {
        const index = gristData.id.findIndex(id => id === taskId);
        if (index !== -1) {
          record = {};
          Object.keys(gristData).forEach(key => {
            if (Array.isArray(gristData[key]) && gristData[key].length > index) {
              record[key] = gristData[key][index];
            }
          });
        }
      }
      
      if (!record) {
        return [];
      }

      const migrator = getNotesJsonMigrator();
      if (!migrator) {
        return [];
      }

      return migrator.getHistory(record);
    } catch (error) {
      console.error('UserActionManager: Error getting task history:', error);
      return [];
    }
  }

  /**
   * Récupère le contenu texte des notes d'une tâche
   * @param {Object} record - Enregistrement de la tâche
   * @returns {string}
   */
  getNotesContent(record) {
    const migrator = getNotesJsonMigrator();
    if (!migrator) {
      return record.notes || '';
    }
    
    return migrator.getContent(record);
  }

  /**
   * Migre toutes les tâches vers le format JSON si nécessaire
   * @param {Array} records - Liste des enregistrements
   * @returns {Promise<number>}
   */
  async migrateAllTasks(records) {
    console.log('UserActionManager: migrateAllTasks called with', records?.length, 'records');
    const migrator = getNotesJsonMigrator();
    if (!migrator) {
      console.error('UserActionManager: NotesJsonMigrator not initialized');
      return 0;
    }

    console.log('UserActionManager: calling migrator.migrateAllRecords');
    const result = await migrator.migrateAllRecords(records);
    console.log('UserActionManager: migration result:', result);
    return result;
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