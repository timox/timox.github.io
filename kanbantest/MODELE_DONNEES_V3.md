# Modèle de Données V3 - Kanban SSIR

## 1. Vue d'ensemble

Le modèle V3 structure les tâches selon **3 axes de classification orthogonaux** permettant une analyse multidimensionnelle via la timeline.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NIVEAU STRATÉGIQUE                               │
│  Objectif → Sous-Objectif → Axe Stratégique                         │
│  (Table: Ssir_strategie2)                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ strategie_id
┌─────────────────────────────────────────────────────────────────────┐
│                    NIVEAU OPÉRATIONNEL                              │
│  Tâche (Table: Ssir_principale_task)                                │
│                                                                     │
│  Classification selon 3 axes:                                       │
│    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│    │ nature_activite │  │  genre_action   │  │   etape_code    │   │
│    │   (POURQUOI)    │  │   (COMMENT)     │  │ (OÙ dans cycle) │   │
│    └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Taxonomies

### 2.1 Nature d'Activité (`nature_activite`)

**Question** : *Pourquoi fait-on cette tâche ?*

| Code | Libellé | Description | Prévisibilité par défaut |
|------|---------|-------------|--------------------------|
| `INC` | Incident | Résolution d'un dysfonctionnement imprévu | Imprévisible |
| `SUP` | Support | Assistance aux utilisateurs | Imprévisible |
| `MCO` | MCO | Maintien en condition opérationnelle | Variable |
| `PRJ` | Projet | Travail planifié créant de la valeur | Prévisible |
| `OVH` | Overhead | Gestion, coordination, reporting | Prévisible |

**Alignement ITIL 4** : Cette taxonomie s'aligne avec les pratiques ITIL de gestion des services :
- `INC` → Gestion des incidents (ITIL.SM.INC)
- `SUP` → Centre de services (ITIL.SM.SD)
- `MCO` → Gestion des actifs IT (ITIL.SM.ITAM)
- `PRJ` → Gestion de projet (ITIL.GP.PM)

---

### 2.2 Genre d'Action (`genre_action`)

**Question** : *Quel type d'action réalise-t-on ?*

| Code | Libellé | Description | Famille |
|------|---------|-------------|---------|
| `DOC` | Documentation | Rédaction, mise à jour documentaire | Production |
| `ANA` | Analyse | Étude, investigation, diagnostic | Production |
| `CON` | Conception | Design, architecture | Production |
| `RCH` | Recherche | POC, exploration, benchmark | Production |
| `DEV` | Développement | Codage, scripting, configuration avancée | Production |
| `TST` | Test | Tests techniques, non-régression | Qualité |
| `VAL` | Validation | Recette fonctionnelle, UAT | Qualité |
| `VER` | Vérification | Audit, contrôle de conformité | Qualité |
| `COR` | Correction | Fix, résolution de bug, patch | Qualité |
| `INS` | Installation | Déploiement, mise en production | Opérationnel |
| `CFG` | Configuration | Paramétrage, tuning | Opérationnel |
| `INV` | Inventaire | Recensement, cartographie | Opérationnel |
| `SEC` | Sécurisation | Durcissement, remédiation | Opérationnel |
| `REU` | Réunion | Point, comité, atelier | Collaboration |
| `FOR` | Formation | Montée en compétence, transfert | Collaboration |
| `SUI` | Suivi | Pilotage, reporting, dashboard | Pilotage |
| `VEI` | Veille | Surveillance, monitoring, alerting | Pilotage |

**Alignement COBIT 2019** : Les familles correspondent aux domaines COBIT :
- Production → BAI (Bâtir, Acquérir, Implémenter)
- Qualité → MEA (Mesurer, Évaluer, Apprécier)
- Opérationnel → DSS (Délivrer, Servir, Supporter)
- Pilotage → EDM (Évaluer, Diriger, Surveiller)

---

### 2.3 Étape du Cycle (`etape_code`)

**Question** : *Où en est-on dans le cycle de transformation ?*

| Code | Libellé | Description | Alignement TOGAF ADM |
|------|---------|-------------|---------------------|
| `ETP.VIS` | Vision | Définition des objectifs et du périmètre | Phase A |
| `ETP.ANA` | Analyse | État des lieux, diagnostic, cartographie | Phase B-C-D (référence) |
| `ETP.CON` | Conception | Design de la solution cible | Phase B-C-D (cible) |
| `ETP.PLN` | Planification | Feuille de route, planning, estimation | Phase E-F |
| `ETP.REA` | Réalisation | Développement, construction, intégration | Phase G (build) |
| `ETP.DEP` | Déploiement | Mise en production, migration | Phase G (deploy) |
| `ETP.EXP` | Exploitation | Run, maintenance, support niveau 2-3 | Phase H (run) |
| `ETP.AME` | Amélioration | Optimisation continue, retex | Phase H (improve) |

**Alignement TOGAF ADM** : Le cycle ADM (Architecture Development Method) définit les phases de transformation d'entreprise. Notre modèle simplifie les 10 phases TOGAF en 8 étapes opérationnelles.

**Alignement NIST CSF 2.0** : Les étapes couvrent les fonctions du framework :
- `ETP.VIS` → GV (Gouverner)
- `ETP.ANA` → ID (Identifier)
- `ETP.CON/REA/DEP` → PR (Protéger)
- `ETP.EXP` → DE (Détecter) + RS (Répondre)
- `ETP.AME` → RC (Récupérer) + ID.IM (Amélioration)

---

## 3. Règles de Calcul

### 3.1 Prévisibilité (attribut dérivé)

La prévisibilité est **calculée par défaut** selon la nature d'activité, mais peut être **surchargée manuellement**.

```javascript
function calculerPrevisibilite(nature_activite, previsibilite_manuelle) {
  if (previsibilite_manuelle) return previsibilite_manuelle;

  const defaults = {
    'INC': 'Imprévisible',
    'SUP': 'Imprévisible',
    'MCO': null,            // Doit être spécifié
    'PRJ': 'Prévisible',
    'OVH': 'Prévisible'
  };

  return defaults[nature_activite];
}
```

### 3.2 Famille d'Action (attribut dérivé)

```javascript
const FAMILLE_ACTION = {
  'DOC': 'production', 'ANA': 'production', 'CON': 'production',
  'RCH': 'production', 'DEV': 'production',
  'TST': 'qualite', 'VAL': 'qualite', 'VER': 'qualite', 'COR': 'qualite',
  'INS': 'operationnel', 'CFG': 'operationnel', 'INV': 'operationnel', 'SEC': 'operationnel',
  'REU': 'collaboration', 'FOR': 'collaboration',
  'SUI': 'pilotage', 'VEI': 'pilotage'
};
```

---

## 4. Cas d'Usage

### 4.1 Projet de déploiement MFA

**Contexte** : Mise en place de l'authentification multi-facteurs pour sécuriser les accès VPN.

**Stratégie associée** :
- Objectif : Sécuriser les systèmes d'information
- Sous-objectif : Renforcer la sécurité des accès
- Axe stratégique : Mettre en place une solution MFA

**Tâches et leur classification** :

| Tâche | nature | genre | étape | Justification |
|-------|--------|-------|-------|---------------|
| Benchmark solutions MFA du marché | PRJ | RCH | ETP.ANA | Projet, recherche en phase d'analyse |
| Rédiger l'architecture cible | PRJ | CON | ETP.CON | Projet, conception en phase conception |
| Planifier le déploiement | PRJ | DOC | ETP.PLN | Projet, documentation en phase planning |
| Configurer le serveur MFA | PRJ | CFG | ETP.REA | Projet, configuration en réalisation |
| Déployer sur le VPN | PRJ | INS | ETP.DEP | Projet, installation en déploiement |
| Former les utilisateurs | PRJ | FOR | ETP.DEP | Projet, formation au déploiement |
| Rédiger la documentation | PRJ | DOC | ETP.DEP | Projet, documentation au déploiement |
| Incident utilisateur bloqué | INC | COR | ETP.EXP | Incident, correction en exploitation |

**Alignement ISO 27001:2022** : Ce projet contribue à la mesure A.8.5 "Authentification sécurisée".

---

### 4.2 Gestion d'un incident de sécurité

**Contexte** : Détection d'une tentative d'intrusion sur le pare-feu.

| Tâche | nature | genre | étape | Justification |
|-------|--------|-------|-------|---------------|
| Analyser les logs du pare-feu | INC | ANA | ETP.EXP | Incident, analyse en exploitation |
| Bloquer l'IP source | INC | SEC | ETP.EXP | Incident, sécurisation en exploitation |
| Documenter l'incident | INC | DOC | ETP.EXP | Incident, documentation en exploitation |
| Réunion de crise | INC | REU | ETP.EXP | Incident, réunion en exploitation |
| Renforcer les règles firewall | MCO | CFG | ETP.AME | MCO, configuration en amélioration |

**Alignement NIST CSF 2.0** :
- Analyse → DE.AE (Analyse des événements)
- Blocage → RS.MI (Atténuation des incidents)
- Documentation → RS.AN (Analyse des incidents)
- Renforcement → ID.IM (Amélioration)

---

### 4.3 Maintenance planifiée (MCO)

**Contexte** : Mise à jour trimestrielle des serveurs Windows.

| Tâche | nature | genre | étape | prévisibilité |
|-------|--------|-------|-------|---------------|
| Inventorier les serveurs à patcher | MCO | INV | ETP.ANA | Prévisible |
| Planifier les créneaux de maintenance | MCO | DOC | ETP.PLN | Prévisible |
| Tester les patchs en préprod | MCO | TST | ETP.REA | Prévisible |
| Appliquer les patchs en production | MCO | INS | ETP.DEP | Prévisible |
| Vérifier le bon fonctionnement | MCO | VER | ETP.EXP | Prévisible |

**Note** : Toutes ces tâches MCO sont **prévisibles** car planifiées. La prévisibilité est surchargée manuellement.

---

### 4.4 Support utilisateur

**Contexte** : Demandes quotidiennes au helpdesk.

| Tâche | nature | genre | étape |
|-------|--------|-------|-------|
| Réinitialiser mot de passe | SUP | CFG | ETP.EXP |
| Installer logiciel demandé | SUP | INS | ETP.EXP |
| Former utilisateur sur outil | SUP | FOR | ETP.EXP |
| Diagnostiquer lenteur poste | SUP | ANA | ETP.EXP |

**Alignement ITIL 4** : Ces tâches correspondent à la pratique "Centre de services" (ITIL.SM.SD).

---

## 5. Matrice de Compatibilité

### 5.1 Nature × Genre (combinaisons courantes)

|  | DOC | ANA | CON | RCH | DEV | TST | VAL | VER | COR | INS | CFG | INV | SEC | REU | FOR | SUI | VEI |
|--|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| **INC** | ◐ | ● | ○ | ○ | ○ | ○ | ○ | ◐ | ● | ○ | ◐ | ○ | ● | ◐ | ○ | ◐ | ○ |
| **SUP** | ◐ | ● | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ● | ● | ○ | ○ | ○ | ● | ○ | ○ |
| **MCO** | ◐ | ◐ | ○ | ○ | ◐ | ● | ◐ | ● | ◐ | ● | ● | ● | ● | ◐ | ◐ | ● | ● |
| **PRJ** | ● | ● | ● | ● | ● | ● | ● | ● | ◐ | ● | ● | ◐ | ● | ● | ● | ● | ◐ |
| **OVH** | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ◐ | ● | ○ |

Légende : ● Fréquent | ◐ Occasionnel | ○ Rare

### 5.2 Nature × Étape (combinaisons courantes)

|  | VIS | ANA | CON | PLN | REA | DEP | EXP | AME |
|--|-----|-----|-----|-----|-----|-----|-----|-----|
| **INC** | ○ | ◐ | ○ | ○ | ○ | ○ | ● | ◐ |
| **SUP** | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| **MCO** | ○ | ● | ○ | ● | ◐ | ● | ● | ● |
| **PRJ** | ● | ● | ● | ● | ● | ● | ◐ | ◐ |
| **OVH** | ◐ | ○ | ○ | ◐ | ○ | ○ | ● | ○ |

---

## 6. Migration depuis le Modèle V2

### 6.1 Mapping des champs

| Champ V2 | Champ V3 | Règle de migration |
|----------|----------|-------------------|
| `type_tache` (Incident, Support, MCO, Projet, Overhead) | `nature_activite` | Mapping direct : Incident→INC, Support→SUP, MCO→MCO, Projet→PRJ, Overhead→OVH |
| `previsibilite` | `previsibilite` | Conserver si défini, sinon calculer |
| - | `genre_action` | À définir manuellement ou par défaut ANA |
| - | `etape_code` | Par défaut ETP.EXP pour existants |

### 6.2 Script de migration

```javascript
function migrateTask(oldTask) {
  const natureMapping = {
    'Incident': 'INC', 'Support': 'SUP', 'MCO': 'MCO',
    'Projet': 'PRJ', 'Overhead': 'OVH'
  };

  return {
    ...oldTask,
    nature_activite: natureMapping[oldTask.type_tache] || 'PRJ',
    genre_action: oldTask.genre_action || 'ANA',
    etape_code: oldTask.etape_code || 'ETP.EXP'
  };
}
```

---

## 7. Références aux Standards

### 7.1 Standards utilisés pour la conception

| Standard | Version | Usage dans le modèle |
|----------|---------|---------------------|
| **ITIL 4** | 2019 | Inspiration pour `nature_activite` et pratiques de gestion des services |
| **COBIT 2019** | 2019 | Structure des domaines pour `famille_action` |
| **TOGAF ADM** | 10 | Inspiration pour `etape_code` (cycle de transformation) |
| **NIST CSF** | 2.0 | Fonctions de cybersécurité alignées avec les étapes |
| **ISO 27001** | 2022 | Mesures de sécurité pour validation des cas d'usage |
| **PMBOK** | 7 | Principes de gestion de projet pour les tâches PRJ |
| **SAFe** | 6.0 | Structure portfolio/programme pour la vue stratégique |

### 7.2 Fichiers de référence

Les taxonomies officielles complètes sont disponibles dans `/kanbantest/taxonomie/` :
- `itil4_taxonomie_fr.csv`
- `cobit2019_taxonomie_fr.csv`
- `togaf_adm_taxonomie_fr.csv`
- `nist_csf2_taxonomie_fr.csv`
- `iso27001_2022_taxonomie_fr.csv`
- `pmbok7_taxonomie_fr.csv`
- `safe6_taxonomie_fr.csv`

---

*Document créé le 2025-01-21 - Version 3.0*
