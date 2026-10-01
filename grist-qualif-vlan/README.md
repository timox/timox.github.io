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
