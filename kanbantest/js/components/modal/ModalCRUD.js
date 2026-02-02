/**
 * ModalCRUD - Operations CRUD dans SharedTaskModal
 *
 * Sous-module extrait de SharedTaskModal.js (Phase 3)
 * Gere la sauvegarde, suppression, duplication et ajout de liaison
 */

export class ModalCRUD {
  constructor(modal) {
    this.modal = modal;
  }

  /**
   * Handler pour la sauvegarde
   */
  async handleSave() {
    const data = this.modal.formDataModule.getFormData();

    // Validation minimale
    if (!data.titre || !data.titre.trim()) {
      this.showError('Le titre est obligatoire');
      return;
    }

    try {
      if (this.modal.options.onSave) {
        await this.modal.options.onSave(data);
      } else if (this.modal.options.gristManager) {
        await this.modal.options.gristManager.saveRecord(data);
      }
      this.modal.close();
    } catch (error) {
      console.error('[SharedTaskModal] Save error:', error);
      this.showError('Erreur lors de la sauvegarde');
    }
  }

  /**
   * Handler pour la suppression
   */
  async handleDelete() {
    if (!this.modal.currentTask || !this.modal.currentTask.id) return;

    if (!confirm('Supprimer cette tâche ?')) return;

    try {
      if (this.modal.options.onDelete) {
        await this.modal.options.onDelete(this.modal.currentTask.id);
      } else if (this.modal.options.gristManager) {
        await this.modal.options.gristManager.deleteRecord(this.modal.currentTask.id);
      }
      this.modal.close();
    } catch (error) {
      console.error('[SharedTaskModal] Delete error:', error);
      this.showError('Erreur lors de la suppression');
    }
  }

  /**
   * Handler pour la duplication
   */
  async handleDuplicate() {
    if (!this.modal.currentTask) return;

    try {
      // Collecter les donnees actuelles du formulaire
      const taskData = this.modal.formDataModule.getFormData();

      // Modifier pour la duplication
      taskData.titre = `Copie de ${taskData.titre}`;
      taskData.statut = 'Backlog'; // Remettre en backlog
      delete taskData.id; // Supprimer l'ID pour creer une nouvelle tache

      // Creer la nouvelle tache
      if (this.modal.options.onSave) {
        await this.modal.options.onSave(taskData, true); // true = isNew
      } else if (this.modal.options.gristManager) {
        await this.modal.options.gristManager.createRecord(taskData);
      }

      this.modal.close();
      console.log('[SharedTaskModal] Task duplicated successfully');
    } catch (error) {
      console.error('[SharedTaskModal] Duplicate error:', error);
      this.showError('Erreur lors de la duplication');
    }
  }

  /**
   * Handler pour l'ajout de liaison
   */
  handleAddLink() {
    // A implementer selon les besoins
    console.log('[SharedTaskModal] Add link clicked');
    // Emettre un evenement ou appeler un callback
    if (this.modal.options.onAddLink) {
      this.modal.options.onAddLink(this.modal.currentTask);
    }
  }

  /**
   * Affiche un message d'erreur
   */
  showError(message) {
    // Afficher une alerte simple ou un toast
    alert(message);
  }
}
