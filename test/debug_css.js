// 🎨 SCRIPT DE DIAGNOSTIC CSS - À coller dans la console kanban

console.log('🎨 === DIAGNOSTIC CSS VISIBILITÉ ===');

function diagnoseCSSVisibility() {
    console.log('\n📦 1. ANALYSE DU CONTAINER PRINCIPAL');
    
    const container = document.getElementById('kanban-container');
    if (!container) {
        console.log('   ❌ Container kanban-container non trouvé');
        return;
    }
    
    const containerStyles = window.getComputedStyle(container);
    console.log('   📏 Container display:', containerStyles.display);
    console.log('   👁️ Container visibility:', containerStyles.visibility);
    console.log('   🎭 Container opacity:', containerStyles.opacity);
    console.log('   📐 Container width:', containerStyles.width);
    console.log('   📏 Container height:', containerStyles.height);
    console.log('   🌊 Container overflow:', containerStyles.overflow);
    console.log('   🎯 Container position:', containerStyles.position);
    console.log('   📍 Container z-index:', containerStyles.zIndex);
    console.log('   🔄 Container transform:', containerStyles.transform);
    console.log('   📋 Container HTML length:', container.innerHTML.length);
    console.log('   📊 Container children count:', container.children.length);
    
    console.log('\n🏛️ 2. ANALYSE DES COLONNES');
    const columns = container.querySelectorAll('.kanban-column, .column, [class*="column"]');
    console.log(`   📋 Colonnes trouvées: ${columns.length}`);
    
    columns.forEach((col, index) => {
        const colStyles = window.getComputedStyle(col);
        console.log(`   📊 Colonne ${index + 1}:`);
        console.log(`     - Display: ${colStyles.display}`);
        console.log(`     - Width: ${colStyles.width}`);
        console.log(`     - Height: ${colStyles.height}`);
        console.log(`     - Visibility: ${colStyles.visibility}`);
        console.log(`     - Classes: ${col.className}`);
        console.log(`     - Children: ${col.children.length}`);
    });
    
    console.log('\n📇 3. ANALYSE DES CARTES');
    const cards = container.querySelectorAll('.task-card, .card, [class*="card"]');
    console.log(`   📋 Cartes trouvées: ${cards.length}`);
    
    if (cards.length > 0) {
        // Analyser les 3 premières cartes
        cards.forEach((card, index) => {
            if (index < 3) {
                const cardStyles = window.getComputedStyle(card);
                const rect = card.getBoundingClientRect();
                console.log(`   📇 Carte ${index + 1}:`);
                console.log(`     - Display: ${cardStyles.display}`);
                console.log(`     - Visibility: ${cardStyles.visibility}`);
                console.log(`     - Opacity: ${cardStyles.opacity}`);
                console.log(`     - Position: ${cardStyles.position} (${cardStyles.top}, ${cardStyles.left})`);
                console.log(`     - Size: ${cardStyles.width} x ${cardStyles.height}`);
                console.log(`     - BoundingRect: ${rect.width}x${rect.height} at (${rect.x}, ${rect.y})`);
                console.log(`     - Z-index: ${cardStyles.zIndex}`);
                console.log(`     - Transform: ${cardStyles.transform}`);
                console.log(`     - Classes: ${card.className}`);
            }
        });
    } else {
        console.log('   ❌ Aucune carte trouvée avec les sélecteurs standards');
        
        // Chercher d'autres éléments
        const allChildren = container.children;
        console.log(`   🔍 Éléments dans container: ${allChildren.length}`);
        
        for (let i = 0; i < Math.min(allChildren.length, 5); i++) {
            const child = allChildren[i];
            console.log(`     - Élément ${i + 1}: ${child.tagName}.${child.className}`);
        }
    }
    
    console.log('\n🎯 4. RECHERCHE D\'OVERLAYS BLOQUANTS');
    const overlaySelectors = [
        '.modal-backdrop',
        '.overlay',
        '[style*="position: fixed"]',
        '[style*="z-index"]'
    ];
    
    let foundBlockingElements = false;
    overlaySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            const styles = window.getComputedStyle(el);
            const zIndex = parseInt(styles.zIndex) || 0;
            const rect = el.getBoundingClientRect();
            
            if (styles.display !== 'none' && zIndex > 0 && rect.width > 100 && rect.height > 100) {
                console.log(`   🚨 Overlay potentiellement bloquant: ${selector}`);
                console.log(`     - Z-index: ${zIndex}`);
                console.log(`     - Size: ${rect.width}x${rect.height}`);
                console.log(`     - Position: (${rect.x}, ${rect.y})`);
                foundBlockingElements = true;
            }
        });
    });
    
    if (!foundBlockingElements) {
        console.log('   ✅ Aucun overlay bloquant détecté');
    }
}

function highlightContainer() {
    console.log('\n🔦 SURLIGNAGE DU CONTAINER ET CARTES');
    
    const container = document.getElementById('kanban-container');
    if (container) {
        // Surligner le container en rouge
        container.style.border = '5px solid red';
        container.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        console.log('   🔴 Container surligné en rouge');
    }
    
    // Surligner toutes les cartes en vert
    const cards = document.querySelectorAll('.task-card, .card, [class*="card"], .kanban-item');
    if (cards.length > 0) {
        cards.forEach((card, index) => {
            card.style.border = '3px solid green';
            card.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        });
        console.log(`   🟢 ${cards.length} cartes surlignées en vert`);
    }
    
    // Surligner les colonnes en bleu
    const columns = document.querySelectorAll('.kanban-column, .column, [class*="column"]');
    if (columns.length > 0) {
        columns.forEach((col, index) => {
            col.style.border = '2px solid blue';
            col.style.backgroundColor = 'rgba(0, 0, 255, 0.05)';
        });
        console.log(`   🔵 ${columns.length} colonnes surlignées en bleu`);
    }
    
    // Auto-remove après 10 secondes
    setTimeout(() => {
        if (container) container.style.border = '';
        if (container) container.style.backgroundColor = '';
        cards.forEach(card => {
            card.style.border = '';
            card.style.backgroundColor = '';
        });
        columns.forEach(col => {
            col.style.border = '';
            col.style.backgroundColor = '';
        });
        console.log('   🧹 Surlignage supprimé');
    }, 10000);
}

function forceShowElements() {
    console.log('\n🚀 FORÇAGE AFFICHAGE ÉLÉMENTS');
    
    const container = document.getElementById('kanban-container');
    if (!container) {
        console.log('   ❌ Container non trouvé');
        return;
    }
    
    // Forcer l'affichage du container
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.height = 'auto';
    container.style.overflow = 'visible';
    console.log('   ✅ Container forcé visible');
    
    // Forcer l'affichage des colonnes
    const columns = container.querySelectorAll('*');
    let fixedCount = 0;
    columns.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
            el.style.display = 'block';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            fixedCount++;
        }
    });
    
    console.log(`   ✅ ${fixedCount} éléments forcés visibles`);
}

function testScroll() {
    console.log('\n📜 TEST DE SCROLL');
    
    const container = document.getElementById('kanban-container');
    if (!container) {
        console.log('   ❌ Container non trouvé');
        return;
    }
    
    console.log('   📏 Dimensions scroll:');
    console.log(`     - scrollWidth: ${container.scrollWidth}`);
    console.log(`     - scrollHeight: ${container.scrollHeight}`);
    console.log(`     - clientWidth: ${container.clientWidth}`);
    console.log(`     - clientHeight: ${container.clientHeight}`);
    console.log(`     - scrollTop: ${container.scrollTop}`);
    console.log(`     - scrollLeft: ${container.scrollLeft}`);
    
    // Tester différentes positions de scroll
    console.log('   🔄 Test de scroll en différentes positions...');
    container.scrollTop = 0;
    container.scrollLeft = 0;
    
    setTimeout(() => {
        console.log(`     - Après scroll top: visible = ${container.offsetHeight > 0}`);
    }, 100);
}

// FONCTION PRINCIPALE
function runCSSDebug() {
    diagnoseCSSVisibility();
    testScroll();
    
    console.log('\n🎯 ACTIONS DISPONIBLES:');
    console.log('   - highlightContainer() : Surligner container/cartes en couleurs');
    console.log('   - forceShowElements() : Forcer affichage de tous les éléments');
    console.log('   - testScroll() : Tester les dimensions de scroll');
    console.log('   - runCSSDebug() : Relancer diagnostic complet');
    
    const container = document.getElementById('kanban-container');
    const hasContent = container && container.innerHTML.length > 1000;
    const hasChildren = container && container.children.length > 0;
    
    console.log('\n🎯 RECOMMANDATIONS:');
    if (!container) {
        console.log('   ❌ Container manquant - problème HTML');
    } else if (!hasContent) {
        console.log('   ❌ Container vide - problème injection');
    } else if (!hasChildren) {
        console.log('   ❌ HTML présent mais pas d\'éléments - problème parsing HTML');
    } else {
        console.log('   🔍 Contenu présent - utiliser highlightContainer() pour visualiser');
        console.log('   💡 Si rien n\'est visible, utiliser forceShowElements()');
    }
}

// Démarrer le diagnostic
runCSSDebug();