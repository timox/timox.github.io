/**
 * Modal System - Point d'entrée principal
 * 
 * RESPONSABILITÉS:
 * - Initialisation du système modal complet
 * - Configuration et enregistrement des controllers
 * - Migration progressive depuis l'ancien système
 * - API publique pour l'intégration
 * 
 * UTILISATION:
 * import { initModalSystem } from './js/modal-system/index.js';
 * const modalSystem = await initModalSystem(kanbanManager);
 */

import { modalRegistry, ModalRegistry } from './ModalRegistry.js';
import BaseModalController from './BaseModalController.js';
import HistoryModalController from './HistoryModalController.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

// Logger du module
const logger = createModuleLogger('ModalSystem');

/**
 * Configuration par défaut du système modal
 */
const DEFAULT_CONFIG = {
  // Modales à enregistrer automatiquement
  autoRegisterModals: [
    {
      modalId: 'history-modal',
      controllerClass: HistoryModalController,
      options: {}
    }
    // D'autres modales seront ajoutées progressivement
  ],
  
  // Options globales
  enableTracing: false,
  enableDebugAPI: true,
  
  // Migration
  replaceExistingHandlers: false,
  maintainCompatibility: true
};

/**
 * Classe principale du système modal
 */
export class ModalSystem {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = modalRegistry;
    this.controllers = new Map();
    this.initialized = false;
    
    // Références externes
    this.kanbanManager = null;
    this.historyManager = null;
    
    logger.info('ModalSystem créé', this.config);
  }

  /**
   * Initialisation complète du système
   */
  async initialize(managers = {}) {
    if (this.initialized) {
      logger.warn('ModalSystem déjà initialisé');
      return this;
    }

    logger.info('Initialisation du système modal...');

    try {
      // 1. Configuration des managers externes
      this.setManagers(managers);
      
      // 2. Configuration du registry
      this.configureRegistry();
      
      // 3. Enregistrement des modales
      await this.registerDefaultModals();
      
      // 4. Configuration de l'API de debug
      if (this.config.enableDebugAPI) {
        this.exposeDebugAPI();
      }
      
      // 5. Migration progressive (optionnelle)
      if (this.config.maintainCompatibility) {
        this.setupCompatibilityLayer();
      }
      
      this.initialized = true;
      logger.info('ModalSystem initialisé avec succès');
      
      return this;
      
    } catch (error) {
      logger.error('Erreur initialisation ModalSystem:', error);
      throw error;
    }
  }

  /**
   * Configuration des managers externes
   */
  setManagers(managers) {
    this.kanbanManager = managers.kanbanManager;
    this.historyManager = managers.historyManager;
    
    logger.info('Managers configurés', {
      kanbanManager: !!this.kanbanManager,
      historyManager: !!this.historyManager
    });
  }

  /**
   * Configuration du registry
   */
  configureRegistry() {
    if (this.config.enableTracing) {
      this.registry.enableTracing(true);
    }
    
    logger.debug('Registry configuré');
  }

  /**
   * Enregistrement des modales par défaut
   */
  async registerDefaultModals() {
    logger.info('Enregistrement des modales par défaut...');
    
    for (const modalConfig of this.config.autoRegisterModals) {
      try {
        await this.registerModal(modalConfig);
      } catch (error) {
        logger.error(`Erreur enregistrement modale ${modalConfig.modalId}:`, error);
        // Continuer avec les autres modales
      }
    }
  }

  /**
   * Enregistre une modale avec son controller
   */
  async registerModal({ modalId, controllerClass, options = {} }) {
    logger.info(`Enregistrement modale: ${modalId}`);
    
    // Création du controller
    const controller = new controllerClass(modalId, options);
    
    // Configuration spécifique selon le type
    if (controller instanceof HistoryModalController) {
      controller.setManagers(this.historyManager, this.kanbanManager);
    }
    
    // Enregistrement dans le registry
    const registration = this.registry.register(modalId, controller, {
      bootstrap: options.bootstrap || {}
    });
    
    // Sauvegarde de la référence
    this.controllers.set(modalId, controller);
    
    logger.info(`Modale enregistrée: ${modalId}`);
    return registration;
  }

  /**
   * API publique pour ouvrir une modale
   */
  async openModal(modalId, options = {}) {
    return await this.registry.open(modalId, options);
  }

  /**
   * API publique pour fermer une modale
   */
  async closeModal(modalId, options = {}) {
    return await this.registry.close(modalId, options);
  }

  /**
   * Récupère un controller
   */
  getController(modalId) {
    return this.controllers.get(modalId);
  }

  /**
   * Configuration de l'API de debug
   */
  exposeDebugAPI() {
    if (typeof window !== 'undefined') {
      window.ModalSystem = this;
      window.ModalRegistry = this.registry;
      
      // Raccourcis de debug
      window.debugModals = () => {
        console.log('=== MODAL SYSTEM DEBUG ===');
        console.log('Registry:', this.registry.listModals());
        console.log('Stats:', this.registry.getStats());
        console.log('Controllers:', Array.from(this.controllers.keys()));
      };
      
      logger.debug('API de debug exposée');
    }
  }

  /**
   * Couche de compatibilité avec l'ancien système
   */
  setupCompatibilityLayer() {
    logger.info('Configuration couche de compatibilité...');
    
    // Patch des méthodes existantes si nécessaire
    this.patchKanbanManager();
    this.patchHistoryManager();
    
    logger.debug('Couche de compatibilité configurée');
  }

  /**
   * Patch du KanbanManager pour utiliser le nouveau système
   */
  patchKanbanManager() {
    if (!this.kanbanManager) return;
    
    // Sauvegarder les méthodes originales
    const original_openTaskHistory = this.kanbanManager.openTaskHistory;
    
    // Remplacer par la nouvelle implémentation
    this.kanbanManager.openTaskHistory = async (taskId) => {
      logger.info('Patch: openTaskHistory appelé via KanbanManager');
      
      try {
        await this.openModal('history-modal', { taskId });
      } catch (error) {
        logger.warn('Nouveau système échoué, fallback vers ancien:', error);
        if (original_openTaskHistory) {
          return original_openTaskHistory.call(this.kanbanManager, taskId);
        }
        throw error;
      }
    };
    
    logger.debug('KanbanManager patché');
  }

  /**
   * Patch du HistoryManager
   */
  patchHistoryManager() {
    if (!this.historyManager) return;
    
    // Le HistoryManager garde sa logique métier
    // Seule l'interface modal change
    logger.debug('HistoryManager: logique métier conservée');
  }

  /**
   * Destruction du système
   */
  destroy() {
    logger.info('Destruction du système modal...');
    
    // Désenregistrement de toutes les modales
    for (const modalId of this.controllers.keys()) {
      this.registry.unregister(modalId);
    }
    
    this.controllers.clear();
    this.initialized = false;
    
    // Nettoyage API debug
    if (typeof window !== 'undefined') {
      delete window.ModalSystem;
      delete window.debugModals;
    }
    
    logger.info('Système modal détruit');
  }

  // ==========================================
  // GETTERS / ÉTAT
  // ==========================================

  /**
   * Vérifie si le système est initialisé
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Récupère les statistiques du système
   */
  getSystemStats() {
    return {
      initialized: this.initialized,
      registryStats: this.registry.getStats(),
      controllersCount: this.controllers.size,
      configuration: this.config
    };
  }

  /**
   * Liste toutes les modales du système
   */
  listModals() {
    return this.registry.listModals();
  }
}

// ==========================================
// API PUBLIQUE SIMPLIFIÉE
// ==========================================

/**
 * Instance globale du système (singleton)
 */
let globalModalSystem = null;

/**
 * Initialise le système modal (fonction principale)
 */
export async function initModalSystem(managers = {}, config = {}) {
  if (globalModalSystem?.isInitialized()) {
    logger.warn('Système modal déjà initialisé');
    return globalModalSystem;
  }
  
  globalModalSystem = new ModalSystem(config);
  await globalModalSystem.initialize(managers);
  
  return globalModalSystem;
}

/**
 * Récupère l'instance du système modal
 */
export function getModalSystem() {
  return globalModalSystem;
}

/**
 * API rapide pour ouvrir une modale
 */
export async function openModal(modalId, options = {}) {
  if (!globalModalSystem?.isInitialized()) {
    throw new Error('ModalSystem non initialisé');
  }
  
  return await globalModalSystem.openModal(modalId, options);
}

/**
 * API rapide pour fermer une modale
 */
export async function closeModal(modalId, options = {}) {
  if (!globalModalSystem?.isInitialized()) {
    throw new Error('ModalSystem non initialisé');
  }
  
  return await globalModalSystem.closeModal(modalId, options);
}

// ==========================================
// EXPORTS
// ==========================================

export {
  modalRegistry,
  ModalRegistry,
  BaseModalController,
  HistoryModalController
};

// Export par défaut - utilitaires uniquement
export default {
  init: initModalSystem,
  get: getModalSystem,
  open: openModal,
  close: closeModal
};