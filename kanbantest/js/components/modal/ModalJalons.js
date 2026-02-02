/**
 * ModalJalons - Gestion des jalons dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 2)
 * Charge via <script> avant SharedTaskModal.js
 */
class ModalJalons {
  constructor(modal) {
    this.modal = modal;
    this.jalons = [];
  }

  /**
   * Initialise la section jalons (listeners)
   */
  init() {
    const btnAdd = document.getElementById('stm-btn-add-jalon');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.add());
    }
    this.render();
  }

  /**
   * Ajoute un nouveau jalon depuis les champs inline
   */
  add() {
    const titreInput = document.getElementById('stm-jalon-titre');
    const dateInput = document.getElementById('stm-jalon-date');

    if (!titreInput) return;

    const titre = titreInput.value.trim();
    if (!titre) {
      titreInput.classList.add('is-invalid');
      titreInput.focus();
      return;
    }

    // Formater la date si presente
    let dateFormatted = '';
    if (dateInput && dateInput.value) {
      const date = new Date(dateInput.value);
      dateFormatted = date.toLocaleDateString('fr-FR');
    }

    this.jalons.push({
      id: Date.now(),
      titre: titre,
      date: dateFormatted,
      statut: 'pending'
    });

    // Reinitialiser les champs
    titreInput.value = '';
    titreInput.classList.remove('is-invalid');
    if (dateInput) dateInput.value = '';

    this.render();
  }

  /**
   * Affiche les jalons dans le DOM
   */
  render() {
    const container = document.getElementById('stm-jalons-timeline');
    const emptyDiv = document.getElementById('stm-jalons-empty');
    const countBadge = document.getElementById('stm-jalons-count');

    if (!container) return;

    if (this.jalons.length === 0) {
      if (emptyDiv) emptyDiv.style.display = 'block';
      if (countBadge) countBadge.textContent = '0';
      container.querySelectorAll('.jalon-item').forEach(el => el.remove());
      return;
    }

    if (emptyDiv) emptyDiv.style.display = 'none';
    if (countBadge) countBadge.textContent = this.jalons.length;

    // Supprimer les anciens jalons
    container.querySelectorAll('.jalon-item').forEach(el => el.remove());

    // Ajouter les jalons
    this.jalons.forEach((jalon, idx) => {
      const div = document.createElement('div');
      div.className = 'jalon-item d-flex align-items-center gap-2 py-2 border-bottom';
      div.innerHTML = `
        <input type="checkbox" class="form-check-input" ${jalon.statut === 'done' ? 'checked' : ''} data-idx="${idx}">
        <span class="flex-grow-1 ${jalon.statut === 'done' ? 'text-decoration-line-through text-muted' : ''}">${jalon.titre}</span>
        <small class="text-muted">${jalon.date || '-'}</small>
        <button type="button" class="btn btn-sm btn-outline-danger" data-idx="${idx}">
          <i class="bi bi-trash"></i>
        </button>
      `;
      container.appendChild(div);

      // Listeners
      div.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        this.jalons[idx].statut = e.target.checked ? 'done' : 'pending';
        this.render();
      });
      div.querySelector('button').addEventListener('click', () => {
        this.jalons.splice(idx, 1);
        this.render();
      });
    });
  }

  /**
   * Charge des donnees de jalons (depuis populateForm)
   * @param {string|Array} jalonsData - JSON string ou tableau de jalons
   */
  setData(jalonsData) {
    let data = jalonsData;
    if (typeof data === 'string' && data.trim()) {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.warn('[ModalJalons] Erreur parsing jalons:', e);
        data = [];
      }
    }
    this.jalons = Array.isArray(data) ? [...data] : [];
    this.render();
  }

  /**
   * Vide les jalons
   */
  clear() {
    this.jalons = [];
    this.render();
  }

  /**
   * Retourne les donnees des jalons (pour getFormData)
   * @returns {Array} Liste des jalons
   */
  getData() {
    return this.jalons;
  }
}
