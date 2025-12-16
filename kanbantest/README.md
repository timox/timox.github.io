# Kanban SSIR - Tableau de Bord de Gestion des Tâches (Environnement Test)

## 📋 Description

Application web de gestion de tâches en mode Kanban intégrée avec Grist. Permet le suivi des tâches, la gestion des priorités, et l'historique des actions pour les équipes SSIR (Service de Sécurité des Systèmes d'Information Renforcée).

## 🚀 Fonctionnalités

### ✨ Gestion des Tâches
- **Tableau Kanban** avec colonnes de statut (Backlog, À faire, En cours, En attente, Bloqué, Validation, Terminé)
- **Icônes Bootstrap** pour chaque statut avec codes couleur
- **Drag & Drop** pour changer le statut des tâches
- **Création/Édition** de tâches avec formulaire complet
- **Suppression** de tâches avec confirmation
- **Assignation** multi-bureaux et multi-responsables
- **3 modes de vue** : Compact, Détaillé, Focus

### 🔍 Filtres et Recherche
- **Recherche textuelle** dans titre, description, et champs stratégiques
- **Filtres par**: Bureau, Responsable, Projet, Statut
- **Masquage/Affichage** des tâches terminées
- **Mode Focus** avec navigation entre colonnes
- **Colonnes vides** automatiquement repliées (40px de largeur)
- **Exclusion automatique** des enregistrements temporaires

### 📊 Priorités et Stratégies
- **Calcul automatique** des priorités (matrice Urgence/Impact)
- **Liaison stratégique** avec la table des stratégies Grist
- **Affichage** objectif → sous-objectif → action
- **Badges visuels** pour priorités et bureaux

### 📅 Gestion des Dates
- **Dates butoir** avec indicateurs visuels
- **Alertes** pour tâches en retard ou échéance proche
- **Calendrier** intégré avec Flatpickr

### 💬 Historique et Commentaires
- **Historique automatique** des changements de statut
- **Commentaires horodatés** avec nom d'utilisateur
- **Timeline** des actions dans modal dédiée
- **Suivi** des modifications via table User_Actions2

## 🏗️ Architecture

### Structure des Dossiers
```
kanban/
├── index.html              # Page principale
├── css/                    # Styles CSS
│   ├── kanban-base.css     # Styles de base + modes de vue
│   ├── kanban-modal.css    # Styles des modales
│   └── kanban-responsive.css # Responsive design
├── js/                     # Code JavaScript modulaire
│   ├── kanban-app.js       # 🚀 Point d'entrée + orchestration
│   ├── config/             # 📋 Configuration centralisée
│   │   ├── constants.js    # Constantes, statuts, icônes
│   │   └── strategyData.js # Données stratégiques
│   ├── core/               # 🧠 Logique métier principale
│   │   ├── KanbanManager.js # Gestionnaire principal (délègue tout)
│   │   └── GristManager.js  # Interface avec base de données Grist
│   ├── managers/           # 🎯 Gestionnaires spécialisés (1 responsabilité)
│   │   ├── ModalManager.js  # Modales (création/édition tâches)
│   │   ├── FilterManager.js # Filtres et recherche
│   │   ├── ViewModeManager.js # Modes de vue (source de vérité unique)
│   │   └── HistoryManager.js # Historique et timeline
│   ├── utils/              # 🔧 Utilitaires purs (sans état)
│   │   ├── dom.js          # Manipulation DOM
│   │   ├── dates.js        # Gestion des dates
│   │   └── badges.js       # Génération badges visuels
│   └── renderers/          # 🎨 Rendu des composants UI
│       ├── CardRenderer.js # Rendu des cartes de tâches
│       └── boardRenderer.js # Rendu des colonnes Kanban
└── schema.md               # Schéma des tables Grist
```

### 🎯 Responsabilités des Classes

#### 🚀 **kanban-app.js** - Point d'entrée et orchestration
**Rôle** : Chef d'orchestre qui initialise et coordonne tous les managers
- ✅ Initialisation de l'application
- ✅ Création et liaison des managers
- ✅ Gestion des événements globaux (raccourcis clavier)
- ✅ Interface avec Grist (onRecords, onOptions)
- ✅ Rendu des cartes individuelles
- ❌ **Ne gère PAS** : modes de vue, filtres, modales (délégué aux managers)

#### 🧠 **KanbanManager** - Gestionnaire principal (hub)
**Rôle** : Coordonnateur central qui délègue toutes les responsabilités
- ✅ Stockage des données courantes (currentRecords)
- ✅ Délégation vers les managers spécialisés
- ✅ Interface de diagnostic et debug
- ✅ Gestion de l'état global (isInitialized, currentUser)
- ❌ **Ne gère PAS** : rendu, filtres, vues, modales (tout délégué)

#### 🗄️ **GristManager** - Interface base de données
**Rôle** : Seule interface avec Grist, abstrait toutes les opérations DB
- ✅ CRUD des tâches (create, read, update, delete)
- ✅ Validation format données Grist
- ✅ Gestion des erreurs de connexion
- ✅ Conversion formats Grist ↔ Application
- ❌ **Ne gère PAS** : logique métier, rendu, filtres

#### 🎛️ **ViewModeManager** - SOURCE DE VÉRITÉ pour les vues
**Rôle** : Gestionnaire unique des modes de vue (Compact/Détaillé/Focus)
- ✅ Mode de vue actuel (getCurrentMode)
- ✅ Colonne en focus (getFocusColumn, setFocusColumn)
- ✅ Application des classes CSS par mode
- ✅ Navigation entre colonnes en mode focus
- ✅ Contrôles de vue (boutons 1,2,3)
- ✅ Gestion colonnes vides (repliage automatique)
- ❌ **Aucune autre classe ne doit gérer les vues !**

#### 🔍 **FilterManager** - Filtres et recherche
**Rôle** : Gestion exclusive de tous les filtres et recherche
- ✅ Filtres par bureau, responsable, projet, statut
- ✅ Recherche textuelle multi-champs
- ✅ Masquage/affichage tâches terminées
- ✅ Logique de compatibilité avec mode focus
- ✅ Application des filtres aux données
- ❌ **Ne gère PAS** : rendu (retourne juste les données filtrées)

#### 🪟 **ModalManager** - Modales d'édition
**Rôle** : Gestion exclusive des modales (création/édition tâches)
- ✅ Affichage/masquage modales
- ✅ Population des formulaires
- ✅ Validation des données
- ✅ Sauvegarde via GristManager
- ✅ Gestion des champs dynamiques (stratégies, dates)
- ❌ **Ne gère PAS** : rendu des cartes, filtres, vues

#### 📜 **HistoryManager** - Historique et timeline
**Rôle** : Gestion de l'historique des actions et timeline
- ✅ Suivi des modifications de tâches
- ✅ Affichage de la timeline dans les modales
- ✅ Génération des rapports d'historique
- ✅ Interface avec table User_Actions2
- ❌ **Ne gère PAS** : autres types de modales

#### 🎨 **CardRenderer** - Rendu des cartes
**Rôle** : Rendu spécialisé des cartes de tâches
- ✅ Génération HTML des cartes (compact/détaillé)
- ✅ Application des styles selon le mode
- ✅ Gestion expand/collapse des cartes
- ✅ Rendu des badges et indicateurs visuels
- ❌ **Ne gère PAS** : logique métier, état global

#### 🏗️ **BoardRenderer** - Rendu des colonnes
**Rôle** : Rendu spécialisé des colonnes Kanban
- ✅ Génération HTML des colonnes et headers
- ✅ Application du drag & drop
- ✅ Gestion des colonnes vides
- ✅ Adaptation selon le mode de vue
- ❌ **Ne gère PAS** : logique de filtrage, modes de vue

### 🚫 **Principe de Séparation des Responsabilités**

#### ✅ **CORRECT** - Chaque manager a UNE responsabilité
```javascript
// ViewModeManager gère TOUT ce qui concerne les vues
this.viewModeManager.setViewMode('focus');
this.viewModeManager.getCurrentMode();
this.viewModeManager.getFocusColumn();

// FilterManager gère TOUT ce qui concerne les filtres  
this.filterManager.applyFilters(filters);
this.filterManager.getFilteredRecords();

// ModalManager gère TOUT ce qui concerne les modales
this.modalManager.showTaskModal(taskId);
this.modalManager.saveTask(taskData);
```

#### ❌ **INCORRECT** - Duplication de responsabilités
```javascript
// ❌ NE PAS FAIRE - Multiple sources de vérité
this.viewMode = 'focus';                    // Dans KanbanManager
this.currentMode = 'focus';                 // Dans ViewModeManager  
kanbanContainer.className = 'kanban-focus'; // Dans kanban-app.js

// ❌ NE PAS FAIRE - Logique éparpillée
if (this.mode === 'compact') { /* CSS */ }  // Dans 3 fichiers différents
```

#### 📋 **Règles d'Architecture**
1. **Une classe = Une responsabilité** (Single Responsibility Principle)
2. **ViewModeManager = Source unique de vérité pour les vues**
3. **Pas de logique métier dans les renderers**
4. **Managers communiquent via le hub KanbanManager**
5. **Délégation systématique, pas de duplication**

### Tables Grist

#### `Ssir_principale_task` (Table principale)
- **id**: Identifiant unique
- **titre**: Titre de la tâche
- **description**: Description avec commentaires horodatés
- **statut**: Statut Kanban
- **bureau**: Liste des bureaux concernés
- **qui**: Liste des responsables
- **urgence/impact**: Critères de priorité
- **strategie_id**: Référence vers stratégie
- **date_echeance**: Date butoir
- **notes**: Notes additionnelles

#### `Ssir_strategie2` (Stratégies)
- **id**: Identifiant unique
- **id2**: Identifiant d'affichage
- **objectif**: Objectif stratégique
- **sous_objectif**: Sous-objectif
- **action**: Action associée

#### `User_Actions2` (Historique)
- **task_id**: Référence vers tâche
- **action_type**: Type d'action
- **user_name**: Utilisateur (auto-rempli)
- **timestamp**: Date/heure (auto-rempli)
- **old_value/new_value**: Valeurs avant/après
- **details**: Détails de l'action

## 🔧 Installation et Configuration

### Prérequis
- **Grist** avec accès API complet
- **Navigateur moderne** (Chrome, Firefox, Safari, Edge)
- **Serveur web** pour héberger les fichiers

### Installation
1. **Cloner** le projet dans votre environnement Grist
2. **Configurer** les tables selon `schema.md`
3. **Ajuster** `js/config/constants.js` si nécessaire
4. **Ouvrir** `index.html` dans Grist

### Configuration
```javascript
// js/config/constants.js
export const TABLE_ID = "Ssir_principale_task";
export const USER_ACTIONS_TABLE = "User_Actions2";
export const DEFAULT_BUREAUX = [
  'Exploit', 'Réseau', 'BDD', 'Chef SSIR', 'SIG',
  'NEXSIS-RRF', 'COMSIC', 'RSSI', 'DPO'
];
```

---

## 🎯 Système de Missions (Nouveau)

Le système de missions permet de classifier et organiser les tâches selon une hiérarchie:

```
Stratégie → Mission → Sous-action → Tâche
```

### Pages disponibles

| Page | URL | Description |
|------|-----|-------------|
| Kanban | `index.html` | Tableau Kanban principal |
| **Missions** | `missions.html` | Gestion des missions et sous-actions |
| Stats | `stats.html` | Statistiques et graphiques |
| Config | `config.html` | Configuration (personnes, bureaux) |
| Timeline | `timeline.html` | Vue timeline |
| Historique | `history.html` | Historique des modifications |

### Colonnes Grist requises (13 nouvelles)

Pour utiliser le système de missions, ajouter ces colonnes à `Ssir_principale_task`:

**Mission (7 colonnes):**
- `mission_code` (Text) - Code unique ex: MIS-2025-001
- `mission_nom` (Text) - Nom de la mission
- `mission_responsable` (Text) - Responsable
- `mission_bureau` (Choice) - Bureau/équipe
- `mission_priorite` (Choice) - Critique, Haute, Moyenne, Basse
- `mission_date_debut` (Date)
- `mission_date_fin` (Date)

**Sous-action (5 colonnes):**
- `sous_action_code` (Text) - Code ex: SA-001
- `sous_action_nom` (Text) - Nom
- `categorie` (Choice) - MCO, Projet, Imprévisible
- `sous_action_charge_estimee` (Numeric)
- `sous_action_charge_reelle` (Numeric)

**Meta (1 colonne):**
- `est_classifiee` (Bool) - Tâche rattachée à une mission?

> 📖 Documentation complète: [MISSIONS_ARCHITECTURE.md](MISSIONS_ARCHITECTURE.md)

---

## 🎮 Utilisation

### Créer une Tâche
1. **Cliquer** sur "Nouvelle Tâche" ou appuyer sur **N**
2. **Remplir** le formulaire (titre obligatoire)
3. **Sélectionner** bureaux et responsables
4. **Définir** urgence/impact pour priorité automatique
5. **Lier** à une stratégie (optionnel)
6. **Sauvegarder**

### Modifier une Tâche
1. **Cliquer** sur une tâche ou **clic droit** → Modifier
2. **Éditer** les champs souhaités
3. **Ajouter** des commentaires (horodatés automatiquement)
4. **Sauvegarder**

### Filtrer les Tâches
- **Recherche**: Taper dans la barre de recherche (ou **F**)
- **Filtres**: Utiliser les listes déroulantes
- **Terminées**: Cocher/décocher pour masquer
- **Réinitialiser**: Vider tous les filtres

### Raccourcis Clavier
- **N**: Nouvelle tâche
- **F**: Focus sur recherche
- **1**: Mode Compact
- **2**: Mode Détaillé  
- **3**: Mode Focus
- **R**: Recharger le kanban
- **Échap**: Fermer les modales

## 🛠️ Développement

### Structure du Code
- **Modulaire**: Chaque fonctionnalité dans son propre fichier
- **ES6 Modules**: Import/export pour organisation
- **Gestionnaires**: Séparation des responsabilités
- **Utilitaires**: Fonctions réutilisables

### Conventions
- **Nommage**: camelCase pour variables, PascalCase pour classes
- **Commentaires**: JSDoc pour fonctions publiques
- **Erreurs**: Gestion centralisée avec `displayError()`
- **Logging**: Console.log pour debug, console.error pour erreurs

### Debugging et Architecture
```javascript
// Variables globales disponibles
window.kanbanManager     // Instance principale (hub de coordination)
window.KanbanApp        // Utilitaires exposés

// 🎯 Accès aux managers spécialisés
kanbanManager.viewModeManager    // Gestion des vues
kanbanManager.filterManager      // Gestion des filtres  
kanbanManager.modalManager       // Gestion des modales
kanbanManager.historyManager     // Gestion de l'historique
kanbanManager.gristManager       // Interface base de données

// 🔍 Fonctions de diagnostic
kanbanManager.exportState()      // État complet de l'application
kanbanManager.refreshKanban()    // Recharger via tous les managers
kanbanManager.diagnoseIssues()   // Diagnostic multi-managers

// 🎛️ Debug des vues (ViewModeManager)
kanbanManager.viewModeManager.getCurrentMode()    // Mode actuel
kanbanManager.viewModeManager.getFocusColumn()    // Colonne focus
kanbanManager.viewModeManager.exportState()       // État des vues

// 🔍 Debug des filtres (FilterManager)
kanbanManager.filterManager.getFilters()          // Filtres actuels
kanbanManager.filterManager.getFilteredRecords()  // Données filtrées

// 🗄️ Debug base de données (GristManager)
kanbanManager.gristManager.isGristConnected()     // État connexion
kanbanManager.gristManager.getRecords()           // Données brutes
```

## 🐛 Résolution de Problèmes

### Erreurs Communes et Résolutions Architecturales

#### "this.populateTaskForm is not a function"
- **Cause**: ModalManager non initialisé ou méthode appelée depuis mauvaise classe
- **Solution**: Vérifier `kanbanManager.modalManager` existe et déléguer via KanbanManager
```javascript
// ❌ INCORRECT
this.populateTaskForm(data);
// ✅ CORRECT  
kanbanManager.modalManager.populateTaskForm(data);
```

#### "Cannot read property 'getCurrentMode' of undefined"
- **Cause**: ViewModeManager non initialisé ou référence directe interdite
- **Solution**: Toujours passer par ViewModeManager pour les vues
```javascript
// ❌ INCORRECT
if (this.viewMode === 'focus') 
// ✅ CORRECT
if (kanbanManager.viewModeManager.isMode('focus'))
```

#### "Filtres ne s'appliquent pas"
- **Cause**: Logique de filtrage éparpillée dans plusieurs classes
- **Solution**: Centraliser dans FilterManager uniquement
```javascript
// ❌ INCORRECT - Logique dupliquée
const filtered = records.filter(r => r.statut === status);
// ✅ CORRECT - Via FilterManager
const filtered = kanbanManager.filterManager.getFilteredRecords();
```

#### "Colonnes vides n'apparaissent pas correctement"
- **Cause**: CSS géré dans plusieurs endroits
- **Solution**: ViewModeManager gère les classes, CSS suit via data-empty
```javascript
// ✅ ViewModeManager applique les classes automatiquement
board.setAttribute('data-empty', isEmpty ? 'true' : 'false');
```

#### "Modal ne se ferme pas"
- **Cause**: Conflit entre managers ou événements multiples
- **Solution**: ModalManager seul responsable des modales
```javascript
// ❌ INCORRECT - Gestion directe
$('#popup-tache').modal('hide');
// ✅ CORRECT - Via ModalManager
kanbanManager.modalManager.hideTaskModal();
```

#### "Grist sandbox error: list indices must be integers"
- **Cause**: Format de données incorrect pour Grist
- **Solution**: GristManager valide les formats automatiquement
```javascript
// ✅ GristManager gère la conversion automatiquement
await kanbanManager.gristManager.updateRecord(id, data);
```

### Logs Utiles
```javascript
// Activer le debug
localStorage.setItem('kanban-debug', 'true');

// Voir l'état des filtres
console.log(kanbanManager.filterManager.getFilters());

// Voir les données courantes
console.log(kanbanManager.currentRecords);
```

## 📊 Métriques et Performance

### Indicateurs
- **Nombre de tâches** par statut
- **Temps de chargement** des données
- **Taux de succès** des sauvegardes
- **Utilisation des filtres**

### Optimisations
- **Debouncing** pour recherche
- **Pagination** virtuelle (si nombreuses tâches)
- **Cache** des données stratégiques
- **Lazy loading** des modales

## 🚦 Statut du Projet

### Version Actuelle
- **Version**: 2.0.0
- **Dernière mise à jour**: Juillet 2025
- **Statut**: Test

### Fonctionnalités Récentes (Juillet 2025)
- ✅ **Système d'icônes Bootstrap** pour les statuts (remplacement des emojis)
- ✅ **Mode Focus** amélioré avec colonnes vides repliées automatiquement
- ✅ **Filtrage des enregistrements temporaires** (___TEMP_USER_RECORD___)
- ✅ **Largeur dynamique des colonnes** vides (40px en mode compact/détaillé)
- ✅ **Navigation focus** avec boutons et compteurs de tâches
- ✅ **CSS responsive** pour colonnes vides avec data-empty
- ✅ **Suppression bouton Export History** de l'interface
- ✅ **Correction bugs filtres** entre modes focus et statut
- ✅ **Auto-sélection première colonne** avec tâches en mode focus

### Roadmap
- 🔄 Implémentation complète User_Actions2
- 🔄 Timeline enrichie
- 🔄 Export avancé
- 🔄 Notifications temps réel
- 🔄 Mode mobile optimisé

## 🔧 Problèmes Résolus (Juillet 2025)

### Icons Bootstrap intégrés
- **Problème**: Les icônes emoji n'étaient pas cohérents entre navigateurs
- **Solution**: Remplacement par le système d'icônes Bootstrap avec classes CSS
- **Fichiers**: `js/config/constants.js`, `index.html` (CDN Bootstrap Icons)

### Mode Focus optimisé
- **Problème**: Les colonnes vides prenaient trop de place et masquaient le titre
- **Solution**: Système data-empty avec CSS pour replier automatiquement à 40px
- **Fichiers**: `css/kanban-base.css`, `js/kanban-app.js`

### Filtrage des enregistrements temporaires
- **Problème**: Les enregistrements ___TEMP_USER_RECORD___ étaient comptés dans le Backlog
- **Solution**: Exclusion automatique dans toutes les fonctions de comptage
- **Fichiers**: `js/managers/ViewModeManager.js`, `js/kanban-app.js`

### Navigation focus améliorée
- **Problème**: Pas de navigation intuitive entre colonnes en mode focus
- **Solution**: Boutons avec icônes et compteurs pour chaque statut
- **Fichiers**: `js/managers/ViewModeManager.js`

### Conflicts filtres résolus
- **Problème**: Les filtres de statut interféraient avec le mode focus
- **Solution**: Logique conditionnelle pour ignorer les filtres statut en mode focus
- **Fichiers**: `js/managers/FilterManager.js`

## 🤝 Contribution

### Workflow
1. **Fork** le projet
2. **Créer** une branche feature
3. **Développer** avec tests
4. **Documenter** les changements
5. **Soumettre** une pull request

### Standards
- **Tests**: Tester sur différents navigateurs
- **Documentation**: Mettre à jour README si nécessaire
- **Compatibilité**: Maintenir compatibilité Grist
- **Performance**: Vérifier impact sur performances

## 📄 Licence

Ce projet est développé pour un usage interne SSIR. Tous droits réservés.

## 📞 Support

Pour toute question ou problème :
- **Issues**: Utiliser le système de tickets du projet
- **Documentation**: Consulter ce README et les commentaires du code
- **Debug**: Utiliser les outils de développement intégrés

---

*Dernière mise à jour: Juillet 2025*