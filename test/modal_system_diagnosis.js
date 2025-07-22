// === DIAGNOSTIC COMPLET SYSTÈME MODAL ===
console.log('🔬 === DIAGNOSTIC COMPLET SYSTÈME MODAL ===');

class ModalSystemDiagnostic {
  constructor() {
    this.issues = [];
  }

  runFullDiagnosis() {
    console.log('🔍 Lancement diagnostic complet...');
    
    this.checkBootstrapVersion();
    this.checkModalStructure();
    this.checkCSSStyles();
    this.checkZIndexLayers();
    this.checkEventListeners();
    this.trackModalStates();
    
    this.generateReport();
  }

  checkBootstrapVersion() {
    console.log('\n📦 1. VÉRIFICATION BOOTSTRAP');
    
    if (typeof bootstrap === 'undefined') {
      this.addIssue('CRITICAL', 'Bootstrap non chargé');
      return;
    }
    
    console.log('✅ Bootstrap disponible');
    
    // Tester création modal
    const testDiv = document.createElement('div');
    testDiv.className = 'modal';
    testDiv.style.display = 'none';
    document.body.appendChild(testDiv);
    
    try {
      const testModal = new bootstrap.Modal(testDiv);
      console.log('✅ Bootstrap Modal fonctionne');
      testModal.dispose();
    } catch (error) {
      this.addIssue('CRITICAL', `Bootstrap Modal défaillant: ${error.message}`);
    }
    
    document.body.removeChild(testDiv);
  }

  checkModalStructure() {
    console.log('\n🏗️ 2. STRUCTURE DES MODALES');
    
    const modals = ['popup-tache', 'history-modal', 'strategy-mini-modal'];
    
    modals.forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (!modal) {
        this.addIssue('HIGH', `Modal ${modalId} manquante dans DOM`);
        return;
      }
      
      console.log(`✅ ${modalId} présente`);
      
      // Vérifier structure Bootstrap
      const hasModalClass = modal.classList.contains('modal');
      const hasModalDialog = modal.querySelector('.modal-dialog');
      const hasModalContent = modal.querySelector('.modal-content');
      const hasModalBody = modal.querySelector('.modal-body');
      
      console.log(`   → Classes modal: ${hasModalClass}`);
      console.log(`   → Modal-dialog: ${hasModalDialog ? 'Oui' : 'Non'}`);
      console.log(`   → Modal-content: ${hasModalContent ? 'Oui' : 'Non'}`);
      console.log(`   → Modal-body: ${hasModalBody ? 'Oui' : 'Non'}`);
      
      if (!hasModalClass) this.addIssue('HIGH', `${modalId} manque classe 'modal'`);
      if (!hasModalDialog) this.addIssue('MEDIUM', `${modalId} manque .modal-dialog`);
      if (!hasModalContent) this.addIssue('HIGH', `${modalId} manque .modal-content`);
      if (!hasModalBody) this.addIssue('MEDIUM', `${modalId} manque .modal-body`);
      
      // Vérifier styles computed
      const styles = window.getComputedStyle(modal);
      console.log(`   → Position: ${styles.position}`);
      console.log(`   → Z-index: ${styles.zIndex}`);
      console.log(`   → Display: ${styles.display}`);
    });
  }

  checkCSSStyles() {
    console.log('\n🎨 3. STYLES CSS ET CONFLITS');
    
    // Vérifier les règles CSS qui peuvent poser problème
    const problematicSelectors = [
      '.modal',
      '.modal-backdrop',
      '.modal-open',
      'body.modal-open'
    ];
    
    problematicSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`📋 ${selector}: ${elements.length} éléments`);
        
        elements.forEach((el, index) => {
          const styles = window.getComputedStyle(el);
          if (selector === '.modal' || selector === '.modal-backdrop') {
            console.log(`   → ${index + 1}: z-index=${styles.zIndex}, display=${styles.display}, position=${styles.position}`);
          }
        });
      }
    });
    
    // Vérifier les conflits de z-index
    const allElements = document.querySelectorAll('*');
    const highZIndex = [];
    
    allElements.forEach(el => {
      const zIndex = parseInt(window.getComputedStyle(el).zIndex);
      if (zIndex > 1000) {
        highZIndex.push({
          element: el,
          zIndex: zIndex,
          tagName: el.tagName,
          classes: el.className,
          id: el.id
        });
      }
    });
    
    if (highZIndex.length > 0) {
      console.log(`⚠️ ${highZIndex.length} éléments avec z-index élevé détectés:`);
      highZIndex.forEach(item => {
        console.log(`   → ${item.tagName}#${item.id}.${item.classes}: z-index=${item.zIndex}`);
      });
    }
  }

  checkZIndexLayers() {
    console.log('\n📏 4. COUCHES Z-INDEX');
    
    const layers = [
      { name: 'Contenu normal', range: '0-999' },
      { name: 'Modales Bootstrap', range: '1040-1060' },
      { name: 'Tooltips/Dropdowns', range: '1000-1030' },
      { name: 'Navigation fixe', range: '1020-1040' },
      { name: 'Éléments critiques', range: '9999+' }
    ];
    
    console.log('📊 Couches recommandées:');
    layers.forEach(layer => {
      console.log(`   → ${layer.name}: ${layer.range}`);
    });
    
    // Vérifier les modales existantes
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      const zIndex = window.getComputedStyle(modal).zIndex;
      console.log(`   → ${modal.id}: z-index actuel = ${zIndex}`);
      
      if (zIndex === 'auto' || parseInt(zIndex) < 1040) {
        this.addIssue('HIGH', `${modal.id} z-index trop bas: ${zIndex}`);
      }
    });
  }

  checkEventListeners() {
    console.log('\n👂 5. EVENT LISTENERS');
    
    // Vérifier SimpleClickHandler
    const handler = window.kanbanManager?.simpleClickHandler;
    console.log(`   → SimpleClickHandler: ${handler ? 'Présent' : 'Manquant'}`);
    
    if (handler) {
      console.log(`   → handleClick: ${typeof handler.handleClick}`);
      console.log(`   → openTimeline: ${typeof handler.openTimeline}`);
    }
    
    // Vérifier les managers
    const managers = ['modalManager', 'historyManager'];
    managers.forEach(managerName => {
      const manager = window.kanbanManager?.[managerName];
      console.log(`   → ${managerName}: ${manager ? 'Présent' : 'Manquant'}`);
    });
  }

  trackModalStates() {
    console.log('\n📊 6. ÉTAT ACTUEL DES MODALES');
    
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      const styles = window.getComputedStyle(modal);
      const isVisible = styles.display !== 'none';
      const hasShow = modal.classList.contains('show');
      const bsInstance = bootstrap.Modal.getInstance(modal);
      
      console.log(`📋 ${modal.id}:`);
      console.log(`   → Display: ${styles.display}`);
      console.log(`   → Classe 'show': ${hasShow}`);
      console.log(`   → Instance Bootstrap: ${bsInstance ? 'Oui' : 'Non'}`);
      console.log(`   → Visible à l'écran: ${isVisible && hasShow}`);
      
      if (isVisible && !hasShow) {
        this.addIssue('MEDIUM', `${modal.id} display=block mais pas de classe 'show'`);
      }
      
      if (!isVisible && hasShow) {
        this.addIssue('HIGH', `${modal.id} a classe 'show' mais display=none`);
      }
    });
  }

  addIssue(level, description) {
    this.issues.push({ level, description });
    const emoji = level === 'CRITICAL' ? '🚨' : level === 'HIGH' ? '⚠️' : '📝';
    console.log(`${emoji} ${level}: ${description}`);
  }

  generateReport() {
    console.log('\n📋 === RAPPORT DIAGNOSTIC ===');
    
    const criticalIssues = this.issues.filter(i => i.level === 'CRITICAL');
    const highIssues = this.issues.filter(i => i.level === 'HIGH');
    const mediumIssues = this.issues.filter(i => i.level === 'MEDIUM');
    
    console.log(`🚨 Problèmes critiques: ${criticalIssues.length}`);
    console.log(`⚠️ Problèmes importants: ${highIssues.length}`);
    console.log(`📝 Problèmes moyens: ${mediumIssues.length}`);
    
    if (criticalIssues.length === 0 && highIssues.length === 0) {
      console.log('✅ DIAGNOSTIC: Structure des modales correcte');
      console.log('🔍 Problème probable: Timing ou événements');
    } else {
      console.log('❌ DIAGNOSTIC: Problèmes structurels détectés');
    }
    
    // Recommandations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('\n💡 === RECOMMANDATIONS ===');
    
    if (this.issues.some(i => i.description.includes('Bootstrap'))) {
      console.log('🔧 1. Vérifier compatibilité Bootstrap');
    }
    
    if (this.issues.some(i => i.description.includes('z-index'))) {
      console.log('🔧 2. Corriger les z-index des modales');
    }
    
    if (this.issues.some(i => i.description.includes('show'))) {
      console.log('🔧 3. Problème de synchronisation classe show/display');
    }
    
    console.log('🔧 4. Test recommandé: Simuler ouverture manuelle');
  }

  // Test d'ouverture manuelle
  testModalOpening() {
    console.log('\n🧪 === TEST OUVERTURE MANUELLE ===');
    
    const modal = document.getElementById('history-modal');
    if (!modal) {
      console.log('❌ Modal history-modal non trouvée');
      return;
    }
    
    console.log('🔧 Test ouverture Bootstrap...');
    
    try {
      const bsModal = new bootstrap.Modal(modal);
      console.log('✅ Instance Bootstrap créée');
      
      bsModal.show();
      console.log('✅ show() appelé');
      
      // Vérifier après 1s
      setTimeout(() => {
        const isVisible = modal.classList.contains('show');
        const display = window.getComputedStyle(modal).display;
        
        console.log('📊 Résultat après 1s:');
        console.log(`   → Classe show: ${isVisible}`);
        console.log(`   → Display: ${display}`);
        console.log(`   → Réellement visible: ${isVisible && display === 'block'}`);
        
        if (isVisible && display === 'block') {
          console.log('✅ TEST RÉUSSI: Modal s\'ouvre correctement');
          
          // Fermer après 3s
          setTimeout(() => {
            bsModal.hide();
            console.log('🔒 Modal fermée');
          }, 3000);
        } else {
          console.log('❌ TEST ÉCHOUÉ: Modal ne s\'affiche pas');
        }
      }, 1000);
      
    } catch (error) {
      console.log('❌ Erreur test:', error.message);
    }
  }
}

// Lancement du diagnostic
const diagnostic = new ModalSystemDiagnostic();
diagnostic.runFullDiagnosis();

// Export pour utilisation
window.modalDiagnostic = diagnostic;
window.testModalOpening = () => diagnostic.testModalOpening();

console.log('\n🔧 Fonctions disponibles:');
console.log('   → testModalOpening() - Test ouverture manuelle');
console.log('   → modalDiagnostic.runFullDiagnosis() - Relancer diagnostic');