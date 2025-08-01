# 📋 Guide de Gestion des Logs pour la Production

## 🎯 Objectif
Contrôler facilement les logs en production sans modifier le code ligne par ligne.

## 🔧 Configuration des Niveaux de Log

### Niveaux disponibles (par ordre de priorité) :
- **CRITICAL** (0) : Erreurs critiques uniquement
- **ERROR** (1) : Erreurs + critiques  
- **WARN** (2) : Avertissements + erreurs + critiques
- **INFO** (3) : Informations + tout ce qui précède (**DÉFAUT**)
- **DEBUG** (4) : Tout y compris debug détaillé

## 🚀 Déploiement en Production

### 1. Configuration recommandée pour la production
```javascript
// Dans la console du navigateur ou dans un script d'initialisation
logger.setLogLevel('WARN');  // Ne montrer que les warnings et erreurs
```

### 2. Configuration pour les tests
```javascript
logger.setLogLevel('DEBUG');  // Voir tous les logs de debug
```

### 3. Configuration pour le développement
```javascript
logger.setLogLevel('INFO');   // Niveau par défaut équilibré
```

## 💻 Commandes Console

### Changer le niveau globalement
```javascript
logger.setLogLevel('CRITICAL');  // Mode silencieux
logger.setLogLevel('ERROR');     // Erreurs seulement
logger.setLogLevel('WARN');      // Recommandé pour production
logger.setLogLevel('INFO');      // Défaut
logger.setLogLevel('DEBUG');     // Mode verbose
```

### Filtrer par module spécifique
```javascript
// Activer le debug seulement pour les jalons
logger.setLogLevel('WARN');           // Niveau global bas
logger.enableModule('JalonManager');  // Debug pour ce module seulement

// Voir l'aide complète
logger.showHelp();

// Voir les statistiques actuelles
logger.showStats();
```

## 🔄 Configuration Persistante

Le niveau de log est automatiquement sauvegardé dans `localStorage` et restauré au rechargement de la page.

## 📝 Types de Logs par Module

### JalonManager
- **INFO** : Actions importantes (ajout/suppression jalons)
- **WARN** : Problèmes d'éléments DOM manquants
- **DEBUG** : Détails de l'affichage et synchronisation
- **ERROR** : Erreurs lors des opérations

### Recommandations par Environnement

| Environnement | Niveau | Raison |
|---------------|---------|---------|
| **Production** | `WARN` | Performance + visibilité des problèmes |
| **Staging** | `INFO` | Équilibre monitoring/performance |
| **Développement** | `DEBUG` | Debug complet |
| **Tests automatisés** | `ERROR` | Silence sauf erreurs |

## 🛠️ Script de Déploiement

### Exemple de script pour automatiser la configuration :
```javascript
// À exécuter après le chargement de l'application en production
if (window.location.hostname === 'mon-serveur-prod.com') {
  logger.setLogLevel('WARN');
  console.log('🚀 Mode production : logs configurés en WARN');
} else if (window.location.hostname.includes('test')) {
  logger.setLogLevel('INFO');
  console.log('🧪 Mode test : logs configurés en INFO');
}
```

## ✅ Avantages de cette Approche

1. **Aucune modification de code** pour passer en production
2. **Configuration en temps réel** via la console
3. **Persistance automatique** des réglages
4. **Filtrage par module** pour debug ciblé
5. **Anti-spam** intégré pour éviter les logs répétitifs

## 🔍 Vérification

Pour vérifier la configuration actuelle :
```javascript
logger.showStats();
```

## 📞 Support

Si des logs apparaissent encore en production :
1. Vérifier `logger.showStats()` 
2. Régler avec `logger.setLogLevel('WARN')`
3. Si persistant, vérifier les `console.log` directs restants dans le code