// === utils/ReferenceManager.js ===
// Gestionnaire pour les références de tâches (documentation, liens, dossiers)

import { createModuleLogger } from './LoggerManager.js';

/**
 * Gestionnaire pour les références de tâches
 */
export class ReferenceManager {
  constructor() {
    this.logger = createModuleLogger('ReferenceManager');
  }

  /**
   * Parse les références d'un texte (une par ligne)
   * @param {string} text - Texte contenant les références
   * @returns {Array} Array d'objets référence {type, url, display, icon}
   */
  parseReferences(text) {
    if (!text || !text.trim()) return [];

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const references = [];

    for (const line of lines) {
      const ref = this.parseReference(line);
      if (ref) {
        references.push(ref);
      }
    }

    return references;
  }

  /**
   * Parse une référence individuelle
   * @param {string} line - Ligne de référence
   * @returns {Object|null} Objet référence ou null si invalide
   */
  parseReference(line) {
    if (!line || !line.trim()) return null;

    const trimmed = line.trim();

    // URL (http/https)
    if (this.isUrl(trimmed)) {
      return {
        type: 'url',
        url: trimmed,
        display: this.truncateDisplay(trimmed),
        icon: 'bi-globe',
        title: trimmed
      };
    }

    // Email
    if (this.isEmail(trimmed)) {
      return {
        type: 'email',
        url: `mailto:${trimmed}`,
        display: trimmed,
        icon: 'bi-envelope',
        title: `Envoyer un email à ${trimmed}`
      };
    }

    // Chemin réseau (\\serveur\chemin)
    if (this.isNetworkPath(trimmed)) {
      return {
        type: 'file',
        url: `file:///${trimmed.replace(/\\/g, '/')}`,
        display: this.truncateDisplay(trimmed),
        icon: 'bi-folder',
        title: trimmed
      };
    }

    // Référence interne (GLPI-123, TICKET-456, etc.)
    if (this.isInternalReference(trimmed)) {
      return {
        type: 'reference',
        url: '#',
        display: trimmed,
        icon: 'bi-hash',
        title: `Référence: ${trimmed}`
      };
    }

    // Référence générique (tout autre texte)
    return {
      type: 'reference',
      url: '#',
      display: this.truncateDisplay(trimmed),
      icon: 'bi-bookmark',
      title: trimmed
    };
  }

  /**
   * Vérifie si une chaîne est une URL
   * @param {string} str - Chaîne à vérifier
   * @returns {boolean}
   */
  isUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si une chaîne est un email
   * @param {string} str - Chaîne à vérifier
   * @returns {boolean}
   */
  isEmail(str) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  }

  /**
   * Vérifie si une chaîne est un chemin réseau
   * @param {string} str - Chaîne à vérifier
   * @returns {boolean}
   */
  isNetworkPath(str) {
    return str.startsWith('\\\\') || str.match(/^[A-Z]:\\/i);
  }

  /**
   * Vérifie si une chaîne est une référence interne
   * @param {string} str - Chaîne à vérifier
   * @returns {boolean}
   */
  isInternalReference(str) {
    // Pattern pour GLPI-123, TICKET-456, INC-789, etc.
    return /^[A-Z]{2,}-\d+$/i.test(str);
  }

  /**
   * Tronque l'affichage d'une référence
   * @param {string} str - Chaîne à tronquer
   * @param {number} maxLength - Longueur maximale
   * @returns {string}
   */
  truncateDisplay(str, maxLength = 30) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 1) + '…';
  }

  /**
   * Génère le HTML pour l'aperçu des références
   * @param {string} text - Texte des références
   * @returns {string} HTML
   */
  generatePreviewHtml(text) {
    const references = this.parseReferences(text);
    
    if (references.length === 0) {
      return '<div class="text-muted small">Aucune référence détectée</div>';
    }

    const badges = references.map(ref => this.generateBadgeHtml(ref));
    return `<div class="references-container">${badges.join('')}</div>`;
  }

  /**
   * Génère le HTML d'un badge de référence
   * @param {Object} ref - Objet référence
   * @returns {string} HTML du badge
   */
  generateBadgeHtml(ref) {
    const target = ref.type === 'reference' && ref.url === '#' ? '' : 'target="_blank" rel="noopener noreferrer"';
    const href = ref.type === 'reference' && ref.url === '#' ? 'javascript:void(0)' : ref.url;
    
    return `
      <a href="${href}" ${target} 
         class="reference-badge type-${ref.type}" 
         title="${ref.title}"
         data-type="${ref.type}">
        <i class="bi ${ref.icon}"></i>
        ${ref.display}
      </a>
    `;
  }

  /**
   * Génère le HTML pour l'affichage dans les cartes
   * @param {string} referencesText - Texte des références
   * @returns {string} HTML pour les cartes
   */
  generateCardHtml(referencesText) {
    if (!referencesText || !referencesText.trim()) return '';

    const references = this.parseReferences(referencesText);
    if (references.length === 0) return '';

    // Limiter à 3 références dans les cartes pour éviter l'encombrement
    const displayRefs = references.slice(0, 3);
    const hasMore = references.length > 3;

    const badges = displayRefs.map(ref => this.generateBadgeHtml(ref));
    const moreIndicator = hasMore ? `<span class="reference-badge type-reference"><i class="bi bi-plus"></i>+${references.length - 3}</span>` : '';

    return `
      <div class="references-container">
        ${badges.join('')}
        ${moreIndicator}
      </div>
    `;
  }

  /**
   * Initialise les écouteurs pour un champ de références
   * @param {string} fieldId - ID du champ textarea
   * @param {string} previewId - ID du container d'aperçu
   */
  initializeField(fieldId, previewId) {
    const field = document.getElementById(fieldId);
    const preview = document.getElementById(previewId);

    if (!field || !preview) {
      this.logger.warn(`Field ${fieldId} or preview ${previewId} not found`);
      return;
    }

    // Écouteur pour la saisie en temps réel
    field.addEventListener('input', () => {
      this.updatePreview(field.value, preview);
    });

    // Écouteur pour le collage
    field.addEventListener('paste', () => {
      setTimeout(() => {
        this.updatePreview(field.value, preview);
      }, 10);
    });

    // Mise à jour initiale
    this.updatePreview(field.value, preview);
  }

  /**
   * Met à jour l'aperçu des références
   * @param {string} text - Texte des références
   * @param {HTMLElement} previewElement - Élément d'aperçu
   */
  updatePreview(text, previewElement) {
    if (!previewElement) return;
    
    const html = this.generatePreviewHtml(text);
    previewElement.innerHTML = html;
  }

  /**
   * Nettoie et valide les références
   * @param {string} text - Texte des références
   * @returns {string} Texte nettoyé
   */
  cleanReferences(text) {
    if (!text) return '';

    // Nettoyer les lignes vides et les espaces
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line);

    return lines.join('\n');
  }
}

// Instance globale
export const referenceManager = new ReferenceManager();