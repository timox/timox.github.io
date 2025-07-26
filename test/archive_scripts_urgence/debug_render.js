// 🔍 SCRIPT DE DIAGNOSTIC RENDU - À coller dans la console kanban

console.log('🎨 === DIAGNOSTIC RENDU KANBAN ===');

function diagnoseRender() {
    console.log('\n📊 1. VÉRIFICATION DES DONNÉES');
    
    if (!window.kanbanManager) {
        console.log('   ❌ window.kanbanManager non trouvé !');
        return;
    }
    
    const km = window.kanbanManager;
    console.log(`   ✅ KanbanManager: ${!!km}`);
    console.log(`   📋 CurrentRecords: ${km.currentRecords?.length || 0}`);
    console.log(`   🎯 StrategiesData: ${km.strategiesData?.length || 0}`);
    console.log(`   🔍 ViewMode: ${km.viewMode || 'unknown'}`);
    console.log(`   📌 Filters:`, km.filters);
    
    console.log('\n🏗️ 2. VÉRIFICATION DU DOM');
    const container = document.getElementById('kanban-container');
    console.log(`   📦 Container trouvé: ${!!container}`);
    if (container) {
        console.log(`   📏 Container HTML length: ${container.innerHTML.length}`);
        console.log(`   🎨 Container classes: ${container.className}`);
        console.log(`   👁️ Container visible: ${container.offsetHeight > 0}`);
        
        if (container.innerHTML.length > 0) {
            console.log(`   📄 Premier 200 chars:`, container.innerHTML.substring(0, 200));
        }
    }
    
    console.log('\n🔄 3. VÉRIFICATION DES MANAGERS DE RENDU');
    console.log(`   🖼️ ViewModeManager: ${!!km.viewModeManager}`);
    console.log(`   📋 CardRenderer: ${!!km.cardRenderer}`);
    console.log(`   🏛️ BoardRenderer: ${!!km.boardRenderer}`);
    
    // Vérifier les méthodes de rendu
    const renderMethods = [
        'renderKanbanBoard',
        'renderBoard', 
        'renderColumn',
        'renderCard',
        'updateKanbanDisplay'
    ];
    
    renderMethods.forEach(method => {
        console.log(`   🔧 Method ${method}: ${typeof km[method]}`);
    });
    
    console.log('\n📈 4. DONNÉES DÉTAILLÉES');
    if (km.currentRecords && km.currentRecords.length > 0) {
        console.log(`   📋 Première tâche:`, km.currentRecords[0]);
        
        // Grouper par statut
        const byStatus = {};
        km.currentRecords.forEach(record => {
            const status = record.statut || 'undefined';
            byStatus[status] = (byStatus[status] || 0) + 1;
        });
        console.log('   📊 Répartition par statut:', byStatus);
    } else {
        console.log('   ❌ Aucune donnée dans currentRecords !');
    }
}

function forceRender() {
    console.log('\n🚀 FORÇAGE DU RENDU');
    
    if (!window.kanbanManager) {
        console.log('   ❌ KanbanManager non disponible');
        return;
    }
    
    const km = window.kanbanManager;
    
    try {
        // Essayer différentes méthodes de rendu
        if (typeof km.renderKanbanBoard === 'function') {
            console.log('   🔄 Appel renderKanbanBoard...');
            km.renderKanbanBoard();
        } else if (typeof km.renderBoard === 'function') {
            console.log('   🔄 Appel renderBoard...');
            km.renderBoard();
        } else if (typeof km.updateKanbanDisplay === 'function') {
            console.log('   🔄 Appel updateKanbanDisplay...');
            km.updateKanbanDisplay();
        } else {
            console.log('   ❌ Aucune méthode de rendu trouvée');
            
            // Lister toutes les méthodes disponibles
            console.log('   📋 Méthodes disponibles:');
            Object.getOwnPropertyNames(km).forEach(prop => {
                if (typeof km[prop] === 'function') {
                    console.log(`     - ${prop}()`);
                }
            });
        }
        
        // Vérifier le résultat
        setTimeout(() => {
            const container = document.getElementById('kanban-container');
            console.log(`   📊 Résultat - HTML length: ${container?.innerHTML.length || 0}`);
        }, 500);
        
    } catch (error) {
        console.error('   ❌ Erreur lors du rendu:', error);
    }
}

function injectTestCard() {
    console.log('\n🧪 INJECTION DE CARTE TEST');
    
    const container = document.getElementById('kanban-container');
    if (!container) {
        console.log('   ❌ Container non trouvé');
        return;
    }
    
    const testHTML = `
        <div class="kanban-column" style="border: 2px solid red; padding: 20px; margin: 10px;">
            <h3>🧪 COLONNE TEST</h3>
            <div class="task-card" style="background: yellow; padding: 10px; margin: 5px;">
                <h4>Tâche Test</h4>
                <button class="btn-history" data-task-id="999" title="Test historique">⏰ Timeline Test</button>
                <button onclick="alert('Bouton test cliqué!')" style="background: green; color: white;">🧪 Test Click</button>
            </div>
        </div>
    `;
    
    container.innerHTML = testHTML;
    console.log('   ✅ Carte test injectée - vérifiez l\'affichage !');
}

// FONCTIONS D'ANALYSE AVANCÉE
function analyzeCSS() {
    console.log('\n🎨 ANALYSE CSS');
    
    const container = document.getElementById('kanban-container');
    if (container) {
        const styles = window.getComputedStyle(container);
        console.log('   📏 Display:', styles.display);
        console.log('   👁️ Visibility:', styles.visibility);
        console.log('   🎭 Opacity:', styles.opacity);
        console.log('   📐 Width:', styles.width);
        console.log('   📏 Height:', styles.height);
        console.log('   🔄 Transform:', styles.transform);
        console.log('   📍 Position:', styles.position);
        console.log('   🌊 Overflow:', styles.overflow);
    }
}

function searchRenderCalls() {
    console.log('\n🔍 RECHERCHE D\'APPELS DE RENDU DANS L\'HISTORIQUE');
    
    // Cette fonction ne peut pas vraiment chercher dans l'historique de la console
    // mais elle peut vérifier si les méthodes sont appelables
    
    if (window.kanbanManager) {
        const km = window.kanbanManager;
        console.log('   🔧 Tentative d\'appel des méthodes de rendu...');
        
        try {
            if (km.viewModeManager && km.viewModeManager.updateKanbanDisplay) {
                console.log('   📱 Appel viewModeManager.updateKanbanDisplay...');
                km.viewModeManager.updateKanbanDisplay();
            }
        } catch (e) {
            console.log('   ⚠️ Erreur viewModeManager:', e.message);
        }
        
        try {
            if (km.filterManager && km.filterManager.applyFilters) {
                console.log('   🔍 Appel filterManager.applyFilters...');
                km.filterManager.applyFilters();
            }
        } catch (e) {
            console.log('   ⚠️ Erreur filterManager:', e.message);
        }
    }
}

// FONCTION PRINCIPALE
function runRenderDiagnostic() {
    diagnoseRender();
    analyzeCSS();
    
    console.log('\n🎯 RECOMMANDATIONS:');
    const container = document.getElementById('kanban-container');
    const km = window.kanbanManager;
    
    if (!km) {
        console.log('   1. ❌ CRITIQUE: KanbanManager non initialisé');
    } else if (!km.currentRecords || km.currentRecords.length === 0) {
        console.log('   1. ❌ PROBLÈME: Aucune donnée dans currentRecords');
    } else if (!container || container.innerHTML.length === 0) {
        console.log('   1. ❌ PROBLÈME: Container vide - forcer le rendu');
        console.log('   2. Utiliser forceRender() pour débloquer');
    } else {
        console.log('   1. ✅ Données OK - problème de CSS ou de logique');
    }
    
    console.log('\n📞 FONCTIONS DISPONIBLES:');
    console.log('   - runRenderDiagnostic() : Diagnostic complet');
    console.log('   - forceRender() : Forcer le rendu');
    console.log('   - injectTestCard() : Injecter une carte test');
    console.log('   - searchRenderCalls() : Rechercher appels de rendu');
}

// Démarrer le diagnostic
runRenderDiagnostic();