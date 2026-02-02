/**
 * ModalTaskLinks - Gestion des liens entre taches dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 2)
 * Charge via <script> avant SharedTaskModal.js
 */
export class ModalTaskLinks {
  constructor(modal) {
    this.modal = modal;
    this.links = [];
    this.allTasks = [];
  }

  /**
   * Initialise la section des liens (listeners)
   */
  init() {
    const btnAdd = document.getElementById('stm-btn-add-link');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.add());
    }
  }

  /**
   * Charge toutes les taches pour le selecteur de liens
   */
  async loadAllTasks() {
    try {
      if (typeof grist === 'undefined') return;

      const data = await grist.docApi.fetchTable('Ssir_principale_task');
      this.allTasks = [];
      const count = data.id?.length || 0;

      for (let i = 0; i < count; i++) {
        this.allTasks.push({
          id: data.id[i],
          titre: data.titre?.[i] || `Tâche #${data.id[i]}`,
          statut: data.statut?.[i] || ''
        });
      }

      this.populateSelect();
    } catch (error) {
      console.warn('[ModalTaskLinks] Failed to load tasks for links:', error.message);
    }
  }

  /**
   * Peuple le selecteur de taches pour les liens
   */
  populateSelect() {
    const select = document.getElementById('stm-link-task');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner une tâche --</option>';

    // Exclure la tache courante
    const currentId = this.modal.currentTask?.id;

    this.allTasks
      .filter(t => t.id !== currentId)
      .forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = `#${task.id} - ${this.modal.truncate(task.titre, 50)}`;
        option.dataset.titre = task.titre;
        option.dataset.statut = task.statut;
        select.appendChild(option);
      });
  }

  /**
   * Ajoute un lien vers une autre tache
   */
  add() {
    const typeSelect = document.getElementById('stm-link-type');
    const taskSelect = document.getElementById('stm-link-task');

    if (!typeSelect || !taskSelect || !taskSelect.value) {
      return;
    }

    const taskId = parseInt(taskSelect.value);
    const type = typeSelect.value;
    const selectedOption = taskSelect.options[taskSelect.selectedIndex];

    // Verifier si le lien existe deja
    if (this.links.some(l => l.taskId === taskId && l.type === type)) {
      alert('Ce lien existe déjà');
      return;
    }

    this.links.push({
      taskId: taskId,
      type: type,
      titre: selectedOption.dataset.titre,
      statut: selectedOption.dataset.statut
    });

    this.render();
    taskSelect.value = '';
  }

  /**
   * Supprime un lien
   */
  remove(taskId, type) {
    this.links = this.links.filter(l => !(l.taskId === taskId && l.type === type));
    this.render();
  }

  /**
   * Affiche les liens groupes par type
   */
  render() {
    const container = document.getElementById('stm-liens-list');
    const countBadge = document.getElementById('stm-liens-count');
    const noLinks = document.getElementById('stm-no-links');

    if (!container) return;

    // Grouper par type
    const types = {
      bloque: { group: 'stm-links-bloque', items: [] },
      bloque_par: { group: 'stm-links-bloque-par', items: [] },
      lie: { group: 'stm-links-lie', items: [] },
      parent: { group: 'stm-links-parent', items: [] },
      enfant: { group: 'stm-links-enfant', items: [] }
    };

    this.links.forEach(link => {
      if (types[link.type]) {
        types[link.type].items.push(link);
      }
    });

    // Afficher/cacher les groupes
    for (const [type, data] of Object.entries(types)) {
      const groupEl = document.getElementById(data.group);
      const itemsEl = container.querySelector(`.task-link-items[data-type="${type}"]`);

      if (!groupEl || !itemsEl) continue;

      if (data.items.length === 0) {
        groupEl.style.display = 'none';
        itemsEl.innerHTML = '';
      } else {
        groupEl.style.display = 'block';
        itemsEl.innerHTML = data.items.map(link => `
          <div class="task-link-item d-flex align-items-center gap-2 py-1">
            <span class="badge bg-light text-dark">#${link.taskId}</span>
            <span class="flex-grow-1 small">${this.modal.truncate(link.titre, 40)}</span>
            <span class="badge ${ModalTaskLinks.getStatusBadgeClass(link.statut)} small">${link.statut || '-'}</span>
            <button type="button" class="btn btn-sm btn-link text-danger p-0"
              onclick="window._sharedTaskModalInstance?.taskLinksModule.remove(${link.taskId}, '${type}')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        `).join('');
      }
    }

    // Mettre a jour le compteur
    if (countBadge) countBadge.textContent = this.links.length;

    // Afficher/cacher le message "aucun lien"
    if (noLinks) {
      noLinks.style.display = this.links.length === 0 ? 'block' : 'none';
    }

    // Stocker dans le champ cache
    const hiddenField = document.getElementById('stm-liens-data');
    if (hiddenField) {
      hiddenField.value = JSON.stringify(this.links);
    }
  }

  /**
   * Retourne la classe CSS pour un badge de statut
   * @param {string} statut
   * @returns {string} Classe CSS
   */
  static getStatusBadgeClass(statut) {
    const classes = {
      'Backlog': 'bg-secondary',
      'À faire': 'bg-info',
      'En cours': 'bg-primary',
      'En attente': 'bg-warning text-dark',
      'Validation': 'bg-purple',
      'Terminé': 'bg-success'
    };
    return classes[statut] || 'bg-secondary';
  }

  /**
   * Charge des donnees de liens (depuis populateForm)
   * @param {string|Array} liensData - JSON string ou tableau de liens
   */
  setData(liensData) {
    let data = liensData;
    if (typeof data === 'string' && data.trim()) {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.warn('[ModalTaskLinks] Erreur parsing liens:', e);
        data = [];
      }
    }
    this.links = Array.isArray(data) ? [...data] : [];
    this.render();
  }

  /**
   * Vide les liens
   */
  clear() {
    this.links = [];
    this.render();
  }

  /**
   * Retourne les donnees des liens (pour getFormData)
   * @returns {Array} Liste des liens
   */
  getData() {
    return this.links;
  }
}
