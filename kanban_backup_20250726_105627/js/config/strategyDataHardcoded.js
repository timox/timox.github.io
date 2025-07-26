// === config/strategyDataHardcoded.js ===
// Données stratégiques intégrées (équivalent SSIR_strategie2)
// Mise à jour annuelle

export const STRATEGY_DATA = [
  // Exemple de structure - à remplacer par vos vraies données
  {
    id: 1,
    objectif: "Modernisation Infrastructure",
    sous_objectif: "Migration Cloud", 
    action: "Audit Infrastructure Existante",
    responsable: "DSI",
    echeance: "2025-12-31",
    portee: "National"
  },
  {
    id: 2,
    objectif: "Modernisation Infrastructure",
    sous_objectif: "Migration Cloud",
    action: "Sélection Fournisseur Cloud", 
    responsable: "Tech Lead",
    echeance: "2025-09-30",
    portee: "Régional"
  },
  {
    id: 3,
    objectif: "Modernisation Infrastructure",
    sous_objectif: "Virtualisation",
    action: "Évaluation Serveurs Physiques",
    responsable: "Admin Sys",
    echeance: "2025-08-15", 
    portee: "Local"
  },
  {
    id: 4,
    objectif: "Sécurité Renforcée",
    sous_objectif: "Authentification Multi-Facteur",
    action: "Déploiement Tokens Physiques",
    responsable: "RSSI",
    echeance: "2025-10-31",
    portee: "National"
  },
  {
    id: 5,
    objectif: "Sécurité Renforcée", 
    sous_objectif: "Monitoring Sécurité",
    action: "Mise en place SIEM",
    responsable: "Équipe Sécurité",
    echeance: "2025-11-30",
    portee: "National"
  }
  // TODO: Ajouter toutes vos stratégies réelles ici
  // Basé sur la structure de votre table Ssir_strategie2
];

/**
 * Simule le mapping Grist pour compatibilité
 * @param {Array} data - Données stratégiques
 * @returns {Object} Format compatible avec mapStrategyRecords
 */
export function convertToGristFormat(data) {
  const gristFormat = {
    id: {},
    objectif: {},
    sous_objectif: {},
    action: {},
    responsable: {},
    echeance: {},
    portee: {}
  };
  
  data.forEach((item, index) => {
    const key = index.toString();
    gristFormat.id[key] = item.id;
    gristFormat.objectif[key] = item.objectif;
    gristFormat.sous_objectif[key] = item.sous_objectif;
    gristFormat.action[key] = item.action;
    gristFormat.responsable[key] = item.responsable;
    gristFormat.echeance[key] = item.echeance;
    gristFormat.portee[key] = item.portee;
  });
  
  return gristFormat;
}