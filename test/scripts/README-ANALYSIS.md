# 🔍 Script d'Analyse des Données Grist

## 📋 Description

Ce script analyse les données existantes dans Grist pour identifier les formats obsolètes ou corrompus dans les colonnes `jalons` et `strategie_id`.

## 🚀 Utilisation

### Méthode 1: Depuis l'interface Kanban

1. Ouvrir l'application Kanban dans le navigateur
2. Ouvrir la console développeur (F12 → Console)
3. Copier-coller le contenu de `analyze-grist-data.js`
4. Le script se lance automatiquement

### Méthode 2: Depuis la console

```javascript
// Si le script est déjà chargé
analyzeGristData();
```

## 📊 Rapport Généré

Le script produit un rapport détaillé sur :

### 🗓️ **Colonne JALONS**
- **Vides** : Tâches sans jalons
- **❌ Ancien format** : `{"jalons":[],"lastModified":1753464759114}` (timestamp numérique)
- **✅ Nouveau format** : `{"jalons":[],"lastModified":"2024-01-25T10:30:00.000Z"}` (ISO string)
- **🚨 Corrompus** : JSON invalide ou format inattendu

### 🎯 **Colonne STRATEGIE_ID**
- **Vides** : Tâches sans stratégies
- **❌ Ancien format (number)** : `5` (ID numérique simple)
- **❌ Ancien format (string)** : `"5"` (ID string simple)
- **✅ Nouveau format** : `[["L", 5], ["L", 12]]` (références multiples Grist)
- **🚨 Corrompus** : Format inattendu

## 📝 Exemples de Sortie

```
🔍 === ANALYSE DES DONNÉES GRIST ===
📊 Récupération des données depuis Grist...
✅ 245 enregistrements trouvés

🗓️ === ANALYSE COLONNE JALONS ===
🎯 === ANALYSE COLONNE STRATEGIE_ID ===

📊 === RAPPORT D'ANALYSE ===

🗓️ JALONS:
   Total avec jalons: 15
   Vides: 230
   ❌ Ancien format (timestamp numérique): 12
   ✅ Nouveau format (ISO string): 3
   🚨 Corrompus/invalides: 0

🎯 STRATÉGIES:
   Total avec stratégies: 78
   Vides: 167
   ❌ Ancien format (string): 23
   ❌ Ancien format (number): 45
   ✅ Nouveau format (références multiples): 10
   🚨 Corrompus/invalides: 0

🎯 === RECOMMANDATIONS ===
⚠️ CORRECTIONS RECOMMANDÉES:
   📅 12 jalons à convertir (timestamp → ISO date)
   🎯 68 stratégies à convertir (ID simple → références multiples)

💡 Utilisez le script de correction pour migrer ces données.
💾 Résultats sauvegardés dans localStorage.gristDataAnalysis
```

## 💾 Sauvegarde des Résultats

Les résultats sont automatiquement sauvegardés dans `localStorage.gristDataAnalysis` pour utilisation ultérieure par le script de correction.

## ⚠️ Important

- **Lecture seule** : Ce script ne modifie AUCUNE donnée
- **Sécurisé** : Analyse uniquement, pas de risque
- **Rapide** : Traite toutes les données en quelques secondes

## 📋 Prochaines Étapes

1. **Analyser les résultats** de ce script
2. **Décider** si une correction est nécessaire
3. **Utiliser le script de correction** (si créé) pour migrer les données problématiques

## 🔧 Dépannage

### Script ne fonctionne pas
- Vérifier que Grist API est disponible (`typeof grist !== 'undefined'`)
- Lancer depuis l'interface Kanban, pas depuis un fichier local

### Erreurs de permissions
- S'assurer d'être connecté à Grist avec les bonnes permissions
- Vérifier l'accès à la table `Ssir_principale_task`

### Résultats inattendus
- Vérifier les noms des colonnes dans Grist
- Contrôler que les données existent bien dans les colonnes analysées