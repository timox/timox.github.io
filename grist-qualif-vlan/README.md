# Widget Grist « Qualification VLAN – saisie »

Questionnaire de qualification d'un VLAN, avec les réponses de l'agent d'extraction en regard,
pour le document Grist « Qualification VLAN » (modèle v4 : tables `VLANs`, `Referentiel`,
`Reponses`, `Profils`, `Reponses_profil`, `Classes_risque`).

## Installation dans Grist

1. Sur une page, ajouter une liste (tableau) de la table **VLANs**.
2. Ajouter un widget **Personnalisé** sur la table **VLANs**, choisir **URL personnalisée** :
   `https://timox.github.io/grist-qualif-vlan/`
3. Accès : **Accès complet** (le widget lit les réponses et écrit `Valeur_humaine` / `Precision`).
4. Données de la section : **Sélectionner par** = la liste des VLAN.

## Fonctionnement

- Deux modes : **site** (le VLAN sélectionné) et **profil** (réponses communes à tous les sites du même numéro de VLAN).
  Sur un site, la valeur retenue est : saisie locale, sinon mesure de l'agent, sinon réponse du profil.

- Critères regroupés par thème, avec l'aide de la doctrine et la réponse de l'agent (valeur + preuve).
- Saisie Oui / Non / N/A et précision ; enregistrement automatique. La saisie prime sur l'agent.
- « Revenir à la valeur de l'agent » efface la saisie ; une correction contraire à l'agent est signalée.
- Filtres : à renseigner (par défaut), écarts, corrections divergentes, tout.
- Les lignes de réponses manquantes d'un VLAN (nouveau VLAN) sont créées automatiquement.
- « Saisi par » et la date sont renseignés par Grist (colonnes déclencheurs).

## Publication

Chaque push sur `main` déploie le site via `.github/workflows/pages.yml`
(Settings > Pages > Source : **GitHub Actions**).

## Vue transversale (un critère, tous les VLAN)

Placé sur une page où une liste de la table **Referentiel** pilote la sélection, le widget
affiche le critère choisi pour tous les VLAN :

- **Par profil** : une réponse commune par numéro de VLAN (table Reponses_profil) ;
- **Par site** : chaque VLAN de chaque site (table Reponses), avec la mesure de l'agent et la réponse du profil ;
- filtres (à renseigner, écarts, corrections divergentes, tout) et recherche par n° de VLAN, nom ou site ;
- réponse groupée : Oui / Non / N/A pour toutes les lignes affichées encore à renseigner, après confirmation ;
- un second clic sur une réponse déjà choisie l'efface.
