// === JalonManager.js ===
// Gestionnaire des jalons et étapes temporelles dans les tâches

import { setFieldValue, getFieldValue } from '../utils/dom.js';

export class JalonManager {
  constructor(kanban) {
    this.kanban = kanban;
    this.jalons = [];
    this.currentEditingId = null;
    this.currentTaskId = null; // AJOUT: ID de la tâche en cours d'édition
    this.jalonModal = null;
    
    this.init();
  }

  init() {
    console.log('🗓️ Initialisation JalonManager...');
    
    // Initialiser la modale Bootstrap
    this.jalonModal = new bootstrap.Modal(document.getElementById('jalonModal'));
    
    this.setupEventListeners();
  }

  /**
   * Définit l'ID de la tâche en cours d'édition
   */
  setCurrentTaskId(taskId) {
    this.currentTaskId = taskId;
  }

  /**
   * Récupère l'ID de la tâche en cours d'édition
   */
  getCurrentTaskId() {
    return this.currentTaskId;
  }

  setupEventListeners() {
    // Bouton ajouter un jalon
    const btnAddJalon = document.getElementById('btn-add-jalon');
    if (btnAddJalon) {
      btnAddJalon.addEventListener('click', () => {
        this.openJalonModal();
      });
    }

    // Sélection du type de jalon
    const typeCards = document.querySelectorAll('.jalon-type-card');
    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        this.selectJalonType(card.dataset.type);
      });
    });

    // Bouton sauvegarder
    const btnSaveJalon = document.getElementById('btn-save-jalon');
    if (btnSaveJalon) {
      btnSaveJalon.addEventListener('click', () => {
        this.saveJalon();
      });
    }

    // Reset form à la fermeture de la modale
    document.getElementById('jalonModal').addEventListener('hidden.bs.modal', () => {
      this.resetJalonForm();
    });
  }

  /**
   * Ouvre la modale pour créer un nouveau jalon ou éditer existant
   * @param {object} jalon - Jalon à éditer (null pour nouveau)
   */
  openJalonModal(jalon = null) {
    const modalTitle = document.getElementById('jalon-modal-title');
    
    if (jalon) {
      // Mode édition
      modalTitle.textContent = 'Modifier le jalon';
      this.currentEditingId = jalon.id;
      this.populateJalonForm(jalon);
    } else {
      // Mode création
      modalTitle.textContent = 'Ajouter un jalon';
      this.currentEditingId = null;
      this.resetJalonForm();
    }

    this.jalonModal.show();
  }

  /**
   * Sélectionne un type de jalon et affiche les champs correspondants
   */
  selectJalonType(type) {
    // Désélectionner toutes les cartes
    document.querySelectorAll('.jalon-type-card').forEach(card => {
      card.classList.remove('selected');
    });

    // Sélectionner la carte cliquée
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');

    // Masquer tous les champs conditionnels
    document.querySelectorAll('.jalon-conditional-fields').forEach(fields => {
      fields.classList.remove('visible');
    });

    // Afficher les champs correspondants au type
    const targetFields = document.getElementById(`fields-${type}`);
    if (targetFields) {
      targetFields.classList.add('visible');
    }

    // Stocker le type sélectionné
    this.selectedType = type;
  }

  /**
   * Sauvegarde le jalon (création ou modification)
   */
  async saveJalon() {
    const jalonData = this.collectJalonFormData();
    
    if (!this.validateJalonData(jalonData)) {
      return;
    }

    const isEdit = !!this.currentEditingId;
    const taskId = this.getCurrentTaskId();

    if (isEdit) {
      // Mode édition
      this.updateJalon(this.currentEditingId, jalonData);
      
      // Ajouter à l'historique
      if (taskId && this.kanban.userActionManager) {
        await this.kanban.userActionManager.addHistoryEntry(
          taskId,
          'jalon_modifie',
          `Jalon modifié: ${jalonData.titre}`,
          '', // oldValue
          JSON.stringify(jalonData), // newValue
          ''
        );
      }
    } else {
      // Mode création
      this.addJalon(jalonData);
      
      // Ajouter à l'historique
      if (taskId && this.kanban.userActionManager) {
        await this.kanban.userActionManager.addHistoryEntry(
          taskId,
          'jalon_ajoute',
          `Nouveau jalon ajouté: ${jalonData.titre}`,
          '', // oldValue
          JSON.stringify(jalonData), // newValue
          ''
        );
      }
    }

    this.jalonModal.hide();
    this.updateJalonsDisplay();
    this.saveJalonsToForm();
  }

  /**
   * Collecte les données du formulaire de jalon
   */
  collectJalonFormData() {
    const data = {
      id: this.currentEditingId || this.generateJalonId(),
      type: this.selectedType || 'reunion',
      titre: document.getElementById('jalon-titre').value.trim(),
      date: document.getElementById('jalon-date').value,
      commentaire: document.getElementById('jalon-commentaire').value.trim(),
      statut: document.getElementById('jalon-statut').value,
      created_at: new Date().toISOString()
    };

    // Ajouter les champs spécifiques selon le type
    switch (data.type) {
      case 'reunion':
        data.participants = this.parseParticipants(document.getElementById('jalon-participants').value);
        data.lieu = document.getElementById('jalon-lieu').value.trim();
        break;
        
      case 'echeance':
        data.criticite = document.getElementById('jalon-criticite').value;
        data.consequences = document.getElementById('jalon-consequences').value.trim();
        break;
        
      case 'validation':
        data.valideurs = this.parseParticipants(document.getElementById('jalon-valideurs').value);
        data.criteres = document.getElementById('jalon-criteres').value.trim();
        break;
        
      case 'livrable':
        data.format = document.getElementById('jalon-format').value.trim();
        data.destinataire = document.getElementById('jalon-destinataire').value.trim();
        break;
    }

    return data;
  }

  /**
   * Valide les données du jalon
   */
  validateJalonData(data) {
    if (!data.titre) {
      this.showValidationError('Le titre du jalon est obligatoire');
      return false;
    }

    if (!data.date) {
      this.showValidationError('La date du jalon est obligatoire');
      return false;
    }

    if (!this.selectedType) {
      this.showValidationError('Veuillez sélectionner un type de jalon');
      return false;
    }

    return true;
  }

  /**
   * Ajoute un nouveau jalon
   */
  addJalon(jalonData) {
    this.jalons.push(jalonData);
    console.log('➕ Jalon ajouté:', jalonData);
  }

  /**
   * Met à jour un jalon existant
   */
  updateJalon(id, jalonData) {
    const index = this.jalons.findIndex(j => j.id === id);
    if (index !== -1) {
      this.jalons[index] = { ...this.jalons[index], ...jalonData };
      console.log('✏️ Jalon mis à jour:', jalonData);
    }
  }

  /**
   * Supprime un jalon
   */
  async deleteJalon(id) {
    const index = this.jalons.findIndex(j => j.id === id);
    if (index !== -1) {
      const jalonData = this.jalons[index];
      const taskId = this.getCurrentTaskId();
      
      this.jalons.splice(index, 1);
      this.updateJalonsDisplay();
      this.saveJalonsToForm();
      
      // Ajouter à l'historique
      if (taskId && this.kanban.userActionManager) {
        await this.kanban.userActionManager.addHistoryEntry(
          taskId,
          'jalon_supprime',
          `Jalon supprimé: ${jalonData.titre}`,
          JSON.stringify(jalonData), // oldValue
          '', // newValue
          ''
        );
      }
      
      console.log('🗑️ Jalon supprimé:', id);
    }
  }

  /**
   * Met à jour l'affichage des jalons dans la timeline
   */
  updateJalonsDisplay() {
    const timeline = document.getElementById('jalons-timeline');
    const emptyState = document.getElementById('jalons-empty');
    const countBadge = document.getElementById('jalons-count');

    // Vérifier que les éléments existent
    if (!timeline || !countBadge) {
      console.warn('JalonManager: Éléments DOM jalons non trouvés');
      return;
    }

    // Mettre à jour le compteur
    countBadge.textContent = this.jalons.length;

    if (this.jalons.length === 0) {
      // Afficher l'état vide si l'élément existe
      if (emptyState) {
        emptyState.style.display = 'block';
      }
      return;
    }

    // Masquer l'état vide si l'élément existe
    if (emptyState) {
      emptyState.style.display = 'none';
    }

    // Trier les jalons par date
    const sortedJalons = [...this.jalons].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Générer le HTML des jalons
    timeline.innerHTML = sortedJalons.map(jalon => this.renderJalonItem(jalon)).join('');

    // Ajouter les événements
    this.bindJalonEvents();
  }

  /**
   * Génère le HTML d'un jalon
   */
  renderJalonItem(jalon) {
    const date = new Date(jalon.date);
    const now = new Date();
    const isOverdue = date < now && jalon.statut !== 'termine';
    const isCompleted = jalon.statut === 'termine';

    const statusClass = isCompleted ? 'jalon-completed' : (isOverdue ? 'jalon-overdue' : '');
    const typeClass = `jalon-type-${jalon.type}`;

    return `
      <div class="jalon-item ${statusClass}" data-jalon-id="${jalon.id}">
        <div class="jalon-header">
          <div class="d-flex align-items-center flex-grow-1">
            <span class="jalon-type-badge ${typeClass}">
              ${this.getJalonTypeIcon(jalon.type)} ${this.getJalonTypeLabel(jalon.type)}
            </span>
            <span class="jalon-title">${jalon.titre}</span>
          </div>
          <span class="jalon-date">${this.formatJalonDate(date)}</span>
        </div>
        
        <div class="jalon-content">
          ${jalon.commentaire ? `<div class="jalon-comment">${jalon.commentaire}</div>` : ''}
          
          ${this.renderJalonSpecificContent(jalon)}
          
          <div class="jalon-actions">
            <select class="jalon-status-select" data-jalon-id="${jalon.id}">
              <option value="planifie" ${jalon.statut === 'planifie' ? 'selected' : ''}>📋 Planifié</option>
              <option value="en_preparation" ${jalon.statut === 'en_preparation' ? 'selected' : ''}>🔄 En préparation</option>
              <option value="en_cours" ${jalon.statut === 'en_cours' ? 'selected' : ''}>⚡ En cours</option>
              <option value="termine" ${jalon.statut === 'termine' ? 'selected' : ''}>✅ Terminé</option>
              <option value="reporte" ${jalon.statut === 'reporte' ? 'selected' : ''}>📅 Reporté</option>
              <option value="annule" ${jalon.statut === 'annule' ? 'selected' : ''}>❌ Annulé</option>
            </select>
            
            <button class="btn btn-sm btn-outline-primary btn-edit-jalon" data-jalon-id="${jalon.id}" title="Modifier">
              <i class="bi bi-pencil"></i>
            </button>
            
            <button class="btn btn-sm btn-outline-danger btn-delete-jalon" data-jalon-id="${jalon.id}" title="Supprimer">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Génère le contenu spécifique selon le type de jalon
   */
  renderJalonSpecificContent(jalon) {
    switch (jalon.type) {
      case 'reunion':
        let content = '';
        if (jalon.participants && jalon.participants.length > 0) {
          content += '<div class="jalon-participants">';
          content += jalon.participants.map(p => `<span class="participant-badge">${p}</span>`).join('');
          content += '</div>';
        }
        if (jalon.lieu) {
          content += `<small class="text-muted"><i class="bi bi-geo-alt me-1"></i>${jalon.lieu}</small>`;
        }
        return content;

      case 'echeance':
        let echContent = '';
        if (jalon.criticite && jalon.criticite !== 'normale') {
          echContent += `<span class="badge bg-warning">Criticité: ${jalon.criticite}</span> `;
        }
        if (jalon.consequences) {
          echContent += `<small class="text-muted"><i class="bi bi-exclamation-triangle me-1"></i>${jalon.consequences}</small>`;
        }
        return echContent;

      case 'validation':
        let valContent = '';
        if (jalon.valideurs && jalon.valideurs.length > 0) {
          valContent += '<div class="jalon-participants">';
          valContent += jalon.valideurs.map(v => `<span class="participant-badge">${v}</span>`).join('');
          valContent += '</div>';
        }
        if (jalon.criteres) {
          valContent += `<small class="text-muted"><i class="bi bi-check-square me-1"></i>${jalon.criteres}</small>`;
        }
        return valContent;

      case 'livrable':
        let livContent = '';
        if (jalon.format) {
          livContent += `<span class="badge bg-info">${jalon.format}</span> `;
        }
        if (jalon.destinataire) {
          livContent += `<small class="text-muted"><i class="bi bi-arrow-right me-1"></i>${jalon.destinataire}</small>`;
        }
        return livContent;

      default:
        return '';
    }
  }

  /**
   * Lie les événements aux éléments des jalons
   */
  bindJalonEvents() {
    // Changement de statut
    document.querySelectorAll('.jalon-status-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const jalonId = e.target.dataset.jalonId;
        this.updateJalonStatus(jalonId, e.target.value);
      });
    });

    // Boutons d'édition
    document.querySelectorAll('.btn-edit-jalon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jalonId = e.target.closest('[data-jalon-id]').dataset.jalonId;
        const jalon = this.jalons.find(j => j.id === jalonId);
        if (jalon) {
          this.openJalonModal(jalon);
        }
      });
    });

    // Boutons de suppression
    document.querySelectorAll('.btn-delete-jalon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jalonId = e.target.closest('[data-jalon-id]').dataset.jalonId;
        if (confirm('Êtes-vous sûr de vouloir supprimer ce jalon ?')) {
          this.deleteJalon(jalonId);
        }
      });
    });
  }

  /**
   * Met à jour le statut d'un jalon
   */
  updateJalonStatus(jalonId, newStatus) {
    const jalon = this.jalons.find(j => j.id === jalonId);
    if (jalon) {
      jalon.statut = newStatus;
      this.updateJalonsDisplay();
      this.saveJalonsToForm();
      console.log(`📊 Statut jalon ${jalonId} mis à jour: ${newStatus}`);
    }
  }

  /**
   * Peuple le formulaire avec les données d'un jalon existant
   */
  populateJalonForm(jalon) {
    document.getElementById('jalon-titre').value = jalon.titre || '';
    document.getElementById('jalon-date').value = jalon.date || '';
    document.getElementById('jalon-commentaire').value = jalon.commentaire || '';
    document.getElementById('jalon-statut').value = jalon.statut || 'planifie';

    // Sélectionner le type
    this.selectJalonType(jalon.type);

    // Peupler les champs spécifiques
    switch (jalon.type) {
      case 'reunion':
        document.getElementById('jalon-participants').value = jalon.participants ? jalon.participants.join(', ') : '';
        document.getElementById('jalon-lieu').value = jalon.lieu || '';
        break;
        
      case 'echeance':
        document.getElementById('jalon-criticite').value = jalon.criticite || 'normale';
        document.getElementById('jalon-consequences').value = jalon.consequences || '';
        break;
        
      case 'validation':
        document.getElementById('jalon-valideurs').value = jalon.valideurs ? jalon.valideurs.join(', ') : '';
        document.getElementById('jalon-criteres').value = jalon.criteres || '';
        break;
        
      case 'livrable':
        document.getElementById('jalon-format').value = jalon.format || '';
        document.getElementById('jalon-destinataire').value = jalon.destinataire || '';
        break;
    }
  }

  /**
   * Remet à zéro le formulaire de jalon
   */
  resetJalonForm() {
    document.getElementById('jalon-titre').value = '';
    document.getElementById('jalon-date').value = '';
    document.getElementById('jalon-commentaire').value = '';
    document.getElementById('jalon-statut').value = 'planifie';

    // Réinitialiser les champs spécifiques
    document.getElementById('jalon-participants').value = '';
    document.getElementById('jalon-lieu').value = '';
    document.getElementById('jalon-criticite').value = 'normale';
    document.getElementById('jalon-consequences').value = '';
    document.getElementById('jalon-valideurs').value = '';
    document.getElementById('jalon-criteres').value = '';
    document.getElementById('jalon-format').value = '';
    document.getElementById('jalon-destinataire').value = '';

    // Désélectionner les types
    document.querySelectorAll('.jalon-type-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    document.querySelectorAll('.jalon-conditional-fields').forEach(fields => {
      fields.classList.remove('visible');
    });

    this.selectedType = null;
  }

  /**
   * Charge les jalons depuis les données de la tâche
   */
  loadJalonsFromTask(taskData) {
    try {
      if (taskData.jalons) {
        if (typeof taskData.jalons === 'string') {
          this.jalons = JSON.parse(taskData.jalons);
        } else if (Array.isArray(taskData.jalons)) {
          this.jalons = taskData.jalons;
        } else {
          this.jalons = [];
        }
      } else {
        this.jalons = [];
      }
      
      this.updateJalonsDisplay();
      console.log(`📋 ${this.jalons.length} jalons chargés pour la tâche`);
      
    } catch (error) {
      console.error('Erreur lors du chargement des jalons:', error);
      this.jalons = [];
      this.updateJalonsDisplay();
    }
  }

  /**
   * Sauvegarde les jalons dans le champ caché du formulaire
   */
  saveJalonsToForm() {
    setFieldValue('popup-jalons', JSON.stringify(this.jalons));
  }

  /**
   * Récupère les jalons depuis le formulaire
   */
  getJalonsForSave() {
    return getFieldValue('popup-jalons') || '[]';
  }

  // === UTILITAIRES ===

  generateJalonId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
  }

  parseParticipants(value) {
    if (!value) return [];
    return value.split(',').map(p => p.trim()).filter(p => p);
  }

  getJalonTypeIcon(type) {
    const icons = {
      reunion: '📅',
      echeance: '⏰', 
      validation: '✅',
      livrable: '📦'
    };
    return icons[type] || '📋';
  }

  getJalonTypeLabel(type) {
    const labels = {
      reunion: 'Réunion',
      echeance: 'Échéance',
      validation: 'Validation', 
      livrable: 'Livrable'
    };
    return labels[type] || 'Jalon';
  }

  formatJalonDate(date) {
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateStr = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (diffDays === 0) {
      return `${dateStr} (Aujourd'hui)`;
    } else if (diffDays === 1) {
      return `${dateStr} (Demain)`;
    } else if (diffDays > 0 && diffDays <= 7) {
      return `${dateStr} (Dans ${diffDays} jours)`;
    } else if (diffDays < 0) {
      return `${dateStr} (Retard: ${Math.abs(diffDays)} jours)`;
    } else {
      return dateStr;
    }
  }

  showValidationError(message) {
    // Afficher une alerte ou un toast
    alert(message); // Temporaire, à remplacer par un système de toast
  }
}