// === utils/NotesJsonMigrator.js ===
// Utility to migrate existing notes to JSON format

import { TABLE_ID } from '../config/constants.js';

/**
 * Migre les notes existantes vers le format JSON
 */
export class NotesJsonMigrator {
  constructor(gristApi) {
    this.grist = gristApi;
  }

  /**
   * Vérifie si une note est déjà en format JSON
   * @param {string} notes - Contenu des notes
   * @returns {boolean}
   */
  isJsonFormat(notes) {
    if (!notes || typeof notes !== 'string') return false;
    
    try {
      const parsed = JSON.parse(notes);
      return parsed && typeof parsed === 'object' && parsed.hasOwnProperty('content');
    } catch (error) {
      return false;
    }
  }

  /**
   * Convertit une note texte en format JSON
   * @param {string} notes - Contenu texte des notes
   * @returns {string} - JSON stringifié
   */
  convertToJsonFormat(notes) {
    const jsonNotes = {
      content: notes || "",
      history: []
    };
    return JSON.stringify(jsonNotes, null, 2);
  }

  /**
   * Migre tous les enregistrements avec des notes en format texte
   * @param {Array} records - Liste des enregistrements
   * @returns {Promise<number>} - Nombre d'enregistrements migrés
   */
  async migrateAllRecords(records) {
    console.log('NotesJsonMigrator: Starting migration...');
    
    // Vérifier que records est bien un array
    if (!Array.isArray(records)) {
      console.error('NotesJsonMigrator: Records is not an array:', typeof records);
      return 0;
    }
    
    const toMigrate = [];
    
    // Identifier les enregistrements à migrer
    for (const record of records) {
      console.log(`Record ${record.id}: notes = "${record.notes}", type = ${typeof record.notes}, isJson = ${this.isJsonFormat(record.notes)}`);
      if (record.notes && !this.isJsonFormat(record.notes)) {
        console.log(`Will migrate record ${record.id}`);
        toMigrate.push(record);
      }
    }

    console.log(`NotesJsonMigrator: Found ${toMigrate.length} records to migrate`);

    if (toMigrate.length === 0) {
      console.log('NotesJsonMigrator: No migration needed');
      return 0;
    }

    // Migrer par lots pour éviter les timeouts
    const batchSize = 10;
    let migrated = 0;

    for (let i = 0; i < toMigrate.length; i += batchSize) {
      const batch = toMigrate.slice(i, i + batchSize);
      const actions = [];

      for (const record of batch) {
        const jsonNotes = this.convertToJsonFormat(record.notes);
        
        actions.push([
          'UpdateRecord', 
          TABLE_ID, 
          record.id, 
          { notes: jsonNotes }
        ]);

        console.log(`Migrating record ${record.id}: "${record.notes?.substring(0, 50)}..." -> JSON`);
      }

      try {
        await this.grist.docApi.applyUserActions(actions);
        migrated += batch.length;
        console.log(`NotesJsonMigrator: Migrated batch ${Math.floor(i / batchSize) + 1}, total: ${migrated}`);
      } catch (error) {
        console.error(`NotesJsonMigrator: Error migrating batch:`, error);
        break;
      }
    }

    console.log(`NotesJsonMigrator: Migration completed. ${migrated} records migrated.`);
    return migrated;
  }

  /**
   * Migre un seul enregistrement si nécessaire
   * @param {Object} record - Enregistrement à migrer
   * @returns {Promise<boolean>} - True si migré
   */
  async migrateRecord(record) {
    if (!record.notes || this.isJsonFormat(record.notes)) {
      return false;
    }

    try {
      const jsonNotes = this.convertToJsonFormat(record.notes);
      
      await this.grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, record.id, { notes: jsonNotes }]
      ]);

      console.log(`NotesJsonMigrator: Migrated record ${record.id}`);
      return true;
    } catch (error) {
      console.error(`NotesJsonMigrator: Error migrating record ${record.id}:`, error);
      return false;
    }
  }

  /**
   * Ajoute une entrée d'historique à un enregistrement
   * @param {Object} record - Enregistrement
   * @param {Object} historyEntry - Entrée d'historique
   * @returns {Promise<void>}
   */
  async addHistoryEntry(record, historyEntry) {
    let notesData;
    
    // Vérifier le format des notes
    if (this.isJsonFormat(record.notes)) {
      notesData = JSON.parse(record.notes);
    } else {
      // Migrer d'abord si nécessaire
      notesData = {
        content: record.notes || "",
        history: []
      };
    }

    // Créer l'entrée d'historique
    const newHistoryEntry = {
      timestamp: new Date().toISOString(),
      user: historyEntry.user || 'System',
      action: historyEntry.action || 'update',
      details: historyEntry.details || '',
      status: historyEntry.status || record.statut
    };
    
    // Ajouter les champs spécifiques si présents
    if (historyEntry.oldValue) newHistoryEntry.oldValue = historyEntry.oldValue;
    if (historyEntry.newValue) newHistoryEntry.newValue = historyEntry.newValue;
    
    // Ajouter l'entrée d'historique
    notesData.history.push(newHistoryEntry);
    
    // ✅ NOUVEAU: Synchroniser content avec le dernier commentaire
    if (historyEntry.action === 'comment' && historyEntry.newValue) {
      notesData.content = historyEntry.newValue;
      console.log(`NotesJsonMigrator: Synchronizing content with latest comment for record ${record.id}`);
    }

    // Limiter l'historique à 50 entrées pour éviter que les notes deviennent trop volumineuses
    if (notesData.history.length > 50) {
      notesData.history = notesData.history.slice(-50);
    }

    try {
      await this.grist.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, record.id, { 
          notes: JSON.stringify(notesData, null, 2) 
        }]
      ]);
    } catch (error) {
      console.error(`NotesJsonMigrator: Error adding history to record ${record.id}:`, error);
    }
  }

  /**
   * Récupère l'historique d'un enregistrement
   * @param {Object} record - Enregistrement
   * @returns {Array} - Historique
   */
  getHistory(record) {
    if (!record.notes || !this.isJsonFormat(record.notes)) {
      return [];
    }

    try {
      const notesData = JSON.parse(record.notes);
      return notesData.history || [];
    } catch (error) {
      console.error('NotesJsonMigrator: Error parsing history:', error);
      return [];
    }
  }

  /**
   * Récupère le contenu texte d'un enregistrement
   * @param {Object} record - Enregistrement
   * @returns {string} - Contenu
   */
  getContent(record) {
    if (!record.notes) return "";
    
    if (this.isJsonFormat(record.notes)) {
      try {
        const notesData = JSON.parse(record.notes);
        return notesData.content || "";
      } catch (error) {
        return record.notes;
      }
    }
    
    return record.notes;
  }
  
  /**
   * Synchronise le content avec le dernier commentaire pour tous les enregistrements
   * @param {Array} records - Liste des enregistrements
   * @returns {Promise<number>} - Nombre d'enregistrements synchronisés
   */
  async synchronizeAllContent(records) {
    console.log('NotesJsonMigrator: Démarrage synchronisation content...');
    
    if (!Array.isArray(records)) {
      console.error('NotesJsonMigrator: Records is not an array:', typeof records);
      return 0;
    }
    
    let synchronized = 0;
    
    for (const record of records) {
      if (record.notes && this.isJsonFormat(record.notes)) {
        try {
          const notesData = JSON.parse(record.notes);
          
          // Trouver le dernier commentaire
          if (notesData.history && Array.isArray(notesData.history)) {
            const comments = notesData.history
              .filter(entry => entry.action === 'comment')
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (comments.length > 0) {
              const latestComment = comments[0].newValue || '';
              
              // Synchroniser seulement si différent
              if (notesData.content !== latestComment) {
                notesData.content = latestComment;
                
                await this.grist.docApi.applyUserActions([
                  ['UpdateRecord', TABLE_ID, record.id, { 
                    notes: JSON.stringify(notesData, null, 2) 
                  }]
                ]);
                
                synchronized++;
                console.log(`NotesJsonMigrator: Synchronisé record ${record.id}`);
              }
            }
          }
        } catch (error) {
          console.error(`NotesJsonMigrator: Erreur synchronisation record ${record.id}:`, error);
        }
      }
    }
    
    console.log(`NotesJsonMigrator: Synchronisation terminée. ${synchronized} enregistrements synchronisés.`);
    return synchronized;
  }
}

// Instance singleton
let migratorInstance = null;

/**
 * Initialise le migrateur
 * @param {Object} gristApi - API Grist
 * @returns {NotesJsonMigrator}
 */
export function initNotesJsonMigrator(gristApi) {
  if (!migratorInstance) {
    migratorInstance = new NotesJsonMigrator(gristApi);
  }
  return migratorInstance;
}

/**
 * Récupère l'instance du migrateur
 * @returns {NotesJsonMigrator|null}
 */
export function getNotesJsonMigrator() {
  return migratorInstance;
}