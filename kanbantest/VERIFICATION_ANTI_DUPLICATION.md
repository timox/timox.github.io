# 🚨 Checklist Anti-Duplication - Kanban App

## ⚠️ RÈGLES CRITIQUES

### 📋 **Un seul gestionnaire par action**

| Action | Responsable | ❌ Éviter dans |
|--------|-------------|----------------|
| Bouton Sauvegarder | `SharedTaskModal.js` | app-initializer.js, EventCentralizer.js |
| Bouton Supprimer | `SharedTaskModal.js` | app-initializer.js, EventCentralizer.js |
| Raccourci 'N' (nouvelle tâche) | `SharedTaskModal.js` | app-initializer.js, EventCentralizer.js |
| Raccourci Ctrl+S | `SharedTaskModal.js` | autres fichiers |

### 🔍 **Commandes de Vérification**

```bash
# 1. Vérifier les écouteurs de boutons de modal
grep -rn "addEventListener.*btn-save-task" js/
grep -rn "addEventListener.*btn-delete-task" js/

# 2. Vérifier les raccourcis clavier dupliqués
grep -rn "key.*===.*'n'" js/
grep -rn "key.*===.*'N'" js/
grep -rn "ctrlKey.*key.*===.*'s'" js/

# 3. Vérifier les gestionnaires de formulaire
grep -rn "submit.*form\|form.*submit" js/

# 4. Lister tous les addEventListener par fichier
find js -name "*.js" -exec grep -l "addEventListener" {} \;
```

### ✅ **Résultats Attendus (APRÈS CORRECTION)**

1. **btn-save-task** : Seulement dans `SharedTaskModal.js`
2. **btn-delete-task** : Seulement dans `SharedTaskModal.js`
3. **Raccourci 'N'** : Seulement dans `SharedTaskModal.js`
4. **Raccourci Ctrl+S** : Seulement dans `SharedTaskModal.js`

### 🚨 **Signaux d'Alarme**

- Même action trouvée dans plusieurs fichiers
- Logs "Action AddRecord complète:" qui apparaissent 2+ fois
- Même tâche créée plusieurs fois
- Même modal qui s'ouvre plusieurs fois

### 📝 **Fichiers Désactivés**

- `js/tmp.disabled` - Ancien code legacy désactivé
- Ne **JAMAIS** réactiver sans audit complet

### 🎯 **Test Rapide**

1. Ouvrir console navigateur (F12)
2. Créer une nouvelle tâche
3. Vérifier qu'une seule ligne "Action AddRecord complète:" apparaît
4. Vérifier qu'une seule tâche est créée

---

*Après 25+ versions, cette règle DOIT être respectée !*