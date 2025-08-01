# CHANGELOG - 28 Juillet 2025

## Corrections Majeures

### Fix: Lien de la modale historique qui ouvrait une nouvelle tâche au lieu d'éditer

**Problème:** 
- Dans la modale historique, cliquer sur le titre de la tâche ouvrait le formulaire de création au lieu d'éditer la tâche existante
- La méthode `openTaskModal()` était appelée avec un ID au lieu d'un objet tâche complet

**Solution:**
1. Création d'une nouvelle méthode `openTaskModalById(taskId)` dans ModalManager qui:
   - Accepte un ID de tâche en paramètre
   - Récupère l'objet tâche complet depuis `kanban.currentRecords`
   - Appelle ensuite `openTaskModal(task)` avec l'objet complet

2. Mise à jour de tous les liens dans HistoryManager pour utiliser `openTaskModalById`:
   - Ligne 959: Dans le header de la timeline
   - Ligne 326: Dans le remplacement automatique pour la modal simple

**Fichiers modifiés:**
- `js/managers/ModalManager.js`: Ajout de la méthode `openTaskModalById()`
- `js/managers/HistoryManager.js`: Mise à jour des appels de fonction

## Problèmes Identifiés à Corriger

### Confusion des IDs de tâches dans HistoryManager

**Problèmes critiques identifiés:**

1. **`saveCommentEdit()` (lignes 1813-1834)**
   - Essaie de deviner l'ID de la tâche depuis 4 sources différentes
   - Risque d'éditer les commentaires de la mauvaise tâche
   - Sources consultées: `currentTaskHistory?.id`, `modalManager.currentTaskId`, `currentTaskHistory.id_task`, `modalElement.dataset.taskId`

2. **Variables ambiguës:**
   - `task` vs `taskId` utilisés de manière interchangeable
   - `this.currentTaskHistory` (tâche de l'historique) vs `this.kanban.modalManager.currentTaskId` (tâche en édition)
   - Confusion possible entre l'ID de la tâche dont on affiche l'historique et l'ID de la tâche qu'on veut éditer

3. **`openHistoryModalSeparately()` (ligne 324)**
   - Remplace tous les `openTaskModal` avec le même `taskId`
   - L'historique pourrait contenir des liens vers d'autres tâches

**Actions à entreprendre:**
- Renommer les variables pour clarifier leur usage (`historyTaskId`, `editingTaskId`, `targetTaskId`)
- Centraliser la récupération des IDs dans des méthodes dédiées
- Ajouter des validations pour s'assurer qu'on utilise le bon ID
- Documenter clairement quel ID est utilisé dans chaque contexte

## Corrections Supplémentaires

### Protection contre les appels incorrects à openTaskModal

**Ajout d'une validation des paramètres:**
- La méthode `openTaskModal()` vérifie maintenant que le paramètre est soit `null` soit un objet valide
- Rejet des appels avec un ID numérique (ex: `openTaskModal(123)`)
- Message d'erreur clair indiquant d'utiliser `openTaskModalById()` pour les IDs
- Protection contre la confusion des deux méthodes

**Correction du bug "openTaskModalByIdById":**
- Le remplacement automatique dans HistoryManager vérifie maintenant si c'est déjà `openTaskModalById`
- Évite la double transformation qui créait `openTaskModalByIdById`

## Récupération des Éléments Production

### Page Statistiques Préservée
- **stats.html** : Page identique entre test et production
- **stats-app.js** : Version production récupérée et sauvegardée
- **Différences identifiées** : Version test avait `STRATEGY_DATA` supplémentaire
- **Action** : Restauration de la version production stable

## État du Projet

- ✅ Header moderne restauré avec environnement de test
- ✅ Erreur jQuery corrigée
- ✅ Lien de la modale historique corrigé
- ✅ Protection contre les mauvais appels à openTaskModal
- ✅ Correction du bug de double transformation
- ✅ Page statistiques production récupérée
- ⏳ Clarification des noms de variables en attente