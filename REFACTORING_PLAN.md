# 📋 Plan de Refactorisation Kanban SSIR

## 🎯 Objectif
Refactoriser proprement l'application Kanban sans tout détruire, en corrigeant les incohérences identifiées entre les environnements.

## 🔍 Analyse des Incohérences Actuelles

### ❌ Problèmes Identifiés

#### 1. **Références API Grist Incohérentes**
**Problème:** Mélange de `grist` et `window.grist` dans le code
**Impact:** Erreur `can't access property "on", undefined`
**Localisation:** 
- `kanban-app.js` lignes 213, 214, 218, 219
- Toutes les méthodes utilisant `grist.docApi.fetchTable()`

#### 2. **Divergence Architecturale /kanban vs /test**
**Problème:** Structures de code différentes entre environnements
**Impact:** Comportements différents, debugging complexe
**Détails:**
- `/kanban/` : Architecture moderne avec `kanban-app.js`
- `/test/` : Ancienne architecture avec `/core/KanbanManager.js`
- `index.html` différents (imports, scripts, versions)

#### 3. **Cache et Versioning**
**Problème:** Paramètres `?v=20250728-DEDUP-MODAL` obsolètes
**Impact:** Versions obsolètes servies, corrections non appliquées
**Cause:** URLs de scripts avec cache-busting manuel

#### 4. **Gestion des Erreurs Défaillante**
**Problème:** Pas de fallback gracieux si `window.grist` indisponible
**Impact:** Application plante au lieu de donner un message d'erreur utile

#### 5. **Duplication de Code**
**Problème:** Code copié/collé entre `/kanban/` et `/test/`
**Impact:** Maintenance difficile, risque de désynchronisation

## 🔧 Plan de Refactorisation Méthodique

### Phase 1: Stabilisation de l'API Grist ✅ (Déjà fait)
- [x] Correction de toutes les références `grist` → `window.grist`
- [x] Ajout de vérifications de disponibilité de l'API
- [x] Tests de fonctionnement en environnement Grist

### Phase 2: Unification Architecturale
#### 2.1 Définir l'Architecture de Référence
**Source:** `/kanban/` (version qui fonctionne)
**Raison:** Architecture moderne, testée, fonctionnelle

#### 2.2 Synchronisation /test avec /kanban
```bash
# Structure à unifier
/kanban/js/               # RÉFÉRENCE
├── kanban-app.js        # Point d'entrée principal
├── app-initializer.js   # Initialisation
├── managers/            # Gestionnaires spécialisés
├── utils/               # Utilitaires
└── config/              # Configuration

/test/js/                # À SYNCHRONISER
├── [IDEM structure]
```

#### 2.3 Unification des index.html
- Scripts identiques
- Même structure HTML
- Cache-busting cohérent

### Phase 3: Nettoyage du Cache et Versioning
#### 3.1 Suppression du Cache-busting Manuel
- Retirer `?v=20250728-DEDUP-MODAL`
- Utiliser le cache naturel de GitHub Pages
- Versioning via git tags si nécessaire

#### 3.2 Headers HTTP Corrects
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### Phase 4: Robustesse et Gestion d'Erreurs
#### 4.1 Vérifications API Grist Robustes
```javascript
// Pattern à implémenter partout
if (typeof window.grist === 'undefined') {
  this.displayUserFriendlyError('API Grist non disponible...');
  return;
}
```

#### 4.2 Messages d'Erreur Utilisateur
- Remplacer erreurs techniques par messages clairs
- Guide de dépannage intégré
- Diagnostic automatique

### Phase 5: Tests et Validation
#### 5.1 Tests de Régression
- [x] Environnement local Docker ✅
- [ ] GitHub Pages /kanban/
- [ ] GitHub Pages /test/
- [ ] Grist ministériel (si accessible)

#### 5.2 Checklist de Fonctionnement
- [ ] Initialisation sans erreur
- [ ] Chargement des données
- [ ] Création/modification tâches
- [ ] Drag & drop
- [ ] Filtres et recherche
- [ ] Modes de vue (1,2,3)

## 🚀 Ordre d'Exécution Recommandé

### Immédiat (Priorité 1) 🔴
1. **Vérifier le déploiement des corrections API Grist**
2. **Tester /kanban/ sur GitHub Pages**
3. **Corriger /test/ seulement si /kanban/ fonctionne**

### Court terme (Priorité 2) 🟡  
1. **Synchronisation complète /test/ avec /kanban/**
2. **Nettoyage du cache-busting manuel**
3. **Unification des index.html**

### Moyen terme (Priorité 3) 🟢
1. **Amélioration gestion d'erreurs**
2. **Documentation architecture unifiée**
3. **Tests automatisés**

### 2025-09 - Stabilisation ergonomie (en cours)
- [x] Boutons de repliage alignés sur la charte couleur par statut
- [x] Pile latérale restaurée et persistante via `ViewModeManager.onKanbanRendered()` et `restoreCollapsedColumns()`
- [x] Normalisation des listes Grist (suppression marqueur `L`, tri unique)
- [x] Modal tâche compactée + historique latéral repliable
- [ ] Tests manuels complets sur la nouvelle modale
- [x] Réactivation du mode détaillé au chargement pour retrouver les contrôles de repliage et la pile latérale dès la première
  vue.
- [x] Largeur de colonnes harmonisée (360 px détaillé, 620 px focus) pour supprimer l'effet "contenu entassé".
- [x] Pile de colonnes repliées restituée en mode focus avec affichage vertical unique.
- [x] Pile repliée ancrée dans `.kanban-wrapper` avec grille responsive pour garder les colonnes réduites visibles et cliquables.
- [x] Rafraîchissement automatique des stratégies de la modal dès réception de `Ssir_strategie2`.
- [x] Suppression du toast de succès initial et du bouton "Fenêtre" de l'historique pour éviter les erreurs runtime.
- [x] Page de statistiques initialisée via `#stats-container` + `grist.ready({ requiredAccess: 'read table' })`.
- [x] Conteneur principal aligné sur la classe `view_data_pane_container flexvbox viewsection_type_custom` afin de restituer la
  pleine largeur et l'intégration Grist.
- [x] Boutons de repliage épurés (icône `arrow-bar`, sans fond dégradé) tout en conservant la couleur de statut et des focus
  visibles.
- [x] `GristManager.loadGristOptions()` fusionne désormais les valeurs Grist et les listes par défaut (bureau, responsable,
  projet, urgence, impact, statut) avant normalisation pour éliminer l'entrée « L » et éviter les sélecteurs vides.
- [x] `stats-app.js` rétablit la table Priorité/Statut et nettoie les marqueurs de conflit `<<` à l'origine du `SyntaxError`.

## ⚠️ Précautions

### Ce qu'il NE faut PAS faire
- ❌ Modifier plusieurs environnements simultanément
- ❌ Supprimer du code sans backup
- ❌ Deployer en prod sans tests
- ❌ Refactoriser pendant qu'il y a des erreurs actives

### Ce qu'il FAUT faire
- ✅ Tester chaque changement individuellement
- ✅ Garder la version qui fonctionne comme référence
- ✅ Documenter chaque modification
- ✅ Valider avec l'utilisateur avant déploiement

## 📊 Critères de Succès

### Technique
- Zéro erreur JavaScript au chargement
- Temps de chargement < 3 secondes
- API Grist fonctionne dans tous les environnements

### Utilisateur  
- Interface identique partout
- Fonctionnalités préservées
- Performance maintenue ou améliorée

### Maintenance
- Code unifié entre environnements
- Documentation à jour
- Architecture claire et cohérente

---

*Dernière mise à jour: 1er septembre 2025*
*Status: Phase 1 terminée ✅, Phase 2 en attente de validation*