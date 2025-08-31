// === utils/EventManager.js ===
// Gestionnaire centralisé pour éviter les écouteurs d'événements multiples

/**
 * Gestionnaire d'événements sécurisé utilisant jQuery
 * Évite les doublons et conflits d'événements
 */
export class EventManager {
  static instance = null;
  
  constructor() {
    if (EventManager.instance) {
      return EventManager.instance;
    }
    
    this.registeredEvents = new Map();
    EventManager.instance = this;
  }
  
  /**
   * Attache un événement avec nettoyage automatique des doublons
   * @param {string} selector - Sélecteur jQuery  
   * @param {string} eventType - Type d'événement (click, change, etc.)
   * @param {Function} handler - Fonction de gestion
   * @param {string} namespace - Namespace pour grouper les événements
   */
  on(selector, eventType, handler, namespace = 'default') {
    const eventKey = `${eventType}.${namespace}`;
    const fullKey = `${selector}:${eventKey}`;
    
    // Nettoyer l'ancien écouteur s'il existe
    if (this.registeredEvents.has(fullKey)) {
      $(document).off(eventKey, selector);
    }
    
    // Attacher le nouvel écouteur
    $(document).on(eventKey, selector, handler);
    
    // Enregistrer pour tracking
    this.registeredEvents.set(fullKey, {
      selector,
      eventType,
      namespace,
      handler,
      timestamp: Date.now()
    });
    
    console.log(`📎 Événement attaché: ${selector} ${eventKey}`);
  }
  
  /**
   * Supprime un événement spécifique
   */
  off(selector, eventType, namespace = 'default') {
    const eventKey = `${eventType}.${namespace}`;
    const fullKey = `${selector}:${eventKey}`;
    
    $(document).off(eventKey, selector);
    this.registeredEvents.delete(fullKey);
    
    console.log(`🗑️ Événement supprimé: ${selector} ${eventKey}`);
  }
  
  /**
   * Supprime tous les événements d'un namespace
   */
  offNamespace(namespace) {
    const toRemove = [];
    
    this.registeredEvents.forEach((event, key) => {
      if (event.namespace === namespace) {
        $(document).off(`${event.eventType}.${namespace}`, event.selector);
        toRemove.push(key);
      }
    });
    
    toRemove.forEach(key => this.registeredEvents.delete(key));
    console.log(`🧹 Namespace nettoyé: ${namespace} (${toRemove.length} événements)`);
  }
  
  /**
   * Obtient les statistiques des événements enregistrés
   */
  getStats() {
    const stats = {};
    
    this.registeredEvents.forEach((event) => {
      const key = event.namespace;
      if (!stats[key]) {
        stats[key] = 0;
      }
      stats[key]++;
    });
    
    return {
      total: this.registeredEvents.size,
      byNamespace: stats,
      all: Array.from(this.registeredEvents.keys())
    };
  }
  
  /**
   * Nettoie tous les événements (utile pour debug)
   */
  cleanup() {
    this.registeredEvents.forEach((event, key) => {
      $(document).off(`${event.eventType}.${event.namespace}`, event.selector);
    });
    
    this.registeredEvents.clear();
    console.log('🧽 Tous les événements nettoyés');
  }
}

// Singleton global
export const eventManager = new EventManager();

// Helper functions pour compatibilité
export function safeOn(selector, eventType, handler, namespace = 'default') {
  return eventManager.on(selector, eventType, handler, namespace);
}

export function safeOff(selector, eventType, namespace = 'default') {
  return eventManager.off(selector, eventType, namespace);
}

export function cleanNamespace(namespace) {
  return eventManager.offNamespace(namespace);
}

// Debug helpers
window.EventManagerDebug = {
  stats: () => eventManager.getStats(),
  cleanup: () => eventManager.cleanup(),
  list: () => console.table(Array.from(eventManager.registeredEvents.entries()))
};