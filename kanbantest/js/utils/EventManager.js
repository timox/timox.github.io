// === utils/EventManager.js ===
// Gestionnaire centralisé pour éviter les écouteurs d'événements multiples

/**
 * Gestionnaire d'événements sans dépendance à jQuery.
 * Repose sur une délégation native pour limiter les doublons.
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
   * Identifie le type de cible fourni lors de l'enregistrement.
   * @param {*} selector
   * @returns {{type: 'string'|'element'|'document'|'window'|'unknown', target?: EventTarget, selector?: string}}
   */
  resolveSelector(selector) {
    if (!selector) {
      return { type: 'unknown' };
    }

    const hasWindow = typeof window !== 'undefined';
    const hasDocument = typeof document !== 'undefined';

    if (hasWindow && selector === window) {
      return { type: 'window', target: window };
    }

    const isDocumentInstance = typeof Document !== 'undefined' && selector instanceof Document;
    const isDocumentNode = selector && selector.nodeType === 9;
    if (hasDocument && (selector === document || isDocumentInstance || isDocumentNode)) {
      return { type: 'document', target: document };
    }

    if (typeof Element !== 'undefined' && selector instanceof Element) {
      return { type: 'element', target: selector };
    }

    if (typeof selector === 'string') {
      return { type: 'string', selector };
    }

    return { type: 'unknown' };
  }

  /**
   * Retrouve l'élément correspondant au sélecteur pour l'événement courant.
   * @param {Event} event
   * @param {string} selector
   * @returns {Element|null}
   */
  findMatchingTarget(event, selector) {
    if (!selector || typeof selector !== 'string') {
      return null;
    }

    const isElement = (candidate) => typeof Element !== 'undefined' && candidate instanceof Element;

    if (isElement(event.target) && event.target.matches(selector)) {
      return event.target;
    }

    if (isElement(event.target) && typeof event.target.closest === 'function') {
      return event.target.closest(selector);
    }

    if (typeof event.composedPath === 'function') {
      const path = event.composedPath();
      for (const candidate of path) {
        if (isElement(candidate) && candidate.matches(selector)) {
          return candidate;
        }
      }
    }

    return null;
  }

  /**
   * Attache un événement avec nettoyage automatique des doublons.
   * @param {string} selector - Sélecteur CSS ciblé.
   * @param {string} eventType - Type d'événement (click, change, etc.).
   * @param {Function} handler - Fonction de gestion.
   * @param {string} namespace - Namespace pour grouper les événements.
   */
  on(selector, eventType, handler, namespace = 'default') {
    const eventKey = `${eventType}.${namespace}`;
    const fullKey = `${selector}:${eventKey}`;

    // Nettoyer l'ancien écouteur s'il existe
    this.off(selector, eventType, namespace);

    const resolved = this.resolveSelector(selector);
    const isDelegated = resolved.type === 'string';

    const delegatedHandler = (event) => {
      if (!isDelegated) {
        handler.call(resolved.target, event);
        return;
      }

      const matchingTarget = this.findMatchingTarget(event, resolved.selector);
      if (!matchingTarget) {
        return;
      }
      handler.call(matchingTarget, event);
    };

    const target = isDelegated ? document : resolved.target;

    if (!target) {
      console.warn('🎯 Impossible d’attacher un événement sur une cible inconnue', selector, eventType, namespace);
      return;
    }

    target.addEventListener(eventType, delegatedHandler, true);

    this.registeredEvents.set(fullKey, {
      selector,
      eventType,
      namespace,
      handler,
      delegatedHandler,
      timestamp: Date.now(),
      target,
      delegated: isDelegated
    });

    console.log(`📎 Événement attaché: ${selector} ${eventKey}`);
  }

  /**
   * Supprime un événement spécifique.
   */
  off(selector, eventType, namespace = 'default') {
    const eventKey = `${eventType}.${namespace}`;
    const fullKey = `${selector}:${eventKey}`;
    const entry = this.registeredEvents.get(fullKey);

    if (entry) {
      const target = entry.delegated ? document : entry.target;
      if (target) {
        target.removeEventListener(entry.eventType, entry.delegatedHandler, true);
      }
      this.registeredEvents.delete(fullKey);
      console.log(`🗑️ Événement supprimé: ${selector} ${eventKey}`);
    }
  }

  /**
   * Supprime tous les événements d'un namespace.
   */
  offNamespace(namespace) {
    const toRemove = [];

    this.registeredEvents.forEach((event, key) => {
      if (event.namespace === namespace) {
        const target = event.delegated ? document : event.target;
        if (target) {
          target.removeEventListener(event.eventType, event.delegatedHandler, true);
        }
        toRemove.push(key);
      }
    });

    toRemove.forEach((key) => this.registeredEvents.delete(key));
    console.log(`🧹 Namespace nettoyé: ${namespace} (${toRemove.length} événements)`);
  }

  /**
   * Obtient les statistiques des événements enregistrés.
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
   * Nettoie tous les événements (utile pour debug).
   */
  cleanup() {
    this.registeredEvents.forEach((event) => {
      const target = event.delegated ? document : event.target;
      if (target) {
        target.removeEventListener(event.eventType, event.delegatedHandler, true);
      }
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
