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
  'id', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_id', 'notes', 'date_derniere_maj', 'statut_precedent'
  // Removed: strategie_objectif, strategie_sous_objectif, strategie_action (auto-computed)
  // Removed: historique_statuts (Date field, not JSON)
];

export const OPTIONAL_COLUMNS = ['date_debut', 'date_echeance'];

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
  'exploit': 'bi-server',
  'réseau': 'bi-router',
  'reseau': 'bi-router',
  'bdd': 'bi-database',
  'chef': 'bi-person-badge',
  'ssir': 'bi-person-badge',
  'sig': 'bi-geo-alt',
  'nexsis': 'bi-broadcast',
  'rrf': 'bi-broadcast',
  'comsic': 'bi-shield-check',
  'rssi': 'bi-shield-lock',
  'dpo': 'bi-file-earmark-person',
  'default': 'bi-building'
};

// === UTILITAIRES ===
export const getStatutById = (id) => STATUTS.find(s => s.id === id);
export const getStatutByClasse = (classe) => STATUTS.find(s => s.classe === classe);
export const getDefaultStatuts = () => STATUTS.map(s => s.id);

// === DONNÉES STRATÉGIQUES INTÉGRÉES (depuis CSV SSIR_strategie2) ===
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
    "action": "Rédaction d'une charte spécifique pour les administrateurs système et les correspondants",
    "responsable": "GSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 15,
    "objectif": "Assurer le fonctionnement des systèmes d'information",
    "sous_objectif": "Mettre à jour le schéma directeur informatique du SDIS",
    "action": "Élaboration d'un plan de sauvegarde des données",
    "responsable": "GSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 16,
    "objectif": "Garantir la sécurité des systèmes d'information",
    "sous_objectif": "Établir la PSSI",
    "action": "Réalisation d'un audit sécurité : conformité à NIS2",
    "responsable": "ISI+RSSI+CGSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 17,
    "objectif": "Garantir la sécurité des systèmes d'information",
    "sous_objectif": "Établir la PSSI",
    "action": "Rédaction d'une PSSI prenant en compte la réglementation NIS2 et sa transposition.",
    "responsable": "ISI+RSSI+CGSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 18,
    "objectif": "Garantir la sécurité des systèmes d'information",
    "sous_objectif": "Appliquer la PSSI",
    "action": "Mise en place de procédures et actions prenant en compte la PSSI",
    "responsable": "GSSI+SDIS",
    "echeance": "2025-2030",
    "portee": "Générale"
  },
  {
    "id": 19,
    "objectif": "Garantir la sécurité des systèmes d'information",
    "sous_objectif": "Surveiller les activités informatiques",
    "action": "Amélioration des outils de supervision",
    "responsable": "RSSI+ISI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 20,
    "objectif": "Garantir la sécurité des systèmes d'information",
    "sous_objectif": "Surveiller les activités informatiques",
    "action": "Mise en conformité de la logique d'exposition sur internet",
    "responsable": "RSSI+ISI",
    "echeance": "2024-2026",
    "portee": "Générale"
  },
  {
    "id": 21,
    "objectif": "Garantir la sécurité des systèmes d'information",
    "sous_objectif": "Indicateurs de sécurité",
    "action": "Mise en place et partage d'indicateurs de sécurité",
    "responsable": "RSSI + CGSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 22,
    "objectif": "Garantir la sécurité des systèmes d'information",
    "sous_objectif": "Indicateurs de sécurité",
    "action": "Sensibilisation/formation à partir de ces indicateurs.",
    "responsable": "RSSI + CGSSI",
    "echeance": "2025",
    "portee": "Générale"
  },
  {
    "id": 23,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Pérenniser les outils à destination des métiers et utilisateurs",
    "action": "Transmission des connaissances d'exploitation et développement d'intranet",
    "responsable": "ISI",
    "echeance": "2024-",
    "portee": "Générale"
  },
  {
    "id": 24,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Pérenniser les outils à destination des métiers et utilisateurs",
    "action": "Aide à la maitrise d'ouvrage pour la continuité des outils et le support avec les fournisseurs de logiciels",
    "responsable": "ISI",
    "echeance": "2024-",
    "portee": "Générale"
  },
  {
    "id": 25,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Pérenniser les outils à destination des métiers et utilisateurs",
    "action": "Mise en œuvre d'un outil de déploiement automatisé",
    "responsable": "ISI",
    "echeance": "2024-",
    "portee": "Générale"
  },
  {
    "id": 26,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Préciser les démarches de qualification et validation du GSSI (AMO)",
    "action": "Document cadre (schéma directeur)",
    "responsable": "ISI+CGSSI",
    "echeance": "2024",
    "portee": "Générale"
  },
  {
    "id": 27,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Préciser les démarches de qualification et validation du GSSI (AMO)",
    "action": "Réunions avec chefs de groupements",
    "responsable": "CGSSI",
    "echeance": "2024-",
    "portee": "Générale"
  },
  {
    "id": 28,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Organiser les modalités de saisines et le suivi des réponses du service aux sollicitations",
    "action": "Simplification et optimisation du traitement des demandes avec guichet unique (pour l'instant GLPI et intranet)",
    "responsable": "RSSI+exploitation",
    "echeance": "2024-",
    "portee": "Générale"
  },
  {
    "id": 29,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Organiser les modalités de saisines et le suivi des réponses du service aux sollicitations",
    "action": "Mise en place d'un inventaire automatisé en lien avec un outil de déploiement des matériels",
    "responsable": "RSSI+exploitation",
    "echeance": "2024-",
    "portee": "Générale"
  },
  {
    "id": 30,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Organiser les modalités de saisines et le suivi des réponses du service aux sollicitations",
    "action": "Mise en place d'un inventaire automatisé en lien avec un outil de déploiement des matériels",
    "responsable": "Exploitation",
    "echeance": "2024",
    "portee": "Générale"
  },
  {
    "id": 31,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Mettre en place les solutions NexSIS-RRF",
    "action": "Évaluer le retroplanning avec les grandes actions",
    "responsable": "Équipe projet",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 32,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Mettre en place les solutions NexSIS-RRF",
    "action": "Définir les budgets et échéances financières",
    "responsable": "Équipe projet",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 33,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Mettre en place les solutions NexSIS-RRF",
    "action": "Prévoir et accompagner les évolutions techniques",
    "responsable": "Équipe projet",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 34,
    "objectif": "Répondre aux demandes des métiers",
    "sous_objectif": "Mettre en place les solutions NexSIS-RRF",
    "action": "Former et tenir au fait les utilisateurs",
    "responsable": "Équipe projet",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 35,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Bâtir les systèmes d'information de demain",
    "action": "Évaluer l'existant : intranet, extranet, GED, GEC, SAE, logiciels, intégration",
    "responsable": "Groupe de travail",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 36,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Bâtir les systèmes d'information de demain",
    "action": "Benchmark dans les autres SIS",
    "responsable": "Groupe de travail",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 37,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Bâtir les systèmes d'information de demain",
    "action": "Proposer les outils de demain (informatique = cloud, outils de communication modernes, téléphonie)",
    "responsable": "Groupe de travail",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 38,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Bâtir les systèmes d'information de demain",
    "action": "Mettre en place les outils de demain (nouvel intranet, workflows, tableaux de bord, outils de pilotage, circulation de l'information…)",
    "responsable": "Groupe de travail",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 39,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Bâtir les systèmes d'information de demain",
    "action": "Prendre en compte le PCA (Cloud, infrastructures réseau, communication, etc.)",
    "responsable": "Groupe de travail",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 40,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Mettre à jour le schéma directeur informatique",
    "action": "Prendre en compte les évolutions validées suite aux travaux des groupes",
    "responsable": "GSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 41,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Mettre à jour le schéma directeur informatique",
    "action": "Produire les plans de continuité et/ou de reprise de l'activité",
    "responsable": "GSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 42,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Mettre à jour le schéma directeur informatique",
    "action": "Veiller à la cohérence du système, aux opérations de nettoyage et de documentation",
    "responsable": "GSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  },
  {
    "id": 43,
    "objectif": "Assurer la transition vers les systèmes d'information de demain",
    "sous_objectif": "Mettre à jour le schéma directeur informatique",
    "action": "Inclure les nouveaux outils, les solutions émergentes",
    "responsable": "GSSI",
    "echeance": "2024-2030",
    "portee": "Générale"
  }
];

export const LOG_CONFIG = {
  PRODUCTION: false,  // Mode test : logs complets
  LEVEL: 'DEBUG',     // ERROR, WARN, INFO, DEBUG
  MODULES: {
    // Modules autorisés à logger en test
    'kanban-app': 'DEBUG',
    'KanbanManager': 'DEBUG', 
    'GristManager': 'DEBUG',
    'ViewModeManager': 'DEBUG',
    'FilterManager': 'DEBUG',
    'ModalManager': 'DEBUG'
  }
};

// === VALIDATION ===
export const isValidStatut = (statut) => STATUTS.some(s => s.id === statut);
export const isValidPriority = (priority) => Object.values(PRIORITY_LEVELS).includes(priority);
export const isValidViewMode = (mode) => Object.values(VIEW_MODES).includes(mode);
