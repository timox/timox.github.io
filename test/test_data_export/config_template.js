
// Configuration pour environnement de test isolé
// À mettre dans /test/js/config/constants.js

export const GRIST_CONFIG = {
  DOC_ID: "VOTRE_DOC_ID_TEST_ICI",          // À récupérer depuis Grist
  API_KEY: "VOTRE_API_KEY_TEST_ICI",        // À récupérer depuis Grist
  SERVER: "https://grist.numerique.gouv.fr"
};

export const TABLE_ID = "Ssir_principale_task";
export const STRATEGIES_TABLE_ID = "Ssir_strategie2";

// Données de test en dur (backup)
export const TEST_MODE = true;
export const TEST_DATA_AVAILABLE = true;
