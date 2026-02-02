# Structure des Tables Grist

## Tables utilisées

| Table | Description |
|-------|-------------|
| `Ssir_principale_task` | Tâches principales (kanban, timeline, missions) |
| `Ssir_strategie2` | Stratégies/Missions (objectifs, sous-objectifs, axes) |
| `Ssir_programmes` | Programmes (regroupement de stratégies) |

---

## Ssir_principale_task

Table principale des tâches.

### Colonnes Requises

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | Int | ID Grist (auto-généré) |
| `titre` | Text | Titre de la tâche |
| `description` | Text | Description détaillée |
| `statut` | Choice | Statut (Backlog, À faire, En cours, En attente, En pause, Bloqué, Validation, Terminé) |
| `bureau` | ChoiceList | Bureau(x) concerné(s) (Réseaux, BDD, Exploit, Nexsis-RRF, Chef SSIR, Chef GSSI, Chef SIG) |
| `qui` | ChoiceList | Responsable(s) assigné(s) |
| `urgence` | Choice | Niveau d'urgence (Immédiate, Courte, Moyenne, Longue) |
| `impact` | Choice | Niveau d'impact (Critique, Important, Modéré, Mineur) |
| `projet` | Choice | Projet associé |
| `strategie_id` | ReferenceList → Ssir_strategie2 | Liens vers les stratégies/missions |
| `notes` | Text | Notes additionnelles |
| `date_derniere_maj` | DateTime | Date de dernière modification |
| `statut_precedent` | Text | Statut avant le dernier changement |

### Colonnes Optionnelles

| Colonne | Type | Description |
|---------|------|-------------|
| `date_debut` | Date | Date de début planifiée |
| `date_echeance` | Date | Date d'échéance |
| `jalons` | Text (JSON) | Jalons au format JSON |
| `reference` | Text | Références externes (URLs, tickets) |

### Colonnes de Production

| Colonne | Type | Description |
|---------|------|-------------|
| `type_tache_id` | Reference → Ssir_type_task | Type de tâche (legacy) |
| `priorite` | Choice | Priorité (legacy) |
| `historique_statuts` | Date | Historique des statuts |
| `datenow` | DateTime | Timestamp NOW() |
| `str_statut` | Text | Statut en string (formule) |
| `str_urgence` | Text | Urgence en string (formule) |
| `str_qui` | Text | Responsables en string (formule) |
| `str_bureau` | Text | Bureaux en string (formule) |
| `str_impact` | Text | Impact en string (formule) |
| `date_creation` | DateTime | Date de création |
| `date_modif` | Text | Date de modification |
| `Créé par` | Text | Utilisateur créateur |

### Colonnes Temps et Liaisons (Déc 2025)

| Colonne | Type | Description |
|---------|------|-------------|
| `temps_estime_heures` | Numeric | Temps estimé en heures |
| `temps_reel_heures` | Numeric | Temps réel passé en heures |
| `tache_liens` | Text (JSON) | Liaisons: `[{targetId, type, createdAt}]` |

### Colonnes Taxonomie V3

| Colonne | Type | Description |
|---------|------|-------------|
| `nature_activite` | Choice | INC, SUP, MCO, PRJ, OVH |
| `genre_action` | Choice | DOC, ANA, CON, RCH, DEV, TST, VAL, VER, COR, INS, CFG, INV, SEC, REU, FOR, SUI, VEI |
| `etape_cycle` | Choice | VIS, ANA, CON, PLN, REA, DEP, EXP, AME |
| `previsibilite` | Choice | Prévisible, Imprévisible |

### Colonnes MEO et Missions (Nov 2025 - Jan 2026)

| Colonne | Type | Description |
|---------|------|-------------|
| `mise_en_oeuvre_code` | Text | Code MEO (ex: MEO-001) |
| `mise_en_oeuvre_nom` | Text | Nom de la mise en œuvre |
| `mission_code` | Text | Code mission (ex: MIS-2025-001) |
| `mission_nom` | Text | Nom de la mission |
| `mission_responsable` | Text | Responsable de la mission |
| `mission_bureau` | Choice | Bureau de la mission |
| `mission_priorite` | Choice | Critique, Haute, Moyenne, Basse |
| `mission_date_debut` | Date | Date de début de la mission |
| `mission_date_fin` | Date | Date de fin de la mission |
| `sous_action_code` | Text | Code sous-action (ex: SA-001) |
| `sous_action_nom` | Text | Nom de la sous-action |
| `sous_action_charge_estimee` | Numeric | Charge estimée (jours) |
| `sous_action_charge_reelle` | Numeric | Charge réelle (jours) |
| `categorie` | Choice | MCO, Projet, Imprévisible |
| `est_classifiee` | Bool | Tâche rattachée à une mission? |
| `avancement` | Int | Pourcentage d'avancement (0-100) |

---

## Ssir_strategie2

Table des stratégies/missions.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | Int | ID Grist (auto-généré) |
| `id2` | Int | ID calculé (= id) |
| `objectif` | Text | Objectif principal |
| `sous_objectif` | Text | Sous-objectif |
| `axe_strategique` | Text | Axe stratégique / Mission |
| `responsable` | Text | Responsable |
| `echeance` | Text | Échéance (ex: 2024-2025) |
| `portee` | Text | Portée (GSSI, Générale) |
| `ssir_principale_task` | ReferenceList | Tâches liées (reverse de strategie_id) |

---

## Ssir_programmes

Table des programmes (optionnelle).

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | Int | ID Grist (auto-généré) |
| `code` | Text | Code du programme |
| `nom` | Text | Nom du programme |
| `description` | Text | Description |

---

## Relations

```
Ssir_programmes
      │
      │ 1:N (optionnel)
      ▼
Ssir_strategie2 ◄────────┐
      │                  │
      │ N:M              │ ReferenceList
      ▼                  │
Ssir_principale_task ────┘
      (strategie_id)
```

- Une **tâche** peut être liée à **plusieurs stratégies** via `strategie_id` (ReferenceList)
- Une **stratégie** peut avoir **plusieurs tâches** via `ssir_principale_task` (reverse)
- Les **programmes** regroupent optionnellement des stratégies

---

## Notes Techniques

### Format ReferenceList Grist
Les colonnes de type `ReferenceList` utilisent le format `["L", id1, id2, ...]` :
- `["L"]` = liste vide
- `["L", 38]` = une seule référence (ID 38)
- `["L", 38, 42, 55]` = plusieurs références

### Format ChoiceList Grist
Les colonnes de type `ChoiceList` utilisent le même format :
- `["L"]` = liste vide
- `["L", "Réseaux", "BDD"]` = plusieurs choix

---

## User_Actions2 (legacy)

Table historique des actions utilisateur (legacy -- conservée pour compatibilité).

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | Int | ID Grist (auto-généré) |
| `action_type` | Text | Type d'action effectuée |
| `task_id` | Reference | Tâche concernée |
| `timestamp` | DateTime | Date de l'action |
| `user` | Text | Utilisateur ayant effectué l'action |
| `details` | Text | Détails de l'action (JSON) |

> **Note** : Cette table est en cours de dépréciation. L'historique est désormais géré via le champ `notes` (JSON) de `Ssir_principale_task`.

---

### Colonnes Supprimées
- `id_task` : Supprimée (redondante avec `id`)
