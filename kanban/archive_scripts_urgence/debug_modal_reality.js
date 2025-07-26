// === DIAGNOSTIC RÉALITÉ DES MODALES ===
// Vérifier pourquoi les logs disent "Modal ouverte" mais rien ne s'affiche

console.log('🔍 === DIAGNOSTIC RÉALITÉ MODALES ===');

function checkModalReality() {
  console.log('\n🎯 1. ÉTAT RÉEL DES MODALES BOOTSTRAP');
  
  // Toutes les modales
  const modals = document.querySelectorAll('.modal');
  console.log(`   → ${modals.length} modales trouvées dans le DOM`);
  
  modals.forEach((modal, index) => {
    const computedStyle = window.getComputedStyle(modal);
    console.log(`\n   📋 Modal ${index + 1}: ${modal.id}`);
    console.log(`      → display: ${computedStyle.display}`);
    console.log(`      → visibility: ${computedStyle.visibility}`);
    console.log(`      → opacity: ${computedStyle.opacity}`);
    console.log(`      → z-index: ${computedStyle.zIndex}`);
    console.log(`      → position: ${computedStyle.position}`);
    console.log(`      → top: ${computedStyle.top}`);
    console.log(`      → left: ${computedStyle.left}`);
    console.log(`      → Classes: ${modal.className}`);
    console.log(`      → Bootstrap instance:`, bootstrap.Modal.getInstance(modal));
    
    // Vérifier si la modale est "techniquement" ouverte
    const bsInstance = bootstrap.Modal.getInstance(modal);
    if (bsInstance) {
      console.log(`      → Bootstrap _isShown: ${bsInstance._isShown}`);
      console.log(`      → Bootstrap _element: ${bsInstance._element ? 'présent' : 'manquant'}`);
    }
  });
  
  console.log('\n🎯 2. BACKDROPS ET OVERLAYS');
  
  // Backdrops
  const backdrops = document.querySelectorAll('.modal-backdrop');
  console.log(`   → ${backdrops.length} backdrops trouvés`);
  
  backdrops.forEach((backdrop, index) => {
    const computedStyle = window.getComputedStyle(backdrop);
    console.log(`   Backdrop ${index + 1}:`);
    console.log(`      → display: ${computedStyle.display}`);
    console.log(`      → opacity: ${computedStyle.opacity}`);
    console.log(`      → z-index: ${computedStyle.zIndex}`);
    console.log(`      → Classes: ${backdrop.className}`);
  });
  
  // Autres overlays suspects
  const overlays = document.querySelectorAll('[style*="z-index"]');
  console.log(`   → ${overlays.length} éléments avec z-index inline trouvés`);
  
  overlays.forEach((overlay, index) => {
    if (parseInt(window.getComputedStyle(overlay).zIndex) > 1000) {
      console.log(`   Overlay ${index + 1}: z-index élevé détecté`);
      console.log(`      → Element: ${overlay.tagName}#${overlay.id}.${overlay.className}`);
      console.log(`      → z-index: ${window.getComputedStyle(overlay).zIndex}`);
      console.log(`      → display: ${window.getComputedStyle(overlay).display}`);
    }
  });
  
  console.log('\n🎯 3. ÉTAT DU BODY ET VIEWPORT');
  
  console.log(`   → Body classes: ${document.body.className}`);
  console.log(`   → Body overflow: ${document.body.style.overflow}`);
  console.log(`   → Body padding-right: ${document.body.style.paddingRight}`);
  console.log(`   → Viewport scroll: scrollY=${window.scrollY}, scrollX=${window.scrollX}`);
  
  console.log('\n🎯 4. CONTENEURS PARENTS');
  
  // Vérifier les conteneurs qui pourraient masquer
  const containers = document.querySelectorAll('.container-fluid, .kanban-container, #kanban-container');
  containers.forEach((container, index) => {
    if (container) {
      const style = window.getComputedStyle(container);
      console.log(`   Container ${index + 1}: ${container.tagName}#${container.id}`);
      console.log(`      → overflow: ${style.overflow}`);
      console.log(`      → position: ${style.position}`);
      console.log(`      → z-index: ${style.zIndex}`);
    }
  });
}

function forceModalVisible() {
  console.log('\n🧪 === TEST FORÇAGE VISIBILITÉ ===');
  
  const modal = document.getElementById('popup-tache');
  if (!modal) {
    console.log('❌ Modal popup-tache introuvable');
    return;
  }
  
  console.log('🔧 Forçage styles CSS directs...');
  
  // Styles forcés
  modal.style.display = 'block';
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';
  modal.style.zIndex = '9999';
  modal.style.position = 'fixed';
  modal.style.top = '10%';
  modal.style.left = '50%';
  modal.style.transform = 'translateX(-50%)';
  modal.style.background = 'white';
  modal.style.border = '3px solid red';
  modal.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
  
  // Forcer les classes Bootstrap
  modal.classList.add('show');
  
  // Nettoyer le body
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  
  console.log('✅ Modal forcée visible - vérifiez l\'écran');
  console.log('   Si vous ne voyez toujours rien, il y a un problème CSS plus profond');
}

function testBootstrapModal() {
  console.log('\n🧪 === TEST BOOTSTRAP MODAL NATIF ===');
  
  const modal = document.getElementById('popup-tache');
  if (!modal) {
    console.log('❌ Modal introuvable');
    return;
  }
  
  try {
    // Détruire instance existante
    const existingInstance = bootstrap.Modal.getInstance(modal);
    if (existingInstance) {
      console.log('🗑️ Destruction instance existante');
      existingInstance.dispose();
    }
    
    // Créer nouvelle instance
    console.log('🆕 Création nouvelle instance Bootstrap');
    const newModal = new bootstrap.Modal(modal, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    
    // Écouter les événements
    modal.addEventListener('shown.bs.modal', () => {
      console.log('🎉 Événement shown.bs.modal déclenché');
    });
    
    modal.addEventListener('show.bs.modal', () => {
      console.log('⏳ Événement show.bs.modal déclenché');
    });
    
    // Ouvrir
    console.log('🚀 Tentative ouverture...');
    newModal.show();
    
    // Vérifier après 500ms
    setTimeout(() => {
      const style = window.getComputedStyle(modal);
      console.log('📊 État après 500ms:');
      console.log(`   → display: ${style.display}`);
      console.log(`   → Classes modal: ${modal.className}`);
      console.log(`   → Instance _isShown: ${newModal._isShown}`);
    }, 500);
    
  } catch (error) {
    console.log('❌ Erreur Bootstrap:', error.message);
  }
}

// Export des fonctions
window.checkModalReality = checkModalReality;
window.forceModalVisible = forceModalVisible;
window.testBootstrapModal = testBootstrapModal;

console.log('🔧 Fonctions disponibles:');
console.log('   → checkModalReality() - état réel des modales');
console.log('   → forceModalVisible() - forcer visibilité avec CSS');
console.log('   → testBootstrapModal() - test Bootstrap natif');