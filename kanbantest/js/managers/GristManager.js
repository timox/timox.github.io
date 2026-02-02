// === managers/GristManager.js ===
// Interface pour l'API Grist et la gestion des données

import {
  TABLE_ID,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  DEFAULT_BUREAUX,
  DEFAULT_RESPONSABLES,
  DEFAULT_URGENCES,
  DEFAULT_IMPACTS,
  DEFAULT_PROJETS,
  STATUTS
} from '../config/constants.js';
import { displayError } from '../utils/dom.js';
import { normalizeDate } from '../utils/dates.js';
import { createModuleLogger } from '../utils/LoggerManager.js';
import { initUserActionManager, getUserActionManager } from '../utils/UserActionManager.js';
import { initNotesJsonMigrator, getNotesJsonMigrator } from '../utils/NotesJsonMigrator.js';

/**
 * Convertit une valeur Grist en string de maniere securisee
 * Gere: string, number, array ['L', 'val'], Reference, null
 */
function toGristString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    // ChoiceList format: ['L', 'val1', 'val2']
    if (value[0] === 'L') return value.slice(1).join(', ');
    return value.join(', ');
  }
  if (typeof value === 'object') {
    // Reference format: peut avoir une propriete displayValue
    if (value.displayValue) return String(value.displayValue);
    return '';
  }
  return String(value);
}

/**
 * Gestionnaire pour l'interface avec Grist
 */
export class GristManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.isConnected = false;
    this.isUpdating = false;
    this.availableColumns = new Set();
    this.currentRecords = [];
    this.gristOptions = {};
    this.logger = createModuleLogger('GristManager');
    this.userActionManager = null;
    this.hasInitializedNotesSystem = false;
    this.hasRunNotesMigration = false;

    this.init();
  }
  
  /**
   * Initialise la connexion avec Grist
   */
  async init() {
    try {
      await this.waitForGristReady();
      this.initializeNotesInfrastructure();
      await this.loadInitialData();
      await this.runPendingNotesMigration();
      this.isConnected = true;
      this.logger.info('Connexion établie avec Grist');
    } catch (error) {
      this.logger.error('Erreur d\'initialisation:', error);
      displayError('Impossible de se connecter à Grist');
    }
  }

  initializeNotesInfrastructure() {
    if (this.hasInitializedNotesSystem) {
      return;
    }

    try {
      const gristApi = this.getGristApi();

      // Initialiser le migrateur et le gestionnaire d'actions utilisateur
      initNotesJsonMigrator(gristApi);
      this.userActionManager = initUserActionManager(gristApi);

      if (this.kanban?.setUserActionManager) {
        this.kanban.setUserActionManager(this.userActionManager);
      } else if (this.kanban) {
        this.kanban.userActionManager = this.userActionManager;
      }

      if (typeof window !== 'undefined') {
        window.getUserActionManager = () => getUserActionManager();
      }

      if (this.userActionManager && typeof this.userActionManager.initializeUser === 'function') {
        this.userActionManager.initializeUser()
          .then(userName => {
            if (userName) {
              this.logger.debug(`Utilisateur courant détecté: ${userName}`);
            }
          })
          .catch(error => {
            this.logger.warn('Impossible d\'initialiser le nom utilisateur:', error);
          });
      }

      this.hasInitializedNotesSystem = true;
    } catch (error) {
      this.logger.warn('Initialisation du système de commentaires impossible:', error);
    }
  }

  async runPendingNotesMigration() {
    if (this.hasRunNotesMigration) {
      return;
    }

    try {
      const migrator = getNotesJsonMigrator();
      const userActionManager = this.userActionManager || getUserActionManager();

      if (!migrator || !userActionManager || !Array.isArray(this.currentRecords) || this.currentRecords.length === 0) {
        this.hasRunNotesMigration = true;
        return;
      }

      const migrated = await userActionManager.migrateAllTasks(this.currentRecords);
      if (migrated > 0) {
        this.logger.info(`Migration des notes effectuée pour ${migrated} enregistrements`);
      }

      const synchronized = await userActionManager.synchronizeAllContent(this.currentRecords);
      if (synchronized > 0) {
        this.logger.info(`Synchronisation des commentaires effectuée pour ${synchronized} enregistrements`);
      }

      this.hasRunNotesMigration = true;
    } catch (error) {
      this.logger.warn('Erreur lors de la migration des commentaires:', error);
    }
  }
  
  /**
   * Attend que Grist soit prêt
   * @returns {Promise} Promise résolue quand Grist est prêt
   */
  waitForGristReady() {
    return new Promise((resolve, reject) => {
      try {
        const gristApi = this.getGristApi();

        // Éviter les appels multiples à window.grist.ready()
        if (!window._gristReadyInitialized) {
          gristApi.ready({
            requiredAccess: 'full',
            onEditOptions: () => this.handleEditOptions()
          });
          window._gristReadyInitialized = true;
        }

        // Les callbacks sont toujours enregistrés (même si ready() a déjà été appelé)
        // car ils sont spécifiques à cette instance de GristManager
        if (!window._gristCallbacksInitialized) {
          gristApi.onRecords((records, mappings) => {
            this.handleRecordsUpdate(records, mappings);
          });

          gristApi.onOptions((options) => {
            this.handleOptionsUpdate(options);
          });

          window._gristCallbacksInitialized = true;
        }

        setTimeout(resolve, 100);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Charge les données initiales depuis Grist
   */
  async loadInitialData() {
    try {
      this.logger.debug('Chargement des données...');

      // Charger les enregistrements de la table principale
      const gristApi = this.getGristApi();
      const records = await gristApi.docApi.fetchTable(TABLE_ID);
      
      if (records && typeof records === 'object') {
        // Détecter les colonnes disponibles
        this.availableColumns = new Set(Object.keys(records));
        this.logger.debug('Colonnes détectées:', Array.from(this.availableColumns));
        
        // Vérifier les colonnes requises
        this.validateRequiredColumns();
        
        // Mapper les enregistrements
        this.currentRecords = this.mapGristRecords(records);
        this.logger.info(`${this.currentRecords.length} enregistrements chargés`);
        
        // Charger les options (listes déroulantes, etc.)
        await this.loadGristOptions();
        
      } else {
        throw new Error('Données Grist invalides');
      }
      
    } catch (error) {
      this.logger.error('Erreur chargement données:', error);
      throw error;
    }
  }
  
  /**
   * Valide la présence des colonnes requises
   */
  validateRequiredColumns() {
    const missingColumns = REQUIRED_COLUMNS.filter(col => !this.availableColumns.has(col));
    
    if (missingColumns.length > 0) {
      this.logger.warn('Colonnes manquantes:', missingColumns);
      displayError(`Colonnes manquantes dans Grist: ${missingColumns.join(', ')}`);
    }
    
    // Vérifier les colonnes optionnelles
    const availableOptional = OPTIONAL_COLUMNS.filter(col => this.availableColumns.has(col));
    this.logger.debug('Colonnes optionnelles disponibles:', availableOptional);
  }
  
  /**
   * Mappe les enregistrements Grist vers le format interne
   * @param {object} gristData - Données brutes de Grist
   * @returns {Array} Enregistrements mappés
   */
  mapGristRecords(gristData) {
    const records = [];
    
    if (!gristData || typeof gristData !== 'object') {
      this.logger.warn('Données Grist invalides');
      return [];
    }
    
    const keys = Object.keys(gristData);
    if (!keys.includes('id') || !Array.isArray(gristData.id)) {
      this.logger.warn('Structure de données Grist invalide - colonne id manquante');
      this.logger.debug('Colonnes disponibles:', keys.slice(0, 10));
      return [];
    }

    const recordCount = gristData.id.length;
    
    for (let i = 0; i < recordCount; i++) {
      const record = {};
      let isValidRecord = true;
      
      // Mapper les colonnes requises
      for (const columnName of REQUIRED_COLUMNS) {
        if (gristData.hasOwnProperty(columnName) &&
            Array.isArray(gristData[columnName]) &&
            gristData[columnName].length > i) {

          const value = gristData[columnName][i];

          // Traitement spécial pour les listes (bureau, qui)
          if ((columnName === 'bureau' || columnName === 'qui')) {
            if (Array.isArray(value) && value[0] === 'L') {
              record[columnName] = value;
            } else {
              record[columnName] = ['L']; // Liste vide au format Grist
            }
          } else {
            record[columnName] = value;
          }

        } else if (columnName === 'id') {
          // L'identifiant de ligne est absolument requis
          isValidRecord = false;
          break;
        } else {
          record[columnName] = null;
        }
      }
      
      // Mapper les colonnes optionnelles
      // Colonnes V3 qui doivent etre converties en string
      const V3_STRING_COLUMNS = ['nature_activite', 'genre_action', 'etape_cycle', 'previsibilite', 'previsibilité', 'type_tache'];

      for (const columnName of OPTIONAL_COLUMNS) {
        if (gristData.hasOwnProperty(columnName) &&
            Array.isArray(gristData[columnName]) &&
            gristData[columnName].length > i) {
          const rawValue = gristData[columnName][i];
          // Convertir les colonnes V3 en string pour eviter les erreurs
          if (V3_STRING_COLUMNS.includes(columnName)) {
            record[columnName] = toGristString(rawValue);
          } else {
            record[columnName] = rawValue;
          }
        } else {
          record[columnName] = null;
        }
      }
      
      // Traitement spécial pour les dates
      if (record.date_debut) {
        record.date_debut = normalizeDate(record.date_debut);
      }
      if (record.date_echeance) {
        record.date_echeance = normalizeDate(record.date_echeance);
      }
      
      // Valider et ajouter l'enregistrement
      if (isValidRecord) {
        const parsedId = parseInt(record.id, 10);
        if (!Number.isNaN(parsedId) && parsedId > 0) {
          record.id = parsedId;
          records.push(record);
        } else {
          this.logger.warn(`Record invalide - id: ${record.id}`);
        }
      }
    }
    
    return records;
  }
  
  /**
   * Charge les options Grist (listes déroulantes, etc.)
   */
  async loadGristOptions() {
    try {
      // Extraire les valeurs uniques pour les listes déroulantes
      const extractedBureaux = this.extractUniqueValues('bureau', true);
      const extractedResponsables = this.extractUniqueValues('qui', true);
      
      const sortText = (a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

      const bureauList = [...new Set([...DEFAULT_BUREAUX, ...extractedBureaux])].filter(Boolean).sort(sortText);
      const responsableList = [...new Set([...DEFAULT_RESPONSABLES, ...extractedResponsables])].filter(Boolean).sort(sortText);
      const projetList = [...new Set([...DEFAULT_PROJETS, ...this.extractUniqueValues('projet', false)])].filter(Boolean).sort(sortText);
      const statutDefaults = STATUTS.map(s => s.id);
      const statutList = [...new Set([...statutDefaults, ...this.extractUniqueValues('statut', false)])].filter(Boolean).sort(sortText);
      const urgenceList = [...new Set([...DEFAULT_URGENCES, ...this.extractUniqueValues('urgence', false)])].filter(Boolean).sort(sortText);
      const impactList = [...new Set([...DEFAULT_IMPACTS, ...this.extractUniqueValues('impact', false)])].filter(Boolean).sort(sortText);

      this.gristOptions = {
        bureau: bureauList,
        bureaux: bureauList,
        responsables: responsableList,
        qui: responsableList,
        projet: projetList,
        projets: projetList,
        statut: statutList,
        statuts: statutList,
        urgence: urgenceList,
        urgences: urgenceList,
        impact: impactList,
        impacts: impactList
      };

      this.logger.debug('Options extraites (avec défauts):', this.gristOptions);
      
    } catch (error) {
      this.logger.error('Erreur chargement options:', error);
    }
  }
  
  /**
   * Extrait les valeurs uniques d'une colonne
   * @param {string} columnName - Nom de la colonne
   * @param {boolean} isList - Si c'est une liste (format Grist ['L', ...])
   * @returns {Array} Valeurs uniques
   */
  extractUniqueValues(columnName, isList = false) {
    const values = new Set();
    
    this.currentRecords.forEach(record => {
      const value = record[columnName];
      
      if (isList && Array.isArray(value)) {
        // Pour les listes, extraire chaque élément (sauf le 'L' initial)
        value.slice(1).forEach(item => {
          if (item && typeof item === 'string') {
            values.add(item.trim());
          }
        });
      } else if (!isList && value !== null && value !== undefined) {
        // Pour les valeurs simples
        if (typeof value === 'string' && value.trim()) {
          values.add(value.trim());
        }
      }
    });
    
    return Array.from(values).sort();
  }
  
  /**
   * Sauvegarde un enregistrement (création ou mise à jour)
   * @param {object} recordData - Données de l'enregistrement
   * @param {number|null} recordId - ID pour mise à jour (null pour création)
   * @returns {Promise} Promise résolue avec le résultat
   */
  async saveRecord(recordData, recordId = null) {
    if (this.isUpdating) {
      throw new Error('Une sauvegarde est déjà en cours');
    }

    this.isUpdating = true;

    try {
      // Valider les données
      this.validateRecordData(recordData);

      // Préparer les données pour Grist
      const gristData = this.prepareDataForGrist(recordData);
      const gristApi = this.getGristApi();

      let result;

      if (recordId) {
        // Mise à jour
        this.logger.debug(`Mise à jour enregistrement ${recordId}`);
        await gristApi.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, recordId, gristData]
        ]);

        // Mettre à jour localement
        this.updateLocalRecord(recordId, gristData);
        result = { id: recordId, ...gristData };
        
      } else {
        // Création
        this.logger.debug('Création nouvel enregistrement');
        const actionResult = await gristApi.docApi.applyUserActions([
          ['AddRecord', TABLE_ID, null, gristData]
        ]);

        this.logger.debug('actionResult:', actionResult);

        // Grist retourne [rowId] pour AddRecord (pas {id: rowId})
        let newId = null;
        if (actionResult && actionResult.retValues && actionResult.retValues[0]) {
          // Format: {retValues: [rowId]}
          newId = actionResult.retValues[0];
        } else if (actionResult && Array.isArray(actionResult) && typeof actionResult[0] === 'number') {
          // Format: [rowId]
          newId = actionResult[0];
        } else if (actionResult && actionResult[0] && actionResult[0].id) {
          // Format legacy: [{id: rowId}]
          newId = actionResult[0].id;
        }

        if (newId) {
          const newRecord = { id: newId, ...gristData };

          // Ajouter localement
          this.addLocalRecord(newRecord);
          result = newRecord;
        } else {
          this.logger.error('Format actionResult inattendu:', actionResult);
          throw new Error('Impossible de récupérer l\'ID du nouvel enregistrement');
        }
      }
      
      this.logger.info('Sauvegarde réussie');
      return result;
      
    } catch (error) {
      this.logger.error('Erreur sauvegarde:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }
  
  /**
   * Supprime un enregistrement
   * @param {number} recordId - ID de l'enregistrement à supprimer
   * @returns {Promise} Promise résolue quand la suppression est terminée
   */
  async deleteRecord(recordId) {
    if (this.isUpdating) {
      throw new Error('Une opération est déjà en cours');
    }

    this.isUpdating = true;

    try {
      this.logger.debug(`Suppression enregistrement ${recordId}`);
      const gristApi = this.getGristApi();

      await gristApi.docApi.applyUserActions([
        ['RemoveRecord', TABLE_ID, recordId]
      ]);
      
      // Supprimer localement
      this.removeLocalRecord(recordId);
      
      this.logger.info('Suppression réussie');
      
    } catch (error) {
      this.logger.error('Erreur suppression:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }
  
  /**
   * Valide les données d'un enregistrement
   * @param {object} recordData - Données à valider
   */
  validateRecordData(recordData) {
    if (!recordData || typeof recordData !== 'object') {
      throw new Error('Données d\'enregistrement invalides');
    }
    
    // Vérifier les champs requis
    if (!recordData.titre || !recordData.titre.trim()) {
      throw new Error('Le titre est obligatoire');
    }
    
    if (!recordData.statut || !recordData.statut.trim()) {
      throw new Error('Le statut est obligatoire');
    }
    
    // Valider le format des listes (peuvent être string pour Choice ou array pour ChoiceList)
    // Ne pas valider si c'est une string simple (Choice) ou un array (ChoiceList)
    if (recordData.bureau !== undefined && recordData.bureau !== null && recordData.bureau !== '') {
      // Accepter string (Choice) ou array (ChoiceList)
      if (typeof recordData.bureau !== 'string' && !Array.isArray(recordData.bureau)) {
        throw new Error('Le format du champ bureau est invalide');
      }
    }

    if (recordData.qui !== undefined && recordData.qui !== null && recordData.qui !== '') {
      // Accepter string ou array
      if (typeof recordData.qui !== 'string' && !Array.isArray(recordData.qui)) {
        throw new Error('Le format du champ qui est invalide');
      }
    }
    
    // Valider les dates
    if (recordData.date_echeance && !this.isValidDate(recordData.date_echeance)) {
      throw new Error('Format de date d\'échéance invalide');
    }
    
    if (recordData.date_debut && !this.isValidDate(recordData.date_debut)) {
      throw new Error('Format de date de début invalide');
    }
  }
  
  /**
   * Prépare les données pour l'envoi à Grist
   * @param {object} recordData - Données source
   * @returns {object} Données formatées pour Grist
   */
  prepareDataForGrist(recordData) {
    const gristData = {};

    // Copier les champs simples (existants + nouveaux champs missions)
    const simpleFields = [
      'titre', 'description', 'statut', 'projet', 'urgence', 'impact', 'notes',
      // Champs V3 taxonomy
      'nature_activite', 'genre_action', 'etape_cycle', 'previsibilite',
      // Champs missions
      'code_mission', 'nom_mission', 'mission_responsable', 'mission_bureau',
      'mission_priorite', 'mission_date_debut', 'mission_date_fin',
      // Champs mises en œuvre
      'mise_en_oeuvre_code', 'mise_en_oeuvre_nom', 'categorie',
      'mise_en_oeuvre_charge_estimee', 'mise_en_oeuvre_charge_reelle',
      // Champs stratégie (pour missions)
      'strategie_objectif', 'strategie_sous_objectif', 'strategie_action',
      // Champs hiérarchiques
      'programme_id', 'responsable_id',
      // Meta
      'est_classifiee',
      // Références / liens externes
      'reference'
    ];

    simpleFields.forEach(field => {
      if (recordData.hasOwnProperty(field)) {
        gristData[field] = recordData[field] || null;
      }
    });
    
    // Traiter les listes (bureau, qui) - accepte string CSV ou array
    if (recordData.bureau !== undefined && recordData.bureau !== null) {
      if (Array.isArray(recordData.bureau)) {
        gristData.bureau = recordData.bureau;
      } else if (typeof recordData.bureau === 'string' && recordData.bureau.trim()) {
        gristData.bureau = ['L', ...recordData.bureau.split(',').map(s => s.trim()).filter(Boolean)];
      } else {
        gristData.bureau = ['L'];
      }
    }

    if (recordData.qui !== undefined && recordData.qui !== null) {
      if (Array.isArray(recordData.qui)) {
        gristData.qui = recordData.qui;
      } else if (typeof recordData.qui === 'string' && recordData.qui.trim()) {
        gristData.qui = ['L', ...recordData.qui.split(',').map(s => s.trim()).filter(Boolean)];
      } else {
        gristData.qui = ['L'];
      }
    }
    
    // 🔧 CORRECTION: Traiter strategie_id selon le schema Grist (ReferenceList)
    if (recordData.strategie_id !== undefined) {
      // Si c'est déjà au format Grist ["L", id1, id2, ...], conserver tel quel
      if (Array.isArray(recordData.strategie_id) && recordData.strategie_id.length >= 1 && recordData.strategie_id[0] === 'L') {
        gristData.strategie_id = recordData.strategie_id;
      }
      // Si c'est un ID simple, convertir au format Grist ReferenceList
      else if (typeof recordData.strategie_id === 'number') {
        gristData.strategie_id = ['L', recordData.strategie_id];
      }
      // Si c'est une string numérique, convertir
      else if (typeof recordData.strategie_id === 'string' && /^\d+$/.test(recordData.strategie_id)) {
        gristData.strategie_id = ['L', parseInt(recordData.strategie_id, 10)];
      }
      // Si c'est null ou liste vide, mettre une ReferenceList vide
      else {
        gristData.strategie_id = ['L'];
      }
    }

    // Traiter strategie_ids (tableau d'IDs) pour mise à jour de strategie_id
    if (recordData.strategie_ids && Array.isArray(recordData.strategie_ids) && recordData.strategie_ids.length > 0) {
      gristData.strategie_id = ['L', ...recordData.strategie_ids];
    }
    
    // Traiter avancement (Int 0-100, ne pas utiliser simpleFields car 0 || null donnerait null)
    if (recordData.avancement !== undefined) {
      gristData.avancement = typeof recordData.avancement === 'number' ? recordData.avancement : parseInt(recordData.avancement, 10) || 0;
    }

    // Traiter jalons (tableau d'objets → JSON string pour colonne Text Grist)
    if (recordData.jalons !== undefined) {
      gristData.jalons = Array.isArray(recordData.jalons) ? JSON.stringify(recordData.jalons) : recordData.jalons || '';
    }

    // Traiter liens entre tâches (data.liens → colonne tache_liens en JSON)
    if (recordData.liens !== undefined) {
      gristData.tache_liens = Array.isArray(recordData.liens) ? JSON.stringify(recordData.liens) : recordData.liens || '';
    }
    if (recordData.tache_liens !== undefined && !gristData.tache_liens) {
      gristData.tache_liens = typeof recordData.tache_liens === 'string' ? recordData.tache_liens : JSON.stringify(recordData.tache_liens);
    }

    // Traiter les dates
    if (recordData.date_echeance) {
      gristData.date_echeance = normalizeDate(recordData.date_echeance);
    }

    if (recordData.date_debut) {
      gristData.date_debut = normalizeDate(recordData.date_debut);
    }
    
    // Ajouter les métadonnées si les colonnes existent
    if (this.availableColumns.has('date_derniere_maj')) {
      gristData.date_derniere_maj = new Date().toISOString();
    }

    // Filtrer les champs qui n'existent pas dans Grist (évite KeyError)
    // Ne garder que les colonnes connues
    if (this.availableColumns.size > 0) {
      const filteredData = {};
      for (const [key, value] of Object.entries(gristData)) {
        if (this.availableColumns.has(key)) {
          filteredData[key] = value;
        } else {
          this.logger.debug(`Champ ignoré (colonne inexistante): ${key}`);
        }
      }
      this.logger.debug('Champs envoyés à Grist:', Object.keys(filteredData));
      return filteredData;
    }

    // Si availableColumns est vide, envoyer tous les champs SAUF les champs V3
    // qui peuvent ne pas exister - ils seront créés par setup.html ou migration.html
    const v3Fields = ['nature_activite', 'genre_action', 'etape_cycle', 'previsibilite'];
    const safeData = {};
    for (const [key, value] of Object.entries(gristData)) {
      // Exclure les champs V3 quand on ne peut pas vérifier leur existence
      if (!v3Fields.includes(key)) {
        safeData[key] = value;
      } else {
        this.logger.debug(`Champ V3 ignoré (colonnes non détectées): ${key}`);
      }
    }
    this.logger.warn('Mode safe actif - availableColumns vide. Champs envoyés:', Object.keys(safeData));
    this.logger.info('Pour activer les champs V3, exécutez setup.html puis rechargez la page.');
    return safeData;
  }
  
  /**
   * Vérifie si une date est valide
   * @param {string} dateString - Date à vérifier
   * @returns {boolean} True si valide
   */
  isValidDate(dateString) {
    if (!dateString) return true; // null/undefined sont acceptables
    
    const normalizedDate = normalizeDate(dateString);
    return normalizedDate !== null;
  }
  
  /**
   * Met à jour un enregistrement local
   * @param {number} recordId - ID de l'enregistrement
   * @param {object} updateData - Données de mise à jour
   */
  updateLocalRecord(recordId, updateData) {
    const index = this.currentRecords.findIndex(r => r.id === recordId);
    if (index !== -1) {
      this.currentRecords[index] = { 
        ...this.currentRecords[index], 
        ...updateData 
      };
    }
  }
  
  /**
   * Ajoute un enregistrement local
   * @param {object} newRecord - Nouvel enregistrement
   */
  addLocalRecord(newRecord) {
    this.currentRecords.push(newRecord);
  }
  
  /**
   * Supprime un enregistrement local
   * @param {number} recordId - ID de l'enregistrement à supprimer
   */
  removeLocalRecord(recordId) {
    this.currentRecords = this.currentRecords.filter(r => r.id !== recordId);
  }
  
  /**
   * Gestionnaire de mise à jour des enregistrements depuis Grist
   * @param {object} records - Nouveaux enregistrements
   * @param {object} mappings - Mappings de colonnes
   */
  handleRecordsUpdate(records, mappings) {
    if (this.isUpdating) {
      this.logger.debug('Ignorer mise à jour (opération en cours)');
      return;
    }
    
    this.logger.debug('Mise à jour des enregistrements depuis Grist');
    
    try {
      // Recharger les données complètes
      this.reloadData().then(() => {
        // Notifier le kanban que les données ont changé
        if (this.kanban && this.kanban.refreshKanban) {
          this.kanban.refreshKanban();
        }
      });
    } catch (error) {
      this.logger.error('Erreur lors de la mise à jour:', error);
      displayError('Erreur lors de la synchronisation avec Grist');
    }
  }
  
  /**
   * Gestionnaire de mise à jour des options depuis Grist
   * @param {object} options - Nouvelles options
   */
  handleOptionsUpdate(options) {
    this.logger.debug('Mise à jour des options:', options);
    // Traiter les changements d'options si nécessaire
  }
  
  /**
   * Gestionnaire d'édition des options
   */
  handleEditOptions() {
    this.logger.debug('Mode édition des options activé');
    // Permettre à l'utilisateur de configurer le widget
  }
  
  /**
   * Recharge les données depuis Grist
   */
  async reloadData() {
    try {
      const gristApi = this.getGristApi();
      const records = await gristApi.docApi.fetchTable(TABLE_ID);

      if (records) {
        this.currentRecords = this.mapGristRecords(records);
        await this.loadGristOptions();
        
        // Notifier le KanbanManager
        if (this.kanban && typeof this.kanban.onDataReloaded === 'function') {
          await this.kanban.onDataReloaded(this.currentRecords, this.gristOptions);
        }
        
        this.logger.info(`${this.currentRecords.length} enregistrements rechargés`);
      }
      
    } catch (error) {
      this.logger.error('Erreur rechargement:', error);
      throw error;
    }
  }

  getGristApi() {
    if (typeof window === 'undefined' || typeof window.grist === 'undefined') {
      throw new Error('API Grist non disponible');
    }
    return window.grist;
  }

  /**
   * Recherche d'enregistrements avec critères
   * @param {object} criteria - Critères de recherche
   * @returns {Array} Enregistrements correspondants
   */
  searchRecords(criteria = {}) {
    return this.currentRecords.filter(record => {
      // Recherche par ID
      if (criteria.id && record.id !== criteria.id) {
        return false;
      }
      
      // Recherche par statut
      if (criteria.statut && record.statut !== criteria.statut) {
        return false;
      }
      
      // Recherche par projet
      if (criteria.projet && record.projet !== criteria.projet) {
        return false;
      }
      
      // Recherche textuelle
      if (criteria.text) {
        const searchText = criteria.text.toLowerCase();
        const searchableFields = [
          record.titre || '',
          record.description || '',
          record.projet || '',
          record.notes || ''
        ].join(' ').toLowerCase();
        
        if (!searchableFields.includes(searchText)) {
          return false;
        }
      }
      
      // Recherche par bureau
      if (criteria.bureau && Array.isArray(record.bureau)) {
        const bureaux = record.bureau.slice(1);
        if (!bureaux.includes(criteria.bureau)) {
          return false;
        }
      }
      
      // Recherche par responsable
      if (criteria.responsable && Array.isArray(record.qui)) {
        const responsables = record.qui.slice(1);
        if (!responsables.includes(criteria.responsable)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Obtient les statistiques des données
   * @returns {object} Statistiques
   */
  getDataStatistics() {
    const stats = {
      totalRecords: this.currentRecords.length,
      byStatus: {},
      byPriority: {},
      withDeadlines: 0,
      overdue: 0,
      recentlyUpdated: 0
    };
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    this.currentRecords.forEach(record => {
      // Par statut
      const status = record.statut || 'Non défini';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Avec échéances
      if (record.date_echeance) {
        stats.withDeadlines++;
        
        const deadline = new Date(record.date_echeance);
        if (deadline < now && record.statut !== 'Terminé') {
          stats.overdue++;
        }
      }
      
      // Récemment mises à jour
      if (record.date_derniere_maj) {
        const lastUpdate = new Date(record.date_derniere_maj);
        if (lastUpdate > oneDayAgo) {
          stats.recentlyUpdated++;
        }
      }
    });
    
    return stats;
  }
  
  /**
   * Exporte les données au format CSV
   * @returns {string} Données CSV
   */
  exportToCSV() {
    const headers = [
      'ID', 'Titre', 'Description', 'Statut', 'Projet', 'Urgence', 'Impact',
      'Bureaux', 'Responsables', 'Date_Echeance', 'Date_Debut'
    ];
    
    let csv = headers.join(',') + '\n';
    
    this.currentRecords.forEach(record => {
      const row = [
        record.id || '',
        `"${(record.titre || '').replace(/"/g, '""')}"`,
        `"${(record.description || '').replace(/"/g, '""')}"`,
        record.statut || '',
        record.projet || '',
        record.urgence || '',
        record.impact || '',
        `"${Array.isArray(record.bureau) ? record.bureau.slice(1).join(', ') : ''}"`,
        `"${Array.isArray(record.qui) ? record.qui.slice(1).join(', ') : ''}"`,
        record.date_echeance || '',
        record.date_debut || ''
      ];
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
  
  /**
   * Vérifie l'état de la connexion Grist
   * @returns {boolean} True si connecté
   */
  isGristConnected() {
    return this.isConnected && typeof window.grist !== 'undefined';
  }
  
  /**
   * Obtient les informations sur l'utilisateur Grist
   * @returns {Promise<object>} Informations utilisateur
   */
  async getUserInfo() {
    try {
      const gristApi = this.getGristApi();
      let docInfo = null;

      if (gristApi?.docApi?.getDocInfo) {
        docInfo = await gristApi.docApi.getDocInfo();
      } else if (gristApi?.getDocInfo) {
        docInfo = await gristApi.getDocInfo();
      } else {
        this.logger.warn('GristManager: getDocInfo indisponible sur cette API');
        return null;
      }
      return {
        user: docInfo.user || null,
        permissions: docInfo.permissions || {},
        docName: docInfo.name || 'Document sans nom'
      };
    } catch (error) {
      this.logger.warn('Impossible de récupérer les infos utilisateur:', error);
      return null;
    }
  }
  
  /**
   * Exporte l'état du gestionnaire
   * @returns {object} État exporté
   */
  exportState() {
    return {
      isConnected: this.isConnected,
      recordCount: this.currentRecords.length,
      availableColumns: Array.from(this.availableColumns),
      gristOptions: this.gristOptions,
      statistics: this.getDataStatistics(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Charge une table spécifique depuis Grist
   * @param {string} tableId - ID de la table à charger
   * @returns {Promise<object>} Données de la table
   */
  async fetchTable(tableId) {
    try {
      this.logger.debug(`Chargement table ${tableId}...`);
      const gristApi = this.getGristApi();
      const records = await gristApi.docApi.fetchTable(tableId);
      this.logger.debug(`Table ${tableId} chargée: ${Object.keys(records.id || {}).length} enregistrements`);
      return records;
    } catch (error) {
      this.logger.error(`Erreur chargement table ${tableId}:`, error);
      throw error;
    }
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    this.isConnected = false;
    this.currentRecords = [];
    this.gristOptions = {};
    this.availableColumns.clear();
    
    this.logger.info('Ressources nettoyées');
  }
}
