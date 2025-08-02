# 🚀 Roadmap Kanban SSIR

## ✅ Fonctionnalités implémentées

### Timeline et visualisation
- [x] Page timeline graphique avec Vis.js
- [x] Support multi-tâches par statut (terminées, en cours, bloquées, validation)
- [x] Jalons avec symboles distinctifs 🏁 et infobulles
- [x] Correction superposition timeline/détail chronologique
- [x] Déploiement en production avec navigation intégrée

## 📋 Fonctionnalités en réflexion

### Système de liens entre jalons (reporté)
**Concept** : Permettre de lier des jalons entre eux pour créer des dépendances de tâches
- Exemple : Jalon "Réunion validation" (Tâche A) → déclenche → Jalon "Début travaux" (Tâche B)

**Approche technique identifiée** :
- Interface de recherche dans la modal des jalons
- Structure JSON : `jalon.triggers = [{taskId, jalonId, taskTitle, jalonTitle}]`
- Système de déclencheurs avec recherche par #ID ou titre

**Questions à résoudre** :
1. **Type de contraintes** :
   - Informatives (couleurs, alertes) ?
   - Semi-automatiques (propositions de dates) ?
   - Strictes (blocages) ?

2. **Gestion des dépendances** :
   - Comment gérer les cycles ?
   - Que faire si un jalon déclencheur est supprimé ?
   - Calcul automatique des dates ou manuel ?

3. **Interface utilisateur** :
   - Visualisation des dépendances dans la timeline ?
   - Notifications quand un déclencheur est atteint ?
   - Validation des contraintes avant sauvegarde ?

**Recommandation** : Commencer par une approche informative simple (couleurs, tooltips) avant d'ajouter de l'automatisation.

## 🎯 Prochaines étapes possibles

### Court terme
- [ ] Améliorations de l'interface existante
- [ ] Optimisations de performance
- [ ] Tests utilisateur du système de jalons actuel

### Moyen terme
- [ ] Étude d'usage des jalons existants
- [ ] Définition précise des besoins de dépendances
- [ ] Prototype simple de visualisation des liens

### Long terme
- [ ] Implémentation du système de liens (si validé)
- [ ] Intégration avec la timeline graphique
- [ ] Outils de planification avancée

---

*Cette roadmap est évolutive et sera mise à jour selon les besoins utilisateur et les retours d'expérience.*