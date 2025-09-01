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
  'id_task', 'titre', 'description', 'statut', 'bureau', 'qui', 'urgence', 'impact',
  'projet', 'strategie_id', 'notes', 'date_derniere_maj', 'statut_precedent'
  // Note: id_task est l'identifiant unique (pas 'id')
  // Note: reference et jalons sont maintenant dans OPTIONAL_COLUMNS (comme en prod)
];

export const OPTIONAL_COLUMNS = [
  'date_debut', 'date_echeance', 'jalons', 'reference',
  // Colonnes de prod actives
  'type_tache_id', 'priorite', 'historique_statuts', 'datenow', 
  'str_statut', 'str_urgence', 'str_qui', 'str_bureau', 'str_impact',
  'date_creation', 'date_modif', 'Créé par'
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


// === CONFIGURATION LOGS ===
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
