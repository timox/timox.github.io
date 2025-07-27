// === CONFIGURATION ENVIRONNEMENT DE TEST ISOLÉ ===
// DOC_ID: DOC_ID_SUPPRIME (Kanban GSSI - Environnement Test)

// Configuration Grist pour l'environnement de test
export const GRIST_TEST_CONFIG = {
  DOC_ID: "DOC_ID_SUPPRIME",
  SERVER: "https://grist.numerique.gouv.fr"
};

// Remplacement des constantes pour l'environnement de test
export const TABLE_ID = "Ssir_principale_task";
export const STRATEGIES_TABLE_ID = "Ssir_strategie2";
export const USER_ACTIONS_TABLE = "User_Actions2";

// Mode test activé
export const TEST_MODE = true;
export const TEST_ENVIRONMENT = true;

// Reprendre toutes les autres constantes depuis constants.js
export const STATUTS = [
  { value: 'Backlog', label: 'Backlog', icon: 'inbox', color: '#6c757d' },
  { value: 'À faire', label: 'À faire', icon: 'list-task', color: '#007bff' },
  { value: 'En cours', label: 'En cours', icon: 'arrow-clockwise', color: '#fd7e14' },
  { value: 'En attente', label: 'En attente', icon: 'pause-circle', color: '#ffc107' },
  { value: 'Bloqué', label: 'Bloqué', icon: 'x-octagon', color: '#dc3545' },
  { value: 'Validation', label: 'Validation', icon: 'check-circle', color: '#20c997' },
  { value: 'Terminé', label: 'Terminé', icon: 'check-circle-fill', color: '#28a745' }
];

export const DEFAULT_BUREAUX = [
  'Exploit', 'Réseau', 'BDD', 'Chef GSSI', 'SIG',
  'NEXSIS-RRF', 'COMSIC', 'RSSI', 'DPO'
];

export const DEFAULT_RESPONSABLES = [
  'TestUser1', 'TestUser2', 'AdminTest', 'DevTest', 'GSS1', 'GSSI2'
];

export const REQUIRED_COLUMNS = [
  'id', 'id_task', 'titre', 'description', 'statut', 'bureau', 'qui', 
  'urgence', 'impact', 'projet', 'strategie_id', 'notes', 
  'date_derniere_maj', 'statut_precedent'
];

export const OPTIONAL_COLUMNS = [
  'date_debut', 'date_echeance', 'jalons', 'date_creation', 'Cree_par', 'UUID'
];

export const VIEW_MODES = {
  COMPACT: 'compact',
  DETAILED: 'detailed', 
  FOCUS: 'focus'
};

export function getDefaultStatuts() {
  return STATUTS.map(s => s.value);
}

// Log de configuration test
console.log('🧪 Configuration Test chargée - DOC_ID:', GRIST_TEST_CONFIG.DOC_ID);