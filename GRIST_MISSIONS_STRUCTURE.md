# 📊 STRUCTURE GRIST - SYSTÈME MISSIONS (DÉNORMALISÉ)

**Date:** 18 Novembre 2025
**Approche:** Table unique enrichie (dénormalisée)

---

## 🎯 APPROCHE RETENUE

Au lieu de créer plusieurs tables (Missions, Sous_actions, Tâches), on enrichit la table **`Ssir_taches2`** existante avec des colonnes supplémentaires pour stocker les informations de mission et sous-action de manière **dénormalisée**.

### Avantages
✅ Une seule table → Plus simple pour Grist
✅ Pas de jointures complexes
✅ Compatible avec l'existant
✅ Facile à filtrer et rechercher
✅ Pas de migration complexe

### Principe
- Les informations de **mission** et **sous-action** sont stockées directement dans chaque tâche
- La page "Gestion des Missions" agrège les données par mission/sous-action
- Pas de duplication côté utilisateur (l'interface gère l'auto-complétion)

---

## 📋 COLONNES À AJOUTER À `Ssir_taches2`

### Groupe: MISSION (7 colonnes)

| Colonne | Type Grist | Description | Valeurs |
|---------|-----------|-------------|---------|
| **mission_code** | Texte | Code unique de la mission | Ex: "MIS-2025-001" |
| **mission_nom** | Texte | Nom de la mission | Ex: "Migration cloud Azure" |
| **mission_responsable** | Texte | Responsable de la mission | Ex: "Jean Dupont" |
| **mission_bureau** | Choix | Bureau porteur de la mission | Infrastructure, Sécurité, Support, etc. |
| **mission_priorite** | Choix | Priorité de la mission | Critique, Haute, Moyenne, Basse |
| **mission_date_debut** | Date | Date de début de la mission | Date |
| **mission_date_fin** | Date | Date de fin de la mission | Date |

### Groupe: SOUS-ACTION (5 colonnes)

| Colonne | Type Grist | Description | Valeurs |
|---------|-----------|-------------|---------|
| **sous_action_code** | Texte | Code de la sous-action | Ex: "SA-001" |
| **sous_action_nom** | Texte | Nom de la sous-action | Ex: "Audit infrastructure" |
| **categorie** | **Choix** | **Type d'activité** ⭐ | **MCO, Projet, Imprévisible** |
| **sous_action_charge_estimee** | Numérique | Charge estimée (jours) | Ex: 5 |
| **sous_action_charge_reelle** | Numérique | Charge réelle (jours) | Ex: 7.5 |

### Groupe: CLASSIFICATION (1 colonne supplémentaire)

| Colonne | Type Grist | Description | Valeurs |
|---------|-----------|-------------|---------|
| **est_classifiee** | Bascule | Tâche classifiée ? | true/false |

---

## 🔧 STRUCTURE COMPLÈTE DES COLONNES

```
Ssir_taches2 (table existante enrichie)
├─ [COLONNES EXISTANTES]
│  ├─ id (Numérique auto)
│  ├─ titre (Texte)
│  ├─ description (Texte)
│  ├─ statut (Choix)
│  ├─ qui (Texte)
│  ├─ bureau (Choix)
│  ├─ projet (Texte)
│  ├─ priorite (Choix)
│  ├─ urgence (Choix)
│  ├─ impact (Choix)
│  ├─ date_butoir (Date)
│  ├─ strategie_id (Référence → Ssir_strategie2)
│  ├─ ... (autres colonnes existantes)
│
├─ [NOUVELLES COLONNES - MISSION]
│  ├─ mission_code (Texte)
│  ├─ mission_nom (Texte)
│  ├─ mission_responsable (Texte)
│  ├─ mission_bureau (Choix)
│  ├─ mission_priorite (Choix)
│  ├─ mission_date_debut (Date)
│  ├─ mission_date_fin (Date)
│
├─ [NOUVELLES COLONNES - SOUS-ACTION]
│  ├─ sous_action_code (Texte)
│  ├─ sous_action_nom (Texte)
│  ├─ categorie (Choix) ⭐ MCO/Projet/Imprévisible
│  ├─ sous_action_charge_estimee (Numérique)
│  ├─ sous_action_charge_reelle (Numérique)
│
└─ [NOUVELLES COLONNES - META]
   └─ est_classifiee (Bascule)
```

**Total nouvelles colonnes: 13**

---

## 📝 CONFIGURATION GRIST DÉTAILLÉE

### Choix à configurer

#### `mission_bureau` (Choix)
Valeurs identiques à la colonne `bureau` existante :
- Infrastructure
- Sécurité
- Support
- Développement
- (autres bureaux existants)

#### `mission_priorite` (Choix)
Valeurs identiques à la colonne `priorite` existante :
- Critique
- Haute
- Moyenne
- Basse

#### `categorie` (Choix) ⭐ NOUVEAU
**Valeurs:**
- MCO
- Projet
- Imprévisible

**Couleurs suggérées:**
- MCO → Bleu (#3498db)
- Projet → Vert (#2ecc71)
- Imprévisible → Orange (#e67e22)

---

## 🎨 VUES GRIST RECOMMANDÉES

### Vue 1: "Toutes les tâches" (existante)
Conserver la vue actuelle, ajouter colonnes missions visibles

### Vue 2: "Par Mission"
- Grouper par: `mission_nom`
- Trier par: `mission_code`
- Afficher: titre, statut, qui, categorie
- Filtres: mission_code non vide

### Vue 3: "Par Catégorie"
- Grouper par: `categorie`
- Trier par: `priorite`
- Afficher: mission_nom, sous_action_nom, titre, statut
- Filtres: categorie non vide

### Vue 4: "Tâches non classifiées"
- Filtrer: `est_classifiee = false` OU `mission_code` vide
- Afficher: toutes les colonnes
- Usage: identifier les tâches à classifier

### Vue 5: "Missions actives"
- Filtrer: `mission_code` non vide ET `statut ≠ Terminé`
- Grouper par: `mission_nom`
- Résumé: Compte de tâches, somme des charges

---

## 🔍 FORMULES UTILES (optionnel)

### Colonne calculée: `mission_complete` (Texte)
Afficher la mission complète formatée :
```python
if $mission_code:
  return f"[{$mission_code}] {$mission_nom}"
else:
  return ""
```

### Colonne calculée: `sous_action_complete` (Texte)
Afficher la sous-action complète :
```python
if $sous_action_code:
  return f"[{$sous_action_code}] {$sous_action_nom} ({$categorie})"
else:
  return ""
```

### Colonne calculée: `badge_categorie` (Texte)
Badge formaté pour affichage :
```python
categories = {
  'MCO': '🔧 MCO',
  'Projet': '🎯 PROJET',
  'Imprévisible': '⚡ IMPRÉVISIBLE'
}
return categories.get($categorie, '')
```

---

## 📊 EXEMPLE DE DONNÉES

### Tâche classifiée complète

| Colonne | Valeur |
|---------|--------|
| **id** | 234 |
| **titre** | Configurer firewall Azure |
| **statut** | En cours |
| **qui** | Jean Dupont |
| **bureau** | Infrastructure |
| **mission_code** | MIS-2025-001 |
| **mission_nom** | Migration cloud Azure |
| **mission_responsable** | Pierre Martin |
| **mission_bureau** | Infrastructure |
| **mission_priorite** | Haute |
| **mission_date_debut** | 01/12/2025 |
| **mission_date_fin** | 31/03/2026 |
| **sous_action_code** | SA-001 |
| **sous_action_nom** | Configuration réseau |
| **categorie** | **Projet** |
| **sous_action_charge_estimee** | 5 |
| **sous_action_charge_reelle** | 3.5 |
| **est_classifiee** | true |

### Tâche non classifiée (existante)

| Colonne | Valeur |
|---------|--------|
| **id** | 123 |
| **titre** | Corriger bug authentification |
| **statut** | À faire |
| **qui** | Marie Dubois |
| **bureau** | Développement |
| **mission_code** | *(vide)* |
| **mission_nom** | *(vide)* |
| **categorie** | *(vide)* |
| **est_classifiee** | false |

---

## 🚀 PROCÉDURE D'INJECTION DANS GRIST

### Étape 1: Ajouter les colonnes

1. Ouvrir la table `Ssir_taches2` dans Grist
2. Ajouter les 13 nouvelles colonnes une par une :

**Groupe MISSION:**
```
Nom: mission_code
Type: Texte
Description: Code de la mission (ex: MIS-2025-001)

Nom: mission_nom
Type: Texte
Description: Nom de la mission

Nom: mission_responsable
Type: Texte
Description: Responsable de la mission

Nom: mission_bureau
Type: Choix
Options: Infrastructure, Sécurité, Support, Développement
Description: Bureau porteur

Nom: mission_priorite
Type: Choix
Options: Critique, Haute, Moyenne, Basse
Description: Priorité de la mission

Nom: mission_date_debut
Type: Date
Description: Date de début

Nom: mission_date_fin
Type: Date
Description: Date de fin
```

**Groupe SOUS-ACTION:**
```
Nom: sous_action_code
Type: Texte
Description: Code de la sous-action (ex: SA-001)

Nom: sous_action_nom
Type: Texte
Description: Nom de la sous-action

Nom: categorie
Type: Choix
Options: MCO, Projet, Imprévisible
Couleurs: Bleu, Vert, Orange
Description: Type d'activité ⭐

Nom: sous_action_charge_estimee
Type: Numérique
Description: Charge estimée en jours

Nom: sous_action_charge_reelle
Type: Numérique
Description: Charge réalisée en jours
```

**Groupe META:**
```
Nom: est_classifiee
Type: Bascule (Toggle)
Description: Tâche classifiée dans une mission
```

### Étape 2: Configurer les choix

1. Colonne `mission_bureau` : copier les options de la colonne `bureau` existante
2. Colonne `mission_priorite` : copier les options de la colonne `priorite` existante
3. Colonne `categorie` :
   - MCO (couleur #3498db)
   - Projet (couleur #2ecc71)
   - Imprévisible (couleur #e67e22)

### Étape 3: Créer les vues

1. Dupliquer la vue existante → "Par Mission"
2. Configurer groupement et filtres
3. Répéter pour les autres vues

### Étape 4: Tester

1. Créer une tâche de test
2. Remplir tous les champs mission/sous-action
3. Vérifier l'affichage dans les différentes vues

---

## 🔗 COMPATIBILITÉ API GRIST

Les nouvelles colonnes sont accessibles via l'API :

```javascript
// Récupérer une tâche avec ses infos mission
const task = await grist.docApi.fetchTable('Ssir_taches2');
console.log(task.mission_code);
console.log(task.mission_nom);
console.log(task.categorie); // MCO / Projet / Imprévisible
```

---

## 📊 STATISTIQUES PRÉVISIONNELLES

Avec cette structure dénormalisée :
- ✅ Pas de jointures nécessaires
- ✅ Requêtes simples et rapides
- ✅ Facile à filtrer par mission/catégorie
- ✅ Export Excel direct
- ⚠️ Duplication des données mission (normal en dénormalisé)
- ⚠️ Nécessite gestion côté interface pour cohérence

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Créer les 13 colonnes dans Grist
2. ✅ Configurer les choix et couleurs
3. ✅ Créer les vues recommandées
4. 🚧 Développer l'interface `missions.html`
5. 🚧 Créer `MissionsManager.js`
6. 🚧 Enrichir le Kanban

---

**Structure validée pour Grist - Prêt à injecter**
