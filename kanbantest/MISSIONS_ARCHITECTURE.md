# Architecture du Système de Missions

> **Version**: 1.0 - Décembre 2025
> **Status**: En développement

---

## Vue d'ensemble

Le système de missions permet de classifier et organiser les tâches selon une hiérarchie:

```
Stratégie → Mission → Sous-action → Tâche
```

### Approche technique: **Dénormalisation**

Plutôt que de créer des tables séparées pour les missions, les données sont stockées directement dans chaque tâche (table `Ssir_principale_task`). Le `MissionsManager` agrège ces données pour reconstruire la structure hiérarchique.

---

## Schéma d'architecture globale

```mermaid
flowchart TB
    subgraph GRIST["🗄️ GRIST API"]
        GristAPI["grist-plugin-api.js"]
        GristDB[(Ssir_principale_task<br/>+ Ssir_strategie2)]
    end

    subgraph PAGES["📄 PAGES HTML"]
        Index["index.html<br/>(Kanban principal)"]
        Missions["missions.html<br/>(Gestion missions)"]
        Stats["stats.html<br/>(Statistiques)"]
        Config["config.html<br/>(Configuration)"]
        History["history.html"]
        Timeline["timeline.html"]
    end

    subgraph INIT["🚀 INITIALISATION"]
        AppInit["app-initializer.js"]
        MissApp["missions-app.js"]
        StatsApp["stats-app.js"]
        ConfigApp["config-app.js"]
        HistApp["history-app.js"]
        TimeApp["timeline-app.js"]
    end

    subgraph CORE["⚙️ MANAGERS CORE"]
        KanbanMgr["KanbanManager<br/>(orchestrateur)"]
        GristMgr["GristManager<br/>(connexion données)"]
    end

    subgraph SPECIALIZED["📦 MANAGERS SPÉCIALISÉS"]
        FilterMgr["FilterManager"]
        ViewMgr["ViewManager"]
        ModalMgr["ModalManager"]
        HistoryMgr["HistoryManager"]
        DateMgr["DatePickerManager"]
        JalonMgr["JalonManager"]
        MissionsMgr["MissionsManager"]
    end

    Index --> AppInit
    Missions --> MissApp
    Stats --> StatsApp
    Config --> ConfigApp
    History --> HistApp
    Timeline --> TimeApp

    AppInit --> KanbanMgr
    MissApp --> GristMgr
    MissApp --> MissionsMgr
    ConfigApp --> GristMgr

    StatsApp -.->|direct| GristAPI
    HistApp -.->|direct| GristAPI
    TimeApp -.->|direct| GristAPI

    KanbanMgr --> GristMgr
    KanbanMgr --> FilterMgr
    KanbanMgr --> ViewMgr
    KanbanMgr --> ModalMgr
    KanbanMgr --> HistoryMgr
    KanbanMgr --> DateMgr
    KanbanMgr --> JalonMgr

    MissionsMgr --> GristMgr

    GristMgr --> GristAPI
    GristAPI --> GristDB
```

---

## Modèle de données

### Structure dénormalisée (table unique enrichie)

```mermaid
erDiagram
    Ssir_principale_task {
        int id PK "Identifiant unique"
        string titre "Titre de la tâche"
        string description "Description"
        string statut "À faire, En cours, Terminé..."
        string projet "Projet associé"
        string urgence "Niveau d'urgence"
        string impact "Niveau d'impact"
        list bureau "Équipes (format Grist ['L', ...])"
        list qui "Responsables (format Grist)"
        date date_debut "Date de début"
        date date_echeance "Date d'échéance"
        string notes "JSON historique/commentaires"
        string mission_code "Code mission (MIS-2025-001)"
        string mission_nom "Nom de la mission"
        string mission_responsable "Responsable mission"
        string mission_bureau "Bureau de la mission"
        string mission_priorite "Critique, Haute, Moyenne, Basse"
        date mission_date_debut "Date début mission"
        date mission_date_fin "Date fin mission"
        string sous_action_code "Code sous-action (SA-001)"
        string sous_action_nom "Nom sous-action"
        string categorie "MCO, Projet, Imprévisible"
        float sous_action_charge_estimee "Charge estimée (jours)"
        float sous_action_charge_reelle "Charge réelle (jours)"
        boolean est_classifiee "Tâche classifiée?"
    }

    Ssir_strategie2 {
        int id PK
        string objectif "Objectif stratégique"
        string sous_objectif "Sous-objectif"
        string action "Action à mener"
        string responsable "Responsable"
        string echeance "Échéance"
        string portee "Portée"
    }

    Ssir_principale_task }o--o{ Ssir_strategie2 : "strategie_id"
```

### Colonnes ajoutées pour les missions (13 nouvelles)

| Colonne | Type | Description |
|---------|------|-------------|
| `mission_code` | Text | Code unique (ex: MIS-2025-001) |
| `mission_nom` | Text | Nom descriptif |
| `mission_responsable` | Text | Responsable de la mission |
| `mission_bureau` | Text | Bureau/équipe |
| `mission_priorite` | Choice | Critique, Haute, Moyenne, Basse |
| `mission_date_debut` | Date | Date de début |
| `mission_date_fin` | Date | Date de fin |
| `sous_action_code` | Text | Code sous-action (ex: SA-001) |
| `sous_action_nom` | Text | Nom de la sous-action |
| `categorie` | Choice | MCO, Projet, Imprévisible |
| `sous_action_charge_estimee` | Numeric | Charge estimée (jours) |
| `sous_action_charge_reelle` | Numeric | Charge réelle (jours) |
| `est_classifiee` | Bool | Tâche rattachée à une mission? |

---

## Catégories de sous-actions

```mermaid
pie title Répartition des catégories
    "MCO (Maintien en Condition)" : 40
    "Projet" : 45
    "Imprévisible" : 15
```

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| **MCO** 🔧 | Maintien en Condition Opérationnelle | Mises à jour, patches, monitoring |
| **Projet** 🎯 | Projets planifiés | Nouvelles fonctionnalités, migrations |
| **Imprévisible** ⚡ | Incidents et urgences | Bugs critiques, pannes |

---

## Flux d'initialisation

### Page missions.html

```mermaid
sequenceDiagram
    participant HTML as missions.html
    participant GristAPI as grist-plugin-api.js
    participant App as missions-app.js
    participant GM as GristManager
    participant MM as MissionsManager

    HTML->>GristAPI: Chargement script
    HTML->>App: Chargement module

    Note over App: $(document).ready()

    App->>GristAPI: grist.ready({columns: [...]})
    App->>App: window._gristReadyInitialized = true

    App->>GM: new GristManager(null)
    GM->>GM: init()
    GM->>GristAPI: waitForGristReady()

    Note over GM: Skip grist.ready() (déjà fait)

    GM->>GristAPI: docApi.fetchTable(TABLE_ID)
    GristAPI-->>GM: Records[]
    GM->>GM: mapGristRecords()
    GM->>GM: isConnected = true

    App->>App: Attendre isConnected
    App->>MM: new MissionsManager(gristManager)

    MM->>MM: loadMissions()
    MM->>GM: currentRecords
    MM->>MM: Agrégation par mission_code

    App->>App: setupEventListeners()
    App->>App: loadData()
    App->>MM: getMissions()
    App->>App: displayMissions()
```

### Comparaison des patterns d'initialisation

```mermaid
flowchart LR
    subgraph INDEX["index.html"]
        I1["app-initializer.js"]
        I2["KanbanManager"]
        I3["7 Managers spécialisés"]
        I1 --> I2 --> I3
    end

    subgraph MISSIONS["missions.html"]
        M1["missions-app.js"]
        M2["GristManager"]
        M3["MissionsManager"]
        M1 --> M2 --> M3
    end

    subgraph STATS["stats.html"]
        S1["stats-app.js"]
        S2["grist.docApi direct"]
        S1 --> S2
    end
```

---

## Protection contre les appels multiples à grist.ready()

### Problème identifié

```mermaid
flowchart LR
    subgraph AVANT["⚠️ AVANT (bug)"]
        A1["missions-app.js<br/>grist.ready()"]
        A2["GristManager<br/>grist.ready()"]
        A1 -->|"appel 1"| Ready1["grist.ready()"]
        A2 -->|"appel 2"| Ready1
    end

    subgraph APRES["✅ APRÈS (corrigé)"]
        B1["missions-app.js<br/>grist.ready()"]
        B2["_gristReadyInitialized = true"]
        B3["GristManager<br/>vérifie flag"]
        B1 --> B2 --> B3
        B3 -->|"skip"| Skip["Pas d'appel"]
    end
```

### Solution implémentée

```javascript
// missions-app.js
if (typeof grist !== 'undefined' && !window._gristReadyInitialized) {
  grist.ready({ requiredAccess: 'full', columns: [...] });
  window._gristReadyInitialized = true;  // Flag anti-duplication
}

// GristManager.js
if (!window._gristReadyInitialized) {
  gristApi.ready({ requiredAccess: 'full' });
  // ... callbacks
  window._gristReadyInitialized = true;
}
```

---

## MissionsManager: Agrégation des données

### Principe d'agrégation

```mermaid
flowchart TD
    subgraph GRIST["Données Grist (plates)"]
        T1["Tâche 1<br/>mission_code: MIS-001"]
        T2["Tâche 2<br/>mission_code: MIS-001"]
        T3["Tâche 3<br/>mission_code: MIS-002"]
        T4["Tâche 4<br/>mission_code: null"]
    end

    subgraph AGG["MissionsManager.loadMissions()"]
        Loop["Boucle sur currentRecords"]
        Map["missionsCache (Map)"]
    end

    subgraph RESULT["Résultat agrégé"]
        M1["Mission MIS-001<br/>taches: [T1, T2]<br/>sous_actions: Map"]
        M2["Mission MIS-002<br/>taches: [T3]<br/>sous_actions: Map"]
        NC["Non classifiées<br/>[T4]"]
    end

    T1 --> Loop
    T2 --> Loop
    T3 --> Loop
    T4 --> Loop

    Loop --> Map
    Map --> M1
    Map --> M2
    T4 -.-> NC
```

### Structure d'une mission agrégée

```javascript
{
  code: "MIS-2025-001",
  nom: "Migration Cloud Azure",
  responsable: "Jean Dupont",
  bureau: "Infrastructure",
  priorite: "Haute",
  date_debut: "2025-01-15",
  date_fin: "2025-06-30",

  // Map des sous-actions
  sous_actions: Map {
    "SA-001" => {
      code: "SA-001",
      nom: "Audit infrastructure",
      categorie: "Projet",
      charge_estimee: 5,
      charge_reelle: 0,
      taches: [/* tâches liées */]
    },
    "SA-002" => { ... }
  },

  // Toutes les tâches de la mission
  taches: [/* Array de tâches */],

  // Statistiques calculées
  stats: {
    total: 15,
    completed: 5,
    inProgress: 8
  }
}
```

---

## Interface utilisateur (missions.html)

### Vues disponibles

```mermaid
flowchart LR
    subgraph VUES["Modes de vue"]
        V1["Vue Missions<br/>(par défaut)"]
        V2["Vue Catégories<br/>(MCO/Projet/Imprévisible)"]
        V3["Tâches non classifiées"]
    end

    V1 --> Cards["Cartes missions"]
    V2 --> Groups["Groupes par catégorie"]
    V3 --> List["Liste à classifier"]
```

### Fonctionnalités

| Fonction | Description |
|----------|-------------|
| Création mission | Modal avec code auto-généré (MIS-YYYY-XXX) |
| Sous-actions | Ajout lors de la création de mission |
| Filtres | Priorité, catégorie, recherche textuelle |
| Export | JSON avec structure complète |
| Statistiques | Missions actives, tâches, retards |

---

## Fichiers clés

| Fichier | Rôle | Lignes |
|---------|------|--------|
| `missions.html` | Page de gestion des missions | ~440 |
| `js/missions-app.js` | Application principale missions | ~590 |
| `js/managers/MissionsManager.js` | Logique métier missions | ~440 |
| `js/managers/GristManager.js` | Connexion Grist | ~900 |

---

## Points de vigilance

### 1. Scripts requis dans missions.html

```html
<!-- OBLIGATOIRE: Grist API en premier -->
<script src="https://docs.getgrist.com/grist-plugin-api.js"></script>

<!-- Puis jQuery et Bootstrap -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<!-- Enfin l'application -->
<script type="module" src="js/missions-app.js"></script>
```

### 2. Flag anti-duplication grist.ready()

Le flag `window._gristReadyInitialized` empêche les appels multiples à `grist.ready()` qui peuvent causer des erreurs.

### 3. Callbacks Grist

⚠️ **Problème potentiel**: Les callbacks `onRecords` et `onOptions` dans `GristManager.waitForGristReady()` sont à l'intérieur du bloc `if (!window._gristReadyInitialized)`. Si missions-app.js définit le flag en premier, ces callbacks ne seront pas enregistrés.

**Solution recommandée**: Sortir l'enregistrement des callbacks du bloc conditionnel.

---

## Évolutions futures

- [ ] Rattachement de tâches existantes à une mission
- [ ] Édition des missions existantes
- [ ] Dashboard avec graphiques de progression
- [ ] Export vers formats multiples (CSV, Excel)
- [ ] Synchronisation temps réel entre pages

---

*Documentation générée le 2025-12-16*
