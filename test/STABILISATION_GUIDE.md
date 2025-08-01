# 🛡️ GUIDE DE STABILISATION - KANBAN SSIR

## Version: 29 Juillet 2025 - Mise à jour après nettoyage

### 📊 État Actuel du Système

**✅ Fonctionnalités Stables**
- Interface Kanban principale avec drag & drop
- Système de modales (création/édition de tâches)
- Historique des tâches avec timeline
- Édition des commentaires dans l'historique
- Page statistiques avec heatmap et répartition
- Intégration API Grist
- Système de filtres et recherche

**✅ Corrections Récentes**
- Logs de debug nettoyés pour améliorer les performances
- Instance unique de KanbanManager (plus de doublons)
- Event listeners optimisés avec pattern de délégation

**⚠️ Points d'Attention Restants**
- API Grist nécessite mode dégradé hors iframe
- GristManager dupliqué (core/ vs managers/) - À fusionner
- Couplage fort entre ViewModeManager ↔ FilterManager
- Communication directe entre managers (pas d'EventBus)

---

## 🔧 BONNES PRATIQUES DE DÉVELOPPEMENT

### 1. **Gestion des Event Listeners**

```javascript
// ❌ ÉVITER : Ajout répété d'event listeners
element.addEventListener('click', handler);
element.addEventListener('click', handler); // Doublon !

// ✅ PRÉFÉRER : Vérifier ou nettoyer avant d'ajouter
element.removeEventListener('click', handler);
element.addEventListener('click', handler);

// ✅ OU : Utiliser la délégation d'événements
container.addEventListener('click', (e) => {
  if (e.target.matches('.btn-specific')) {
    handleClick(e);
  }
});
```

### 2. **Gestion des IDs de Tâches**

```javascript
// ✅ TOUJOURS utiliser les méthodes centralisées
const taskId = this.getCurrentEditingTaskId(); // Pour édition
const taskId = this.currentTaskHistory?.id;    // Pour historique

// ❌ ÉVITER les sources multiples non validées
const taskId = modal.dataset.taskId || 
               this.currentTaskId || 
               element.getAttribute('data-id'); // Confusion !
```

### 3. **Appels API Grist**

```javascript
// ✅ TOUJOURS vérifier la disponibilité
const gristApi = window.grist || (typeof grist !== 'undefined' ? grist : null);
if (!gristApi) {
  console.warn('Mode dégradé - pas d\'API Grist');
  return [];
}

// ✅ Regrouper les appels
const updates = [
  ['UpdateRecord', TABLE_ID, id1, data1],
  ['UpdateRecord', TABLE_ID, id2, data2]
];
await gristApi.docApi.applyUserActions(updates);
```

### 4. **Gestion des Erreurs**

```javascript
// ✅ Try-catch avec messages utilisateur clairs
try {
  await riskyOperation();
} catch (error) {
  console.error('Détails techniques:', error);
  displayError('Message clair pour l\'utilisateur');
}

// ✅ Mode dégradé plutôt que crash
if (!criticalResource) {
  console.warn('Ressource manquante, mode dégradé activé');
  return defaultValue;
}
```

---

## 🧪 CHECKLIST DE TESTS AVANT DÉPLOIEMENT

### Tests Fonctionnels Obligatoires

- [ ] **Création de tâche**
  - Formulaire s'ouvre correctement
  - Validation des champs obligatoires
  - Sauvegarde réussie
  - Apparition dans le bon statut

- [ ] **Édition de tâche**
  - Double-clic ouvre la bonne tâche
  - Modifications sauvegardées
  - Historique mis à jour

- [ ] **Drag & Drop**
  - Déplacement fluide
  - Mise à jour du statut
  - Historique enregistré

- [ ] **Historique**
  - Timeline s'affiche correctement
  - Clic sur titre → édition (pas création!)
  - Édition commentaires fonctionne

- [ ] **Statistiques**
  - Page charge sans erreur
  - Heatmap affiche les données
  - Graphiques corrects

### Tests de Robustesse

- [ ] **Sans API Grist** : L'app doit afficher un message, pas crasher
- [ ] **Données manquantes** : Gestion gracieuse des champs vides
- [ ] **Double-clics rapides** : Pas de duplication de modales
- [ ] **Navigation rapide** : Pas d'accumulation d'event listeners

---

## 🚀 WORKFLOW DE DÉPLOIEMENT SÉCURISÉ

### 1. **Pré-déploiement**
```bash
# Dans l'environnement de test
cd /home/timo/app/timox.github.io/test

# Vérifier les modifications
git status
git diff

# Lancer les tests manuels (checklist ci-dessus)
```

### 2. **Déploiement**
```bash
# Utiliser le script automatisé
cd /home/timo/app/timox.github.io
./deploy_to_production.sh

# OU déploiement manuel ciblé
cp test/js/managers/ModalManager.js kanban/js/managers/
cp test/js/stats-app.js kanban/js/
```

### 3. **Post-déploiement**
- Vérifier immédiatement les fonctions critiques
- Surveiller la console pour les erreurs
- Garder la sauvegarde 24h minimum

---

## 📈 OPTIMISATIONS FUTURES

### Performance
1. **Cache des données Grist** : Éviter de recharger toutes les tâches
2. **Debounce sur la recherche** : Éviter les appels excessifs
3. **Lazy loading** : Charger l'historique à la demande

### Architecture (PRIORITAIRE)
1. **Fusionner GristManager** : Résoudre la duplication critique core/ vs managers/
2. **Event Bus** : Remplacer les références directes entre managers
3. **DataStore centralisé** : Unifier la gestion de l'état
4. **Découpler ViewModeManager/FilterManager** : Éliminer les références circulaires
5. **Tests Automatisés** : Étendre les tests existants

### Code Quality
1. **TypeScript** : Migration progressive pour plus de sécurité
2. **Linting strict** : ESLint avec règles d'équipe
3. **Documentation JSDoc** : Pour toutes les méthodes publiques

---

## 🔍 PROBLÈMES ARCHITECTURAUX IDENTIFIÉS

### Duplication GristManager (CRITIQUE)
```bash
# Deux versions différentes détectées :
/test/js/core/GristManager.js        # Version de base
/test/js/managers/GristManager.js    # Version étendue avec corrections

# SOLUTION : Fusionner en gardant la version managers/ comme référence
```

### Couplage Fort entre Managers
```javascript
// ❌ PROBLÈME : Références circulaires
// Dans ViewModeManager.js
if (this.kanban.filterManager && this.kanban.filterManager.updateForViewMode) {
  this.kanban.filterManager.updateForViewMode();
}

// Dans FilterManager.js  
if (this.kanban.viewMode === 'focus' && this.kanban.viewModeManager) {
  this.kanban.viewModeManager.focusColumn = this.filters.statut;
}

// ✅ SOLUTION : Utiliser un EventBus
this.eventBus.emit('view-mode-changed', { mode: newMode });
this.eventBus.on('view-mode-changed', this.handleViewModeChange.bind(this));
```

### État Dispersé
```javascript
// ❌ PROBLÈME : Chaque manager maintient son état
// KanbanManager
this.currentRecords = [];
this.viewMode = 'compact';

// ViewModeManager  
this.currentMode = 'compact';

// FilterManager
this.filteredRecords = [];

// ✅ SOLUTION : DataStore centralisé
const dataStore = new DataStore({
  records: [],
  viewMode: 'compact', 
  filters: {}
});
```

---

## 🛠️ DEBUGGING RAPIDE

### Problème: "Modal ne s'ouvre pas"
```javascript
// Vérifier l'instance unique
console.log('KanbanManager unique:', !!window.kanbanManager);
console.log('ModalManager:', window.kanbanManager?.modalManager);
console.log('Élément DOM:', document.getElementById('popup-tache'));
```

### Problème: "Event listeners multiples"
```javascript
// Vérifier les doublons (bug résolu mais utile pour debug)
const element = document.querySelector('.btn-timeline');
console.log('Event listeners:', getEventListeners(element)); // Chrome DevTools
```

### Problème: "Managers en conflit" 
```javascript
// Vérifier les références circulaires
console.log('ViewMode→Filter:', !!kanbanManager.viewModeManager?.kanban.filterManager);
console.log('Filter→ViewMode:', !!kanbanManager.filterManager?.kanban.viewModeManager);
```

### Problème: "GristManager introuvable"
```javascript
// Vérifier quelle version est chargée
console.log('Core GristManager:', typeof import('./core/GristManager.js'));
console.log('Managers GristManager:', typeof import('./managers/GristManager.js'));
```

---

## 📞 CONTACTS & SUPPORT

**En cas de problème critique:**
1. Restaurer depuis backup : `backup_avant_deploy_*`
2. Vérifier les logs navigateur
3. Mode dégradé temporaire si nécessaire

**Documentation technique:**
- Architecture : `ARCHITECTURE.md`
- Changelog : `CHANGELOG_*.md`
- API Grist : https://support.getgrist.com/api/

---

**🎯 Objectif : Maintenir un système stable, prévisible et facilement maintenable !**