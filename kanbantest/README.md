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
├── index.html                 # Page principale (Kanban)
├── taches.html                # Page tâches
├── missions.html              # Page missions
├── timeline.html              # Page timeline
├── history.html               # Page historique
├── stats.html                 # Page statistiques
├── config.html                # Page configuration
├── migration.html             # Page migration
├── setup.html                 # Page setup
├── modele.html                # Page modèle
├── css/                       # Styles CSS
│   ├── kanban-base.css        # Styles de base + modes de vue
│   ├── kanban-modal.css       # Styles des modales
│   ├── kanban-responsive.css  # Responsive design
│   └── strategy-accordion.css # Styles accordéon stratégie
├── js/                        # Code JavaScript modulaire
│   ├── app-initializer.js     # Point d'entrée ES6 pour index.html
│   ├── taches-app.js          # Point d'entrée pour taches.html
│   ├── missions-app.js        # Point d'entrée pour missions.html
│   ├── timeline-app.js        # Point d'entrée pour timeline.html
│   ├── history-app.js         # Point d'entrée pour history.html
│   ├── stats-app.js           # Point d'entrée pour stats.html
│   ├── config-app.js          # Point d'entrée pour config.html
│   ├── migration-app.js       # Point d'entrée pour migration.html
│   ├── config/                # Configuration centralisée
│   │   └── constants.js       # Constantes globales
│   ├── core/                  # Logique métier principale
│   │   ├── KanbanManager.js   # Orchestrateur principal (index.html)
│   │   └── EventCentralizer.js # Centralisation des événements
│   ├── components/            # Composants partagés
│   │   └── SharedTaskModal.js # Modale d'édition UNIQUE (partagée)
│   ├── managers/              # Gestionnaires spécialisés (1 responsabilité)
│   │   ├── ViewManager.js     # Modes d'affichage et rendu
│   │   ├── HistoryManager.js  # Historique et commentaires
│   │   ├── GristManager.js    # Interface Grist (CRUD)
│   │   ├── FilterManager.js   # Filtres et recherche
│   │   ├── JalonManager.js    # Gestion des jalons
│   │   ├── DatePickerManager.js # Sélection de dates
│   │   ├── MissionsManager.js # Gestion des missions
│   │   ├── ConfigManager.js   # Configuration
│   │   ├── DashboardManager.js # Dashboard V3
│   │   ├── TimelineManager.js # Timeline V3
│   │   └── TaskLinksManager.js # Liaison inter-tâches
│   └── utils/                 # Utilitaires purs (sans état)
│       ├── UserActionManager.js # Actions utilisateur
│       ├── NotesJsonMigrator.js # Migration notes JSON
│       ├── LoggerManager.js   # Système de logs
│       ├── EventManager.js    # Gestion événements
│       ├── ReferenceManager.js # Gestion références
│       ├── dom.js             # Manipulation DOM
│       ├── dates.js           # Gestion dates
│       └── badges.js          # Génération badges
└── schema.md                  # Schéma des tables Grist
```

### 🎯 Responsabilités des Classes

#### 🚀 **app-initializer.js** - Point d'entrée ES6 pour index.html
**Rôle** : Point d'entrée qui initialise KanbanManager et coordonne les managers
- ✅ Initialisation de l'application
- ✅ Création et liaison des managers
- ✅ Gestion des événements globaux (raccourcis clavier)
- ✅ Interface avec Grist (onRecords, onOptions)
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
**Localisation** : `js/managers/GristManager.js`
- ✅ CRUD des tâches (create, read, update, delete)
- ✅ Validation format données Grist
- ✅ Gestion des erreurs de connexion
- ✅ Conversion formats Grist ↔ Application
- ❌ **Ne gère PAS** : logique métier, rendu, filtres

#### 🎛️ **ViewManager** - SOURCE DE VÉRITÉ pour les vues et le rendu
**Rôle** : Gestionnaire unique des modes de vue, du rendu des cartes et des colonnes
- ✅ Mode de vue actuel (getCurrentMode)
- ✅ Colonne en focus (getFocusColumn, setFocusColumn)
- ✅ Application des classes CSS par mode
- ✅ Navigation entre colonnes en mode focus
- ✅ Rendu des cartes et des colonnes Kanban
- ✅ Gestion colonnes vides (repliage automatique)
- ❌ **Aucune autre classe ne doit gérer les vues ou le rendu !**

#### 🔍 **FilterManager** - Filtres et recherche
**Rôle** : Gestion exclusive de tous les filtres et recherche
- ✅ Filtres par bureau, responsable, projet, statut
- ✅ Recherche textuelle multi-champs
- ✅ Masquage/affichage tâches terminées
- ✅ Logique de compatibilité avec mode focus
- ✅ Application des filtres aux données
- ❌ **Ne gère PAS** : rendu (retourne juste les données filtrées)

#### 🪟 **SharedTaskModal** - Modale d'édition unique partagée
**Rôle** : Modale d'édition unique partagée entre toutes les pages
**Localisation** : `js/components/SharedTaskModal.js`
- ✅ Affichage/masquage de la modale
- ✅ Population des formulaires
- ✅ Sauvegarde via GristManager
- ✅ Gestion des jalons, liens et stratégies
- ✅ Partagée entre index.html, taches.html, missions.html, etc.
- ❌ **Ne gère PAS** : rendu des cartes, filtres, vues

#### 📜 **HistoryManager** - Historique et timeline
**Rôle** : Gestion de l'historique des actions et timeline
- ✅ Suivi des modifications de tâches
- ✅ Affichage de la timeline dans les modales
- ✅ Génération des rapports d'historique
- ✅ Interface avec table User_Actions2
- ❌ **Ne gère PAS** : autres types de modales

#### 🔗 **EventCentralizer** - Centralisation des événements
**Rôle** : Point unique d'entrée pour les événements utilisateur
**Localisation** : `js/core/EventCentralizer.js`
- ✅ Tous les addEventListener via jQuery/safeOn
- ✅ Délégation vers les managers spécialisés
- ✅ Gestion centralisée des clics, touches, etc.
- ❌ **Ne gère PAS** : logique métier, rendu, état global

### 🚫 **Principe de Séparation des Responsabilités**

#### ✅ **CORRECT** - Chaque manager a UNE responsabilité
```javascript
// ViewManager gère TOUT ce qui concerne les vues et le rendu
this.viewManager.setViewMode('focus');
this.viewManager.getCurrentMode();
this.viewManager.getFocusColumn();

// FilterManager gère TOUT ce qui concerne les filtres
this.filterManager.applyFilters(filters);
this.filterManager.getFilteredRecords();

// SharedTaskModal gère TOUT ce qui concerne la modale d'édition
SharedTaskModal.show(taskId);
SharedTaskModal.save(taskData);
```

#### ❌ **INCORRECT** - Duplication de responsabilités
```javascript
// ❌ NE PAS FAIRE - Multiple sources de vérité
this.viewMode = 'focus';                    // Dans KanbanManager
this.currentMode = 'focus';                 // Dans ViewManager
kanbanContainer.className = 'kanban-focus'; // Dans app-initializer.js

// ❌ NE PAS FAIRE - Logique éparpillée
if (this.mode === 'compact') { /* CSS */ }  // Dans 3 fichiers différents
```

#### 📋 **Règles d'Architecture**
1. **Une classe = Une responsabilité** (Single Responsibility Principle)
2. **ViewManager = Source unique de vérité pour les vues et le rendu**
3. **Pas de logique métier dans les utils**
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
| **Tâches** | `taches.html` | Gestion des tâches (vue alternative) |
| **Missions** | `missions.html` | Gestion des missions et sous-actions |
| Stats | `stats.html` | Statistiques et graphiques |
| Config | `config.html` | Configuration (personnes, bureaux) |
| Timeline | `timeline.html` | Vue timeline |
| Historique | `history.html` | Historique des modifications |
| **Migration** | `migration.html` | Outils de migration |
| **Setup** | `setup.html` | Configuration initiale |
| **Modèle** | `modele.html` | Page modèle |

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

// 🎯 Accès aux managers spécialisés
kanbanManager.viewManager        // Gestion des vues et du rendu
kanbanManager.filterManager      // Gestion des filtres
kanbanManager.historyManager     // Gestion de l'historique
kanbanManager.gristManager       // Interface base de données

// 🔍 Fonctions de diagnostic
kanbanManager.exportState()      // État complet de l'application
kanbanManager.refreshKanban()    // Recharger via tous les managers
kanbanManager.diagnoseIssues()   // Diagnostic multi-managers

// 🎛️ Debug des vues (ViewManager)
kanbanManager.viewManager.getCurrentMode()    // Mode actuel
kanbanManager.viewManager.getFocusColumn()    // Colonne focus
kanbanManager.viewManager.exportState()       // État des vues

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
- **Cause**: SharedTaskModal non initialisée ou méthode appelée depuis mauvaise classe
- **Solution**: Vérifier que SharedTaskModal est importée et déléguer via KanbanManager
```javascript
// ❌ INCORRECT
this.populateTaskForm(data);
// ✅ CORRECT
SharedTaskModal.populateTaskForm(data);
```

#### "Cannot read property 'getCurrentMode' of undefined"
- **Cause**: ViewManager non initialisé ou référence directe interdite
- **Solution**: Toujours passer par ViewManager pour les vues
```javascript
// ❌ INCORRECT
if (this.viewMode === 'focus')
// ✅ CORRECT
if (kanbanManager.viewManager.isMode('focus'))
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
- **Solution**: ViewManager gère les classes, CSS suit via data-empty
```javascript
// ✅ ViewManager applique les classes automatiquement
board.setAttribute('data-empty', isEmpty ? 'true' : 'false');
```

#### "Modal ne se ferme pas"
- **Cause**: Conflit entre managers ou événements multiples
- **Solution**: SharedTaskModal seule responsable de la modale
```javascript
// ❌ INCORRECT - Gestion directe
$('#popup-tache').modal('hide');
// ✅ CORRECT - Via SharedTaskModal
SharedTaskModal.hide();
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
- **Version**: 3.0.0
- **Dernière mise à jour**: Janvier 2026
- **Statut**: Test

### Fonctionnalités Récentes (Janvier 2026)
- ✅ **Refactoring complet** : kanban-app.js remplacé par app-initializer.js + apps par page
- ✅ **SharedTaskModal** : modale d'édition unique partagée entre toutes les pages
- ✅ **ViewManager** : fusion de ViewModeManager, CardRenderer et BoardRenderer
- ✅ **EventCentralizer** : centralisation de tous les événements utilisateur
- ✅ **GristManager** déplacé de core/ vers managers/
- ✅ **Pages multiples** : taches, missions, timeline, history, stats, config, migration
- ✅ **Système d'icônes Bootstrap** pour les statuts (remplacement des emojis)
- ✅ **Mode Focus** amélioré avec colonnes vides repliées automatiquement
- ✅ **Filtrage des enregistrements temporaires** (___TEMP_USER_RECORD___)
- ✅ **Largeur dynamique des colonnes** vides (40px en mode compact/détaillé)
- ✅ **Navigation focus** avec boutons et compteurs de tâches
- ✅ **CSS responsive** pour colonnes vides avec data-empty

### Roadmap
- 🔄 Implémentation complète User_Actions2
- 🔄 Timeline enrichie
- 🔄 Export avancé
- 🔄 Notifications temps réel
- 🔄 Mode mobile optimisé

## 🔧 Problèmes Résolus (Janvier 2026)

### Icons Bootstrap intégrés
- **Problème**: Les icônes emoji n'étaient pas cohérents entre navigateurs
- **Solution**: Remplacement par le système d'icônes Bootstrap avec classes CSS
- **Fichiers**: `js/config/constants.js`, `index.html` (CDN Bootstrap Icons)

### Mode Focus optimisé
- **Problème**: Les colonnes vides prenaient trop de place et masquaient le titre
- **Solution**: Système data-empty avec CSS pour replier automatiquement à 40px
- **Fichiers**: `css/kanban-base.css`, `js/app-initializer.js`

### Filtrage des enregistrements temporaires
- **Problème**: Les enregistrements ___TEMP_USER_RECORD___ étaient comptés dans le Backlog
- **Solution**: Exclusion automatique dans toutes les fonctions de comptage
- **Fichiers**: `js/managers/ViewManager.js`, `js/app-initializer.js`

### Navigation focus améliorée
- **Problème**: Pas de navigation intuitive entre colonnes en mode focus
- **Solution**: Boutons avec icônes et compteurs pour chaque statut
- **Fichiers**: `js/managers/ViewManager.js`

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

*Dernière mise à jour: Février 2026*
