// === utils/safe-dom.js ===
// Helpers DOM sécurisés pour prévenir les injections XSS.
// Utiliser ces fonctions à la place de innerHTML avec des données utilisateur.

/**
 * Échappe les caractères HTML dangereux dans une chaîne
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne avec les caractères HTML échappés
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Crée un élément DOM de manière sécurisée (sans innerHTML)
 *
 * @param {string} tag - Nom de la balise HTML
 * @param {object} attrs - Attributs de l'élément
 *   - className: string (class CSS)
 *   - textContent: string (texte brut, échappé automatiquement)
 *   - dataset: object (attributs data-*)
 *   - Tout autre attribut est passé via setAttribute
 * @param {Array<string|Node>} children - Enfants : strings (→ TextNode) ou Nodes
 * @returns {HTMLElement}
 *
 * @example
 *   safeCreateElement('span', { className: 'badge', textContent: userInput });
 *   safeCreateElement('div', { className: 'card' }, [
 *     safeCreateElement('h3', { textContent: titre }),
 *     safeCreateElement('p', { textContent: description })
 *   ]);
 */
export function safeCreateElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else if (key === 'dataset' && typeof value === 'object') {
      for (const [dk, dv] of Object.entries(value)) {
        el.dataset[dk] = dv;
      }
    } else if (key === 'style' && typeof value === 'object') {
      for (const [sk, sv] of Object.entries(value)) {
        el.style[sk] = sv;
      }
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}
