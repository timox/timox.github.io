// === DIAGNOSTIC SUPPRESSION MODALES ===
console.log('🔍 === DIAGNOSTIC SUPPRESSION MODALES ===');

class ModalRemovalDetector {
  constructor() {
    this.modalSelectors = ['history-modal', 'strategy-mini-modal'];
    this.observations = [];
    this.init();
  }

  init() {
    console.log('🚀 Initialisation détecteur suppression modales...');
    
    // 1. Vérifier l'état initial
    this.checkInitialState();
    
    // 2. Observer les mutations DOM
    this.startDOMObserver();
    
    // 3. Surveiller les scripts qui s'exécutent
    this.interceptDOM();
    
    // 4. Surveillance périodique
    this.startPeriodicChecks();
  }

  checkInitialState() {
    console.log('\n📊 ÉTAT INITIAL:');
    
    this.modalSelectors.forEach(modalId => {
      const modal = document.getElementById(modalId);
      const exists = modal !== null;
      const visible = exists ? window.getComputedStyle(modal).display !== 'none' : false;
      
      console.log(`   → ${modalId}:`);
      console.log(`     - Existe: ${exists}`);
      if (exists) {
        console.log(`     - Display: ${window.getComputedStyle(modal).display}`);
        console.log(`     - Visibility: ${window.getComputedStyle(modal).visibility}`);
        console.log(`     - Parent: ${modal.parentNode ? modal.parentNode.tagName : 'NO PARENT'}`);
        console.log(`     - Classes: ${modal.className}`);
      }
      
      this.observations.push({
        timestamp: Date.now(),
        modalId,
        action: 'initial_check',
        exists,
        visible,
        parentNode: exists ? modal.parentNode?.tagName : null
      });
    });
  }

  startDOMObserver() {
    console.log('\n👁️ Démarrage surveillance DOM...');
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        
        // Observer les suppressions
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.id && this.modalSelectors.includes(node.id)) {
              console.log(`🚨 SUPPRESSION DÉTECTÉE: ${node.id}`);
              console.log('   → Target:', mutation.target);
              console.log('   → Stack trace:');
              console.trace();
              
              this.observations.push({
                timestamp: Date.now(),
                modalId: node.id,
                action: 'removed',
                target: mutation.target.tagName,
                targetId: mutation.target.id
              });
            }
          });
        }
        
        // Observer les ajouts
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.id && this.modalSelectors.includes(node.id)) {
              console.log(`✅ AJOUT DÉTECTÉ: ${node.id}`);
              
              this.observations.push({
                timestamp: Date.now(),
                modalId: node.id,
                action: 'added',
                target: mutation.target.tagName,
                targetId: mutation.target.id
              });
            }
          });
        }
        
        // Observer les modifications d'attributs (display, style, etc.)
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.id && this.modalSelectors.includes(target.id)) {
            console.log(`⚡ MODIFICATION DÉTECTÉE: ${target.id} - ${mutation.attributeName}`);
            console.log(`   → Nouvelle valeur: ${target.getAttribute(mutation.attributeName)}`);
            
            this.observations.push({
              timestamp: Date.now(),
              modalId: target.id,
              action: 'attribute_changed',
              attribute: mutation.attributeName,
              newValue: target.getAttribute(mutation.attributeName)
            });
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'id', 'data-bs-dismiss']
    });

    console.log('✅ Surveillance DOM active');
  }

  interceptDOM() {
    console.log('\n🕵️ Interception méthodes DOM...');
    
    // Intercepter remove()
    const originalRemove = Element.prototype.remove;
    Element.prototype.remove = function() {
      if (this.id && this.id.includes('modal')) {
        console.log(`🚨 INTERCEPTION remove() sur: ${this.id}`);
        console.trace();
      }
      return originalRemove.call(this);
    };
    
    // Intercepter removeChild()
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
      if (child.id && child.id.includes('modal')) {
        console.log(`🚨 INTERCEPTION removeChild() sur: ${child.id}`);
        console.trace();
      }
      return originalRemoveChild.call(this, child);
    };
    
    // Intercepter innerHTML = ''
    const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value) {
        if (this.innerHTML && this.innerHTML.includes('modal') && !value.includes('modal')) {
          console.log(`🚨 INTERCEPTION innerHTML clear qui supprime modales sur:`, this);
          console.trace();
        }
        return originalInnerHTMLSetter.call(this, value);
      },
      get: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').get
    });
    
    console.log('✅ Interceptions DOM actives');
  }

  startPeriodicChecks() {
    console.log('\n⏰ Démarrage vérifications périodiques...');
    
    setInterval(() => {
      let changesDetected = false;
      
      this.modalSelectors.forEach(modalId => {
        const modal = document.getElementById(modalId);
        const exists = modal !== null;
        
        // Comparer avec la dernière observation
        const lastObs = this.observations
          .filter(obs => obs.modalId === modalId)
          .pop();
        
        if (lastObs && lastObs.exists !== exists) {
          console.log(`🔄 CHANGEMENT PÉRIODIQUE: ${modalId} - existe maintenant: ${exists}`);
          changesDetected = true;
          
          this.observations.push({
            timestamp: Date.now(),
            modalId,
            action: 'periodic_change',
            exists,
            previousExists: lastObs.exists
          });
        }
      });
      
      if (changesDetected) {
        console.log('📊 Rapport des changements détectés');
        this.generateReport();
      }
    }, 2000);
    
    console.log('✅ Vérifications périodiques actives (toutes les 2s)');
  }

  generateReport() {
    console.log('\n📋 === RAPPORT OBSERVATIONS ===');
    
    this.modalSelectors.forEach(modalId => {
      const modalObs = this.observations.filter(obs => obs.modalId === modalId);
      console.log(`\n🎯 ${modalId}:`);
      
      modalObs.forEach(obs => {
        const time = new Date(obs.timestamp).toLocaleTimeString();
        console.log(`   ${time} - ${obs.action}:`, obs);
      });
    });
    
    console.log('\n💡 Modales actuellement présentes:');
    this.modalSelectors.forEach(modalId => {
      const modal = document.getElementById(modalId);
      console.log(`   → ${modalId}: ${modal ? 'PRÉSENTE' : 'ABSENTE'}`);
    });
  }

  // Méthode d'urgence pour restaurer les modales
  restoreModals() {
    console.log('🔧 RESTAURATION D\'URGENCE DES MODALES...');
    
    this.modalSelectors.forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.log(`❌ ${modalId} manquante - tentative de restauration...`);
        
        // Chercher dans les backups ou les créer
        if (modalId === 'history-modal') {
          this.createHistoryModal();
        } else if (modalId === 'strategy-mini-modal') {
          this.createStrategyModal();
        }
      }
    });
  }

  createHistoryModal() {
    const modalHTML = `
      <div class="modal fade history-modal" id="history-modal" tabindex="-1" aria-labelledby="history-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="history-modal-label">
                <i class="bi bi-clock-history me-2"></i>Historique de la tâche
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div class="modal-body">
              <div id="history-stats" class="history-stats"></div>
              <div id="history-timeline" class="history-timeline"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ history-modal restaurée');
  }

  createStrategyModal() {
    const modalHTML = `
      <div class="modal fade" id="strategy-mini-modal" tabindex="-1" aria-labelledby="strategy-mini-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header py-2" style="background: linear-gradient(135deg, #0d6efd, #0056b3); color: white; border-bottom: none;">
              <h6 class="modal-title" id="strategy-mini-modal-label" style="font-size: 0.95rem; font-weight: 600;">
                <i class="bi bi-bullseye me-2"></i>Stratégies
              </h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer" style="filter: invert(1);"></button>
            </div>
            <div class="modal-body p-3">
              <div id="strategy-mini-content">
                <!-- Contenu généré dynamiquement -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ strategy-mini-modal restaurée');
  }
}

// Démarrage immédiat
const modalDetector = new ModalRemovalDetector();

// Export pour utilisation
window.modalDetector = modalDetector;
window.restoreModals = () => modalDetector.restoreModals();
window.modalReport = () => modalDetector.generateReport();

console.log('\n🔧 Fonctions disponibles:');
console.log('   → restoreModals() - Restaurer les modales manquantes');
console.log('   → modalReport() - Afficher le rapport des observations');
console.log('   → modalDetector.generateReport() - Rapport détaillé');