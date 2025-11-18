# ✅ Validation manuelle de la version kanbantest

Ce plan de tests couvre la version mise à jour dans `/kanbantest/`, désormais alignée sur l'architecture de l'environnement `/test/` et destinée à remplacer la production.

## Pré-requis
- Navigateur Chromium/Chrome ou Firefox à jour.
- Accès à l'application via `https://timox.github.io/kanbantest/` avec la connexion Grist configurée.
- Jeu de données de production chargé (structures et colonnes synchronisées).

## 1. Chargement général
1. Ouvrir l'URL et vérifier l'affichage du badge "Préproduction" dans l'en-tête.
2. Confirmer que le tableau principal se peuple avec l'intégralité des tâches Grist.
3. Observer la console (F12) : absence d'erreurs JavaScript et log de chargement des stratégies depuis les constantes intégrées.
4. Changer de statut via les raccourcis du header pour s'assurer que les filtres initiaux répondent immédiatement.

## 2. Gestion des filtres et modes d'affichage
1. Tester les filtres Bureau, Responsable, Projet, Urgence et Impact (sélections simples et multiples).
2. Passer successivement en modes Compact, Détail et Focus ; vérifier la persistance des colonnes repliées et l'état des boutons.
3. Activer/désactiver l'affichage des tâches terminées depuis le menu latéral.
4. Utiliser la recherche plein texte et confirmer la mise en évidence des correspondances.

## 3. Modale de tâche
1. Ouvrir une carte au hasard et vérifier le formulaire bi-colonne et le panneau historique latéral.
2. Modifier un champ (ex. Responsable) et sauvegarder ; contrôler la mise à jour dans Grist.
3. Tester la création d'une tâche : champs obligatoires, jalons, références et badges générés.
4. Supprimer une tâche de test et vérifier l'apparition du toast de confirmation.
5. Rouvrir une tâche existante pour confirmer la synchronisation de l'historique des statuts et des commentaires différés.

## 4. Drag & Drop / interactions colonne
1. Déplacer une carte entre deux colonnes ; vérifier le recalcul de la date de dernière modification et l'historique associé.
2. Replier puis déplier une colonne ; observer la mise à jour du compteur et des badges de pile.
3. Naviguer avec les flèches latérales et vérifier le focus automatique sur la colonne active.

## 5. Timeline et vues secondaires
1. Ouvrir la vue Timeline : chargement des groupes, sliders de dates et couleurs par statut.
2. Tester les regroupements (Responsable, Bureau, Projet, Type) ainsi que le filtrage par statut.
3. Déplacer un item dans la timeline (drag horizontal) et confirmer la mise à jour des dates dans Grist.
4. Vérifier la vue Statistiques : graphiques, badges et alertes cohérents avec les données chargées.

## 6. Résilience et intégration Grist
1. Déconnecter temporairement l'utilisateur dans Grist pour valider le message d'erreur bloquant.
2. Recharger la page sans cache et vérifier que la synchronisation s'effectue sans perte de configuration.
3. Confirmer que les stratégies sont listées dans la modale sans appel fallback (console sans avertissement "fallback").

## 7. Accessibilité et responsive
1. Vérifier la navigation clavier dans la modale et les colonnes (Tab/Shift+Tab).
2. Tester l'interface sur largeur < 1280px : bascule en colonne unique et affichage des contrôles prioritaires.
3. Activer le mode contraste élevé du navigateur pour valider la lisibilité des badges et des boutons.

## 8. Récapitulatif post-test
- Noter toute anomalie avec reproduction, capture d'écran et statut Grist concerné.
- Synchroniser les constats dans la checklist de promotion avant d'exécuter `deploy_to_production.sh`.

Une fois ces tests validés sans blocant, l'application `/kanbantest/` peut être promue vers `/kanban/` via le script de déploiement standard.
