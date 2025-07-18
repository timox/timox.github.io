# 📋 Mémoire Claude - Projet Kanban SSIR

## 🎯 Vue d'ensemble du projet
Application Kanban web pour gestion des tâches SSIR avec :
- **Interface** : HTML/CSS/JS vanilla 
- **Backend** : Grist (base de données collaborative)
- **Architecture** : Modulaire avec managers spécialisés
- **Données** : Table `Ssir_principale_task` (61 tâches actives)

## 🔧 Configurations principales

### Base de données Grist
- **Table principale** : `Ssir_principale_task`
- **Colonnes critiques** : `notes` (JSON), `strategie_id`, `Cree_par`
- **API** : Intégration via GristManager.js
- **Permissions** : Système utilisateur intégré

### Architecture technique
- **Point d'entrée** : `kanban-app.js` (legacy, ne pas supprimer)
- **Managers** : FilterManager, ModalManager, HistoryManager, etc.
- **Renderers** : CardRenderer, BoardRenderer
- **Utils** : UserActionManager, LoggerManager, NotesJsonMigrator

## 🚨 Zones critiques documentées

### 1. Anti-doublons (CRITIQUE)
**Problème** : Enregistrements temporaires `___TEMP_USER_RECORD___` créent des doublons
**Solution** : Double filtrage obligatoire
- `handleGristUpdate()` : Filtre onRecords
- `filterRecords()` : Filtre rendu visuel
- **RÈGLE** : Ne JAMAIS changer la string exacte `'___TEMP_USER_RECORD___'`

### 2. Système de commentaires JSON
**Migration** : `description` → `notes` (JSON structuré)
```javascript
{
  "content": "Contenu principal de la tâche",
  "history": [
    {
      "timestamp": "2025-07-16T10:30:00.000Z",
      "user": "nom_utilisateur", 
      "action": "status_change|comment|creation|field_change",
      "details": "Description de l'action ou commentaire",
      "from": "ancien_statut",
      "to": "nouveau_statut"
    }
  ]
}
```

**Structure réelle** :
- `content` : Contenu principal/description de la tâche
- `history` : Tableau des actions et commentaires chronologiques
- Chaque entrée d'historique contient : timestamp, user, action, details
- Actions possibles : status_change, comment, creation, field_change

### 3. Champ description (IMPORTANT)
**RÈGLE** : Le champ description doit TOUJOURS être vide à l'ouverture
- `setFieldValue('popup-description', '')` obligatoire
- Anciens commentaires visibles via historique uniquement
- Nouveaux commentaires sauvés dans `notes` JSON

## 🛠️ Corrections techniques majeures

### Problème double création de tâches (RÉSOLU)
**Causes** : Écouteurs dupliqués dans kanban-app.js + ModalManager.js
**Solution** : 
- Suppression écouteurs redondants
- Désactivation `js/tmp` → `js/tmp.disabled`
- Un seul gestionnaire par action (ModalManager.js)

### Système de logs (NOUVEAU)
**Fichier** : `LoggerManager.js`
**Niveaux** : CRITICAL, ERROR, WARN, INFO, DEBUG
**Usage** : `this.logger = createModuleLogger('ModuleName')`
**Contrôle** : `logger.setLevel('ERROR')` dans console

### Interface d'édition commentaires (AJOUTÉ)
**Fonctionnalité** : Boutons ✏️ dans historique
**Implémentation** : `setupCommentEditWidget()` dans HistoryManager
**DOM** : Widget modal auto-créé avec styles CSS

## 📊 Données stratégiques

### Configuration (constants.js)
- **Statuts** : Backlog → À faire → En cours → En attente → Bloqué → Validation → Terminé
- **Bureaux** : Exploit, Réseau, BDD, RSSI, DPO, etc.
- **Urgence/Impact** : Matrice de priorité automatique

### Stratégie (strategyData.js)
- **6 objectifs** : Modernisation, Sécurité, Performance, Conformité, Innovation, Résilience
- **Sous-objectifs** : Migration cloud, AMF, Optimisation BDD, etc.
- **Actions spécifiques** : Par sous-objectif avec timeline
- **Priorités par bureau** : Mapping personnalisé

## 🔍 Patterns de développement

### Gestion erreurs async/await
```javascript
try {
  await grist.docApi.applyUserActions([action]);
  if (this.kanban.signalLocalUpdate) {
    this.kanban.signalLocalUpdate();
  }
  setFieldValue('popup-description', ''); // Vider après sauvegarde
} catch (error) {
  this.logger.error('Erreur:', error);
  displayError(`Erreur: ${error.message}`);
} finally {
  this.isUpdating = false; // Libérer verrous
}
```

### Format listes Grist
```javascript
// OBLIGATOIRE pour bureau/qui
gristData.bureau = ['L', ...values]; // Premier élément = 'L'
```

### Imports modules
```javascript
// CORRECT : Chemins relatifs respectés
import { ViewModeManager } from '../managers/ViewModeManager.js';
// ERREUR : Noms incorrects ou paths circulaires
```

## 🧪 Tests de non-régression

### Checklist validation
- [ ] Création tâche (pas de doublons)
- [ ] Suppression ferme modale
- [ ] Filtres se réinitialisent
- [ ] Drag & drop change statut  
- [ ] Description vide à l'ouverture
- [ ] Boutons ✏️ visibles
- [ ] Console sans erreurs critiques

### Commandes debug
```javascript
// Console navigateur
window.kanbanManager.debugInfo();
window.kanbanManager.getApplicationState();
```

## 🔄 Historique des conversations

### Session 2025-07-17
- **Problème** : Récupération des configs kanban
- **Action** : Documentation des fichiers de configuration
- **Résultat** : constants.js, strategyData.js, ARCHITECTURE.md, schema.md

### Sessions précédentes (via ARCHITECTURE.md)
- Correction double création tâches
- Migration système commentaires JSON
- Implémentation système logs
- Interface édition commentaires
- Filtrage anti-doublons renforcé

## 🎯 Prochaines actions potentielles

### Migration en cours
- Finaliser migration `description` → `notes`
- Synchroniser `notes.content` avec derniers commentaires
- Supprimer colonne `description` (quand migration 100%)

### Améliorations possibles
- Tests automatisés
- Documentation utilisateur
- Optimisations performance
- Intégration CI/CD

---

*Dernière mise à jour: 2025-07-17 - Création mémoire Claude*
*Version: 1.0 - Documentation initiale*