# Documentation de l'Interface Stratégie - Kanban

## Vue d'ensemble

L'interface stratégie du Kanban utilise une **interface accordéon hiérarchique** pour permettre à l'utilisateur de parcourir et sélectionner une stratégie de manière intuitive, tout en sauvegardant uniquement le `strategie_id` final dans la base de données.

### Évolution de l'interface

**Version 1** : 3 listes déroulantes dépendantes (objectif → sous-objectif → action)  
**Version 2** : Interface accordéon hiérarchique avec vue d'ensemble complète

L'accordéon offre une **meilleure compréhension du sens** en permettant de :
- **Voir l'ensemble** des stratégies disponibles d'un coup d'œil
- **Comprendre la hiérarchie** objectif → sous-objectif → action visuellement
- **Naviguer facilement** entre les différentes options
- **Consulter les détails** (échéance, responsable, portée) directement
- **Prévisualiser la sélection** dans l'en-tête de l'accordéon

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
<!-- Interface accordéon avec détails -->
<div class="accordion" id="strategie-accordion">
  <div class="accordion-item">
    <h2 class="accordion-header" id="strategie-header">
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
              data-bs-target="#strategie-collapse" aria-expanded="false" 
              aria-controls="strategie-collapse">
        <i class="bi bi-search me-2"></i>
        Parcourir et sélectionner une stratégie
        <span id="selected-strategy-preview" class="ms-auto text-muted small"></span>
      </button>
    </h2>
    <div id="strategie-collapse" class="accordion-collapse collapse" 
         aria-labelledby="strategie-header" data-bs-parent="#strategie-accordion">
      <div class="accordion-body">
        <!-- Contenu dynamique généré par JS -->
        <div id="strategy-browser" class="strategy-browser">
          <div class="text-center text-muted py-3">
            <i class="bi bi-hourglass-split"></i>
            <p class="mt-2">Chargement des stratégies...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Champs cachés pour compatibilité -->
<select class="form-select d-none" id="popup-strategie-objectif"></select>
<select class="form-select d-none" id="popup-strategie-sous-objectif"></select>
<select class="form-select d-none" id="popup-strategie-action"></select>

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

#### 1. Génération de l'interface accordéon

```javascript
setupStrategyAccordion() {
  const strategyBrowser = document.getElementById('strategy-browser');
  
  if (this.kanban.strategiesData && this.kanban.strategiesData.length > 0) {
    this.renderStrategyAccordion(strategyBrowser);
  } else {
    this.renderFallbackStrategyAccordion(strategyBrowser);
  }
}

renderStrategyAccordion(container) {
  const mappings = this.buildStrategyMappingsFromGrist();
  container.innerHTML = '';
  
  mappings.objectifs.forEach(objectif => {
    const objectiveDiv = this.createObjectiveAccordion(objectif, mappings);
    container.appendChild(objectiveDiv);
  });
}
```

#### 2. Création des éléments hiérarchiques

```javascript
createObjectiveAccordion(objectif, mappings) {
  const objectiveDiv = document.createElement('div');
  objectiveDiv.className = 'strategy-objective';
  
  // Header cliquable pour expand/collapse
  const header = document.createElement('div');
  header.className = 'strategy-objective-header';
  header.innerHTML = `
    <h6 class="strategy-objective-title">${objectif}</h6>
    <i class="bi bi-chevron-right strategy-toggle-icon"></i>
  `;
  
  // Contenu des sous-objectifs et actions
  const content = document.createElement('div');
  content.className = 'strategy-sub-objectives';
  content.style.display = 'none';
  
  // Générer la hiérarchie complète
  const sousObjectifs = mappings.sousObjectifs[objectif] || [];
  sousObjectifs.forEach(sousObjectif => {
    const subObjectiveDiv = this.createSubObjectiveSection(objectif, sousObjectif, mappings);
    content.appendChild(subObjectiveDiv);
  });
  
  return objectiveDiv;
}
```

#### 3. Cartes d'action cliquables

```javascript
createActionCard(objectif, sousObjectif, action) {
  // Trouver la stratégie correspondante dans les données Grist
  const strategy = this.kanban.strategiesData.find(s => 
    s.objectif === objectif && 
    s.sous_objectif === sousObjectif && 
    s.action === action
  );
  
  const actionDiv = document.createElement('div');
  actionDiv.className = 'strategy-action';
  actionDiv.dataset.strategyId = strategy ? strategy.id : '';
  
  actionDiv.innerHTML = `
    <div class="strategy-action-title">${action}</div>
    <div class="strategy-action-details">
      ${strategy ? `
        <div class="strategy-action-detail">
          <i class="bi bi-calendar3"></i>
          <span>${strategy.echeance || 'Non défini'}</span>
        </div>
        <div class="strategy-action-detail">
          <i class="bi bi-person"></i>
          <span>${strategy.responsable || 'Non défini'}</span>
        </div>
        <div class="strategy-action-detail">
          <i class="bi bi-globe"></i>
          <span>${strategy.portee || 'Non défini'}</span>
        </div>
      ` : '<span class="text-muted">Détails non disponibles</span>'}
    </div>
    <i class="bi bi-check-circle strategy-selected-indicator" style="display: none;"></i>
  `;
  
  // Event listener pour sélection
  actionDiv.addEventListener('click', () => {
    this.selectStrategy(strategy, objectif, sousObjectif, action);
  });
  
  return actionDiv;
}
```

#### 4. Sélection et mise à jour

```javascript
selectStrategy(strategy, objectif, sousObjectif, action) {
  // Désélectionner les autres actions
  document.querySelectorAll('.strategy-action.selected').forEach(el => {
    el.classList.remove('selected');
    el.querySelector('.strategy-selected-indicator').style.display = 'none';
  });
  
  // Sélectionner cette action
  const actionCard = event.currentTarget;
  actionCard.classList.add('selected');
  actionCard.querySelector('.strategy-selected-indicator').style.display = 'block';
  
  // Mettre à jour les champs cachés pour compatibilité
  setFieldValue('popup-strategie-objectif', objectif);
  setFieldValue('popup-strategie-sous-objectif', sousObjectif);  
  setFieldValue('popup-strategie-action', action);
  setFieldValue('popup-strategie-id', strategy ? strategy.id : '');
  
  // Mettre à jour le preview dans l'accordéon
  const preview = document.getElementById('selected-strategy-preview');
  if (preview) {
    preview.textContent = `${objectif} → ${sousObjectif} → ${action}`;
  }
  
  // Afficher les détails
  this.updateStrategyDetails(strategy);
}
```

#### 5. Chargement depuis une tâche existante

```javascript
populateStrategyFieldsFromId(strategyId) {
  if (!strategyId) {
    this.resetStrategySelection();
    return;
  }
  
  const strategy = this.kanban.strategiesData.find(s => s.id == strategyId);
  
  if (strategy) {
    // Simuler la sélection dans l'interface accordéon
    this.preSelectStrategyInAccordion(strategy);
    
    // Mettre à jour les champs cachés pour compatibilité
    setFieldValue('popup-strategie-objectif', strategy.objectif);
    setFieldValue('popup-strategie-sous-objectif', strategy.sous_objectif);
    setFieldValue('popup-strategie-action', strategy.action);
    setFieldValue('popup-strategie-id', strategyId);
    
    // Mettre à jour le preview
    const preview = document.getElementById('selected-strategy-preview');
    if (preview) {
      preview.textContent = `${strategy.objectif} → ${strategy.sous_objectif} → ${strategy.action}`;
    }
    
    this.updateStrategyDetails(strategy);
  }
}
```

#### 6. Sauvegarde dans Grist

```javascript
collectFormData() {
  return {
    // ... autres champs
    strategie_id: getFieldValue('popup-strategie-id') || null // Seul champ sauvegardé
  };
}
```

## Flux de données détaillé

### 1. Sélection d'une nouvelle stratégie avec interface accordéon

```
Utilisateur → Ouvre accordéon "Parcourir et sélectionner une stratégie"
    ↓
Application → Génère hiérarchie depuis SSIR_strategie2 :
             📁 Modernisation Infrastructure
               📂 Migration Cloud
                 🎯 Audit Infrastructure Existante (échéance: 2025-12-31, responsable: DSI)
                 🎯 Sélection Fournisseur Cloud
               📂 Virtualisation
                 🎯 Évaluation Serveurs Physiques
             📁 Sécurité Renforcée
               📂 Authentification Multi-Facteur
                 🎯 Choix Solution AMF
    ↓
Utilisateur → Clique sur objectif "Modernisation Infrastructure" (expand)
    ↓
Application → Affiche sous-objectifs et actions avec détails visibles
    ↓
Utilisateur → Clique sur action "Audit Infrastructure Existante"
    ↓
Application → Recherche dans SSIR_strategie2 la stratégie correspondante
             strategie_id = 123
    ↓
Application → Met à jour :
             - Champs cachés (popup-strategie-id = 123)
             - Preview accordéon "Modernisation → Migration Cloud → Audit Infrastructure"
             - Panneau détails (échéance, responsable, portée)
             - État visuel (carte sélectionnée + icône check)
    ↓
Sauvegarde → Envoie à Grist { strategie_id: 123 } dans ssir_principal
```

### 2. Chargement d'une tâche existante avec interface accordéon

```
Chargement → tache.strategie_id = 123
    ↓
Application → Recherche dans SSIR_strategie2 WHERE id = 123
    ↓
Application → Trouve strategy { objectif: "Modernisation", sous_objectif: "Migration Cloud", action: "Audit Infrastructure Existante" }
    ↓
Application → Interface accordéon :
             1. Trouve la carte d'action correspondante dans l'accordéon
             2. Ouvre automatiquement l'objectif parent si fermé
             3. Met en surbrillance la carte d'action sélectionnée (classe .selected + icône check)
             4. Met à jour le preview dans l'en-tête accordéon
             5. Affiche les détails dans le panneau dédié
    ↓
Interface → Utilisateur voit immédiatement :
           - Accordéon avec preview "Modernisation → Migration Cloud → Audit Infrastructure Existante"
           - Objectif "Modernisation Infrastructure" ouvert
           - Carte "Audit Infrastructure Existante" sélectionnée et mise en évidence
           - Détails visibles (échéance: 2025-12-31, responsable: DSI, portée: Nationale)
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

1. **Interface accordéon hiérarchique** : Vue d'ensemble complète avec navigation intuitive
2. **Génération dynamique** : Construction automatique depuis données SSIR_strategie2
3. **Cartes d'action interactives** : Affichage détails (échéance, responsable, portée) intégrés
4. **Sélection visuelle** : État sélectionné avec indicateur + preview dans en-tête
5. **Recherche automatique** : Trouve le `strategie_id` basé sur la sélection d'action
6. **Sauvegarde optimisée** : Seul `strategie_id` est sauvegardé dans ssir_principal
7. **Chargement intelligent** : Pré-sélection et ouverture automatique depuis `strategie_id`
8. **Compatibilité** : Champs cachés pour compatibilité avec ancien système
9. **CSS dédié** : Styling complet avec animations et responsive design
10. **Données de fallback** : Fonctionnement dégradé si données Grist indisponibles

### Ce qui manque ⚠️

1. **Chargement des données Grist** : 
   ```javascript
   // Dans kanban-app.js ou module principal
   this.strategiesData = await this.loadStrategiesFromGrist(); // À implémenter
   // Doit charger depuis SSIR_strategie2 avec tous les champs nécessaires
   ```

2. **Intégration dans le cycle de vie** :
   ```javascript
   // Assurer que strategiesData est disponible avant l'initialisation ModalManager
   await this.loadStrategiesData();
   this.modalManager = new ModalManager(this);
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