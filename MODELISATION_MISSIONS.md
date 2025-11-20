# 🎯 MODÉLISATION : SYSTÈME DE MISSIONS ET SOUS-ACTIONS

**Date:** 18 Novembre 2025
**Version:** 1.0
**Environnement cible:** kanbantest

---

## 📋 CONTEXTE ET OBJECTIFS

### Problématiques actuelles
- ❌ Multiplication de tâches éparses → kanban illisible
- ❌ Duplication de tâches avec dénominations différentes
- ❌ Manque de structure hiérarchique claire
- ❌ Difficulté à identifier le type d'activité

### Objectifs visés
- ✅ Structurer hiérarchiquement : Stratégie → Mission → Sous-action → Tâche
- ✅ Catégoriser clairement les activités (MCO, Projets, Imprévisible)
- ✅ Classification a priori (page dédiée, pas dans le kanban)
- ✅ Éviter la duplication et améliorer la lisibilité
- ✅ Faciliter le pilotage et le reporting

---

## 🏗️ MODÈLE DE DONNÉES

### 1. Hiérarchie complète

```
Stratégie (existant)
    ↓
Mission (nouveau)
    ↓
Sous-action (nouveau)
    ↓
Tâche (existant - Kanban)
```

### 2. Entités et attributs

#### 📊 **Stratégie** (existant dans Grist)
Reste inchangé, déjà géré par la table `Ssir_strategie2`

---

#### 🎯 **Mission** (nouvelle entité)
Concrétisation opérationnelle d'une stratégie

**Attributs:**
- `id` : Identifiant unique
- `code_mission` : Code court (ex: "MIS-2025-001")
- `nom` : Nom de la mission
- `description` : Description détaillée
- `strategie_id` : Lien vers la stratégie parente (optionnel)
- `responsable` : Responsable de la mission
- `bureau` : Bureau porteur
- `date_debut` : Date de début
- `date_fin` : Date de fin prévisionnelle
- `statut` : [Planifié, En cours, Suspendu, Terminé, Abandonné]
- `priorite` : [Critique, Haute, Moyenne, Basse]
- `tags` : Tags libres pour classification
- `notes` : Notes diverses
- `date_creation` : Date de création
- `date_modification` : Date de dernière modification

**Exemples:**
- "Migration infrastructure cloud"
- "Déploiement solution SSO"
- "Audit de sécurité 2025"

---

#### 🔧 **Sous-action** (nouvelle entité)
Composante d'une mission, catégorisée par type

**Attributs:**
- `id` : Identifiant unique
- `mission_id` : Lien vers la mission parente
- `code_sous_action` : Code court (ex: "SA-001")
- `nom` : Nom de la sous-action
- `description` : Description
- `categorie` : **[MCO, Projet, Imprévisible]** ⭐ CLEF
- `responsable` : Responsable de la sous-action
- `charge_estimee` : Charge estimée (jours/homme)
- `charge_realisee` : Charge réalisée
- `statut` : [À faire, En cours, Bloqué, Terminé]
- `priorite` : [Critique, Haute, Moyenne, Basse]
- `date_debut` : Date de début
- `date_fin` : Date de fin
- `notes` : Notes
- `date_creation` : Date de création
- `date_modification` : Date de dernière modification

**Catégories détaillées:**

1. **MCO (Maintien en Condition Opérationnelle)**
   - Activités récurrentes de maintenance
   - Support utilisateurs
   - Surveillance et monitoring
   - Correctifs et mises à jour mineures
   - Exemples : "Support niveau 2", "Maintenance serveurs", "Veille sécurité"

2. **Projet**
   - Initiatives à durée déterminée
   - Livrable identifié
   - Planning structuré
   - Exemples : "Migration AD", "Déploiement EDR", "Mise en conformité RGPD"

3. **Imprévisible**
   - Incidents majeurs
   - Demandes urgentes non planifiées
   - Crises à gérer
   - Exemples : "Incident sécurité critique", "Demande direction urgente"

---

#### ✅ **Tâche** (entité existante - enrichie)
Les tâches du Kanban, maintenant rattachées à des sous-actions

**Attributs enrichis:**
- `sous_action_id` : **NOUVEAU** - Lien vers la sous-action parente
- `mission_id` : **NOUVEAU** - Lien direct vers la mission (dénormalisé pour faciliter les requêtes)
- `categorie` : **NOUVEAU** - Catégorie héritée de la sous-action [MCO, Projet, Imprévisible]
- ... (tous les attributs existants)

---

## 📊 STRUCTURE GRIST PROPOSÉE

### Nouvelles tables à créer

#### Table: `Missions`
| Colonne | Type | Description |
|---------|------|-------------|
| id | Numérique auto | Identifiant unique |
| code_mission | Texte | Code court (MIS-2025-XXX) |
| nom | Texte | Nom de la mission |
| description | Texte long | Description détaillée |
| strategie_id | Référence | Lien vers Ssir_strategie2 |
| responsable | Texte | Responsable |
| bureau | Choix | Bureau porteur |
| date_debut | Date | Date de début |
| date_fin | Date | Date de fin |
| statut | Choix | Planifié/En cours/Terminé/etc. |
| priorite | Choix | Critique/Haute/Moyenne/Basse |
| tags | Liste de choix | Tags multiples |
| notes | Texte long | Notes |
| created_at | Date/Heure | Auto |
| updated_at | Date/Heure | Auto |

#### Table: `Sous_actions`
| Colonne | Type | Description |
|---------|------|-------------|
| id | Numérique auto | Identifiant unique |
| mission_id | Référence | Lien vers Missions |
| code_sous_action | Texte | Code court (SA-XXX) |
| nom | Texte | Nom de la sous-action |
| description | Texte long | Description |
| **categorie** | **Choix** | **MCO/Projet/Imprévisible** ⭐ |
| responsable | Texte | Responsable |
| charge_estimee | Numérique | Jours/homme estimés |
| charge_realisee | Numérique | Jours/homme réalisés |
| statut | Choix | À faire/En cours/Terminé |
| priorite | Choix | Critique/Haute/Moyenne/Basse |
| date_debut | Date | Date de début |
| date_fin | Date | Date de fin |
| notes | Texte long | Notes |
| created_at | Date/Heure | Auto |
| updated_at | Date/Heure | Auto |

#### Table existante: `Ssir_taches2` (à enrichir)
**Nouvelles colonnes à ajouter:**
| Colonne | Type | Description |
|---------|------|-------------|
| sous_action_id | Référence | Lien vers Sous_actions |
| mission_id | Référence | Lien vers Missions (dénormalisé) |
| categorie | Formule | Héritée de sous_action.categorie |

---

## 🎨 INTERFACE UTILISATEUR

### 1. Nouvelle page : "Gestion des Missions" (`missions.html`)

**Menu principal:**
```
┌─────────────────────────────────────────────────┐
│  Tableau Kanban  |  [Missions]  |  Stats  |...  │
└─────────────────────────────────────────────────┘
```

**Vue d'ensemble des missions:**
```
┌────────────────────────────────────────────────────────────┐
│  🎯 GESTION DES MISSIONS                                    │
│                                                             │
│  [+ Nouvelle Mission]  [📊 Vue par catégorie]  [🔍 Filtre] │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Mission: Migration Infrastructure Cloud              │  │
│  │ Code: MIS-2025-001  |  Statut: En cours              │  │
│  │ Responsable: Jean Dupont  |  Bureau: Infrastructure  │  │
│  │ Priorité: Haute  |  Échéance: 30/12/2025             │  │
│  │                                                       │  │
│  │ Sous-actions (3):                                    │  │
│  │   ├─ [PROJET] Audit infrastructure actuelle ✅       │  │
│  │   ├─ [PROJET] Migration serveurs critiques 🔄       │  │
│  │   └─ [MCO] Support post-migration ⏸️                │  │
│  │                                                       │  │
│  │ Tâches liées: 12  |  Complétées: 5  |  En cours: 7  │  │
│  │                                                       │  │
│  │ [📝 Modifier]  [🗑️ Supprimer]  [📋 Voir tâches]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Mission: Support utilisateurs Q4 2025                │  │
│  │ ...                                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 2. Formulaire de création/édition de Mission

**Modal "Nouvelle Mission":**
```
┌─────────────────────────────────────────────────┐
│  🎯 Nouvelle Mission                      [×]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Code Mission *                                 │
│  [MIS-2025-___]                                │
│                                                 │
│  Nom de la mission *                           │
│  [_________________________________]            │
│                                                 │
│  Description                                    │
│  [_________________________________]            │
│  [_________________________________]            │
│                                                 │
│  Stratégie parente (optionnel)                 │
│  [▼ Sélectionner une stratégie...]            │
│                                                 │
│  Responsable        Bureau                     │
│  [____________]     [▼ Infrastructure]         │
│                                                 │
│  Priorité           Statut                     │
│  [▼ Haute]         [▼ Planifié]               │
│                                                 │
│  Date début        Date fin                    │
│  [📅 01/12/2025]   [📅 31/12/2025]            │
│                                                 │
│  Tags                                          │
│  [cloud] [migration] [critique] [+ Ajouter]   │
│                                                 │
├─────────────────────────────────────────────────┤
│              [Annuler]  [💾 Enregistrer]       │
└─────────────────────────────────────────────────┘
```

### 3. Formulaire de création de Sous-action

**Modal "Nouvelle Sous-action":**
```
┌─────────────────────────────────────────────────┐
│  🔧 Nouvelle Sous-action                  [×]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Mission parente *                             │
│  📋 Migration Infrastructure Cloud              │
│                                                 │
│  Catégorie * ⭐                                │
│  ○ MCO (Maintenance)                           │
│  ● Projet (Initiative structurée)              │
│  ○ Imprévisible (Incident/Urgence)            │
│                                                 │
│  Code                                          │
│  [SA-___]                                      │
│                                                 │
│  Nom de la sous-action *                       │
│  [_________________________________]            │
│                                                 │
│  Description                                    │
│  [_________________________________]            │
│                                                 │
│  Responsable                                   │
│  [____________]                                │
│                                                 │
│  Charge estimée (j/h)  Priorité               │
│  [___]                [▼ Haute]               │
│                                                 │
│  Date début        Date fin                    │
│  [📅 ../../....]   [📅 ../../....]            │
│                                                 │
├─────────────────────────────────────────────────┤
│              [Annuler]  [💾 Enregistrer]       │
└─────────────────────────────────────────────────┘
```

### 4. Enrichissement du Kanban existant

**Carte de tâche enrichie:**
```
┌─────────────────────────────────────┐
│ TÂCHE-123 | [PROJET] 🔵            │ ← Badge catégorie
│                                     │
│ Configurer firewall Azure           │
│                                     │
│ 🎯 Mission: Migration Infra Cloud  │ ← Nouveau
│ 🔧 Audit infrastructure actuelle    │ ← Nouveau (sous-action)
│                                     │
│ 👤 Jean D.  |  🏢 Infrastructure   │
│ ⏰ 25/11/2025  |  🚨 Haute          │
└─────────────────────────────────────┘
```

**Filtres enrichis:**
```
┌──────────────────────────────────────────────────┐
│ 🔍 [Recherche...]  [🔄 Effacer]                 │
│                                                  │
│ Bureau: [▼ Tous]  Responsable: [▼ Tous]        │
│ Mission: [▼ Toutes]  ← NOUVEAU                  │
│ Catégorie: [▼ Toutes] ← NOUVEAU                │
│   ☐ MCO  ☐ Projet  ☐ Imprévisible             │
└──────────────────────────────────────────────────┘
```

### 5. Vue d'ensemble par catégorie

**Dashboard catégories:**
```
┌─────────────────────────────────────────────────┐
│  📊 RÉPARTITION PAR CATÉGORIE                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔧 MCO (Maintenance)          45% █████████   │
│     12 missions  |  34 tâches en cours         │
│                                                 │
│  🎯 PROJET                     40% ████████    │
│     8 missions   |  28 tâches en cours         │
│                                                 │
│  ⚡ IMPRÉVISIBLE               15% ███         │
│     3 incidents  |  10 tâches en cours         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎯 PROPOSITIONS D'AMÉLIORATIONS

### 1. **Auto-complétion et suggestions**
- Lors de la création d'une tâche, suggérer les missions/sous-actions existantes
- Détecter les doublons potentiels par similarité de nom
- Alerter si une tâche similaire existe déjà

### 2. **Templates de missions**
Créer des modèles pré-configurés :
- Template "Incident sécurité" (catégorie Imprévisible)
- Template "Maintenance trimestrielle" (catégorie MCO)
- Template "Projet infrastructure" (catégorie Projet)

### 3. **Workflow de validation**
- Les tâches "orphelines" (sans sous-action) doivent être classifiées
- Processus de revue périodique des tâches non rattachées
- Notification aux responsables

### 4. **Codes automatiques**
- Auto-génération des codes missions : `MIS-YYYY-NNN`
- Auto-génération des codes sous-actions : `SA-MIS001-NNN`
- Préfixes configurables par bureau

### 5. **Vue hiérarchique dans le Kanban**
Options d'affichage :
- Vue "aplatie" (actuelle) : toutes les tâches
- Vue "groupée par mission" : tâches regroupées sous leur mission
- Vue "par catégorie" : colonnes MCO / Projet / Imprévisible

### 6. **Indicateurs de pilotage**
Sur la page Missions :
- % d'avancement par mission
- Charge consommée vs estimée
- Répartition MCO/Projet/Imprévisible
- Missions en retard
- Tâches orphelines à classifier

### 7. **Import/Export**
- Export Excel des missions avec leurs sous-actions
- Import en masse de missions depuis template
- Export pour reporting direction

### 8. **Historique et traçabilité**
- Historique des changements de rattachement
- Qui a rattaché quelle tâche à quelle mission/sous-action
- Audit trail complet

### 9. **Règles de gestion**
- Tâche obligatoirement rattachée à une sous-action (configurable)
- Sous-action obligatoirement rattachée à une mission (configurable)
- Mission peut être orpheline (pas de stratégie parente)
- Mode "souple" pour période de transition

### 10. **Migration progressive**
- Phase 1 : Créer les missions/sous-actions (optionnel)
- Phase 2 : Rattacher les nouvelles tâches
- Phase 3 : Classifier progressivement l'existant
- Phase 4 : Rendre obligatoire

---

## 📋 RÈGLES DE GESTION DÉTAILLÉES

### Hiérarchie et rattachements

1. **Stratégie → Mission** (0..n)
   - Une stratégie peut avoir 0 à N missions
   - Une mission peut avoir 0 ou 1 stratégie parente

2. **Mission → Sous-action** (1..n)
   - Une mission doit avoir au moins 1 sous-action
   - Une sous-action appartient à 1 seule mission

3. **Sous-action → Tâche** (0..n)
   - Une sous-action peut avoir 0 à N tâches
   - Une tâche appartient à 1 seule sous-action

### Catégorisation

- La catégorie (MCO/Projet/Imprévisible) est définie au niveau **Sous-action**
- Les tâches héritent automatiquement de la catégorie de leur sous-action
- Une mission peut avoir des sous-actions de catégories différentes

### Statuts et workflow

**Mission:**
- Planifié → En cours → (Suspendu) → Terminé / Abandonné

**Sous-action:**
- À faire → En cours → (Bloqué) → Terminé

**Tâche:** (statuts existants inchangés)
- Backlog → À faire → En cours → En attente → Bloqué → Validation → Terminé

### Calculs automatiques

**Mission:**
- % avancement = (nb tâches terminées / nb tâches totales) × 100
- Charge réalisée = Σ charges des sous-actions

**Sous-action:**
- % avancement = (nb tâches terminées / nb tâches liées) × 100
- Charge réalisée = temps passé sur toutes les tâches liées

---

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1 : Préparation (1 jour)
- [x] Modélisation complète ✅ (ce document)
- [ ] Validation du modèle avec l'utilisateur
- [ ] Ajustements selon retours

### Phase 2 : Structure Grist (1 jour)
- [ ] Créer table `Missions`
- [ ] Créer table `Sous_actions`
- [ ] Ajouter colonnes dans `Ssir_taches2`
- [ ] Créer vues et formules Grist
- [ ] Peupler avec données de test

### Phase 3 : Interface Missions (2-3 jours)
- [ ] Créer `missions.html`
- [ ] Développer `js/missions-app.js`
- [ ] Créer `MissionsManager.js`
- [ ] Créer `SousActionsManager.js`
- [ ] Formulaires de création/édition
- [ ] Interface de gestion

### Phase 4 : Enrichissement Kanban (1-2 jours)
- [ ] Enrichir modal de tâche (sélecteur mission/sous-action)
- [ ] Ajouter filtres par mission/catégorie
- [ ] Enrichir affichage des cartes
- [ ] Badges de catégorie
- [ ] Auto-suggestions

### Phase 5 : Vues et reporting (1 jour)
- [ ] Dashboard par catégorie
- [ ] Indicateurs de pilotage
- [ ] Vue hiérarchique
- [ ] Export/Import

### Phase 6 : Migration et déploiement (1 jour)
- [ ] Script de migration des données existantes
- [ ] Tests complets
- [ ] Documentation utilisateur
- [ ] Déploiement sur kanbantest
- [ ] Formation/Communication

### Phase 7 : Validation et ajustements (flexible)
- [ ] Période de test utilisateur
- [ ] Collecte feedback
- [ ] Ajustements
- [ ] Déploiement en préproduction puis production

**Durée totale estimée : 7-10 jours**

---

## 🔍 QUESTIONS OUVERTES

1. **Nomenclature des codes**
   - Format préféré pour codes missions ? (MIS-YYYY-NNN, autre ?)
   - Auto-génération ou saisie manuelle ?

2. **Obligation de rattachement**
   - Rendre obligatoire immédiatement ou période de transition ?
   - Autoriser les tâches "orphelines" temporairement ?

3. **Granularité**
   - Niveau de détail souhaité pour les sous-actions ?
   - Faut-il un niveau supplémentaire entre sous-action et tâche ?

4. **Gestion des existants**
   - Comment traiter les ~200 tâches existantes ?
   - Migration automatique ou manuelle ?

5. **Droits d'accès**
   - Qui peut créer des missions ?
   - Workflow de validation nécessaire ?

6. **Indicateurs prioritaires**
   - Quels KPIs sont les plus importants ?
   - Fréquence de reporting souhaitée ?

---

## 📝 NEXT STEPS

1. **Validation de ce document**
   - Relire et valider le modèle
   - Répondre aux questions ouvertes
   - Ajuster selon besoins

2. **Maquettage détaillé** (si besoin)
   - Créer maquettes HTML statiques
   - Valider l'ergonomie

3. **Démarrage développement**
   - Commencer par la structure Grist
   - Puis interface missions
   - Puis enrichissement Kanban

---

**Document préparé par:** Claude
**Pour révision par:** Utilisateur
**Version:** 1.0 - Proposition initiale
