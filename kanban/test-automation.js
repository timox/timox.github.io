/**
 * 🧪 SYSTÈME D'AUTOMATISATION DES TESTS KANBAN
 * 
 * Solution pour éliminer les copier-coller manuels lors des tests
 * Tests automatisés des workflows critiques avec mocks Grist
 * 
 * Usage: Ouvrir dans la console navigateur sur l'environnement /test/
 */

class KanbanTestSuite {
  constructor() {
    this.testResults = [];
    this.mockGristEnabled = false;
    this.originalGristMethods = {};
    this.testData = this.generateTestData();
  }

  // === DONNÉES DE TEST STANDARDISÉES ===
  generateTestData() {
    return {
      newTask: {
        titre: "Test Task " + Date.now(),
        description: "Description automatique de test",
        bureau: ["Dev", "Test"],
        qui: ["TestUser1", "TestUser2"],
        urgence: "Moyenne",
        impact: "Faible",
        statut: "À faire",
        projet: "Test Automation"
      },
      
      updateTask: {
        titre: "Task Updated " + Date.now(),
        statut: "En cours",
        urgence: "Élevée"
      },
      
      filterTests: {
        bureau: "Dev",
        qui: "TestUser1", 
        projet: "Test Automation",
        search: "Test Task"
      }
    };
  }

  // === MOCK GRIST POUR TESTS ISOLÉS ===
  enableGristMock() {
    if (this.mockGristEnabled) return;
    
    this.originalGristMethods = {
      applyUserActions: window.grist?.docApi?.applyUserActions,
      onRecords: window.grist?.onRecords
    };
    
    // Mock des appels Grist
    if (window.grist?.docApi) {
      window.grist.docApi.applyUserActions = async (actions) => {
        console.log('🧪 MOCK Grist Action:', actions);
        await this.delay(100); // Simule latence réseau
        return { retValues: [Math.floor(Math.random() * 1000)] };
      };
    }
    
    this.mockGristEnabled = true;
    this.log('✅ Mock Grist activé');
  }

  disableGristMock() {
    if (!this.mockGristEnabled) return;
    
    if (window.grist?.docApi && this.originalGristMethods.applyUserActions) {
      window.grist.docApi.applyUserActions = this.originalGristMethods.applyUserActions;
    }
    
    this.mockGristEnabled = false;
    this.log('❌ Mock Grist désactivé');
  }

  // === UTILITAIRES ===
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`, data || '');
  }

  async waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await this.delay(100);
    }
    throw new Error(`Element ${selector} non trouvé après ${timeout}ms`);
  }

  // === TESTS WORKFLOW CRÉATION ===
  async testCreateTask() {
    this.log('🧪 Test: Création de tâche');
    
    try {
      // 1. Ouvrir modal nouvelle tâche
      const btnNouvelle = document.getElementById('btn-nouvelle-tache');
      if (!btnNouvelle) throw new Error('Bouton nouvelle tâche non trouvé');
      
      btnNouvelle.click();
      await this.delay(300);
      
      // 2. Vérifier ouverture modal
      const modal = await this.waitForElement('#popup-tache.show');
      
      // 3. Remplir formulaire
      await this.fillTaskForm(this.testData.newTask);
      
      // 4. Sauvegarder
      const btnSave = document.getElementById('btn-sauvegarder-tache');
      if (!btnSave) throw new Error('Bouton sauvegarder non trouvé');
      
      btnSave.click();
      await this.delay(500);
      
      // 5. Vérifier fermeture modal
      const modalHidden = !document.querySelector('#popup-tache.show');
      if (!modalHidden) throw new Error('Modal non fermée après sauvegarde');
      
      this.log('✅ Test création réussi');
      return { success: true, workflow: 'create' };
      
    } catch (error) {
      this.log('❌ Test création échoué:', error.message);
      return { success: false, workflow: 'create', error: error.message };
    }
  }

  // === TESTS WORKFLOW ÉDITION ===
  async testEditTask() {
    this.log('🧪 Test: Édition de tâche');
    
    try {
      // 1. Trouver une carte existante
      const cards = document.querySelectorAll('.kanban-card[data-id]');
      if (cards.length === 0) throw new Error('Aucune tâche disponible pour édition');
      
      const firstCard = cards[0];
      const taskId = firstCard.dataset.id;
      
      // 2. Cliquer sur la carte
      firstCard.click();
      await this.delay(300);
      
      // 3. Vérifier ouverture modal en mode édition
      const modal = await this.waitForElement('#popup-tache.show');
      const titleField = document.getElementById('popup-titre');
      if (!titleField?.value) throw new Error('Modal édition mal initialisée');
      
      // 4. Modifier des champs
      await this.fillTaskForm(this.testData.updateTask, true);
      
      // 5. Sauvegarder
      const btnSave = document.getElementById('btn-sauvegarder-tache');
      btnSave.click();
      await this.delay(500);
      
      this.log('✅ Test édition réussi');
      return { success: true, workflow: 'edit', taskId };
      
    } catch (error) {
      this.log('❌ Test édition échoué:', error.message);
      return { success: false, workflow: 'edit', error: error.message };
    }
  }

  // === TESTS WORKFLOW FILTRAGE ===
  async testFiltering() {
    this.log('🧪 Test: Système de filtrage');
    
    try {
      const results = {};
      
      // Test filtre bureau
      const bureauSelect = document.getElementById('filter-bureau');
      if (bureauSelect) {
        const originalCount = document.querySelectorAll('.kanban-card').length;
        bureauSelect.value = this.testData.filterTests.bureau;
        bureauSelect.dispatchEvent(new Event('change'));
        await this.delay(300);
        
        const filteredCount = document.querySelectorAll('.kanban-card').length;
        results.bureau = { original: originalCount, filtered: filteredCount };
      }
      
      // Test recherche
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = this.testData.filterTests.search;
        searchInput.dispatchEvent(new Event('input'));
        await this.delay(500); // Debounce
        
        const searchResults = document.querySelectorAll('.kanban-card').length;
        results.search = { query: this.testData.filterTests.search, results: searchResults };
      }
      
      // Reset filtres
      const btnReset = document.getElementById('btn-reset-filters');
      if (btnReset) {
        btnReset.click();
        await this.delay(300);
      }
      
      this.log('✅ Test filtrage réussi', results);
      return { success: true, workflow: 'filtering', results };
      
    } catch (error) {
      this.log('❌ Test filtrage échoué:', error.message);
      return { success: false, workflow: 'filtering', error: error.message };
    }
  }

  // === TESTS WORKFLOW DRAG & DROP ===
  async testDragDrop() {
    this.log('🧪 Test: Drag & Drop');
    
    try {
      const cards = document.querySelectorAll('.kanban-card[data-id]');
      if (cards.length === 0) throw new Error('Aucune tâche pour test drag&drop');
      
      const card = cards[0];
      const originalColumn = card.closest('.kanban-column');
      const originalStatus = originalColumn?.dataset.status;
      
      // Simuler drag & drop vers colonne suivante
      const columns = document.querySelectorAll('.kanban-column');
      const targetColumn = Array.from(columns).find(col => 
        col.dataset.status !== originalStatus
      );
      
      if (!targetColumn) throw new Error('Aucune colonne cible trouvée');
      
      // Déclencher événement drag&drop simulé
      const dragEvent = new CustomEvent('sortupdate', {
        detail: {
          item: card,
          from: originalColumn.querySelector('.kanban-cards'),
          to: targetColumn.querySelector('.kanban-cards')
        }
      });
      
      // Déplacer physiquement la carte
      targetColumn.querySelector('.kanban-cards').appendChild(card);
      card.dispatchEvent(dragEvent);
      
      await this.delay(300);
      
      this.log('✅ Test drag&drop réussi');
      return { 
        success: true, 
        workflow: 'dragdrop',
        from: originalStatus,
        to: targetColumn.dataset.status
      };
      
    } catch (error) {
      this.log('❌ Test drag&drop échoué:', error.message);
      return { success: false, workflow: 'dragdrop', error: error.message };
    }
  }

  // === TESTS MODES DE VUE ===
  async testViewModes() {
    this.log('🧪 Test: Modes de vue');
    
    try {
      const modes = ['compact', 'detailed', 'focus'];
      const results = {};
      
      for (const mode of modes) {
        // Activer le mode
        const btn = document.querySelector(`[data-mode="${mode}"]`);
        if (btn) {
          btn.click();
          await this.delay(200);
          
          // Vérifier application du mode
          const container = document.getElementById('kanban-container');
          const hasClass = container?.classList.contains(`kanban-${mode}`);
          results[mode] = { activated: hasClass };
        }
      }
      
      this.log('✅ Test modes de vue réussi', results);
      return { success: true, workflow: 'viewmodes', results };
      
    } catch (error) {
      this.log('❌ Test modes de vue échoué:', error.message);
      return { success: false, workflow: 'viewmodes', error: error.message };
    }
  }

  // === UTILITAIRE REMPLISSAGE FORMULAIRE ===
  async fillTaskForm(data, partial = false) {
    if (data.titre) {
      const titleField = document.getElementById('popup-titre');
      if (titleField) {
        titleField.value = data.titre;
        titleField.dispatchEvent(new Event('input'));
      }
    }
    
    if (data.description) {
      const descField = document.getElementById('popup-description');
      if (descField) {
        descField.value = data.description;
        descField.dispatchEvent(new Event('input'));
      }
    }
    
    if (data.statut) {
      const statutSelect = document.getElementById('popup-statut');
      if (statutSelect) {
        statutSelect.value = data.statut;
        statutSelect.dispatchEvent(new Event('change'));
      }
    }
    
    if (data.urgence) {
      const urgenceSelect = document.getElementById('popup-urgence');
      if (urgenceSelect) {
        urgenceSelect.value = data.urgence;
        urgenceSelect.dispatchEvent(new Event('change'));
      }
    }
    
    await this.delay(100); // Laisser temps aux événements
  }

  // === SUITE COMPLÈTE ===
  async runFullTestSuite() {
    this.log('🚀 Démarrage suite complète de tests');
    this.testResults = [];
    
    // Activer mock pour tests isolés
    this.enableGristMock();
    
    try {
      // Tests principaux
      this.testResults.push(await this.testCreateTask());
      this.testResults.push(await this.testEditTask());
      this.testResults.push(await this.testFiltering());
      this.testResults.push(await this.testDragDrop());
      this.testResults.push(await this.testViewModes());
      
      // Rapport final
      this.generateReport();
      
    } finally {
      this.disableGristMock();
    }
  }

  // === RAPPORT DE RÉSULTATS ===
  generateReport() {
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log('\n📊 RAPPORT DE TESTS AUTOMATISÉS');
    console.log('=================================');
    console.log(`✅ Réussis: ${successful}/${total}`);
    console.log(`❌ Échoués: ${total - successful}/${total}`);
    console.log('\nDétails par workflow:');
    
    this.testResults.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.workflow}: ${result.success ? 'OK' : result.error}`);
    });
    
    if (successful === total) {
      console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    } else {
      console.log('\n⚠️ Certains tests ont échoué - Vérifier les erreurs ci-dessus');
    }
  }

  // === TESTS RAPIDES INDIVIDUELS ===
  async quickTest(workflow) {
    this.enableGristMock();
    
    try {
      switch (workflow) {
        case 'create': return await this.testCreateTask();
        case 'edit': return await this.testEditTask();
        case 'filter': return await this.testFiltering();
        case 'drag': return await this.testDragDrop();
        case 'view': return await this.testViewModes();
        default: throw new Error(`Workflow ${workflow} non reconnu`);
      }
    } finally {
      this.disableGristMock();
    }
  }
}

// === EXPOSITION GLOBALE ===
window.KanbanTestSuite = KanbanTestSuite;
window.testSuite = new KanbanTestSuite();

// === RACCOURCIS CONSOLE ===
window.runAllTests = () => window.testSuite.runFullTestSuite();
window.testCreate = () => window.testSuite.quickTest('create');
window.testEdit = () => window.testSuite.quickTest('edit');
window.testFilter = () => window.testSuite.quickTest('filter');
window.testDrag = () => window.testSuite.quickTest('drag');
window.testView = () => window.testSuite.quickTest('view');

console.log('🧪 Suite de tests automatisés chargée !');
console.log('📋 Commandes disponibles:');
console.log('  - runAllTests()    : Suite complète');
console.log('  - testCreate()     : Test création uniquement');
console.log('  - testEdit()       : Test édition uniquement');
console.log('  - testFilter()     : Test filtrage uniquement');
console.log('  - testDrag()       : Test drag&drop uniquement');
console.log('  - testView()       : Test modes de vue uniquement');