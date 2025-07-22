// === ANALYSE CHARGEMENT PAGE ===
console.log('📄 === ANALYSE CHARGEMENT PAGE ===');

// Log immédiat de l'état du DOM
console.log('📋 ÉTAT INITIAL DU DOM:');
console.log('   → document.readyState:', document.readyState);
console.log('   → Scripts chargés:', document.scripts.length);
console.log('   → Éléments avec ID:', document.querySelectorAll('[id]').length);

// Vérifier les modales immédiatement
const modalCheck = {
  'history-modal': document.getElementById('history-modal'),
  'strategy-mini-modal': document.getElementById('strategy-mini-modal'),
  'popup-tache': document.getElementById('popup-tache'),
  'jalonModal': document.getElementById('jalonModal')
};

console.log('\n🔍 MODALES AU CHARGEMENT:');
Object.entries(modalCheck).forEach(([id, element]) => {
  if (element) {
    console.log(`✅ ${id}: PRÉSENTE`);
    console.log(`   → Position dans DOM: ${Array.from(document.body.children).indexOf(element)}`);
    console.log(`   → Classes: ${element.className}`);
  } else {
    console.log(`❌ ${id}: ABSENTE`);
  }
});

// Analyser tous les scripts chargés
console.log('\n📜 SCRIPTS CHARGÉS:');
Array.from(document.scripts).forEach((script, index) => {
  if (script.src) {
    console.log(`${index + 1}. ${script.src}`);
  } else if (script.textContent.trim()) {
    const content = script.textContent.trim();
    const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    console.log(`${index + 1}. Inline: ${preview}`);
  }
});

// Observer tous les changements pendant les 30 premières secondes
let changeCount = 0;
const startTime = Date.now();

const loadObserver = new MutationObserver((mutations) => {
  const elapsed = Date.now() - startTime;
  if (elapsed > 30000) return; // Arrêter après 30s
  
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.tagName) {
          changeCount++;
          if (node.id && node.id.includes('modal')) {
            console.log(`🚨 [${elapsed}ms] MODAL SUPPRIMÉE: ${node.id}`);
            console.trace('Stack trace suppression modal');
          } else if (node.tagName === 'DIV' && node.className.includes('modal')) {
            console.log(`🚨 [${elapsed}ms] DIV MODAL SUPPRIMÉE: ${node.className}`);
          }
        }
      });
      
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.tagName) {
          if (node.id && node.id.includes('modal')) {
            console.log(`✨ [${elapsed}ms] MODAL AJOUTÉE: ${node.id}`);
          }
          
          // Détecter ajout de scripts suspects
          if (node.tagName === 'SCRIPT') {
            console.log(`📜 [${elapsed}ms] SCRIPT AJOUTÉ:`, node.src || 'inline');
          }
        }
      });
    }
  });
  
  // Log périodique des changements
  if (changeCount > 0 && changeCount % 10 === 0) {
    console.log(`📊 [${elapsed}ms] ${changeCount} changements DOM détectés`);
  }
});

loadObserver.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Arrêter l'observation après 30 secondes
setTimeout(() => {
  loadObserver.disconnect();
  console.log(`🏁 ANALYSE TERMINÉE: ${changeCount} changements DOM en 30 secondes`);
  
  // Vérification finale
  console.log('\n🔍 ÉTAT FINAL DES MODALES:');
  Object.entries(modalCheck).forEach(([id, initialElement]) => {
    const currentElement = document.getElementById(id);
    if (initialElement && currentElement) {
      console.log(`✅ ${id}: TOUJOURS PRÉSENTE`);
    } else if (initialElement && !currentElement) {
      console.log(`❌ ${id}: SUPPRIMÉE PENDANT LE CHARGEMENT`);
    } else if (!initialElement && currentElement) {
      console.log(`✨ ${id}: AJOUTÉE PENDANT LE CHARGEMENT`);
    } else {
      console.log(`⚫ ${id}: ABSENTE (initial et final)`);
    }
  });
}, 30000);

// Fonction pour analyser les event listeners
function analyzeEventListeners() {
  console.log('\n👂 ANALYSE EVENT LISTENERS:');
  
  // Chercher les event listeners sur le body et document
  const bodyEvents = getEventListeners ? getEventListeners(document.body) : 'Non disponible';
  const docEvents = getEventListeners ? getEventListeners(document) : 'Non disponible';
  
  console.log('Body events:', bodyEvents);
  console.log('Document events:', docEvents);
  
  // Chercher des patterns suspects
  const suspiciousFunctions = [
    'innerHTML = ',
    '.remove(',
    '.removeChild(',
    'clear()',
    'reset()'
  ];
  
  console.log('\n🔍 RECHERCHE FONCTIONS SUSPECTES DANS LE CODE:');
  // Cette partie nécessiterait l'accès au source code des scripts
}

// Export des fonctions
window.analyzeEventListeners = analyzeEventListeners;
window.pageLoadAnalysis = {
  initialModalCheck: modalCheck,
  startTime: startTime,
  getChangeCount: () => changeCount
};

console.log('\n🔧 Analyse en cours pendant 30 secondes...');
console.log('📊 Utilisez pageLoadAnalysis pour accéder aux données');