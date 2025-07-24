# 📋 Instructions de Migration vers la Production

## 🚨 **Problèmes identifiés et statut des corrections**

### ✅ **Problèmes corrigés dans ce commit:**
1. **Édition de commentaires dans l'historique** - Fonction améliorée avec gestion du focus, z-index et scrollIntoView
2. **Interface utilisateur** - Modal élargie, timeline compacte, layout réorganisé
3. **Gestion des jalons** - Format JSON avec lastModified timestamp fonctionnel

### ⚠️ **Problèmes en attente de la migration:**
1. **Sauvegarde des jalons** - Fonctionnent en local mais filtrés avant envoi à Grist 
2. **Sauvegarde des stratégies multiples** - Même problème que les jalons

---

## 🗃️ **Changements de Base de Données OBLIGATOIRES**

### **ÉTAPE 1: Ajouter la colonne `strategie_ids` dans Grist**

**📋 Actions requises:**
```sql
-- Dans l'interface Grist, ajouter une nouvelle colonne:
Nom: strategie_ids
Type: Text
Description: IDs des stratégies multiples (format JSON array)
Valeur par défaut: []
```

**🔍 Vérification:**
- La colonne doit accepter du texte JSON au format: `["id1", "id2", "id3"]`
- Vérifier que les données existantes restent intactes

### **ÉTAPE 2: Vérifier la colonne `jalons`**
```sql
-- Colonne existante - vérifier le format:
Nom: jalons  
Type: Text
Format attendu: {"jalons": [...], "lastModified": timestamp}
```

---

## 🔧 **Modifications de Code à Effectuer**

### **SUPPRESSION du filtre temporaire strategie_ids**

**📁 Fichier:** `js/managers/ModalManager.js`  
**📍 Lignes:** 1237-1242

**❌ CODE À SUPPRIMER:**
```javascript
// TEMPORAIRE : Supprimer strategie_ids jusqu'à ce que la colonne soit créée
// TODO: Enlever cette ligne quand la colonne strategie_ids sera ajoutée à Grist
if (gristData.strategie_ids !== undefined) {
  console.log('⚠️ Suppression temporaire du champ strategie_ids (colonne pas encore créée)');
  delete gristData.strategie_ids;
}
```

**⚠️ IMPORTANT:** Cette suppression est la SEULE modification de code nécessaire après la création de la colonne.

---

## 📋 **Procédure de Migration Étape par Étape**

### **Phase 1: Préparation (30 min)**

1. **Backup de la base de données Grist**
   ```bash
   # Exporter toutes les données via l'interface Grist
   # Sauvegarder le workspace complet
   ```

2. **Test du code actuel**
   ```bash
   # Vérifier que l'application fonctionne
   # Tester les fonctionnalités existantes
   # Noter les jalons/stratégies non sauvegardés
   ```

### **Phase 2: Modification de la Base de Données (15 min)**

3. **Créer la colonne strategie_ids**
   - Aller dans Grist → Table structure
   - Ajouter colonne `strategie_ids` (Type: Text)
   - Valeur par défaut: `[]`

4. **Vérifier la colonne jalons**
   - Confirmer qu'elle accepte le format JSON
   - Tester avec: `{"jalons":[],"lastModified":1640995200000}`

### **Phase 3: Déploiement du Code (10 min)**

5. **Copier les fichiers modifiés**
   ```bash
   # Copier depuis /test/ vers /kanban/ (ou répertoire de prod)
   cp -r /test/js/managers/ /kanban/js/
   cp -r /test/css/ /kanban/
   cp /test/index.html /kanban/
   ```

6. **Supprimer le filtre temporaire**
   - Éditer `js/managers/ModalManager.js`
   - Supprimer les lignes 1237-1242 (voir section "CODE À SUPPRIMER")

### **Phase 4: Tests de Validation (20 min)**

7. **Test des jalons**
   - Ouvrir une tâche
   - Ajouter un jalon → Vérifier sauvegarde
   - Modifier un jalon → Vérifier persistance
   - Recharger la page → Vérifier chargement

8. **Test des stratégies multiples**
   - Sélectionner plusieurs stratégies
   - Sauvegarder la tâche
   - Vérifier affichage des badges
   - Tester les infobulles

9. **Test de l'édition de commentaires**
   - Ouvrir l'historique d'une tâche
   - Cliquer "Modifier" sur un commentaire
   - Vérifier que le curseur apparaît
   - Modifier et sauvegarder

### **Phase 5: Validation Finale (15 min)**

10. **Tests en production**
    - Créer une tâche complète avec jalons et stratégies
    - Tester le drag & drop
    - Vérifier les modales et l'historique
    - Confirmer la persistance après rafraîchissement

---

## 🐛 **Solutions de Dépannage**

### **Problème: Jalons toujours pas sauvegardés**
```javascript
// Vérifier dans la console navigateur:
console.log(gristData.jalons); // Doit contenir du JSON
// Si undefined, le filtre temporaire n'a pas été supprimé
```

### **Problème: Stratégies pas sauvegardées**
```javascript
// Vérifier:
console.log(gristData.strategie_ids); // Doit contenir ["id1", "id2"]
// Si undefined, la colonne n'existe pas ou le filtre est encore actif
```

### **Problème: Focus impossible dans l'édition**
```javascript
// Vérifier z-index et propriétés:
const textarea = document.getElementById('accordion-comment-edit-text');
console.log({
  pointerEvents: getComputedStyle(textarea).pointerEvents,
  zIndex: getComputedStyle(textarea).zIndex,
  disabled: textarea.disabled
});
```

---

## 📊 **Validation Post-Migration**

### **Checklist de Validation:**

- [ ] **Base de Données**
  - [ ] Colonne `strategie_ids` créée et fonctionnelle
  - [ ] Colonne `jalons` accepte le nouveau format JSON
  - [ ] Pas de données perdues pendant la migration

- [ ] **Code**
  - [ ] Filtre temporaire `strategie_ids` supprimé
  - [ ] Aucune erreur JavaScript en console
  - [ ] Tous les fichiers copiés correctement

- [ ] **Fonctionnalités**
  - [ ] Jalons s'ajoutent et se sauvegardent
  - [ ] Stratégies multiples fonctionnelles
  - [ ] Édition de commentaires avec focus correct
  - [ ] Interface réorganisée (Projet/Urgence/Impact sur une ligne)
  - [ ] Timeline compacte dans l'historique

- [ ] **Performance**
  - [ ] Sauvegarde rapide (sans debug logs excessifs)
  - [ ] Pas de régression sur les fonctionnalités existantes
  - [ ] Drag & drop toujours fonctionnel

---

## ⏰ **Temps Estimé Total: 1h30**

- Préparation: 30 min
- Migration DB: 15 min  
- Déploiement: 10 min
- Tests: 20 min
- Validation: 15 min

---

## 🆘 **Rollback d'Urgence**

En cas de problème critique:

1. **Restaurer le backup Grist**
2. **Remettre l'ancien code:**
   ```bash
   # Restaurer depuis backup
   cp -r /backup/kanban/ /production/
   ```
3. **Ajouter temporairement le filtre:**
   ```javascript
   // Dans ModalManager.js, ligne 1237:
   if (gristData.strategie_ids !== undefined) {
     delete gristData.strategie_ids;
   }
   ```

---

**🎯 Contact:** Pour toute question durant la migration, vérifier les logs du navigateur et les messages de debug dans la console.

**📝 Notes:** Cette migration résoudra définitivement les problèmes de sauvegarde des jalons et stratégies tout en améliorant l'expérience utilisateur.