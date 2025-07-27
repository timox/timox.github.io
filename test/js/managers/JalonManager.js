// === JalonManager.js ===
// Gestionnaire des jalons et étapes temporelles dans les tâches

import { setFieldValue, getFieldValue } from '../utils/dom.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

export class JalonManager {
  constructor(kanban) {
    this.kanban = kanban;
    this.jalons = []; // Jalons de la tâche actuellement ouverte
    // ❌ CACHE SUPPRIMÉ - Approche stateless pour éviter la propagation entre tâches
    // this.jalonsCache = new Map();
    this.currentEditingId = null;
    this.currentTaskId = null; // ID de la tâche en cours d'édition
    this.jalonModal = null;
    
    this.init();
  }

  init() {
    this.logger = createModuleLogger('JalonManager');
    this.logger.debug('Initialisation JalonManager...');
    
    // Initialiser la modale Bootstrap
    this.jalonModal = new bootstrap.Modal(document.getElementById('jalonModal'));
    
    this.setupEventListeners();
  }

  /**
   * Définit l'ID de la tâche en cours d'édition
   */
  setCurrentTaskId(taskId) {
    // Si on change de tâche, réinitialiser complètement (approche stateless)
    if (this.currentTaskId !== taskId) {
      this.logger.debug(`Changement de tâche ${this.currentTaskId} → ${taskId}`);
      
      // ❌ CACHE SUPPRIMÉ - Approche stateless, reset complet à chaque tâche
      // Réinitialiser complètement les jalons (ils seront rechargés depuis la DB)
      this.jalons = [];
      this.logger.debug(`Jalons réinitialisés pour la tâche ${taskId}`);
      
      this.updateJalonsDisplay();
    }
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

    // Délégation d'événements pour les boutons de suppression et d'édition (éléments dynamiques)
    document.addEventListener('click', (e) => {
      // Gestion des boutons de suppression
      if (e.target.closest('.btn-delete-jalon')) {
        e.preventDefault();
        e.stopPropagation();
        
        const btn = e.target.closest('.btn-delete-jalon');
        const jalonId = btn.dataset.jalonId;
        
        if (!jalonId) {
          this.logger.error('ID de jalon manquant pour la suppression');
          return;
        }
        
        this.logger.debug('Suppression du jalon ID:', jalonId);
        
        if (confirm('Êtes-vous sûr de vouloir supprimer ce jalon ?')) {
          try {
            this.deleteJalon(jalonId);
          } catch (error) {
            this.logger.error('Erreur lors de la suppression du jalon:', error);
          }
        }
      }
      
      // Gestion des boutons d'édition
      if (e.target.closest('.btn-edit-jalon')) {
        e.preventDefault();
        e.stopPropagation();
        
        const btn = e.target.closest('.btn-edit-jalon');
        
        try {
          // Rechercher l'ID de jalon de manière plus robuste
          let jalonId;
          
          // Méthode 1: depuis le bouton lui-même
          if (btn.dataset.jalonId) {
            jalonId = btn.dataset.jalonId;
          }
          // Méthode 2: depuis le parent avec data-jalon-id
          else {
            const jalonElement = btn.closest('[data-jalon-id]');
            if (jalonElement) {
              jalonId = jalonElement.dataset.jalonId;
            }
          }
          
          if (!jalonId) {
            this.logger.error('Impossible de trouver l\'ID du jalon à éditer');
            return;
          }
          
          this.logger.debug('Édition du jalon ID:', jalonId);
          
          const jalon = this.jalons.find(j => j.id === jalonId);
          if (jalon) {
            this.openJalonModal(jalon);
          } else {
            this.logger.error('Jalon non trouvé pour édition. ID:', jalonId);
          }
        } catch (error) {
          this.logger.error('Erreur lors de l\'édition du jalon:', error);
        }
      }
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
      const oldJalon = this.jalons.find(j => j.id === this.currentEditingId);
      this.updateJalon(this.currentEditingId, jalonData);
      
      // Ajouter à l'historique avec détails
      if (taskId && this.kanban.userActionManager) {
        const details = this.getJalonModificationDetails(oldJalon, jalonData);
        await this.kanban.userActionManager.addHistoryEntry(
          taskId,
          'jalon_modifie',
          `Jalon modifié: ${jalonData.titre} (${jalonData.date}) - ${details}`,
          JSON.stringify(oldJalon), // oldValue
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
          `Nouveau jalon ajouté: ${jalonData.titre} (${jalonData.date}) - Type: ${this.getJalonTypeLabel(jalonData.type)}`,
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
    // Vérifier que les éléments existent
    const titreElement = document.getElementById('jalon-titre');
    const dateElement = document.getElementById('jalon-date');
    const commentaireElement = document.getElementById('jalon-commentaire');
    const statutElement = document.getElementById('jalon-statut');
    
    if (!titreElement || !dateElement || !commentaireElement || !statutElement) {
      this.logger.error('Éléments de formulaire jalon manquants:', {
        titre: !!titreElement,
        date: !!dateElement,
        commentaire: !!commentaireElement,
        statut: !!statutElement
      });
    }
    
    const data = {
      id: this.currentEditingId || this.generateJalonId(),
      type: this.selectedType || 'reunion',
      titre: titreElement ? titreElement.value.trim() : '',
      date: dateElement ? dateElement.value : '',
      commentaire: commentaireElement ? commentaireElement.value.trim() : '',
      statut: statutElement ? statutElement.value : 'planifie',
      created_at: new Date().toISOString()
    };
    
    this.logger.debug('Données jalon collectées:', data);

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
    // Vérifier qu'on n'ajoute pas un doublon basé sur l'ID
    const existingIndex = this.jalons.findIndex(j => j.id === jalonData.id);
    if (existingIndex !== -1) {
      this.logger.warn('Jalon avec même ID déjà existant, mise à jour:', jalonData.id);
      this.jalons[existingIndex] = jalonData;
    } else {
      this.jalons.push(jalonData);
      this.logger.debug('Jalon ajouté:', jalonData.titre, `(Total: ${this.jalons.length})`);
    }
    
    // ❌ CACHE SUPPRIMÉ - Approche stateless: pas de cache, les jalons restent en mémoire uniquement pour la session
    
    // Immédiatement synchroniser avec le formulaire
    this.saveJalonsToForm();
  }

  /**
   * Met à jour un jalon existant
   */
  updateJalon(id, jalonData) {
    const index = this.jalons.findIndex(j => j.id === id);
    if (index !== -1) {
      this.jalons[index] = { ...this.jalons[index], ...jalonData };
      this.logger.debug('Jalon mis à jour:', jalonData.titre);
      
      // ❌ CACHE SUPPRIMÉ - Approche stateless: pas de mise à jour de cache
    }
  }

  /**
   * Supprime un jalon
   */
  async deleteJalon(id) {
    if (!id) {
      this.logger.error('ID de jalon manquant pour la suppression');
      return;
    }
    
    console.log('🗑️ Debug: Suppression jalon ID:', id, typeof id);
    console.log('🗑️ Debug: Jalons actuels:', this.jalons.map(j => ({ id: j.id, titre: j.titre, idType: typeof j.id })));
    console.log('🗑️ Debug: CurrentTaskId:', this.currentTaskId);
    
    this.logger.debug('Tentative suppression jalon ID:', id);
    this.logger.debug('Jalons actuels:', this.jalons.map(j => ({ id: j.id, titre: j.titre })));
    this.logger.debug('CurrentTaskId:', this.currentTaskId);
    
    const index = this.jalons.findIndex(j => j.id === id);
    
    if (index !== -1) {
      const jalonData = this.jalons[index];
      const taskId = this.getCurrentTaskId();
      
      this.logger.debug('Suppression du jalon:', jalonData.titre);
      
      try {
        // Supprimer du tableau
        this.jalons.splice(index, 1);
        
        // ❌ CACHE SUPPRIMÉ - Approche stateless: pas de mise à jour de cache
        
        // Mettre à jour l'affichage
        this.updateJalonsDisplay();
        this.saveJalonsToForm();
        
        // Ajouter à l'historique
        if (taskId && this.kanban.userActionManager) {
          await this.kanban.userActionManager.addHistoryEntry(
            taskId,
            'jalon_supprime',
            `Jalon supprimé: ${jalonData.titre} (${jalonData.date}) - Type: ${this.getJalonTypeLabel(jalonData.type)}`,
            JSON.stringify(jalonData), // oldValue
            '', // newValue
            ''
          );
        }
        
        this.logger.debug('Jalon supprimé avec succès:', id);
        
      } catch (error) {
        this.logger.error('Erreur lors de la suppression du jalon:', error);
        throw error;
      }
    } else {
      this.logger.warn('Jalon non trouvé pour suppression. ID:', id);
      this.logger.debug('IDs disponibles:', this.jalons.map(j => j.id));
      this.logger.debug('Types des IDs:', this.jalons.map(j => typeof j.id));
      this.logger.debug('ID recherché type:', typeof id);
      
      // Essayer de trouver avec conversion de type
      const altIndex = this.jalons.findIndex(j => String(j.id) === String(id));
      if (altIndex !== -1) {
        this.logger.warn('Jalon trouvé avec conversion de type, suppression...');
        const jalonData = this.jalons[altIndex];
        this.jalons.splice(altIndex, 1);
        this.updateJalonsDisplay();
        this.saveJalonsToForm();
        this.logger.debug('✅ Jalon supprimé avec conversion de type');
        return;
      }
      
      // Debug exhaustif si toujours pas trouvé
      this.logger.error('Échec suppression jalon, debug complet:');
      this.logger.error('ID recherché:', id, typeof id);
      this.logger.error('Jalons disponibles:');
      this.jalons.forEach((j, index) => {
        this.logger.error(`  [${index}] ID: "${j.id}" (${typeof j.id}) - Titre: "${j.titre}"`);
        this.logger.error(`      String match: ${String(j.id) === String(id)}`);
        this.logger.error(`      == match: ${j.id == id}`);
        this.logger.error(`      === match: ${j.id === id}`);
      });
      this.logger.error('CurrentTaskId:', this.currentTaskId);
      this.logger.error('Nombre total jalons:', this.jalons.length);
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
      this.logger.warn('Éléments DOM jalons non trouvés');
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

    // Les boutons d'édition et de suppression sont gérés par délégation dans setupEventListeners()
  }

  /**
   * Met à jour le statut d'un jalon
   */
  updateJalonStatus(jalonId, newStatus) {
    const jalon = this.jalons.find(j => j.id === jalonId);
    if (jalon) {
      jalon.statut = newStatus;
      
      // ❌ CACHE SUPPRIMÉ - Approche stateless: pas de mise à jour de cache
      
      this.updateJalonsDisplay();
      this.saveJalonsToForm();
      this.logger.debug(`Statut jalon ${jalonId} mis à jour: ${newStatus}`);
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
  }

  /**
   * Vide les jalons pour une nouvelle tâche
   */
  clearJalonsForNewTask() {
    this.logger.debug('Clearing jalons for new task');
    this.jalons = [];
    this.currentTaskId = null;
    this.updateJalonsDisplay();

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
      // Extraire l'ID de la tâche
      const taskId = taskData?.id || taskData?.id_task;
      
      // Si pas de taskData ou pas d'ID, réinitialiser
      if (!taskData || !taskId) {
        this.logger.debug('loadJalonsFromTask: Pas de taskData ou d\'ID, réinitialisation');
        this.setCurrentTaskId(null);
        this.jalons = [];
        this.updateJalonsDisplay();
        this.saveJalonsToForm();
        return;
      }
      
      // Définir la tâche courante (ceci gère automatiquement le cache)
      this.setCurrentTaskId(taskId);
      
      // ❌ CACHE SUPPRIMÉ - Approche stateless: toujours recharger depuis la DB
      
      // Sinon, charger depuis les données de la tâche
      if (taskData.jalons) {
        let jalonsFromDB = [];
        
        if (typeof taskData.jalons === 'string') {
          const jalonsData = JSON.parse(taskData.jalons);
          // Nouveau format avec {jalons: [...]}
          if (jalonsData && jalonsData.jalons && Array.isArray(jalonsData.jalons)) {
            jalonsFromDB = [...jalonsData.jalons]; // Clone pour éviter les références
          }
          // Ancien format (array direct)
          else if (Array.isArray(jalonsData)) {
            jalonsFromDB = [...jalonsData]; // Clone pour éviter les références
          }
        } else if (Array.isArray(taskData.jalons)) {
          jalonsFromDB = [...taskData.jalons]; // Clone pour éviter les références
        }
        
        // Mettre à jour les jalons (sans cache)
        this.jalons = jalonsFromDB;
        
        this.logger.debug(`${jalonsFromDB.length} jalons chargés depuis la DB pour la tâche ${taskId}`);
      } else {
        // Pas de jalons dans la DB
        this.jalons = [];
        this.logger.debug(`Aucun jalon en DB pour la tâche ${taskId}`);
      }
      
      this.updateJalonsDisplay();
      this.saveJalonsToForm();
      
    } catch (error) {
      this.logger.error('Erreur lors du chargement des jalons:', error);
      this.jalons = [];
      this.updateJalonsDisplay();
      this.saveJalonsToForm();
    }
  }

  /**
   * Sauvegarde les jalons dans le champ caché du formulaire
   */
  saveJalonsToForm() {
    // Ne sauvegarder que si on a des jalons ou si c'est explicite
    if (this.jalons.length === 0) {
      // Éviter de sauvegarder un JSON vide inutile
      setFieldValue('popup-jalons', '');
      this.logger.debug('Aucun jalon à sauvegarder - champ vidé');
      return;
    }
    
    const jalonsData = {
      jalons: this.jalons,
      lastModified: new Date().toISOString() // Format ISO plus lisible
    };
    const jsonString = JSON.stringify(jalonsData);
    
    this.logger.debug(`Sauvegarde de ${this.jalons.length} jalons dans le formulaire`);
    
    setFieldValue('popup-jalons', jsonString);
    
  }

  /**
   * Récupère les jalons depuis le formulaire pour sauvegarde
   */
  getJalonsForSave() {
    // Si pas de jalons, retourner null pour éviter de polluer la DB
    if (!this.jalons || this.jalons.length === 0) {
      this.logger.debug('JalonManager.getJalonsForSave() - Aucun jalon à sauvegarder');
      return null;
    }
    
    // Utiliser directement les jalons en mémoire qui sont à jour
    const jalonsData = {
      jalons: this.jalons,
      lastModified: new Date().toISOString() // Format ISO plus lisible
    };
    
    this.logger.debug('JalonManager.getJalonsForSave() - Jalons actuels:', this.jalons.length);
    
    // Retourner la string JSON directement pour Grist
    return JSON.stringify(jalonsData);
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
      year: 'numeric'
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

  /**
   * Génère les détails des modifications d'un jalon
   */
  getJalonModificationDetails(oldJalon, newJalon) {
    if (!oldJalon) return 'Nouveau jalon';
    
    const changes = [];
    
    // Vérifier les changements principaux
    if (oldJalon.titre !== newJalon.titre) {
      changes.push(`Titre: "${oldJalon.titre}" → "${newJalon.titre}"`);
    }
    
    if (oldJalon.date !== newJalon.date) {
      const oldDate = new Date(oldJalon.date).toLocaleDateString('fr-FR');
      const newDate = new Date(newJalon.date).toLocaleDateString('fr-FR');
      changes.push(`Date: ${oldDate} → ${newDate}`);
    }
    
    if (oldJalon.type !== newJalon.type) {
      changes.push(`Type: ${this.getJalonTypeLabel(oldJalon.type)} → ${this.getJalonTypeLabel(newJalon.type)}`);
    }
    
    if (oldJalon.statut !== newJalon.statut) {
      changes.push(`Statut: ${oldJalon.statut} → ${newJalon.statut}`);
    }
    
    if (oldJalon.commentaire !== newJalon.commentaire) {
      changes.push('Commentaire modifié');
    }
    
    return changes.length > 0 ? changes.join(', ') : 'Modification mineure';
  }

}