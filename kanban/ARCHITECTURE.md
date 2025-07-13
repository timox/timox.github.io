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

### 1. 🚨 Enregistrements Temporaires (Anti-Doublons) - ✅ DOUBLE FILTRAGE
**Fichiers**: `kanban-app.js:1467-1475`, `kanban-app.js:1552-1555` et `UserActionManager.js:32-42`

```javascript
// CRITIQUE 1: Filtrage dans handleGristUpdate (onRecords)
if (gristRecords && Array.isArray(gristRecords)) {
  const hasTempRecord = gristRecords.some(record => 
    record && record.titre === '___TEMP_USER_RECORD___'  // ⚠️ String exact requis
  );
  if (hasTempRecord) {
    console.log("onRecords ignoré (enregistrement temporaire système)");
    return; // OBLIGATOIRE pour éviter les doublons
  }
}

// CRITIQUE 2: Filtrage dans filterRecords (rendu visuel) - AJOUTÉ 2025-01-13
const filteredTempRecords = records.filter(r => {
  return r && r.titre !== '___TEMP_USER_RECORD___';
});
```

**Règles CRITIQUES**:
- ❌ Ne JAMAIS changer la string `'___TEMP_USER_RECORD___'`
- ❌ Ne JAMAIS supprimer l'un de ces deux filtrages
- ⚠️ UserActionManager.js crée ces enregistrements pour récupérer le nom d'utilisateur
- 🔥 **NOUVEAU**: Double filtrage obligatoire (onRecords + rendu visuel)

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

### 4. 🚨 Gestion du Champ Description (Commentaires) - ✅ NOUVEAU
**Fichier**: `ModalManager.js:376-379`

```javascript
// ❌ ANCIEN CODE (causait confusion):
const latestDescription = tache.description ? 
  this.kanban.getLatestDescription(tache.description) : '';
setFieldValue('popup-description', latestDescription);

// ✅ NOUVEAU CODE (2025-01-13):
// Description - TOUJOURS VIDE pour saisie de nouveaux commentaires
// Les anciens commentaires sont visibles dans l'historique, pas dans la zone de saisie
setFieldValue('popup-description', '');
```

**Règles CRITIQUES**:
- ❌ Ne JAMAIS remplir le champ description avec les anciens commentaires
- ✅ Le champ description doit TOUJOURS être vide pour la saisie
- 📝 Les anciens commentaires sont visibles via l'historique (bouton timeline)
- 💾 Les nouveaux commentaires sont sauvés dans le système JSON (`notes`)

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
  // NOUVEAU: Vider le champ description après sauvegarde
  setFieldValue('popup-description', ''); // ⚠️ Obligatoire pour commentaires
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

// NOUVEAU: Vider le champ description
setFieldValue('popup-description', '');
```

### 4. 🆕 Interface d'Édition de Commentaires - AJOUTÉ 2025-01-13
```javascript
// ✅ PATTERN OBLIGATOIRE pour HistoryManager:
// 1. Initialisation dans init()
this.setupCommentEditWidget();

// 2. Création automatique du widget HTML
this.createCommentEditWidget(); // Crée le DOM si inexistant

// 3. Structure du widget
<div id="comment-edit-widget" class="comment-edit-overlay">
  <textarea id="comment-edit-text"></textarea>
  <button id="btn-save-comment-edit">Sauvegarder</button>
</div>
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
record.notes           // NOUVEAU: Système JSON pour commentaires
record.description     // LEGACY: Anciens commentaires (ne plus remplir)
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
- [ ] 🆕 **Champ description VIDE à l'ouverture de tâches existantes**
- [ ] 🆕 **Aucun enregistrement `___TEMP_USER_RECORD___` visible**
- [ ] 🆕 **Boutons d'édition (✏️) visibles dans l'historique des tâches**
- [ ] 🆕 **Widget d'édition s'ouvre lors du clic sur ✏️**

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
→ Vérifier le **DOUBLE** filtrage `___TEMP_USER_RECORD___` :
  1. Dans `handleGristUpdate()` (onRecords)
  2. Dans `filterRecords()` (rendu visuel) ⚠️ NOUVEAU

### Problème: Modale ne se ferme pas
→ Vérifier les références `this.kanban.currentRecords` vs `this.currentRecords`

### Problème: Filtres ne se réinitialisent pas  
→ Vérifier les conditions `&& value.trim() !== ''` dans FilterManager

### Problème: Erreurs 404 sur imports
→ Vérifier les paths relatifs `../managers/` vs `./managers/`

### Problème: UserActionManager fails
→ Vérifier que la colonne `Cree_par` existe dans Grist

### 🆕 Problème: Anciens commentaires dans la zone de saisie
→ Vérifier que `populateTaskForm()` met `setFieldValue('popup-description', '')`

### 🆕 Problème: Boutons d'édition de commentaires invisibles
→ Vérifier que `setupCommentEditWidget()` est appelé dans `HistoryManager.init()`

### 🆕 Problème: Widget d'édition ne s'ouvre pas
→ Vérifier que `createCommentEditWidget()` crée bien le DOM `comment-edit-widget`

---

*Dernière mise à jour: 2025-01-13 - 18:00*
*Version: 1.1 - Corrections Majeures Appliquées*

---

## 📈 **Changelog Version 1.1** - 2025-01-13

### 🔧 **Corrections Critiques Appliquées**

#### 1. **Filtrage Double Anti-Doublons** ✅
- **Ajout**: Filtrage des `___TEMP_USER_RECORD___` dans `filterRecords()` (rendu)
- **Localisation**: `kanban-app.js:1552-1555`
- **Impact**: Élimine les doublons visuels dans l'interface

#### 2. **Champ Description Toujours Vide** ✅  
- **Modification**: `populateTaskForm()` dans `ModalManager.js`
- **Changement**: `setFieldValue('popup-description', '')` systématique
- **Impact**: Zone de saisie propre pour nouveaux commentaires

#### 3. **Interface d'Édition de Commentaires** ✅
- **Ajout**: `setupCommentEditWidget()` dans `HistoryManager.init()`
- **Ajout**: `createCommentEditWidget()` - création automatique du DOM
- **Ajout**: Styles CSS pour le widget modal d'édition
- **Impact**: Édition complète des commentaires via boutons ✏️

#### 4. **Validation Système Notes JSON** ✅
- **Vérification**: Système `UserActionManager` → champ `notes` (JSON)
- **Migration**: Ancien système `description` → Nouveau système `notes`
- **Impact**: Persistance moderne et édition des commentaires

### 🚀 **Nouvelles Fonctionnalités**
- **Widget d'édition modal** avec overlay + styles CSS
- **Boutons d'édition** (✏️) dans l'historique des tâches
- **Filtrage intelligent** des enregistrements système
- **Zone de saisie propre** pour nouveaux commentaires

### ⚠️ **Points de Vigilance Ajoutés**
- Double filtrage obligatoire pour les enregistrements temporaires
- Champ description ne doit JAMAIS être pré-rempli
- Widget d'édition doit être initialisé dans `HistoryManager`
- Styles CSS auto-créés pour éviter les dépendances externes