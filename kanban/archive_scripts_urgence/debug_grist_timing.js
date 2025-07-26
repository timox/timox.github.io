// === DIAGNOSTIC TIMING GRIST VS MODALES ===
console.log('⏰ === DIAGNOSTIC TIMING GRIST/MODALES ===');

class GristModalTiming {
  constructor() {
    this.events = [];
    this.modalState = {};
    this.init();
  }

  init() {
    console.log('🚀 Initialisation surveillance timing Grist/Modales...');
    
    // 1. Observer l'état initial
    this.logEvent('INIT', 'Démarrage surveillance');
    this.checkModalState('INIT');
    
    // 2. Intercepter les événements Grist
    this.interceptGristEvents();
    
    // 3. Observer les changements DOM
    this.observeDOM();
    
    // 4. Surveiller périodiquement
    this.startPeriodicCheck();
  }

  logEvent(type, description, data = null) {
    const event = {
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString(),
      type,
      description,
      data
    };
    
    this.events.push(event);
    console.log(`📊 [${event.time}] ${type}: ${description}`, data || '');
  }

  checkModalState(context) {
    const historyModal = document.getElementById('history-modal');
    const strategyModal = document.getElementById('strategy-mini-modal');
    
    const state = {
      history: historyModal !== null,
      strategy: strategyModal !== null,
      historyDisplay: historyModal ? window.getComputedStyle(historyModal).display : 'N/A',
      strategyDisplay: strategyModal ? window.getComputedStyle(strategyModal).display : 'N/A'
    };
    
    this.modalState[context] = state;
    
    console.log(`🔍 État modales [${context}]:`, state);
    
    return state;
  }

  interceptGristEvents() {
    console.log('🕵️ Interception événements Grist...');
    
    // Intercepter les messages de l'API Grist
    const originalPostMessage = window.postMessage;
    window.postMessage = (message, targetOrigin, transfer) => {
      if (typeof message === 'object' && message) {
        this.logEvent('GRIST_MESSAGE', 'Message Grist détecté', {
          type: message.type || 'unknown',
          method: message.method || 'unknown'
        });
        
        // Vérifier l'état des modales après chaque message Grist
        setTimeout(() => {
          this.checkModalState('AFTER_GRIST_MESSAGE');
        }, 100);
      }
      
      return originalPostMessage.call(window, message, targetOrigin, transfer);
    };
    
    // Observer les événements personnalisés de Grist
    ['grist-ready', 'grist-doc-loaded', 'grist-record-changed'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        this.logEvent('GRIST_EVENT', `Événement ${eventName}`, e.detail);
        setTimeout(() => {
          this.checkModalState(`AFTER_${eventName.toUpperCase()}`);
        }, 100);
      });
    });
    
    // Observer les modifications sur l'objet window.grist
    if (window.grist) {
      this.logEvent('GRIST_AVAILABLE', 'API Grist déjà disponible');
    }
    
    // Surveiller l'apparition de window.grist
    let gristCheckInterval = setInterval(() => {
      if (window.grist && !this.gristDetected) {
        this.gristDetected = true;
        this.logEvent('GRIST_DETECTED', 'API Grist détectée');
        this.checkModalState('GRIST_DETECTED');
        clearInterval(gristCheckInterval);
        
        // Intercepter les méthodes de l'API Grist
        this.interceptGristAPI();
      }
    }, 100);
    
    console.log('✅ Interceptions Grist actives');
  }

  interceptGristAPI() {
    if (!window.grist) return;
    
    console.log('🔧 Interception API Grist...');
    
    // Intercepter fetchTable
    if (window.grist.docApi && window.grist.docApi.fetchTable) {
      const originalFetchTable = window.grist.docApi.fetchTable;
      window.grist.docApi.fetchTable = async function(...args) {
        console.log('📊 Grist fetchTable appelé', args);
        const result = await originalFetchTable.apply(this, args);
        
        // Vérifier l'état des modales après fetchTable
        setTimeout(() => {
          window.gristModalTiming.checkModalState('AFTER_FETCH_TABLE');
        }, 200);
        
        return result;
      };
    }
    
    // Intercepter ready()
    if (window.grist.ready) {
      const originalReady = window.grist.ready;
      window.grist.ready = function(...args) {
        console.log('🚀 Grist ready() appelé');
        const result = originalReady.apply(this, args);
        
        setTimeout(() => {
          window.gristModalTiming.checkModalState('AFTER_GRIST_READY');
        }, 500);
        
        return result;
      };
    }
  }

  observeDOM() {
    console.log('👁️ Observation DOM active...');
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Observer les suppressions de modales
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.id && 
                (node.id === 'history-modal' || node.id === 'strategy-mini-modal')) {
              
              this.logEvent('MODAL_REMOVED', `Modal ${node.id} supprimée`, {
                target: mutation.target.tagName,
                targetId: mutation.target.id
              });
              
              // Stack trace pour identifier qui supprime
              console.trace('🚨 SUPPRESSION MODAL DÉTECTÉE');
            }
          });
        }
        
        // Observer les modifications du body ou des containers principaux
        if (mutation.target === document.body || 
            (mutation.target.id && mutation.target.id.includes('container'))) {
          
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            this.logEvent('DOM_CHANGE', `Changement ${mutation.type} sur ${mutation.target.tagName}#${mutation.target.id}`);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'class', 'style']
    });
  }

  startPeriodicCheck() {
    console.log('⏰ Surveillance périodique démarrée...');
    
    setInterval(() => {
      const currentState = this.checkModalState('PERIODIC_CHECK');
      
      // Comparer avec le dernier état connu
      const lastState = Object.values(this.modalState).pop();
      
      if (lastState && 
          (currentState.history !== lastState.history || 
           currentState.strategy !== lastState.strategy)) {
        
        this.logEvent('MODAL_STATE_CHANGED', 'État des modales changé', {
          from: lastState,
          to: currentState
        });
      }
    }, 3000);
  }

  generateReport() {
    console.log('\n📋 === RAPPORT TIMING GRIST/MODALES ===');
    
    console.log('\n⏰ Chronologie des événements:');
    this.events.forEach(event => {
      console.log(`[${event.time}] ${event.type}: ${event.description}`);
      if (event.data) {
        console.log('   →', event.data);
      }
    });
    
    console.log('\n🏁 États des modales:');
    Object.entries(this.modalState).forEach(([context, state]) => {
      console.log(`${context}:`, state);
    });
    
    // Identifier les corrélations
    console.log('\n🔍 Analyse des corrélations:');
    const modalChanges = this.events.filter(e => e.type === 'MODAL_STATE_CHANGED' || e.type === 'MODAL_REMOVED');
    const gristEvents = this.events.filter(e => e.type.includes('GRIST'));
    
    console.log(`   → ${modalChanges.length} changements de modales détectés`);
    console.log(`   → ${gristEvents.length} événements Grist détectés`);
    
    if (modalChanges.length > 0 && gristEvents.length > 0) {
      console.log('⚠️ Corrélation possible entre événements Grist et changements modales');
    }
  }

  // Méthode de test pour forcer un événement
  testModalPresence() {
    console.log('\n🧪 TEST PRÉSENCE MODALES:');
    
    const history = document.getElementById('history-modal');
    const strategy = document.getElementById('strategy-mini-modal');
    
    console.log('history-modal:', history ? '✅ PRÉSENTE' : '❌ ABSENTE');
    console.log('strategy-mini-modal:', strategy ? '✅ PRÉSENTE' : '❌ ABSENTE');
    
    if (!history || !strategy) {
      console.log('🚨 MODALES MANQUANTES - MOMENT CRITIQUE !');
      this.logEvent('CRITICAL_MISSING', 'Modales manquantes détectées pendant test');
    }
    
    return { history: !!history, strategy: !!strategy };
  }
}

// Démarrage immédiat
const gristModalTiming = new GristModalTiming();

// Export global
window.gristModalTiming = gristModalTiming;
window.testModalPresence = () => gristModalTiming.testModalPresence();
window.modalTimingReport = () => gristModalTiming.generateReport();

console.log('\n🔧 Fonctions disponibles:');
console.log('   → testModalPresence() - Tester présence modales');
console.log('   → modalTimingReport() - Rapport complet');
console.log('   → gristModalTiming.generateReport() - Rapport détaillé');