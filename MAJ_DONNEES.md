# Mise à jour des données de production

## Stratégies (strategyDataHardcoded.js)

### 1. Exporter depuis Grist
- Aller sur la table `ssir_strategie` dans Grist
- Menu → Export → CSV
- Sauvegarder le fichier dans `/test/debug/` sous le nom `kanban-Ssir_strategie2.csv`

### 2. Convertir en JavaScript
```bash
# Depuis le répertoire racine du projet
python3 convert_strategies.py
```

### 3. Vérifier la conversion
Le script affiche :
- Nombre de stratégies converties
- Échantillon des premières stratégies
- Emplacement du fichier généré

### 4. Fichiers modifiés
- `/kanban/js/config/strategyDataHardcoded.js` (production)
- `/test/js/config/strategyDataHardcoded.js` (test)

---

## Tâches principales (taskDataHardcoded.js)

### 1. Exporter depuis Grist
- Aller sur la table `Ssir_principale_task` dans Grist
- Menu → Export → CSV
- Sauvegarder le fichier dans `/test/debug/` sous le nom `kanban-Ssir_principale_task(1).csv`

### 2. Convertir en JavaScript
```bash
# Depuis le répertoire racine du projet
python3 convert_tasks.py
```

### 3. Vérifier la conversion
Le script affiche :
- Nombre de tâches converties
- Échantillon des premières tâches
- Emplacement du fichier généré

### 4. Fichier modifié
- `/kanban/js/config/taskDataHardcoded.js` (production)

---

## Scripts disponibles

### convert_strategies.py
- **Source** : `/test/debug/kanban-Ssir_strategie2.csv`
- **Destination** : `/kanban/js/config/strategyDataHardcoded.js`
- **Colonnes utilisées** : id, objectif, sous_objectif, action, responsable, echeance, portee

### convert_tasks.py
- **Source** : `/test/debug/kanban-Ssir_principale_task(1).csv`
- **Destination** : `/kanban/js/config/taskDataHardcoded.js`
- **Colonnes utilisées** : id_task, titre, description, bureau, qui, priorite, impact, statut, date_echeance, jalons, notes, projet, urgence, strategie_id

---

## Notes importantes

1. **Format des références stratégies** : Depuis la reconfiguration Grist, `strategie_id` est de type "références multiples" et retourne `["L", id]` où `id` est l'ID numérique de la ligne.

2. **Synchronisation** : Les fichiers hardcodés permettent au kanban de fonctionner même en cas de problème de connexion Grist.

3. **Fréquence de mise à jour** : À faire après chaque modification importante des données dans Grist.

4. **Sauvegarde** : Les anciens CSV sont conservés dans `/test/debug/` avec horodatage.