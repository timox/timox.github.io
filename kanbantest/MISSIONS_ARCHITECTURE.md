# Architecture du Système de Missions

> **Version**: 1.1 - Février 2026
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
        EventCentral["EventCentralizer<br/>(gestion événements)"]
    end

    subgraph SPECIALIZED["📦 MANAGERS SPÉCIALISÉS"]
        FilterMgr["FilterManager"]
        ViewMgr["ViewManager"]
        SharedTaskModal["SharedTaskModal"]
        HistoryMgr["HistoryManager"]
        DateMgr["DatePickerManager"]
        JalonMgr["JalonManager"]
        MissionsMgr["MissionsManager"]
        ConfigMgr["ConfigManager"]
        DashMgr["DashboardManager"]
        TimeMgr["TimelineManager"]
        LinksMgr["TaskLinksManager"]
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
    KanbanMgr --> SharedTaskModal
    KanbanMgr --> HistoryMgr
    KanbanMgr --> DateMgr
    KanbanMgr --> JalonMgr

    MissionsMgr --> GristMgr

    GristMgr --> GristAPI
    GristAPI --> GristDB
```

---

## Modèle Conceptuel de Données (MCD)

### Vue d'ensemble des entités

```mermaid
erDiagram
    STRATEGIE ||--o{ TACHE : "strategie_id"
    MISSION ||--o{ SOUS_ACTION : "contient"
    SOUS_ACTION ||--o{ TACHE : "rattache"
    BUREAU ||--o{ TACHE : "affecte"
    RESPONSABLE ||--o{ TACHE : "assigne"

    STRATEGIE {
        int id PK
        string objectif
        string sous_objectif
        string axe_strategique
        string responsable
        string echeance
        string portee
    }

    MISSION {
        string code PK "MIS-2025-XXX"
        string nom
        string responsable
        string bureau
        string priorite "Critique|Haute|Moyenne|Basse"
        date date_debut
        date date_fin
    }

    SOUS_ACTION {
        string code PK "SA-XXX"
        string nom
        string categorie "MCO|Projet|Imprévisible"
        float charge_estimee
        float charge_reelle
        string mission_code FK
    }

    TACHE {
        int id PK
        string titre
        string description
        string statut
        string projet
        string urgence
        string impact
        date date_debut
        date date_echeance
        string notes "JSON"
        boolean est_classifiee
    }

    BUREAU {
        string nom PK
    }

    RESPONSABLE {
        string nom PK
    }
```

### MCD Logique - Implémentation dénormalisée

> **Note**: En pratique, les entités MISSION et SOUS_ACTION ne sont pas des tables séparées.
> Elles sont **dénormalisées** dans la table TACHE pour simplifier l'architecture Grist.

```mermaid
erDiagram
    Ssir_strategie2 ||--o{ Ssir_principale_task : "strategie_id"

    Ssir_strategie2 {
        int id PK
        string objectif
        string sous_objectif
        string axe_strategique
        string responsable
        string echeance
        string portee
        int id2
    }

    Ssir_principale_task {
        int id PK
        string titre
        string description
        string statut
        string projet
        string urgence
        string impact
        choicelist bureau
        choicelist qui
        date date_debut
        date date_echeance
        text notes
        reflist strategie_id FK
        datetime date_creation
        datetime date_derniere_maj
        string Cree_par
        string UUID
        int id_task
        string jalons
        string mission_code "DENORMALISE"
        string mission_nom "DENORMALISE"
        string mission_responsable "DENORMALISE"
        choice mission_bureau "DENORMALISE"
        choice mission_priorite "DENORMALISE"
        date mission_date_debut "DENORMALISE"
        date mission_date_fin "DENORMALISE"
        string sous_action_code "DENORMALISE"
        string sous_action_nom "DENORMALISE"
        choice categorie "DENORMALISE"
        numeric sous_action_charge_estimee "DENORMALISE"
        numeric sous_action_charge_reelle "DENORMALISE"
        bool est_classifiee "DENORMALISE"
    }
```

### Hiérarchie conceptuelle

```mermaid
flowchart TB
    subgraph NIVEAU1["Niveau 1: Stratégie"]
        S["Stratégie<br/>(Ssir_strategie2)"]
    end

    subgraph NIVEAU2["Niveau 2: Mission"]
        M["Mission<br/>(champs mission_*)"]
    end

    subgraph NIVEAU3["Niveau 3: Sous-action"]
        SA["Sous-action<br/>(champs sous_action_*)"]
    end

    subgraph NIVEAU4["Niveau 4: Tâche"]
        T["Tâche<br/>(Ssir_principale_task)"]
    end

    S -->|"1:N"| T
    M -->|"1:N"| SA
    SA -->|"1:N"| T

    style NIVEAU1 fill:#e1f5fe
    style NIVEAU2 fill:#fff3e0
    style NIVEAU3 fill:#f3e5f5
    style NIVEAU4 fill:#e8f5e9
```

### Cardinalités

| Relation | Cardinalité | Description |
|----------|-------------|-------------|
| Stratégie → Tâche | 1:N | Une stratégie peut avoir plusieurs tâches |
| Mission → Sous-action | 1:N | Une mission contient plusieurs sous-actions |
| Sous-action → Tâche | 1:N | Une sous-action regroupe plusieurs tâches |
| Bureau → Tâche | N:M | Un bureau gère plusieurs tâches, une tâche peut être multi-bureaux |
| Responsable → Tâche | N:M | Même logique pour les responsables |

### Dictionnaire des données

#### Table `Ssir_principale_task` (principale)

| Colonne | Type Grist | Obligatoire | Description |
|---------|------------|-------------|-------------|
| `id` | Int (auto) | ✅ | Identifiant unique |
| `titre` | Text | ✅ | Titre de la tâche |
| `description` | Text | ❌ | Description détaillée |
| `statut` | Choice | ✅ | Backlog, À faire, En cours, etc. |
| `bureau` | ChoiceList | ❌ | Liste des bureaux (format ['L', ...]) |
| `qui` | ChoiceList | ❌ | Liste des responsables |
| `urgence` | Choice | ❌ | Faible, Moyenne, Élevée, Critique |
| `impact` | Choice | ❌ | Mineur, Modéré, Majeur, Critique |
| `projet` | Choice | ❌ | Projet associé |
| `date_debut` | Date | ❌ | Date de début prévue |
| `date_echeance` | Date | ❌ | Date d'échéance |
| `strategie_id` | RefList | ❌ | Référence vers Ssir_strategie2 |
| `notes` | Text | ❌ | JSON contenant historique/commentaires |
| `mission_code` | Text | ❌ | Code mission (MIS-YYYY-XXX) |
| `mission_nom` | Text | ❌ | Nom de la mission |
| `mission_responsable` | Text | ❌ | Responsable mission |
| `mission_bureau` | Choice | ❌ | Bureau de la mission |
| `mission_priorite` | Choice | ❌ | Critique, Haute, Moyenne, Basse |
| `mission_date_debut` | Date | ❌ | Début de la mission |
| `mission_date_fin` | Date | ❌ | Fin prévue de la mission |
| `sous_action_code` | Text | ❌ | Code sous-action (SA-XXX) |
| `sous_action_nom` | Text | ❌ | Nom de la sous-action |
| `categorie` | Choice | ❌ | MCO, Projet, Imprévisible |
| `sous_action_charge_estimee` | Numeric | ❌ | Charge estimée (jours) |
| `sous_action_charge_reelle` | Numeric | ❌ | Charge réalisée (jours) |
| `est_classifiee` | Bool | ❌ | True si rattachée à une mission |

#### Table `Ssir_strategie2` (référence)

| Colonne | Type Grist | Description |
|---------|------------|-------------|
| `id` | Int (auto) | Identifiant unique |
| `objectif` | Text | Objectif stratégique |
| `sous_objectif` | Text | Sous-objectif |
| `axe_strategique` | Text | Axe stratégique / Action à mener |
| `responsable` | Text | Responsable de l'action |
| `echeance` | Text | Échéance prévue |
| `portee` | Text | Portée de l'action |

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

✅ **Corrigé**: Deux flags séparés sont utilisés:
- `window._gristReadyInitialized` : pour `grist.ready()`
- `window._gristCallbacksInitialized` : pour `onRecords` / `onOptions`

---

## Configuration dans Grist

### Étape 1: Créer les colonnes

Dans la table `Ssir_principale_task`, ajouter les colonnes suivantes:

#### Colonnes Mission (7)

| Colonne | Type | Options |
|---------|------|---------|
| `mission_code` | Text | - |
| `mission_nom` | Text | - |
| `mission_responsable` | Text | - |
| `mission_bureau` | Choice | Infrastructure, Sécurité, Support, Développement |
| `mission_priorite` | Choice | Critique, Haute, Moyenne, Basse |
| `mission_date_debut` | Date | - |
| `mission_date_fin` | Date | - |

#### Colonnes Sous-action (5)

| Colonne | Type | Options |
|---------|------|---------|
| `sous_action_code` | Text | - |
| `sous_action_nom` | Text | - |
| `categorie` | Choice | MCO, Projet, Imprévisible |
| `sous_action_charge_estimee` | Numeric | - |
| `sous_action_charge_reelle` | Numeric | - |

#### Colonne Meta (1)

| Colonne | Type | Description |
|---------|------|-------------|
| `est_classifiee` | Toggle (Bool) | Coché si tâche rattachée à une mission |

### Étape 2: Ajouter le widget missions.html

1. **Ajouter une page** dans votre document Grist
2. **Ajouter une section** → Type: "Custom"
3. **URL du widget**:
   ```
   https://timox.github.io/kanbantest/missions.html
   ```
4. **Accès**: Sélectionner "Full document access"
5. **Table source**: `Ssir_principale_task`

### Étape 3: Configuration des Choice

Pour les colonnes Choice, configurer les options:

```
mission_priorite:
  - Critique
  - Haute
  - Moyenne
  - Basse

mission_bureau:
  - Infrastructure
  - Sécurité
  - Support
  - Développement
  (ajouter vos bureaux)

categorie:
  - MCO
  - Projet
  - Imprévisible
```

---

## Guide d'utilisation

### Créer une mission

1. Cliquer sur **"Nouvelle Mission"**
2. Remplir le formulaire:
   - **Code**: Auto-généré (MIS-YYYY-XXX)
   - **Nom**: Nom descriptif
   - **Responsable**: Personne en charge
   - **Bureau**: Équipe responsable
   - **Priorité**: Critique > Haute > Moyenne > Basse
   - **Dates**: Début et fin prévues
3. Optionnel: Ajouter des **sous-actions** initiales
4. Cliquer **"Enregistrer"**

### Modes de vue

| Mode | Description |
|------|-------------|
| **Vue Missions** | Cartes par mission avec sous-actions |
| **Vue Catégories** | Groupées par MCO/Projet/Imprévisible |
| **Non classifiées** | Tâches sans mission (à classifier) |

### Statistiques affichées

- **Missions actives**: Nombre de missions en cours
- **Tâches total**: Nombre de tâches dans toutes les missions
- **Non classifiées**: Tâches orphelines à rattacher
- **En retard**: Missions dépassant la date de fin

---

## Évolutions futures

- [x] Rattachement de tâches existantes à une mission (janvier 2026)
- [ ] Édition des missions existantes
- [ ] Dashboard avec graphiques de progression
- [ ] Export vers formats multiples (CSV, Excel)
- [ ] Synchronisation temps réel entre pages

---

*Documentation mise à jour le 2026-02-02*
