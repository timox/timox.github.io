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

  getBucket(eventKey, createIfMissing = false) {
    if (!this.registeredEvents.has(eventKey)) {
      if (!createIfMissing) {
        return null;
      }
      this.registeredEvents.set(eventKey, new Map());
    }

    return this.registeredEvents.get(eventKey);
  }

  getSelectorKey(resolved, originalSelector) {
    if (resolved.type === 'string') {
      return resolved.selector;
    }

    if (resolved.target) {
      return resolved.target;
    }

    return typeof originalSelector === 'string' ? originalSelector : originalSelector ?? null;
  }

  getSelectorLabel(selector, resolved) {
    if (typeof selector === 'string') {
      return selector;
    }

    if (resolved.type === 'window') {
      return 'window';
    }

    if (resolved.type === 'document') {
      return 'document';
    }

    if (selector && selector.nodeType === 1) {
      const element = selector;
      const tag = element.tagName ? element.tagName.toLowerCase() : 'element';
      const id = element.id ? `#${element.id}` : '';
      const classes = element.classList && element.classList.length
        ? `.${Array.from(element.classList).join('.')}`
        : '';

      return `<${tag}${id}${classes}>`;
    }

    return String(selector);
  }

  detachEntry(entry) {
    if (entry && entry.listenTarget) {
      entry.listenTarget.removeEventListener(entry.eventType, entry.delegatedHandler, true);
    }
  }

  removeEntry(eventKey, selectorKey) {
    const bucket = this.registeredEvents.get(eventKey);
    if (!bucket) {
      return null;
    }

    const entry = bucket.get(selectorKey);
    if (!entry) {
      return null;
    }

    this.detachEntry(entry);
    bucket.delete(selectorKey);

    if (bucket.size === 0) {
      this.registeredEvents.delete(eventKey);
    }

    return entry;
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
    const isDocumentLikeString = typeof selector === 'string' && selector.trim() === '[object HTMLDocument]';
    if (hasDocument && (selector === document || isDocumentInstance || isDocumentNode || isDocumentLikeString)) {
      return { type: 'document', target: document };
    }

    if (typeof Element !== 'undefined' && selector instanceof Element) {
      return { type: 'element', target: selector };
    }

    if (typeof selector === 'object' && selector !== null && String(selector) === '[object HTMLDocument]') {
      return { type: 'document', target: document };
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

    if (selector.startsWith('[object ')) {
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

    // Nettoyer l'ancien écouteur s'il existe
    this.off(selector, eventType, namespace);

    const resolved = this.resolveSelector(selector);
    const selectorKey = this.getSelectorKey(resolved, selector);
    const isDelegated = resolved.type === 'string';

    if (selectorKey == null) {
      console.warn('🎯 Impossible de déterminer une clé de sélecteur valide', selector, eventType, namespace);
      return;
    }

    const delegatedHandler = (event) => {
      if (!isDelegated) {
        handler.call(resolved.target, event);
        return;
      }

      const matchingTarget = this.findMatchingTarget(event, resolved.selector);
      if (!matchingTarget) {
        return;
      }

      if (!event.delegateTarget) {
        try {
          Object.defineProperty(event, 'delegateTarget', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: matchingTarget
          });
        } catch (defineError) {
          event.delegateTarget = matchingTarget;
        }
      } else {
        event.delegateTarget = matchingTarget;
      }

      // Proxifier l'événement pour exposer currentTarget/delegateTarget tout en conservant
      // les méthodes natives (preventDefault, stopPropagation, ...) liées au véritable event.
      const proxiedEvent = new Proxy(event, {
        get(target, prop, receiver) {
          if (prop === 'currentTarget' || prop === 'delegateTarget') {
            return matchingTarget;
          }

          if (prop === 'originalEvent') {
            return target;
          }

          const value = Reflect.get(target, prop, receiver);

          if (typeof value === 'function') {
            return value.bind(target);
          }

          return value;
        },
        has(target, prop) {
          if (prop === 'currentTarget' || prop === 'delegateTarget' || prop === 'originalEvent') {
            return true;
          }
          return Reflect.has(target, prop);
        }
      });

      handler.call(matchingTarget, proxiedEvent);
    };

    const target = isDelegated ? document : resolved.target;

    if (!target) {
      console.warn('🎯 Impossible d’attacher un événement sur une cible inconnue', selector, eventType, namespace);
      return;
    }

    target.addEventListener(eventType, delegatedHandler, true);

    const bucket = this.getBucket(eventKey, true);
    const selectorLabel = this.getSelectorLabel(selector, resolved);

    bucket.set(selectorKey, {
      selector,
      selectorKey,
      selectorLabel,
      eventKey,
      eventType,
      namespace,
      handler,
      delegatedHandler,
      timestamp: Date.now(),
      listenTarget: target,
      delegated: isDelegated
    });

    console.log(`📎 Événement attaché: ${selectorLabel} ${eventKey}`);
  }

  /**
   * Supprime un événement spécifique.
   */
  off(selector, eventType, namespace = 'default') {
    const eventKey = `${eventType}.${namespace}`;
    const resolved = this.resolveSelector(selector);
    const selectorKey = this.getSelectorKey(resolved, selector);

    if (selectorKey == null) {
      return;
    }

    const removed = this.removeEntry(eventKey, selectorKey);

    if (removed) {
      console.log(`🗑️ Événement supprimé: ${removed.selectorLabel} ${eventKey}`);
    }
  }

  /**
   * Supprime tous les événements d'un namespace.
   */
  offNamespace(namespace) {
    const toRemove = [];

    this.registeredEvents.forEach((bucket, eventKey) => {
      bucket.forEach((event, selectorKey) => {
        if (event.namespace === namespace) {
          toRemove.push({ eventKey, selectorKey });
        }
      });
    });

    toRemove.forEach(({ eventKey, selectorKey }) => {
      this.removeEntry(eventKey, selectorKey);
    });

    console.log(`🧹 Namespace nettoyé: ${namespace} (${toRemove.length} événements)`);
  }

  /**
   * Obtient les statistiques des événements enregistrés.
   */
  getStats() {
    const stats = {};

    let total = 0;
    const all = [];

    this.registeredEvents.forEach((bucket) => {
      bucket.forEach((event) => {
        total++;
        if (!stats[event.namespace]) {
          stats[event.namespace] = 0;
        }
        stats[event.namespace]++;
        all.push(`${event.selectorLabel}:${event.eventKey}`);
      });
    });

    return {
      total,
      byNamespace: stats,
      all
    };
  }

  /**
   * Nettoie tous les événements (utile pour debug).
   */
  cleanup() {
    this.registeredEvents.forEach((bucket) => {
      bucket.forEach((event) => {
        this.detachEntry(event);
      });
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
  list: () => {
    const rows = [];
    eventManager.registeredEvents.forEach((bucket, eventKey) => {
      bucket.forEach((entry) => {
        rows.push({
          eventKey,
          selector: entry.selectorLabel,
          namespace: entry.namespace,
          delegated: entry.delegated,
          attachedAt: new Date(entry.timestamp).toISOString()
        });
      });
    });

    console.table(rows);
    return rows;
  }
};
