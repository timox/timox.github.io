/**
 * ModalRegistry - Gestionnaire centralisé des modales
 * 
 * RESPONSABILITÉS:
 * - Registre unique de toutes les modales
 * - Gestion du cycle de vie (création, ouverture, fermeture)
 * - Maintien des références Bootstrap Modal
 * - API unifiée pour tous les composants
 * - Logging et debug centralisé
 * 
 * ARCHITECTURE:
 * - Single Source of Truth pour l'état des modales
 * - Délégation vers des controllers spécialisés
 * - Gestion des conflits et race conditions
 */

import { createModuleLogger } from '../utils/LoggerManager.js';

export class ModalRegistry {
  constructor() {
    this.logger = createModuleLogger('ModalRegistry');
    
    // Registres principaux
    this.modals = new Map();           // modalId → modalElement
    this.controllers = new Map();      // modalId → controller instance
    this.bootstrapInstances = new Map(); // modalId → Bootstrap Modal instance
    this.state = new Map();            // modalId → état (closed, opening, open, closing)
    
    // Configuration
    this.config = {
      enableTracing: false,
      autoCleanup: true,
      conflictResolution: 'last-wins'
    };
    
    // Statistiques et debug
    this.stats = {
      totalOpens: 0,
      totalCloses: 0,
      errors: 0,
      created: Date.now()
    };
    
    this.logger.info('ModalRegistry initialisé');
    this._initializeExistingModals();
  }

  /**
   * Enregistre une modale avec son controller
   * @param {string} modalId - ID unique de la modale
   * @param {BaseModalController} controller - Controller spécialisé
   * @param {Object} options - Options d'enregistrement
   */
  register(modalId, controller, options = {}) {
    this.logger.info(`Enregistrement modale: ${modalId}`, { controller: controller.constructor.name });
    
    // Vérification des conflits
    if (this.modals.has(modalId) && this.config.conflictResolution === 'error') {
      throw new Error(`Modale ${modalId} déjà enregistrée`);
    }
    
    // Nettoyage de l'ancienne registration si nécessaire
    if (this.modals.has(modalId)) {
      this.logger.warn(`Remplacement de la modale existante: ${modalId}`);
      this.unregister(modalId);
    }
    
    // Récupération de l'élément DOM
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      throw new Error(`Élément DOM non trouvé pour modale: ${modalId}`);
    }
    
    // Enregistrement
    this.modals.set(modalId, modalElement);
    this.controllers.set(modalId, controller);
    this.state.set(modalId, 'closed');
    
    // Initialisation du controller
    controller._setRegistry(this);
    controller._setModalElement(modalElement);
    
    // Création de l'instance Bootstrap
    this._createBootstrapInstance(modalId, options.bootstrap || {});
    
    // Binding des événements de base
    this._bindModalEvents(modalId);
    
    this.logger.info(`Modale enregistrée avec succès: ${modalId}`);
    
    return {
      modalId,
      element: modalElement,
      controller,
      bootstrapInstance: this.bootstrapInstances.get(modalId)
    };
  }

  /**
   * Désenregistre une modale
   * @param {string} modalId - ID de la modale à désenregistrer
   */
  unregister(modalId) {
    this.logger.info(`Désenregistrement modale: ${modalId}`);
    
    if (!this.modals.has(modalId)) {
      this.logger.warn(`Tentative de désenregistrement d'une modale inexistante: ${modalId}`);
      return;
    }
    
    // Fermeture si ouverte
    if (this.isOpen(modalId)) {
      this.close(modalId);
    }
    
    // Nettoyage du controller
    const controller = this.controllers.get(modalId);
    if (controller && typeof controller.destroy === 'function') {
      controller.destroy();
    }
    
    // Nettoyage de l'instance Bootstrap
    const bsInstance = this.bootstrapInstances.get(modalId);
    if (bsInstance) {
      bsInstance.dispose();
    }
    
    // Suppression des registres
    this.modals.delete(modalId);
    this.controllers.delete(modalId);
    this.bootstrapInstances.delete(modalId);
    this.state.delete(modalId);
    
    this.logger.info(`Modale désenregistrée: ${modalId}`);
  }

  /**
   * Ouvre une modale
   * @param {string} modalId - ID de la modale
   * @param {Object} options - Options d'ouverture
   */
  async open(modalId, options = {}) {
    const traceId = this._generateTraceId();
    this.logger.info(`[${traceId}] Ouverture modale: ${modalId}`, options);
    
    try {
      // Vérifications préalables
      this._validateModalExists(modalId);
      
      const currentState = this.state.get(modalId);
      if (currentState === 'opening' || currentState === 'open') {
        this.logger.warn(`[${traceId}] Modale déjà ouverte ou en cours d'ouverture: ${modalId}`);
        return;
      }
      
      // Changement d'état
      this.state.set(modalId, 'opening');
      
      // Préparation via le controller
      const controller = this.controllers.get(modalId);
      await controller.beforeOpen(options);
      
      // Rendu du contenu
      await controller.renderContent(options);
      
      // Ouverture Bootstrap
      const bsInstance = this.bootstrapInstances.get(modalId);
      bsInstance.show();
      
      // Finalisation
      this.state.set(modalId, 'open');
      this.stats.totalOpens++;
      
      await controller.afterOpen(options);
      
      this.logger.info(`[${traceId}] Modale ouverte avec succès: ${modalId}`);
      
    } catch (error) {
      this.state.set(modalId, 'closed');
      this.stats.errors++;
      this.logger.error(`[${traceId}] Erreur ouverture modale ${modalId}:`, error);
      throw error;
    }
  }

  /**
   * Ferme une modale
   * @param {string} modalId - ID de la modale
   * @param {Object} options - Options de fermeture
   */
  async close(modalId, options = {}) {
    const traceId = this._generateTraceId();
    this.logger.info(`[${traceId}] Fermeture modale: ${modalId}`, options);
    
    try {
      this._validateModalExists(modalId);
      
      const currentState = this.state.get(modalId);
      if (currentState === 'closing' || currentState === 'closed') {
        this.logger.warn(`[${traceId}] Modale déjà fermée ou en cours de fermeture: ${modalId}`);
        return;
      }
      
      // Changement d'état
      this.state.set(modalId, 'closing');
      
      // Préparation via le controller
      const controller = this.controllers.get(modalId);
      await controller.beforeClose(options);
      
      // Fermeture Bootstrap
      const bsInstance = this.bootstrapInstances.get(modalId);
      bsInstance.hide();
      
      // Finalisation
      this.state.set(modalId, 'closed');
      this.stats.totalCloses++;
      
      await controller.afterClose(options);
      
      this.logger.info(`[${traceId}] Modale fermée avec succès: ${modalId}`);
      
    } catch (error) {
      this.state.set(modalId, 'open');
      this.stats.errors++;
      this.logger.error(`[${traceId}] Erreur fermeture modale ${modalId}:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si une modale est ouverte
   * @param {string} modalId - ID de la modale
   * @returns {boolean} True si ouverte
   */
  isOpen(modalId) {
    const state = this.state.get(modalId);
    return state === 'open' || state === 'opening';
  }

  /**
   * Récupère le controller d'une modale
   * @param {string} modalId - ID de la modale
   * @returns {BaseModalController} Controller de la modale
   */
  getController(modalId) {
    return this.controllers.get(modalId);
  }

  /**
   * Liste toutes les modales enregistrées
   * @returns {Array} Liste des modales avec leur état
   */
  listModals() {
    const modals = [];
    for (const [modalId, element] of this.modals) {
      modals.push({
        modalId,
        state: this.state.get(modalId),
        controller: this.controllers.get(modalId)?.constructor.name,
        element: element?.tagName,
        hasBootstrap: this.bootstrapInstances.has(modalId)
      });
    }
    return modals;
  }

  /**
   * Récupère l'état détaillé d'une modale
   * @param {string} modalId - ID de la modale
   * @returns {Object} État détaillé
   */
  getState(modalId) {
    if (!this.modals.has(modalId)) {
      return null;
    }
    
    const element = this.modals.get(modalId);
    const controller = this.controllers.get(modalId);
    const bsInstance = this.bootstrapInstances.get(modalId);
    
    return {
      modalId,
      state: this.state.get(modalId),
      exists: !!element,
      inDOM: document.contains(element),
      controller: {
        type: controller?.constructor.name,
        instance: controller
      },
      bootstrap: {
        exists: !!bsInstance,
        instance: bsInstance
      },
      element: {
        id: element?.id,
        classes: element?.className,
        display: element ? window.getComputedStyle(element).display : null
      }
    };
  }

  /**
   * Active/désactive le tracing détaillé
   * @param {boolean} enabled - True pour activer
   */
  enableTracing(enabled = true) {
    this.config.enableTracing = enabled;
    this.logger.info(`Tracing ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Récupère les statistiques
   * @returns {Object} Statistiques d'utilisation
   */
  getStats() {
    return {
      ...this.stats,
      registeredModals: this.modals.size,
      openModals: Array.from(this.state.values()).filter(s => s === 'open').length,
      uptime: Date.now() - this.stats.created
    };
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  /**
   * Initialise les modales déjà présentes dans le DOM
   * @private
   */
  _initializeExistingModals() {
    const existingModals = document.querySelectorAll('.modal');
    this.logger.info(`Détection de ${existingModals.length} modales existantes dans le DOM`);
    
    existingModals.forEach(modal => {
      if (modal.id) {
        this.logger.debug(`Modale existante détectée: ${modal.id}`);
        // Ne pas auto-enregistrer, attendre l'enregistrement explicite
      }
    });
  }

  /**
   * Crée une instance Bootstrap Modal
   * @private
   */
  _createBootstrapInstance(modalId, options) {
    const element = this.modals.get(modalId);
    
    if (typeof bootstrap === 'undefined') {
      throw new Error('Bootstrap non disponible');
    }
    
    const defaultOptions = {
      backdrop: true,
      keyboard: true,
      focus: true
    };
    
    const bsOptions = { ...defaultOptions, ...options };
    const bsInstance = new bootstrap.Modal(element, bsOptions);
    
    this.bootstrapInstances.set(modalId, bsInstance);
    this.logger.debug(`Instance Bootstrap créée pour: ${modalId}`, bsOptions);
  }

  /**
   * Bind les événements Bootstrap de base
   * @private
   */
  _bindModalEvents(modalId) {
    const element = this.modals.get(modalId);
    
    // Événements Bootstrap
    element.addEventListener('show.bs.modal', () => {
      this.logger.debug(`Événement show.bs.modal: ${modalId}`);
    });
    
    element.addEventListener('shown.bs.modal', () => {
      this.logger.debug(`Événement shown.bs.modal: ${modalId}`);
    });
    
    element.addEventListener('hide.bs.modal', () => {
      this.logger.debug(`Événement hide.bs.modal: ${modalId}`);
    });
    
    element.addEventListener('hidden.bs.modal', () => {
      this.logger.debug(`Événement hidden.bs.modal: ${modalId}`);
    });
  }

  /**
   * Valide qu'une modale existe
   * @private
   */
  _validateModalExists(modalId) {
    if (!this.modals.has(modalId)) {
      throw new Error(`Modale non enregistrée: ${modalId}`);
    }
  }

  /**
   * Génère un ID de trace unique
   * @private
   */
  _generateTraceId() {
    return Math.random().toString(36).substr(2, 8);
  }
}

// Export d'instance singleton
export const modalRegistry = new ModalRegistry();

// Export pour tests
export { ModalRegistry };

// API globale pour debug
if (typeof window !== 'undefined') {
  window.ModalRegistry = modalRegistry;
}