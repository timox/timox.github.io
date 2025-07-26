// === CHASSE AUX ERREURS SYSTÉMATIQUE ===
console.log('🔍 === DIAGNOSTIC ERREURS JAVASCRIPT ===');

class ErrorHunter {
  constructor() {
    this.errors = [];
    this.originalConsoleError = console.error;
    this.originalWindowOnError = window.onerror;
    this.init();
  }

  init() {
    console.log('🎯 Initialisation chasseur d\'erreurs...');
    this.setupErrorCapture();
    this.setupConsoleMonitor();
    this.trackMethodCalls();
  }

  setupErrorCapture() {
    // Capturer toutes les erreurs JavaScript
    window.onerror = (message, source, lineno, colno, error) => {
      this.logError('WINDOW_ERROR', {
        message,
        source,
        line: lineno,
        column: colno,
        error: error?.stack
      });
      
      // Appeler l'original si il existe
      if (this.originalWindowOnError) {
        return this.originalWindowOnError(message, source, lineno, colno, error);
      }
    };

    // Capturer les promesses rejetées
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('PROMISE_REJECTION', {
        reason: event.reason,
        promise: event.promise
      });
    });

    console.log('✅ Capture d\'erreurs activée');
  }

  setupConsoleMonitor() {
    // Intercepter console.error pour voir tous les messages
    console.error = (...args) => {
      this.logError('CONSOLE_ERROR', {
        args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        )
      });
      
      // Appeler l'original
      this.originalConsoleError.apply(console, args);
    };

    console.log('✅ Monitor console.error activé');
  }

  trackMethodCalls() {
    // Tracer les appels aux méthodes critiques
    this.wrapMethod('historyManager', 'openTaskHistory');
    this.wrapMethod('modalManager', 'historyModal.show');
    this.wrapMethod('simpleClickHandler', 'handleClick');
    
    console.log('✅ Tracking méthodes critiques activé');
  }

  wrapMethod(managerName, methodPath) {
    setTimeout(() => {
      const manager = window.kanbanManager?.[managerName];
      if (!manager) {
        console.log(`⚠️ ${managerName} non trouvé pour wrapping`);
        return;
      }

      const pathParts = methodPath.split('.');
      let obj = manager;
      
      // Naviguer jusqu'à l'objet parent
      for (let i = 0; i < pathParts.length - 1; i++) {
        obj = obj[pathParts[i]];
        if (!obj) {
          console.log(`⚠️ ${managerName}.${pathParts.slice(0, i+1).join('.')} non trouvé`);
          return;
        }
      }

      const methodName = pathParts[pathParts.length - 1];
      const originalMethod = obj[methodName];

      if (typeof originalMethod !== 'function') {
        console.log(`⚠️ ${managerName}.${methodPath} n'est pas une fonction`);
        return;
      }

      // Wrapper la méthode
      obj[methodName] = (...args) => {
        console.log(`📞 CALL: ${managerName}.${methodPath}`, args);
        
        try {
          const result = originalMethod.apply(obj, args);
          console.log(`✅ SUCCESS: ${managerName}.${methodPath}`);
          return result;
        } catch (error) {
          this.logError('METHOD_ERROR', {
            method: `${managerName}.${methodPath}`,
            args,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      };

      console.log(`✅ Wrapped: ${managerName}.${methodPath}`);
    }, 2000);
  }

  logError(type, details) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type,
      details
    };

    this.errors.push(errorEntry);
    
    console.log(`🚨 ERROR CAPTURED [${type}]:`, details);
  }

  // Diagnostic spécifique du problème de modale
  diagnoseModalIssue() {
    console.log('\n🎯 === DIAGNOSTIC SPÉCIFIQUE MODALE ===');
    
    // Test 1: Éléments DOM
    const historyModal = document.getElementById('history-modal');
    console.log('1. DOM Elements:');
    console.log('   → history-modal exists:', !!historyModal);
    
    if (historyModal) {
      console.log('   → classes:', historyModal.className);
      console.log('   → display:', window.getComputedStyle(historyModal).display);
    }

    // Test 2: KanbanManager
    console.log('2. KanbanManager:');
    console.log('   → exists:', !!window.kanbanManager);
    console.log('   → modalManager:', !!window.kanbanManager?.modalManager);
    console.log('   → historyModal instance:', !!window.kanbanManager?.modalManager?.historyModal);

    // Test 3: Bootstrap
    console.log('3. Bootstrap:');
    console.log('   → available:', typeof bootstrap !== 'undefined');
    console.log('   → Modal class:', typeof bootstrap?.Modal !== 'undefined');

    // Test 4: Simuler le chemin exact
    console.log('4. Test chemin exact:');
    try {
      const taskId = 102;
      const task = window.kanbanManager?.currentRecords?.find(r => r.id === taskId);
      console.log('   → task found:', !!task);
      
      if (task) {
        console.log('   → task title:', task.titre);
        
        // Test condition exacte du code
        const condition = window.kanbanManager?.modalManager?.historyModal;
        console.log('   → condition passed:', !!condition);
        
        if (condition) {
          console.log('   → about to call show()...');
          // NE PAS appeler show() ici, juste logger
          console.log('   → show() would be called on:', condition.constructor.name);
        }
      }
    } catch (error) {
      console.log('   → ERROR in path test:', error.message);
    }
  }

  // Test direct bootstrap
  testBootstrapDirect() {
    console.log('\n🧪 === TEST BOOTSTRAP DIRECT ===');
    
    const modal = document.getElementById('history-modal');
    if (!modal) {
      console.log('❌ Modal element not found');
      return;
    }

    try {
      console.log('🔧 Creating Bootstrap Modal instance...');
      const bsModal = new bootstrap.Modal(modal);
      console.log('✅ Instance created:', bsModal.constructor.name);
      
      console.log('🚀 Calling show()...');
      bsModal.show();
      console.log('✅ show() called successfully');
      
      // Vérifier après 1s
      setTimeout(() => {
        console.log('📊 Modal state after 1s:');
        console.log('   → classes:', modal.className);
        console.log('   → display:', window.getComputedStyle(modal).display);
        console.log('   → is shown:', modal.classList.contains('show'));
      }, 1000);
      
    } catch (error) {
      console.log('❌ Bootstrap test failed:', error.message);
      console.log('❌ Stack:', error.stack);
    }
  }

  // Rapport complet
  generateReport() {
    console.log('\n📊 === RAPPORT ERREURS ===');
    console.log(`Total erreurs capturées: ${this.errors.length}`);
    
    if (this.errors.length === 0) {
      console.log('✅ Aucune erreur JavaScript détectée');
    } else {
      this.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. [${error.type}] ${error.timestamp}`);
        console.log('   Details:', error.details);
      });
    }
    
    return this.errors;
  }

  // Reset et nettoyage
  cleanup() {
    console.error = this.originalConsoleError;
    window.onerror = this.originalWindowOnError;
    console.log('🧹 Error hunter nettoyé');
  }
}

// Créer le chasseur d'erreurs
const errorHunter = new ErrorHunter();

// Export des méthodes
window.errorHunter = errorHunter;
window.diagnoseModalIssue = () => errorHunter.diagnoseModalIssue();
window.testBootstrapDirect = () => errorHunter.testBootstrapDirect();
window.generateErrorReport = () => errorHunter.generateReport();

console.log('🔧 Chasseur d\'erreurs activé !');
console.log('');
console.log('📝 Fonctions disponibles:');
console.log('   → diagnoseModalIssue() - diagnostic spécifique');
console.log('   → testBootstrapDirect() - test Bootstrap direct');
console.log('   → generateErrorReport() - rapport complet erreurs');
console.log('');
console.log('🎯 MAINTENANT: Reproduisez le problème, les erreurs seront capturées automatiquement !');