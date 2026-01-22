// === utils/UserActionManager.js ===
// Gestionnaire des actions utilisateur utilisant le champ notes en JSON

import { TABLE_ID } from '../config/constants.js';
import { getNotesJsonMigrator } from './NotesJsonMigrator.js';
import { createModuleLogger } from './LoggerManager.js';

/**
 * Gestionnaire des actions utilisateur utilisant JSON dans le champ notes
 */
export class UserActionManager {
  constructor(gristApi) {
    this.grist = gristApi;
    this.cachedUserName = null; // Cache pour éviter les appels répétés
    this.logger = createModuleLogger('UserActionManager');
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
      this.logger.debug('Récupération utilisateur via enregistrement tampon...');
      
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
        this.logger.warn('Impossible de créer l\'enregistrement temporaire');
        return 'Unknown User';
      }
      
      const tempRecordId = tempRecord.retValues[0];
      this.logger.debug('Enregistrement temporaire créé:', tempRecordId);
      
      // Attendre un peu pour que le trigger se déclenche
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Récupérer l'enregistrement avec le nom d'utilisateur
      const gristData = await this.grist.docApi.fetchTable(TABLE_ID);
      let userName = 'Unknown User';
      
      if (gristData && gristData.id && Array.isArray(gristData.id)) {
        const index = gristData.id.findIndex(id => id === tempRecordId);
        if (index !== -1 && gristData.cree_par && gristData.cree_par[index]) {
          userName = gristData.cree_par[index];
          this.logger.debug('Nom utilisateur trouvé:', userName);
        }
      }
      
      // Supprimer l'enregistrement temporaire
      try {
        await this.grist.docApi.applyUserActions([
          ['RemoveRecord', TABLE_ID, tempRecordId]
        ]);
        this.logger.debug('Enregistrement temporaire supprimé');
      } catch (deleteError) {
        this.logger.warn('Impossible de supprimer l\'enreg. temp.:', deleteError);
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
    this.logger.info('Initialisation utilisateur...');
    const userName = await this.getCurrentUser();
    this.logger.info('Utilisateur initialisé:', userName);
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
   * @param {string} customTimestamp - Timestamp personnalisé (optionnel)
   * @returns {Promise<void>}
   */
  async addHistoryEntry(taskId, action, details, oldValue = '', newValue = '', status = '', customTimestamp = null) {
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
        this.logger.error('NotesJsonMigrator non initialisé');
        return;
      }

      // Préparer l'entrée d'historique
      const historyEntry = {
        user: this.cachedUserName || 'User', // Utiliser le cache ou un nom par défaut
        action: action,
        details: details,
        oldValue: oldValue,
        newValue: newValue,
        status: status || record.statut,
        timestamp: customTimestamp || new Date().toISOString() // Utiliser timestamp personnalisé si fourni
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

      this.logger.debug(`Entrée historique ajoutée: ${action} pour tâche ${taskId}`);

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
      `Tâche créée: ${taskData.titre || 'Nouvelle tâche'}`,
      '',
      `Tâche créée: ${taskData.titre || 'Nouvelle tâche'}`,
      taskData.statut || 'À faire'
    );
  }

  /**
   * Enregistre la mise à jour d'une tâche avec détails spécifiques
   * @param {number} taskId - ID de la tâche
   * @param {Object} oldData - Anciennes données
   * @param {Object} newData - Nouvelles données
   * @param {string} details - Détails de la modification
   * @returns {Promise<void>}
   */
  async updateTaskAction(taskId, oldData, newData, details = 'Task updated') {
    const changes = this.extractChanges(oldData, newData);
    
    // N'ajouter à l'historique QUE s'il y a des changements réels
    if (changes.hasChanges) {
      // Générer des détails plus spécifiques selon les changements
      const specificDetails = this.generateSpecificDetails(changes.detailedChanges);
      
      // Ne créer l'entrée d'historique que si il y a des détails réels
      if (specificDetails) {
        this.logger.debug('Changements détectés, ajout historique:', changes.oldValue);
        await this.addHistoryEntry(
          taskId,
          'field_change',
          specificDetails,
          changes.oldValue,
          changes.newValue,
          newData.statut || oldData?.statut
        );
      } else {
        this.logger.debug('Changements détectés mais pas significatifs, pas d\'ajout historique');
      }
    } else {
      this.logger.debug('Aucun changement détecté, pas d\'ajout historique');
    }
  }
  
  /**
   * Génère des détails spécifiques selon le type de changement
   * @param {Array} detailedChanges - Liste des changements détaillés
   * @returns {string} Description spécifique du changement
   */
  generateSpecificDetails(detailedChanges) {
    if (!detailedChanges || detailedChanges.length === 0) {
      return 'Task updated';
    }
    
    const changeTypeLabels = {
      'titre': 'Titre modifié',
      'description': 'Description mise à jour',
      'projet': 'Projet changé',
      'bureau': 'Équipe modifiée',
      'qui': 'Responsables modifiés',
      'urgence': 'Urgence modifiée',
      'impact': 'Impact modifié',
      'strategie_objectif': 'Objectif stratégique modifié',
      'strategie_sous_objectif': 'Sous-objectif stratégique modifié',
      'strategie_action': 'Action stratégique modifiée',
      'date_debut': 'Date de début modifiée',
      'date_echeance': 'Date d\'échéance modifiée'
    };
    
    const changeDescriptions = detailedChanges.map(change => {
      const field = change.field;
      const label = changeTypeLabels[field] || `${field} modifié`;
      
      // Formatter les valeurs pour éviter "aucune → aucune"
      const formatValue = (value) => {
        if (value === null || value === undefined || value === '') {
          return 'aucune';
        }
        return value;
      };
      
      const oldVal = formatValue(change.oldValue);
      const newVal = formatValue(change.newValue);
      
      // Ignorer les changements où les valeurs sont identiques
      if (oldVal === newVal) {
        return null;
      }
      
      return `${label}: ${oldVal} → ${newVal}`;
    }).filter(Boolean); // Supprimer les null
    
    // Si aucun changement réel après filtrage, ne pas créer d'entrée d'historique
    if (changeDescriptions.length === 0) {
      return null;
    }
    
    if (changeDescriptions.length === 1) {
      return changeDescriptions[0];
    } else if (changeDescriptions.length <= 3) {
      return changeDescriptions.join('; ');
    } else {
      return `Plusieurs champs modifiés: ${changeDescriptions.slice(0, 2).join(', ')} et ${changeDescriptions.length - 2} autres`;
    }
  }

  /**
   * Enregistre un changement de statut
   * @param {number} taskId - ID de la tâche
   * @param {string} oldStatus - Ancien statut
   * @param {string} newStatus - Nouveau statut
   * @returns {Promise<void>}
   */
  async statusChangeAction(taskId, oldStatus, newStatus) {
    // Ne pas enregistrer si le statut n'a pas vraiment changé
    if (oldStatus === newStatus) {
      return;
    }
    
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
   * @returns {Object} - {hasChanges, oldValue, newValue}
   */
  extractChanges(oldData, newData) {
    const relevantFields = [
      'statut', 'titre', 'description', 'bureau', 'qui', 'urgence', 'impact', 'projet',
      'strategie_objectif', 'strategie_sous_objectif', 'strategie_action',
      'date_debut', 'date_echeance'
    ];
    const changes = [];
    const detailedChanges = [];

    for (const field of relevantFields) {
      const oldValue = oldData?.[field];
      const newValue = newData?.[field];
      
      // Comparaison approfondie pour les tableaux (bureau, qui)
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        // Comparer les tableaux en tant que chaînes triées pour éviter les faux positifs
        const oldStr = oldValue.slice().sort().join(',');
        const newStr = newValue.slice().sort().join(',');
        if (oldStr !== newStr) {
          const oldDisplay = oldValue.join(', ') || 'aucun';
          const newDisplay = newValue.join(', ') || 'aucun';
          changes.push(`${field}: [${oldDisplay}] → [${newDisplay}]`);
          detailedChanges.push({
            field,
            oldValue: oldDisplay,
            newValue: newDisplay
          });
        }
      } else {
        // Comparaison normale pour les autres types
        if (oldValue !== newValue) {
          const oldDisplay = oldValue || 'aucune';
          const newDisplay = newValue || 'aucune';
          changes.push(`${field}: "${oldDisplay}" → "${newDisplay}"`);
          detailedChanges.push({
            field,
            oldValue: oldDisplay,
            newValue: newDisplay
          });
        }
      }
    }

    return {
      hasChanges: changes.length > 0,
      oldValue: changes.length > 0 ? changes.join(', ') : 'No changes detected',
      newValue: changes.length > 0 ? 'Updated' : 'No changes',
      detailedChanges
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
    this.logger.debug(`Migration demandée pour ${records?.length} enregistrements`);
    const migrator = getNotesJsonMigrator();
    if (!migrator) {
      console.error('UserActionManager: NotesJsonMigrator not initialized');
      return 0;
    }

    this.logger.debug('Lancement migration via migrator...');
    const result = await migrator.migrateAllRecords(records);
    this.logger.debug('Résultat migration:', result);
    return result;
  }
  
  /**
   * Synchronise le content avec le dernier commentaire pour toutes les tâches
   * @param {Array} records - Liste des enregistrements
   * @returns {Promise<number>}
   */
  async synchronizeAllContent(records) {
    this.logger.debug(`Synchronisation content demandée pour ${records?.length} enregistrements`);
    const migrator = getNotesJsonMigrator();
    if (!migrator) {
      console.error('UserActionManager: NotesJsonMigrator not initialized');
      return 0;
    }

    this.logger.debug('Lancement synchronisation via migrator...');
    const result = await migrator.synchronizeAllContent(records);
    this.logger.debug('Résultat synchronisation:', result);
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