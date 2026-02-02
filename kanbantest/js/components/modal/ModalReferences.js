/**
 * ModalReferences - Gestion de la previsualisation des references dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere le parsing et la previsualisation des references (URLs, chemins, emails, etc.)
 */

import { escapeHTML } from '../../utils/safe-dom.js';

export class ModalReferences {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Parse et previsualise les references
   */
  updateReferencesPreview() {
    const textarea = document.getElementById('stm-references');
    const preview = document.getElementById('stm-references-preview');
    if (!textarea || !preview) return;

    const lines = textarea.value.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      preview.innerHTML = '';
      return;
    }

    preview.innerHTML = lines.map(line => {
      line = line.trim();
      // URL - validate and escape
      if (line.match(/^https?:\/\//)) {
        const safeUrl = encodeURI(line);
        return `<a href="${escapeHTML(safeUrl)}" target="_blank" class="badge bg-info text-decoration-none me-1 mb-1"><i class="bi bi-link-45deg"></i> ${escapeHTML(this.truncate(line, 40))}</a>`;
      }
      // Chemin reseau
      if (line.startsWith('\\\\')) {
        return `<span class="badge bg-secondary me-1 mb-1"><i class="bi bi-folder"></i> ${escapeHTML(this.truncate(line, 40))}</span>`;
      }
      // Email
      if (line.includes('@')) {
        return `<a href="mailto:${escapeHTML(line)}" class="badge bg-success text-decoration-none me-1 mb-1"><i class="bi bi-envelope"></i> ${escapeHTML(line)}</a>`;
      }
      // Reference GLPI ou autre
      if (line.match(/^[A-Z]+-\d+/)) {
        return `<span class="badge bg-warning text-dark me-1 mb-1"><i class="bi bi-tag"></i> ${escapeHTML(line)}</span>`;
      }
      // Autre
      return `<span class="badge bg-light text-dark me-1 mb-1">${escapeHTML(this.truncate(line, 50))}</span>`;
    }).join('');
  }

  /**
   * Tronque une chaine
   */
  truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
  }
}
