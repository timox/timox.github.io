# Documentation des Modes de Vue - Kanban SSIR

## Vue d'ensemble

Le système Kanban dispose de **3 modes de vue** distincts, chacun optimisé pour des usages spécifiques.

## Mode 1 : COMPACT 

**Usage :** Visualisation rapide, tableaux de bord, monitoring

### Caractéristiques :
- **Colonnes étroites** : 220px de largeur
- **Badges simplifiés** : Affichage limité des informations secondaires
- **Responsables masqués** : Économie d'espace
- **Bureaux condensés** : Maximum 2 bureaux affichés, puis "+X"
- **Pas d'icônes secondaires** : Références et jalons masqués

### Comportements :
- Scrolling vertical dans chaque colonne
- Drag & drop fonctionnel
- **Réinitialisation automatique des filtres** lors du changement de vue

---

## Mode 2 : DETAILED

**Usage :** Travail quotidien, gestion détaillée des tâches

### Caractéristiques :
- **Colonnes moyennes** : 320px de largeur
- **Tous les badges visibles** : Informations complètes
- **Icônes supplémentaires** :
  - `bi-crosshair` : Stratégies (couleur verte #28a745)
  - `bi-link-45deg` : Références (couleur violette #6f42c1)
  - `bi-calendar-event` : Jalons (couleur orange #fd7e14)

### Fonctionnalité unique : **Repliage de colonnes**
- **Bouton de repliage** : `bi-chevron-left/right` dans chaque en-tête
- **Pile à gauche** : Les colonnes repliées s'empilent dans une zone dédiée
- **Agrandissement automatique** : Les colonnes restantes s'élargissent
- **Restauration** : Clic sur la pile pour déplier une colonne

### Comportements :
- **Réinitialisation automatique des filtres** lors du changement de vue
- Animation de repliage/dépliage (300ms)
- Redistribution dynamique de la largeur

---

## Mode 3 : FOCUS

**Usage :** Analyse approfondie, suivi individuel de statut

### Caractéristiques :
- **Une seule colonne** : 500px centrée
- **Contenu étendu** : Détails complets des éléments
- **Tooltips enrichis** : Informations contextuelles sur survol

### Contenu déployé :
1. **Stratégies détaillées** :
   ```
   🎯 Stratégies:
   • Objectif → Action
   • Autre objectif → Autre action
   ```

2. **Jalons planifiés** :
   ```
   📅 Jalons:
   • Titre du jalon (date)
   • Autre jalon (date)
   ```

3. **Références extraites** :
   ```
   🔗 Références:
   • \\serveur\chemin\fichier
   • https://example.com/resource
   • C:\local\path\file
   ```

### Comportements :
- **Navigation par colonnes** : Boutons précédent/suivant
- **Réinitialisation automatique des filtres** lors du changement de vue
- Extraction automatique des références depuis les notes

---

## Comportements Transversaux

### Changement de Vue
- **⚠️ IMPORTANT** : Tout changement de mode réinitialise TOUS les filtres
- Sauvegarde automatique de la préférence utilisateur
- Transition fluide entre les modes

### Filtres
- Réinitialisation systématique via `FilterManager.clearAllFilters()`
- Pas de persistance des filtres entre les vues
- Garantit une expérience cohérente

### Scrolling
- **Toutes les colonnes** disposent de `overflow-y: auto`
- Hauteurs adaptées : `calc(100vh - 200px)` à `calc(100vh - 280px)`
- Scrollbars personnalisées en mode compact (6px)

### Drag & Drop
- Fonctionnalité préservée dans tous les modes
- Adaptation automatique aux largeurs de colonnes
- Protection contre les erreurs CSS will-change

---

## Symboles et Icônes

| Élément | Icône | Couleur | Disponibilité |
|---------|--------|---------|---------------|
| Stratégies | `bi-crosshair` | #28a745 (vert) | Detailed, Focus |
| Références | `bi-link-45deg` | #6f42c1 (violet) | Detailed, Focus |
| Jalons | `bi-calendar-event` | #fd7e14 (orange) | Detailed, Focus |
| Projets | `bi-folder` | #1565c0 (bleu) | Tous modes |
| Priorité | `bi-exclamation-triangle` | Variable | Tous modes |

---

## Architecture Technique

### Classes CSS
- `.kanban-compact` : Mode 1
- `.kanban-detailed` : Mode 2  
- `.kanban-focus` : Mode 3

### Gestionnaires
- **ViewModeManager** : Orchestration des modes
- **FilterManager** : Gestion des filtres
- **CardRenderer** : Rendu adaptatif des cartes

### Persistance
- Mode actuel sauvé dans `localStorage`
- Colonne focus persistée (mode 3)
- État des colonnes repliées (mode 2) - session uniquement

---

## Notes de Développement

- Système extensible pour ajouter de nouveaux modes
- Performances optimisées via lazy loading des contenus étendus
- Tests d'accessibilité intégrés (ARIA labels)
- Support responsive prévu pour écrans mobiles