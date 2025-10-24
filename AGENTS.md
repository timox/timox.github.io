# Spécifications Kanban V3.0 - Dashboard + Timeline

## 🎯 Objectif

Améliorer le système Kanban existant avec :
1. Taxonomie à 2 dimensions (prévisibilité + type)
2. Dashboard de pilotage avec alertes
3. Vue Timeline interactive (Vis.js)
4. Système de pause et tracking dette technique

**IMPORTANT :** Ce document contient des **propositions d'architecture**. L'implémentation reste à ta charge. Adapte selon les contraintes du code existant.

---

## 📊 Modifications Grist (MANUEL - Utilisateur)

### Nouvelles colonnes à créer

| Colonne | Type | Options | Défaut |
|---------|------|---------|--------|
| `previsibilite` | Choice | Imprévisible, Prévisible | Imprévisible |
| `type_tache` | Choice | Incident, Support, MCO, Projet, Overhead | Support |
| `est_dette_technique` | Toggle | - | No |
| `temps_estime_heures` | Numeric | - | - |

### Modifications
- Ajouter statut : `En pause`
- Vérifier existence : `date_debut`, `date_echeance`

---

## 💻 Architecture proposée

### Nouvelles constantes

```javascript
// Taxonomie
PREVISIBILITE = [{id, emoji, couleur, classe}, ...]
TYPE_TACHES = [{id, emoji, couleur, classe}, ...]

// Cibles (modifiables)
CIBLES_POURCENTAGES = {
  previsibilite: {Imprévisible: {min, max, ideal}, ...},
  type: {Incident: {min, max, ideal}, ...}
}

// Semaine type (modifiable)
SEMAINE_TYPE = {
  heures_totales: 40,
  repartition: {Imprévisible: 16, Prévisible: 24}
}

// Seuils
SEUILS_AGE = {FRESH: 3, NORMAL: 7, WARNING: 14, CRITICAL: 999}
SEUILS_ALERTES = {imprevisible_critique: 50, projet_critique: 15, ...}

// Timeline
TIMELINE_GROUPEMENTS = [{id, label, icon}, ...]
```

Mettre à jour `REQUIRED_COLUMNS` et `OPTIONAL_COLUMNS`.

---

### Dashboard - Fonctions à implémenter

#### `calculerStatistiquesDetaillees()`
**Rôle :** Calculer les stats pour le dashboard

**Retour :**
```javascript
{
  total, enPause,
  parPrevisibilite: {id: {emoji, couleur, count, pourcent, cible, statut, ecart}},
  parType: {id: {emoji, couleur, count, pourcent, cible, statut, ecart}},
  tempsEstime: {id: heures},
  dettesTechniques: count
}
```

**Logique :**
- Filtrer tâches actives (exclure Terminé, En pause)
- Calculer % par prévisibilité et par type
- Déterminer statut : ok/warning/critical selon cibles
- Sommer temps estimé si disponible

---

#### `genererAlertes()`
**Rôle :** Générer alertes selon seuils

**Retour :** `[{niveau, icone, titre, message, actions[], details[]}, ...]`

**Alertes à détecter :**
1. Imprévisible > 50% → critique
2. Imprévisible > 45% → warning
3. Projets < 15% → critique
4. Projets < 20% → warning
5. Dettes techniques > 90j
6. Tâches bloquées > 7j

---

#### `genererDashboardHTML()`
**Rôle :** Générer HTML du dashboard

**Structure proposée :**
```
<div class="dashboard-container">
  <div class="dashboard-alertes">[Alertes si présentes]</div>
  <div class="dashboard-header">[Titre + total tâches]</div>
  <div class="dashboard-grid">
    <div class="section-previsibilite">[Stats prévisibilité]</div>
    <div class="section-types">[Stats par type]</div>
  </div>
  <div class="dashboard-capacite">[Capacité projet: théorique vs réel]</div>
  <div class="dashboard-semaine-type">[Si temps estimé disponible]</div>
  <div class="dashboard-footer">[Infos: pause, dettes]</div>
</div>
```

---

### Timeline - Architecture proposée

#### Dépendance
```html
<link href="https://unpkg.com/vis-timeline@7.7.3/styles/vis-timeline-graph2d.min.css" />
<script src="https://unpkg.com/vis-timeline@7.7.3/standalone/umd/vis-timeline-graph2d.min.js"></script>
```

#### Propriétés KanbanManager
```javascript
this.timeline = null
this.timelineContainer = document.getElementById('timeline-container')
this.currentView = 'kanban' // 'kanban' | 'timeline'
this.timelineGroupement = 'personne' // Groupement actif
```

#### Fonctions Timeline

**`initTimeline()`**
- Convertir records → items Vis.js
- Créer groupes selon groupement actif
- Configurer options (édition, locale, template)
- Créer/mettre à jour instance Vis.js
- Attacher event handlers (select, move)

**`convertRecordsToTimelineItems()`**
- Filtrer tâches actives avec dates
- Pour chaque tâche :
  - Déterminer start/end (type: 'range' | 'point')
  - Déterminer groupe selon `timelineGroupement`
  - Appliquer couleur selon type
  - Classe CSS selon prévisibilité
  - Stocker customData (priorité, type, statut, etc.)

**`getTimelineGroup(record)`**
- Switch selon `timelineGroupement`:
  - 'personne' → `record.qui[1]`
  - 'type' → `record.type_tache`
  - 'previsibilite' → `record.previsibilite`
  - 'bureau' → `record.bureau[1]`
  - 'projet' → `record.projet`

**`createTimelineGroups()`**
- Générer liste de groupes selon `timelineGroupement`
- Format : `[{id, content, order}, ...]`
- Ajouter groupe "Non défini" si nécessaire

**`createTimelineItemTemplate(item)`**
- Template HTML pour affichage item
- Inclure badges (priorité, dette technique)
- Titre + projet si présent

**`handleTimelineMove(item, callback)`**
- Extraire nouvelles dates de `item.start/end`
- Si changement de groupe, extraire nouvelle valeur
- Construire objet row avec changements
- `grist.docApi.applyUserActions(['UpdateRecord', ...])`
- Mettre à jour `currentRecords` localement
- callback(item) si succès, callback(null) si erreur

**`switchView(view)`**
- Afficher/masquer containers selon vue
- Mettre à jour classes boutons
- Rafraîchir vue active (Kanban ou Timeline)
- Timeline: centrer sur aujourd'hui

**`changeTimelineGroupement(nouveau)`**
- Mettre à jour `timelineGroupement`
- Rafraîchir Timeline si vue active

---

### Modifications existantes

#### `createTaskElementHTML(record)`
**Ajouter badges :**
- Badge prévisibilité (emoji dans cercle)
- Badge type (emoji + label)
- Badge dette technique (si `est_dette_technique`)
- Badge âge (calculé avec `calculerAgeTache()`)

#### `refreshKanban()`
**Modifier :**
- Injecter dashboard en début : `dashboardHTML + kanbanHTML`
- Wrapper boards dans `.kanban-boards-container`

#### `openPopup(tache)` / `saveTask()`
**Ajouter champs :**
- `popup-previsibilite` (select)
- `popup-type-tache` (select)
- `popup-temps-estime` (number, optionnel)
- `popup-dette-technique` (checkbox, optionnel)

Dans `saveTask()`, inclure ces champs dans `row` avant sauvegarde.

#### `initModalWithOptions()`
**Peupler selects :**
- `popup-previsibilite` avec PREVISIBILITE
- `popup-type-tache` avec TYPE_TACHES

#### `init()`
**Ajouter event listeners :**
- `btn-view-kanban` → `switchView('kanban')`
- `btn-view-timeline` → `switchView('timeline')`
- `timeline-groupby` → `changeTimelineGroupement(value)`

---

## 🎨 CSS proposé

### Zones principales
```css
.dashboard-container { /* Conteneur principal */ }
.dashboard-alertes { /* Zone alertes */ }
.dashboard-grid { /* Grid 2 colonnes */ }
.dashboard-capacite { /* Capacité projet */ }
.dashboard-semaine-type { /* Semaine type */ }

.view-selector { /* Boutons Kanban/Timeline */ }
#timeline-container { /* Conteneur Timeline */ }
.timeline-controls { /* Contrôles groupement */ }
```

### Timeline - Classes Vis.js à customiser
```css
.timeline-imprevisible { border-left: 4px solid #dc3545 !important; }
.timeline-previsible { border-left: 4px solid #198754 !important; }
.vis-current-time { background-color: #dc3545 !important; }
.vis-item:hover { box-shadow: ...; }
.vis-item.vis-selected { border-width: 2px; }
```

### Badges
```css
.prev-badge { /* Badge prévisibilité */ }
.type-badge { /* Badge type */ }
.dette-badge { /* Badge dette */ }
.age-badge { /* Badge âge */ }
```

Adapter couleurs selon contexte (age-fresh, age-warning, age-critical).

---

## 📝 HTML proposé

### Structure page
```html
<!-- Sélecteur vue -->
<div class="view-selector">
  <button id="btn-view-kanban" class="btn active">Kanban</button>
  <button id="btn-view-timeline" class="btn">Timeline</button>
  <div class="timeline-controls" style="display:none">
    <select id="timeline-groupby">
      <option value="personne">Personne</option>
      <option value="type">Type</option>
      <option value="previsibilite">Prévisibilité</option>
      <option value="bureau">Bureau</option>
      <option value="projet">Projet</option>
    </select>
  </div>
</div>

<!-- Timeline -->
<div id="timeline-container" style="display:none"></div>

<!-- Kanban (existant) -->
<div id="kanban-container"></div>
```

### Modal - Champs additionnels
```html
<select id="popup-previsibilite">
  <option value="Imprévisible">⚡ Imprévisible</option>
  <option value="Prévisible">📅 Prévisible</option>
</select>

<select id="popup-type-tache">
  <option value="Incident">🔥 Incident</option>
  <option value="Support">💬 Support</option>
  <option value="MCO">🔧 MCO</option>
  <option value="Projet">🚀 Projet</option>
  <option value="Overhead">📋 Overhead</option>
</select>

<input type="number" id="popup-temps-estime" step="0.5" />
<input type="checkbox" id="popup-dette-technique" />
```

---

## 🔧 Logique métier

### Calcul âge tâche
```
Age (jours) = (Aujourd'hui - date_debut) / 86400000 ms
Classe:
  0-3j → age-fresh
  4-7j → age-normal
  8-14j → age-warning
  >14j → age-critical
```

### Calcul capacité projet
```
Capacité théorique = CIBLES_POURCENTAGES.type.Projet.ideal
Capacité réelle = % tâches type=Projet dans actives
Écart = réel - théorique
Capacité perdue = max(0, %Imprévisible - 40)
```

### Détermination statut alerte
```
Si % < cible.min → critical
Si % > cible.max → warning
Sinon → ok
```

---

## 🎯 Workflow Timeline

### Création tâche
1. Ouvrir modal (nouveau ou existant)
2. Remplir champs + prévisibilité + type + dates
3. `saveTask()` → Grist
4. Si vue Timeline active → `initTimeline()`

### Drag & drop Timeline
1. User déplace item
2. Vis.js trigger `onMove(item, callback)`
3. `handleTimelineMove()` :
   - Extraire nouvelles dates/groupe
   - Construire row
   - Sauvegarder Grist
   - callback(item) ou callback(null)
4. Si succès → Timeline se met à jour automatiquement

### Changement groupement
1. User change select `timeline-groupby`
2. `changeTimelineGroupement(value)`
3. `initTimeline()` avec nouveau groupement
4. Timeline reconstruite avec nouveaux groupes

---

## ⚙️ Options Vis.js recommandées

```javascript
{
  stack: true,
  zoomable: true,
  moveable: true,
  orientation: 'top',
  start: new Date(Date.now() - 7*86400000),
  end: new Date(Date.now() + 30*86400000),
  editable: {
    updateTime: true,
    updateGroup: true,
    remove: false
  },
  locale: 'fr',
  template: (item) => createTimelineItemTemplate(item),
  onMove: (item, callback) => handleTimelineMove(item, callback)
}
```

---

## 📊 Format données Timeline

### Item Vis.js
```javascript
{
  id: record.id,
  content: record.titre,
  start: new Date(record.date_debut),
  end: new Date(record.date_echeance) | null,
  type: 'range' | 'point',
  group: getTimelineGroup(record),
  className: 'timeline-imprevisible timeline-projet',
  style: 'background-color: #198754; border-color: #198754;',
  customData: {priorite, type, previsibilite, statut, projet, est_dette}
}
```

### Groupe Vis.js
```javascript
{
  id: 'Alex',
  content: '<i class="bi bi-person"></i> Alex',
  order: 0
}
```

---

## ✅ Checklist implémentation

### Phase 1 : Grist (UTILISATEUR)
- [ ] Créer colonnes `previsibilite`, `type_tache`
- [ ] Créer `temps_estime_heures`, `est_dette_technique` (optionnel)
- [ ] Ajouter statut "En pause"

### Phase 2 : Dashboard (TOI)
- [ ] Ajouter constantes (PREVISIBILITE, TYPE_TACHES, CIBLES, etc.)
- [ ] Implémenter `calculerStatistiquesDetaillees()`
- [ ] Implémenter `genererAlertes()`
- [ ] Implémenter `genererDashboardHTML()`
- [ ] Modifier `refreshKanban()` pour inclure dashboard
- [ ] Modifier `createTaskElementHTML()` avec nouveaux badges
- [ ] Ajouter CSS dashboard

### Phase 3 : Timeline (TOI)
- [ ] Ajouter CDN Vis.js au HTML
- [ ] Ajouter propriétés Timeline au constructor
- [ ] Implémenter `initTimeline()`
- [ ] Implémenter `convertRecordsToTimelineItems()`
- [ ] Implémenter `getTimelineGroup()`
- [ ] Implémenter `createTimelineGroups()`
- [ ] Implémenter `createTimelineItemTemplate()`
- [ ] Implémenter `handleTimelineMove()`
- [ ] Implémenter `switchView()`
- [ ] Implémenter `changeTimelineGroupement()`
- [ ] Ajouter HTML (sélecteur vue, timeline-container)
- [ ] Ajouter CSS Timeline
- [ ] Ajouter event listeners dans `init()`

### Phase 4 : Modal (TOI)
- [ ] Ajouter champs HTML (previsibilite, type_tache, temps_estime, dette)
- [ ] Modifier `openPopup()` pour remplir nouveaux champs
- [ ] Modifier `saveTask()` pour sauvegarder nouveaux champs
- [ ] Modifier `initModalWithOptions()` pour peupler selects

### Phase 5 : Tests
- [ ] Tester dashboard + alertes
- [ ] Tester Timeline (tous groupements)
- [ ] Tester drag & drop Timeline
- [ ] Tester basculement Kanban ↔ Timeline
- [ ] Tester création/modification tâches

---

## ⚠️ Points d'attention

1. **Colonnes Grist** : Utiliser `availableColumns.has()` avant d'accéder aux colonnes optionnelles
2. **Dates Timeline** : Gérer cas où `date_debut` ou `date_echeance` absentes
3. **Groupes vides** : Ajouter groupe "Non défini" pour items sans assignation
4. **Performance** : Si >500 tâches, envisager filtrage/pagination Timeline
5. **Synchronisation** : Éviter conflits entre mises à jour Kanban et Timeline

---

## 🎯 Résultat attendu

- Dashboard fonctionnel avec alertes
- Vue Kanban avec badges enrichis
- Vue Timeline avec 5 groupements
- Drag & drop dates/groupes fonctionnel
- Synchronisation Grist bidirectionnelle
- Responsive (desktop prioritaire)

---

## 📚 Ressources

- Vis.js Timeline : https://visjs.github.io/vis-timeline/docs/timeline/
- Bootstrap Icons : https://icons.getbootstrap.com/
- Grist API : Documentation Grist existante

---

**Note finale :** Ces spécifications sont des **propositions**. Adapte l'architecture selon :
- Structure code existant
- Contraintes techniques
- Préférences d'implémentation
- Performance

Concentre-toi d'abord sur Dashboard (Phase 2), puis Timeline (Phase 3) si temps disponible.

---

**Version :** 3.0  
**Date :** 24 octobre 2025  
**Statut :** Spécifications prêtes pour implémentation
