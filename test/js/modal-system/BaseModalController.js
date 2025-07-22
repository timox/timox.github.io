/**
 * BaseModalController - Classe de base pour tous les controllers de modales
 * 
 * RESPONSABILITÉS:
 * - Définit le cycle de vie standard des modales
 * - Fournit les méthodes communes (logging, validation, etc.)
 * - Template pattern pour les controllers spécialisés
 * - Gestion des événements et du state
 * 
 * UTILISATION:
 * - Hériter de cette classe pour créer un controller spécialisé
 * - Implémenter les méthodes abstraites (renderContent, etc.)
 * - Utiliser les hooks du cycle de vie selon les besoins
 */

import { createModuleLogger } from '../utils/LoggerManager.js';

export class BaseModalController {
  constructor(modalId, options = {}) {
    this.modalId = modalId;
    this.options = { ...this.getDefaultOptions(), ...options };
    
    // État interne
    this.state = 'initialized';
    this.lastOpenOptions = null;
    this.registry = null;
    this.modalElement = null;
    
    // Logging
    this.logger = createModuleLogger(`Modal:${modalId}`);
    
    // Événements personnalisés
    this.eventHandlers = new Map();
    
    this.logger.info(`Controller initialisé: ${this.constructor.name}`);
  }

  /**
   * Options par défaut (à overrider dans les classes filles)
   * @returns {Object} Options par défaut
   */
  getDefaultOptions() {
    return {
      autoFocus: true,
      validateOnOpen: true,
      logLevel: 'INFO'
    };
  }

  // ==========================================
  // CYCLE DE VIE PRINCIPAL
  // ==========================================

  /**
   * Préparation avant ouverture (Hook)
   * @param {Object} options - Options d'ouverture
   */
  async beforeOpen(options = {}) {
    this.logger.info(`beforeOpen appelé`, options);
    this.lastOpenOptions = options;
    this.state = 'preparing';
    
    // Validation si activée
    if (this.options.validateOnOpen) {
      await this.validate(options);
    }
    
    // Hook personnalisé
    await this.onBeforeOpen(options);
  }

  /**
   * Rendu du contenu de la modale (Méthode abstraite)
   * @param {Object} options - Options de rendu
   */
  async renderContent(options = {}) {
    this.logger.info(`renderContent appelé`, options);
    this.state = 'rendering';
    
    try {
      // Méthode abstraite à implémenter
      await this.doRenderContent(options);
      
      // Binding des événements après rendu
      this.bindEvents();
      
    } catch (error) {
      this.logger.error(`Erreur renderContent:`, error);
      throw error;
    }
  }

  /**
   * Finalisation après ouverture (Hook)
   * @param {Object} options - Options d'ouverture
   */
  async afterOpen(options = {}) {
    this.logger.info(`afterOpen appelé`, options);
    this.state = 'open';
    
    // Auto-focus si activé
    if (this.options.autoFocus) {
      this.setFocus();
    }
    
    // Hook personnalisé
    await this.onAfterOpen(options);
  }

  /**
   * Préparation avant fermeture (Hook)
   * @param {Object} options - Options de fermeture
   */
  async beforeClose(options = {}) {
    this.logger.info(`beforeClose appelé`, options);
    this.state = 'closing';
    
    // Unbinding des événements
    this.unbindEvents();
    
    // Hook personnalisé
    await this.onBeforeClose(options);
  }

  /**
   * Finalisation après fermeture (Hook)
   * @param {Object} options - Options de fermeture
   */
  async afterClose(options = {}) {
    this.logger.info(`afterClose appelé`, options);
    this.state = 'closed';
    
    // Nettoyage
    this.cleanup();
    
    // Hook personnalisé
    await this.onAfterClose(options);
  }

  // ==========================================
  // MÉTHODES ABSTRAITES (À IMPLÉMENTER)
  // ==========================================

  /**
   * Implémentation concrète du rendu de contenu
   * @param {Object} options - Options de rendu
   * @abstract
   */
  async doRenderContent(options = {}) {
    throw new Error(`doRenderContent doit être implémentée dans ${this.constructor.name}`);
  }

  /**
   * Validation des données avant ouverture
   * @param {Object} options - Options à valider
   * @abstract
   */
  async validate(options = {}) {
    // Implémentation par défaut: pas de validation
    this.logger.debug(`Validation par défaut (aucune)`);
  }

  // ==========================================
  // HOOKS PERSONNALISÉS (OPTIONNELS)
  // ==========================================

  /**
   * Hook appelé avant ouverture (optionnel)
   * @param {Object} options - Options d'ouverture
   */
  async onBeforeOpen(options = {}) {
    // Implémentation par défaut: rien
  }

  /**
   * Hook appelé après ouverture (optionnel)
   * @param {Object} options - Options d'ouverture
   */
  async onAfterOpen(options = {}) {
    // Implémentation par défaut: rien
  }

  /**
   * Hook appelé avant fermeture (optionnel)
   * @param {Object} options - Options de fermeture
   */
  async onBeforeClose(options = {}) {
    // Implémentation par défaut: rien
  }

  /**
   * Hook appelé après fermeture (optionnel)
   * @param {Object} options - Options de fermeture
   */
  async onAfterClose(options = {}) {
    // Implémentation par défaut: rien
  }

  // ==========================================
  // GESTION DES ÉVÉNEMENTS
  // ==========================================

  /**
   * Binding des événements de la modale
   */
  bindEvents() {
    this.logger.debug(`bindEvents appelé`);
    
    // Événements Bootstrap par défaut
    this._bindBootstrapEvents();
    
    // Hook pour événements personnalisés
    this.bindCustomEvents();
  }

  /**
   * Unbinding des événements de la modale
   */
  unbindEvents() {
    this.logger.debug(`unbindEvents appelé`);
    
    // Suppression des événements personnalisés
    this.eventHandlers.clear();
    
    // Hook pour nettoyage personnalisé
    this.unbindCustomEvents();
  }

  /**
   * Binding des événements personnalisés (à overrider)
   */
  bindCustomEvents() {
    // Implémentation par défaut: rien
  }

  /**
   * Unbinding des événements personnalisés (à overrider)
   */
  unbindCustomEvents() {
    // Implémentation par défaut: rien
  }

  /**
   * Ajoute un gestionnaire d'événement
   * @param {string} eventType - Type d'événement
   * @param {string} selector - Sélecteur CSS
   * @param {Function} handler - Gestionnaire
   */
  addEventHandler(eventType, selector, handler) {
    if (!this.modalElement) return;
    
    const boundHandler = handler.bind(this);
    const key = `${eventType}:${selector}`;
    
    // Delegation d'événements
    this.modalElement.addEventListener(eventType, (e) => {
      if (e.target.matches(selector)) {
        boundHandler(e);
      }
    });
    
    this.eventHandlers.set(key, boundHandler);
    this.logger.debug(`Event handler ajouté: ${key}`);
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  /**
   * Définit le focus sur un élément de la modale
   * @param {string} selector - Sélecteur de l'élément (optionnel)
   */
  setFocus(selector = null) {
    if (!this.modalElement) return;
    
    let targetElement;
    
    if (selector) {
      targetElement = this.modalElement.querySelector(selector);
    } else {
      // Focus par défaut: premier input, textarea, ou button
      targetElement = this.modalElement.querySelector('input, textarea, select, button');
    }
    
    if (targetElement && typeof targetElement.focus === 'function') {
      setTimeout(() => targetElement.focus(), 100);
      this.logger.debug(`Focus défini sur: ${targetElement.tagName}`);
    }
  }

  /**
   * Recherche un élément dans la modale
   * @param {string} selector - Sélecteur CSS
   * @returns {Element|null} Élément trouvé
   */
  findElement(selector) {
    if (!this.modalElement) return null;
    return this.modalElement.querySelector(selector);
  }

  /**
   * Recherche plusieurs éléments dans la modale
   * @param {string} selector - Sélecteur CSS
   * @returns {NodeList} Éléments trouvés
   */
  findElements(selector) {
    if (!this.modalElement) return [];
    return this.modalElement.querySelectorAll(selector);
  }

  /**
   * Met à jour le titre de la modale
   * @param {string} title - Nouveau titre
   */
  setTitle(title) {
    const titleElement = this.findElement('.modal-title');
    if (titleElement) {
      titleElement.innerHTML = title;
      this.logger.debug(`Titre mis à jour: ${title}`);
    }
  }

  /**
   * Affiche un état de chargement
   * @param {boolean} loading - True pour afficher le loading
   * @param {string} message - Message de chargement
   */
  setLoading(loading = true, message = 'Chargement...') {
    const body = this.findElement('.modal-body');
    if (!body) return;
    
    if (loading) {
      body.style.opacity = '0.5';
      body.style.pointerEvents = 'none';
      
      // Ajouter un spinner si pas déjà présent
      if (!this.findElement('.loading-spinner')) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner position-absolute top-50 start-50 translate-middle';
        spinner.innerHTML = `
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">${message}</span>
          </div>
        `;
        body.style.position = 'relative';
        body.appendChild(spinner);
      }
    } else {
      body.style.opacity = '';
      body.style.pointerEvents = '';
      
      const spinner = this.findElement('.loading-spinner');
      if (spinner) {
        spinner.remove();
      }
    }
  }

  /**
   * Nettoyage des ressources
   */
  cleanup() {
    this.logger.debug(`Nettoyage du controller`);
    
    // Arrêter le loading si actif
    this.setLoading(false);
    
    // Nettoyage personnalisé
    this.doCleanup();
  }

  /**
   * Nettoyage personnalisé (à overrider)
   */
  doCleanup() {
    // Implémentation par défaut: rien
  }

  /**
   * Destruction du controller
   */
  destroy() {
    this.logger.info(`Destruction du controller`);
    
    this.unbindEvents();
    this.cleanup();
    this.state = 'destroyed';
    
    // Suppression des références
    this.registry = null;
    this.modalElement = null;
    this.lastOpenOptions = null;
  }

  // ==========================================
  // MÉTHODES INTERNES (UTILISÉES PAR LE REGISTRY)
  // ==========================================

  /**
   * Définit la référence au registry (usage interne)
   * @param {ModalRegistry} registry - Instance du registry
   * @internal
   */
  _setRegistry(registry) {
    this.registry = registry;
  }

  /**
   * Définit l'élément modal (usage interne)
   * @param {Element} element - Élément DOM de la modale
   * @internal
   */
  _setModalElement(element) {
    this.modalElement = element;
  }

  /**
   * Binding des événements Bootstrap par défaut
   * @private
   */
  _bindBootstrapEvents() {
    if (!this.modalElement) return;
    
    // Pas besoin de binding supplémentaire, 
    // le ModalRegistry gère déjà les événements Bootstrap de base
  }

  // ==========================================
  // GETTERS / SETTERS
  // ==========================================

  /**
   * Récupère l'état actuel du controller
   * @returns {string} État actuel
   */
  getState() {
    return this.state;
  }

  /**
   * Récupère les dernières options d'ouverture
   * @returns {Object|null} Dernières options
   */
  getLastOpenOptions() {
    return this.lastOpenOptions;
  }

  /**
   * Vérifie si la modale est ouverte
   * @returns {boolean} True si ouverte
   */
  isOpen() {
    return this.state === 'open';
  }
}

// Pas besoin d'export default - déjà exporté avec la classe