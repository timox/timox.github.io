# Refactoring Architecture - Centralisation des Responsabilités

## Problème Identifié

**Dispersion des responsabilités de rendu** entre plusieurs managers, causant :
- Logique dupliquée entre `ViewModeManager` et `BoardRenderer`
- Difficultés de maintenance
- Incohérences dans le comportement des vues
- Couplage fort entre managers

## État Actuel - Chevauchements Détectés

### 🔄 **Gestion des Vues**
| Fonctionnalité | ViewModeManager | BoardRenderer | CardRenderer |
|----------------|-----------------|---------------|--------------|
| Application CSS modes | ✅ `applyCompactMode()` | ❌ | ❌ |
| Rendu colonnes | ❌ | ✅ `renderColumnMode()` | ❌ |
| Rendu cartes | ❌ | ❌ | ✅ `renderTaskCard()` |
| Navigation focus | ✅ `applyFocusMode()` | ✅ `renderFocusMode()` | ❌ |
| Repliage colonnes | ✅ `initColumnCollapse()` | ❌ | ❌ |
| Masquage colonnes vides | ✅ `hideEmptyColumns()` | ❌ | ❌ |

### ⚠️ **Problèmes identifiés :**
1. **ViewModeManager** gère le CSS ET la logique métier des colonnes
2. **BoardRenderer** connaît les modes de vue mais ne les applique pas
3. **CardRenderer** adapte le rendu selon le mode mais ne le gère pas
4. Navigation focus dispersée entre 2 managers

---

## Architecture Cible - Principe de Responsabilité Unique

### 📐 **ViewManager** (fusionné & centralisé)
**Responsabilité unique :** Gestion complète des modes de vue

```javascript
class ViewManager {
  // CONSOLIDATION COMPLÈTE
  - setViewMode(mode)
  - renderView(mode, records)  // ← NOUVEAU: rendu unifié
  - applyModeStyles(mode)
  - handleModeSpecificLogic(mode)
  - handleColumnCollapse()     // ← Déplacé de ViewModeManager
  - handleFocusNavigation()    // ← Déplacé de ViewModeManager
  - renderCards(records, mode) // ← Déplacé de CardRenderer
  - renderColumns(records, mode) // ← Déplacé de BoardRenderer
}
```

### 🎯 **FilterManager** (inchangé)
**Responsabilité unique :** Gestion des filtres
- Aucun chevauchement détecté
- Architecture correcte

### 📝 **ModalManager** (inchangé)
**Responsabilité unique :** Gestion des modales
- Aucun chevauchement détecté
- Architecture correcte

### 🗂️ **GristManager** (inchangé)
**Responsabilité unique :** Interface avec Grist
- Aucun chevauchement détecté
- Architecture correcte

---

## Plan de Refactoring

### Phase 1 : Fusion ViewModeManager + BoardRenderer
```
ViewModeManager + BoardRenderer → ViewManager
```

**Actions :**
1. Créer `ViewManager.js`
2. Migrer méthodes de rendu depuis `BoardRenderer`
3. Migrer logique de modes depuis `ViewModeManager`
4. Supprimer `BoardRenderer.js` et `ViewModeManager.js`

### Phase 2 : Intégration CardRenderer
```
CardRenderer → Méthodes internes de ViewManager
```

**Actions :**
1. Migrer `renderTaskCard()` dans `ViewManager`
2. Adapter les méthodes de calcul de priorité
3. Supprimer `CardRenderer.js`

### Phase 3 : Nettoyage KanbanManager
```javascript
// AVANT
this.viewModeManager = new ViewModeManager(this);
this.cardRenderer = new CardRenderer(this);
this.boardRenderer = new BoardRenderer(this, this.cardRenderer);

// APRÈS
this.viewManager = new ViewManager(this);
```

## 📆 Mises à jour 2025-09

- ✅ **Boutons de repliage harmonisés** : `ViewModeManager` et `BoardRenderer` propagent désormais la couleur d'accent de chaque
  statut jusqu'au bouton de repliage pour respecter les codes couleur de colonne. Le compteur de pile est recalculé lors de
  chaque repli afin de garder une lecture claire des colonnes cachées.
- ✅ **Pile persistante** : `ViewModeManager.onKanbanRendered()` ré-applique `restoreCollapsedColumns()` après chaque rendu afin
  de reconstruire la pile latérale et conserver l'état de repli même après un rafraîchissement ou un changement de vue.
- ✅ **Normalisation des options Grist** : `KanbanManager.normalizeGristOptions()` supprime les marqueurs `"L"`, unifie les clés
  singulier/pluriel et fournit des listes triées aux filtres et à la modale. Les menus Bureau / Responsable ne remontent plus de
  valeurs fantômes.
- ✅ **Modal compactée** : la fiche tâche affiche un layout deux colonnes avec panneau historique latéral. Le résumé (dernière
  mise à jour, responsables, statut) est pré-rempli dès l'ouverture, puis enrichi par un chargement différé de l'historique via
  l'accordéon.
- ✅ **Aide clavier sur demande** : la modale raccourcis ne s'affiche plus automatiquement ; elle est déclenchée via le bouton `?`
  de l'en-tête pour éviter l'encombrement initial.
- ✅ **Mode détaillé initial** : `ViewModeManager.initializeViewMode()` est exécuté dès l'instanciation et `KanbanManager.setupViewControls()`
  s'aligne dessus, ce qui garantit l'affichage des boutons de repliage et de la pile latérale sans action manuelle.
- ✅ **Focus recentré** : `kanban-base.css` et `redistributeColumnWidths()` basculent le mode focus en pile verticale (stack au-dessus
  de la colonne active) pour éviter l'empilement horizontal.
- ✅ **Stratégies dynamiques** : `ModalManager.handleStrategyDataLoaded()` re-render l'accordéon dès que `Ssir_strategie2` est
  disponible et restaure la sélection existante.
- ✅ **UI épurée** : suppression du bouton "Fenêtre" sur le panneau historique et retrait du toast de succès initial pour éviter les
  erreurs de clic et le message vert dans `#error-container`.
- ✅ **Stats sécurisées** : `stats.html` expose désormais `#stats-container` et attend explicitement `grist.ready({ requiredAccess:
  'read table' })` pour lever les erreurs d'initialisation.
- ✅ **Gabarit aligné** : `test/index.html` adopte `view_data_pane_container flexvbox viewsection_type_custom` pour retrouver la pleine largeur dans Grist tout en préservant les modales globales.
- ✅ **Boutons minimalistes** : `kanban-base.css` retire les fonds dégradés des contrôles de repliage, conserve les icônes `arrow-bar` et applique la teinte de statut avec des focus visibles.
- ✅ **Options consolidées** : `GristManager.loadGristOptions()` combine les valeurs Grist et les listes par défaut (bureau, responsable, projet, urgence, impact, statut) avant normalisation, supprimant le marqueur « L » et les sélecteurs vides.
- ✅ **Stats consolidées** : `stats-app.js` réactive la table Priorité/Statut et supprime les marqueurs de conflit `<<` responsables du `SyntaxError`.

---

## Structure Finale

```
managers/
├── ViewManager.js          ← NOUVEAU (fusion 3 classes)
├── FilterManager.js        ← inchangé
├── ModalManager.js         ← inchangé
├── GristManager.js         ← inchangé
├── HistoryManager.js       ← inchangé
├── DatePickerManager.js    ← inchangé
└── JalonManager.js         ← inchangé

renderers/                  ← SUPPRIMÉ
└── [vide]
```

---

## Avantages de la Refactorisation

### ✅ **Cohérence**
- Une seule classe pour tout le rendu des vues
- Logique centralisée et prévisible
- Pas de duplication de code

### ✅ **Maintenance**
- Modifications des vues dans un seul fichier
- Débuggage simplifié
- Tests unitaires facilités

### ✅ **Performance**
- Moins d'appels entre managers
- Optimisation du rendu global
- Gestion unifiée du DOM

### ✅ **Extensibilité**
- Ajout de nouveaux modes de vue simplifié
- Architecture scalable
- Séparation claire des responsabilités

---

## Risques et Mitigation

### ⚠️ **Risque : Classe trop volumineuse**
**Mitigation :** Utiliser des méthodes privées et des sous-modules internes

### ⚠️ **Risque : Régression fonctionnelle**
**Mitigation :** Tests de non-régression avant suppression des anciennes classes

### ⚠️ **Risque : Couplage avec KanbanManager**
**Mitigation :** Interface claire et contrat d'API stable

---

## Validation

Cette refactorisation respecte les principes SOLID :
- **S** : Une responsabilité par classe ✅
- **O** : Ouvert aux extensions ✅  
- **L** : Substitution de Liskov ✅
- **I** : Interfaces segregées ✅
- **D** : Inversion des dépendances ✅