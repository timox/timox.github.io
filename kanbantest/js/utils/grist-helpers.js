// === utils/grist-helpers.js ===
// Fonctions pures pour manipuler les données Grist (Reference, ReferenceList, ChoiceList)
// Extraites de SharedTaskModal.js pour réutilisation dans tous les modules.

/**
 * Extrait le premier ID depuis une référence Grist (Reference ou ReferenceList)
 * @param {any} value - Valeur au format Grist ["L", id, ...] ou nombre direct
 * @returns {number|null} Le premier ID extrait ou null
 */
export function extractGristRefId(value) {
  if (value === null || value === undefined) {
    return null;
  }
  // Format Grist ReferenceList ["L", id1, id2, ...] ou Reference ["L", id]
  if (Array.isArray(value) && value.length >= 2 && value[0] === 'L') {
    return value[1];
  }
  // Nombre direct
  if (typeof value === 'number') {
    return value;
  }
  // String numérique
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  return null;
}

/**
 * Extrait tous les IDs depuis une référence multiple Grist (ReferenceList)
 * @param {any} value - Valeur au format Grist ["L", id1, id2, ...] ou nombre direct
 * @returns {number[]} Tableau des IDs extraits
 */
export function extractGristRefIds(value) {
  if (value === null || value === undefined) {
    return [];
  }
  // Format Grist ReferenceList ["L", id1, id2, ...]
  if (Array.isArray(value) && value.length >= 1 && value[0] === 'L') {
    return value.slice(1).filter(id => typeof id === 'number');
  }
  // Nombre direct
  if (typeof value === 'number') {
    return [value];
  }
  // String numérique
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return [parseInt(value, 10)];
  }
  return [];
}

/**
 * Convertit une valeur Grist en string de manière sécurisée
 * Gère: string, number, array ['L', 'val'], Reference, null
 * @param {any} value - Valeur Grist
 * @returns {string} Représentation texte
 */
export function toGristString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    // ChoiceList format: ['L', 'val1', 'val2']
    if (value[0] === 'L') return value.slice(1).join(', ');
    return value.join(', ');
  }
  if (typeof value === 'object') {
    // Reference format: peut avoir une propriété displayValue
    if (value.displayValue) return String(value.displayValue);
    return '';
  }
  return String(value);
}

/**
 * Construit un tableau Grist ChoiceList/ReferenceList depuis un tableau simple
 * @param {Array} values - Tableau de valeurs
 * @returns {Array} Format Grist ['L', ...values]
 */
export function toGristList(values) {
  if (!Array.isArray(values) || values.length === 0) return ['L'];
  return ['L', ...values];
}

/**
 * Vérifie si une valeur Grist est une liste vide
 * @param {any} value - Valeur Grist
 * @returns {boolean} true si la liste est vide ou null
 */
export function isGristListEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) && value[0] === 'L') return value.length <= 1;
  return false;
}
