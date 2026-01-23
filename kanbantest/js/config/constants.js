// === config/constants.js ===
// Configuration centralisée pour l'application Kanban

// === STATUTS DU KANBAN ===
export const STATUTS = [
  { id: 'Backlog', libelle: 'Backlog', classe: 'backlog', icone: '<i class="bi bi-archive text-secondary"></i>' },
  { id: 'À faire', libelle: 'À faire', classe: 'a-faire', icone: '<i class="bi bi-tools text-primary"></i>' },
  { id: 'En cours', libelle: 'En cours', classe: 'en-cours', icone: '<i class="bi bi-lightning text-warning"></i>' },
  { id: 'En attente', libelle: 'En attente', classe: 'en-attente', icone: '<i class="bi bi-pause-circle text-info"></i>' },
  { id: 'En pause', libelle: 'En pause', classe: 'en-pause', icone: '<i class="bi bi-pause-btn text-secondary"></i>' },
  { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque', icone: '<i class="bi bi-x-circle text-danger"></i>' },
  { id: 'Validation', libelle: 'Validation', classe: 'validation', icone: '<i class="bi bi-clipboard-check text-warning"></i>' },
  { id: 'Terminé', libelle: 'Terminé', classe: 'termine', icone: '<i class="bi bi-check-circle text-success"></i>' }
];

export const STATUS_ACCENTS = {
  'Backlog': '#6c757d',
  'À faire': '#0ea5e9',
  'En cours': '#f97316',
  'En attente': '#eab308',
  'En pause': '#94a3b8',
  'Bloqué': '#ef4444',
  'Validation': '#8b5cf6',
  'Terminé': '#22c55e',
  'default': '#6c757d'
};

// === DONNÉES DE BASE ===
// Bureaux correspondant à la table SSIR_agents
export const DEFAULT_BUREAUX = [
  'Réseaux', 'BDD', 'Exploit', 'Nexsis-RRF',
  'Chef SSIR', 'Chef GSSI', 'Chef SIG'
];

export const DEFAULT_RESPONSABLES = [
  'Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo',
  'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta', 'Yvon',
  'Clarisse', 'Hervé', 'Didier'
];

// === MAPPING AGENT → BUREAU (déduit depuis la table SSIR_AGENTS) ===
// Permet de déterminer automatiquement le bureau à partir du prénom
export const AGENT_BUREAU_MAP = {
  // Nexsis-RRF
  'Didier': 'Nexsis-RRF',
  'didier': 'Nexsis-RRF',
  'Hervé': 'Nexsis-RRF',

  // Bureau Réseaux
  'Alex': 'Réseaux',
  'Thomas': 'Réseaux',

  // Bureau BDD
  'Isabelle': 'BDD',
  'Chloe': 'BDD',
  'Chloé': 'BDD',

  // Bureau Exploit
  'Théo': 'Exploit',
  'Theo': 'Exploit',
  'Gaël': 'Exploit',
  'Gael': 'Exploit',
  'Paul': 'Exploit',
  'Landry': 'Exploit',

  // Chef SIG
  'Clarisse': 'Chef SIG',

  // Chef SSIR
  'Timothée': 'Chef SSIR',
  'Timothee': 'Chef SSIR',

  // Chef GSSI
  'Yvon': 'Chef GSSI'
};

// Hiérarchie organisationnelle GSSI (correspondant à la table SSIR_agents)
export const ORGANISATION_HIERARCHY = {
  'Chef GSSI': {
    responsable: 'Yvon',
    niveau: 0,
    parent: null
  },
  'Nexsis-RRF': {
    responsable: null,
    niveau: 1,
    parent: 'Chef GSSI',
    agents: ['Didier', 'Hervé']
  },
  'Chef SSIR': {
    responsable: 'Timothée',
    niveau: 1,
    parent: 'Chef GSSI'
  },
  'Réseaux': {
    responsable: 'Alex',
    niveau: 2,
    parent: 'Chef SSIR',
    agents: ['Thomas']
  },
  'BDD': {
    responsable: 'Isabelle',
    niveau: 2,
    parent: 'Chef SSIR',
    agents: ['Chloe']
  },
  'Exploit': {
    responsable: 'Théo',
    niveau: 2,
    parent: 'Chef SSIR',
    agents: ['Gaël', 'Paul', 'Landry']
  },
  'Chef SIG': {
    responsable: 'Clarisse',
    niveau: 1,
    parent: 'Chef GSSI'
  }
};

// Utilitaire pour obtenir le bureau d'un agent
export const getBureauFromAgent = (prenom) => {
  if (!prenom) return null;
  // Normaliser le prénom (première lettre majuscule)
  const normalized = prenom.trim();
  return AGENT_BUREAU_MAP[normalized] || null;
};

// Utilitaire pour obtenir tous les agents d'un bureau
export const getAgentsFromBureau = (bureau) => {
  const agents = [];
  for (const [agent, bur] of Object.entries(AGENT_BUREAU_MAP)) {
    if (bur === bureau) agents.push(agent);
  }
  return agents;
};

export const DEFAULT_URGENCES = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
export const DEFAULT_IMPACTS = ['Critique', 'Important', 'Modéré', 'Mineur'];
export const DEFAULT_PROJETS = [];

// === CONFIGURATION GRIST ===
export const TABLE_ID = "Ssir_principale_task";

// === COLONNES REQUISES ET OPTIONNELLES ===
export const REQUIRED_COLUMNS = [
  'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_id', 'notes', 'date_derniere_maj', 'statut_precedent'
  // Note: reference, jalons et id_task sont maintenant dans OPTIONAL_COLUMNS
];

export const OPTIONAL_COLUMNS = [
  'id_task', 'date_debut', 'date_echeance', 'jalons', 'reference',
  // Colonnes de prod actives
  'type_tache_id', 'priorite', 'historique_statuts', 'datenow',
  'str_statut', 'str_urgence', 'str_qui', 'str_bureau', 'str_impact',
  'date_creation', 'date_modif', 'Créé par',
  // Colonnes temps et liaisons (Dec 2025)
  'temps_estime_heures', 'temps_reel_heures', 'tache_liens',
  // Colonnes V3 (Kanban) - legacy
  'previsibilite', 'previsibilité', 'type_tache', 'est_dette_technique',
  // Colonnes V3 (Taxonomie)
  'nature_activite', 'genre_action', 'etape_cycle'
];

// === CONSTANTES DE L'INTERFACE ===
export const VIEW_MODES = {
  COMPACT: 'compact',
  DETAILED: 'detailed',
  FOCUS: 'focus'
};

export const PRIORITY_LEVELS = {
  CRITICAL: 1,
  HIGH: 2, 
  MEDIUM: 3,
  LOW: 4
};

// === CONFIGURATION DATES ===
export const DATE_FORMATS = {
  GRIST: 'YYYY-MM-DD',
  DISPLAY: 'fr-FR',
  TIMESTAMP: 'fr-FR'
};

// === CLASSES CSS ===
export const CSS_CLASSES = {
  BOARDS: {
    'Backlog': 'board-backlog',
    'À faire': 'board-a-faire',
    'En cours': 'board-en-cours',
    'En attente': 'board-en-attente',
    'En pause': 'board-en-pause',
    'Bloqué': 'board-bloque',
    'Validation': 'board-validation',
    'Terminé': 'board-termine'
  },
  PRIORITIES: {
    1: 'priority-1',
    2: 'priority-2',
    3: 'priority-3',
    4: 'priority-4'
  },
  ECHEANCES: {
    OK: 'echeance-ok',
    BIENTOT: 'echeance-bientot',
    URGENT: 'echeance-urgent',
    AUJOURD_HUI: 'echeance-aujourd-hui',
    DEPASSEE: 'echeance-depassee'
  }
};

// === SEUILS TEMPORELS ===
export const TIME_THRESHOLDS = {
  URGENT_DAYS: 3,
  SOON_DAYS: 7,
  ANIMATION_DURATION: 150
};

// === TAXONOMIE V3 ===

// Prévisibilité (attribut dérivé ou surchargé)
export const PREVISIBILITE = [
  { id: 'Imprévisible', emoji: '⚡', couleur: '#dc3545', classe: 'imprevisible' },
  { id: 'Prévisible', emoji: '📅', couleur: '#198754', classe: 'previsible' }
];

// === NATURE D'ACTIVITÉ (Pourquoi fait-on cette tâche ?) ===
// Remplace l'ancien TYPE_TACHES - aligné ITIL 4
export const NATURE_ACTIVITE = {
  INC: {
    code: 'INC',
    id: 'Incident',           // Rétrocompatibilité
    nom: 'Incident',
    description: 'Résolution d\'un dysfonctionnement imprévu',
    couleur: '#dc3545',
    classe: 'nature-incident',
    previsibiliteDefaut: 'Imprévisible',
    alignementITIL: 'ITIL.SM.INC'
  },
  SUP: {
    code: 'SUP',
    id: 'Support',
    nom: 'Support',
    description: 'Assistance aux utilisateurs',
    couleur: '#0d6efd',
    classe: 'nature-support',
    previsibiliteDefaut: 'Imprévisible',
    alignementITIL: 'ITIL.SM.SD'
  },
  MCO: {
    code: 'MCO',
    id: 'MCO',
    nom: 'MCO',
    description: 'Maintien en condition opérationnelle',
    couleur: '#6f42c1',
    classe: 'nature-mco',
    previsibiliteDefaut: null,  // Variable - doit être spécifié
    alignementITIL: 'ITIL.SM.ITAM'
  },
  PRJ: {
    code: 'PRJ',
    id: 'Projet',
    nom: 'Projet',
    description: 'Travail planifié créant de la valeur',
    couleur: '#198754',
    classe: 'nature-projet',
    previsibiliteDefaut: 'Prévisible',
    alignementITIL: 'ITIL.GP.PM'
  },
  OVH: {
    code: 'OVH',
    id: 'Overhead',
    nom: 'Overhead',
    description: 'Gestion, coordination, reporting',
    couleur: '#6c757d',
    classe: 'nature-overhead',
    previsibiliteDefaut: 'Prévisible',
    alignementITIL: 'ITIL.GP.WFM'
  }
};

// === ÉTAPE DU CYCLE (Où en est-on dans la transformation ?) ===
// Inspiré TOGAF ADM - aligné NIST CSF 2.0
export const ETAPE_CYCLE = {
  VIS: {
    code: 'ETP.VIS',
    nom: 'Vision',
    description: 'Définition des objectifs et du périmètre',
    couleur: '#8b5cf6',
    classe: 'etape-vision',
    ordre: 1,
    alignementTOGAF: 'Phase A',
    alignementNIST: 'GV'
  },
  ANA: {
    code: 'ETP.ANA',
    nom: 'Analyse',
    description: 'État des lieux, diagnostic, cartographie',
    couleur: '#6366f1',
    classe: 'etape-analyse',
    ordre: 2,
    alignementTOGAF: 'Phase B-C-D (référence)',
    alignementNIST: 'ID'
  },
  CON: {
    code: 'ETP.CON',
    nom: 'Conception',
    description: 'Design de la solution cible',
    couleur: '#3b82f6',
    classe: 'etape-conception',
    ordre: 3,
    alignementTOGAF: 'Phase B-C-D (cible)',
    alignementNIST: 'PR'
  },
  PLN: {
    code: 'ETP.PLN',
    nom: 'Planification',
    description: 'Feuille de route, planning, estimation',
    couleur: '#0ea5e9',
    classe: 'etape-planification',
    ordre: 4,
    alignementTOGAF: 'Phase E-F',
    alignementNIST: 'PR'
  },
  REA: {
    code: 'ETP.REA',
    nom: 'Réalisation',
    description: 'Développement, construction, intégration',
    couleur: '#14b8a6',
    classe: 'etape-realisation',
    ordre: 5,
    alignementTOGAF: 'Phase G (build)',
    alignementNIST: 'PR'
  },
  DEP: {
    code: 'ETP.DEP',
    nom: 'Déploiement',
    description: 'Mise en production, migration',
    couleur: '#22c55e',
    classe: 'etape-deploiement',
    ordre: 6,
    alignementTOGAF: 'Phase G (deploy)',
    alignementNIST: 'PR'
  },
  EXP: {
    code: 'ETP.EXP',
    nom: 'Exploitation',
    description: 'Run, maintenance, support niveau 2-3',
    couleur: '#f59e0b',
    classe: 'etape-exploitation',
    ordre: 7,
    alignementTOGAF: 'Phase H (run)',
    alignementNIST: 'DE+RS'
  },
  AME: {
    code: 'ETP.AME',
    nom: 'Amélioration',
    description: 'Optimisation continue, retex',
    couleur: '#eab308',
    classe: 'etape-amelioration',
    ordre: 8,
    alignementTOGAF: 'Phase H (improve)',
    alignementNIST: 'RC+ID.IM'
  }
};

// Alias pour rétrocompatibilité avec l'ancien TYPE_TACHES (format tableau)
// Les emojis sont conservés pour l'affichage legacy
const NATURE_EMOJIS = { INC: '🔥', SUP: '💬', MCO: '🔧', PRJ: '🚀', OVH: '📋' };
export const TYPE_TACHES = Object.entries(NATURE_ACTIVITE).map(([code, n]) => ({
  id: n.id,
  emoji: NATURE_EMOJIS[code],
  couleur: n.couleur,
  classe: n.classe.replace('nature-', 'type-')
}));

export const CIBLES_POURCENTAGES = {
  previsibilite: {
    'Imprévisible': { min: 0, max: 45, ideal: 40 },
    'Prévisible': { min: 55, max: 100, ideal: 60 }
  },
  type: {
    'Incident': { min: 5, max: 30, ideal: 15 },
    'Support': { min: 20, max: 50, ideal: 35 },
    'MCO': { min: 10, max: 40, ideal: 25 },
    'Projet': { min: 20, max: 60, ideal: 40 },
    'Overhead': { min: 5, max: 25, ideal: 15 }
  }
};

export const SEMAINE_TYPE = {
  heures_totales: 40,
  repartition: {
    'Imprévisible': 16,
    'Prévisible': 24
  }
};

export const SEUILS_AGE = {
  FRESH: 3,
  NORMAL: 7,
  WARNING: 14,
  CRITICAL: 999
};

export const SEUILS_ALERTES = {
  imprevisible_warning: 45,
  imprevisible_critique: 50,
  projet_warning: 20,
  projet_critique: 15,
  dette_technique_jours: 90,
  bloque_jours: 7
};

// === DONNÉES STRATÉGIQUES INTÉGRÉES ===
// Ces données sont synchronisées avec la table Grist `Ssir_strategie2`
// et permettent d'initialiser immédiatement l'application avec les
// mêmes références que la production.
export const STRATEGY_DATA = [
  {
    "id": 1,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "axe_strategique": "Refonte et simplification des nomenclatures de groupes de sécurité et des groupes de distribution, et création de groupes, comptes, boîte mail ou liste de diffusion par le bureau exploitation.",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 2,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "axe_strategique": "Établissement de procédures partagées (bonnes pratiques)",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 3,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "axe_strategique": "Création et animation du réseau des correspondants informatiques",
    "responsable": "CGSSI+ISI",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 4,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "axe_strategique": "Ouverture d'un guichet unique",
    "responsable": "GSSI",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 5,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "axe_strategique": "Attribution des privilèges d'accès selon des critères respectant le principe du moindre privilège.",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 6,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "axe_strategique": "Mise en conformité et durcissement de l'AD",
    "responsable": "Exploitation",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 7,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "axe_strategique": "Suivi du plan d'action de l'audit réseau pour disposer d'une architecture réseau simplifiée, segmentée, exploitable et maintenable",
    "responsable": "Réseaux",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 8,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "axe_strategique": "Mise en place d'un outil de suivi et anticipation des actions",
    "responsable": "Réseaux",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 9,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "axe_strategique": "Simplification des architectures : internet, intranet, extranet, serveurs de fichiers, serveur mail…",
    "responsable": "Réseaux",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 10,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "axe_strategique": "Sécurisation et homogénéisation des moyens d'accès distant (RDS, VPN, dotations en matériel portable)",
    "responsable": "ISI+CGSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 11,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "axe_strategique": "Sécurisation et homogénéisation des moyens d'accès distant (RDS, VPN, dotations en matériel portable)",
    "responsable": "Exploitation",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 12,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "axe_strategique": "Sécurisation et homogénéisation des moyens d'accès distant (RDS, VPN, dotations en matériel portable)",
    "responsable": "ISI+RSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 13,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Rédaction d'une charte utilisateur des systèmes d'information",
    "responsable": "GSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 14,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Définition et mise en œuvre d'une politique de sauvegarde et PRA",
    "responsable": "Réseaux",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 15,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Réalisation d'un inventaire SI et cartographie applicative",
    "responsable": "CGSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 16,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Mise en place d'une gestion de configuration",
    "responsable": "Exploitation",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 17,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Mise en place d'une gouvernance SI (comité de pilotage, comités métiers, comité technique)",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 18,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Nommer un RSSI à temps plein",
    "responsable": "Direction",
    "echeance": "2024",
    "portee": "Générale"
  },
  {
    "id": 19,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Mettre en place une gestion des risques et un registre de sécurité",
    "responsable": "RSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 20,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Définir une politique de développement interne",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 21,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Mettre en place des indicateurs de performance et de qualité du SI",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 22,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Mettre en place une politique de veille technologique",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 23,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "axe_strategique": "Mettre en place une politique de gestion de la connaissance",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 24,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "axe_strategique": "Mettre en place un contrôle d'accès physique aux salles informatiques",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 25,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "axe_strategique": "Mettre en place une gestion centralisée des comptes et des droits",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 26,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "axe_strategique": "Mettre en place une solution MFA pour l'ensemble des accès sensibles",
    "responsable": "RSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 27,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "axe_strategique": "Mettre en place un système de détection et prévention des intrusions",
    "responsable": "RSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 28,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "axe_strategique": "Mettre en place une surveillance des journaux et une SIEM",
    "responsable": "RSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 29,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "axe_strategique": "Mettre en place une politique de mots de passe renforcée",
    "responsable": "RSSI",
    "echeance": "2024",
    "portee": "Générale"
  },
  {
    "id": 30,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "axe_strategique": "Mettre en place une gestion des habilitations basée sur les rôles",
    "responsable": "Exploitation",
    "echeance": "2024-2026",
    "portee": "Générale"
  }
];

// === MESSAGES ET TEXTES ===
export const MESSAGES = {
  ERRORS: {
    SAVE_FAILED: 'Erreur lors de la sauvegarde',
    LOAD_FAILED: 'Erreur lors du chargement des données',
    DELETE_FAILED: 'Erreur lors de la suppression',
    DRAG_FAILED: 'Erreur lors du déplacement'
  },
  CONFIRM: {
    DELETE_TASK: 'Êtes-vous sûr de vouloir supprimer cette tâche ?',
    CLEAR_DATES: 'Supprimer toutes les dates butoir de toutes les tâches ?'
  },
  PLACEHOLDER: {
    SEARCH: 'Rechercher...',
    DATE_PICKER: 'Cliquer pour choisir une date...',
    DESCRIPTION: 'Décrivez la tâche, les blocages, les actions réalisées...'
  }
};

// === ICÔNES PAR BUREAU ===
export const BUREAU_ICONS = {
  'exploit': 'bi-gear-wide-connected',  // Admins système - engrenages connectés
  'réseau': 'bi-diagram-3',             // Réseau - diagramme de réseau plus visible
  'reseau': 'bi-diagram-3',             // Réseau - diagramme de réseau plus visible  
  'bdd': 'bi-database',                 // DBA + applications - base de données
  'chef': 'bi-person-badge-fill',       // Chef SSIR - badge rempli pour + d'autorité
  'ssir': 'bi-person-badge-fill',       // Chef SSIR - badge rempli pour + d'autorité
  'sig': 'bi-map',                      // SIG - carte géographique
  'nexsis': 'bi-broadcast-pin',         // Service parallèle - diffusion localisée
  'rrf': 'bi-broadcast-pin',            // Service parallèle - diffusion localisée
  'comsic': 'bi-router',                // Responsable opérationnel communications
  'rssi': 'bi-shield-lock-fill',        // Responsable sécurité - bouclier rempli
  'dpo': 'bi-file-earmark-person',      // DPO - fichier personne
  'cgssi': 'bi-stars',                  // Chef de groupement - étoiles pour grade
  'default': 'bi-building'
};

// === UTILITAIRES ===
export const getStatutById = (id) => STATUTS.find(s => s.id === id);
export const getStatutByClasse = (classe) => STATUTS.find(s => s.classe === classe);
export const getDefaultStatuts = () => STATUTS.map(s => s.id);
export const getStatusAccent = (id) => STATUS_ACCENTS[id] || STATUS_ACCENTS.default;


// === CONFIGURATION LOGS ===
export const LOG_CONFIG = {
  PRODUCTION: false,  // Mode test : logs complets
  LEVEL: 'DEBUG',     // ERROR, WARN, INFO, DEBUG
  MODULES: {
    // Modules autorisés à logger en test
    'kanban-app': 'DEBUG',
    'KanbanManager': 'DEBUG', 
    'GristManager': 'DEBUG',
    'ViewManager': 'DEBUG',
    'FilterManager': 'DEBUG',
    'ModalManager': 'DEBUG'
  }
};

// === GENRE D'ACTION (Comment réalise-t-on la tâche ?) ===
// Nomenclature explicite avec catégories - aligné COBIT 2019
export const GENRE_ACTION = {
  // === PRODUCTION (aligné COBIT BAI) ===
  DOC: {
    code: 'DOC',
    nom: 'Documentation',
    description: 'Rédaction, mise à jour de documentation technique ou fonctionnelle',
    famille: 'production',
    couleur: '#3b82f6',
    icone: 'bi-file-earmark-text',
    alignementCOBIT: 'BAI'
  },
  ANA: {
    code: 'ANA',
    nom: 'Analyse',
    description: 'Étude, investigation, diagnostic',
    famille: 'production',
    couleur: '#8b5cf6',
    icone: 'bi-graph-up',
    alignementCOBIT: 'BAI'
  },
  CON: {
    code: 'CON',
    nom: 'Conception',
    description: 'Design, architecture',
    famille: 'production',
    couleur: '#6366f1',
    icone: 'bi-lightbulb',
    alignementCOBIT: 'BAI'
  },
  RCH: {
    code: 'RCH',
    nom: 'Recherche',
    description: 'POC, exploration, benchmark',
    famille: 'production',
    couleur: '#a855f7',
    icone: 'bi-search',
    alignementCOBIT: 'BAI'
  },
  DEV: {
    code: 'DEV',
    nom: 'Développement',
    description: 'Codage, scripting, configuration avancée',
    famille: 'production',
    couleur: '#7c3aed',
    icone: 'bi-code-slash',
    alignementCOBIT: 'BAI'
  },

  // === QUALITE (aligné COBIT MEA) ===
  TST: {
    code: 'TST',
    nom: 'Test',
    description: 'Tests techniques, non-régression',
    famille: 'qualite',
    couleur: '#10b981',
    icone: 'bi-bug',
    alignementCOBIT: 'MEA'
  },
  VAL: {
    code: 'VAL',
    nom: 'Validation',
    description: 'Recette fonctionnelle, UAT',
    famille: 'qualite',
    couleur: '#22c55e',
    icone: 'bi-check-circle',
    alignementCOBIT: 'MEA'
  },
  VER: {
    code: 'VER',
    nom: 'Vérification',
    description: 'Audit, contrôle de conformité',
    famille: 'qualite',
    couleur: '#14b8a6',
    icone: 'bi-clipboard-check',
    alignementCOBIT: 'MEA'
  },
  COR: {
    code: 'COR',
    nom: 'Correction',
    description: 'Fix, résolution de bug, patch',
    famille: 'qualite',
    couleur: '#ef4444',
    icone: 'bi-wrench',
    alignementCOBIT: 'MEA'
  },

  // === OPERATIONNEL (aligné COBIT DSS) ===
  INS: {
    code: 'INS',
    nom: 'Installation',
    description: 'Déploiement, mise en production',
    famille: 'operationnel',
    couleur: '#059669',
    icone: 'bi-download',
    alignementCOBIT: 'DSS'
  },
  CFG: {
    code: 'CFG',
    nom: 'Configuration',
    description: 'Paramétrage, tuning',
    famille: 'operationnel',
    couleur: '#f97316',
    icone: 'bi-sliders',
    alignementCOBIT: 'DSS'
  },
  INV: {
    code: 'INV',
    nom: 'Inventaire',
    description: 'Recensement, cartographie',
    famille: 'operationnel',
    couleur: '#f59e0b',
    icone: 'bi-box-seam',
    alignementCOBIT: 'DSS'
  },
  SEC: {
    code: 'SEC',
    nom: 'Sécurisation',
    description: 'Durcissement, remédiation',
    famille: 'operationnel',
    couleur: '#dc2626',
    icone: 'bi-shield-lock',
    alignementCOBIT: 'DSS'
  },

  // === COLLABORATION ===
  REU: {
    code: 'REU',
    nom: 'Réunion',
    description: 'Point, comité, atelier',
    famille: 'collaboration',
    couleur: '#0ea5e9',
    icone: 'bi-people',
    alignementCOBIT: 'APO'
  },
  FOR: {
    code: 'FOR',
    nom: 'Formation',
    description: 'Montée en compétence, transfert',
    famille: 'collaboration',
    couleur: '#06b6d4',
    icone: 'bi-mortarboard',
    alignementCOBIT: 'APO'
  },

  // === PILOTAGE (aligné COBIT EDM) ===
  SUI: {
    code: 'SUI',
    nom: 'Suivi',
    description: 'Pilotage, reporting, dashboard',
    famille: 'pilotage',
    couleur: '#eab308',
    icone: 'bi-bar-chart',
    alignementCOBIT: 'EDM'
  },
  VEI: {
    code: 'VEI',
    nom: 'Veille',
    description: 'Surveillance, monitoring, alerting',
    famille: 'pilotage',
    couleur: '#84cc16',
    icone: 'bi-eye',
    alignementCOBIT: 'EDM'
  }
};

// Familles de genres d'action (alignées COBIT 2019)
export const FAMILLE_ACTION = {
  production: { nom: 'Production', couleur: '#6366f1', icone: 'bi-gear', alignementCOBIT: 'BAI' },
  qualite: { nom: 'Qualité', couleur: '#22c55e', icone: 'bi-check2-all', alignementCOBIT: 'MEA' },
  operationnel: { nom: 'Opérationnel', couleur: '#f59e0b', icone: 'bi-wrench-adjustable', alignementCOBIT: 'DSS' },
  collaboration: { nom: 'Collaboration', couleur: '#0ea5e9', icone: 'bi-people-fill', alignementCOBIT: 'APO' },
  pilotage: { nom: 'Pilotage', couleur: '#eab308', icone: 'bi-binoculars', alignementCOBIT: 'EDM' }
};

// Alias pour rétrocompatibilité avec TASK_TYPES
export const TASK_TYPES = GENRE_ACTION;

// Alias pour rétrocompatibilité avec TASK_TYPE_CATEGORIES
export const TASK_TYPE_CATEGORIES = FAMILLE_ACTION;

// Types de liaisons entre tâches
export const TASK_LINK_TYPES = {
  DEPENDS_ON: {
    code: 'DEPENDS_ON',
    nom: 'Dépend de',
    nomInverse: 'Bloque',
    description: 'Cette tâche dépend de la complétion d\'une autre',
    couleur: '#ef4444',
    style: 'solid'
  },
  BLOCKS: {
    code: 'BLOCKS',
    nom: 'Bloque',
    nomInverse: 'Dépend de',
    description: 'Cette tâche bloque une autre tâche',
    couleur: '#f97316',
    style: 'solid'
  },
  RELATED_TO: {
    code: 'RELATED_TO',
    nom: 'Liée à',
    nomInverse: 'Liée à',
    description: 'Tâches liées sans dépendance',
    couleur: '#3b82f6',
    style: 'dashed'
  },
  SUBTASK_OF: {
    code: 'SUBTASK_OF',
    nom: 'Sous-tâche de',
    nomInverse: 'Parent de',
    description: 'Relation hiérarchique parent/enfant',
    couleur: '#8b5cf6',
    style: 'solid'
  },
  DUPLICATES: {
    code: 'DUPLICATES',
    nom: 'Duplique',
    nomInverse: 'Dupliquée par',
    description: 'Tâche en doublon',
    couleur: '#64748b',
    style: 'dotted'
  }
};

// === UTILITAIRES TAXONOMIE V3 ===

// Nature d'activité
export const getNatureActivite = (code) => NATURE_ACTIVITE[code] || null;
export const getNatureActiviteByLegacyId = (id) =>
  Object.values(NATURE_ACTIVITE).find(n => n.id === id) || null;
export const getAllNaturesActivite = () => Object.values(NATURE_ACTIVITE);
export const getNaturesActiviteList = () => Object.keys(NATURE_ACTIVITE);

// Genre d'action
export const getGenreAction = (code) => GENRE_ACTION[code] || null;
export const getGenresActionByFamille = (famille) =>
  Object.values(GENRE_ACTION).filter(g => g.famille === famille);
export const getAllGenresAction = () => Object.values(GENRE_ACTION);
export const getGenresActionList = () => Object.keys(GENRE_ACTION);

// Étape du cycle
export const getEtapeCycle = (code) => {
  // Accepte 'ETP.VIS' ou 'VIS'
  const shortCode = code?.replace('ETP.', '');
  return ETAPE_CYCLE[shortCode] || null;
};
export const getAllEtapesCycle = () => Object.values(ETAPE_CYCLE).sort((a, b) => a.ordre - b.ordre);
export const getEtapesCycleList = () => Object.keys(ETAPE_CYCLE);

// Famille d'action
export const getFamilleAction = (code) => FAMILLE_ACTION[code] || null;
export const getAllFamillesAction = () => Object.values(FAMILLE_ACTION);

// Prévisibilité calculée
export const calculerPrevisibilite = (natureCode, previsibiliteManuelle) => {
  if (previsibiliteManuelle) return previsibiliteManuelle;
  const nature = NATURE_ACTIVITE[natureCode];
  return nature?.previsibiliteDefaut || null;
};

// Alias rétrocompatibilité (anciens noms)
export const getTaskType = (code) => GENRE_ACTION[code] || null;
export const getTaskTypesByCategory = (famille) => getGenresActionByFamille(famille);
export const getAllTaskTypes = () => getAllGenresAction();
export const getTaskTypesList = () => getGenresActionList();
export const getLinkType = (code) => TASK_LINK_TYPES[code] || null;

// === VALIDATION ===
export const isValidStatut = (statut) => STATUTS.some(s => s.id === statut);
export const isValidPriority = (priority) => Object.values(PRIORITY_LEVELS).includes(priority);
export const isValidViewMode = (mode) => Object.values(VIEW_MODES).includes(mode);
export const isValidNatureActivite = (code) => code in NATURE_ACTIVITE;
export const isValidGenreAction = (code) => code in GENRE_ACTION;
export const isValidEtapeCycle = (code) => {
  const shortCode = code?.replace('ETP.', '');
  return shortCode in ETAPE_CYCLE;
};
export const isValidTaskType = (code) => isValidGenreAction(code); // Alias
export const isValidLinkType = (code) => code in TASK_LINK_TYPES;
