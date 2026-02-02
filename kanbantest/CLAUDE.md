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
│   ├── TimelineManager.js          # Vue timeline Gantt
│   ├── MissionsManager.js          # Vue missions
│   ├── DashboardManager.js         # Statistiques et dashboard
│   ├── ConfigManager.js            # Configuration utilisateur
│   ├── JalonManager.js             # Gestion des jalons
│   ├── DatePickerManager.js        # Sélecteur de dates
│   └── TaskLinksManager.js         # Liaisons entre tâches
├── utils/                          # Fonctions pures, sans état
│   ├── grist-helpers.js            # extractGristRefId, extractGristRefIds, toGristString
│   ├── safe-dom.js                 # escapeHTML, safeCreateElement (anti-XSS)
│   ├── dom.js                      # Manipulation DOM, populateSelect, displayError
│   ├── dates.js                    # normalizeDate, formatDate, calculateDuration
│   ├── badges.js                   # Badges statut, urgence, impact
│   ├── LoggerManager.js            # createModuleLogger
│   ├── NotesJsonMigrator.js        # Migration notes texte → JSON
│   ├── UserActionManager.js        # Enregistrement actions utilisateur
│   ├── EventManager.js             # safeOn, cleanNamespace (wrapper events)
│   └── ReferenceManager.js         # Gestion des références/URLs
└── config/constants.js             # Constantes, statuts, bureaux, agents, STRATEGY_DATA
```

## Graphe de dépendances

```
app-initializer.js
     │
     ▼
KanbanManager.js ────► GristManager.js (seul accès DB)
     │                       │
     ├──► ViewManager.js     └──► grist.docApi.*
     ├──► FilterManager.js
     ├──► HistoryManager.js
     ├──► EventCentralizer.js (tous les addEventListener)
     │
SharedTaskModal.js (singleton global, pas importé par KanbanManager)

RÈGLE : les flèches ne vont que vers le bas ou vers utils/config.
AUCUNE flèche remontante (un manager n'importe jamais KanbanManager).
```

## Schéma de données Grist

### Table principale : `Ssir_principale_task`

Colonnes clé :
- `id` (Int, auto) -- identifiant unique
- `titre` (Text) -- titre de la tâche
- `statut` (Choice) -- Backlog, À faire, En cours, En attente, En pause, Bloqué, Validation, Terminé
- `bureau` (ChoiceList) -- format string CSV : `"Réseaux, BDD"` (PAS un array Grist)
- `qui` (ChoiceList) -- format string CSV : `"Alex, Timothée"`
- `urgence` (Choice) -- Immédiate, Courte, Moyenne, Longue
- `impact` (Choice) -- Critique, Important, Modéré, Mineur
- `notes` (Text) -- **JSON structuré** (voir format ci-dessous)
- `strategie_id` (ReferenceList) -- format `["L", id1, id2, ...]`
- `description` (Text) -- **LEGACY, ne pas utiliser** -- utiliser `notes`
- `date_debut`, `date_echeance` (Date) -- timestamps Unix en **secondes**
- `tache_liens` (Text) -- JSON `[{targetId, type, createdAt}]`
- `avancement` (Int) -- 0-100

### Format du champ `notes` (JSON)

```json
{
  "content": "Texte libre de la note",
  "history": [
    {
      "timestamp": 1706000000,
      "user": "Timothée",
      "action": "status_change|comment|update|field_change|jalons_update|strategies_update|create",
      "status": "En cours",
      "details": "Description du changement",
      "field": "statut",
      "oldValue": "Backlog",
      "newValue": "En cours"
    }
  ]
}
```

### Format ReferenceList / ChoiceList Grist

- Liste vide : `["L"]`
- Une valeur : `["L", 38]` ou `["L", "Réseaux"]`
- Plusieurs : `["L", 38, 42]` ou `["L", "Réseaux", "BDD"]`

### Table stratégies : `Ssir_strategie2`

- `objectif`, `sous_objectif`, `axe_strategique` (Text)
- `responsable`, `echeance`, `portee` (Text)

### Table historique (legacy) : `User_Actions2`

En cours de dépréciation. Les données sont dans `notes.history`.

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
- Timestamps dates en secondes Unix (pas millisecondes)

### Sécurité
- Ne JAMAIS injecter de données utilisateur via innerHTML sans échappement
- Utiliser `textContent` pour le texte brut, `escapeHTML()` de `safe-dom.js` pour le HTML
- Utiliser `safeCreateElement()` de `safe-dom.js` à la place de innerHTML avec données user
- Ne JAMAIS construire de onclick inline avec des données utilisateur
- Utiliser addEventListener après création DOM ou délégation via EventCentralizer

### Anti-patterns à bloquer
- JAMAIS de `setInterval` sans stocker la référence et la nettoyer dans `destroy()`
- JAMAIS de `window.* = ...` sauf `window.SharedTaskModal` (singleton explicite)
- JAMAIS de regex sur du HTML brut (parser le DOM avec createElement)
- JAMAIS de duplication de listes (agents, bureaux) -- importer depuis `constants.js`

### Avant chaque commit
- [ ] Aucune référence aux fichiers supprimés (voir liste ci-dessus)
- [ ] Aucun addEventListener hors EventCentralizer
- [ ] Console sans erreurs critiques
- [ ] Champ description VIDE à l'ouverture des tâches existantes
- [ ] Aucun enregistrement ___TEMP_USER_RECORD___ visible
- [ ] Aucun innerHTML avec données utilisateur non échappées
- [ ] Aucun onclick inline avec données dynamiques
- [ ] Aucun setInterval sans cleanup dans destroy()
- [ ] Les tests unitaires du module modifié passent (test-runner.html)

## Tests

- Lancer les tests : ouvrir `kanbantest/test-runner.html` dans un navigateur
- Framework : `test/unit/test-framework.js` (describe/it/assert)
- Chaque nouveau module DOIT avoir un fichier `test/unit/{module}.test.js`
- Un agent qui modifie un module DOIT vérifier que ses tests passent
- Format : `TestFramework.describe('NomModule', () => { it('...', () => { assert.* }) })`
- Les tests ne dépendent PAS du DOM réel (utiliser des objets mock simples)

## Conventions

- camelCase pour variables, PascalCase pour classes
- Logs via `createModuleLogger('ModuleName')`, pas console.log direct
- Async/await avec try/catch/finally (toujours libérer les verrous)
- Managers communiquent via KanbanManager, jamais d'import croisé direct
- IDs DOM préfixés `stm-` pour SharedTaskModal (contrat stable avec le template HTML)

## Commandes utiles

- Constantes : `js/config/constants.js` (STATUTS, DEFAULT_BUREAUX, DEFAULT_RESPONSABLES, TABLE_ID, STRATEGY_DATA)
- Helpers Grist : `js/utils/grist-helpers.js` (extractGristRefId, extractGristRefIds)
- Helpers DOM sécurisés : `js/utils/safe-dom.js` (escapeHTML, safeCreateElement)
