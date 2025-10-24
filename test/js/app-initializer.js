// === js/app-initializer.js ===
// Script d'initialisation et de configuration globale de l'application Kanban

// ViewModeManager sera créé par KanbanManager
// Données de stratégie chargées directement depuis Grist
import { displayError, displaySuccess } from './utils/dom.js';
import { initLogger } from './utils/LoggerManager.js';

/**
 * Classe d'initialisation de l'application Kanban
 */
export class KanbanAppInitializer {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Initialiser le système de logging centralisé
    initLogger();
    
    // Composants de l'application
    this.components = {
      kanbanManager: null,
      viewModeManager: null,
      strategicData: null
    };
    
    // Configuration globale
    this.config = {
      enableDebugMode: false,
      enablePerformanceMonitoring: false,
      autoSaveInterval: 30000, // 30 secondes
      maxTasksPerColumn: 100,
      enableNotifications: true
    };
    
    this.init();
  }
  
  /**
   * Initialise l'application complète
   */
  async init() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }
  
  /**
   * Effectue l'initialisation complète
   */
  async _performInitialization() {
    try {
      await this.checkPrerequisites();
      await this.initializeBaseComponents();
      await this.setupUserInterface();
      await this.loadApplicationData();
      await this.finalizeInitialization();
      
      this.isInitialized = true;
      console.log('KanbanAppInitializer: initialisation terminée');
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      displayError(`Erreur d'initialisation: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Vérifie les prérequis de l'application
   */
  async checkPrerequisites() {
    
    // Vérifier la présence des éléments DOM requis
    const requiredElements = [
      'kanban-container',
      'popup-tache',
      'task-history-modal',
      'error-container'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      throw new Error(`Éléments DOM manquants: ${missingElements.join(', ')}`);
    }
    
    // Vérifier la disponibilité des APIs externes
    const requiredAPIs = ['grist', 'bootstrap', 'Sortable', 'flatpickr'];
    const missingAPIs = requiredAPIs.filter(api => typeof window[api] === 'undefined');
    
    if (missingAPIs.length > 0) {
      throw new Error(`APIs manquantes: ${missingAPIs.join(', ')}`);
    }
    
  }
  
  /**
   * Initialise les composants de base
   */
  async initializeBaseComponents() {
    
    try {
      // Une seule instance de KanbanManager (singleton pattern)
      if (!window.kanbanManager || !window.kanbanManager.isInitialized) {
        const { KanbanManager } = await import('./core/KanbanManager.js');
        window.kanbanManager = new KanbanManager();
      }
      
      this.components.kanbanManager = window.kanbanManager;
      
      // Attendre l'initialisation si nécessaire
      if (!this.components.kanbanManager.isInitialized) {
        await this.waitForComponent(
          () => this.components.kanbanManager && this.components.kanbanManager.isInitialized,
          15000,
          'KanbanManager.isInitialized'
        );
      }
    } catch (error) {
      console.error('❌ Erreur initialisation composants de base:', error);
      throw error; // Ne pas masquer l'erreur
    }
    
    // ViewModeManager est maintenant géré directement par KanbanManager
    // (évite les doublons de managers comme en prod)
    this.components.viewModeManager = this.components.kanbanManager.viewModeManager;
    
    // Les données stratégiques sont chargées par KanbanManager depuis Grist
    
  }
  
  /**
   * Configure l'interface utilisateur
   */
  async setupUserInterface() {
    // Initialiser les tooltips Bootstrap
    this.initializeTooltips();
    
    // Configurer les raccourcis clavier globaux
    this.setupGlobalKeyboardShortcuts();
    
    // Ajouter les boutons d'actions rapides
    this.createQuickActionButtons();
    
    // Configurer les notifications
    if (this.config.enableNotifications) {
      this.setupNotifications();
    }
    
    // Initialiser le mode de vue préféré
    this.components.viewModeManager.initializeViewMode();
    
  }
  
  /**
   * Charge les données de l'application
   */
  async loadApplicationData() {
    const kanban = this.components.kanbanManager;

    // Attendre explicitement la connexion Grist pour éviter les faux positifs
    if (kanban.gristManager) {
      if (!kanban.gristManager.isConnected) {
        await this.waitForComponent(
          () => kanban.gristManager?.isConnected,
          15000,
          'GristManager.isConnected'
        );
      }
    } else {
      throw new Error('GristManager non initialisé');
    }

    if (!kanban.currentRecords || kanban.currentRecords.length === 0) {
      try {
        await kanban.gristManager.reloadData();
      } catch (error) {
        throw new Error('Impossible de charger les données depuis Grist: ' + error.message);
      }
    }

    // Valider la cohérence des données
    this.validateDataIntegrity();

  }
  
  /**
   * Finalise l'initialisation
   */
  async finalizeInitialization() {
    
    // Démarrer les services en arrière-plan
    this.startBackgroundServices();
    
    // Configurer la sauvegarde automatique
    this.setupAutoSave();
    
    // Exposer les APIs publiques
    this.exposePublicAPIs();
    
    // Mode test : pas de monitoring automatique (données Grist fiables)
    
    // Marquer l'application comme prête
    document.body.classList.add('kanban-ready');
    
    // Émettre un événement de prêt
    window.dispatchEvent(new CustomEvent('kanban:ready', {
      detail: {
        version: '2.0',
        components: Object.keys(this.components),
        timestamp: Date.now()
      }
    }));
    
  }
  
  
  /**
   * Valide l'intégrité des données
   */
  validateDataIntegrity() {
    const kanban = this.components.kanbanManager;
    let issuesFound = 0;
    
    kanban.currentRecords.forEach((task, index) => {
      // Vérifier les champs requis
      if (!task.titre || !task.statut) {
        console.warn(`Tâche ${index} incomplète:`, task);
        issuesFound++;
      }
      
      // Vérifier les formats de listes
      if (task.bureau && (!Array.isArray(task.bureau) || task.bureau[0] !== 'L')) {
        console.warn(`Format bureau incorrect pour tâche ${task.id}`);
        task.bureau = ['L'];
        issuesFound++;
      }
      
      if (task.qui && (!Array.isArray(task.qui) || task.qui[0] !== 'L')) {
        console.warn(`Format responsables incorrect pour tâche ${task.id}`);
        task.qui = ['L'];
        issuesFound++;
      }
    });
    
    if (issuesFound > 0) {
      console.warn(`⚠️ ${issuesFound} problème(s) de données corrigé(s)`);
    } else {
    }
  }
  
  /**
   * Initialise les tooltips Bootstrap
   */
  initializeTooltips() {
    // D'abord, disposer de tous les tooltips existants
    this.disposeExistingTooltips();
    
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"], [title]:not(select):not(option)');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => {
      // Éviter de créer un tooltip s'il en existe déjà un
      const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
      if (existingTooltip) {
        existingTooltip.dispose();
      }
      
      return new bootstrap.Tooltip(tooltipTriggerEl, {
        delay: { show: 500, hide: 100 },
        placement: 'top',
        trigger: 'hover focus'
      });
    });
    
  }
  
  /**
   * Dispose tous les tooltips existants
   */
  disposeExistingTooltips() {
    // Trouver tous les éléments avec des tooltips Bootstrap
    document.querySelectorAll('[data-bs-toggle="tooltip"], [title]:not(select):not(option)').forEach(element => {
      const tooltip = bootstrap.Tooltip.getInstance(element);
      if (tooltip) {
        tooltip.dispose();
      }
    });
    
    // Nettoyer les tooltips "orphelins" qui pourraient rester dans le DOM
    document.querySelectorAll('.tooltip').forEach(tooltipEl => {
      if (tooltipEl.parentNode) {
        tooltipEl.parentNode.removeChild(tooltipEl);
      }
    });
  }
  
  /**
   * Configure les raccourcis clavier globaux
   */
  setupGlobalKeyboardShortcuts() {
    const shortcuts = {
      'ctrl+s': () => this.saveCurrentState(),
      'ctrl+r': () => this.reloadApplication(),
      'ctrl+d': () => this.toggleDebugMode(),
      'ctrl+h': () => this.showHelp(),
      'ctrl+e': () => this.exportData(),
      'f1': () => this.showHelp()
    };
    
    document.addEventListener('keydown', (e) => {
      const key = (e.ctrlKey ? 'ctrl+' : '') + 
                  (e.shiftKey ? 'shift+' : '') + 
                  (e.altKey ? 'alt+' : '') + 
                  e.key.toLowerCase();
      
      if (shortcuts[key] && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        shortcuts[key]();
      }
    });
    
  }
  
  /**
   * Crée les boutons d'actions rapides
   */
  createQuickActionButtons() {
    
    // Vérifier s'ils existent déjà (dans le header)
    if (document.querySelector('.quick-actions')) {
      return;
    }
    
    // Chercher le bouton nouvelle tâche d'abord
    const newTaskBtn = document.querySelector('#btn-nouvelle-tache');
    
    if (!newTaskBtn) {
      console.warn('Bouton Nouvelle Tâche non trouvé');
      return;
    }
    
    // Utiliser le parent direct du bouton comme conteneur
    const buttonsContainer = newTaskBtn.parentElement;
    
    if (!buttonsContainer) {
      console.warn('Container des boutons non trouvé');
      return;
    }
    
    const quickActionsDiv = document.createElement('div');
    quickActionsDiv.className = 'quick-actions';
    quickActionsDiv.innerHTML = `
      <div class="btn-group btn-group-sm" role="group" aria-label="Actions rapides">
        <button type="button" class="btn btn-outline-secondary" id="btn-export" title="Exporter">
          <i class="bi bi-download"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary" id="btn-help" title="Aide">
          <i class="bi bi-question-circle"></i>
        </button>
      </div>
    `;
    
    try {
      // Insérer avant le bouton "Nouvelle Tâche" dans le même conteneur
      buttonsContainer.insertBefore(quickActionsDiv, newTaskBtn);
    } catch (error) {
      console.error('❌ Erreur insertBefore:', error);
      // Fallback : ajouter à la fin
      buttonsContainer.appendChild(quickActionsDiv);
    }
    
    // Attacher les événements
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportData());
    document.getElementById('btn-help')?.addEventListener('click', () => this.showHelp());
    
  }
  
  /**
   * Configure les notifications
   */
  setupNotifications() {
    // Demander permission pour les notifications navigateur
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Configurer les notifications internes
    this.notificationContainer = this.createNotificationContainer();
  }
  
  /**
   * Crée le container des notifications
   */
  createNotificationContainer() {
    let container = document.getElementById('notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    
    return container;
  }
  
  /**
   * Démarre les services en arrière-plan
   */
  startBackgroundServices() {
    // Service de monitoring de performance
    if (this.config.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }
    
    // Service de nettoyage périodique
    setInterval(() => {
      this.performHousekeeping();
    }, 300000); // 5 minutes
    
  }
  
  /**
   * Configure la sauvegarde automatique
   */
  setupAutoSave() {
    if (this.config.autoSaveInterval > 0) {
      setInterval(() => {
        this.autoSave();
      }, this.config.autoSaveInterval);
      
    }
  }
  
  /**
   * Expose les APIs publiques
   */
  exposePublicAPIs() {
    // API globale de l'application
    window.KanbanAPI = {
      // Accès aux composants
      getKanbanManager: () => this.components.kanbanManager,
      getViewModeManager: () => this.components.viewModeManager,
      
      // Actions rapides
      refresh: () => this.reloadApplication(),
      export: () => this.exportData(),
      search: (term) => this.searchTasks(term),
      getStats: () => this.getStatistics(),
      
      // Configuration
      setConfig: (key, value) => this.setConfig(key, value),
      getConfig: (key) => this.config[key],
      
      // Debug
      debug: () => this.getDebugInfo(),
      toggleDebug: () => this.toggleDebugMode(),
      
      // Utilitaires
      cleanTooltips: () => this.forceCleanTooltips()
    };
    
  }
  
  /**
   * Démarre le monitoring de performance
   */
  startPerformanceMonitoring() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 100) { // Seuil de 100ms
          console.warn(`⚡ Performance: ${entry.name} a pris ${entry.duration.toFixed(2)}ms`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }
  
  /**
   * Effectue le nettoyage périodique
   */
  performHousekeeping() {
    // Nettoyer les tooltips orphelins et bloqués
    document.querySelectorAll('.tooltip').forEach(tooltip => {
      // Supprimer si pas dans le body ou si pas d'élément associé
      if (!document.body.contains(tooltip) || !tooltip.previousElementSibling) {
        tooltip.remove();
      }
    });
    
    // Nettoyer les tooltips sans trigger valide
    document.querySelectorAll('.tooltip.show').forEach(tooltip => {
      const trigger = document.querySelector(`[aria-describedby="${tooltip.id}"]`);
      if (!trigger || !trigger.offsetParent) {
        tooltip.remove();
      }
    });
    
    // Nettoyer le localStorage
    this.cleanupLocalStorage();
  }
  
  /**
   * Force le nettoyage immédiat des tooltips
   */
  forceCleanTooltips() {
    // Supprimer tous les tooltips visibles
    document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
    
    // Supprimer tous les backdrops de tooltips
    document.querySelectorAll('.tooltip-backdrop').forEach(backdrop => backdrop.remove());
    
  }
  
  /**
   * Nettoie le localStorage
   */
  cleanupLocalStorage() {
    try {
      const keys = Object.keys(localStorage);
      const kanbanKeys = keys.filter(key => key.startsWith('kanban-'));
      
      kanbanKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.timestamp && Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key); // Supprimer après 7 jours
          }
        } catch (e) {
          localStorage.removeItem(key); // Supprimer si corrompu
        }
      });
    } catch (e) {
      console.warn('Erreur nettoyage localStorage:', e);
    }
  }
  
  /**
   * Sauvegarde automatique
   */
  autoSave() {
    try {
      // Utiliser les données existantes au lieu d'une méthode inexistante
      const state = {
        records: this.components.kanbanManager.currentRecords || [],
        timestamp: Date.now()
      };
      localStorage.setItem('kanban-autosave', JSON.stringify(state));
    } catch (e) {
      console.warn('Erreur sauvegarde automatique:', e);
    }
  }
  
  /**
   * Affiche les statistiques
   */
  showStatistics() {
    const stats = this.components.kanbanManager.getKanbanStatistics();
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Statistiques Kanban</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <div class="card">
                  <div class="card-body text-center">
                    <h2 class="text-primary">${stats.totalTasks}</h2>
                    <p class="mb-0">Tâches totales</p>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card">
                  <div class="card-body text-center">
                    <h2 class="text-warning">${stats.urgent}</h2>
                    <p class="mb-0">Tâches urgentes</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-3">
              <h6>Répartition par statut:</h6>
              ${Object.entries(stats.byStatus).map(([status, count]) => 
                `<div class="d-flex justify-content-between">
                  <span>${status}</span>
                  <span class="badge bg-secondary">${count}</span>
                </div>`
              ).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
    });
  }
  
  /**
   * Exporte les données
   */
  exportData() {
    if (this.components.kanbanManager) {
      this.components.kanbanManager.exportKanban();
    }
  }
  
  /**
   * Affiche l'aide
   */
  showHelp() {
    const helpContent = `
      <h6>Raccourcis clavier:</h6>
      <ul>
        <li><kbd>N</kbd> - Nouvelle tâche</li>
        <li><kbd>F</kbd> - Focus recherche</li>
        <li><kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd> - Modes de vue</li>
        <li><kbd>Ctrl+S</kbd> - Sauvegarder l'état</li>
        <li><kbd>Ctrl+R</kbd> - Recharger</li>
        <li><kbd>F1</kbd> - Cette aide</li>
      </ul>
      
      <h6>Modes de vue:</h6>
      <ul>
        <li><strong>Compact</strong> - Vue dense avec cartes réduites</li>
        <li><strong>Détaillé</strong> - Vue complète avec tous les détails</li>
        <li><strong>Focus</strong> - Une colonne à la fois</li>
      </ul>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Aide Kanban</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${helpContent}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
    });
  }
  
  /**
   * Utilitaires
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async waitForComponent(condition, timeout = 10000, description = 'component') {
    const start = Date.now();
    console.log(`⏱️ Attente ${description}...`);
    
    while (!condition() && Date.now() - start < timeout) {
      await this.delay(100);
      if (Date.now() - start > 2000 && (Date.now() - start) % 2000 < 100) {
        console.log(`⏳ Toujours en attente de ${description} (${Math.round((Date.now() - start)/1000)}s)`);
      }
    }
    
    if (!condition()) {
      console.error(`❌ Timeout après ${Math.round((Date.now() - start)/1000)}s pour ${description}`);
      throw new Error(`Timeout waiting for ${description}`);
    }
    
  }
  
  saveCurrentState() {
    this.autoSave();
    displaySuccess('État sauvegardé');
  }
  
  reloadApplication() {
    if (this.components.kanbanManager) {
      this.components.kanbanManager.reloadFromGrist();
    }
  }
  
  toggleDebugMode() {
    this.config.enableDebugMode = !this.config.enableDebugMode;
    document.body.classList.toggle('debug-mode', this.config.enableDebugMode);
    console.log('Debug mode:', this.config.enableDebugMode ? 'ON' : 'OFF');
  }
  
  searchTasks(term) {
    return this.components.kanbanManager.searchTasks({ text: term });
  }
  
  getStatistics() {
    return this.components.kanbanManager.getKanbanStatistics();
  }
  
  setConfig(key, value) {
    this.config[key] = value;
  }
  
  getDebugInfo() {
    return {
      config: this.config,
      components: Object.keys(this.components),
      isInitialized: this.isInitialized,
      retryCount: this.retryCount,
      taskCount: this.components.kanbanManager?.currentRecords?.length || 0,
      gristConnected: this.components.kanbanManager?.gristManager?.isConnected || false
    };
  }
  
  /**
   * Démarre le monitoring automatique des données
   */
  startDataMonitoring() {
    let checkCount = 0;
    const maxChecks = 10;
    
    const monitor = setInterval(() => {
      checkCount++;
      const kanban = this.components.kanbanManager;
      
      // Vérifier si on a trop peu de tâches (probablement en mode démo)
      if (kanban && kanban.currentRecords && kanban.currentRecords.length <= 2) {
        
        // Essayer de recharger les données depuis Grist
        const gristAvailable = typeof window !== 'undefined' && typeof window.grist !== 'undefined';
        if (kanban.gristManager?.isConnected && gristAvailable) {
          console.log('🔄 Tentative de rechargement automatique...');
          kanban.gristManager.reloadData()
            .then(() => {
              const newCount = kanban.currentRecords?.length || 0;
              if (newCount > 2) {
                displaySuccess(`Données récupérées: ${newCount} tâches`);
                clearInterval(monitor);
                kanban.refreshKanban();
              }
            })
            .catch(err => {
              console.warn('Échec rechargement auto:', err);
            });
        }
      } else if (kanban && kanban.currentRecords && kanban.currentRecords.length > 2) {
        clearInterval(monitor);
      }
      
      // Arrêter après un certain nombre de tentatives
      if (checkCount >= maxChecks) {
        console.log('⏰ Monitoring automatique terminé');
        clearInterval(monitor);
      }
    }, 5000); // Vérifier toutes les 5 secondes
    
    console.log('👁️ Monitoring automatique des données démarré');
  }
}

// === INITIALISATION AUTOMATIQUE ===
let appInitializer = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    appInitializer = new KanbanAppInitializer();

    window.kanbanAppInitializer = appInitializer;

    await appInitializer.init();
  } catch (error) {
    console.error('❌ Échec de l\'initialisation de l\'application:', error);
    console.error('❌ Stack trace complète:', error.stack);
  }
});

// Exposition globale
window.KanbanAppInitializer = KanbanAppInitializer;
