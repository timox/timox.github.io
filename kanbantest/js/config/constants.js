// === config/constants.js ===
// Configuration centralisée pour l'application Kanban

// === STATUTS DU KANBAN ===
export const STATUTS = [
  { id: 'Backlog', libelle: 'Backlog', classe: 'backlog', icone: '<i class="bi bi-archive text-secondary"></i>' },
  { id: 'À faire', libelle: 'À faire', classe: 'a-faire', icone: '<i class="bi bi-tools text-primary"></i>' },
  { id: 'En cours', libelle: 'En cours', classe: 'en-cours', icone: '<i class="bi bi-lightning text-warning"></i>' },
  { id: 'En attente', libelle: 'En attente', classe: 'en-attente', icone: '<i class="bi bi-pause-circle text-info"></i>' },
  { id: 'Bloqué', libelle: 'Bloqué', classe: 'bloque', icone: '<i class="bi bi-x-circle text-danger"></i>' },
  { id: 'Validation', libelle: 'Validation', classe: 'validation', icone: '<i class="bi bi-clipboard-check text-warning"></i>' },
  { id: 'Terminé', libelle: 'Terminé', classe: 'termine', icone: '<i class="bi bi-check-circle text-success"></i>' }
];

export const STATUS_ACCENTS = {
  'Backlog': '#6c757d',
  'À faire': '#0ea5e9',
  'En cours': '#f97316',
  'En attente': '#eab308',
  'Bloqué': '#ef4444',
  'Validation': '#8b5cf6',
  'Terminé': '#22c55e',
  'default': '#6c757d'
};

// === DONNÉES DE BASE ===
export const DEFAULT_BUREAUX = [
  'Exploit', 'Réseau', 'BDD', 'Chef SSIR', 'SIG',
  'NEXSIS-RRF', 'COMSIC', 'RSSI', 'DPO', 'CGSSI'
];

export const DEFAULT_RESPONSABLES = [
  'Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo', 
  'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta', 'Yvon',
  'Clarisse', 'Hervé', 'Didier'
];

export const DEFAULT_URGENCES = ['Immédiate', 'Courte', 'Moyenne', 'Longue'];
export const DEFAULT_IMPACTS = ['Critique', 'Important', 'Modéré', 'Mineur'];
export const DEFAULT_PROJETS = [];

// === CONFIGURATION GRIST ===
export const TABLE_ID = "Ssir_principale_task";

// === COLONNES REQUISES ET OPTIONNELLES ===
export const REQUIRED_COLUMNS = [
  'id', 'id_task', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_id', 'notes', 'date_derniere_maj', 'statut_precedent'
  // Note: reference et jalons sont maintenant dans OPTIONAL_COLUMNS (comme en prod)
];

export const OPTIONAL_COLUMNS = [
  'date_debut', 'date_echeance', 'jalons', 'reference',
  // Colonnes de prod actives
  'type_tache_id', 'priorite', 'historique_statuts', 'datenow',
  'str_statut', 'str_urgence', 'str_qui', 'str_bureau', 'str_impact',
  'date_creation', 'date_modif', 'Créé par',
  // Colonnes temps et liaisons (Dec 2025)
  'temps_estime_heures', 'temps_reel_heures', 'tache_liens'
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

// === DONNÉES STRATÉGIQUES INTÉGRÉES ===
// Ces données sont synchronisées avec la table Grist `Ssir_strategie2`
// et permettent d'initialiser immédiatement l'application avec les
// mêmes références que la production.
export const STRATEGY_DATA = [
  {
    "id": 1,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "action": "Refonte et simplification des nomenclatures de groupes de sécurité et des groupes de distribution, et création de groupes, comptes, boîte mail ou liste de diffusion par le bureau exploitation.",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 2,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "action": "Établissement de procédures partagées (bonnes pratiques)",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 3,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "action": "Création et animation du réseau des correspondants informatiques",
    "responsable": "CGSSI+ISI",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 4,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "action": "Ouverture d'un guichet unique",
    "responsable": "GSSI",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 5,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Appliquer les dispositions organisationnelles des annexes 1 et 2",
    "action": "Attribution des privilèges d'accès selon des critères respectant le principe du moindre privilège.",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "GSSI"
  },
  {
    "id": 6,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "action": "Mise en conformité et durcissement de l'AD",
    "responsable": "Exploitation",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 7,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "action": "Suivi du plan d'action de l'audit réseau pour disposer d'une architecture réseau simplifiée, segmentée, exploitable et maintenable",
    "responsable": "Réseaux",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 8,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "action": "Mise en place d'un outil de suivi et anticipation des actions",
    "responsable": "Réseaux",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 9,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "action": "Simplification des architectures : internet, intranet, extranet, serveurs de fichiers, serveur mail…",
    "responsable": "Réseaux",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 10,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "action": "Sécurisation et homogénéisation des moyens d'accès distant (RDS, VPN, dotations en matériel portable)",
    "responsable": "ISI+CGSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 11,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "action": "Sécurisation et homogénéisation des moyens d'accès distant (RDS, VPN, dotations en matériel portable)",
    "responsable": "Exploitation",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 12,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre en conformité les réseaux, logiciels et matériels",
    "action": "Sécurisation et homogénéisation des moyens d'accès distant (RDS, VPN, dotations en matériel portable)",
    "responsable": "ISI+RSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 13,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Rédaction d'une charte utilisateur des systèmes d'information",
    "responsable": "GSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 14,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Définition et mise en œuvre d'une politique de sauvegarde et PRA",
    "responsable": "Réseaux",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 15,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Réalisation d'un inventaire SI et cartographie applicative",
    "responsable": "CGSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 16,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Mise en place d'une gestion de configuration",
    "responsable": "Exploitation",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 17,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Mise en place d'une gouvernance SI (comité de pilotage, comités métiers, comité technique)",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 18,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Nommer un RSSI à temps plein",
    "responsable": "Direction",
    "echeance": "2024",
    "portee": "Générale"
  },
  {
    "id": 19,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Mettre en place une gestion des risques et un registre de sécurité",
    "responsable": "RSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 20,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Définir une politique de développement interne",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 21,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Mettre en place des indicateurs de performance et de qualité du SI",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 22,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Mettre en place une politique de veille technologique",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 23,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Mettre en place une politique de gestion de la connaissance",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 24,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "action": "Mettre en place un contrôle d'accès physique aux salles informatiques",
    "responsable": "CGSSI",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 25,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "action": "Mettre en place une gestion centralisée des comptes et des droits",
    "responsable": "Exploitation",
    "echeance": "2024-2025",
    "portee": "Générale"
  },
  {
    "id": 26,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "action": "Mettre en place une solution MFA pour l'ensemble des accès sensibles",
    "responsable": "RSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 27,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "action": "Mettre en place un système de détection et prévention des intrusions",
    "responsable": "RSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 28,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "action": "Mettre en place une surveillance des journaux et une SIEM",
    "responsable": "RSSI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 29,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "action": "Mettre en place une politique de mots de passe renforcée",
    "responsable": "RSSI",
    "echeance": "2024",
    "portee": "Générale"
  },
  {
    "id": 30,
    "objectif": "Sécuriser les systèmes d'information",
    "sous_objectif": "Renforcer la sécurité des accès physiques et logiques",
    "action": "Mettre en place une gestion des habilitations basée sur les rôles",
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

// === TYPES DE TACHES ===
// Nomenclature explicite des types de tâches avec catégories
export const TASK_TYPES = {
  // === PRODUCTION DOCUMENTAIRE ===
  DOC: {
    code: 'DOC',
    nom: 'Documentation',
    description: 'Rédaction, mise à jour de documentation technique ou fonctionnelle',
    categorie: 'production',
    couleur: '#3b82f6', // blue
    icone: 'bi-file-earmark-text'
  },
  ANA: {
    code: 'ANA',
    nom: 'Analyse',
    description: 'Analyse de besoins, de problèmes, études préalables',
    categorie: 'production',
    couleur: '#8b5cf6', // violet
    icone: 'bi-graph-up'
  },
  CON: {
    code: 'CON',
    nom: 'Conception',
    description: 'Conception technique ou fonctionnelle, architecture',
    categorie: 'production',
    couleur: '#6366f1', // indigo
    icone: 'bi-lightbulb'
  },
  RCH: {
    code: 'RCH',
    nom: 'Recherche',
    description: 'Recherche de solutions, investigation, POC',
    categorie: 'production',
    couleur: '#a855f7', // purple
    icone: 'bi-search'
  },

  // === QUALITE / VERIFICATION ===
  VAL: {
    code: 'VAL',
    nom: 'Validation',
    description: 'Validation fonctionnelle, recette, approbation',
    categorie: 'qualite',
    couleur: '#22c55e', // green
    icone: 'bi-check-circle'
  },
  TST: {
    code: 'TST',
    nom: 'Test',
    description: 'Tests techniques, tests unitaires, tests d\'intégration',
    categorie: 'qualite',
    couleur: '#10b981', // emerald
    icone: 'bi-bug'
  },
  VER: {
    code: 'VER',
    nom: 'Vérification',
    description: 'Contrôle de conformité, audit interne, vérification',
    categorie: 'qualite',
    couleur: '#14b8a6', // teal
    icone: 'bi-clipboard-check'
  },
  COR: {
    code: 'COR',
    nom: 'Correction',
    description: 'Correction de bugs, résolution d\'anomalies',
    categorie: 'qualite',
    couleur: '#ef4444', // red
    icone: 'bi-wrench'
  },

  // === OPERATIONNEL ===
  INV: {
    code: 'INV',
    nom: 'Inventaire',
    description: 'Inventaire matériel, logiciel, recensement',
    categorie: 'operationnel',
    couleur: '#f59e0b', // amber
    icone: 'bi-box-seam'
  },
  PRE: {
    code: 'PRE',
    nom: 'Préparation matériel',
    description: 'Préparation, configuration de matériel',
    categorie: 'operationnel',
    couleur: '#f97316', // orange
    icone: 'bi-tools'
  },
  ADM: {
    code: 'ADM',
    nom: 'Administration',
    description: 'Tâches administratives, gestion documentaire',
    categorie: 'operationnel',
    couleur: '#64748b', // slate
    icone: 'bi-folder2'
  },
  SEC: {
    code: 'SEC',
    nom: 'Sécurisation',
    description: 'Actions de sécurisation, durcissement, mise en conformité sécurité',
    categorie: 'operationnel',
    couleur: '#dc2626', // red-600
    icone: 'bi-shield-lock'
  },

  // === COLLABORATION ===
  REU: {
    code: 'REU',
    nom: 'Réunion',
    description: 'Réunion, point d\'équipe, comité, atelier',
    categorie: 'collaboration',
    couleur: '#0ea5e9', // sky
    icone: 'bi-people'
  },
  PST: {
    code: 'PST',
    nom: 'Prestation',
    description: 'Intervention prestataire, support externe',
    categorie: 'collaboration',
    couleur: '#06b6d4', // cyan
    icone: 'bi-person-badge'
  },

  // === SUIVI / VEILLE ===
  SUI: {
    code: 'SUI',
    nom: 'Suivi',
    description: 'Suivi de projet, suivi d\'indicateurs, reporting',
    categorie: 'suivi',
    couleur: '#eab308', // yellow
    icone: 'bi-bar-chart'
  },
  VEI: {
    code: 'VEI',
    nom: 'Veille',
    description: 'Veille technologique, veille sécurité, surveillance',
    categorie: 'suivi',
    couleur: '#84cc16', // lime
    icone: 'bi-eye'
  }
};

// Catégories de types de tâches
export const TASK_TYPE_CATEGORIES = {
  production: { nom: 'Production', couleur: '#6366f1', icone: 'bi-gear' },
  qualite: { nom: 'Qualité', couleur: '#22c55e', icone: 'bi-check2-all' },
  operationnel: { nom: 'Opérationnel', couleur: '#f59e0b', icone: 'bi-wrench-adjustable' },
  collaboration: { nom: 'Collaboration', couleur: '#0ea5e9', icone: 'bi-people-fill' },
  suivi: { nom: 'Suivi & Veille', couleur: '#eab308', icone: 'bi-binoculars' }
};

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

// Utilitaires pour les types de tâches
export const getTaskType = (code) => TASK_TYPES[code] || null;
export const getTaskTypesByCategory = (categorie) =>
  Object.values(TASK_TYPES).filter(t => t.categorie === categorie);
export const getAllTaskTypes = () => Object.values(TASK_TYPES);
export const getTaskTypesList = () => Object.keys(TASK_TYPES);
export const getLinkType = (code) => TASK_LINK_TYPES[code] || null;

// === VALIDATION ===
export const isValidStatut = (statut) => STATUTS.some(s => s.id === statut);
export const isValidPriority = (priority) => Object.values(PRIORITY_LEVELS).includes(priority);
export const isValidViewMode = (mode) => Object.values(VIEW_MODES).includes(mode);
export const isValidTaskType = (code) => code in TASK_TYPES;
export const isValidLinkType = (code) => code in TASK_LINK_TYPES;
