STATUTS: [
    { id: 'Backlog', libelle: 'Backlog', classe: 'backlog' },
    { id: 'À faire', libelle: 'À faire', classe: 'a-faire' },
    { id: 'En cours', libelle: 'En cours', classe: 'en-cours' },
    { id: 'En attente', libelle: 'En attente', classe: 'en-attente' },
    { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque' },
    { id: 'Validation', libelle: 'Validation', classe: 'validation' },
    { id: 'Terminé', libelle: 'Terminé', classe: 'termine' }
  ],

  DEFAULT_VALUES: {
    BUREAUX: ['Exploit', 'Réseau', 'BDD', 'Chef SSIR'],
    RESPONSABLES: ['Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo', 'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta'],
    URGENCES: ['Immédiate', 'Courte', 'Moyenne', 'Longue'],
    IMPACTS: ['Critique', 'Important', 'Modéré', 'Mineur'],
    PROJETS: [
      'accès distants', 'AD', 'SSI', 'caméras pièton', 'astre finances', 'correspondants', 'autre projet',
      'conformité systèmes', 'MCO', 'conformité RZO', 'firewall', 'Libriciel', 'intranet-extranet',
      'optimops', 'attestation assurances', 'horoquartz', 'administratif-budget'
    ]
  },

  TABLE_ID: "Ssir_principale_task",

  REQUIRED_COLUMNS: [
    'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
    'projet', 'strategie_objectif', 'strategie_sous_objectif', 'strategie_action', 'notes',
    'historique_statuts', 'date_derniere_maj', 'statut_precedent'
  ],

  OPTIONAL_COLUMNS: ['date_debut', 'date_echeance']
};
