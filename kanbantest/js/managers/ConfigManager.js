// === managers/ConfigManager.js ===
// Gestionnaire pour la configuration et les constantes de l'application

import { createModuleLogger } from '../utils/LoggerManager.js';

/**
 * Gestionnaire pour les constantes et paramètres
 * Stockage dans localStorage pour persistance
 */
export class ConfigManager {
  constructor() {
    this.logger = createModuleLogger('ConfigManager');

    // Clés de stockage
    this.STORAGE_KEY = 'kanban_config';

    // Configuration par defaut
    this.defaultConfig = {
      personnes: [],
      bureaux: ['Infrastructure', 'Securite', 'Support', 'Developpement'],
      services: [],
      groupements: [],
      strategies: [],
      templates: [],
      priorites: ['Critique', 'Haute', 'Moyenne', 'Basse'],
      urgences: ['Immediate', 'J+7', 'J+30', 'J+90'],
      impacts: ['Critique', 'Important', 'Moyen', 'Faible']
    };

    // Configuration courante
    this.config = null;

    this.init();
  }

  /**
   * Initialise le gestionnaire
   */
  init() {
    this.loadConfig();
    this.logger.debug('ConfigManager initialized');
  }

  /**
   * Charge la configuration depuis localStorage
   */
  loadConfig() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (stored) {
        this.config = JSON.parse(stored);
        this.logger.debug('Configuration loaded from localStorage');
      } else {
        // Première utilisation : utiliser config par défaut
        this.config = { ...this.defaultConfig };
        this.saveConfig();
        this.logger.debug('Default configuration initialized');
      }

      // Fusionner avec valeurs par défaut pour nouvelles clés
      this.config = { ...this.defaultConfig, ...this.config };

      // Régénérer des IDs uniques pour les personnes (corrige les doublons)
      if (this.config.personnes) {
        const seenIds = new Set();
        this.config.personnes = this.config.personnes.map((p, index) => {
          let newId = Math.floor(p.id) || Date.now();
          // Si l'ID existe déjà, générer un nouveau unique
          while (seenIds.has(newId)) {
            newId = Date.now() + index + Math.floor(Math.random() * 10000);
          }
          seenIds.add(newId);
          return { ...p, id: newId };
        });
      }
      // Régénérer des IDs uniques pour les stratégies
      if (this.config.strategies) {
        const seenIds = new Set();
        this.config.strategies = this.config.strategies.map((s, index) => {
          let newId = Math.floor(s.id) || Date.now();
          while (seenIds.has(newId)) {
            newId = Date.now() + index + Math.floor(Math.random() * 10000);
          }
          seenIds.add(newId);
          return { ...s, id: newId };
        });
      }

    } catch (error) {
      this.logger.error('Failed to load config:', error);
      this.config = { ...this.defaultConfig };
    }
  }

  /**
   * Sauvegarde la configuration dans localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      this.logger.debug('Configuration saved');
      return true;
    } catch (error) {
      this.logger.error('Failed to save config:', error);
      return false;
    }
  }

  /**
   * Réinitialise la configuration aux valeurs par défaut
   */
  reset() {
    this.config = { ...this.defaultConfig };
    this.saveConfig();
    this.logger.info('Configuration reset to defaults');
  }

  // === PERSONNES ===

  /**
   * Récupère toutes les personnes
   */
  getPersonnes() {
    return this.config.personnes || [];
  }

  /**
   * Ajoute une personne
   * @param {Object} personne - {nom, bureau, service, groupement}
   */
  addPersonne(personne) {
    if (!personne.nom || !personne.nom.trim()) {
      throw new Error('Le prenom est obligatoire');
    }

    const newPersonne = {
      id: Date.now(),
      nom: personne.nom.trim(),
      bureau: personne.bureau || '',
      service: personne.service || '',
      groupement: personne.groupement || '',
      createdAt: new Date().toISOString()
    };

    this.config.personnes.push(newPersonne);
    this.saveConfig();

    this.logger.debug('Personne added:', newPersonne.nom);
    return newPersonne;
  }

  /**
   * Met a jour une personne
   * @param {number} id - ID de la personne
   * @param {Object} data - {nom, bureau, service, groupement}
   */
  updatePersonne(id, data) {
    const index = this.config.personnes.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Personne non trouvee');
    }

    if (data.nom) {
      this.config.personnes[index].nom = data.nom.trim();
    }
    if (data.bureau !== undefined) {
      this.config.personnes[index].bureau = data.bureau;
    }
    if (data.service !== undefined) {
      this.config.personnes[index].service = data.service;
    }
    if (data.groupement !== undefined) {
      this.config.personnes[index].groupement = data.groupement;
    }

    this.saveConfig();
    this.logger.debug('Personne updated:', id);
    return this.config.personnes[index];
  }

  /**
   * Supprime une personne
   * @param {number} id - ID de la personne
   */
  deletePersonne(id) {
    const index = this.config.personnes.findIndex(p => p.id === id);
    if (index !== -1) {
      const deleted = this.config.personnes.splice(index, 1)[0];
      this.saveConfig();
      this.logger.debug('Personne deleted:', deleted.nom);
      return true;
    }
    return false;
  }

  /**
   * Récupère les noms de personnes pour auto-complétion
   */
  getPersonnesNames() {
    return this.config.personnes.map(p => p.nom);
  }

  // === BUREAUX ===

  getBureaux() {
    return this.config.bureaux || [];
  }

  addBureau(nom) {
    if (!nom || !nom.trim()) {
      throw new Error('Le nom du bureau est obligatoire');
    }

    const trimmed = nom.trim();
    if (this.config.bureaux.includes(trimmed)) {
      throw new Error('Ce bureau existe déjà');
    }

    this.config.bureaux.push(trimmed);
    this.saveConfig();

    this.logger.debug('Bureau added:', trimmed);
    return trimmed;
  }

  deleteBureau(nom) {
    const index = this.config.bureaux.indexOf(nom);
    if (index !== -1) {
      this.config.bureaux.splice(index, 1);
      this.saveConfig();
      this.logger.debug('Bureau deleted:', nom);
      return true;
    }
    return false;
  }

  // === SERVICES ===

  getServices() {
    return this.config.services || [];
  }

  addService(nom) {
    if (!nom || !nom.trim()) {
      throw new Error('Le nom du service est obligatoire');
    }

    const trimmed = nom.trim();
    if (this.config.services.includes(trimmed)) {
      throw new Error('Ce service existe déjà');
    }

    this.config.services.push(trimmed);
    this.saveConfig();

    this.logger.debug('Service added:', trimmed);
    return trimmed;
  }

  deleteService(nom) {
    const index = this.config.services.indexOf(nom);
    if (index !== -1) {
      this.config.services.splice(index, 1);
      this.saveConfig();
      this.logger.debug('Service deleted:', nom);
      return true;
    }
    return false;
  }

  // === GROUPEMENTS ===

  getGroupements() {
    return this.config.groupements || [];
  }

  addGroupement(nom) {
    if (!nom || !nom.trim()) {
      throw new Error('Le nom du groupement est obligatoire');
    }

    const trimmed = nom.trim();
    if (this.config.groupements.includes(trimmed)) {
      throw new Error('Ce groupement existe déjà');
    }

    this.config.groupements.push(trimmed);
    this.saveConfig();

    this.logger.debug('Groupement added:', trimmed);
    return trimmed;
  }

  deleteGroupement(nom) {
    const index = this.config.groupements.indexOf(nom);
    if (index !== -1) {
      this.config.groupements.splice(index, 1);
      this.saveConfig();
      this.logger.debug('Groupement deleted:', nom);
      return true;
    }
    return false;
  }

  // === STRATÉGIES ===

  getStrategies() {
    return this.config.strategies || [];
  }

  addStrategie(strategie) {
    if (!strategie.code || !strategie.objectif) {
      throw new Error('Code et objectif sont obligatoires');
    }

    const newStrategie = {
      id: Date.now(),
      code: strategie.code.trim(),
      objectif: strategie.objectif.trim(),
      sousObjectif: strategie.sousObjectif ? strategie.sousObjectif.trim() : '',
      createdAt: new Date().toISOString()
    };

    this.config.strategies.push(newStrategie);
    this.saveConfig();

    this.logger.debug('Strategie added:', newStrategie.code);
    return newStrategie;
  }

  deleteStrategie(id) {
    const index = this.config.strategies.findIndex(s => s.id === id);
    if (index !== -1) {
      const deleted = this.config.strategies.splice(index, 1)[0];
      this.saveConfig();
      this.logger.debug('Strategie deleted:', deleted.code);
      return true;
    }
    return false;
  }

  /**
   * Met a jour une strategie
   * @param {number} id - ID de la strategie
   * @param {Object} data - {code, objectif, sousObjectif}
   */
  updateStrategie(id, data) {
    const index = this.config.strategies.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Strategie non trouvee');
    }

    if (data.code) {
      this.config.strategies[index].code = data.code.trim();
    }
    if (data.objectif) {
      this.config.strategies[index].objectif = data.objectif.trim();
    }
    if (data.sousObjectif !== undefined) {
      this.config.strategies[index].sousObjectif = data.sousObjectif ? data.sousObjectif.trim() : '';
    }

    this.saveConfig();
    this.logger.debug('Strategie updated:', id);
    return this.config.strategies[index];
  }

  // === TEMPLATES ===

  getTemplates() {
    return this.config.templates || [];
  }

  addTemplate(template) {
    if (!template.nom || !template.nom.trim()) {
      throw new Error('Le nom du template est obligatoire');
    }

    const newTemplate = {
      id: Date.now(),
      nom: template.nom.trim(),
      description: template.description ? template.description.trim() : '',
      taches: template.taches || [],
      createdAt: new Date().toISOString()
    };

    if (!this.config.templates) {
      this.config.templates = [];
    }
    this.config.templates.push(newTemplate);
    this.saveConfig();

    this.logger.debug('Template added:', newTemplate.nom);
    return newTemplate;
  }

  updateTemplate(id, data) {
    if (!this.config.templates) {
      this.config.templates = [];
    }
    const index = this.config.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Template non trouve');
    }

    if (data.nom) {
      this.config.templates[index].nom = data.nom.trim();
    }
    if (data.description !== undefined) {
      this.config.templates[index].description = data.description ? data.description.trim() : '';
    }
    if (data.taches !== undefined) {
      this.config.templates[index].taches = data.taches;
    }

    this.saveConfig();
    this.logger.debug('Template updated:', id);
    return this.config.templates[index];
  }

  deleteTemplate(id) {
    if (!this.config.templates) {
      this.config.templates = [];
    }
    const index = this.config.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      const deleted = this.config.templates.splice(index, 1)[0];
      this.saveConfig();
      this.logger.debug('Template deleted:', deleted.nom);
      return true;
    }
    return false;
  }

  // === PRIORITES, URGENCES, IMPACTS (lecture seule) ===

  getPriorites() {
    return this.config.priorites || [];
  }

  getUrgences() {
    return this.config.urgences || [];
  }

  getImpacts() {
    return this.config.impacts || [];
  }

  // === EXPORT / IMPORT ===

  /**
   * Exporte la configuration en JSON
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importe une configuration depuis JSON
   * @param {string} jsonString - Configuration JSON
   */
  importConfig(jsonString) {
    try {
      const imported = JSON.parse(jsonString);

      // Valider la structure
      if (typeof imported !== 'object') {
        throw new Error('Format invalide');
      }

      // Fusionner avec config par défaut
      this.config = { ...this.defaultConfig, ...imported };
      this.saveConfig();

      this.logger.info('Configuration imported successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to import config:', error);
      throw new Error('Import échoué : format JSON invalide');
    }
  }

  /**
   * Récupère les statistiques de configuration
   */
  getStats() {
    return {
      personnes: this.config.personnes.length,
      bureaux: this.config.bureaux.length,
      services: this.config.services.length,
      groupements: this.config.groupements.length,
      strategies: this.config.strategies.length,
      templates: (this.config.templates || []).length
    };
  }

  /**
   * Synchronise la configuration depuis les données Grist existantes
   * Extrait les valeurs uniques de bureau, qui (responsables), projet
   * @param {Array} gristRecords - Enregistrements Grist
   */
  syncFromGrist(gristRecords) {
    if (!gristRecords || !Array.isArray(gristRecords)) {
      this.logger.warn('syncFromGrist: No records provided');
      return;
    }

    this.logger.info(`Syncing config from ${gristRecords.length} Grist records...`);

    // Extraire les bureaux uniques (excluant 'L' qui est un marqueur technique)
    const bureauxSet = new Set(this.config.bureaux);
    gristRecords.forEach(record => {
      if (record.bureau && Array.isArray(record.bureau)) {
        record.bureau.forEach(b => {
          if (b && b !== 'L' && b.trim()) {
            bureauxSet.add(b.trim());
          }
        });
      } else if (record.bureau && typeof record.bureau === 'string' && record.bureau !== 'L') {
        bureauxSet.add(record.bureau.trim());
      }
    });
    this.config.bureaux = Array.from(bureauxSet).sort();

    // Extraire les responsables uniques (champ "qui")
    const responsablesSet = new Set(this.getPersonnesNames());
    gristRecords.forEach(record => {
      if (record.qui && Array.isArray(record.qui)) {
        record.qui.forEach(q => {
          if (q && q !== 'L' && q.trim() && q !== 'non affecté') {
            responsablesSet.add(q.trim());
          }
        });
      } else if (record.qui && typeof record.qui === 'string' && record.qui !== 'L' && record.qui !== 'non affecté') {
        responsablesSet.add(record.qui.trim());
      }
    });
    // Ajouter comme personnes si pas déjà présentes
    let personneIndex = 0;
    responsablesSet.forEach(nom => {
      const exists = this.config.personnes.some(p => p.nom === nom);
      if (!exists) {
        // Générer un ID unique : timestamp + index + random pour éviter les collisions
        const uniqueId = Date.now() + (personneIndex * 1000) + Math.floor(Math.random() * 100);
        personneIndex++;
        this.config.personnes.push({
          id: uniqueId,
          nom: nom,
          bureau: '',
          service: '',
          createdAt: new Date().toISOString(),
          source: 'grist'
        });
      }
    });

    // Extraire les projets uniques
    const projetsSet = new Set(this.config.projets);
    gristRecords.forEach(record => {
      if (record.projet && record.projet.trim()) {
        projetsSet.add(record.projet.trim());
      }
    });
    this.config.projets = Array.from(projetsSet).sort();

    // Sauvegarder
    this.saveConfig();

    this.logger.info('Config synced from Grist:', {
      bureaux: this.config.bureaux.length,
      personnes: this.config.personnes.length,
      projets: this.config.projets.length
    });
  }
}

// Instance singleton
let configManagerInstance = null;

/**
 * Initialise le ConfigManager (singleton)
 */
export function initConfigManager() {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
    // Exposer globalement pour les scripts non-module (SharedTaskModal)
    window._configManagerInstance = configManagerInstance;
  }
  return configManagerInstance;
}

/**
 * Récupère l'instance du ConfigManager
 */
export function getConfigManager() {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
    // Exposer globalement pour les scripts non-module (SharedTaskModal)
    window._configManagerInstance = configManagerInstance;
  }
  return configManagerInstance;
}
