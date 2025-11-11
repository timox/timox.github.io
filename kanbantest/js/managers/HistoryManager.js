// === managers/HistoryManager.js ===
// Gestionnaire pour l'historique des tâches et les commentaires

import { 
  generateTimestamp, 
  parseTimestamp, 
  calculateDurationMinutes, 
  formatDuration,
  formatDate 
} from '../utils/dates.js';

import { displayError, displaySuccess } from '../utils/dom.js';
import { TABLE_ID } from '../config/constants.js';
import { createModuleLogger } from '../utils/LoggerManager.js';
import { safeOn, cleanNamespace } from '../utils/EventManager.js';

/**
 * Gestionnaire pour l'historique des tâches et commentaires
 */
export class HistoryManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentTaskHistory = null;
    this.logger = createModuleLogger('HistoryManager');

    // Widget d'édition de commentaire (accordéon modale)
    this.activeModalFocusTrap = null;
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire d'historique
   */
  init() {
    // Événements maintenant gérés par EventCentralizer (jQuery)
    this.setupCommentEditWidget();
    this.setupModalCleanupListeners();
    this.logger.info('History manager initialized (événements centralisés via EventCentralizer)');
  }
  
  /**
   * Configure les listeners pour nettoyer automatiquement les backdrops
   */
  setupModalCleanupListeners() {
    // Écouter les événements Bootstrap 5 de fermeture de modales
    document.addEventListener('hidden.bs.modal', (event) => {
      this.logger.debug('Modale fermée détectée:', event.target.id);
      // Délai pour laisser Bootstrap 5 finir ses animations
      setTimeout(() => {
        this.cleanupOrphanBackdrops();
      }, 200);
    });
    
    // Nettoyage périodique des backdrops orphelins
    setInterval(() => {
      this.cleanupOrphanBackdrops();
    }, 5000); // Vérifier toutes les 5 secondes
  }
  
  // NOTE: setupEventListeners_DISABLED() supprimée - code mort jamais appelé.
  // Tous les événements sont maintenant gérés par EventCentralizer.js
  
  /**
   * Rendre l'historique d'une tâche dans un élément donné
   */
  async renderTaskHistoryInElement(taskId, targetElement) {
    try {
      targetElement.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm"></div></div>';
      
      const gristApi = this.getGristApi();
      const gristData = await gristApi.docApi.fetchTable(TABLE_ID);
      const mappedRecords = this.kanban.mapGristRecords(gristData);
      const task = mappedRecords.find(r => r.id === taskId);
      
      if (!task) {
        targetElement.innerHTML = '<p class="text-muted">Tâche introuvable.</p>';
        return;
      }
      
      // Réutiliser la logique existante
      const timelineContent = this.generateTimelineContent(task);
      targetElement.innerHTML = timelineContent;
      
    } catch (error) {
      this.logger.error('Erreur rendu historique:', error);
      targetElement.innerHTML = '<p class="text-danger">Erreur lors du chargement.</p>';
    }
  }
  
  /**
   * Ouvre l'historique d'une tâche
   * @param {number} taskId - ID de la tâche
   */
  openTaskHistory(taskId) {
    this.logger.info(`openTaskHistory appelé pour tâche ${taskId}`);
    
    // Vérification des éléments DOM
    if (!document.getElementById('task-history-modal-label')) {
      this.logger.error('Élément task-history-modal-label manquant');
      return;
    }
    
    // Protection: Éviter les appels multiples sur openTaskHistory (réduite)
    const now = Date.now();
    if (this._taskHistoryOpening === taskId && (this._lastHistoryOpen && now - this._lastHistoryOpen < 1000)) {
      this.logger.debug(`openTaskHistory déjà en cours pour tâche ${taskId}`);
      return;
    }
    
    const task = this.kanban.currentRecords?.find(r => r.id === taskId);
    this.logger.debug('Tâche trouvée:', !!task, task ? task.titre : 'N/A');
    if (!task) {
      this.logger.error('Tâche non trouvée pour ID:', taskId);
      displayError('Tâche non trouvée');
      return;
    }
    
    // Marquer cette tâche comme en cours d'ouverture et horodater
    this._taskHistoryOpening = taskId;
    this._lastHistoryOpen = now;
    setTimeout(() => { 
      this._taskHistoryOpening = null; 
      this.logger.debug(`protection openTaskHistory levée pour tâche ${taskId}`);
    }, 500);
    
    this.currentTaskHistory = task;
    
    // Vérifier si la modale d'édition est ouverte
    const taskModal = document.getElementById('popup-tache');
    const isTaskModalOpen = taskModal && taskModal.classList.contains('show');
    const currentTaskIdInModal = this.kanban.modalManager?.currentTaskId;
    
    if (isTaskModalOpen) {
      if (currentTaskIdInModal === taskId) {
        // Même tâche ouverte : utiliser l'accordéon dans la modale de détail
        this.logger.info('Même tâche ouverte - utilisation accordéon dans modale de détail');
        if (this.kanban.modalManager) {
          this.kanban.modalManager.loadCommentHistoryInAccordion();
          
          // Ouvrir l'accordéon automatiquement
          const accordion = document.getElementById('comment-history-accordion');
          if (accordion && !accordion.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(accordion, { show: true });
          }
        }
        return; // Ne pas ouvrir la modale séparée
      } else {
        // Tâche différente : fermer la modale d'édition d'abord
        this.logger.info('Tâche différente ouverte - fermeture modale d\'édition');
        if (this.kanban.modalManager?.taskModal) {
          this.kanban.modalManager.taskModal.hide();
          
          // Attendre que la modale soit fermée avant d'ouvrir l'historique
          setTimeout(() => {
            this.openHistoryModalSeparately(task, taskId);
          }, 300);
          return;
        }
      }
    }
    
    // Cas par défaut : ouvrir la modale historique séparée
    this.openHistoryModalSeparately(task, taskId);
  }
  
  /**
   * Ouvre la modale d'historique séparée
   * @param {object} task - Données de la tâche
   * @param {number} taskId - ID de la tâche
   */
  openHistoryModalSeparately(task, taskId) {
    this.logger.info('Ouverture modale historique séparée');
    this.logger.debug('DOM ready state:', document.readyState);
    this.logger.debug('Task:', task?.id, task?.titre);
    
    // CORRECTIF: Nettoyer les backdrops orphelins avant d'ouvrir
    this.cleanupOrphanBackdrops();
    
    // Mettre à jour le titre de la modale
    const modalTitle = document.getElementById('task-history-modal-label');
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        Historique de la tâche #${taskId} - ${task.titre}
      `;
    }
    
    // Rendre l'historique
    this.renderTaskHistory(task);
    
    // Ouvrir la modale
    this.logger.debug('Recherche élément task-history-modal dans le DOM...');
    const historyModalEl = document.getElementById('task-history-modal');
    
    // Debug complet des modales présentes
    const allModals = document.querySelectorAll('.modal');
    this.logger.debug('Modales trouvées dans le DOM:', Array.from(allModals).map(m => m.id));
    
    if (!historyModalEl) {
      this.logger.error('Élément task-history-modal introuvable dans le DOM');
      this.logger.error('DOM actuel:', document.body.innerHTML.length, 'caractères');
      return;
    }
    
    this.logger.debug('Élément task-history-modal trouvé:', historyModalEl);
    
    // Vérifier l'état de la modale avant ouverture
    this.logger.debug('État modale avant ouverture:', {
      hasShow: historyModalEl.classList.contains('show'),
      display: historyModalEl.style.display,
      visibility: historyModalEl.style.visibility,
      modalManager: !!this.kanban.modalManager?.historyModal
    });

    // SOLUTION SIMPLE: Utiliser la même approche que la modal de test
    this.logger.info('Création modal simple avec contenu Bootstrap');
    
    // Supprimer toute modal existante
    const existingSimple = document.getElementById('simple-history-modal');
    if (existingSimple) existingSimple.remove();
    
    // Créer une modal simple mais avec le contenu Bootstrap
    const simpleModal = document.createElement('div');
    simpleModal.id = 'simple-history-modal';
    
    // Nettoyer COMPLÈTEMENT le contenu Bootstrap des attributs problématiques
    let cleanContent = historyModalEl.innerHTML;
    
    // Supprimer TOUS les attributs Bootstrap
    cleanContent = cleanContent.replace(/data-bs-[^=]*="[^"]*"/g, '');
    cleanContent = cleanContent.replace(/aria-label="Close"/g, '');
    cleanContent = cleanContent.replace(/type="button"/g, '');
    
    // Remplacer les boutons de fermeture par des boutons simples ALIGNÉS À DROITE
    cleanContent = cleanContent.replace(/<button[^>]*class="[^"]*btn-close[^"]*"[^>]*>.*?<\/button>/g, 
      '<button onclick="document.getElementById(\'simple-history-modal\').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;position:absolute;top:10px;right:15px;color:#666;">&times;</button>');
    
    // Supprimer les trois boutons du bas (modal-footer)
    cleanContent = cleanContent.replace(/<div[^>]*class="[^"]*modal-footer[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
    
    // Supprimer les classes Bootstrap problématiques des boutons restants
    cleanContent = cleanContent.replace(/class="([^"]*)btn[^"]*"/g, (match, otherClasses) => {
      const cleanClasses = otherClasses.replace(/\s*btn[^\s]*/g, '').trim();
      return cleanClasses ? `class="${cleanClasses}"` : '';
    });
    
    // Corriger les liens d'édition de tâche pour qu'ils ferment la modal et ouvrent l'édition  
    cleanContent = cleanContent.replace(/onclick="([^"]*)"/g, (match, onclickContent) => {
      if (onclickContent.includes('openTaskModal')) {
        // Si c'est déjà openTaskModalById, ne pas modifier, sinon remplacer
        if (onclickContent.includes('openTaskModalById')) {
          // Déjà le bon format, juste ajouter la fermeture de modal
          return 'onclick="document.getElementById(\'simple-history-modal\').remove(); ' + onclickContent + '"';
        } else {
          // Remplacer openTaskModal par openTaskModalById
          const updatedContent = onclickContent.replace('openTaskModal', 'openTaskModalById');
          return 'onclick="document.getElementById(\'simple-history-modal\').remove(); ' + updatedContent + '"';
        }
      }
      return match;
    });
    
    simpleModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1060;
        display: flex;
        align-items: center;
        justify-content: center;
      " onclick="if(event.target === this) document.getElementById('simple-history-modal').remove();">
        <div style="
          background: white;
          border-radius: 8px;
          max-width: 1000px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0,0,0,.5);
          position: relative;
        ">
          ${cleanContent}
        </div>
      </div>
    `;
    
    document.body.appendChild(simpleModal);
    
    // Ajouter la gestion Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.getElementById('simple-history-modal')?.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    this.logger.info('Modal simple créée avec succès');
  }
  
  /**
   * Ferme la modal d'historique manuellement
   */
  closeHistoryModal() {
    const historyModalEl = document.getElementById('task-history-modal');
    if (historyModalEl) {
      historyModalEl.style.display = 'none';
      historyModalEl.classList.remove('show');
      historyModalEl.removeAttribute('aria-modal');
      historyModalEl.setAttribute('aria-hidden', 'true');
    }
    
    // Supprimer le backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
    
    // Supprimer la classe du body
    document.body.classList.remove('modal-open');
    
    this.logger.info('Modal d\'historique fermée manuellement');
  }
  
  /**
   * Force l'affichage de la modale d'historique
   * @param {HTMLElement} modalEl - Élément de la modale
   */
  forceShowModal(modalEl) {
    this.logger.info('Test: Création d\'une modal HTML simple');
    
    // Supprimer toute modal de test existante
    const existingTest = document.getElementById('test-simple-modal');
    if (existingTest) existingTest.remove();
    
    // Créer une modal simple sans Bootstrap
    const testModal = document.createElement('div');
    testModal.id = 'test-simple-modal';
    testModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 5px 15px rgba(0,0,0,.5);
        ">
          <h3>Modal de Test Simple</h3>
          <p>Si vous voyez ceci, les modals HTML peuvent s'afficher !</p>
          <hr>
          <div id="test-modal-content">
            ${modalEl.innerHTML}
          </div>
          <hr>
          <button onclick="document.getElementById('test-simple-modal').remove()" style="
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">
            Fermer cette modal de test
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(testModal);
    this.logger.info('Modal de test créée. Visible ?');
    
    // Log pour debug
    this.logger.info('Comparaison:', {
      modalBootstrap: modalEl.id,
      modalBootstrapVisible: window.getComputedStyle(modalEl).display,
      modalTestVisible: 'devrait être visible'
    });
  }
  
  /**
   * Nettoie les backdrops orphelins
   */
  cleanupOrphanBackdrops() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    let cleaned = 0;
    
    backdrops.forEach(backdrop => {
      // Vérifier s'il y a une modale visible correspondante
      const visibleModals = document.querySelectorAll('.modal.show');
      
      if (visibleModals.length === 0) {
        // Aucune modale visible, supprimer le backdrop
        backdrop.remove();
        cleaned++;
        this.logger.debug('Backdrop orphelin supprimé');
      }
    });
    
    if (cleaned > 0) {
      document.body.classList.remove('modal-open');
      this.logger.info(`${cleaned} backdrop(s) orphelin(s) nettoyé(s)`);
    }
  }
  
  /**
   * Rend l'historique d'une tâche dans la modal
   * @param {object} task - Données de la tâche
   */
  renderTaskHistory(task) {
    // Sauvegarder la tâche courante pour les boutons d'action
    this.currentTaskHistory = task;
    this.logger.info('Tâche sélectionnée pour historique:', task?.id, task?.titre);
    
    const historyData = this.parseTaskHistory(task);
    this.logger.debug('Historique parsé:', historyData.comments?.length, 'commentaires');
    
    this.renderHistoryStats(historyData);
    this.renderHistoryTimeline(historyData);
  }
  
  /**
   * Parse l'historique d'une tâche depuis les données Grist
   * @param {object} task - Données de la tâche
   * @returns {object} Historique parsé
   */
  parseTaskHistory(task) {
    let history = [];
    let comments = [];
    
    this.logger?.debug('Parsing task history', task.id);
    
    // Parser l'historique des statuts
    if (task.historique_statuts) {
      try {
        const historyData = JSON.parse(task.historique_statuts);
        if (historyData && historyData.historique) {
          history = historyData.historique;
          this.logger?.debug('Status history found:', history.length, 'entries');
        }
      } catch (error) {
        this.logger?.warn('Error parsing historique_statuts:', error);
      }
    }
    
    // Ne plus parser les commentaires depuis description (ancien système)
    // Tous les commentaires doivent maintenant être dans notes.history
    
    // Parser les entrées depuis les notes JSON (nouveau système)
    if (task.notes) {
      try {
        const notesData = JSON.parse(task.notes);
        // Notes trouvées
        if (notesData && notesData.history && Array.isArray(notesData.history)) {
          
          // Traiter chaque entrée selon son type d'action
          notesData.history.forEach(entry => {
            if (entry.action === 'comment') {
              // Extraire le contenu du commentaire de façon sûre
              let commentContent = entry.newValue || entry.details || '';
              
              // Si c'est du JSON complet, extraire le content
              if (commentContent.startsWith('{') && commentContent.includes('"content"')) {
                try {
                  const jsonData = JSON.parse(commentContent);
                  if (jsonData.content) {
                    commentContent = jsonData.content;
                    this.logger.debug('Migration: JSON comment extracted', entry.timestamp);
                  }
                } catch (e) {
                  // Si parsing échoue, utiliser le contenu brut
                  this.logger.warn('Failed to parse comment JSON:', e);
                }
              }
              
              // Nettoyer les préfixes comme "Commentaire ajouté:"
              commentContent = commentContent.replace(/^Commentaire ajouté:\s*/, '');
              
              // Si après extraction il reste du JSON, c'est un cas problématique mais on garde l'info
              if (commentContent.startsWith('{') && commentContent.includes('"timestamp"')) {
                this.logger.warn('Problematic JSON comment preserved for user review:', entry.timestamp);
                // On garde le commentaire mais on le marque comme problématique
                commentContent = `[MIGRATION] Données à vérifier: ${commentContent.substring(0, 100)}...`;
              }
              
              // Ajouter aux commentaires
              comments.push({
                timestamp: this.normalizeTimestamp(entry.timestamp),
                content: commentContent,
                user: entry.user || 'Utilisateur'
              });
            } else if (entry.action === 'status_change') {
              // Filtrer les changements de statut invalides (même statut)
              const isValidStatusChange = entry.details && 
                !entry.details.match(/from (.+) to \1$/); // Regex pour détecter "from X to X"
              
              if (isValidStatusChange) {
                const normalizedTimestamp = this.normalizeTimestamp(entry.timestamp);
                history.push({
                  timestamp: normalizedTimestamp,
                  statut: entry.status,
                  date_entree: normalizedTimestamp,
                  note: entry.details,
                  user: entry.user || 'Utilisateur'
                });
              } else {
                this.logger.debug('Changement de statut invalide ignoré:', entry.details);
              }
            } else if (entry.action === 'jalons_update') {
              // Changements de jalons
              const normalizedTimestamp = this.normalizeTimestamp(entry.timestamp);
              history.push({
                timestamp: normalizedTimestamp,
                statut: entry.status || task.statut,
                date_entree: normalizedTimestamp,
                note: `🎯 Jalons: ${entry.details}`,
                user: entry.user || 'Utilisateur'
              });
            } else if (entry.action === 'strategies_update') {
              // Changements de stratégies
              const normalizedTimestamp = this.normalizeTimestamp(entry.timestamp);
              history.push({
                timestamp: normalizedTimestamp,
                statut: entry.status || task.statut,
                date_entree: normalizedTimestamp,
                note: `🎯 Stratégies: ${entry.details}`,
                user: entry.user || 'Utilisateur'
              });
            } else if (entry.action === 'update' || entry.action === 'field_change') {
              // Filtrer les doublons de commentaires (éviter "Commentaire modifié:")
              const isCommentUpdate = entry.details && 
                (entry.details.includes('Commentaire modifié:') || 
                 entry.details.includes('Commentaire ajouté:'));
              
              if (!isCommentUpdate) {
                // Nettoyer et extraire l'information utile
                const cleanNote = this.extractFieldChangeInfo(entry.details);
                
                if (cleanNote) {
                  const normalizedTimestamp = this.normalizeTimestamp(entry.timestamp);
                  history.push({
                    timestamp: normalizedTimestamp,
                    statut: entry.status || task.statut,
                    date_entree: normalizedTimestamp,
                    note: cleanNote,
                    user: entry.user || 'Utilisateur'
                  });
                }
              } else {
                this.logger.debug('Doublon de commentaire ignoré dans update:', entry.details);
              }
            }
          });
          
          this.logger?.debug('JSON history found:', history.length, 'entries,', comments.length, 'comments');
        }
      } catch (error) {
        this.logger?.warn('Error parsing notes JSON:', error);
      }
    }
    
    // Calculer les statistiques
    const stats = this.calculateHistoryStats(history, comments, task);
    
    // Fusionner historique et commentaires par chronologie
    const timeline = this.mergeHistoryAndComments(history, comments);
    
    return {
      task,
      history,
      comments,
      timeline,
      stats
    };
  }
  
  // parseCommentsFromDescription() supprimée
  // Les commentaires sont maintenant exclusivement dans notes.history
  
  /**
   * Extrait l'information utile d'une modification de champ
   * @param {string} details - Détails bruts de la modification
   * @returns {string|null} Information nettoyée ou null si pas pertinente
   */
  extractFieldChangeInfo(details) {
    if (!details) return null;
    
    // Extraire les modifications d'équipe/responsables
    const teamMatch = details.match(/Équipe modifiée:\s*([^→]+)→\s*(.+)/);
    if (teamMatch) {
      const avant = teamMatch[1].trim();
      const apres = teamMatch[2].trim();
      return `Équipe modifiée: ${avant} → ${apres}`;
    }
    
    // Extraire les modifications de responsables
    const responsableMatch = details.match(/Responsables?\s+modifiée?s?:\s*([^→]+)→\s*(.+)/);
    if (responsableMatch) {
      const avant = responsableMatch[1].trim();
      const apres = responsableMatch[2].trim();
      return `Responsables modifiés: ${avant} → ${apres}`;
    }
    
    // Extraire les modifications de bureau
    const bureauMatch = details.match(/Bureau modifié:\s*([^→]+)→\s*(.+)/);
    if (bureauMatch) {
      const avant = bureauMatch[1].trim();
      const apres = bureauMatch[2].trim();
      return `Bureau modifié: ${avant} → ${apres}`;
    }
    
    // Extraire les modifications de titre
    const titreMatch = details.match(/Titre modifié:\s*([^→]+)→\s*(.+)/);
    if (titreMatch) {
      const avant = titreMatch[1].trim();
      const apres = titreMatch[2].trim();
      // Limiter la longueur pour la lisibilité
      const avantCourt = avant.length > 30 ? avant.substring(0, 30) + '...' : avant;
      const apresCourt = apres.length > 30 ? apres.substring(0, 30) + '...' : apres;
      return `Titre modifié: ${avantCourt} → ${apresCourt}`;
    }
    
    // Extraire les modifications de projet
    const projetMatch = details.match(/Projet modifié:\s*([^→]+)→\s*(.+)/);
    if (projetMatch) {
      const avant = projetMatch[1].trim();
      const apres = projetMatch[2].trim();
      return `Projet modifié: ${avant} → ${apres}`;
    }
    
    // Extraire les modifications de priorité/urgence/impact
    const prioriteMatch = details.match(/(Urgence|Impact|Priorité)\s+modifiée?:\s*([^→]+)→\s*(.+)/);
    if (prioriteMatch) {
      const champ = prioriteMatch[1];
      const avant = prioriteMatch[2].trim();
      const apres = prioriteMatch[3].trim();
      return `${champ} modifiée: ${avant} → ${apres}`;
    }
    
    // Extraire les modifications de date
    const dateMatch = details.match(/Date\s+[^:]*modifiée:\s*([^→]+)→\s*(.+)/);
    if (dateMatch) {
      const avant = dateMatch[1].trim();
      const apres = dateMatch[2].trim();
      return `Date d'échéance modifiée: ${avant} → ${apres}`;
    }
    
    // Pour toutes les autres modifications, essayer d'extraire le pattern général "X modifié: avant → après"
    const generalMatch = details.match(/([^:]+)\s+modifiée?s?:\s*([^→]+)→\s*(.+)/);
    if (generalMatch) {
      const champ = generalMatch[1].trim();
      const avant = generalMatch[2].trim();
      const apres = generalMatch[3].trim();
      
      // Limiter la longueur si c'est trop long
      const avantCourt = avant.length > 50 ? avant.substring(0, 50) + '...' : avant;
      const apresCourt = apres.length > 50 ? apres.substring(0, 50) + '...' : apres;
      
      return `${champ} modifié: ${avantCourt} → ${apresCourt}`;
    }
    
    // Si pas de pattern reconnu, ignorer (probablement du contenu de tâche)
    return null;
  }

  /**
   * Convertit un timestamp en objet Date valide
   * @param {*} timestamp - Timestamp à convertir
   * @returns {Date} Objet Date valide
   */
  normalizeTimestamp(timestamp) {
    if (!timestamp) return new Date();
    
    // Déjà un objet Date
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? new Date() : timestamp;
    }
    
    // String ou nombre
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Fallback
    return new Date();
  }
  
  /**
   * Fusionne l'historique des statuts et les commentaires
   * @param {Array} history - Historique des statuts
   * @param {Array} comments - Commentaires
   * @returns {Array} Timeline fusionnée
   */
  mergeHistoryAndComments(history, comments) {
    const timeline = [];
    
    // Filtrer les entrées techniques inutiles pour l'utilisateur
    const isUserRelevant = (entry) => {
      if (!entry.note && !entry.details) return false;
      
      const content = entry.note || entry.details || '';
      
      // Masquer les changements techniques automatiques
      const technicalPatterns = [
        /Date d'échéance modifiée:/,
        /Date de début modifiée:/,
        /Priorité modifiée:/,
        /Assigné à modifiée:/,
        /field_change/,
        /Description mise à jour/,
        /Commentaire modifié:/
      ];
      
      return !technicalPatterns.some(pattern => pattern.test(content));
    };
    
    // Ajouter les changements de statut (seulement ceux pertinents)
    history.forEach(entry => {
      if (entry.timestamp && isUserRelevant(entry)) {
        timeline.push({
          type: 'status_change',
          timestamp: entry.timestamp, // Déjà normalisé dans parseTaskHistory
          ...entry
        });
      }
    });
    
    // Ajouter les commentaires
    comments.forEach(comment => {
      timeline.push({
        type: 'comment',
        timestamp: comment.timestamp, // Déjà normalisé dans parseTaskHistory
        ...comment
      });
    });
    
    // Trier par timestamp chronologique (plus récent en premier)
    // En cas d'égalité, donner priorité aux commentaires
    return timeline.sort((a, b) => {
      // Sécurité supplémentaire : vérifier que timestamp est bien un objet Date
      const timeA = (a.timestamp instanceof Date) ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = (b.timestamp instanceof Date) ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      
      if (timeA === timeB) {
        // En cas d'égalité, commentaires en premier
        if (a.type === 'comment' && b.type !== 'comment') return -1;
        if (b.type === 'comment' && a.type !== 'comment') return 1;
        return 0;
      }
      
      return timeB - timeA; // Plus récent en premier
    });
  }
  
  /**
   * Calcule les statistiques de l'historique
   * @param {Array} history - Historique des statuts
   * @param {Array} comments - Commentaires
   * @param {object} task - Données de la tâche
   * @returns {object} Statistiques
   */
  calculateHistoryStats(history, comments, task) {
    const stats = {
      totalSteps: history.length,
      totalComments: comments.length,
      currentStatus: task.statut,
      creationDate: null,
      lastModified: null,
      totalDuration: 0,
      averageStepDuration: 0
    };
    
    if (history.length > 0) {
      // Trier l'historique par timestamp pour avoir le bon ordre chronologique
      const sortedHistory = [...history].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB; // Plus ancien en premier
      });
      
      // Date de création (premier statut chronologique)
      const firstEntry = sortedHistory[0];
      if (firstEntry.timestamp) {
        stats.creationDate = new Date(firstEntry.timestamp);
      }
      
      // Dernière modification (dernier statut chronologique)
      const lastEntry = sortedHistory[sortedHistory.length - 1];
      if (lastEntry.timestamp) {
        stats.lastModified = new Date(lastEntry.timestamp);
      }
      
      // Durée totale
      if (stats.creationDate && stats.lastModified) {
        stats.totalDuration = calculateDurationMinutes(stats.creationDate, stats.lastModified);
        stats.averageStepDuration = Math.round(stats.totalDuration / history.length);
      }
    }
    
    // Inclure les commentaires dans la date de dernière modification
    if (comments.length > 0 && comments[0].timestamp) {
      const lastCommentDate = comments[0].timestamp;
      if (!stats.lastModified || lastCommentDate > stats.lastModified) {
        stats.lastModified = lastCommentDate;
      }
    }
    
    return stats;
  }
  
  /**
   * Rend les statistiques de l'historique
   * @param {object} historyData - Données d'historique
   */
  renderHistoryStats(historyData) {
    const statsContainer = document.getElementById('history-stats');
    if (!statsContainer) return;
    
    const { stats, task } = historyData;
    
    statsContainer.innerHTML = `
      <div class="row g-3">
        <div class="col-md-2 text-center">
          <div class="stat-item">
            <div class="stat-value">${task.id}</div>
            <div class="stat-label">ID Tâche</div>
          </div>
        </div>
        <div class="col-md-2 text-center">
          <div class="stat-item">
            <div class="stat-value">${stats.totalSteps}</div>
            <div class="stat-label">Étapes</div>
          </div>
        </div>
        <div class="col-md-2 text-center">
          <div class="stat-item">
            <div class="stat-value">${stats.totalComments}</div>
            <div class="stat-label">Commentaires</div>
          </div>
        </div>
        <div class="col-md-3 text-center">
          <div class="stat-item">
            <div class="stat-value">${formatDuration(stats.totalDuration)}</div>
            <div class="stat-label">Durée totale</div>
          </div>
        </div>
        <div class="col-md-3 text-center">
          <div class="stat-item">
            <div class="stat-value">${stats.lastModified ? formatDate(stats.lastModified) : 'N/A'}</div>
            <div class="stat-label">Dernière MAJ</div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Rend la timeline de l'historique
   * @param {object} historyData - Données d'historique
   */
  renderHistoryTimeline(historyData) {
    const timelineContainer = document.getElementById('history-timeline');
    if (!timelineContainer) return;
    
    const { timeline, task } = historyData;
    
    // En-tête avec titre de tâche cliquable
    let headerHTML = '';
    if (task && task.titre) {
      headerHTML = `
        <div class="timeline-header" style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 6px;">
          <h5 style="margin: 0; color: #1565c0;">
            <span class="timeline-task-title" onclick="window.kanbanManager?.modalManager?.openTaskModalById(${task.id})">
              ${task.titre}
            </span>
          </h5>
          <small class="text-muted">Cliquez sur le titre pour éditer la tâche</small>
        </div>
      `;
    }
    
    if (timeline.length === 0) {
      timelineContainer.innerHTML = headerHTML + `
        <div class="text-center text-muted py-4">
          <i class="bi bi-clock-history fs-1"></i>
          <p class="mt-2">Aucun historique disponible</p>
        </div>
      `;
      return;
    }
    
    let timelineHTML = headerHTML + '<div class="timeline-container">';
    
    timeline.forEach((entry, index) => {
      if (entry.type === 'status_change') {
        timelineHTML += this.renderStatusChangeEntry(entry, index === 0);
      } else if (entry.type === 'comment') {
        timelineHTML += this.renderCommentEntry(entry);
      }
    });
    
    timelineHTML += '</div>';
    timelineContainer.innerHTML = timelineHTML;
  }
  
  /**
   * Rend une entrée de changement de statut
   * @param {object} entry - Entrée d'historique
   * @param {boolean} isCurrent - Si c'est l'entrée courante
   * @returns {string} HTML de l'entrée
   */
  renderStatusChangeEntry(entry, isCurrent = false) {
    const currentClass = isCurrent ? 'current' : '';
    
    // Déterminer l'icône selon le type d'action
    let statusIcon;
    if (entry.note && entry.note.includes('modifié')) {
      // C'est un changement de champ, pas de statut
      statusIcon = this.getFieldChangeIcon(entry.note);
    } else {
      // C'est un vrai changement de statut
      statusIcon = this.getStatusIcon(entry.statut);
    }
    
    // Formatage direct sans normalizeDate pour préserver l'heure
    const formattedDate = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let durationHTML = '';
    if (entry.duration && entry.duration > 0) {
      durationHTML = `
        <div class="timeline-duration">
          <i class="bi bi-stopwatch"></i>
          Durée dans ce statut: ${formatDuration(entry.duration)}
        </div>
      `;
    }
    
    let noteHTML = '';
    if (entry.note) {
      noteHTML = `
        <div class="timeline-note">
          <i class="bi bi-sticky"></i>
          ${entry.note}
        </div>
      `;
    }
    
    return `
      <div class="timeline-entry">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong>${entry.statut}</strong>
            ${isCurrent ? '<span class="badge bg-success ms-2">Actuel</span>' : ''}
          </div>
          <small class="text-muted">${formattedDate}</small>
        </div>
        ${entry.note ? `<div class="text-muted">${entry.note}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Rend une entrée de commentaire
   * @param {object} entry - Entrée de commentaire
   * @returns {string} HTML de l'entrée
   */
  renderCommentEntry(entry) {
    // Formatage direct sans normalizeDate pour préserver l'heure
    const formattedDate = new Date(entry.timestamp).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const userInfo = entry.user ? ` par ${entry.user}` : '';
    const latestBadge = entry.isLatest ? '<span class="badge bg-primary ms-2">Dernier</span>' : '';
    
    // Générer un ID unique pour le commentaire basé sur le timestamp
    const timestampString = entry.timestamp instanceof Date ? 
      entry.timestamp.toISOString() : 
      String(entry.timestamp);
    const commentId = `comment-${timestampString.replace(/[^\d]/g, '')}`;
    this.logger.debug('Rendu commentaire avec bouton édition:', commentId);
    
    return `
      <div class="timeline-entry">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong>💬 Commentaire</strong>
            ${latestBadge}
          </div>
          <small class="text-muted">${formattedDate}${userInfo}</small>
        </div>
        <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px;">
          ${entry.content}
        </div>
      </div>
    `;
  }
  
  /**
   * Retourne l'icône appropriée pour un changement de champ
   * @param {string} note - Note décrivant le changement
   * @returns {string} HTML de l'icône
   */
  getFieldChangeIcon(note) {
    if (note.includes('Titre')) return '<i class="bi bi-card-text text-primary"></i>';
    if (note.includes('Projet')) return '<i class="bi bi-folder text-info"></i>';
    if (note.includes('Équipe') || note.includes('bureau')) return '<i class="bi bi-people text-success"></i>';
    if (note.includes('Responsables') || note.includes('qui')) return '<i class="bi bi-person-badge text-warning"></i>';
    if (note.includes('Urgence')) return '<i class="bi bi-exclamation-triangle text-danger"></i>';
    if (note.includes('Impact')) return '<i class="bi bi-lightning text-warning"></i>';
    if (note.includes('stratégique') || note.includes('Objectif')) return '<i class="bi bi-bullseye text-primary"></i>';
    if (note.includes('Date')) return '<i class="bi bi-calendar-event text-info"></i>';
    if (note.includes('Description')) return '<i class="bi bi-file-text text-secondary"></i>';
    
    // Icône par défaut pour les autres changements
    return '<i class="bi bi-pencil-square text-muted"></i>';
  }
  
  /**
   * Retourne l'icône appropriée pour un statut
   * @param {string} status - Nom du statut
   * @returns {string} HTML de l'icône
   */
  getStatusIcon(status) {
    const icons = {
      'Backlog': '<i class="bi bi-list-ul text-secondary"></i>',
      'À faire': '<i class="bi bi-calendar-plus text-info"></i>',
      'En cours': '<i class="bi bi-play-circle text-warning"></i>',
      'En attente': '<i class="bi bi-pause-circle text-primary"></i>',
      'Bloqué': '<i class="bi bi-x-octagon text-danger"></i>',
      'Validation': '<i class="bi bi-check-circle text-purple"></i>',
      'Terminé': '<i class="bi bi-check-circle-fill text-success"></i>'
    };
    
    return icons[status] || '<i class="bi bi-circle text-muted"></i>';
  }
  
  /**
   * Affiche tous les commentaires dans une vue simplifiée
   */
  showAllComments() {
    if (!this.currentTaskHistory) {
      displayError('Aucune tâche sélectionnée');
      return;
    }
    
    const historyData = this.parseTaskHistory(this.currentTaskHistory);
    const { comments } = historyData;
    
    if (comments.length === 0) {
      displayError('Aucun commentaire trouvé pour cette tâche');
      return;
    }
    
    const timelineContainer = document.getElementById('history-timeline');
    if (!timelineContainer) return;
    
    // Sauvegarder le contenu original
    const originalContent = timelineContainer.innerHTML;
    
    // Générer la vue des commentaires
    let commentsHTML = `
      <div class="text-center mb-4">
        <h6>
          <i class="bi bi-chat-square-text me-2"></i>
          Tous les commentaires (${comments.length})
        </h6>
        <button class="btn btn-sm btn-outline-secondary" id="btn-back-to-timeline">
          <i class="bi bi-arrow-left me-1"></i>Retour à la timeline
        </button>
      </div>
      <div class="all-comments-container">
    `;
    
    comments.forEach(comment => {
      const formattedDate = formatDate(comment.timestamp, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const userInfo = comment.user ? ` par ${comment.user}` : '';
      const latestBadge = comment.isLatest ? 
        '<span class="badge bg-primary">Dernier commentaire</span>' : '';
      
      commentsHTML += `
        <div class="comment-item">
          <div class="comment-header">
            ${latestBadge}
            <span class="comment-timestamp text-muted">
              <i class="bi bi-clock"></i> ${formattedDate}${userInfo}
            </span>
          </div>
          <div class="comment-content">${comment.content}</div>
        </div>
      `;
    });
    
    commentsHTML += '</div>';
    
    timelineContainer.innerHTML = commentsHTML;
    
    // Ajouter l'écouteur pour le bouton retour
    const backBtn = document.getElementById('btn-back-to-timeline');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        timelineContainer.innerHTML = originalContent;
      });
    }
  }
  
  /**
   * Exporte l'historique de la tâche courante
   */
  exportTaskHistory() {
    if (!this.currentTaskHistory) {
      displayError('Aucune tâche sélectionnée pour export');
      return;
    }
    
    try {
      const historyData = this.parseTaskHistory(this.currentTaskHistory);
      const csvData = this.generateTaskHistoryCSV(historyData);
      
      this.downloadCSV(csvData, `historique_tache_${this.currentTaskHistory.id}_${new Date().toISOString().slice(0, 10)}.csv`);
      
      displaySuccess('Historique exporté avec succès');
      
    } catch (error) {
      this.logger.error('Erreur export:', error);
      displayError('Erreur lors de l\'export de l\'historique');
    }
  }
  
  /**
   * Génère les données CSV pour l'historique d'une tâche
   * @param {object} historyData - Données d'historique
   * @returns {string} Données CSV
   */
  generateTaskHistoryCSV(historyData) {
    const { task, timeline, stats } = historyData;
    
    let csv = 'Type,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';
    
    // Informations générales
    csv += `"Tâche","${task.titre}","${stats.creationDate ? stats.creationDate.toISOString() : ''}","","","ID: ${task.id}"\n`;
    csv += `"Statistiques","Total","","","${stats.totalDuration}","${stats.totalSteps} étapes, ${stats.totalComments} commentaires"\n`;
    
    // Entrées de timeline
    timeline.forEach(entry => {
      const date = entry.timestamp.toISOString();
      const user = entry.user || entry.utilisateur || '';
      const duration = entry.duration || '';
      let content = '';
      
      if (entry.type === 'status_change') {
        content = entry.note || 'Changement de statut';
        csv += `"Statut","${entry.statut}","${date}","${user}","${duration}","${content.replace(/"/g, '""')}"\n`;
      } else if (entry.type === 'comment') {
        content = entry.content || '';
        csv += `"Commentaire","","${date}","${user}","","${content.replace(/"/g, '""')}"\n`;
      }
    });
    
    return csv;
  }
  
  /**
   * Exporte l'historique complet de toutes les tâches
   */
  exportFullHistory() {
    if (!this.kanban.currentRecords || this.kanban.currentRecords.length === 0) {
      displayError('Aucune tâche à exporter');
      return;
    }
    
    try {
      const csvData = this.generateFullHistoryCSV();
      this.downloadCSV(csvData, `historique_kanban_complet_${new Date().toISOString().slice(0, 10)}.csv`);
      
      displaySuccess(`Historique de ${this.kanban.currentRecords.length} tâches exporté`);
      
    } catch (error) {
      this.logger.error('Erreur export complet:', error);
      displayError('Erreur lors de l\'export complet');
    }
  }
  
  /**
   * Génère les données CSV pour l'historique complet
   * @returns {string} Données CSV
   */
  generateFullHistoryCSV() {
    let csv = 'ID_Tache,Titre,Projet,Statut_Actuel,Type_Entree,Statut_ou_Action,Date,Utilisateur,Duree_Minutes,Contenu\n';
    
    this.kanban.currentRecords.forEach(task => {
      const historyData = this.parseTaskHistory(task);
      const { timeline } = historyData;
      
      if (timeline.length === 0) {
        // Tâche sans historique
        csv += `"${task.id}","${task.titre}","${task.projet || ''}","${task.statut}","Info","","","","","Pas d'historique disponible"\n`;
        return;
      }
      
      timeline.forEach(entry => {
        const date = entry.timestamp.toISOString();
        const user = entry.user || entry.utilisateur || '';
        const duration = entry.duration || '';
        let content = '';
        
        if (entry.type === 'status_change') {
          content = entry.note || 'Changement de statut';
          csv += `"${task.id}","${task.titre}","${task.projet || ''}","${task.statut}","Statut","${entry.statut}","${date}","${user}","${duration}","${content.replace(/"/g, '""')}"\n`;
        } else if (entry.type === 'comment') {
          content = entry.content || '';
          csv += `"${task.id}","${task.titre}","${task.projet || ''}","${task.statut}","Commentaire","","${date}","${user}","","${content.replace(/"/g, '""')}"\n`;
        }
      });
    });
    
    return csv;
  }
  
  /**
   * Configure le widget d'édition de commentaire
   */
  setupCommentEditWidget() {
    this.currentEditingComment = null;

    // Créer le widget d'édition s'il n'existe pas
    this.createCommentEditWidget();

    // NOTE: Événement .btn-edit-comment géré par EventCentralizer.js ligne 48-75
    // (supprimé pour éviter le doublon avec addEventListener sur document)

    // Bouton fermer (IDs uniques pour accordéon)
    const btnClose = document.getElementById('accordion-btn-close-comment-edit');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeCommentEditWidget();
      });
    }
    
    // Bouton annuler
    const btnCancel = document.getElementById('accordion-btn-cancel-comment-edit');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        this.closeCommentEditWidget();
      });
    }
    
    // Bouton sauvegarder
    const btnSave = document.getElementById('accordion-btn-save-comment-edit');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        this.logger.debug('Bouton sauvegarder cliqué', this);
        this.saveCommentEdit();
      });
    } else {
      this.logger.error('Bouton accordion-btn-save-comment-edit non trouvé');
    }
    
    // Fermer avec l'overlay (seulement celui de l'accordéon)
    setTimeout(() => {
      const overlay = document.querySelector('#accordion-comment-edit-widget .comment-edit-overlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          // Fermer si on clique directement sur l'overlay (pas sur le modal)
          if (e.target === overlay) {
            this.closeCommentEditWidget();
          }
        });
      }
    }, 100);

    // NOTE: Événement Escape géré par EventCentralizer.js ligne 437-443
    // (supprimé pour éviter le doublon avec addEventListener sur document)
  }
  
  /**
   * Crée le widget d'édition de commentaire dans le DOM
   */
  createCommentEditWidget() {
    // Supprimer le widget existant s'il y en a un
    const existingWidget = document.getElementById('accordion-comment-edit-widget');
    if (existingWidget) {
      this.logger.debug('Suppression du widget existant');
      existingWidget.remove();
    }

    this.logger.debug('Création du widget d\'édition de commentaires pour accordéon');

    // Créer le HTML du widget avec structure corrigée
    const widgetHTML = `
      <div id="accordion-comment-edit-widget" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1070;">
        <div class="comment-edit-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; pointer-events: auto;">
          <div class="comment-edit-modal-container" style="pointer-events: auto;">
            <div class="comment-edit-modal" style="background: white; border-radius: 8px; max-width: 700px; width: 95%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
              <div class="comment-edit-header" style="padding: 1rem; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
                <h5 style="margin: 0; color: #333;"><i class="bi bi-pencil me-2"></i>Édition de commentaire</h5>
                <button type="button" id="accordion-btn-close-comment-edit" class="btn-close" aria-label="Fermer" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6c757d;">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div class="comment-edit-body" style="padding: 1rem;">
                <div class="mb-2">
                  <small class="text-muted">Date: <span id="accordion-comment-edit-date"></span></small>
                </div>
                <textarea id="accordion-comment-edit-text" rows="6"
                          placeholder="Modifiez votre commentaire..."
                          style="width: 100%; min-height: 120px; padding: 10px; border: 2px solid #007bff; background: white; font-family: inherit; font-size: 14px; line-height: 1.4; resize: vertical; outline: none;"
                          ></textarea>
              </div>

              <div class="comment-edit-footer" style="padding: 1rem; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button type="button" id="accordion-btn-cancel-comment-edit" class="btn btn-secondary">
                  <i class="bi bi-x-circle me-1"></i>Annuler
                </button>
                <button type="button" id="accordion-btn-save-comment-edit" class="btn btn-primary">
                  <i class="bi bi-check-circle me-1"></i>Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('popup-tache') || document.body;
    container.insertAdjacentHTML('beforeend', widgetHTML);

    this.addCommentEditStyles();

    // Attacher les event listeners après création
    this.attachCommentEditListeners();
  }
  
  /**
   * Attache les event listeners au widget d'édition
   */
  attachCommentEditListeners() {
    const textarea = document.getElementById('accordion-comment-edit-text');
    const closeBtn = document.getElementById('accordion-btn-close-comment-edit');
    const cancelBtn = document.getElementById('accordion-btn-cancel-comment-edit');
    const saveBtn = document.getElementById('accordion-btn-save-comment-edit');
    
    this.logger.debug('Attachement des listeners:', {
      textarea: !!textarea,
      closeBtn: !!closeBtn,
      cancelBtn: !!cancelBtn,
      saveBtn: !!saveBtn
    });
    
    // Event listeners pour les boutons
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeCommentEditWidget());
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeCommentEditWidget());
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveCommentEdit());
    }
    
    // Textarea fonctionnel avec gestion des touches
    if (textarea) {
      textarea.tabIndex = 0;
      
      // Empêcher la propagation des touches pour éviter la fermeture de modales
      textarea.addEventListener('keydown', (e) => {
        e.stopPropagation(); // Empêche les listeners globaux
      });
      
      textarea.addEventListener('keyup', (e) => {
        e.stopPropagation(); // Empêche les listeners globaux
      });
    }
  }
  
  /**
   * Ajoute les styles CSS pour le widget d'édition
   */
  addCommentEditStyles() {
    const styleId = 'comment-edit-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const styles = `
      <style id="${styleId}">
        .comment-edit-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1070;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .comment-edit-modal {
          background: white;
          border-radius: 8px;
          max-width: 700px;
          width: 95%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .comment-edit-header {
          padding: 1rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .comment-edit-header h5 {
          margin: 0;
          color: #333;
        }
        
        .comment-edit-body {
          padding: 1rem;
        }
        
        .comment-edit-footer {
          padding: 1rem;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        
        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6c757d;
        }
        
        .btn-close:hover {
          color: #000;
        }
        
        .btn-edit-comment {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          margin-left: 0.5rem;
          line-height: 1;
        }
        
        .timeline-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .timeline-status-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .timeline-status-text {
          margin-left: 0.25rem;
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
  
  /**
   * Ouvre le widget d'édition pour un commentaire
   * @param {string} commentId - ID du commentaire
   */
  openCommentEditWidget(commentId) {
    this.logger.debug('openCommentEditWidget appelé avec ID:', commentId);
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    this.logger.debug('Element commentaire trouvé:', commentElement);
    
    if (!commentElement) {
      this.logger.error('Commentaire non trouvé pour ID:', commentId);
      this.logger.debug('Éléments avec data-comment-id disponibles:', 
        document.querySelectorAll('[data-comment-id]'));
      return;
    }
    
    const contentElement = commentElement.querySelector('.comment-content');
    const originalContent = contentElement.dataset.original || contentElement.textContent;
    
    // Chercher l'élément de date (compatible modale historique ET accordéon)
    const dateElement = commentElement.querySelector('.timeline-entry-timestamp') || 
                       commentElement.querySelector('.comment-timestamp') ||
                       commentElement.querySelector('.timeline-dates') || 
                       commentElement.querySelector('.comment-meta') ||
                       commentElement.querySelector('.timeline-meta') ||
                       commentElement.querySelector('.text-muted') ||
                       commentElement.querySelector('[class*="timestamp"]') ||
                       commentElement.querySelector('[class*="date"]');
    
    let dateText = 'Date inconnue';
    if (dateElement) {
      dateText = dateElement.textContent.trim();
      this.logger.debug('Date trouvée:', dateText, 'depuis élément:', dateElement.className);
    } else {
      this.logger.warn('Aucun élément de date trouvé dans:', commentElement.innerHTML);
      // Essayer de trouver une date dans le texte
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/;
      const match = commentElement.textContent.match(dateRegex);
      if (match) {
        dateText = match[0];
        this.logger.debug('Date extraite du texte:', dateText);
      }
    }
    
    // Stocker les informations du commentaire en cours d'édition
    this.currentEditingComment = {
      id: commentId,
      element: commentElement,
      originalContent: originalContent
    };
    
    // Remplir le widget (IDs uniques pour accordéon)
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');
    
    if (!textArea || !dateSpan) {
      this.logger.error('Éléments du widget accordéon non trouvés');
      return;
    }
    
    textArea.value = originalContent;
    dateSpan.textContent = dateText;
    
    // S'assurer que le textarea est activé
    textArea.disabled = false;
    textArea.readOnly = false;
    
    // Afficher le widget
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (!widget) {
      this.logger.error('Widget accordéon non trouvé');
      return;
    }
    
    // Sauvegarder l'ID du commentaire dans le widget pour récupération (multiples sources)
    widget.dataset.commentId = commentId;
    textArea.dataset.commentId = commentId;
    textArea.setAttribute('data-comment-id', commentId);
    textArea.setAttribute('data-original', originalContent);

    this.disableTaskModalFocusTrap();

    widget.style.display = 'block';
    
    // Focus avec debugging
    this.logger.debug('Tentative de focus sur textarea:', {
      textArea: !!textArea,
      disabled: textArea.disabled,
      readOnly: textArea.readOnly,
      style: textArea.style.display,
      visible: textArea.offsetParent !== null
    });
    
    // Focus avec sélection automatique du texte
    setTimeout(() => {
      textArea.focus();
      textArea.select(); // Sélectionne tout le texte
    }, 150);
  }
  
  /**
   * Ferme le widget d'édition
   */
  closeCommentEditWidget() {
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (widget) {
      widget.style.display = 'none';
    }

    this.restoreTaskModalFocusTrap();

    this.currentEditingComment = null;
    
    // Nettoyer le formulaire (IDs uniques pour accordéon)
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');
    
    if (textArea) textArea.value = '';
    if (dateSpan) dateSpan.textContent = '';
  }
  
  /**
   * Vérifie si le widget d'édition est ouvert
   * @returns {boolean}
   */
  isCommentEditOpen() {
    const widget = document.getElementById('accordion-comment-edit-widget');
    if (!widget) {
      return false;
    }

    const style = window.getComputedStyle(widget);
    return style.display !== 'none' && widget.getAttribute('aria-hidden') !== 'true';
  }
  
  /**
   * Restaure le commentaire en cours d'édition depuis le widget DOM
   * @returns {boolean} True si restauré avec succès, false sinon
   */
  restoreEditingCommentFromWidget() {
    this.logger.debug('🔄 Tentative de restauration du commentaire depuis le widget');
    
    const widget = document.getElementById('accordion-comment-edit-widget');
    const textArea = document.getElementById('accordion-comment-edit-text');
    const dateSpan = document.getElementById('accordion-comment-edit-date');

    const widgetVisible = widget && window.getComputedStyle(widget).display !== 'none' && widget.getAttribute('aria-hidden') !== 'true';

    if (!widget || !widgetVisible || !textArea) {
      this.logger.error('❌ Widget d\'édition non disponible ou invisible');
      displayError('Erreur: Aucun commentaire sélectionné pour édition');
      return false;
    }
    
    // Récupérer l'ID du commentaire depuis plusieurs sources possibles
    const commentId = widget.dataset.commentId || 
                     textArea.dataset.commentId || 
                     textArea.getAttribute('data-comment-id') ||
                     dateSpan?.dataset.commentId;
    
    if (!commentId) {
      this.logger.error('❌ ID du commentaire non trouvé dans le widget');
      this.logger.debug('Sources vérifiées:', {
        widgetDataset: Object.keys(widget.dataset),
        textAreaDataset: Object.keys(textArea.dataset),
        dateSpanDataset: dateSpan ? Object.keys(dateSpan.dataset) : null
      });
      displayError('Erreur: Session d\'édition expirée. Veuillez réessayer.');
      return false;
    }
    
    // Reconstituer l'objet commentaire
    this.currentEditingComment = {
      id: commentId,
      originalContent: textArea.defaultValue || textArea.getAttribute('data-original') || textArea.placeholder || '',
      element: null // Plus de référence directe à l'élément
    };
    
    this.logger.info('✅ Commentaire restauré depuis widget:', {
      id: commentId,
      hasOriginalContent: !!this.currentEditingComment.originalContent
    });

    return true;
  }

  getBootstrapModalCandidates() {
    const modalManager = this.kanban?.modalManager;
    if (!modalManager) {
      return [];
    }

    const candidates = [];
    if (modalManager.taskModal) {
      candidates.push(modalManager.taskModal);
    }

    if (modalManager.historyModal) {
      candidates.push(modalManager.historyModal);
    }

    return candidates;
  }

  getActiveBootstrapModalInstance() {
    const candidates = this.getBootstrapModalCandidates();
    if (!candidates.length) {
      return null;
    }

    const activeModal = candidates.find((modal) => modal?._element?.classList?.contains('show'));
    return activeModal || candidates[0] || null;
  }

  /**
   * Désactive temporairement le focus trap de la modale de tâche (Bootstrap)
   */
  disableTaskModalFocusTrap() {
    const modalInstance = this.getActiveBootstrapModalInstance();
    if (!modalInstance || !modalInstance._focustrap) {
      return;
    }

    if (this.activeModalFocusTrap?.instance === modalInstance && this.activeModalFocusTrap.active) {
      return;
    }

    try {
      modalInstance._focustrap.deactivate();
      this.activeModalFocusTrap = {
        instance: modalInstance,
        active: true
      };
      this.logger.debug('Focus trap de la modale active désactivé pour édition de commentaire');
    } catch (error) {
      this.logger.warn('Impossible de désactiver le focus trap de la modale active', error);
    }
  }

  /**
   * Restaure le focus trap de la modale de tâche (Bootstrap)
   */
  restoreTaskModalFocusTrap() {
    if (!this.activeModalFocusTrap?.instance?._focustrap) {
      this.activeModalFocusTrap = null;
      return;
    }

    try {
      this.activeModalFocusTrap.instance._focustrap.activate();
      this.logger.debug('Focus trap de la modale active réactivé après édition de commentaire');
    } catch (error) {
      this.logger.warn('Impossible de réactiver le focus trap de la modale active', error);
    }

    this.activeModalFocusTrap = null;
  }

  /**
   * Récupère l'ID de la tâche pour laquelle on édite un commentaire
   * Utilise une hiérarchie claire de sources fiables
   * @returns {number|null} L'ID de la tâche ou null si non trouvé
   */
  getCurrentEditingTaskId() {
    this.logger.debug('🔍 Recherche de l\'ID de la tâche pour édition de commentaire...');
    
    let taskId = null;
    let source = '';
    
    // PRIORITÉ 1: ID explicite dans currentTaskHistory (la tâche dont on affiche l'historique)
    if (this.currentTaskHistory?.id) {
      taskId = this.currentTaskHistory.id;
      source = 'currentTaskHistory.id';
    }
    
    // PRIORITÉ 2: Fallback vers ModalManager si ouvert (la tâche en cours d'édition dans la modale)
    if (!taskId && this.kanban?.modalManager?.currentTaskId) {
      taskId = this.kanban.modalManager.currentTaskId;
      source = 'modalManager.currentTaskId';
      this.logger.warn('⚠️ Fallback vers ModalManager - vérifier cohérence avec l\'historique');
    }
    
    // PRIORITÉ 3: Autres champs dans currentTaskHistory
    if (!taskId && this.currentTaskHistory) {
      taskId = this.currentTaskHistory.id_task || this.currentTaskHistory.taskId;
      if (taskId) {
        source = 'currentTaskHistory.id_task/taskId';
        this.logger.warn('⚠️ Utilisation champ alternatif dans currentTaskHistory');
      }
    }
    
    // PRIORITÉ 4: Dernier recours - DOM (moins fiable)
    if (!taskId) {
      const modalElement = document.getElementById('popup-tache');
      if (modalElement?.dataset.taskId) {
        taskId = modalElement.dataset.taskId;
        source = 'DOM.popup-tache.dataset.taskId';
        this.logger.warn('⚠️ Dernier recours - récupération depuis DOM');
      }
    }
    
    // Validation et logging
    if (taskId) {
      taskId = parseInt(taskId);
      this.logger.info(`✅ ID de tâche trouvé: ${taskId} (source: ${source})`);
      
      // Validation de cohérence si possible
      if (this.currentTaskHistory?.id && taskId !== this.currentTaskHistory.id) {
        this.logger.error(`❌ INCOHÉRENCE: ID trouvé (${taskId}) ≠ currentTaskHistory.id (${this.currentTaskHistory.id})`);
        return null;
      }
    } else {
      this.logger.error('❌ Aucun ID de tâche trouvé pour l\'édition de commentaire');
      this.logger.debug('État de debug:', {
        hasCurrentTaskHistory: !!this.currentTaskHistory,
        currentTaskHistoryId: this.currentTaskHistory?.id,
        modalManagerTaskId: this.kanban?.modalManager?.currentTaskId,
        modalElementExists: !!document.getElementById('popup-tache')
      });
    }
    
    return taskId;
  }

  /**
   * Sauvegarde les modifications du commentaire
   * 
   * REFACTORISÉ pour éviter la confusion des IDs:
   * - Utilise getCurrentEditingTaskId() pour récupérer l'ID de tâche de manière centralisée
   * - Utilise restoreEditingCommentFromWidget() pour restaurer les données du commentaire
   * - Validation de cohérence entre les différentes sources d'IDs
   * 
   * @see getCurrentEditingTaskId() - Récupération centralisée de l'ID de tâche
   * @see restoreEditingCommentFromWidget() - Restauration des données de commentaire
   */
  async saveCommentEdit() {
    this.logger.info('💾 saveCommentEdit appelé');
    
    // Récupérer ou reconstituer le commentaire en cours d'édition
    if (!this.currentEditingComment) {
      if (!this.restoreEditingCommentFromWidget()) {
        return; // Erreur déjà gérée dans restoreEditingCommentFromWidget
      }
    }
    
    const newContent = document.getElementById('accordion-comment-edit-text')?.value?.trim();
    
    if (!newContent) {
      displayError('Le commentaire ne peut pas être vide');
      return;
    }
    
    if (newContent === this.currentEditingComment.originalContent) {
      this.logger.debug('Aucune modification détectée');
      this.closeCommentEditWidget();
      return;
    }
    
    try {
      // Utiliser la méthode centralisée pour récupérer l'ID
      const taskId = this.getCurrentEditingTaskId();
      
      if (!taskId) {
        throw new Error('ID de tâche non trouvé - impossible de sauvegarder le commentaire');
      }
      
      // Désactiver le bouton de sauvegarde et afficher un loader
      const saveBtn = document.getElementById('accordion-btn-save-comment-edit');
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Sauvegarde...';
      
      try {
        // Sauvegarder dans Grist
        await this.updateCommentInGrist(taskId, this.currentEditingComment.id, newContent);
        
        // Mise à jour dans l'interface (si l'élément existe encore)
        if (this.currentEditingComment && this.currentEditingComment.element) {
          const contentElement = this.currentEditingComment.element.querySelector('.comment-content');
          if (contentElement) {
            contentElement.textContent = newContent;
            contentElement.dataset.original = newContent;
            
            // Ajouter une indication visuelle que le commentaire a été modifié
            const timelineEntry = this.currentEditingComment.element;
            timelineEntry.classList.add('comment-edited');
            
            // Ajouter un badge "Modifié" si pas déjà présent
            const statusDiv = timelineEntry.querySelector('.timeline-status');
            if (statusDiv && !statusDiv.querySelector('.badge-edited')) {
              const editedBadge = document.createElement('span');
              editedBadge.className = 'badge bg-warning ms-2 badge-edited';
              editedBadge.textContent = 'Modifié';
              statusDiv.appendChild(editedBadge);
            }
          }
        }
        
        displaySuccess('Commentaire mis à jour avec succès');
        this.closeCommentEditWidget();
        
      } finally {
        // Restaurer le bouton
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
      
    } catch (error) {
      this.logger.error('Erreur lors de la sauvegarde du commentaire:', error);
      
      // Afficher un message d'erreur détaillé selon le type d'erreur
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (error.message.includes('non trouvé')) {
        errorMessage = 'Tâche non trouvée dans la base de données';
      } else if (error.message.includes('applyUserActions')) {
        errorMessage = 'Erreur de connexion à Grist. Vérifiez votre connexion.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Erreur de format des données. Contactez l\'administrateur.';
      }
      
      displayError(errorMessage);
    }
  }
  
  /**
   * Met à jour un commentaire dans Grist
   * @param {number} taskId - ID de la tâche
   * @param {string} commentId - ID du commentaire
   * @param {string} newContent - Nouveau contenu
   */
  async updateCommentInGrist(taskId, commentId, newContent) {
    try {
      // Récupérer la tâche actuelle depuis Grist
      const gristApi = this.getGristApi();
      const gristData = await gristApi.docApi.fetchTable(TABLE_ID);
      
      // Trouver l'enregistrement
      const index = gristData.id.findIndex(id => id === taskId);
      if (index === -1) {
        throw new Error(`Tâche ${taskId} non trouvée`);
      }
      
      const currentNotes = gristData.notes[index];
      let notesData;
      
      // Parser les notes JSON
      if (currentNotes && typeof currentNotes === 'string' && currentNotes.trim().startsWith('{')) {
        try {
          notesData = JSON.parse(currentNotes);
        } catch (parseError) {
          this.logger.debug('Erreur parsing JSON, création nouvelle structure:', parseError);
          notesData = { content: currentNotes || "", history: [] };
        }
      } else {
        notesData = { content: currentNotes || "", history: [] };
      }
      
      // Assurer que l'historique existe
      if (!Array.isArray(notesData.history)) {
        notesData.history = [];
      }
      
      // Extraire le timestamp du commentId pour trouver l'entrée à modifier
      const normalizeTimestampToDigits = (timestamp) => {
        if (timestamp === null || typeof timestamp === 'undefined') {
          return null;
        }

        try {
          if (timestamp instanceof Date) {
            if (Number.isNaN(timestamp.getTime())) {
              return null;
            }
            return timestamp.toISOString().replace(/[^\d]/g, '');
          }

          if (typeof timestamp === 'number') {
            const date = new Date(timestamp);
            if (Number.isNaN(date.getTime())) {
              return null;
            }
            return date.toISOString().replace(/[^\d]/g, '');
          }

          if (typeof timestamp === 'string') {
            const trimmed = timestamp.trim();
            if (!trimmed) {
              return '';
            }
            // Tenter de détecter les timestamps en millisecondes stockés sous forme de chaîne numérique
            if (/^\d{10,}$/.test(trimmed)) {
              const asNumber = Number(trimmed);
              if (Number.isFinite(asNumber)) {
                const date = new Date(asNumber);
                if (!Number.isNaN(date.getTime())) {
                  return date.toISOString().replace(/[^\d]/g, '');
                }
              }
            }
            return trimmed.replace(/[^\d]/g, '');
          }

          // Dernier recours : convertir en string
          return String(timestamp).replace(/[^\d]/g, '');
        } catch (normalizationError) {
          this.logger.warn('Impossible de normaliser le timestamp:', timestamp, normalizationError);
          return null;
        }
      };

      const commentTimestamp = commentId.replace('comment-', '');
      const commentTimestampDigits = normalizeTimestampToDigits(commentTimestamp);
      let entryFound = false;

      this.logger.debug('updateCommentInGrist - Recherche du commentaire:', commentId);
      this.logger.debug('updateCommentInGrist - Timestamp recherché:', commentTimestampDigits);
      this.logger.debug('updateCommentInGrist - Entrées d\'historique disponibles:', notesData.history.length);

      if (commentTimestampDigits == null) {
        this.logger.warn('updateCommentInGrist - Timestamp de commentaire invalide, fallback sans correspondance précise:', commentId);
      }

      // CORRECTION: Gérer les commentaires anciens (dans content) ET nouveaux (dans history)

      // 1. Chercher dans l'historique JSON (nouveau système)
      for (let i = 0; i < notesData.history.length; i++) {
        const entry = notesData.history[i];
        const entryTimestamp = normalizeTimestampToDigits(entry?.timestamp);

        if (entryTimestamp == null) {
          this.logger.warn('updateCommentInGrist - Entrée sans timestamp, ignorée:', entry);
          continue;
        }

        this.logger.debug(`updateCommentInGrist - Entrée ${i}: action=${entry.action}, timestamp=${entryTimestamp.substring(0, 12)}`);

        // Comparer les timestamps (on prend les premiers caractères pour éviter les problèmes de précision)
        const timestampsMatch = (() => {
          if (commentTimestampDigits == null) {
            return false;
          }

          if (entryTimestamp === '' || commentTimestampDigits === '') {
            return entryTimestamp === commentTimestampDigits;
          }

          return entryTimestamp.substring(0, 12) === commentTimestampDigits.substring(0, 12);
        })();

        if (timestampsMatch) {
          // Vérifier que c'est bien un commentaire
          if (entry.action === 'comment' || entry.action === 'create' || entry.action === 'update') {
            this.logger.debug('Modification du commentaire trouvé dans history:', entry);

            // Modifier le contenu selon le format
            if (entry.newValue) {
              notesData.history[i].newValue = newContent;
            }
            if (entry.details) {
              notesData.history[i].details = newContent;
            }
            
            // Mettre à jour le content principal si c'est le commentaire le plus récent
            if (i === notesData.history.length - 1) {
              notesData.content = newContent;
            }
            
            // Ajouter une marque d'édition
            notesData.history[i].edited = new Date().toISOString();
            notesData.history[i].editedBy = await this.getCurrentUser();
            
            entryFound = true;
            break;
          }
        }
      }
      
      // 2. Si pas trouvé dans history, chercher dans content (ancien système avec ---)
      if (!entryFound && notesData.content && notesData.content.includes('---')) {
        this.logger.debug('Recherche dans content (ancien système avec ---)');
        
        // Détecter si le commentaire à modifier est dans content (ancien format)
        const contentParts = notesData.content.split('\n---\n');
        if (contentParts.length > 1) {
          // Remplacer le premier commentaire (celui qui sera affiché)
          this.logger.debug('Remplacement du commentaire principal dans content');
          contentParts[0] = newContent;
          notesData.content = contentParts.join('\n---\n');
          entryFound = true;
          
          // Ajouter une entrée d'historique pour tracer la modification
          notesData.history.push({
            timestamp: new Date().toISOString(),
            user: await this.getCurrentUser(),
            action: 'update',
            details: `Commentaire modifié: ${newContent}`,
            status: gristData.statut[index] || 'Unknown'
          });
        }
      }
      
      if (!entryFound) {
        this.logger.debug('Entrée de commentaire non trouvée, ajout d\'une nouvelle entrée');
        
        // Ajouter une nouvelle entrée d'historique pour la modification
        notesData.history.push({
          timestamp: new Date().toISOString(),
          user: await this.getCurrentUser(),
          action: 'update',
          details: `Commentaire modifié: ${newContent}`,
          status: gristData.statut[index] || 'Unknown'
        });
      }
      
      // Limiter l'historique à 50 entrées
      if (notesData.history.length > 50) {
        notesData.history = notesData.history.slice(-50);
      }
      
      // Sauvegarder dans Grist
      const updatedNotes = JSON.stringify(notesData);
      this.logger.debug('Sauvegarde des notes mises à jour:', updatedNotes.length > 100 ? 'Notes très longues...' : updatedNotes);
      
      await gristApi.docApi.applyUserActions([
        ['UpdateRecord', TABLE_ID, taskId, {
          notes: updatedNotes,
          date_derniere_maj: new Date().toISOString()
        }]
      ]);
      
      this.logger.info('Commentaire mis à jour avec succès dans Grist');
      
    } catch (error) {
      this.logger.error('Erreur lors de la mise à jour du commentaire dans Grist:', error);
      throw error;
    }
  }
  
  /**
   * Récupère l'API Grist disponible
   * @returns {object}
   */
  getGristApi() {
    if (this.kanban?.gristManager?.getGristApi) {
      return this.kanban.gristManager.getGristApi();
    }

    if (typeof window !== 'undefined' && typeof window.grist !== 'undefined') {
      return window.grist;
    }

    throw new Error('API Grist non disponible');
  }

  /**
   * Récupère l'utilisateur actuel
   * @returns {Promise<string>}
   */
  async getCurrentUser() {
    try {
      const userActionManager = this.kanban.getUserActionManager ? 
        this.kanban.getUserActionManager() : 
        window.getUserActionManager?.();
        
      if (userActionManager && userActionManager.cachedUserName) {
        return userActionManager.cachedUserName;
      }
      
      return 'User';
    } catch (error) {
      this.logger.debug('Impossible de récupérer l\'utilisateur actuel:', error);
      return 'User';
    }
  }
  
  /**
   * Télécharge un fichier CSV
   * @param {string} csvData - Données CSV
   * @param {string} filename - Nom du fichier
   */
  downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }
  
  /**
   * Met à jour l'historique d'une tâche lors d'un changement de statut
   * @param {object} task - Tâche
   * @param {string} newStatus - Nouveau statut
   * @param {string} note - Note optionnelle
   * @returns {object} Données d'historique mises à jour
   */
  updateTaskHistory(task, newStatus, note = null) {
    const now = new Date().toISOString();
    const user = this.kanban.currentUser || 'Système';
    
    try {
      let historyData;
      
      // Parser l'historique existant
      if (task.historique_statuts) {
        historyData = JSON.parse(task.historique_statuts);
      } else {
        historyData = { historique: [], version: 1 };
      }

      if (!historyData || typeof historyData !== 'object') {
        historyData = { historique: [], version: 1 };
      }

      if (!Array.isArray(historyData.historique)) {
        historyData.historique = [];
      }
      
      // Si il y a un historique, fermer la dernière entrée
      if (historyData.historique.length > 0) {
        const lastEntry = historyData.historique[historyData.historique.length - 1];
        if (!lastEntry.date_sortie) {
          lastEntry.date_sortie = now;
          lastEntry.duree_minutes = calculateDurationMinutes(lastEntry.date_entree, now);
        }
      }
      
      // Ajouter la nouvelle entrée
      historyData.historique.push({
        statut: newStatus,
        date_entree: now,
        date_sortie: null,
        duree_minutes: null,
        utilisateur: user,
        note: note,
        timestamp: now
      });
      
      return {
        historique_statuts: JSON.stringify(historyData),
        date_derniere_maj: now,
        statut_precedent: task.statut
      };
      
    } catch (error) {
      this.logger.error('Erreur mise à jour historique:', error);
      
      // Historique de secours
      const fallbackHistory = {
        historique: [{
          statut: newStatus,
          date_entree: now,
          date_sortie: null,
          duree_minutes: null,
          utilisateur: user,
          note: note || "Historique reconstruit après erreur",
          timestamp: now
        }],
        version: 1
      };
      
      return {
        historique_statuts: JSON.stringify(fallbackHistory),
        date_derniere_maj: now,
        statut_precedent: task.statut || 'Inconnu'
      };
    }
  }
  
  /**
   * Génère un badge d'historique pour une tâche
   * @param {object} task - Données de la tâche
   * @returns {string} HTML du badge ou chaîne vide
   */
  generateHistoryBadge(task) {
    if (!task.historique_statuts) return '';
    
    try {
      const historyData = JSON.parse(task.historique_statuts);
      const historyCount = historyData.historique ? historyData.historique.length : 0;
      
      if (historyCount <= 1) return '';
      
      return `
        <button class="btn-history" title="Voir l'historique (${historyCount} étapes)" data-task-id="${task.id}">
          <i class="bi bi-clock-history"></i> ${historyCount}
        </button>
      `;
    } catch (error) {
      this.logger.warn('Erreur génération badge:', error);
      return '';
    }
  }
  
  /**
   * Obtient un résumé rapide de l'historique d'une tâche
   * @param {object} task - Données de la tâche
   * @returns {object} Résumé de l'historique
   */
  getTaskHistorySummary(task) {
    const historyData = this.parseTaskHistory(task);
    
    return {
      stepCount: historyData.stats.totalSteps,
      commentCount: historyData.stats.totalComments,
      totalDuration: historyData.stats.totalDuration,
      creationDate: historyData.stats.creationDate,
      lastModified: historyData.stats.lastModified,
      currentStatus: historyData.stats.currentStatus,
      hasHistory: historyData.history.length > 0,
      hasComments: historyData.comments.length > 0
    };
  }
  
  /**
   * Valide la structure d'un historique
   * @param {string} historyJSON - Historique au format JSON
   * @returns {object} Résultat de validation
   */
  validateHistoryStructure(historyJSON) {
    try {
      const data = JSON.parse(historyJSON);
      
      if (!data.historique || !Array.isArray(data.historique)) {
        return { isValid: false, error: 'Structure historique invalide' };
      }
      
      const invalidEntries = data.historique.filter(entry => 
        !entry.statut || !entry.date_entree
      );
      
      if (invalidEntries.length > 0) {
        return { 
          isValid: false, 
          error: `${invalidEntries.length} entrée(s) invalide(s) trouvée(s)` 
        };
      }
      
      return { isValid: true, entriesCount: data.historique.length };
      
    } catch (error) {
      return { isValid: false, error: 'JSON invalide' };
    }
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    this.currentTaskHistory = null;
    
    // Les écouteurs d'événements seront automatiquement supprimés 
    // quand les éléments DOM seront détruits
    
    this.logger.info('Ressources nettoyées');
  }
}
