// 🔍 SCRIPT DE DIAGNOSTIC À COLLER DANS LA CONSOLE DU KANBAN
// Copier-coller ce code dans la console de la page kanban principale

console.log('🔍 === DIAGNOSTIC OVERLAYS KANBAN ===');

function diagnoseBtnHistory() {
    console.log('\n📍 1. RECHERCHE DES BOUTONS TIMELINE');
    
    // Chercher tous les boutons timeline possibles
    const selectors = [
        '.btn-history',
        '[class*="btn-history"]',
        '[title*="historique"]',
        '[data-task-id]',
        'button[title*="Voir l\'historique"]'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`   ${selector}: ${elements.length} trouvé(s)`);
        if (elements.length > 0) {
            elements.forEach((el, i) => {
                console.log(`     [${i}] ID:${el.id} Class:${el.className} Title:${el.title}`);
            });
        }
    });
}

function diagnoseOverlays() {
    console.log('\n🎭 2. ANALYSE DES OVERLAYS');
    
    const overlaySelectors = [
        '.modal-backdrop',
        '.comment-edit-widget', 
        '.comment-edit-overlay',
        '.modal[style*="display: block"]',
        '[style*="position: fixed"]',
        '[style*="z-index"]'
    ];
    
    let blockingElements = [];
    
    overlaySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const display = computedStyle.display;
            const zIndex = computedStyle.zIndex;
            const position = computedStyle.position;
            
            if (display !== 'none' && position === 'fixed' || position === 'absolute') {
                console.log(`   🚨 ${selector}: display=${display}, z-index=${zIndex}, position=${position}`);
                if (parseInt(zIndex) > 1000 || position === 'fixed') {
                    blockingElements.push({selector, element: el, zIndex: parseInt(zIndex) || 0});
                }
            }
        });
    });
    
    if (blockingElements.length > 0) {
        console.log('   ⚠️ ÉLÉMENTS POTENTIELLEMENT BLOQUANTS:');
        blockingElements.forEach(item => {
            console.log(`     - ${item.selector} (z-index: ${item.zIndex})`);
        });
        return blockingElements;
    } else {
        console.log('   ✅ Aucun overlay bloquant détecté');
        return [];
    }
}

function diagnoseBody() {
    console.log('\n🌐 3. ÉTAT DU BODY');
    const body = document.body;
    console.log(`   Classes: ${body.className}`);
    console.log(`   Style: ${body.style.cssText}`);
    console.log(`   Modal-open: ${body.classList.contains('modal-open')}`);
    
    // Rechercher les attributs data-bs-*
    const bsAttrs = Array.from(body.attributes).filter(attr => attr.name.startsWith('data-bs'));
    if (bsAttrs.length > 0) {
        console.log('   Bootstrap attributes:');
        bsAttrs.forEach(attr => console.log(`     ${attr.name}="${attr.value}"`));
    }
}

function testClickability() {
    console.log('\n🧪 4. TEST DE CLIQUABILITÉ');
    
    const historyButtons = document.querySelectorAll('.btn-history, [title*="historique"]');
    console.log(`   Boutons timeline trouvés: ${historyButtons.length}`);
    
    if (historyButtons.length === 0) {
        console.log('   ❌ AUCUN BOUTON TROUVÉ - Problème de génération !');
        
        // Chercher dans le contenu des cartes
        const cards = document.querySelectorAll('.task-card, .kanban-card, [class*="card"]');
        console.log(`   Cartes trouvées: ${cards.length}`);
        
        if (cards.length > 0) {
            console.log('   Contenu de la première carte:');
            console.log(cards[0].innerHTML.substring(0, 500) + '...');
        }
        return;
    }
    
    historyButtons.forEach((btn, index) => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        const isClickable = elementAtPoint === btn || btn.contains(elementAtPoint);
        
        console.log(`   Bouton ${index + 1}: ${isClickable ? '✅' : '❌'} (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
        if (!isClickable && elementAtPoint) {
            console.log(`     Élément bloquant: ${elementAtPoint.tagName}.${elementAtPoint.className}`);
        }
    });
}

function forceCleanup() {
    console.log('\n🧹 5. NETTOYAGE FORCÉ');
    
    let removedCount = 0;
    
    // Supprimer les backdrops
    document.querySelectorAll('.modal-backdrop').forEach(el => {
        console.log(`   Suppression backdrop: ${el.className}`);
        el.remove();
        removedCount++;
    });
    
    // Masquer les widgets d'édition
    document.querySelectorAll('.comment-edit-widget, .comment-edit-overlay').forEach(el => {
        if (el.style.display !== 'none') {
            console.log(`   Masquage widget: ${el.className}`);
            el.style.display = 'none';
            removedCount++;
        }
    });
    
    // Réinitialiser le body
    const body = document.body;
    if (body.classList.contains('modal-open')) {
        console.log('   Réinitialisation body modal-open');
        body.classList.remove('modal-open');
        body.style.overflow = '';
        body.style.paddingRight = '';
        body.removeAttribute('data-bs-overflow');
        body.removeAttribute('data-bs-padding-right');
        removedCount++;
    }
    
    console.log(`   ✅ ${removedCount} éléments nettoyés`);
    
    // Appeler la fonction kanban si disponible
    if (window.kanbanManager && window.kanbanManager.cleanOrphanBackdrops) {
        console.log('   🔄 Appel nettoyage kanban...');
        window.kanbanManager.cleanOrphanBackdrops();
    }
}

// FONCTION PRINCIPALE
function runFullDiagnostic() {
    diagnoseBtnHistory();
    const blockingElements = diagnoseOverlays();
    diagnoseBody();
    testClickability();
    
    console.log('\n🎯 RECOMMANDATIONS:');
    
    if (document.querySelectorAll('.btn-history').length === 0) {
        console.log('   1. ❌ PROBLÈME MAJEUR: Boutons timeline non générés');
        console.log('   2. Vérifier si window.kanbanManager existe');
        console.log('   3. Vérifier si les données sont chargées');
        console.log('   4. Relancer la génération des cartes');
    } else if (blockingElements.length > 0) {
        console.log('   1. Éléments bloquants détectés - utiliser forceCleanup()');
    } else {
        console.log('   1. ✅ Diagnostic normal - problème ailleurs');
    }
    
    console.log('\n📞 FONCTIONS DISPONIBLES:');
    console.log('   - runFullDiagnostic() : Relancer le diagnostic complet');
    console.log('   - forceCleanup() : Nettoyage forcé des overlays');
    console.log('   - testClickability() : Tester uniquement la cliquabilité');
}

// Démarrer le diagnostic
runFullDiagnostic();