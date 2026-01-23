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

    // Configuration par défaut
    this.defaultConfig = {
      personnes: [],
      bureaux: ['Exploit', 'Réseau', 'BDD', 'Chef SSIR', 'SIG', 'NEXSIS-RRF', 'COMSIC', 'RSSI', 'DPO'],
      services: [],
      groupements: [],
      strategies: [],
      templates: [],  // Templates de mise en oeuvre
      priorites: ['Critique', 'Haute', 'Moyenne', 'Basse'],
      urgences: ['Immédiate', 'J+7', 'J+30', 'J+90'],
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

      // S'assurer que les tableaux existent
      if (!this.config.templates) this.config.templates = [];
      if (!this.config.personnes) this.config.personnes = [];
      if (!this.config.strategies) this.config.strategies = [];

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
      // Régénérer des IDs uniques pour les templates
      if (this.config.templates) {
        const seenIds = new Set();
        this.config.templates = this.config.templates.map((t, index) => {
          let newId = Math.floor(t.id) || Date.now();
          while (seenIds.has(newId)) {
            newId = Date.now() + index + Math.floor(Math.random() * 10000);
          }
          seenIds.add(newId);
          return { ...t, id: newId };
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

  // === PERSONNES (Agents) ===

  /**
   * Récupère toutes les personnes
   */
  getPersonnes() {
    return this.config.personnes || [];
  }

  /**
   * Ajoute une personne
   * @param {Object} personne - {prenom, bureau, service, groupement}
   */
  addPersonne(personne) {
    if (!personne.prenom || !personne.prenom.trim()) {
      throw new Error('Le prénom est obligatoire');
    }

    const newPersonne = {
      id: Date.now(),
      prenom: personne.prenom.trim(),
      bureau: personne.bureau || '',
      service: personne.service || '',
      groupement: personne.groupement || '',
      createdAt: new Date().toISOString()
    };

    this.config.personnes.push(newPersonne);
    this.saveConfig();

    this.logger.debug('Personne added:', newPersonne.prenom);
    return newPersonne;
  }

  /**
   * Met à jour une personne
   * @param {number} id - ID de la personne
   * @param {Object} updates - Données à mettre à jour
   */
  updatePersonne(id, updates) {
    const index = this.config.personnes.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Personne non trouvée');
    }

    this.config.personnes[index] = {
      ...this.config.personnes[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveConfig();

    this.logger.debug('Personne updated:', this.config.personnes[index].prenom);
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
      this.logger.debug('Personne deleted:', deleted.prenom);
      return true;
    }
    return false;
  }

  /**
   * Récupère les prénoms de personnes pour auto-complétion
   */
  getPersonnesNames() {
    return this.config.personnes.map(p => p.prenom);
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

  getStrategieById(id) {
    return this.config.strategies.find(s => s.id === id) || null;
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

  updateStrategie(id, updates) {
    const index = this.config.strategies.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Stratégie non trouvée');
    }

    this.config.strategies[index] = {
      ...this.config.strategies[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveConfig();

    this.logger.debug('Strategie updated:', this.config.strategies[index].code);
    return this.config.strategies[index];
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

  // === TEMPLATES DE MISE EN OEUVRE ===

  getTemplates() {
    return this.config.templates || [];
  }

  getTemplateById(id) {
    return this.config.templates.find(t => t.id === id) || null;
  }

  /**
   * Ajoute un template de mise en oeuvre
   * @param {Object} template - {nom, description, taches: [{titre, description, priorite, charge}]}
   */
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

    this.config.templates.push(newTemplate);
    this.saveConfig();

    this.logger.debug('Template added:', newTemplate.nom);
    return newTemplate;
  }

  /**
   * Met à jour un template
   * @param {number} id - ID du template
   * @param {Object} updates - Données à mettre à jour
   */
  updateTemplate(id, updates) {
    const index = this.config.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Template non trouvé');
    }

    this.config.templates[index] = {
      ...this.config.templates[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveConfig();

    this.logger.debug('Template updated:', this.config.templates[index].nom);
    return this.config.templates[index];
  }

  /**
   * Supprime un template
   * @param {number} id - ID du template
   */
  deleteTemplate(id) {
    const index = this.config.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      const deleted = this.config.templates.splice(index, 1)[0];
      this.saveConfig();
      this.logger.debug('Template deleted:', deleted.nom);
      return true;
    }
    return false;
  }

  // === PRIORITÉS, URGENCES, IMPACTS (lecture seule) ===

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
      personnes: (this.config.personnes || []).length,
      bureaux: (this.config.bureaux || []).length,
      services: (this.config.services || []).length,
      groupements: (this.config.groupements || []).length,
      strategies: (this.config.strategies || []).length,
      templates: (this.config.templates || []).length
    };
  }

  /**
   * Synchronise la configuration depuis les données Grist existantes
   * Extrait les valeurs uniques de bureau, qui (responsables)
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
    responsablesSet.forEach(prenom => {
      const exists = this.config.personnes.some(p => p.prenom === prenom);
      if (!exists) {
        // Générer un ID unique : timestamp + index + random pour éviter les collisions
        const uniqueId = Date.now() + (personneIndex * 1000) + Math.floor(Math.random() * 100);
        personneIndex++;
        this.config.personnes.push({
          id: uniqueId,
          prenom: prenom,
          bureau: '',
          service: '',
          groupement: '',
          createdAt: new Date().toISOString(),
          source: 'grist'
        });
      }
    });

    // Sauvegarder
    this.saveConfig();

    this.logger.info('Config synced from Grist:', {
      bureaux: this.config.bureaux.length,
      personnes: this.config.personnes.length
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
