# Changelog Kanban SSIR

Historique des modifications du projet kanbantest.

---

## [2025-08-20] - V3 : Timeline, Dashboard et Strategie

### Timeline V3 (planification)
- Ajout d'une vue Timeline integree au Kanban
- Groupements par personne, type, previsibilite, bureau ou projet
- Drag & drop des dates et des groupements vers Grist
- Correction du bouton Timeline (initialisation cote KanbanManager core)
- Fallback sur date de creation quand date de debut/echeance manquantes

### Dashboard V3
- Ajout du dashboard V3 (statistiques, alertes, capacite)
- Affichage d'un avertissement si les colonnes V3 sont absentes
- Indication des taches sans previsibilite/type
- Support de la colonne `previsibilite` (accent) pour les donnees existantes

### Renommage Strategie
- Le champ strategique est desormais `axe_strategique` (remplace `action`) dans les mappings et l'UI
- Les libelles UI parlent d'axe strategique pour eviter toute confusion metier

### Configuration
- Edition des axes strategiques directement depuis l'onglet Configuration
- Renommage / suppression des projets avec mise a jour en masse des taches

---

## [2025-07-25] - Corrections Critiques et Simplification

### Corrections Critiques

**Probleme 1 : Reset trop agressif des formulaires**
- Symptome : Les champs de formulaire se vidaient a chaque sauvegarde
- Solution : Reset intelligent conditionnel base sur `isChangingTask`

**Probleme 2 : Focus impossible en edition de commentaires**
- Symptome : Impossible de taper dans la zone de texte lors de l'edition de commentaires
- Solution : Focus direct simple au lieu de 5 tentatives avec fallbacks

**Probleme 3 : Code DOM vanilla complexe**
- Solution : Migration vers jQuery pour la simplicite et fiabilite

### Ameliorations Techniques
- Simplification des Event Listeners
- Standardisation jQuery
- Optimisation du Reset des Formulaires

---

## [2025-07-14] - Systeme d'Historique et Modes de Vue

### Systeme d'Historique - Revision Complete

**Tracking Etendu des Changements :**
- Projet, Strategie (objectif, sous-objectif, action)
- Equipe/Bureau, Responsables
- Urgence, Impact
- Dates (debut, echeance)
- Titre, Description

**Messages Intelligents :**
- Avant : "Task updated via modal"
- Maintenant : "Projet change: Migration serveurs -> Refonte infrastructure"

**Icones Distinctives :**
Chaque type de changement a son icone specifique dans la timeline.

**Dates Corrigees :**
- Probleme resolu : Les timestamps affichaient toujours "2h00"
- Solution : Formatage direct sans `normalizeDate()` pour preserver l'heure complete

**Prevention des Changements Invalides :**
- Plus de changements de statut identiques dans l'historique

### Modes de Vue - Amelioration Majeure

**Mode Focus Corrige :**
- Logs de debug detailles
- Fallback intelligent
- Synchronisation amelioree avec `refreshWithSync()`

**Masquage Intelligent des Colonnes Vides :**
- Les colonnes sans taches sont automatiquement masquees
- Exception : Si toutes les colonnes sont vides, elles restent visibles

**Selection Automatique de Colonne Focus :**
- Premiere colonne avec des taches, sinon "A faire"

### Systeme de Logs

**5 niveaux disponibles :**
1. CRITICAL - Erreurs bloquantes
2. ERROR - Erreurs importantes
3. WARN - Avertissements
4. INFO - Informations generales
5. DEBUG - Debug detaille (desactive par defaut)

**Controle Dynamique :**
```javascript
logger.setLevel('ERROR');  // Ne montrer que les erreurs
logger.setModuleLevel('HistoryManager', 'DEBUG'); // Debug specifique
```

---

## [2025-01-13] - Version 1.2 - Corrections et Fonctionnalites

### Nouvelles Fonctionnalites

**Systeme de Logs Intelligent**
- Ajout de `LoggerManager.js` avec 5 niveaux de logs
- Anti-spam, filtres par module, sauvegarde preferences

**Interface d'Edition de Commentaires**
- Widget d'edition modal avec overlay + styles CSS
- Boutons d'edition dans l'historique des taches

### Corrections

**Filtrage Double Anti-Doublons**
- Ajout du filtrage des `___TEMP_USER_RECORD___` dans `filterRecords()`

**Champ Description Toujours Vide**
- `setFieldValue('popup-description', '')` systematique

**Correction Double Creation de Taches (AUDIT COMPLET)**
- Ecouteurs dupliques sur boutons supprimes
- Fichier legacy `js/tmp` desactive

---

## Fonctionnalites Recentes (Juillet 2025)

- Systeme d'icones Bootstrap pour les statuts (remplacement des emojis)
- Mode Focus ameliore avec colonnes vides repliees automatiquement
- Filtrage des enregistrements temporaires (___TEMP_USER_RECORD___)
- Largeur dynamique des colonnes vides (40px en mode compact/detaille)
- Navigation focus avec boutons et compteurs de taches
- CSS responsive pour colonnes vides avec data-empty
- Suppression bouton Export History de l'interface
- Correction bugs filtres entre modes focus et statut
- Auto-selection premiere colonne avec taches en mode focus

---

## Systeme de Missions (Nouveau)

Le systeme de missions permet de classifier et organiser les taches selon une hierarchie :

```
Strategie -> Mission -> Sous-action -> Tache
```

### Colonnes Grist requises (13 nouvelles)

**Mission (7 colonnes) :**
- `mission_code`, `mission_nom`, `mission_responsable`
- `mission_bureau`, `mission_priorite`
- `mission_date_debut`, `mission_date_fin`

**Sous-action (5 colonnes) :**
- `sous_action_code`, `sous_action_nom`, `categorie`
- `sous_action_charge_estimee`, `sous_action_charge_reelle`

**Meta (1 colonne) :**
- `est_classifiee` - Tache rattachee a une mission?

---

*Derniere mise a jour : Janvier 2026*
