# CLAUDE.md - kanbantest/

## Fichiers supprimés -- NE JAMAIS référencer

- `kanban-app.js` -- supprimé, remplacé par `app-initializer.js`
- `managers/ModalManager.js` -- supprimé, remplacé par `components/SharedTaskModal.js`
- `managers/ViewModeManager.js` -- renommé en `managers/ViewManager.js`
- `renderers/CardRenderer.js` -- supprimé, absorbé par ViewManager.js
- `renderers/boardRenderer.js` -- supprimé, absorbé par ViewManager.js
- `config/strategyData.js` -- n'existe pas

## Architecture actuelle (source de vérité)

```
js/
├── app-initializer.js              # Point d'entrée index.html
├── {page}-app.js                   # Points d'entrée par page (taches, missions, timeline, stats, history, config, migration)
├── core/
│   ├── KanbanManager.js            # Hub orchestrateur (index.html uniquement)
│   └── EventCentralizer.js         # TOUS les addEventListener passent ici
├── components/
│   └── SharedTaskModal.js          # Modale UNIQUE, partagée par toutes les pages
├── managers/                       # 1 manager = 1 responsabilité
│   ├── ViewManager.js              # Affichage, rendu, modes de vue
│   ├── HistoryManager.js           # Historique, commentaires, timeline
│   ├── GristManager.js             # CRUD Grist (seule interface DB)
│   ├── FilterManager.js            # Filtres et recherche
│   └── [autres managers]
├── utils/                          # Fonctions pures, sans état
└── config/constants.js             # Constantes, statuts, bureaux, agents
```

## Règles impératives

### Événements
- TOUS les addEventListener via `EventCentralizer.js` (méthode safeOn)
- AUCUN addEventListener direct dans les managers
- Exception : événements Bootstrap lifecycle (shown.bs.modal, hidden.bs.collapse)

### Modale
- `SharedTaskModal` est le SEUL gestionnaire de modales
- Pattern singleton : une seule instance par page
- Ne JAMAIS créer de modale en dehors de SharedTaskModal

### Données Grist
- Ne JAMAIS changer la string `'___TEMP_USER_RECORD___'`
- Double filtrage obligatoire : onRecords + rendu visuel
- Format listes Grist : `['L', ...values]` (premier élément = 'L')
- Noms de colonnes = noms exacts Grist (titre, statut, bureau, qui, notes)
- Le champ `description` est LEGACY -- utiliser `notes` (JSON)
- Le champ stratégique s'appelle `axe_strategique` (pas `action`)

### Sécurité
- Ne JAMAIS injecter de données utilisateur via innerHTML sans échappement
- Utiliser textContent pour le texte brut, escapeHTML() pour le HTML
- Ne JAMAIS construire de onclick inline avec des données utilisateur

### Avant chaque commit
- [ ] Aucune référence aux fichiers supprimés (voir liste ci-dessus)
- [ ] Aucun addEventListener hors EventCentralizer
- [ ] Console sans erreurs critiques
- [ ] Champ description VIDE à l'ouverture des tâches existantes
- [ ] Aucun enregistrement ___TEMP_USER_RECORD___ visible

## Table Grist principale : `Ssir_principale_task`

Table stratégies : `Ssir_strategie2`
Table historique (legacy) : `User_Actions2`

## Conventions

- camelCase pour variables, PascalCase pour classes
- Logs via `createModuleLogger('ModuleName')`, pas console.log direct
- Async/await avec try/catch/finally (toujours libérer les verrous)
- Managers communiquent via KanbanManager, jamais d'import croisé direct
