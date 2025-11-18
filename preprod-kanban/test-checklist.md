# 🧪 Points de Test Critiques - Kanban SSIR

## 🎯 **Tests Essentiels à Automatiser**

### 1. **🚨 Tests Anti-Régression Critiques**

#### **Test Enregistrements Temporaires (PRIORITÉ 1)**
```javascript
// Vérifier que les ___TEMP_USER_RECORD___ sont filtrés
testNoTempRecords() {
  const visibleCards = document.querySelectorAll('.kanban-card');
  const tempCards = Array.from(visibleCards).filter(card => 
    card.textContent.includes('___TEMP_USER_RECORD___')
  );
  assert(tempCards.length === 0, "Enregistrements temporaires visibles !");
}
```

#### **Test Double Création (PRIORITÉ 1)**
```javascript
// Vérifier qu'un clic ne crée qu'une seule tâche
testSingleTaskCreation() {
  const initialCount = document.querySelectorAll('.kanban-card').length;
  // Simulation double-clic rapide
  btnNouvelle.click();
  btnNouvelle.click();
  // Après sauvegarde, vérifier qu'une seule tâche a été créée
  const finalCount = document.querySelectorAll('.kanban-card').length;
  assert(finalCount === initialCount + 1, "Double création détectée !");
}
```

#### **Test Fermeture Modal (PRIORITÉ 1)**
```javascript
// Vérifier que les modales se ferment correctement
testModalClosure() {
  // Après chaque action (save/delete/cancel)
  const openModals = document.querySelectorAll('.modal.show');
  assert(openModals.length === 0, "Modal non fermée !");
}
```

### 2. **🔄 Tests de Workflows Complets**

#### **Test Workflow Création → Édition → Suppression**
```javascript
async testFullLifecycle() {
  // 1. Créer tâche avec données test
  const taskData = { titre: "Test " + Date.now(), ... };
  const taskId = await createTask(taskData);
  
  // 2. Vérifier existence dans DOM
  const taskCard = document.querySelector(`[data-id="${taskId}"]`);
  assert(taskCard, "Tâche créée non visible");
  
  // 3. Éditer la tâche
  const updatedData = { titre: "Updated " + Date.now() };
  await editTask(taskId, updatedData);
  
  // 4. Vérifier mise à jour dans DOM
  const updatedCard = document.querySelector(`[data-id="${taskId}"]`);
  assert(updatedCard.textContent.includes(updatedData.titre), "Édition non reflétée");
  
  // 5. Supprimer la tâche
  await deleteTask(taskId);
  
  // 6. Vérifier disparition du DOM
  const deletedCard = document.querySelector(`[data-id="${taskId}"]`);
  assert(!deletedCard, "Tâche supprimée encore visible");
}
```

### 3. **🎛️ Tests d'Interface Utilisateur**

#### **Test Synchronisation Filtres**
```javascript
testFilterSync() {
  // Test chaque filtre individuellement
  const filters = ['bureau', 'qui', 'projet', 'statut'];
  filters.forEach(filterType => {
    // Appliquer filtre
    setFilter(filterType, testValue);
    
    // Vérifier que seules les tâches correspondantes sont visibles
    const visibleCards = getVisibleCards();
    visibleCards.forEach(card => {
      assert(cardMatchesFilter(card, filterType, testValue), 
        `Carte ne correspond pas au filtre ${filterType}`);
    });
    
    // Reset et vérifier
    resetFilter(filterType);
    assert(getAllCards().length === getVisibleCards().length, 
      "Reset filtre défaillant");
  });
}
```

#### **Test Modes de Vue**
```javascript
testViewModes() {
  const modes = ['compact', 'detailed', 'focus'];
  modes.forEach(mode => {
    setViewMode(mode);
    
    // Vérifier application classe CSS
    const container = document.getElementById('kanban-container');
    assert(container.classList.contains(`kanban-${mode}`), 
      `Mode ${mode} non appliqué`);
    
    // Vérifier comportement spécifique du mode
    if (mode === 'focus') {
      const visibleColumns = getVisibleColumns();
      assert(visibleColumns.length === 1, "Mode focus montre plusieurs colonnes");
    }
  });
}
```

### 4. **📊 Tests de Performance et Robustesse**

#### **Test Performance Filtrage**
```javascript
testFilterPerformance() {
  const startTime = performance.now();
  
  // Appliquer plusieurs filtres en séquence rapide
  setFilter('bureau', 'Dev');
  setFilter('qui', 'TestUser');
  setSearchFilter('urgent');
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  assert(duration < 1000, `Filtrage trop lent: ${duration}ms`);
  assert(getVisibleCards().length >= 0, "Filtrage a cassé l'affichage");
}
```

#### **Test Robustesse Drag & Drop**
```javascript
testDragDropRobustness() {
  const tasks = getAllTasks();
  if (tasks.length === 0) return;
  
  // Test drag vers chaque colonne possible
  const columns = getAllColumns();
  const testTask = tasks[0];
  
  columns.forEach(column => {
    const originalStatus = testTask.dataset.status;
    
    // Simuler drag & drop
    simulateDragDrop(testTask, column);
    
    // Vérifier mise à jour statut
    const newStatus = column.dataset.status;
    assert(testTask.dataset.status === newStatus, 
      "Statut non mis à jour après drag&drop");
  });
}
```

### 5. **🔗 Tests d'Intégration Grist**

#### **Test Synchronisation Grist**
```javascript
testGristSync() {
  // Mocker les réponses Grist
  const mockGrist = {
    applyUserActions: jest.fn().mockResolvedValue({ retValues: [123] }),
    onRecords: jest.fn()
  };
  
  // Test création
  const taskData = { titre: "Test Grist" };
  createTask(taskData);
  
  // Vérifier appel API correct
  expect(mockGrist.applyUserActions).toHaveBeenCalledWith([
    'AddRecord', 'Ssir_principale_task', expect.objectContaining(taskData)
  ]);
}
```

#### **Test Format Données Grist**
```javascript
testGristDataFormat() {
  const testData = {
    bureau: ['Dev', 'Test'],
    qui: ['User1', 'User2'],
    strategie_id: 5
  };
  
  const gristFormatted = formatForGrist(testData);
  
  // Vérifier format listes Grist
  assert(Array.isArray(gristFormatted.bureau), "Bureau pas en array");
  assert(gristFormatted.bureau[0] === 'L', "Format liste Grist incorrect");
  assert(Array.isArray(gristFormatted.strategie_id), "Strategie_id pas en format référence");
}
```

### 6. **⚡ Tests de Régression Spécifiques**

#### **Test Reset Formulaire Intelligent**
```javascript
testSmartFormReset() {
  // Ouvrir tâche existante
  const existingTask = getAllTasks()[0];
  openTaskModal(existingTask.id);
  
  // Modifier un champ
  const titleField = document.getElementById('popup-titre');
  const originalTitle = titleField.value;
  titleField.value = "Modified Title";
  
  // Rouvrir la même tâche
  openTaskModal(existingTask.id);
  
  // Vérifier que le titre original est conservé (pas de reset agressif)
  assert(titleField.value === originalTitle, 
    "Reset agressif détecté - données perdues");
}
```

#### **Test Focus Édition Commentaires**
```javascript
testCommentEditFocus() {
  // Ouvrir historique d'une tâche
  openTaskHistory(taskId);
  
  // Cliquer sur bouton édition commentaire
  const editBtn = document.querySelector('.edit-comment-btn');
  editBtn.click();
  
  // Vérifier que le textarea reçoit bien le focus
  const textArea = document.getElementById('comment-edit-text');
  assert(document.activeElement === textArea, 
    "Focus pas transféré au textarea d'édition");
}
```

## 🎯 **Critères de Succès Globaux**

### **Critères Fonctionnels**
- ✅ Toutes les tâches créées apparaissent immédiatement
- ✅ Aucune double création de tâche
- ✅ Tous les filtres fonctionnent individuellement et en combinaison
- ✅ Drag & drop met à jour le statut correctement
- ✅ Modales se ferment après chaque action
- ✅ Édition conserve les données non modifiées

### **Critères de Performance**
- ✅ Filtrage < 1 seconde pour 100+ tâches
- ✅ Création/édition < 2 secondes avec connexion Grist
- ✅ Drag & drop responsive < 500ms
- ✅ Changement de vue instantané < 200ms

### **Critères de Robustesse**
- ✅ Aucune erreur JavaScript dans la console
- ✅ Récupération gracieuse des erreurs Grist
- ✅ État cohérent après interruption réseau
- ✅ Pas de fuite mémoire sur usage prolongé

## 🚀 **Plan d'Automatisation**

### **Phase 1 : Tests Critiques (Immédiat)**
1. Implémenter tests anti-régression (temp records, double création)
2. Tests de fermeture modales
3. Tests de workflow complet création→édition→suppression

### **Phase 2 : Tests Interface (1 semaine)**
1. Tests filtrage complet
2. Tests modes de vue
3. Tests drag & drop

### **Phase 3 : Tests Performance (2 semaines)**
1. Tests charge avec nombreuses tâches
2. Tests performance filtrage
3. Tests robustesse réseau

### **Phase 4 : Intégration Continue (3 semaines)**
1. Intégration dans pipeline de déploiement
2. Tests automatiques avant migration prod
3. Monitoring des métriques de régression

---

*Ce checklist élimine le besoin de tests manuels répétitifs et garantit la stabilité du système complexe.*