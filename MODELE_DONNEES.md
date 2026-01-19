# Modèle de Données - Kanban SSIR

> **Version** : 0.1 - Janvier 2026
> **Statut** : En cours de définition
> **Auteur** : SSIR

---

## 1. Vue d'ensemble

Ce document décrit le modèle de données du système de gestion des tâches SSIR, incluant la hiérarchie Stratégie → Mission → Sous-action → Tâche.

### 1.1 Hiérarchie des entités

```
┌─────────────────────────────────────────────────────────────────┐
│                         STRATÉGIE                               │
│  (Table Ssir_strategie2 - une ligne = une stratégie complète)   │
│  Composée de : objectif + sous_objectif + action                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N (une stratégie peut avoir plusieurs missions)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          MISSION                                │
│  Projet opérationnel découlant d'une stratégie                  │
│  Durée typique : 3-12 mois                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N (une mission contient plusieurs sous-actions)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SOUS-ACTION                              │
│  Lot de travail cohérent au sein d'une mission                  │
│  Catégorisée : MCO | Projet | Imprévisible                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N (une sous-action regroupe plusieurs tâches)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           TÂCHE                                 │
│  Action unitaire exécutable (1h à 5j)                           │
│  Affichée dans le Kanban                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Vocabulaire et définitions

### 2.1 STRATÉGIE

> **IMPORTANT** : Une stratégie est une **ligne complète** de la table `Ssir_strategie2`.
> Elle est composée de 3 niveaux : `objectif` + `sous_objectif` + `action`.

| Champ | Description | Exemple |
|-------|-------------|---------|
| `objectif` | Orientation macro (niveau 1) | "Renforcer la sécurité du SI" |
| `sous_objectif` | Déclinaison (niveau 2) | "Mettre en conformité les réseaux" |
| `action` | Action stratégique (niveau 3) | "Mise en conformité de l'AD" |

**Exemple de stratégie complète :**
```
Stratégie = {
  objectif: "Renforcer la sécurité du SI",
  sous_objectif: "Mettre en conformité les réseaux",
  action: "Mise en conformité de l'AD",
  responsable: "Exploitation",
  echeance: "2024-2025"
}
```

### 2.2 MISSION

Une mission est un **projet opérationnel** qui découle d'une stratégie. Elle a :
- Un code unique (ex: `MIS-2026-001`)
- Une durée définie (date début / date fin)
- Un responsable
- Une priorité

| Attribut | Description | Obligatoire |
|----------|-------------|-------------|
| `code` | Identifiant unique | Oui |
| `nom` | Nom descriptif | Oui |
| `responsable` | Personne en charge | Non |
| `bureau` | Bureau/équipe | Non |
| `priorite` | Critique, Haute, Moyenne, Basse | Non |
| `date_debut` | Date de début | Non |
| `date_fin` | Date de fin prévue | Non |
| `strategie_id` | Lien vers la stratégie | Non |

<!-- TODO: Définir les règles de nommage des codes mission -->
<!-- TODO: Définir les critères de priorité -->

### 2.3 SOUS-ACTION

Une sous-action est un **lot de travail cohérent** au sein d'une mission.

| Attribut | Description | Obligatoire |
|----------|-------------|-------------|
| `code` | Identifiant (ex: SA-001) | Oui |
| `nom` | Nom descriptif | Oui |
| `categorie` | MCO, Projet, Imprévisible | Oui |
| `charge_estimee` | Charge en jours | Non |
| `charge_reelle` | Charge réalisée | Non |

#### Catégories de sous-actions

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| **MCO** | Maintien en Condition Opérationnelle | Support, mises à jour, monitoring, maintenance |
| **Projet** | Travail planifié avec une fin | Migration, déploiement, audit, développement |
| **Imprévisible** | Urgences non planifiées | Incidents, bugs critiques, demandes urgentes |

<!-- TODO: Définir des exemples concrets pour chaque catégorie -->
<!-- TODO: Préciser les règles d'estimation de charge -->

### 2.4 TÂCHE

Une tâche est une **action unitaire** réalisable par un agent.

| Attribut | Description |
|----------|-------------|
| `titre` | Intitulé court |
| `description` | Détails |
| `statut` | Backlog, À faire, En cours, En attente, Bloqué, Validation, Terminé |
| `bureau` | Bureau(x) concerné(s) |
| `qui` | Responsable(s) assigné(s) |
| `urgence` | Faible, Moyenne, Élevée, Critique |
| `impact` | Mineur, Modéré, Majeur, Critique |
| `date_echeance` | Date butoir |

---

## 3. Cardinalités et règles

### 3.1 Relations

| Relation | Cardinalité | Description |
|----------|-------------|-------------|
| Stratégie → Mission | 0:N | Une stratégie peut avoir 0 à N missions |
| Mission → Sous-action | 1:N | Une mission a au moins 1 sous-action |
| Sous-action → Tâche | 0:N | Une sous-action peut avoir 0 à N tâches |
| Tâche → Sous-action | 0:1 | Une tâche appartient à 0 ou 1 sous-action |

### 3.2 Règles métier

<!-- TODO: Compléter les règles métier -->

| Règle | Description | Statut |
|-------|-------------|--------|
| R1 | Une mission doit avoir au moins une sous-action | À valider |
| R2 | Une tâche non classifiée peut exister temporairement | À valider |
| R3 | Le rattachement tâche → mission sera-t-il obligatoire ? | À décider |
| R4 | Peut-on créer une mission sans stratégie ? | Oui (actuellement) |
| R5 | Une tâche peut-elle changer de sous-action ? | À décider |
| R6 | Que devient une tâche si sa mission est clôturée ? | À décider |

---

## 4. Implémentation technique

### 4.1 Approche retenue : Dénormalisation

Les données Mission et Sous-action sont **dénormalisées** dans la table `Ssir_principale_task` (pas de tables séparées).

**Avantages :**
- Simplicité de requêtage dans Grist
- Pas de jointures complexes
- Compatible avec l'existant

**Inconvénients :**
- Redondance des données mission sur chaque tâche
- Mise à jour d'une mission = mise à jour de toutes ses tâches

### 4.2 Tables Grist

#### Table `Ssir_strategie2` (existante)

```python
class Ssir_strategie2:
  id = grist.Int()           # PK auto
  objectif = grist.Text()    # Niveau 1
  sous_objectif = grist.Text()  # Niveau 2
  action = grist.Text()      # Niveau 3
  responsable = grist.Text()
  echeance = grist.Text()
  portee = grist.Text()
  id2 = grist.Int()          # Copie de id
```

#### Table `Ssir_principale_task` (étendue)

```python
class Ssir_principale_task:
  # === Champs existants ===
  id = grist.Int()
  titre = grist.Text()
  description = grist.Text()
  statut = grist.Choice()
  bureau = grist.ChoiceList()
  qui = grist.ChoiceList()
  urgence = grist.Choice()
  impact = grist.Choice()
  projet = grist.Choice()      # À remplacer par mission_code ?
  date_debut = grist.Date()
  date_echeance = grist.Date()
  strategie_id = grist.ReferenceList('Ssir_strategie2')
  notes = grist.Text()         # JSON historique

  # === Champs MISSION (7 colonnes) ===
  mission_code = grist.Text()           # Ex: MIS-2026-001
  mission_nom = grist.Text()
  mission_responsable = grist.Text()
  mission_bureau = grist.Choice()
  mission_priorite = grist.Choice()     # Critique, Haute, Moyenne, Basse
  mission_date_debut = grist.Date()
  mission_date_fin = grist.Date()

  # === Champs SOUS-ACTION (5 colonnes) ===
  sous_action_code = grist.Text()       # Ex: SA-001
  sous_action_nom = grist.Text()
  categorie = grist.Choice()            # MCO, Projet, Imprévisible
  sous_action_charge_estimee = grist.Numeric()
  sous_action_charge_reelle = grist.Numeric()

  # === Champ META (1 colonne) ===
  est_classifiee = grist.Bool()         # True si rattachée à une mission
```

### 4.3 Colonnes à créer dans Grist

<!-- TODO: Vérifier quelles colonnes existent déjà -->

| Colonne | Type | Options | Créée ? |
|---------|------|---------|---------|
| `mission_code` | Text | - | ? |
| `mission_nom` | Text | - | ? |
| `mission_responsable` | Text | - | ? |
| `mission_bureau` | Choice | Exploit, Réseau, BDD, Chef SSIR, SIG, NEXSIS-RRF, COMSIC, RSSI, DPO | ? |
| `mission_priorite` | Choice | Critique, Haute, Moyenne, Basse | ? |
| `mission_date_debut` | Date | - | ? |
| `mission_date_fin` | Date | - | ? |
| `sous_action_code` | Text | - | ? |
| `sous_action_nom` | Text | - | ? |
| `categorie` | Choice | MCO, Projet, Imprévisible | ? |
| `sous_action_charge_estimee` | Numeric | - | ? |
| `sous_action_charge_reelle` | Numeric | - | ? |
| `est_classifiee` | Toggle | - | ? |

---

## 5. Exemples concrets

### 5.1 Exemple complet

```
STRATÉGIE (ligne dans Ssir_strategie2)
├── objectif: "Renforcer la sécurité du SI"
├── sous_objectif: "Mettre en conformité les accès"
├── action: "Déploiement MFA sur tous les comptes"
└── responsable: "RSSI"

    └── MISSION: MIS-2026-003 "Déploiement MFA Azure"
        ├── responsable: "Jean Dupont"
        ├── bureau: "Exploit"
        ├── priorite: "Haute"
        ├── date_debut: 2026-02-01
        ├── date_fin: 2026-06-30
        │
        ├── SOUS-ACTION: SA-001 "Audit des comptes" [PROJET]
        │   ├── charge_estimee: 5j
        │   └── TÂCHES:
        │       ├── "Lister les comptes sans MFA"
        │       ├── "Identifier les comptes de service"
        │       └── "Documenter les exceptions"
        │
        ├── SOUS-ACTION: SA-002 "Déploiement pilote" [PROJET]
        │   ├── charge_estimee: 10j
        │   └── TÂCHES:
        │       ├── "Configurer le tenant Azure"
        │       ├── "Déployer sur 20 utilisateurs test"
        │       └── "Valider le fonctionnement"
        │
        └── SOUS-ACTION: SA-003 "Support post-déploiement" [MCO]
            ├── charge_estimee: 3j
            └── TÂCHES:
                ├── "Former le support N1"
                └── "Rédiger la FAQ utilisateurs"
```

### 5.2 Cas des tâches non classifiées

<!-- TODO: Définir le workflow pour classifier les tâches existantes -->

Les tâches créées avant l'implémentation du modèle n'ont pas de mission/sous-action.
Elles apparaissent dans la vue "Tâches non classifiées" de `missions.html`.

Options :
1. Les laisser non classifiées (si terminées)
2. Les rattacher à une mission existante
3. Créer une mission "Legacy" ou "Divers"

---

## 6. Questions ouvertes

<!-- À discuter et valider -->

| # | Question | Options | Décision |
|---|----------|---------|----------|
| Q1 | Le rattachement à une mission doit-il devenir obligatoire ? | Oui / Non / Période de transition | - |
| Q2 | Faut-il migrer les tâches existantes (~200) ? | Oui toutes / Seulement actives / Non | - |
| Q3 | Le champ `projet` existant est-il remplacé par `mission_code` ? | Oui / Non / Cohabitation | - |
| Q4 | Une tâche peut-elle appartenir à plusieurs sous-actions ? | Oui / Non | Non (actuellement) |
| Q5 | Qui peut créer des missions ? | Tous / Chef de bureau / Admin | - |
| Q6 | Faut-il un workflow de validation des missions ? | Oui / Non | - |
| Q7 | Comment gérer les tâches "imprévisibles" (incidents) ? | Mission dédiée / Sans mission / Autre | - |

---

## 7. Évolutions futures

<!-- TODO: Prioriser et planifier -->

- [ ] Dashboard de pilotage par mission
- [ ] Vue Gantt des missions
- [ ] Calcul automatique de l'avancement (% tâches terminées)
- [ ] Alertes sur les missions en retard
- [ ] Export des missions (PDF, Excel)
- [ ] Rattachement en masse des tâches existantes
- [ ] Historique des modifications de mission

---

## 8. Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2026-01-18 | 0.1 | Création initiale du document |

---

*Document à compléter et valider avec l'équipe SSIR.*
