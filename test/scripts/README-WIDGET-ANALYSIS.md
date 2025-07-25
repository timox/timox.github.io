# 🔍 Script d'Analyse Widget Grist

## 📋 Description

Version simplifiée du script d'analyse spécialement adaptée aux contraintes de l'environnement widget Grist. Ce script contourne les limitations d'API en utilisant plusieurs méthodes d'accès aux données.

## 🚀 Utilisation dans le Widget

### Méthode recommandée

1. **Ouvrir la page Kanban dans Grist**
   ```
   https://grist.numerique.gouv.fr/o/docs/5UqT5e2BAEUt/kanbanSSIRTEST/p/27
   ```

2. **Ouvrir la console développeur**
   - Appuyer sur `F12`
   - Aller dans l'onglet `Console`

3. **Copier-coller le script**
   ```javascript
   // Copier tout le contenu de analyze-grist-widget.js
   // Le script se lance automatiquement
   ```

### Lancement manuel

Si le script ne se lance pas automatiquement :
```javascript
analyzeGristDataWidget();
```

## 🔧 Adaptations Widget

### Méthodes d'accès aux données
1. **grist.selectedTable.fetchSelectedTable()** - Table sélectionnée
2. **grist.getTable()** - Accès direct à la table
3. **grist.docApi.fetchTable()** - API document (limitée)
4. **gristDocPageModel** - Modèle de page (fallback)

### Limitations gérées
- **Timeout** : Analyse limitée à 50 enregistrements
- **Permissions** : Multiples méthodes d'accès
- **API restreinte** : Diagnostic automatique des APIs disponibles

## 📊 Rapport d'Analyse

### Format de sortie
```
🔍 === ANALYSE DES DONNÉES GRIST (Widget) ===
📊 Récupération des données depuis le widget...
✅ 245 enregistrements trouvés

🗓️ === ANALYSE COLONNE JALONS ===
🎯 === ANALYSE COLONNE STRATEGIE_ID ===

📊 === RAPPORT D'ANALYSE (ÉCHANTILLON) ===
📋 Analysé: 50 enregistrements sur 245

🗓️ JALONS:
   Avec données: 8
   Vides: 42
   ❌ Ancien format: 6
   ✅ Nouveau format: 2
   🚨 Corrompus: 0

🎯 STRATÉGIES:
   Avec données: 15
   Vides: 35
   ❌ Ancien format (number): 8
   ❌ Ancien format (string): 5
   ✅ Nouveau format: 2
   🚨 Corrompus: 0

📈 === ESTIMATIONS TOTALES ===
🗓️ Jalons à corriger (estimation): 29
🎯 Stratégies à corriger (estimation): 64
```

### Données sauvegardées
- **localStorage.gristDataAnalysisWidget** - Résultats complets
- **Format JSON** avec estimations et statistiques

## ⚠️ Diagnostic automatique

En cas d'erreur, le script affiche un diagnostic :
```
🔍 === DIAGNOSTIC DES APIS DISPONIBLES ===
typeof grist: object
typeof gristApp: object  
typeof gristDocPageModel: object
grist.docApi: object
grist.selectedTable: undefined
```

## 🎯 Avantages

✅ **Fonctionne dans le widget** - Pas de restrictions d'API  
✅ **Analyse rapide** - Échantillonnage intelligent  
✅ **Diagnostic intégré** - Détecte les APIs disponibles  
✅ **Estimations fiables** - Extrapolation statistique  
✅ **Sauvegarde locale** - Résultats persistants  

## 📋 Prochaines étapes

1. **Analyser les résultats** de l'échantillon
2. **Valider les estimations** si nécessaire
3. **Créer le script de correction** basé sur ces données
4. **Appliquer les corrections** aux données problématiques

## 🔧 Dépannage

### Script ne démarre pas
- Vérifier l'URL de la page Kanban
- S'assurer d'être dans le bon widget
- Essayer le lancement manuel

### Erreurs de permissions
- Recharger la page
- Vérifier la connexion Grist
- Essayer depuis une session privée

### Résultats incomplets
- L'analyse porte sur un échantillon (50 enregistrements)
- Les estimations sont extrapolées au total
- Pour une analyse complète, utiliser le script principal hors widget