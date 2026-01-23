# 📋 Documentation d'Architecture Kanban - Guide Anti-Régression

## 🎯 Objectif
Cette documentation technique évite les erreurs de factorisation en documentant l'architecture critique, les dépendances et les pièges courants.

---

## 📁 Structure des Modules

### Architecture Générale
```
js/
├── app-initializer.js         # Point d'entrée pour index.html
├── taches-app.js              # Point d'entrée pour taches.html
├── missions-app.js            # Point d'entrée pour missions.html
├── timeline-app.js            # Point d'entrée pour timeline.html
├── core/
│   ├── KanbanManager.js       # Orchestrateur principal (index.html)
│   └── EventCentralizer.js    # Centralisation des événements
├── components/
│   └── SharedTaskModal.js     # 🔧 Modale d'édition UNIQUE (partagée)
├── managers/                  # 🔧 Gestionnaires spécialisés
│   ├── FilterManager.js       # Filtres et recherche
│   ├── DashboardManager.js    # Dashboard V3 (statistiques & alertes)
│   ├── TimelineManager.js     # Timeline V3 (planification)
│   ├── HistoryManager.js      # Historique et commentaires
│   ├── DatePickerManager.js   # Sélection de dates
│   ├── ViewManager.js         # Modes d'affichage et rendu
│   ├── JalonManager.js        # Gestion des jalons
│   └── GristManager.js        # Interface Grist (CRUD)
├── utils/                     # 🛠️ Utilitaires
│   ├── UserActionManager.js   # Actions utilisateur & historique JSON
│   ├── NotesJsonMigrator.js   # Migration notes
│   ├── LoggerManager.js       # Système de logs avec niveaux
│   ├── dom.js                 # Manipulation DOM
│   ├── dates.js               # Gestion dates
│   └── badges.js              # Génération badges
└── config/
    └── constants.js           # Constantes globales (agents, bureaux, statuts)
```

---

## 🔧 **STRUCTURE JSON UNIFIÉE POUR L'HISTORIQUE** - VERSION 2025-07-16

### **Structure Définitive du Champ `notes`** :
```javascript
{
  "entries": [
    {
      "id": "uuid-unique",               // ID unique pour édition
      "timestamp": "2025-07-16T10:30:00.000Z",
      "user": "nom_utilisateur",
      "type": "field_change" | "comment" | "creation" | "status_change",
      "changes": [                       // Toujours un tableau
        {
          "field": "titre",
          "value": "Nouveau titre",
          "previous": "Ancien titre"     // Pour récupération historique
        },
        {
          "field": "statut", 
          "value": "En cours",
          "previous": "À faire"
        }
      ],
      "comment": "Commentaire utilisateur", // Optionnel - seulement si type="comment"
      "editable": true | false            // Seuls les commentaires sont éditables
    }
  ]
}
```

### **Types d'Entrées** :
- **`field_change`** : Modification d'attributs (titre, urgence, bureau, etc.)
- **`comment`** : Commentaire utilisateur (éditable uniquement)
- **`creation`** : Création de tâche
- **`status_change`** : Changement de statut (drag & drop)

### **Champs Trackés** (tous les changements significatifs) :
```javascript
[
  'titre', 'statut', 'bureau', 'qui', 'urgence', 'impact', 'projet',
  'strategie_id', 'date_debut', 'date_echeance', 'date_derniere_maj'
  // ❌ 'description' IGNORÉ (legacy)
  // ❌ 'strategie_*' auto-computed depuis strategie_id
]
```

### **Règles Critiques** :
1. **Pas de doublon** : Sauvegarder sans changement = pas d'entrée historique
2. **Historique unifié** : Commentaires ET changements dans la même structure
3. **Récupération** : Anciennes valeurs via `previous` dans l'historique
4. **Édition** : Seuls les commentaires (type="comment") sont éditables

### **Problème de Migration** :
- **Perdu** : Historique mélangé avec commentaires dans ancien JSON
- **Solution** : Nouvelle structure claire sans ambiguïté

---

## ⚠️ ZONES CRITIQUES - NE PAS CASSER

### 1. 🚨 Enregistrements Temporaires (Anti-Doublons) - ✅ DOUBLE FILTRAGE
**Fichiers**: `GristManager.js` et `UserActionManager.js`

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
**Fichier**: `SharedTaskModal.js`

```javascript
// ❌ ERREUR fréquente:
this.gristOptions.projet = updatedProjects;
// ✅ CORRECT:
this.options.gristManager.gristOptions.projet = updatedProjects;
```

**Règle**: Toujours passer par les références correctes pour accéder aux propriétés partagées.

### 4. 🚨 Gestion du Champ Description (Commentaires) - ✅ NOUVEAU
**Fichier**: `SharedTaskModal.js`

```javascript
// ❌ ANCIEN CODE (causait confusion):
// Remplir le champ description avec les anciens commentaires

// ✅ NOUVEAU CODE:
// Description - TOUJOURS VIDE pour saisie de nouveaux commentaires
// Les anciens commentaires sont visibles dans l'historique, pas dans la zone de saisie
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
1. app-initializer.js / *-app.js (point d'entrée)
   ↓
2. KanbanManager.js / GristManager.js (données)
   ↓
3. SharedTaskModal.js (modale partagée)
   ↓
4. Managers (FilterManager, ViewManager, etc.)
   ↓
5. Utils (UserActionManager, dom, dates, badges)
```

### Modèle stratégique (nomenclature)
- Le champ **`axe_strategique`** remplace l'ancien `action` dans la table `Ssir_strategie2`.
- Les libellés UI doivent parler d'**axe stratégique** (et non d'action).

### Références Inter-Modules
```
KanbanManager ←→ FilterManager
              ←→ SharedTaskModal (via modalManager)
              ←→ HistoryManager
              ←→ GristManager
              ←→ ViewManager

SharedTaskModal → GristManager (pour CRUD)
HistoryManager → UserActionManager (pour utilisateur)
ViewManager → CardRenderer (pour rendu)
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
**Fichier**: `SharedTaskModal.js` et `GristManager.js`
```javascript
// CRITIQUE: Validation des types avant envoi Grist
if (!isNewTask && (!taskId || taskId === null)) {
  console.error('ERREUR CRITIQUE: Tentative UpdateRecord avec taskId null!');
  return; // ⚠️ Protection obligatoire
}
```

### 3. Gestion de l'Historique JSON - **SYSTÈME COMPLET REVISÉ**
**Fichiers**: `HistoryManager.js`, `UserActionManager.js`

#### 🆕 **Nouveautés 2025-07-14**: Tracking Complet des Changements

##### 📋 **Champs Automatiquement Trackés** (UserActionManager.js:301-305)
```javascript
// ✅ OBLIGATOIRE: Ces 13 champs déclenchent des entrées d'historique
const relevantFields = [
  'statut',                    // Statut de la tâche
  'titre',                     // Titre de la tâche
  'description',               // Description/commentaires
  'bureau',                    // Équipe/Bureau (tableau)
  'qui',                       // Responsables (tableau)
  'urgence',                   // Niveau d'urgence
  'impact',                    // Niveau d'impact
  'projet',                    // Projet associé
  'strategie_objectif',        // Objectif stratégique
  'strategie_sous_objectif',   // Sous-objectif stratégique
  'strategie_action',          // Action stratégique
  'date_debut',                // Date de début
  'date_echeance'              // Date d'échéance
];
```

##### 🔍 **Logique de Détection des Changements**
```javascript
// ✅ TABLEAUX (bureau, qui): Comparaison triée pour éviter faux positifs
const oldStr = oldValue.slice().sort().join(',');
const newStr = newValue.slice().sort().join(',');
if (oldStr !== newStr) { /* changement détecté */ }

// ✅ AUTRES CHAMPS: Comparaison directe
if (oldValue !== newValue) { /* changement détecté */ }

// ✅ AFFICHAGE: Valeurs vides → "aucune" ou "aucun"
const display = value || 'aucune';
```

##### 💬 **Messages Générés Automatiquement**
```javascript
// ✅ NOUVEAU: Messages spécifiques selon le type de changement
"Projet changé: Ancien Projet → Nouveau Projet"
"Urgence modifiée: Faible → Élevée"  
"Responsables modifiés: Jean → Jean, Marie"
"Équipe modifiée: [Dev] → [Dev, Test]"
"Date d'échéance modifiée: 2025-01-15 → 2025-01-20"

// ✅ PRÉVENTION: Changements invalides ignorés
if (oldStatus === newStatus) {
  return; // Ne pas enregistrer "Status changed from À faire to À faire"
}
```

**⚠️ IMPORTANT**: Seuls ces 13 champs génèrent des entrées d'historique. Les autres champs (comme `id`, `date_creation`, etc.) sont ignorés.

##### 📝 **Structure JSON des Notes** (OBLIGATOIRE):
```javascript
notesData = { 
  content: "", 
  history: [
    {
      timestamp: "2025-07-14T10:30:00.000Z", // ✅ CORRIGÉ: Vraies heures
      user: "utilisateur",
      action: "field_change", // NOUVEAU: Type spécifique
      details: "Projet changé: Ancien → Nouveau", // NOUVEAU: Message spécifique
      status: "En cours"
    }
  ]
};
```

### 4. Modes de Vue - **LOGIQUE REVISÉE**
**Fichier**: `ViewModeManager.js`

#### 🆕 **Nouveautés 2025-07-14**: Gestion Intelligente des Colonnes
```javascript
// ✅ NOUVEAU: Masquage automatique des colonnes vides
hideEmptyColumns() {
  // Masque les colonnes sans tâches, sauf si toutes sont vides
}

// ✅ NOUVEAU: Mode focus intelligent avec fallback
if (!this.focusColumn) {
  this.focusColumn = this.findFirstColumnWithTasks() || 'À faire';
}

// ✅ NOUVEAU: Synchronisation des refreshs
refreshWithSync() {
  // Évite les rafraichissements multiples avec timeout de 50ms
  // Applique le mode focus APRÈS le refresh
}
```

#### Logs de Debug Obligatoires:
```javascript
// ✅ OBLIGATOIRE: Logs détaillés pour debugging mode focus
this.logger.debug(`Mode focus: recherche colonne "${focusColumnName}" parmi ${columns.length} colonnes`);
this.logger.debug(`Comparaison: "${columnName}" === "${focusColumnName}" ?`, columnName === focusColumnName);
```

---

## 📊 Système de Logs - **NOUVEAU**
**Fichier**: `LoggerManager.js`

### Niveaux de Log (Ordre d'importance):
1. **CRITICAL** - Erreurs bloquantes
2. **ERROR** - Erreurs importantes  
3. **WARN** - Avertissements
4. **INFO** - Informations générales
5. **DEBUG** - Debug détaillé

### Utilisation Obligatoire:
```javascript
// ✅ OBLIGATOIRE: Initialiser dans constructor
import { createModuleLogger } from '../utils/LoggerManager.js';
this.logger = createModuleLogger('ModuleName');

// ✅ OBLIGATOIRE: Utiliser au lieu de console.log
this.logger.debug('Data parsed', data.length);
this.logger.info('Operation completed');
this.logger.error('Critical error:', error);

// ❌ INTERDIT: console.log direct (non contrôlable)
console.log('HistoryManager: Data parsed'); // INTERDIT
```

### Contrôle via Console:
```javascript
// Changer le niveau de log globalement
logger.setLevel('ERROR'); // Ne montrer que ERROR et CRITICAL

// Debug spécifique d'un module
logger.setModuleLevel('HistoryManager', 'DEBUG');
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

### 1. ❌ Utilisation Directe de console.log et Suppression de Logs Critiques

#### Règle Logger Obligatoire:
```javascript
// ❌ INTERDIT: console.log direct
console.log('HistoryManager: Data parsed'); // Non contrôlable

// ✅ OBLIGATOIRE: Utiliser le système de logger avec niveaux
this.logger.debug('Data parsed');     // Contrôlable via niveau DEBUG
this.logger.info('Important action'); // Niveau INFO  
this.logger.error('Critical error');  // Niveau ERROR

// Initialisation dans constructor:
this.logger = createModuleLogger('ModuleName');
```

#### Logs de Production Critiques:
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
- `KanbanManager.js`: ~1200 lignes (orchestrateur principal)
- `SharedTaskModal.js`: ~800 lignes (modale partagée)
- `HistoryManager.js`: ~1000 lignes (critique pour commentaires)
- `GristManager.js`: ~600 lignes (CRUD Grist)
- `FilterManager.js`: ~580 lignes (stable)

### Points Chauds (modifications fréquentes):
1. `SharedTaskModal.js` - Formulaires
2. `HistoryManager.js` - Commentaires
3. `FilterManager.js` - Filtres
4. `KanbanManager.js` - Orchestration

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

### 🚨 Problème: Erreur de syntaxe "unexpected token: '{'"
→ Vérifier les accolades fermantes en trop après modification de code
→ Ligne type: `} }` (double accolade fermante)

### 🚨 Problème: Double création de tâches (RÉSOLU)
→ **SOLUTION APPLIQUÉE (2026-01)**:
  - Migration vers `SharedTaskModal.js` comme modale UNIQUE
  - Suppression des fichiers legacy (`kanban-app.js`, `ModalManager.js`)
  - Une seule instance de modale par page (pattern singleton)
→ **RÈGLE ABSOLUE**: `SharedTaskModal` est le seul gestionnaire de modales

---

## 🔄 **Migration et Nettoyage des Données**

### ⚠️ **IMPORTANT: Problème de Synchronisation notes.content**

**Problème identifié :**
- `notes.content` n'est PAS synchronisé avec les nouveaux commentaires
- Seul `notes.history` est mis à jour avec les commentaires récents
- Cause des résumés de descriptions vides/obsolètes

**Actions requises (dans l'ordre) :**
1. ✅ **Corriger la synchronisation** : Mettre à jour `notes.content` avec le dernier commentaire **[RÉSOLU 29/07/2025]**
2. ⏳ **Vérifier migration complète** : S'assurer que toutes les données `description` sont migrées
3. ⏳ **Supprimer colonne description** : Une fois migration 100% terminée

**Structure JSON optimale :**
```javascript
{
  "content": "Dernier commentaire actuel",  // ← Toujours synchronisé
  "history": [                              // ← Historique complet
    { "action": "comment", "newValue": "Dernier commentaire actuel", ... },
    { "action": "comment", "newValue": "Commentaire précédent", ... }
  ]
}
```

### 🎯 **Plan de Migration**

**Phase 1 : Correction Système** ✅ **[TERMINÉE 29/07/2025]**
- ✅ **Fix appliqué dans `NotesJsonMigrator.addHistoryEntry()`** : Solution universelle
- ✅ **Logique corrigée** : `if (historyEntry.newValue && historyEntry.newValue.trim() !== '')` 
- ✅ **Impact** : Synchronisation automatique de `content` avec toute valeur significative

**Phase 2 : Validation**
- Vérifier que tous les enregistrements `description` sont migrés vers `notes`
- Tester que `notes.content` est toujours synchronisé

**Phase 3 : Nettoyage**
- Supprimer la colonne `description` de la table Grist
- Nettoyer les références `record.description` dans le code

---

*Dernière mise à jour: 2026-01-21 - Migration V3 + Classification*
*Version: 1.4 - Migration V3, Classification, Nettoyage Doublons*

---

## 🚀 **Migration V3 et Classification des Tâches** - 2026-01-21

### **Système de Classification (missions.html)**

Le système de classification permet d'attacher des tâches non classifiées à des missions.

#### Flux de Classification :
```
1. Bouton "Classifier" sur tâche non classifiée
   ↓
2. Modal de classification s'ouvre
   ↓
3. Sélection Mission → Sous-action (optionnel)
   ↓
4. MissionsManager.attachTaskToMission()
   ↓
5. Mise à jour Grist : mission_code, sous_action_code, taxonomie V3
```

#### Fichiers impliqués :
- `js/missions-app.js` - handlers `.btn-classify-task`, `handleClassifyTask()`, `saveClassification()`
- `missions.html` - Modal `#modal-classify`

### **Outils de Migration (setup.html, migration.html)**

#### Création de Colonnes Grist - Pattern Corrigé :
```javascript
// ✅ PATTERN CORRECT (AddColumn d'abord)
try {
  await grist.docApi.applyUserActions([
    ['AddColumn', TABLE_ID, colId, { type, label, widgetOptions }]
  ]);
  console.log(`✓ ${colId} créée`);
} catch (addError) {
  if (addError.message && addError.message.includes('already exists')) {
    // Colonne existe déjà → ModifyColumn
    await grist.docApi.applyUserActions([
      ['ModifyColumn', TABLE_ID, colId, { type, label, widgetOptions }]
    ]);
    console.log(`⚡ ${colId} mise à jour`);
  } else {
    throw addError;
  }
}

// ❌ ANCIEN PATTERN (ne fonctionnait pas)
// ModifyColumn d'abord, puis AddColumn sur erreur "not found"
// L'erreur n'était pas détectée correctement
```

#### Détection et Suppression des Doublons :
```javascript
// Détection dans analyze()
const titleCounts = {};
for (const record of this.records) {
  if (record.titre?.startsWith('[MISSION]') || record.titre?.startsWith('[SA]')) {
    titleCounts[record.titre] = titleCounts[record.titre] || [];
    titleCounts[record.titre].push(record);
  }
}
// Garder le premier (ID le plus bas), marquer les autres comme doublons
for (const [title, records] of Object.entries(titleCounts)) {
  if (records.length > 1) {
    records.sort((a, b) => a.id - b.id);
    this.duplicates.push(...records.slice(1));
  }
}

// Suppression par lots
async deleteDuplicates() {
  const batchSize = 50;
  for (let i = 0; i < this.duplicates.length; i += batchSize) {
    const batch = this.duplicates.slice(i, i + batchSize);
    await grist.docApi.applyUserActions([
      ['BulkRemoveRecord', TABLE_ID, batch.map(r => r.id)]
    ]);
  }
}
```

#### Auto-création des Colonnes V3 :
```javascript
// Dans migration-app.js
async ensureV3Columns() {
  const columns = {
    nature_activite: { type: 'Choice', label: 'Nature activité', ... },
    genre_action: { type: 'Choice', label: 'Genre action', ... },
    etape_code: { type: 'Choice', label: 'Étape cycle', ... },
    previsibilite: { type: 'Choice', label: 'Prévisibilité', ... }
  };
  // Créer chaque colonne avec le pattern AddColumn-first
}
```

### **Taxonomie V3 - 3 Axes Orthogonaux**

| Axe | Colonne | Question | Valeurs |
|-----|---------|----------|---------|
| Nature | `nature_activite` | Pourquoi ? | INC, SUP, MCO, PRJ, OVH |
| Genre | `genre_action` | Comment ? | DOC, ANA, DEV, TST, ... |
| Étape | `etape_code` | Où ? | ETP.VIS, ETP.ANA, ETP.CON, ... |

### **Hiérarchie des Données**

```
Stratégie
  └── Programme
       └── Mission ([MISSION] prefix)
            └── Sous-action ([SA] prefix)
                 └── Tâche
```

---

## 📈 **Changelog Version 1.2** - 2025-01-13

### 🔧 **Nouvelles Fonctionnalités**

#### 1. **Système de Logs Intelligent** ✅
- **Ajout**: `LoggerManager.js` avec 5 niveaux de logs (CRITICAL→DEBUG)
- **Fonctionnalité**: Anti-spam, filtres par module, sauvegarde préférences
- **Intégration**: KanbanManager et UserActionManager utilisent le nouveau système
- **Contrôle**: Interface console simple (`logger.setLogLevel('ERROR')`)
- **Impact**: Réduction massive du bruit de debug, focus sur l'essentiel

#### 2. **Correction Erreur de Syntaxe** ✅
- **Problème**: `Uncaught SyntaxError: unexpected token: '{'` dans HistoryManager.js:845
- **Cause**: Accolade fermante en trop (`} }`) ligne 839
- **Solution**: Suppression accolade supplémentaire
- **Impact**: Application se charge sans erreur de syntaxe

#### 3. **Correction Double Création de Tâches (RÉSOLU DÉFINITIVEMENT)** ✅
- **Problème**: Chaque clic créait 2+ tâches identiques (25+ versions!)
- **Solution finale (2026-01)**:
  - Migration vers `SharedTaskModal.js` comme modale UNIQUE
  - Suppression des fichiers legacy (`kanban-app.js`, `ModalManager.js`)
  - Pattern singleton: une seule instance de modale par page
- **Impact**: UNE SEULE tâche créée par action, architecture propre

### 🎯 **Améliorations**
- **Logs colorés** dans la console pour lecture facile
- **Documentation** complète dans `LOGGING_GUIDE.md`
- **Intégration** transparente avec l'existant
- **Contrôle granulaire** du debug par module

---

## 📈 **Changelog Version 1.1** - 2025-01-13

### 🔧 **Corrections Critiques Appliquées**

#### 1. **Filtrage Double Anti-Doublons** ✅
- **Ajout**: Filtrage des `___TEMP_USER_RECORD___` dans `filterRecords()` (rendu)
- **Localisation**: `GristManager.js` et `FilterManager.js`
- **Impact**: Élimine les doublons visuels dans l'interface

#### 2. **Champ Description Toujours Vide** ✅
- **Modification**: `SharedTaskModal.js`
- **Changement**: Zone de saisie vide pour nouveaux commentaires
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
- **CRITIQUE**: Toujours vérifier les accolades fermantes après édition de code
