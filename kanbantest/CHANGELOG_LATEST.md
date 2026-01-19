# 📈 Changelog - 2025-08-20

## 🧭 **Mise à jour V3 : stratégie & dashboard**

### ✅ **Renommage stratégie**
- Le champ stratégique est désormais **`axe_strategique`** (remplace `action`) dans les mappings et l’UI.
- Les libellés UI parlent d’**axe stratégique** pour éviter toute confusion métier.

### ✅ **Dashboard V3**
- Ajout du dashboard V3 (statistiques, alertes, capacité).
- Affichage d’un avertissement si les colonnes V3 sont absentes.
- Indication des tâches sans prévisibilité/type.

---

# 📈 Changelog - 2025-07-25

## 🎯 **Corrections Critiques Appliquées**

### 🚨 **Problème 1 : Reset trop agressif des formulaires**
**Symptôme** : Les champs de formulaire se vidaient à chaque sauvegarde  
**Cause** : `resetTaskForm()` appelé à chaque ouverture de modal, même pour la même tâche  
**Solution** : Reset intelligent conditionnel  

```javascript
// ✅ AVANT
this.resetTaskForm(); // Toujours

// ✅ APRÈS  
const isChangingTask = !task || this.currentTaskId !== task?.id;
if (isChangingTask) {
  this.resetTaskForm();
}
```

**Impact** : Fini les champs qui sautent lors de la sauvegarde d'une tâche existante

---

### 🚨 **Problème 2 : Focus impossible en édition de commentaires**
**Symptôme** : Impossible de taper dans la zone de texte lors de l'édition de commentaires  
**Cause** : Système de focus hyper-complexe avec 5 tentatives et multiples fallbacks  
**Solution** : Focus direct simple  

```javascript
// ❌ AVANT : 70 lignes de code complexe
setTimeout(() => {
  const attemptFocus = (attempt = 1) => {
    // 5 tentatives avec multiples méthodes...
  };
  attemptFocus();
}, 200);

// ✅ APRÈS : Focus direct
textArea.focus();
```

**Impact** : Édition de commentaires fonctionnelle immédiatement

---

### 🚨 **Problème 3 : Code DOM vanilla complexe**
**Symptôme** : Code de manipulation DOM verbeux et fragile  
**Cause** : Utilisation de `document.querySelector` et `forEach` au lieu de jQuery  
**Solution** : Migration vers jQuery pour la simplicité et fiabilité  

```javascript
// ❌ AVANT : Code DOM vanilla
document.querySelectorAll('.strategy-action.selected').forEach(el => {
  el.classList.remove('selected');
  const indicator = el.querySelector('.strategy-selected-indicator');
  if (indicator) indicator.style.display = 'none';
});

// ✅ APRÈS : jQuery simple
$('.strategy-action.selected').removeClass('selected');
$('.strategy-selected-indicator').hide();
```

**Impact** : Code plus lisible, plus fiable, plus maintenable

---

## 🔧 **Améliorations Techniques**

### **1. Simplification des Event Listeners**
- Suppression des listeners de debug complexes dans `HistoryManager`
- Focus direct sans timeouts ni fallbacks multiples
- Code plus prévisible et plus rapide

### **2. Standardisation jQuery**
- Migration du code DOM vanilla vers jQuery dans `resetTaskForm()`
- Migration du code DOM vanilla vers jQuery dans `resetStrategySelection()`
- Utilisation cohérente de jQuery partout dans l'application

### **3. Optimisation du Reset des Formulaires**
- Reset intelligent : seulement si changement de tâche
- Utilisation de `$('#form')[0].reset()` au lieu de fonctions custom
- Code plus court et plus efficace

---

## 📝 **Corrections de Documentation**

### **Architecture.md**
- Suppression de la documentation obsolète sur `SimpleClickHandler` (n'existe pas)
- Mise à jour avec l'état réel du système d'event listeners
- Documentation des améliorations récentes

### **État Réel vs Documentation**
- La documentation mentionnait un système centralisé qui n'existait pas
- Mise à jour pour refléter l'architecture réelle : managers séparés avec jQuery
- Ajout des patterns de code actuellement utilisés

---

## 🎯 **Résultats Attendus**

### **✅ Fonctionnalités Corrigées**
1. **Édition de commentaires** : Focus immédiat et fonctionnel
2. **Sauvegarde de tâches** : Plus de champs qui sautent
3. **Reset de formulaires** : Seulement quand nécessaire
4. **Interface utilisateur** : Plus réactive et prévisible

### **✅ Code Amélioré**
- **-50 lignes** de code complexe supprimées
- **+jQuery** standardisation pour la fiabilité
- **+Lisibilité** du code de manipulation DOM
- **+Maintenabilité** avec des patterns simples

### **✅ Performance**
- Suppression des timeouts et délais inutiles
- Focus immédiat au lieu de 5 tentatives
- Reset conditionnel au lieu de systématique

---

## 🚨 **Points de Vigilance**

### **Code Simplifié**
- Le code est maintenant plus simple mais dépend de jQuery
- Les fallbacks complexes ont été supprimés au profit de la simplicité
- Si un problème de focus survient, il faudra le corriger directement plutôt que d'ajouter des fallbacks

### **Reset Intelligent**
- Le reset ne se fait plus systématiquement
- Si de nouveaux bugs de propagation apparaissent, vérifier la logique `isChangingTask`
- Tester particulièrement les changements de tâche successifs

---

## 🔍 **Tests Recommandés**

### **Flux Critiques à Tester**
1. **Édition de commentaires** : Ouvrir l'historique → cliquer éditer → taper du texte
2. **Sauvegarde de tâches** : Modifier une tâche → sauvegarder → vérifier que les champs restent
3. **Changement de tâches** : Ouvrir tâche A → ouvrir tâche B → vérifier le reset
4. **Nouvelle tâche** : Créer nouvelle tâche → vérifier que le formulaire est vide

### **Régression à Surveiller** 
- Propagation des stratégies entre tâches
- Propagation des jalons entre tâches  
- Édition de commentaires qui ne fonctionne pas
- Champs de formulaire qui se vident inopinément

---

*Corrections appliquées le 2025-07-25*  
*Version : Simplification & jQuery*
