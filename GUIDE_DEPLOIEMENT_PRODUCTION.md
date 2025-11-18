# 🚀 GUIDE DE DÉPLOIEMENT EN PRODUCTION

## Version: 18 Novembre 2025

### ✅ DERNIER DÉPLOIEMENT RÉALISÉ

- **📅 Date**: 18 Novembre 2025
- **🔄 Source → Destination**: `kanbantest/` → `kanban/`
- **💾 Sauvegarde**: `backup_kanban_avant_kanbantest_20251118_072058/`
- **📝 Commits Git**:
  - `bcd8042` - Déploiement de kanbantest vers kanban (production)
  - `c294fcb` - Ajout du badge PRODUCTION dans le header
- **🌿 Branche**: `claude/deploy-to-production-013sk6VHqxkwASCBWAYbCvLD`
- **✅ Badge**: Badge "PRODUCTION" vert ajouté dans le header

---

## 🔧 CONTENU DU DÉPLOIEMENT

### Fichiers principaux déployés (17 fichiers modifiés)

**HTML:**
- `index.html` (avec badge PRODUCTION)
- `stats.html`
- `history.html`
- `timeline.html`

**CSS:**
- `css/kanban-base.css`
- `css/kanban-modal.css`
- `css/kanban-responsive.css`

**JavaScript - Core:**
- `js/kanban-app.js`
- `js/core/KanbanManager.js`
- `js/core/EventCentralizer.js`

**JavaScript - Managers:**
- `js/managers/ModalManager.js`
- `js/managers/HistoryManager.js`
- `js/managers/FilterManager.js`
- `js/managers/GristManager.js`
- `js/managers/DatePickerManager.js`
- `js/managers/JalonManager.js`
- `js/managers/ViewManager.js`

**JavaScript - Utils & Config:**
- `js/utils/EventManager.js`
- `js/config/constants.js`

### Statistiques
- **1548 lignes ajoutées**
- **1313 lignes supprimées**
- Architecture modulaire complète déployée

---

## 🚀 PROCÉDURE DE DÉPLOIEMENT

### Déploiement de kanbantest vers kanban (PRODUCTION)

```bash
# 1. Créer une sauvegarde
mkdir -p backup_kanban_avant_kanbantest_$(date +%Y%m%d_%H%M%S)
cp -r kanban backup_kanban_avant_kanbantest_$(date +%Y%m%d_%H%M%S)/

# 2. Copier tous les fichiers de kanbantest vers kanban
cp kanbantest/index.html kanban/
cp kanbantest/stats.html kanban/
cp kanbantest/history.html kanban/
cp kanbantest/timeline.html kanban/
cp -r kanbantest/css/* kanban/css/
cp -r kanbantest/js/* kanban/js/

# 3. Ajouter le badge PRODUCTION dans kanban/index.html
# (ligne 33: ajouter le badge vert après "Tableau Kanban")

# 4. Vérification
git status
git diff kanban/

# 5. Commit et push
git add kanban/
git commit -m "Déploiement de kanbantest vers kanban (production)"
git push origin <branche>
```

### ⚠️ IMPORTANT
- Toujours créer une sauvegarde avant déploiement
- Vérifier les différences avec `git diff` avant de commiter
- Tester en production après déploiement

---

## ✅ CHECKLIST POST-DÉPLOIEMENT

### Tests Obligatoires
- [ ] **Modal historique**: Cliquer sur titre de tâche → ouvre bien l'édition
- [ ] **Édition commentaires**: Sauvegarder un commentaire → pas d'erreur
- [ ] **Page statistiques**: Charger stats.html → pas d'erreur console
- [ ] **Général**: Navigation de base fonctionne

### Tests Approfondis
- [ ] Créer nouvelle tâche
- [ ] Modifier tâche existante  
- [ ] Voir historique d'une tâche
- [ ] Éditer commentaire depuis historique
- [ ] Vérifier stats: alignement stratégique > 0%
- [ ] Badges bureaux sans marqueur 'L'

---

## 🔄 PLAN DE RETOUR ARRIÈRE

En cas de problème critique avec le dernier déploiement :

```bash
# Restauration complète depuis la dernière sauvegarde
rm -rf kanban
cp -r backup_kanban_avant_kanbantest_20251118_072058/kanban kanban

# Vérification
ls -la kanban/

# Commit du rollback
git add kanban/
git commit -m "Rollback: restauration depuis backup_kanban_avant_kanbantest_20251118_072058"
git push origin <branche>
```

### Sauvegardes disponibles
- `backup_kanban_avant_kanbantest_20251118_072058/` (avant déploiement du 18/11/2025)
- `backup_avant_deploy_20251118_060235/` (sauvegarde intermédiaire)

---

## 📊 MONITORING POST-DÉPLOIEMENT

### Logs à Surveiller
- Erreurs JavaScript console navigateur
- Erreurs de chargement des modules ES6
- Problèmes de connexion Grist API

### Indicateurs de Succès
- Modal historique fonctionne correctement
- Statistiques affichent données cohérentes
- Aucune erreur console critique

---

## 📞 SUPPORT ET RÉFÉRENCES

### En cas de problème
1. **Consulter les commits**: `bcd8042` et `c294fcb`
2. **Vérifier sauvegarde**: `backup_kanban_avant_kanbantest_20251118_072058/`
3. **Restaurer si nécessaire** avec la procédure de rollback ci-dessus

### Références Git
- **Branche de déploiement**: `claude/deploy-to-production-013sk6VHqxkwASCBWAYbCvLD`
- **Commit principal**: `bcd8042` - Déploiement de kanbantest vers kanban (production)
- **Commit badge**: `c294fcb` - Ajout du badge PRODUCTION dans le header

### Historique des déploiements
| Date | Source | Commits | Sauvegarde |
|------|--------|---------|------------|
| 18/11/2025 | kanbantest → kanban | bcd8042, c294fcb | backup_kanban_avant_kanbantest_20251118_072058 |

---

**⚠️ IMPORTANT**: Ne pas supprimer les sauvegardes avant confirmation complète que tout fonctionne !

## 🎯 STATUT ACTUEL

✅ **Production active**: Badge "PRODUCTION" visible sur `/kanban/index.html`
✅ **Architecture modulaire**: Déployée et fonctionnelle
✅ **Sauvegardes**: Disponibles pour rollback si nécessaire