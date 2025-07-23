// === js/app-initializer.js ===
// Script d'initialisation et de configuration globale de l'application Kanban

import { ViewModeManager } from './managers/ViewModeManager.js';
import { 
  getObjectivesByPriority, 
  getSubObjectives, 
  getActions,
  searchStrategyData 
} from './config/strategyData.js';
import { displayError, displaySuccess } from './utils/dom.js';

/**
 * Classe d'initialisation de l'application Kanban
 */
export class KanbanAppInitializer {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Composants de l'application
    this.components = {
      kanbanManager: null,
      viewManager: null,
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
      console.log('🚀 Démarrage de l\'initialisation Kanban...');
      
      // Étape 1: Vérifier les prérequis
      console.log('🔍 Étape 1: Vérification des prérequis...');
      await this.checkPrerequisites();
      console.log('✅ Étape 1 terminée');
      
      // Étape 2: Initialiser les composants de base
      console.log('⚙️ Étape 2: Initialisation des composants de base...');
      await this.initializeBaseComponents();
      console.log('✅ Étape 2 terminée');
      
      // Étape 3: Configurer l'interface utilisateur
      console.log('🎨 Étape 3: Configuration de l\'interface utilisateur...');
      await this.setupUserInterface();
      console.log('✅ Étape 3 terminée');
      
      // Étape 4: Charger les données
      console.log('📊 Étape 4: Chargement des données...');
      await this.loadApplicationData();
      console.log('✅ Étape 4 terminée');
      
      // Étape 5: Finaliser l'initialisation
      console.log('🏁 Étape 5: Finalisation de l\'initialisation...');
      await this.finalizeInitialization();
      console.log('✅ Étape 5 terminée');
      
      this.isInitialized = true;
      
      console.log('✅ Application Kanban initialisée avec succès');
      displaySuccess('Application Kanban chargée et prête à utiliser');
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Tentative de récupération ${this.retryCount}/${this.maxRetries}...`);
        
        // Attendre avant de réessayer
        await this.delay(2000 * this.retryCount);
        
        // Réinitialiser la promesse pour permettre une nouvelle tentative
        this.initializationPromise = null;
        
        return this.init();
      } else {
        displayError(`Échec de l'initialisation après ${this.maxRetries} tentatives: ${error.message}`);
        throw error;
      }
    }
  }
  
  /**
   * Vérifie les prérequis de l'application
   */
  async checkPrerequisites() {
    console.log('🔍 Vérification des prérequis...');
    
    // Vérifier la présence des éléments DOM requis
    const requiredElements = [
      'kanban-container',
      'popup-tache',
      'history-modal',
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
    
    console.log('✅ Prérequis vérifiés');
  }
  
  /**
   * Initialise les composants de base
   */
  async initializeBaseComponents() {
    console.log('⚙️ Initialisation des composants de base...');
    
    try {
      // Importer et initialiser le KanbanManager principal (si pas déjà créé)
      if (!window.kanbanManager) {
        const { KanbanManager } = await import('./kanban-app.js');
        this.components.kanbanManager = new KanbanManager();
        window.kanbanManager = this.components.kanbanManager;
      } else {
        console.log('✅ KanbanManager existant réutilisé');
        this.components.kanbanManager = window.kanbanManager;
      }
      
      // Vérifier l'état du KanbanManager
      console.log('📊 État KanbanManager:', {
        exists: !!this.components.kanbanManager,
        isInitialized: this.components.kanbanManager?.isInitialized,
        hasGrist: !!window.grist,
        hasData: !!this.components.kanbanManager?.currentRecords
      });
      
      // Si déjà initialisé, passer directement
      if (this.components.kanbanManager.isInitialized) {
        console.log('🚀 KanbanManager déjà initialisé');
      } else {
        // Attendre que le KanbanManager soit prêt
        await this.waitForComponent(
          () => this.components.kanbanManager && this.components.kanbanManager.isInitialized,
          15000,
          'KanbanManager.isInitialized'
        );
      }
    } catch (error) {
      console.error('❌ Erreur initialisation composants de base:', error);
      // Essayer de continuer même en cas d'erreur
      if (!this.components.kanbanManager) {
        console.log('🔄 Création fallback KanbanManager...');
        const { KanbanManager } = await import('./kanban-app.js');
        this.components.kanbanManager = new KanbanManager();
        window.kanbanManager = this.components.kanbanManager;
      }
    }
    
    // Initialiser le ViewModeManager
    this.components.viewModeManager = new ViewModeManager(this.components.kanbanManager);
    this.components.kanbanManager.viewModeManager = this.components.viewModeManager;
    
    // Charger les données stratégiques
    this.components.strategicData = {
      objectives: getObjectivesByPriority(),
      searchFunction: searchStrategyData
    };
    
    console.log('✅ Composants de base initialisés');
  }
  
  /**
   * Configure l'interface utilisateur
   */
  async setupUserInterface() {
    console.log('🎨 Configuration de l\'interface utilisateur...');
    
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
    this.components.viewManager.initializeViewMode();
    
    console.log('✅ Interface utilisateur configurée');
  }
  
  /**
   * Charge les données de l'application
   */
  async loadApplicationData() {
    console.log('📊 Chargement des données...');
    
    // Les données sont déjà chargées par le KanbanManager
    // Ici on peut ajouter des validations ou transformations supplémentaires
    
    const kanban = this.components.kanbanManager;
    
    if (!kanban.currentRecords || kanban.currentRecords.length === 0) {
      console.warn('⚠️ Aucune donnée trouvée - utilisation du mode démo');
      await this.loadDemoData();
    }
    
    // Valider la cohérence des données
    this.validateDataIntegrity();
    
    console.log(`✅ ${kanban.currentRecords.length} tâches chargées`);
  }
  
  /**
   * Finalise l'initialisation
   */
  async finalizeInitialization() {
    console.log('🎯 Finalisation de l\'initialisation...');
    
    // Démarrer les services en arrière-plan
    this.startBackgroundServices();
    
    // Configurer la sauvegarde automatique
    this.setupAutoSave();
    
    // Exposer les APIs publiques
    this.exposePublicAPIs();
    
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
    
    console.log('✅ Initialisation finalisée');
  }
  
  /**
   * Charge des données de démonstration
   */
  async loadDemoData() {
    const demoTasks = [
      {
        id: 1,
        titre: 'Mise en place du monitoring',
        description: 'Déploiement de la solution de monitoring des serveurs',
        statut: 'En cours',
        bureau: ['L', 'Exploit'],
        qui: ['L', 'Alex'],
        urgence: 'Courte',
        impact: 'Important',
        projet: 'Infrastructure 2024',
        strategie_objectif: 'Performance Optimisée',
        date_echeance: '2024-03-15'
      },
      {
        id: 2,
        titre: 'Audit sécurité réseau',
        description: 'Audit complet de la sécurité du réseau interne',
        statut: 'À faire',
        bureau: ['L', 'Réseau', 'RSSI'],
        qui: ['L', 'Timothée', 'Isabelle'],
        urgence: 'Immédiate',
        impact: 'Critique',
        projet: 'Sécurité 2024',
        strategie_objectif: 'Sécurité Renforcée'
      }
    ];
    
    this.components.kanbanManager.currentRecords = demoTasks;
    console.log('📝 Données de démonstration chargées');
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
      console.log('✅ Intégrité des données validée');
    }
  }
  
  /**
   * Initialise les tooltips Bootstrap
   */
  initializeTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"], [title]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => 
      new bootstrap.Tooltip(tooltipTriggerEl, {
        delay: { show: 500, hide: 100 }
      })
    );
    
    console.log(`💡 ${tooltipList.length} tooltips initialisés`);
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
    
    console.log('⌨️ Raccourcis clavier configurés');
  }
  
  /**
   * Crée les boutons d'actions rapides
   */
  createQuickActionButtons() {
    const header = document.querySelector('.kanban-header .col-auto');
    if (!header) return;
    
    // Vérifier s'ils existent déjà
    if (header.querySelector('.quick-actions')) return;
    
    const quickActionsDiv = document.createElement('div');
    quickActionsDiv.className = 'quick-actions me-2';
    quickActionsDiv.innerHTML = `
      <div class="btn-group btn-group-sm" role="group" aria-label="Actions rapides">
        <button type="button" class="btn btn-outline-secondary" id="btn-stats" title="Statistiques">
          <i class="bi bi-graph-up"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary" id="btn-export" title="Exporter">
          <i class="bi bi-download"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary" id="btn-help" title="Aide">
          <i class="bi bi-question-circle"></i>
        </button>
      </div>
    `;
    
    // Insérer avant les boutons existants
    header.insertBefore(quickActionsDiv, header.firstChild);
    
    // Attacher les événements
    document.getElementById('btn-stats').addEventListener('click', () => this.showStatistics());
    document.getElementById('btn-export').addEventListener('click', () => this.exportData());
    document.getElementById('btn-help').addEventListener('click', () => this.showHelp());
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
    
    console.log('🔄 Services en arrière-plan démarrés');
  }
  
  /**
   * Configure la sauvegarde automatique
   */
  setupAutoSave() {
    if (this.config.autoSaveInterval > 0) {
      setInterval(() => {
        this.autoSave();
      }, this.config.autoSaveInterval);
      
      console.log(`💾 Sauvegarde automatique configurée (${this.config.autoSaveInterval}ms)`);
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
      toggleDebug: () => this.toggleDebugMode()
    };
    
    console.log('🔌 APIs publiques exposées');
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
    // Nettoyer les tooltips orphelins
    document.querySelectorAll('.tooltip').forEach(tooltip => {
      if (!document.body.contains(tooltip)) {
        tooltip.remove();
      }
    });
    
    // Nettoyer le localStorage
    this.cleanupLocalStorage();
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
      const state = this.components.kanbanManager.exportFullState();
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
    
    console.log(`✅ ${description} prêt après ${Math.round((Date.now() - start)/1000)}s`);
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
      retryCount: this.retryCount
    };
  }
}

// === INITIALISATION AUTOMATIQUE ===
let appInitializer = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 DOMContentLoaded déclenché - Début initialisation app-initializer');
  try {
    console.log('🏗️ Création KanbanAppInitializer...');
    appInitializer = new KanbanAppInitializer();
    console.log('✅ KanbanAppInitializer créé');
    
    console.log('🚀 Lancement appInitializer.init()...');
    await appInitializer.init();
    console.log('✅ appInitializer.init() terminé avec succès');
  } catch (error) {
    console.error('❌ Échec de l\'initialisation de l\'application:', error);
    console.error('❌ Stack trace complète:', error.stack);
  }
});

// Exposition globale
window.KanbanAppInitializer = KanbanAppInitializer;
window.kanbanAppInitializer = appInitializer;
