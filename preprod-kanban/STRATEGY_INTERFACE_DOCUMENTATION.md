# Documentation de l'Interface Stratégie - Kanban

## Vue d'ensemble

L'interface stratégie du Kanban utilise une approche **guidée en 3 étapes** pour permettre à l'utilisateur de sélectionner une stratégie de manière intuitive, tout en sauvegardant uniquement le `strategie_id` final dans la base de données.

## Architecture des Données

### Tables Grist impliquées

1. **Table `ssir_principal`** (tâches principales)
   - Champ `strategie_id` : Référence vers la table stratégie
   - **Seul champ sauvegardé** pour la stratégie

2. **Table `SSIR_strategie2`** (données stratégiques)
   - `id` : Identifiant unique de la stratégie
   - `objectif` : Objectif stratégique principal
   - `sous_objectif` : Sous-objectif spécifique
   - `action` : Action concrète à réaliser
   - `echeance` : Date d'échéance de la stratégie
   - `responsable` : Responsable de la stratégie
   - `portee` : Portée/impact de la stratégie

### Principe de fonctionnement

```
Utilisateur sélectionne : Objectif → Sous-objectif → Action
                                    ↓
Application recherche : Combinaison dans SSIR_strategie2
                                    ↓
Application trouve : strategy.id correspondant
                                    ↓
Application sauvegarde : Seulement strategie_id dans ssir_principal
                                    ↓
Application affiche : Détails automatiques (échéance, responsable, portée)
```

## Interface Utilisateur

### Structure HTML (index.html)

```html
<!-- Interface guidée en 3 étapes -->
<div class="row g-3 mb-3">
  <div class="col-md-4">
    <label for="popup-strategie-objectif" class="form-label small">1. Objectif</label>
    <select class="form-select" id="popup-strategie-objectif">
      <option value="">-- Choisir un objectif --</option>
    </select>
  </div>
  <div class="col-md-4">
    <label for="popup-strategie-sous-objectif" class="form-label small">2. Sous-objectif</label>
    <select class="form-select" id="popup-strategie-sous-objectif" disabled>
      <option value="">-- Choisir d'abord un objectif --</option>
    </select>
  </div>
  <div class="col-md-4">
    <label for="popup-strategie-action" class="form-label small">3. Action</label>
    <select class="form-select" id="popup-strategie-action" disabled>
      <option value="">-- Choisir d'abord un sous-objectif --</option>
    </select>
  </div>
</div>

<!-- Affichage automatique des détails -->
<div class="strategy-details bg-light p-3 rounded" id="strategy-details" style="display: none;">
  <div class="row g-2">
    <div class="col-md-4">
      <small class="text-muted d-block"><strong>Échéance:</strong></small>
      <span id="strategy-echeance" class="text-primary">-</span>
    </div>
    <div class="col-md-4">
      <small class="text-muted d-block"><strong>Responsable:</strong></small>
      <span id="strategy-responsable" class="text-primary">-</span>
    </div>
    <div class="col-md-4">
      <small class="text-muted d-block"><strong>Portée:</strong></small>
      <span id="strategy-portee" class="text-primary">-</span>
    </div>
  </div>
</div>

<!-- Champ caché pour la sauvegarde -->
<input type="hidden" id="popup-strategie-id" />
```

### Logique JavaScript (ModalManager.js)

#### 1. Configuration des écouteurs d'événements

```javascript
setupStrategySelects() {
  // Peupler la liste des objectifs (données statiques)
  populateSelect('popup-strategie-objectif', strategieObjectifs, true);
  
  // Écouteur objectif → sous-objectifs
  objectifSelect.addEventListener('change', (e) => {
    const sousObjectifs = strategieSousObjectifs[e.target.value] || [];
    populateSelect('popup-strategie-sous-objectif', sousObjectifs, true);
    // Activer/désactiver selon disponibilité
    sousObjectifSelect.disabled = !e.target.value;
  });
  
  // Écouteur sous-objectif → actions  
  sousObjectifSelect.addEventListener('change', (e) => {
    const actions = strategieActions[e.target.value] || [];
    populateSelect('popup-strategie-action', actions, true);
    actionSelect.disabled = !e.target.value;
  });
  
  // Écouteur action → recherche strategie_id
  actionSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      this.findAndSetStrategyId(); // Recherche dans Grist
    }
  });
}
```

#### 2. Recherche du strategie_id

```javascript
findAndSetStrategyId() {
  const objectif = getFieldValue('popup-strategie-objectif');
  const sousObjectif = getFieldValue('popup-strategie-sous-objectif');
  const action = getFieldValue('popup-strategie-action');
  
  // Recherche dans les données Grist
  const strategy = this.kanban.strategyData.find(s => 
    s.objectif === objectif && 
    s.sous_objectif === sousObjectif && 
    s.action === action
  );
  
  if (strategy) {
    setFieldValue('popup-strategie-id', strategy.id); // Sauvegarde finale
    this.updateStrategyDetails(strategy); // Affichage détails
  }
}
```

#### 3. Chargement depuis une tâche existante

```javascript
populateStrategyFieldsFromId(strategyId) {
  const strategy = this.kanban.strategyData.find(s => s.id == strategyId);
  
  if (strategy) {
    // Cascade : objectif → sous-objectif → action
    setFieldValue('popup-strategie-objectif', strategy.objectif);
    objectifSelect.dispatchEvent(new Event('change'));
    
    setTimeout(() => {
      setFieldValue('popup-strategie-sous-objectif', strategy.sous_objectif);
      sousObjectifSelect.dispatchEvent(new Event('change'));
      
      setTimeout(() => {
        setFieldValue('popup-strategie-action', strategy.action);
        setFieldValue('popup-strategie-id', strategyId);
        this.updateStrategyDetails(strategy);
      }, 100);
    }, 100);
  }
}
```

#### 4. Sauvegarde dans Grist

```javascript
collectFormData() {
  return {
    // ... autres champs
    strategie_id: getFieldValue('popup-strategie-id') || null // Seul champ sauvegardé
  };
}
```

## Flux de données détaillé

### 1. Sélection d'une nouvelle stratégie

```
Utilisateur → Objectif "Modernisation Infrastructure"
    ↓
Application → Peuple sous-objectifs ["Migration Cloud", "Virtualisation", ...]
    ↓
Utilisateur → Sous-objectif "Migration Cloud"  
    ↓
Application → Peuple actions ["Audit Infrastructure", "Sélection Fournisseur", ...]
    ↓
Utilisateur → Action "Audit Infrastructure Existante"
    ↓
Application → Recherche dans SSIR_strategie2 WHERE objectif='Modernisation Infrastructure' 
             AND sous_objectif='Migration Cloud' AND action='Audit Infrastructure Existante'
    ↓
Application → Trouve strategy.id = 123
    ↓
Application → Définit popup-strategie-id = 123
    ↓
Application → Affiche détails (échéance: "2025-12-31", responsable: "DSI", portée: "Nationale")
    ↓
Sauvegarde → Envoie à Grist { strategie_id: 123 } dans ssir_principal
```

### 2. Chargement d'une tâche existante

```
Chargement → tache.strategie_id = 123
    ↓
Application → Recherche dans SSIR_strategie2 WHERE id = 123
    ↓
Application → Trouve strategy { objectif: "Modernisation", sous_objectif: "Migration Cloud", action: "Audit" }
    ↓
Application → Cascade de sélection :
             1. Sélectionne objectif → Peuple sous-objectifs
             2. Sélectionne sous-objectif → Peuple actions  
             3. Sélectionne action → Affiche détails
    ↓
Interface → Affiche sélection complète + détails automatiques
```

## Données stratégiques (fallback)

En cas d'indisponibilité des données Grist, l'application utilise des données par défaut :

```javascript
strategieObjectifs = [
  'Modernisation Infrastructure',
  'Sécurité Renforcée', 
  'Performance Optimisée',
  'Conformité Réglementaire',
  'Innovation Technologique',
  'Résilience & Continuité'
];

strategieSousObjectifs = {
  'Modernisation Infrastructure': [
    'Migration Cloud', 'Virtualisation', 'Automatisation', 
    'Conteneurisation', 'Réseaux Nouvelle Génération'
  ],
  // ... autres mappings
};

strategieActions = {
  'Migration Cloud': [
    'Audit Infrastructure Existante', 'Sélection Fournisseur Cloud',
    'Planification Migration', 'Migration Pilot', // ... etc
  ],
  // ... autres mappings
};
```

## Points d'intégration requis

### Ce qui est implémenté ✅

1. **Interface guidée** : 3 listes dépendantes (objectif → sous-objectif → action)
2. **Activation/désactivation** : Les listes se débloquent progressivement
3. **Recherche automatique** : Trouve le `strategie_id` basé sur la sélection complète
4. **Affichage des détails** : Échéance, responsable, portée depuis SSIR_strategie2
5. **Sauvegarde optimisée** : Seul `strategie_id` est sauvegardé dans ssir_principal
6. **Chargement depuis tâche** : Reconstitue la sélection guidée depuis `strategie_id`
7. **Données de fallback** : Fonctionne même sans données Grist

### Ce qui manque ⚠️

1. **Chargement des données Grist** : 
   ```javascript
   // Dans kanban-app.js ou module principal
   this.strategyData = await this.loadStrategyData(); // À implémenter
   ```

2. **Peuplement des listes depuis Grist** :
   ```javascript
   // Remplacer les données statiques par des données dynamiques depuis SSIR_strategie2
   this.populateSelectsFromGristData(this.strategyData);
   ```

3. **Synchronisation temps réel** :
   - Actualisation automatique si SSIR_strategie2 est modifiée
   - Gestion des stratégies supprimées/modifiées

4. **Validation des données** :
   - Vérification que la combinaison objectif+sous-objectif+action existe bien
   - Gestion des cas d'erreur (stratégie supprimée, etc.)

5. **Performance** :
   - Cache des données stratégiques
   - Optimisation des recherches répétées

## Tests recommandés

1. **Test de sélection complète** : Objectif → Sous-objectif → Action → Vérification strategie_id
2. **Test de chargement** : Tâche avec strategie_id → Vérification reconstitution interface
3. **Test de validation** : Combinaisons inexistantes → Gestion d'erreur
4. **Test de performance** : Temps de réponse avec grande quantité de données
5. **Test de fallback** : Fonctionnement sans données Grist disponibles

Cette documentation couvre l'architecture complète de l'interface stratégie, les points d'intégration nécessaires et les éléments manquants pour une implémentation complète.