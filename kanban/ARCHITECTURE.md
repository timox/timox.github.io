# 📋 Documentation d'Architecture Kanban - Guide Anti-Régression

## 🎯 Objectif
Cette documentation technique évite les erreurs de factorisation en documentant l'architecture critique, les dépendances et les pièges courants.

---

## 📁 Structure des Modules

### Architecture Générale
```
js/
├── kanban-app.js              # ⚠️ POINT D'ENTRÉE LEGACY - Ne pas supprimer
├── core/
│   └── KanbanManager.js       # Orchestrateur moderne (peu utilisé)
├── managers/                  # 🔧 Gestionnaires spécialisés
│   ├── FilterManager.js       # Filtres et recherche
│   ├── ModalManager.js        # Modales et formulaires
│   ├── HistoryManager.js      # Historique et commentaires
│   ├── DatePickerManager.js   # Sélection de dates
│   ├── ViewModeManager.js     # Modes d'affichage
│   └── GristManager.js        # Interface Grist
├── renderers/                 # 🎨 Rendu visuel
│   ├── CardRenderer.js        # Cartes de tâches
│   └── BoardRenderer.js       # Colonnes et layout
├── utils/                     # 🛠️ Utilitaires
│   ├── UserActionManager.js   # Actions utilisateur & historique JSON
│   ├── NotesJsonMigrator.js   # Migration notes
│   ├── dom.js                 # Manipulation DOM
│   ├── dates.js               # Gestion dates
│   └── badges.js              # Génération badges
└── config/
    ├── constants.js           # Constantes globales
    └── strategyData.js        # Données stratégiques
```

---

## ⚠️ ZONES CRITIQUES - NE PAS CASSER

### 1. 🚨 Enregistrements Temporaires (Anti-Doublons)
**Fichier**: `kanban-app.js:1467-1475` et `UserActionManager.js:32-42`

```javascript
// CRITIQUE: Filtrage des enregistrements temporaires
if (gristRecords && Array.isArray(gristRecords)) {
  const hasTempRecord = gristRecords.some(record => 
    record && record.titre === '___TEMP_USER_RECORD___'  // ⚠️ String exact requis
  );
  if (hasTempRecord) {
    console.log("onRecords ignoré (enregistrement temporaire système)");
    return; // OBLIGATOIRE pour éviter les doublons
  }
}
```

**Règles**:
- ❌ Ne JAMAIS changer la string `'___TEMP_USER_RECORD___'`
- ❌ Ne JAMAIS supprimer ce filtrage
- ⚠️ UserActionManager.js crée ces enregistrements pour récupérer le nom d'utilisateur

### 2. 🚨 Système d'Imports (Dépendances Circulaires)
**Problèmes fréquents**:

```javascript
// ❌ ERREUR: Path incorrect
import { ViewManager } from './managers/ViewManager.js';
// ✅ CORRECT: 
import { ViewModeManager } from './managers/ViewModeManager.js';

// ❌ ERREUR: Import circulaire
import { GristManager } from './GristManager.js';  // dans core/
// ✅ CORRECT:
import { GristManager } from '../managers/GristManager.js';
```

**Règle d'Or**: Les managers ne s'importent JAMAIS entre eux directement.

### 3. 🚨 Références d'Objets Critiques
**Fichier**: `ModalManager.js:863`

```javascript
// ❌ ERREUR fréquente:
this.gristOptions.projet = updatedProjects;
// ✅ CORRECT:
this.kanban.gristOptions.projet = updatedProjects;
```

**Règle**: Toujours passer par `this.kanban.` pour accéder aux propriétés partagées.

---

## 🔗 Dépendances Critiques

### Chaîne d'Initialisation (ORDRE OBLIGATOIRE)
```
1. kanban-app.js (KanbanManager legacy)
   ↓
2. Managers (FilterManager, ModalManager, etc.)
   ↓  
3. Renderers (CardRenderer, BoardRenderer)
   ↓
4. Utils (UserActionManager, dom, dates, badges)
```

### Références Inter-Modules
```
KanbanManager (legacy) ←→ FilterManager
                      ←→ ModalManager
                      ←→ HistoryManager
                      ←→ GristManager

ModalManager → UserActionManager (pour historique)
HistoryManager → UserActionManager (pour utilisateur)
BoardRenderer → CardRenderer (pour rendu)
```

---

## 🛡️ Fonctions Critiques à ne PAS Casser

### 1. Filtrage des Données
**Fichier**: `FilterManager.js:264-308`
```javascript
// CRITIQUE: Vérifications explicites des chaînes vides
if (this.filters.bureau && this.filters.bureau.trim() !== '') {
  // ⚠️ Le .trim() !== '' est OBLIGATOIRE pour éviter les bugs de reset
}
```

### 2. Sauvegarde des Tâches  
**Fichier**: `ModalManager.js:447-568`
```javascript
// CRITIQUE: Validation des types avant envoi Grist
if (!this.isNewTask && (!this.currentTaskId || this.currentTaskId === null)) {
  console.error('ERREUR CRITIQUE: Tentative UpdateRecord avec currentTaskId null!');
  return; // ⚠️ Protection obligatoire
}
```

### 3. Gestion de l'Historique JSON
**Fichier**: `HistoryManager.js:880-954`
```javascript
// CRITIQUE: Structure JSON des notes
notesData = { content: "", history: [] };
// ⚠️ Cette structure est OBLIGATOIRE pour la compatibilité
```

---

## 🔧 Patterns de Code Obligatoires

### 1. Gestion d'Erreurs Async/Await
```javascript
// ✅ PATTERN CORRECT:
try {
  await grist.docApi.applyUserActions([action]);
  if (this.kanban.signalLocalUpdate) {
    this.kanban.signalLocalUpdate(); // ⚠️ Évite les cascades
  }
} catch (error) {
  console.error('Erreur:', error);
  displayError(`Erreur: ${error.message}`);
} finally {
  this.isUpdating = false; // ⚠️ Toujours libérer les verrous
}
```

### 2. Format des Listes Grist
```javascript
// ✅ PATTERN OBLIGATOIRE pour bureau/qui:
gristData.bureau = ['L', ...values]; // Premier élément DOIT être 'L'
// ❌ ERREUR:
gristData.bureau = values; // Cassera l'interface Grist
```

### 3. Nettoyage des Modales
```javascript
// ✅ PATTERN OBLIGATOIRE:
if (this.taskModal) {
  this.taskModal.hide();
}
// Puis nettoyer les références
this.currentTaskId = null;
this.currentTask = null;
```

---

## 🚨 Pièges Courants lors de Refactoring

### 1. ❌ Suppression de console.log Critiques
```javascript
// ❌ NE PAS SUPPRIMER ces logs, ils sont utilisés pour debug production:
console.log("onRecords ignoré (enregistrement temporaire système)");
console.log('🗑️ Début suppression - TaskId:', this.currentTaskId);
```

### 2. ❌ Changement des Noms de Propriétés
```javascript
// ❌ Ces noms sont liés aux colonnes Grist, ne pas changer:
record.titre           // Colonne Grist exacte
record.statut          // Colonne Grist exacte  
record.bureau          // Colonne Grist exacte (format liste)
record.qui             // Colonne Grist exacte (format liste)
```

### 3. ❌ Modification des Timeouts
```javascript
// ❌ Ces délais sont calibrés pour Grist, ne pas réduire:
setTimeout(() => this.kanban.refreshKanban(), 100); // Délai modal
await new Promise(resolve => setTimeout(resolve, 200)); // Délai temp record
```

---

## 🔍 Tests de Non-Régression

### Checklist Avant Commit:
- [ ] ✅ Création de tâche fonctionne (pas de doublons)
- [ ] ✅ Suppression de tâche ferme la modale  
- [ ] ✅ Filtres se réinitialisent correctement (bureau/qui)
- [ ] ✅ Édition de commentaires fonctionne
- [ ] ✅ Drag & drop change le statut
- [ ] ✅ Aucune erreur 404 sur les imports
- [ ] ✅ Console sans erreurs critiques

### Commandes de Test Rapide:
```javascript
// Test dans la console navigateur:
window.kanbanManager.debugInfo(); // Voir l'état complet
window.kanbanManager.getApplicationState(); // Vérifier l'init
```

---

## 📊 Métriques de Santé du Code

### Fichiers par Taille/Complexité:
- `kanban-app.js`: ~1700 lignes (LEGACY, ne pas refactorer)
- `ModalManager.js`: ~1100 lignes (stable)
- `HistoryManager.js`: ~1000 lignes (critique pour commentaires)
- `FilterManager.js`: ~580 lignes (stable)

### Points Chauds (modifications fréquentes):
1. `ModalManager.js` - Formulaires
2. `HistoryManager.js` - Commentaires  
3. `FilterManager.js` - Filtres
4. `kanban-app.js` - Intégrations

---

## 🆘 Guide de Dépannage Rapide

### Problème: Doublons de Tâches
→ Vérifier le filtrage `___TEMP_USER_RECORD___` dans `handleGristUpdate()`

### Problème: Modale ne se ferme pas
→ Vérifier les références `this.kanban.currentRecords` vs `this.currentRecords`

### Problème: Filtres ne se réinitialisent pas  
→ Vérifier les conditions `&& value.trim() !== ''` dans FilterManager

### Problème: Erreurs 404 sur imports
→ Vérifier les paths relatifs `../managers/` vs `./managers/`

### Problème: UserActionManager fails
→ Vérifier que la colonne `Cree_par` existe dans Grist

---

*Dernière mise à jour: 2025-01-13*
*Version: 1.0 - Documentation Anti-Régression*