// === config/strategyData.js ===
// Données stratégiques pour la planification des tâches

/**
 * Objectifs stratégiques principaux
 */
export const STRATEGIC_OBJECTIVES = [
  {
    id: 'modernisation-infrastructure',
    label: 'Modernisation Infrastructure',
    description: 'Mise à jour et modernisation de l\'infrastructure IT',
    priority: 1,
    color: '#007bff'
  },
  {
    id: 'securite-renforcee',
    label: 'Sécurité Renforcée',
    description: 'Amélioration de la sécurité des systèmes d\'information',
    priority: 1,
    color: '#dc3545'
  },
  {
    id: 'performance-optimisee',
    label: 'Performance Optimisée',
    description: 'Optimisation des performances des systèmes',
    priority: 2,
    color: '#28a745'
  },
  {
    id: 'conformite-reglementaire',
    label: 'Conformité Réglementaire',
    description: 'Respect des réglementations et normes en vigueur',
    priority: 1,
    color: '#6f42c1'
  },
  {
    id: 'innovation-technologique',
    label: 'Innovation Technologique',
    description: 'Adoption de nouvelles technologies',
    priority: 3,
    color: '#fd7e14'
  },
  {
    id: 'resilience-continuite',
    label: 'Résilience & Continuité',
    description: 'Assurer la continuité des services',
    priority: 1,
    color: '#20c997'
  }
];

/**
 * Sous-objectifs par objectif principal
 */
export const SUB_OBJECTIVES = {
  'modernisation-infrastructure': [
    {
      id: 'migration-cloud',
      label: 'Migration Cloud',
      description: 'Migration des services vers le cloud',
      timeline: '6-12 mois'
    },
    {
      id: 'virtualisation',
      label: 'Virtualisation',
      description: 'Virtualisation des serveurs physiques',
      timeline: '3-6 mois'
    },
    {
      id: 'automatisation',
      label: 'Automatisation',
      description: 'Automatisation des processus IT',
      timeline: '6-18 mois'
    },
    {
      id: 'conteneurisation',
      label: 'Conteneurisation',
      description: 'Déploiement avec Docker/Kubernetes',
      timeline: '6-12 mois'
    },
    {
      id: 'reseaux-nouvelle-generation',
      label: 'Réseaux Nouvelle Génération',
      description: 'Mise à niveau des infrastructures réseau',
      timeline: '12-24 mois'
    }
  ],
  
  'securite-renforcee': [
    {
      id: 'authentification-multi-facteur',
      label: 'Authentification Multi-Facteur',
      description: 'Mise en place de l\'AMF sur tous les systèmes',
      timeline: '3-6 mois'
    },
    {
      id: 'chiffrement-donnees',
      label: 'Chiffrement des Données',
      description: 'Chiffrement des données sensibles',
      timeline: '6-9 mois'
    },
    {
      id: 'monitoring-securite',
      label: 'Monitoring Sécurité',
      description: 'Surveillance continue des menaces',
      timeline: '3-12 mois'
    },
    {
      id: 'formation-utilisateurs',
      label: 'Formation Utilisateurs',
      description: 'Sensibilisation à la cybersécurité',
      timeline: 'Continu'
    },
    {
      id: 'audit-pentest',
      label: 'Audits & Tests d\'Intrusion',
      description: 'Évaluations régulières de sécurité',
      timeline: 'Trimestriel'
    }
  ],
  
  'performance-optimisee': [
    {
      id: 'optimisation-bdd',
      label: 'Optimisation Base de Données',
      description: 'Amélioration des performances BDD',
      timeline: '3-6 mois'
    },
    {
      id: 'cache-cdn',
      label: 'Cache et CDN',
      description: 'Mise en place de systèmes de cache',
      timeline: '1-3 mois'
    },
    {
      id: 'load-balancing',
      label: 'Load Balancing',
      description: 'Répartition de charge efficace',
      timeline: '3-6 mois'
    },
    {
      id: 'monitoring-performance',
      label: 'Monitoring Performance',
      description: 'Surveillance des performances',
      timeline: '2-4 mois'
    }
  ],
  
  'conformite-reglementaire': [
    {
      id: 'rgpd-compliance',
      label: 'Conformité RGPD',
      description: 'Mise en conformité RGPD',
      timeline: '6-12 mois'
    },
    {
      id: 'iso-27001',
      label: 'Certification ISO 27001',
      description: 'Obtention de la certification ISO 27001',
      timeline: '12-18 mois'
    },
    {
      id: 'archivage-legal',
      label: 'Archivage Légal',
      description: 'Système d\'archivage conforme',
      timeline: '6-9 mois'
    },
    {
      id: 'audit-compliance',
      label: 'Audits de Conformité',
      description: 'Audits réguliers de conformité',
      timeline: 'Annuel'
    }
  ],
  
  'innovation-technologique': [
    {
      id: 'intelligence-artificielle',
      label: 'Intelligence Artificielle',
      description: 'Intégration de solutions IA',
      timeline: '12-24 mois'
    },
    {
      id: 'iot-integration',
      label: 'Intégration IoT',
      description: 'Déploiement de capteurs IoT',
      timeline: '6-18 mois'
    },
    {
      id: 'blockchain',
      label: 'Blockchain',
      description: 'Exploration des technologies blockchain',
      timeline: '18-36 mois'
    },
    {
      id: 'edge-computing',
      label: 'Edge Computing',
      description: 'Calcul en périphérie',
      timeline: '12-24 mois'
    }
  ],
  
  'resilience-continuite': [
    {
      id: 'plan-reprise-activite',
      label: 'Plan de Reprise d\'Activité',
      description: 'PRA complet et testé',
      timeline: '6-12 mois'
    },
    {
      id: 'sauvegarde-3-2-1',
      label: 'Stratégie Sauvegarde 3-2-1',
      description: 'Implémentation de la règle 3-2-1',
      timeline: '3-6 mois'
    },
    {
      id: 'redondance-sites',
      label: 'Redondance Multi-Sites',
      description: 'Infrastructure redondante',
      timeline: '12-18 mois'
    },
    {
      id: 'tests-resilience',
      label: 'Tests de Résilience',
      description: 'Tests réguliers de continuité',
      timeline: 'Trimestriel'
    }
  ]
};

/**
 * Actions spécifiques par sous-objectif
 */
export const STRATEGIC_ACTIONS = {
  'migration-cloud': [
    'Audit Infrastructure Existante',
    'Sélection Fournisseur Cloud',
    'Planification Migration',
    'Migration Pilot',
    'Migration Production',
    'Optimisation Coûts Cloud',
    'Formation Équipes Cloud',
    'Monitoring Cloud Native'
  ],
  
  'virtualisation': [
    'Évaluation Serveurs Physiques',
    'Choix Solution Virtualisation',
    'Déploiement Hyperviseur',
    'Migration Applications Legacy',
    'Optimisation Ressources VM',
    'Backup Machines Virtuelles',
    'Monitoring Infrastructure Virtuelle'
  ],
  
  'automatisation': [
    'Identification Processus Manuels',
    'Sélection Outils Automatisation',
    'Développement Scripts',
    'Tests Automatisation',
    'Déploiement Production',
    'Formation Équipes',
    'Amélioration Continue'
  ],
  
  'conteneurisation': [
    'Audit Applications Existantes',
    'Conteneurisation Applications',
    'Déploiement Kubernetes',
    'CI/CD Pipeline',
    'Monitoring Conteneurs',
    'Sécurité Conteneurs',
    'Optimisation Orchestration'
  ],
  
  'authentification-multi-facteur': [
    'Choix Solution AMF',
    'Pilot Groupe Test',
    'Déploiement Phases',
    'Formation Utilisateurs',
    'Support Utilisateurs',
    'Monitoring Authentifications',
    'Optimisation UX'
  ],
  
  'chiffrement-donnees': [
    'Classification Données',
    'Choix Algorithmes Chiffrement',
    'Gestion Clés Cryptographiques',
    'Chiffrement Base Données',
    'Chiffrement Communications',
    'Tests Intégrité',
    'Procedures Récupération'
  ],
  
  'optimisation-bdd': [
    'Audit Performance BDD',
    'Optimisation Requêtes',
    'Indexation Intelligente',
    'Partitionnement Tables',
    'Optimisation Mémoire',
    'Monitoring Temps Réponse',
    'Maintenance Préventive'
  ],
  
  'rgpd-compliance': [
    'Audit Données Personnelles',
    'Cartographie Traitements',
    'Mise à Jour Mentions Légales',
    'Procédures Exercice Droits',
    'Formation RGPD',
    'Outils Anonymisation',
    'Documentation Conformité'
  ],
  
  'plan-reprise-activite': [
    'Analyse Impact Business',
    'Identification Risques',
    'Définition RTO/RPO',
    'Procédures Reprise',
    'Tests PRA Réguliers',
    'Formation Équipes Crise',
    'Amélioration Continue PRA'
  ]
};

/**
 * Indicateurs de performance par objectif
 */
export const KPI_OBJECTIVES = {
  'modernisation-infrastructure': [
    'Taux de virtualisation serveurs (%)',
    'Coût infrastructure (€/mois)',
    'Temps déploiement nouvelles apps (jours)',
    'Disponibilité services (%)'
  ],
  
  'securite-renforcee': [
    'Nombre incidents sécurité',
    'Temps résolution incidents (heures)',
    'Taux adoption AMF (%)',
    'Score audit sécurité'
  ],
  
  'performance-optimisee': [
    'Temps réponse applications (ms)',
    'Utilisation ressources CPU (%)',
    'Satisfaction utilisateurs',
    'Nombre optimisations réalisées'
  ],
  
  'conformite-reglementaire': [
    'Nombre non-conformités',
    'Temps mise en conformité (jours)',
    'Score audit conformité',
    'Coût mise en conformité (€)'
  ]
};

/**
 * Priorités par bureau pour chaque objectif
 */
export const BUREAU_PRIORITIES = {
  'Exploit': {
    'performance-optimisee': 1,
    'modernisation-infrastructure': 2,
    'resilience-continuite': 1,
    'securite-renforcee': 2
  },
  
  'Réseau': {
    'modernisation-infrastructure': 1,
    'securite-renforcee': 1,
    'performance-optimisee': 2,
    'resilience-continuite': 2
  },
  
  'BDD': {
    'performance-optimisee': 1,
    'resilience-continuite': 1,
    'securite-renforcee': 2,
    'conformite-reglementaire': 2
  },
  
  'RSSI': {
    'securite-renforcee': 1,
    'conformite-reglementaire': 1,
    'resilience-continuite': 2,
    'modernisation-infrastructure': 3
  },
  
  'DPO': {
    'conformite-reglementaire': 1,
    'securite-renforcee': 2,
    'modernisation-infrastructure': 3
  }
};

/**
 * Fonctions utilitaires pour les données stratégiques
 */

/**
 * Obtient les objectifs stratégiques triés par priorité
 * @returns {Array} Liste des objectifs triés
 */
export function getObjectivesByPriority() {
  return [...STRATEGIC_OBJECTIVES].sort((a, b) => a.priority - b.priority);
}

/**
 * Obtient les sous-objectifs pour un objectif donné
 * @param {string} objectiveId - ID de l'objectif
 * @returns {Array} Sous-objectifs
 */
export function getSubObjectives(objectiveId) {
  return SUB_OBJECTIVES[objectiveId] || [];
}

/**
 * Obtient les actions pour un sous-objectif donné
 * @param {string} subObjectiveId - ID du sous-objectif
 * @returns {Array} Actions
 */
export function getActions(subObjectiveId) {
  return STRATEGIC_ACTIONS[subObjectiveId] || [];
}

/**
 * Obtient la priorité d'un objectif pour un bureau
 * @param {string} bureau - Nom du bureau
 * @param {string} objectiveId - ID de l'objectif
 * @returns {number} Niveau de priorité (1=haute, 2=moyenne, 3=basse)
 */
export function getBureauPriority(bureau, objectiveId) {
  const bureauPriorities = BUREAU_PRIORITIES[bureau];
  return bureauPriorities ? bureauPriorities[objectiveId] || 3 : 3;
}

/**
 * Obtient les objectifs recommandés pour un bureau
 * @param {string} bureau - Nom du bureau
 * @returns {Array} Objectifs recommandés
 */
export function getRecommendedObjectives(bureau) {
  const priorities = BUREAU_PRIORITIES[bureau];
  if (!priorities) return [];
  
  return Object.entries(priorities)
    .filter(([_, priority]) => priority <= 2)
    .sort(([_, a], [__, b]) => a - b)
    .map(([objectiveId]) => STRATEGIC_OBJECTIVES.find(obj => obj.id === objectiveId))
    .filter(Boolean);
}

/**
 * Recherche dans les données stratégiques
 * @param {string} searchTerm - Terme de recherche
 * @returns {object} Résultats de recherche
 */
export function searchStrategyData(searchTerm) {
  const term = searchTerm.toLowerCase();
  const results = {
    objectives: [],
    subObjectives: [],
    actions: []
  };
  
  // Recherche dans les objectifs
  results.objectives = STRATEGIC_OBJECTIVES.filter(obj => 
    obj.label.toLowerCase().includes(term) || 
    obj.description.toLowerCase().includes(term)
  );
  
  // Recherche dans les sous-objectifs
  Object.entries(SUB_OBJECTIVES).forEach(([objId, subObjs]) => {
    subObjs.forEach(subObj => {
      if (subObj.label.toLowerCase().includes(term) || 
          subObj.description.toLowerCase().includes(term)) {
        results.subObjectives.push({
          ...subObj,
          parentObjective: objId
        });
      }
    });
  });
  
  // Recherche dans les actions
  Object.entries(STRATEGIC_ACTIONS).forEach(([subObjId, actions]) => {
    actions.forEach(action => {
      if (action.toLowerCase().includes(term)) {
        results.actions.push({
          action,
          parentSubObjective: subObjId
        });
      }
    });
  });
  
  return results;
}

/**
 * Génère un rapport de couverture stratégique
 * @param {Array} tasks - Liste des tâches
 * @returns {object} Rapport de couverture
 */
export function generateStrategyCoverageReport(tasks) {
  const coverage = {
    totalTasks: tasks.length,
    strategicTasks: 0,
    objectiveCoverage: {},
    uncoveredObjectives: [],
    recommendations: []
  };
  
  // Analyser les tâches
  tasks.forEach(task => {
    if (task.strategie_objectif) {
      coverage.strategicTasks++;
      
      if (!coverage.objectiveCoverage[task.strategie_objectif]) {
        coverage.objectiveCoverage[task.strategie_objectif] = 0;
      }
      coverage.objectiveCoverage[task.strategie_objectif]++;
    }
  });
  
  // Identifier les objectifs non couverts
  STRATEGIC_OBJECTIVES.forEach(obj => {
    if (!coverage.objectiveCoverage[obj.id]) {
      coverage.uncoveredObjectives.push(obj);
    }
  });
  
  // Générer des recommandations
  if (coverage.strategicTasks / coverage.totalTasks < 0.6) {
    coverage.recommendations.push(
      'Considérer l\'alignement de plus de tâches avec la stratégie'
    );
  }
  
  if (coverage.uncoveredObjectives.length > 0) {
    coverage.recommendations.push(
      `${coverage.uncoveredObjectives.length} objectifs stratégiques ne sont pas couverts`
    );
  }
  
  return coverage;
}
