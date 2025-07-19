# 📁 Structure du Projet Kanban SSIR

## 🌍 Vue d'ensemble des environnements

Ce projet utilise **GitHub Pages** avec plusieurs dossiers représentant différents **environnements** pour simplifier le déploiement et les tests.

```
timox.github.io/
├── kanban/           # 🚀 PRODUCTION
├── test/             # 🧪 DÉVELOPPEMENT/TEST  
├── kanbantest/       # 🔬 EXPÉRIMENTATION
└── docs/             # 📚 DOCUMENTATION
```

---

## 🚀 `/kanban/` - ENVIRONNEMENT DE PRODUCTION

**URL d'accès :** `https://timox.github.io/kanban/`

### Description
Environnement de production stable utilisé par les équipes SSIR au quotidien.

### Structure
```
kanban/
├── index.html              # Point d'entrée principal
├── css/                    # Styles modulaires
│   ├── kanban-base.css     # Styles de base + flèches navigation
│   ├── kanban-modal.css    # Styles modales
│   └── kanban-responsive.css # Responsive design
├── js/                     # JavaScript modulaire
│   ├── kanban-app.js       # Application principale
│   ├── config/             # Configuration
│   │   ├── constants.js    # Constantes (statuts, bureaux...)
│   │   └── strategyData.js # Données stratégiques
│   ├── managers/           # Gestionnaires métier
│   │   ├── FilterManager.js     # Filtres et recherche
│   │   ├── ViewModeManager.js   # Modes de vue (compact/détaillé/focus)
│   │   ├── ModalManager.js      # Gestion modales
│   │   ├── HistoryManager.js    # Historique et timeline
│   │   ├── DatePickerManager.js # Sélecteur de dates
│   │   └── GristManager.js      # Interface Grist
│   ├── renderers/          # Moteurs de rendu
│   │   ├── CardRenderer.js      # Rendu des cartes tâches
│   │   └── boardRenderer.js     # Rendu des colonnes kanban
│   └── utils/              # Utilitaires
│       ├── LoggerManager.js     # Système de logs
│       ├── UserActionManager.js # Actions utilisateur
│       ├── NotesJsonMigrator.js # Migration notes JSON
│       ├── badges.js           # Génération badges
│       ├── dates.js            # Gestion dates
│       └── dom.js              # Manipulation DOM
└── CLAUDE.md               # Mémoire Claude (historique)
```

### Caractéristiques actuelles
- ✅ Flèches navigation latérales
- ✅ Mode focus simplifié (filtre statut uniquement)  
- ✅ Comptages badges corrects
- ✅ Colonnes vides masquées en mode compact
- ✅ Architecture modulaire complète

---

## 🧪 `/test/` - ENVIRONNEMENT DE DÉVELOPPEMENT

**URL d'accès :** `https://timox.github.io/test/`

### Description
Environnement de développement et test pour valider les nouvelles fonctionnalités avant mise en production.

### Structure
```
test/
├── index.html              # Version de test
├── css/                    # CSS synchronisé avec production
├── js/                     # JS synchronisé avec production
├── debug/                  # Outils de debug et migration
│   ├── *.py               # Scripts Python d'analyse
│   ├── *.csv              # Données de test/migration
│   ├── *.json             # Extractions et sauvegardes
│   └── extracted_json_*/  # Données extraites par tâche
├── ARCHITECTURE.md         # Documentation architecture
├── CHANGELOG_2025-07-14.md # Journal des modifications
├── LOGGING_GUIDE.md        # Guide système de logs
├── VERIFICATION_ANTI_DUPLICATION.md # Guide anti-doublons
└── schema.md               # Schéma base de données
```

### Usage
- **Développement** de nouvelles fonctionnalités
- **Tests** avant mise en production
- **Scripts de migration** et maintenance
- **Documentation** technique détaillée

### Synchronisation
- Les modifications validées en `test/` sont copiées vers `kanban/`
- Structure identique à la production pour faciliter les déploiements

---

## 🔬 `/kanbantest/` - ENVIRONNEMENT D'EXPÉRIMENTATION

**URL d'accès :** `https://timox.github.io/kanbantest/`

### Description
Environnement minimal et autonome pour expérimentations rapides et prototypes.

### Structure
```
kanbantest/
├── index.html              # Interface simplifiée
└── js.js                   # JavaScript monolithique
```

### Caractéristiques
- **Structure simplifiée** (2 fichiers seulement)
- **Indépendant** des autres environnements
- **Prototypage rapide** sans impact sur la production
- **Tests d'interface** et d'ergonomie

---

## 📚 `/docs/` - DOCUMENTATION

### Description
Documentation technique, guides utilisateur et spécifications.

### Contenu typique
- Guides d'utilisation
- Documentation API
- Spécifications techniques
- Tutoriels de développement

---

## 🔄 Workflow de développement

### 1. **Expérimentation** (`/kanbantest/`)
```bash
# Tests rapides d'interface
# Prototypes d'ergonomie
# Validation concepts
```

### 2. **Développement** (`/test/`)
```bash
# Implémentation complète
# Tests fonctionnels
# Validation architecture
# Documentation
```

### 3. **Production** (`/kanban/`)
```bash
# Copie des fichiers validés depuis /test/
# Déploiement automatique via GitHub Pages
# Utilisation quotidienne équipes SSIR
```

### 4. **Synchronisation**
```bash
# test/ → kanban/ (pour déploiement)
# kanban/ → test/ (pour alignement après hotfix)
```

---

## 🎯 Avantages de cette structure

### **Simplicité GitHub Pages**
- **URL directe** par dossier : `timox.github.io/dossier/`
- **Déploiement automatique** à chaque commit
- **Pas de build** ou configuration complexe

### **Isolation des environnements**
- **Production stable** non impactée par les tests
- **Développement libre** en parallèle
- **Expérimentation** sans risques

### **Flexibilité de déploiement**
- **Hotfix production** : modification directe `/kanban/`
- **Feature complète** : développement `/test/` puis copie
- **Prototype rapide** : test concept `/kanbantest/`

### **Maintenance facilitée**
- **Structure claire** et prévisible
- **Documentation centralisée** dans chaque environnement
- **Historique Git** par environnement

---

## 📋 Bonnes pratiques

### **Développement**
1. 🧪 Développer dans `/test/`
2. ✅ Valider et documenter
3. 📋 Tester en conditions réelles
4. 🚀 Copier vers `/kanban/`

### **Hotfix production**
1. 🔥 Correction urgente dans `/kanban/`
2. 📋 Commit avec tag `[HOTFIX]`
3. ⬅️ Reporter dans `/test/` rapidement
4. 📝 Documenter dans CHANGELOG

### **Expérimentation**
1. 🔬 Prototype dans `/kanbantest/`
2. 💡 Validation concept rapide
3. 🧪 Si validé → implémentation complète dans `/test/`

---

*Dernière mise à jour : 2025-07-19*  
*Structure documentée pour faciliter le développement et la maintenance*