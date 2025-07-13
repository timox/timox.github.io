# 📊 Guide de Contrôle des Logs - Kanban App

## 🎯 Problème Résolu
Ce système intelligent de logs élimine le bruit excessif des messages de debug pour permettre de se concentrer sur l'essentiel.

## 🚀 Utilisation Rapide

Ouvrez la console du navigateur (F12) et utilisez ces commandes :

### Réduire le Bruit de Debug
```javascript
// Mode silencieux - seulement erreurs critiques
logger.setLogLevel('ERROR')

// Mode normal - infos importantes
logger.setLogLevel('INFO')
```

### Activer le Debug pour un Module Spécifique
```javascript
// Debug seulement pour le gestionnaire des tâches
logger.enableModule('KanbanManager')

// Debug seulement pour les actions utilisateur  
logger.enableModule('UserActionManager')

// Debug pour plusieurs modules
logger.enableModule('ModalManager')
logger.enableModule('HistoryManager')
```

### Commandes Utiles
```javascript
// Voir l'aide complète
logger.showHelp()

// Voir les statistiques actuelles
logger.showStats()

// Nettoyer les compteurs (si un log est bloqué)
logger.resetLogCounts()

// Supprimer tous les filtres de modules
logger.clearModuleFilters()
```

## 📋 Niveaux de Log Disponibles

| Niveau | Description | Usage |
|--------|-------------|-------|
| `CRITICAL` | Erreurs critiques uniquement | Production |
| `ERROR` | Erreurs + critiques | Debugging normal |
| `WARN` | Avertissements + erreurs | Monitoring |
| `INFO` | Informations + tout précédent | **Défaut** |
| `DEBUG` | Tout y compris détails techniques | Debug spécifique |

## 🎨 Avantages

✅ **Logs colorés** dans la console pour une lecture facile  
✅ **Anti-spam** - maximum 5 logs identiques par message  
✅ **Filtres par module** - debug ciblé  
✅ **Sauvegarde automatique** du niveau choisi  
✅ **Compatible** avec l'existant - pas de rupture  

## 💡 Conseils d'Usage

### Pour Debug Quotidien
```javascript
logger.setLogLevel('INFO')  // Voir les infos importantes
```

### Pour Debug Spécifique
```javascript
logger.setLogLevel('DEBUG')
logger.enableModule('ModalManager')  // Seulement les modales
```

### Mode Production/Demo
```javascript
logger.setLogLevel('ERROR')  // Silence total sauf erreurs
```

### Reset Complet
```javascript
logger.setLogLevel('INFO')
logger.clearModuleFilters()
logger.resetLogCounts()
```

---

*Le niveau choisi est automatiquement sauvegardé et restauré au prochain chargement.*