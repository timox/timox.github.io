# 🚀 Promotion de l'environnement `test/` vers `kanban/`

Cette note recense les écarts encore présents entre la préproduction (`test/`) et la production (`kanban/`) ainsi que les vérifications à mener avant de basculer l'ergonomie stabilisée en ligne.

## 1. Écarts fonctionnels à résorber

- **Gestionnaire de vues unifié** : `test/` instancie `ViewManager` directement depuis le `KanbanManager` pour piloter le rendu, la pile de colonnes repliées et les raccourcis clavier, alors que `kanban/` s'appuie toujours sur `ViewModeManager` et les anciens renderers (`CardRenderer`/`BoardRenderer`).【F:test/js/core/KanbanManager.js†L124-L145】【F:test/js/managers/ViewManager.js†L1-L120】【F:kanban/js/kanban-app.js†L55-L59】【F:kanban/js/core/KanbanManager.js†L126-L146】【F:kanban/js/managers/ViewModeManager.js†L1-L70】
- **Centralisation des événements** : la version de test connecte tous les écouteurs (historique, modale, filtres, raccourcis clavier) via `EventCentralizer` et l'utilitaire `EventManager` pour éviter les doublons, fonctionnalité absente de la prod actuelle.【F:test/js/core/KanbanManager.js†L1036-L1049】【F:test/js/core/EventCentralizer.js†L1-L150】
- **Fallback stratégique et configuration** : la préproduction bascule automatiquement sur un dataset embarqué (`strategyFallbackData.js`) si la table Grist est vide ou inaccessible, et attend davantage de colonnes optionnelles (priorité, champs dérivés, métadonnées). La prod reste liée à `strategyData.js` et à une liste minimale de colonnes.【F:test/js/kanban-app.js†L15-L58】【F:test/js/config/strategyFallbackData.js†L1-L32】【F:test/js/core/KanbanManager.js†L168-L216】【F:test/js/config/constants.js†L45-L58】【F:kanban/js/config/constants.js†L34-L42】【F:kanban/js/config/strategyData.js†L1-L32】
- **Structure HTML/CSS du shell** : `test/index.html` embarque le badge « Préproduction », une aide clavier et un wrapper grid (`.kanban-wrapper`) nécessaire à la pile de colonnes, avec les styles associés; la prod conserve l'ancien container fluide sans ces éléments.【F:test/index.html†L24-L52】【F:test/index.html†L124-L135】【F:test/css/kanban-base.css†L114-L145】【F:kanban/index.html†L24-L47】【F:kanban/css/kanban-base.css†L88-L103】
- **Dépendances utilitaires** : pour accompagner les nouveautés, `test/` ajoute `core/EventCentralizer.js` et `utils/EventManager.js` qu'il faudra copier ou fusionner, faute de quoi la nouvelle architecture lèvera des erreurs au chargement.【F:test/js/core/EventCentralizer.js†L1-L150】

## 2. Actions de synchronisation recommandées

1. **Migrer la pile d'affichage** : remplacer `ViewModeManager` + `CardRenderer`/`BoardRenderer` par `ViewManager` côté prod, et vérifier que `KanbanManager` expose bien `viewManager` pour l'initialiseur.【F:test/js/core/KanbanManager.js†L124-L145】【F:kanban/js/core/KanbanManager.js†L126-L146】
2. **Aligner l'initialisation** : mettre `app-initializer.js` de prod au niveau de la préprod (instanciation unique de `KanbanManager`, récupération du `viewManager`, attente explicite de `GristManager`).【F:test/js/app-initializer.js†L12-L88】【F:kanban/js/app-initializer.js†L1-L80】
3. **Importer l'EventCentralizer** : copier `core/EventCentralizer.js` et `utils/EventManager.js`, puis enregistrer les managers comme en test pour supprimer les écoutes multiples de clics/keydown.【F:test/js/core/KanbanManager.js†L1036-L1049】【F:test/js/core/EventCentralizer.js†L1-L150】
4. **Unifier la configuration** : fusionner `constants.js` en conservant la liste élargie de colonnes et basculer vers le fallback stratégique commun (ou garder `strategyData.js` comme dataset officiel en s'assurant que `applyStrategyFallbackData` reste fonctionnel).【F:test/js/config/constants.js†L45-L58】【F:test/js/core/KanbanManager.js†L168-L216】【F:kanban/js/config/constants.js†L34-L42】
5. **Mettre à jour le shell HTML/CSS** : reporter le wrapper, la section aide et les styles supplémentaires pour préserver la pile de colonnes, sinon `ViewManager` ne pourra pas matérialiser la colonne repliée.【F:test/index.html†L24-L52】【F:test/css/kanban-base.css†L114-L145】
6. **Nettoyer les assets inutilisés** : une fois la migration effectuée, retirer `ViewModeManager`, `CardRenderer`, `BoardRenderer` et `strategyData.js` si remplacés, pour éviter les doubles chemins de code.

## 3. Tests manuels à exécuter avant bascule

### Chargement & données
- Débrancher (temporairement) la table `Ssir_strategie2` pour vérifier que le fallback intégré alimente bien la modale stratégie et n'émet pas d'erreur console.【F:test/js/core/KanbanManager.js†L168-L216】
- Vérifier que toutes les colonnes déclarées (priorité, champs `str_*`, métadonnées) remontent correctement dans les formulaires et l'export Grist.【F:test/js/config/constants.js†L45-L58】

### Interface Kanban
- Tester les trois modes d'affichage (compact, détaillé, focus) via les boutons et les raccourcis `1/2/3`, en confirmant la présence de la pile de colonnes repliées et des classes `is-focus-mode`/`has-collapsed-stack`.【F:test/js/managers/ViewManager.js†L17-L120】【F:test/css/kanban-base.css†L114-L145】
- Vérifier que le wrapper grid ne casse pas la mise en page large/étroite, et que le bandeau d'aide clavier apparaît/disparaît correctement.【F:test/index.html†L124-L135】【F:test/css/kanban-base.css†L114-L145】

### Modales & historique
- Ouvrir/fermer plusieurs fois la modale tâche et la fenêtre d'historique pour s'assurer que la centralisation d'événements évite les doubles déclenchements ou erreurs « listener already registered ».【F:test/js/core/EventCentralizer.js†L1-L150】
- Tester la création/édition de commentaires et les raccourcis `N` (nouvelle tâche) / `Esc` (fermeture) pour valider le routage clavier.【F:test/js/core/EventCentralizer.js†L88-L138】

### Timeline & stats
- Confirmer que la navigation vers `timeline.html` et `stats.html` continue de fonctionner avec les nouveaux imports (chargement sans erreurs console). Les modules partagent désormais la configuration élargie; vérifier les filtres sur les champs additionnels.【F:test/index.html†L37-L44】【F:test/js/config/constants.js†L45-L58】

### Régressions de production
- Rejouer le script `deploy_to_production.sh` en mode dry-run pour vérifier que la sauvegarde et la copie `test/ → kanban/` restent valides avec les nouveaux fichiers.
- Effectuer une revue visuelle complète (desktop) et un audit console pour confirmer l'absence d'erreurs JS avant le merge final.

En suivant cette checklist, la bascule de l'ergonomie de préproduction vers la production pourra se faire en conservant les améliorations apportées tout en sécurisant les cas limites détectés durant les derniers correctifs.
