# Kanban SSIR - Tableau de Bord de Gestion des Tâches

## 📋 Description

Application web de gestion de tâches en mode Kanban intégrée avec Grist. Permet le suivi des tâches, la gestion des priorités, et l'historique des actions pour les équipes SSIR (Service de Sécurité des Systèmes d'Information Renforcée).

## 🚀 Fonctionnalités

### ✨ Gestion des Tâches
- **Tableau Kanban** avec colonnes de statut (Backlog, À faire, En cours, En attente, Bloqué, Validation, Terminé)
- **Drag & Drop** pour changer le statut des tâches
- **Création/Édition** de tâches avec formulaire complet
- **Suppression** de tâches avec confirmation
- **Assignation** multi-bureaux et multi-responsables

### 🔍 Filtres et Recherche
- **Recherche textuelle** dans titre, description, et champs stratégiques
- **Filtres par**: Bureau, Responsable, Projet, Statut
- **Masquage/Affichage** des tâches terminées
- **Filtres rapides** (mes tâches, tâches urgentes, etc.)

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
├── index.html              # Page principale
├── css/                    # Styles CSS
│   ├── kanban-base.css
│   ├── kanban-modal.css
│   └── kanban-responsive.css
├── js/                     # Code JavaScript
│   ├── kanban-app.js       # Point d'entrée principal
│   ├── config/             # Configuration
│   │   ├── constants.js
│   │   └── strategyData.js
│   ├── core/               # Logique métier
│   │   ├── KanbanManager.js
│   │   └── GristManager.js
│   ├── managers/           # Gestionnaires spécialisés
│   │   ├── ModalManager.js
│   │   ├── FilterManager.js
│   │   ├── ViewModeManager.js
│   │   └── HistoryManager.js
│   ├── utils/              # Utilitaires
│   │   ├── dom.js
│   │   ├── dates.js
│   │   └── badges.js
│   └── renderers/          # Rendu des composants
│       └── CardRenderer.js
└── schema.md               # Schéma des tables Grist
```

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

### Debugging
```javascript
// Variables globales disponibles
window.kanbanManager     // Instance principale
window.KanbanApp        // Utilitaires exposés

// Fonctions utiles
kanbanManager.exportState()      // État courant
kanbanManager.refreshKanban()    // Recharger
kanbanManager.diagnoseIssues()   // Diagnostic
```

## 🐛 Résolution de Problèmes

### Erreurs Communes

#### "this.populateTaskForm is not a function"
- **Cause**: Problème d'initialisation des managers
- **Solution**: Vérifier que ModalManager est correctement initialisé

#### "Grist sandbox error: list indices must be integers"
- **Cause**: Format de données incorrect pour Grist
- **Solution**: Vérifier format des listes bureau/qui `['L', ...values]`

#### "Tâches non visibles"
- **Cause**: Problème de fetch ou de filtrage
- **Solution**: Vérifier les filtres et la console pour erreurs

#### "Modal ne se ferme pas"
- **Cause**: Conflit avec Bootstrap ou événements
- **Solution**: Vérifier les event listeners et instances Bootstrap

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
- **Version**: 2.0.0
- **Dernière mise à jour**: Juillet 2025
- **Statut**: Production

### Fonctionnalités Récentes
- ✅ Correction erreur Grist sandbox
- ✅ Amélioration format timestamps
- ✅ Optimisation gestionnaires
- ✅ Debugging avancé
- ✅ Compatibilité schéma Grist

### Roadmap
- 🔄 Implémentation complète User_Actions2
- 🔄 Timeline enrichie
- 🔄 Export avancé
- 🔄 Notifications temps réel
- 🔄 Mode mobile optimisé

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

*Dernière mise à jour: Juillet 2025*