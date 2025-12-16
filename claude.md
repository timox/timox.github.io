# Documentation Complète - Kanban SSIR

> **Compilation**: Décembre 2025
> **Version**: 2.1.0

---

# TABLE DES MATIÈRES

1. [Structure du Projet](#1-structure-du-projet)
2. [Architecture Technique](#2-architecture-technique)
3. [Schéma de Données Grist](#3-schéma-de-données-grist)
4. [Système de Missions](#4-système-de-missions)
5. [Guide d'Utilisation](#5-guide-dutilisation)
6. [Guide de Déploiement](#6-guide-de-déploiement)
7. [Promotion Test → Production](#7-promotion-test--production)
8. [Spécifications V3.0 (Dashboard + Timeline)](#8-spécifications-v30-dashboard--timeline)

---

# 1. Structure du Projet

## Vue d'ensemble des environnements

Ce projet utilise **GitHub Pages** avec plusieurs dossiers représentant différents **environnements**.

```
timox.github.io/
├── kanban/           # 🚀 PRODUCTION
├── kanbantest/       # 🔬 TEST/EXPÉRIMENTATION
├── preprod-kanban/   # 🧪 PRÉPRODUCTION
└── docs/             # 📚 DOCUMENTATION
```

## `/kanban/` - ENVIRONNEMENT DE PRODUCTION

**URL**: `https://timox.github.io/kanban/`

Environnement de production stable utilisé par les équipes SSIR au quotidien.

```
kanban/
├── index.html              # Point d'entrée principal
├── missions.html           # Gestion des missions
├── stats.html              # Statistiques
├── config.html             # Configuration
├── timeline.html           # Vue timeline
├── history.html            # Historique
├── css/
│   ├── kanban-base.css
│   ├── kanban-modal.css
│   └── kanban-responsive.css
├── js/
│   ├── kanban-app.js       # Application principale
│   ├── missions-app.js     # Application missions
│   ├── config/
│   │   ├── constants.js
│   │   └── strategyData.js
│   ├── managers/
│   │   ├── GristManager.js
│   │   ├── MissionsManager.js
│   │   ├── FilterManager.js
│   │   ├── ViewManager.js
│   │   ├── ModalManager.js
│   │   ├── HistoryManager.js
│   │   ├── DatePickerManager.js
│   │   └── JalonManager.js
│   └── utils/
│       ├── LoggerManager.js
│       ├── UserActionManager.js
│       ├── NotesJsonMigrator.js
│       ├── badges.js
│       ├── dates.js
│       └── dom.js
└── schema.md
```

## `/kanbantest/` - ENVIRONNEMENT DE TEST

**URL**: `https://timox.github.io/kanbantest/`

Environnement pour tester les nouvelles fonctionnalités avant déploiement.

**Caractéristiques**:
- Développement des nouvelles features
- Tests d'interface et d'ergonomie
- Prototypage rapide sans impact production

---

# 2. Architecture Technique

## Structure des Modules

```
js/
├── kanban-app.js              # Point d'entrée legacy
├── core/
│   └── KanbanManager.js       # Orchestrateur moderne
├── managers/
│   ├── FilterManager.js       # Filtres et recherche
│   ├── ModalManager.js        # Modales et formulaires
│   ├── HistoryManager.js      # Historique et commentaires
│   ├── DatePickerManager.js   # Sélection de dates
│   ├── ViewManager.js         # Modes d'affichage
│   ├── GristManager.js        # Interface Grist
│   ├── MissionsManager.js     # Gestion des missions
│   └── JalonManager.js        # Gestion des jalons
├── utils/
│   ├── UserActionManager.js   # Actions utilisateur & historique JSON
│   ├── NotesJsonMigrator.js   # Migration notes
│   ├── LoggerManager.js       # Système de logs
│   ├── dom.js                 # Manipulation DOM
│   ├── dates.js               # Gestion dates
│   └── badges.js              # Génération badges
└── config/
    ├── constants.js           # Constantes globales
    └── strategyData.js        # Données stratégiques
```

## Structure JSON pour l'Historique

```javascript
{
  "entries": [
    {
      "id": "uuid-unique",
      "timestamp": "2025-07-16T10:30:00.000Z",
      "user": "nom_utilisateur",
      "type": "field_change" | "comment" | "creation" | "status_change",
      "changes": [
        {
          "field": "titre",
          "value": "Nouveau titre",
          "previous": "Ancien titre"
        }
      ],
      "comment": "Commentaire utilisateur",
      "editable": true | false
    }
  ]
}
```

**Types d'Entrées**:
- `field_change`: Modification d'attributs
- `comment`: Commentaire utilisateur (éditable)
- `creation`: Création de tâche
- `status_change`: Changement de statut (drag & drop)

## Zones Critiques - NE PAS CASSER

### 1. Enregistrements Temporaires (Anti-Doublons)

```javascript
// CRITIQUE: Filtrage dans handleGristUpdate (onRecords)
if (gristRecords && Array.isArray(gristRecords)) {
  const hasTempRecord = gristRecords.some(record =>
    record && record.titre === '___TEMP_USER_RECORD___'
  );
  if (hasTempRecord) {
    console.log("onRecords ignoré (enregistrement temporaire système)");
    return;
  }
}
```

**Règles**:
- Ne JAMAIS changer la string `'___TEMP_USER_RECORD___'`
- Double filtrage obligatoire (onRecords + rendu visuel)

### 2. Format des Listes Grist

```javascript
// PATTERN OBLIGATOIRE pour bureau/qui:
gristData.bureau = ['L', ...values]; // Premier élément DOIT être 'L'
```

### 3. Chaîne d'Initialisation

```
1. kanban-app.js (ou missions-app.js)
   ↓
2. GristManager (connexion Grist)
   ↓
3. Managers spécialisés
   ↓
4. Utils (UserActionManager, etc.)
```

---

# 3. Schéma de Données Grist

## Tables utilisées

### Table `Ssir_strategie2`

```python
@grist.UserTable
class Ssir_strategie2:
  id_old_neplus_utiliser = grist.Text()
  objectif = grist.Text()
  sous_objectif = grist.Text()
  action = grist.Text()
  responsable = grist.Text()
  echeance = grist.Text()
  portee = grist.Text()
  ssir_principale_task = grist.ReferenceList('Ssir_principale_task')
  id2 = grist.Int()
```

### Table `Ssir_principale_task`

```python
@grist.UserTable
class Ssir_principale_task:
  # === Champs de base ===
  titre = grist.Text()
  description = grist.Text()
  type_tache_id = grist.Reference('Ssir_type_task')
  bureau = grist.ChoiceList()
  qui = grist.ChoiceList()
  impact = grist.Choice()        # Défaut: "Mineur"
  statut = grist.Choice()        # Défaut: "non défni"
  date_debut = grist.Date()
  date_echeance = grist.Date()
  strategie_id = grist.ReferenceList('Ssir_strategie2')
  notes = grist.Text()           # JSON historique/commentaires
  projet = grist.Choice()
  urgence = grist.Choice()

  # === Métadonnées ===
  datenow = grist.DateTime('Europe/Paris')
  str_qui = grist.Text()
  date_creation = grist.DateTime('Europe/Paris')
  date_modif = grist.Text()
  Cree_par = grist.Text()
  UUID = grist.Text()
  historique_statuts = grist.Date()
  date_derniere_maj = grist.DateTime('Europe/Paris')
  statut_precedent = grist.Text()
  id_task = grist.Int()
  jalons = grist.Text()

  # === COLONNES MISSIONS (13 colonnes) ===
  # Mission (7 colonnes)
  mission_code = grist.Text()              # Code unique ex: MIS-2025-001
  mission_nom = grist.Text()
  mission_responsable = grist.Text()
  mission_bureau = grist.Choice()
  mission_priorite = grist.Choice()        # Critique, Haute, Moyenne, Basse
  mission_date_debut = grist.Date()
  mission_date_fin = grist.Date()

  # Sous-action (5 colonnes)
  sous_action_code = grist.Text()          # Code ex: SA-001
  sous_action_nom = grist.Text()
  categorie = grist.Choice()               # MCO, Projet, Imprévisible
  sous_action_charge_estimee = grist.Numeric()
  sous_action_charge_reelle = grist.Numeric()

  # Meta (1 colonne)
  est_classifiee = grist.Bool()
```

---

# 4. Système de Missions

## Vue d'ensemble

Le système de missions permet de classifier les tâches selon une hiérarchie:

```
Stratégie → Mission → Sous-action → Tâche
```

### Approche technique: **Dénormalisation**

Les données missions sont stockées directement dans chaque tâche (pas de tables séparées). Le `MissionsManager` agrège ces données pour reconstruire la structure.

## MCD - Modèle Conceptuel de Données

```
┌─────────────────┐         ┌─────────────────┐
│   STRATEGIE     │         │    MISSION      │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ code (PK)       │
│ objectif        │         │ nom             │
│ sous_objectif   │         │ responsable     │
│ action          │         │ bureau          │
│ responsable     │         │ priorite        │
│ echeance        │         │ date_debut      │
│ portee          │         │ date_fin        │
└────────┬────────┘         └────────┬────────┘
         │1:N                        │1:N
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│     TACHE       │◄────────│  SOUS_ACTION    │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ code (PK)       │
│ titre           │         │ nom             │
│ statut          │         │ categorie       │
│ bureau          │         │ charge_estimee  │
│ qui             │         │ charge_reelle   │
│ mission_code FK │         │ mission_code FK │
│ sous_action_code│         └─────────────────┘
│ est_classifiee  │
└─────────────────┘
```

## Catégories de sous-actions

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| **MCO** | Maintien en Condition Opérationnelle | Mises à jour, patches, monitoring |
| **Projet** | Projets planifiés | Nouvelles fonctionnalités, migrations |
| **Imprévisible** | Incidents et urgences | Bugs critiques, pannes |

## Configuration dans Grist

### Colonnes à créer (13 nouvelles)

**Mission (7)**:
| Colonne | Type | Options |
|---------|------|---------|
| `mission_code` | Text | - |
| `mission_nom` | Text | - |
| `mission_responsable` | Text | - |
| `mission_bureau` | Choice | Infrastructure, Sécurité, Support, Dev |
| `mission_priorite` | Choice | Critique, Haute, Moyenne, Basse |
| `mission_date_debut` | Date | - |
| `mission_date_fin` | Date | - |

**Sous-action (5)**:
| Colonne | Type | Options |
|---------|------|---------|
| `sous_action_code` | Text | - |
| `sous_action_nom` | Text | - |
| `categorie` | Choice | MCO, Projet, Imprévisible |
| `sous_action_charge_estimee` | Numeric | - |
| `sous_action_charge_reelle` | Numeric | - |

**Meta (1)**:
| Colonne | Type |
|---------|------|
| `est_classifiee` | Toggle (Bool) |

### Ajouter le widget missions.html

1. Ajouter une page dans Grist
2. Ajouter section → Type: "Custom"
3. URL: `https://timox.github.io/kanbantest/missions.html`
4. Accès: "Full document access"
5. Table source: `Ssir_principale_task`

---

# 5. Guide d'Utilisation

## Raccourcis Clavier

| Touche | Action |
|--------|--------|
| **N** | Nouvelle tâche |
| **F** | Focus sur recherche |
| **1** | Mode Compact |
| **2** | Mode Détaillé |
| **3** | Mode Focus |
| **R** | Recharger le kanban |
| **Échap** | Fermer les modales |

## Créer une Tâche

1. Cliquer sur "Nouvelle Tâche" ou appuyer sur **N**
2. Remplir le formulaire (titre obligatoire)
3. Sélectionner bureaux et responsables
4. Définir urgence/impact pour priorité automatique
5. Lier à une stratégie (optionnel)
6. Sauvegarder

## Créer une Mission

1. Aller sur `missions.html`
2. Cliquer sur **"Nouvelle Mission"**
3. Remplir:
   - **Code**: Auto-généré (MIS-YYYY-XXX)
   - **Nom**: Nom descriptif
   - **Responsable**: Personne en charge
   - **Bureau**: Équipe responsable
   - **Priorité**: Critique > Haute > Moyenne > Basse
   - **Dates**: Début et fin prévues
4. Ajouter des sous-actions (optionnel)
5. Sauvegarder

## Pages disponibles

| Page | URL | Description |
|------|-----|-------------|
| Kanban | `index.html` | Tableau Kanban principal |
| Missions | `missions.html` | Gestion des missions |
| Stats | `stats.html` | Statistiques et graphiques |
| Config | `config.html` | Configuration |
| Timeline | `timeline.html` | Vue timeline |
| Historique | `history.html` | Historique des modifications |

---

# 6. Guide de Déploiement

## Procédure de déploiement kanbantest → kanban

```bash
# 1. Créer une sauvegarde
mkdir -p backup_kanban_avant_kanbantest_$(date +%Y%m%d_%H%M%S)
cp -r kanban backup_kanban_avant_kanbantest_$(date +%Y%m%d_%H%M%S)/

# 2. Copier tous les fichiers
cp kanbantest/index.html kanban/
cp kanbantest/missions.html kanban/
cp kanbantest/stats.html kanban/
cp kanbantest/config.html kanban/
cp kanbantest/history.html kanban/
cp kanbantest/timeline.html kanban/
cp -r kanbantest/css/* kanban/css/
cp -r kanbantest/js/* kanban/js/

# 3. Vérification
git status
git diff kanban/

# 4. Commit et push
git add kanban/
git commit -m "Déploiement de kanbantest vers kanban (production)"
git push origin <branche>
```

## Checklist post-déploiement

### Tests Obligatoires
- [ ] Modal historique: Cliquer sur titre de tâche → ouvre bien l'édition
- [ ] Édition commentaires: Sauvegarder un commentaire → pas d'erreur
- [ ] Page statistiques: Charger stats.html → pas d'erreur console
- [ ] Général: Navigation de base fonctionne

### Tests Approfondis
- [ ] Créer nouvelle tâche
- [ ] Modifier tâche existante
- [ ] Voir historique d'une tâche
- [ ] Éditer commentaire depuis historique
- [ ] Vérifier stats: alignement stratégique > 0%
- [ ] Badges bureaux sans marqueur 'L'

## Plan de retour arrière

```bash
# Restauration depuis sauvegarde
rm -rf kanban
cp -r backup_kanban_avant_kanbantest_YYYYMMDD_HHMMSS/kanban kanban

git add kanban/
git commit -m "Rollback: restauration depuis backup"
git push origin <branche>
```

---

# 7. Promotion Test → Production

## Écarts fonctionnels à résorber

1. **Gestionnaire de vues unifié**: `test/` utilise `ViewManager`, `kanban/` utilise `ViewModeManager` + renderers legacy
2. **Centralisation des événements**: `EventCentralizer` + `EventManager` absents en prod
3. **Fallback stratégique**: Préproduction bascule sur dataset embarqué si Grist inaccessible
4. **Structure HTML/CSS**: Wrapper grid (`.kanban-wrapper`) requis pour pile de colonnes

## Actions de synchronisation

1. Migrer `ViewModeManager` → `ViewManager`
2. Importer `EventCentralizer` et `EventManager`
3. Aligner `constants.js` avec colonnes élargies
4. Mettre à jour le shell HTML/CSS
5. Nettoyer assets inutilisés après migration

## Tests manuels avant bascule

### Chargement & données
- Vérifier fallback stratégique
- Vérifier remontée des colonnes dans formulaires

### Interface Kanban
- Tester modes (compact, détaillé, focus) via boutons et `1/2/3`
- Vérifier pile de colonnes repliées

### Modales & historique
- Ouvrir/fermer plusieurs fois sans doubles déclenchements
- Tester création/édition commentaires et raccourcis

---

# 8. Spécifications V3.0 (Dashboard + Timeline)

## Objectif

Améliorer le système Kanban avec:
1. Taxonomie à 2 dimensions (prévisibilité + type)
2. Dashboard de pilotage avec alertes
3. Vue Timeline interactive (Vis.js)
4. Système de pause et tracking dette technique

## Nouvelles colonnes Grist

| Colonne | Type | Options | Défaut |
|---------|------|---------|--------|
| `previsibilite` | Choice | Imprévisible, Prévisible | Imprévisible |
| `type_tache` | Choice | Incident, Support, MCO, Projet, Overhead | Support |
| `est_dette_technique` | Toggle | - | No |
| `temps_estime_heures` | Numeric | - | - |

## Dashboard

### Fonctions à implémenter

**`calculerStatistiquesDetaillees()`**:
- Filtrer tâches actives (exclure Terminé, En pause)
- Calculer % par prévisibilité et par type
- Déterminer statut: ok/warning/critical selon cibles

**`genererAlertes()`**:
- Imprévisible > 50% → critique
- Imprévisible > 45% → warning
- Projets < 15% → critique
- Projets < 20% → warning
- Dettes techniques > 90j
- Tâches bloquées > 7j

**`genererDashboardHTML()`**:
```html
<div class="dashboard-container">
  <div class="dashboard-alertes">[Alertes]</div>
  <div class="dashboard-header">[Titre + total]</div>
  <div class="dashboard-grid">
    <div class="section-previsibilite">[Stats]</div>
    <div class="section-types">[Stats]</div>
  </div>
  <div class="dashboard-capacite">[Capacité projet]</div>
</div>
```

## Timeline (Vis.js)

### Dépendance
```html
<link href="https://unpkg.com/vis-timeline@7.7.3/styles/vis-timeline-graph2d.min.css" />
<script src="https://unpkg.com/vis-timeline@7.7.3/standalone/umd/vis-timeline-graph2d.min.js"></script>
```

### Fonctions Timeline

- `initTimeline()` - Créer/mettre à jour instance Vis.js
- `convertRecordsToTimelineItems()` - Convertir records en items
- `getTimelineGroup(record)` - Déterminer groupe selon groupement
- `createTimelineGroups()` - Générer liste de groupes
- `handleTimelineMove(item, callback)` - Gérer drag & drop dates
- `switchView(view)` - Basculer Kanban ↔ Timeline

### Groupements disponibles

- Par personne (`qui`)
- Par type (`type_tache`)
- Par prévisibilité (`previsibilite`)
- Par bureau (`bureau`)
- Par projet (`projet`)

### Options Vis.js

```javascript
{
  stack: true,
  zoomable: true,
  moveable: true,
  orientation: 'top',
  start: new Date(Date.now() - 7*86400000),
  end: new Date(Date.now() + 30*86400000),
  editable: {
    updateTime: true,
    updateGroup: true,
    remove: false
  },
  locale: 'fr',
  template: (item) => createTimelineItemTemplate(item),
  onMove: (item, callback) => handleTimelineMove(item, callback)
}
```

## Checklist implémentation

### Phase 1: Grist (UTILISATEUR)
- [ ] Créer colonnes `previsibilite`, `type_tache`
- [ ] Créer `temps_estime_heures`, `est_dette_technique` (optionnel)
- [ ] Ajouter statut "En pause"

### Phase 2: Dashboard
- [ ] Ajouter constantes
- [ ] Implémenter `calculerStatistiquesDetaillees()`
- [ ] Implémenter `genererAlertes()`
- [ ] Implémenter `genererDashboardHTML()`
- [ ] Modifier `refreshKanban()` pour inclure dashboard
- [ ] Ajouter CSS dashboard

### Phase 3: Timeline
- [ ] Ajouter CDN Vis.js
- [ ] Implémenter fonctions Timeline
- [ ] Ajouter HTML (sélecteur vue, container)
- [ ] Ajouter CSS Timeline
- [ ] Ajouter event listeners

### Phase 4: Modal
- [ ] Ajouter champs HTML
- [ ] Modifier `openPopup()` et `saveTask()`
- [ ] Peupler selects

### Phase 5: Tests
- [ ] Tester dashboard + alertes
- [ ] Tester Timeline (tous groupements)
- [ ] Tester drag & drop
- [ ] Tester basculement Kanban ↔ Timeline

---

# Résolution de Problèmes

## Erreurs Communes

### "API Grist non disponible"
- **Cause**: Script `grist-plugin-api.js` manquant
- **Solution**: Ajouter `<script src="https://docs.getgrist.com/grist-plugin-api.js"></script>` AVANT jQuery

### "Le format du champ bureau/qui est invalide"
- **Cause**: Champs passés comme strings au lieu de tableaux
- **Solution**: Convertir avec `_toArray()` dans MissionsManager

### Doublons de Tâches
- **Vérifier**: Double filtrage `___TEMP_USER_RECORD___`
- **Dans**: `handleGristUpdate()` ET `filterRecords()`

### Modal ne se ferme pas
- **Cause**: Conflit entre managers
- **Solution**: ModalManager seul responsable des modales

### Erreur 404 sur imports
- **Vérifier**: Paths relatifs `../managers/` vs `./managers/`

## Debugging Console

```javascript
// Variables globales
window.kanbanManager     // Instance principale
window.KanbanApp        // Utilitaires exposés

// Accès aux managers
kanbanManager.viewModeManager    // Vues
kanbanManager.filterManager      // Filtres
kanbanManager.modalManager       // Modales
kanbanManager.gristManager       // Interface Grist

// Diagnostic
kanbanManager.exportState()      // État complet
kanbanManager.diagnoseIssues()   // Diagnostic multi-managers

// Debug vues
kanbanManager.viewModeManager.getCurrentMode()
kanbanManager.viewModeManager.getFocusColumn()

// Debug filtres
kanbanManager.filterManager.getFilters()
kanbanManager.filterManager.getFilteredRecords()
```

---

*Documentation compilée le 2025-12-16*
*Source: PROJECT_STRUCTURE.md, ARCHITECTURE.md, schema.md, MISSIONS_ARCHITECTURE.md, README.md, GUIDE_DEPLOIEMENT_PRODUCTION.md, PROMOTION_TEST_TO_PROD.md, AGENTS.md*
