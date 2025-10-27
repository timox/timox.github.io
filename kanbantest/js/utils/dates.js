// === utils/dates.js ===
// Utilitaires pour la gestion des dates dans l'application Kanban

import { TIME_THRESHOLDS, CSS_CLASSES } from '../config/constants.js';

/**
 * Normalise une valeur de date en format YYYY-MM-DD
 * @param {string|number|Date} dateValue - Valeur de date à normaliser
 * @returns {string|null} Date normalisée ou null si invalide
 */
export function normalizeDate(dateValue) {
  if (!dateValue) return null;
  
  // Si déjà au bon format YYYY-MM-DD
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateValue;
  }
  
  // Si c'est un timestamp (nombre ou string numérique)
  if (typeof dateValue === 'number' || (typeof dateValue === 'string' && !isNaN(dateValue))) {
    const timestamp = typeof dateValue === 'string' ? parseFloat(dateValue) : dateValue;
    
    let date;
    if (timestamp > 1000000000000) {
      // Timestamp en millisecondes
      date = new Date(timestamp);
    } else if (timestamp > 1000000000) {
      // Timestamp en secondes
      date = new Date(timestamp * 1000);
    } else {
      // Timestamp Excel (jours depuis 1900)
      date = new Date((timestamp - 25569) * 86400 * 1000);
    }
    
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  
  // Tentative de parsing string
  if (typeof dateValue === 'string') {
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    } catch (e) {
      console.warn('Format de date non reconnu:', dateValue);
    }
  }
  
  return null;
}

/**
 * Formate une date pour l'affichage
 * @param {string|number|Date} dateValue - Valeur de date
 * @param {object} options - Options de formatage
 * @returns {string} Date formatée ou chaîne vide
 */
export function formatDate(dateValue, options = {}) {
  const normalizedDate = normalizeDate(dateValue);
  if (!normalizedDate) return '';
  
  try {
    const defaultOptions = { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    };
    const formatOptions = { ...defaultOptions, ...options };
    
    return new Date(normalizedDate).toLocaleDateString('fr-FR', formatOptions);
  } catch (e) {
    return normalizedDate;
  }
}

/**
 * Prépare une date pour l'envoi à Grist
 * @param {string} dateString - Chaîne de date
 * @returns {string|null} Date au format Grist ou null
 */
export function prepareDateForGrist(dateString) {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  // Si déjà au bon format
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  } catch (e) {
    console.warn('Impossible de convertir la date:', dateString);
  }
  
  return null;
}

/**
 * Calcule la différence en jours entre une date et aujourd'hui
 * @param {string|Date} dateValue - Date à comparer
 * @returns {number} Différence en jours (négatif si passé)
 */
export function getDaysFromToday(dateValue) {
  const normalizedDate = normalizeDate(dateValue);
  if (!normalizedDate) return 0;
  
  const targetDate = new Date(normalizedDate);
  const today = new Date();
  
  // Réinitialiser les heures pour une comparaison précise
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Détermine la classe CSS d'échéance basée sur les jours restants
 * @param {string|Date} dateValue - Date d'échéance
 * @returns {string} Classe CSS appropriée
 */
export function getEcheanceClass(dateValue) {
  const daysFromToday = getDaysFromToday(dateValue);
  
  if (daysFromToday < 0) {
    return CSS_CLASSES.ECHEANCES.DEPASSEE;
  } else if (daysFromToday === 0) {
    return CSS_CLASSES.ECHEANCES.AUJOURD_HUI;
  } else if (daysFromToday <= TIME_THRESHOLDS.URGENT_DAYS) {
    return CSS_CLASSES.ECHEANCES.URGENT;
  } else if (daysFromToday <= TIME_THRESHOLDS.SOON_DAYS) {
    return CSS_CLASSES.ECHEANCES.BIENTOT;
  } else {
    return CSS_CLASSES.ECHEANCES.OK;
  }
}

/**
 * Génère le texte d'échéance pour l'affichage
 * @param {string|Date} dateValue - Date d'échéance
 * @param {boolean} compact - Mode compact ou non
 * @returns {string} Texte d'échéance
 */
export function getEcheanceText(dateValue, compact = false) {
  const daysFromToday = getDaysFromToday(dateValue);
  
  if (daysFromToday < 0) {
    return compact ? `J${daysFromToday}` : `Dépassé de ${Math.abs(daysFromToday)} jour${Math.abs(daysFromToday) > 1 ? 's' : ''}`;
  } else if (daysFromToday === 0) {
    return compact ? "Auj." : "Aujourd'hui";
  } else if (daysFromToday <= TIME_THRESHOLDS.URGENT_DAYS) {
    return compact ? `J+${daysFromToday}` : `${daysFromToday}j restant${daysFromToday > 1 ? 's' : ''}`;
  } else if (daysFromToday <= TIME_THRESHOLDS.SOON_DAYS) {
    return compact ? `J+${daysFromToday}` : `${daysFromToday}j restant${daysFromToday > 1 ? 's' : ''}`;
  } else {
    return compact ? `J+${daysFromToday}` : `J+${daysFromToday}`;
  }
}

/**
 * Génère l'élément HTML d'échéance
 * @param {string|Date} dateValue - Date d'échéance
 * @param {boolean} compact - Mode compact
 * @returns {string} HTML de l'élément d'échéance
 */
export function generateEcheanceElement(dateValue, compact = false) {
  if (!dateValue) return '';
  
  const echeanceClass = getEcheanceClass(dateValue);
  const echeanceText = getEcheanceText(dateValue, compact);
  const formattedDate = formatDate(dateValue);
  const cssClass = compact ? 'date-echeance-compact' : 'date-echeance';
  
  return `<span class="${cssClass} ${echeanceClass}" title="Échéance: ${formattedDate}">
    <i class="bi bi-calendar-x"></i> ${echeanceText}
  </span>`;
}

/**
 * Génère l'élément HTML de date de début
 * @param {string|Date} dateValue - Date de début
 * @returns {string} HTML de l'élément de date de début
 */
export function generateDebutElement(dateValue) {
  if (!dateValue) return '';
  
  const formattedDate = formatDate(dateValue);
  
  return `<span class="date-debut" title="Début: ${formattedDate}">
    <i class="bi bi-play-circle"></i> ${formattedDate}
  </span>`;
}

/**
 * Génère le container complet des dates
 * @param {object} dates - Objet contenant date_debut et date_echeance
 * @param {boolean} compact - Mode compact
 * @returns {string} HTML du container des dates
 */
export function generateDatesContainer(dates, compact = false) {
  const { date_debut, date_echeance } = dates;
  
  const normalizedDebut = normalizeDate(date_debut);
  const normalizedEcheance = normalizeDate(date_echeance);
  
  if (!normalizedDebut && !normalizedEcheance) return '';
  
  let dateInfo = [];
  
  if (normalizedDebut && !compact) {
    dateInfo.push(generateDebutElement(normalizedDebut));
  }
  
  if (normalizedEcheance) {
    dateInfo.push(generateEcheanceElement(normalizedEcheance, compact));
  }
  
  if (dateInfo.length === 0) return '';
  
  return compact ? dateInfo.join('') : `<div class="dates-container">${dateInfo.join('')}</div>`;
}

/**
 * Valide qu'une date est dans le futur
 * @param {string|Date} dateValue - Date à valider
 * @returns {boolean} True si la date est future
 */
export function isFutureDate(dateValue) {
  return getDaysFromToday(dateValue) >= 0;
}

/**
 * Valide qu'une date est aujourd'hui
 * @param {string|Date} dateValue - Date à valider
 * @returns {boolean} True si la date est aujourd'hui
 */
export function isToday(dateValue) {
  return getDaysFromToday(dateValue) === 0;
}

/**
 * Génère un timestamp formaté pour les commentaires
 * @param {Date} date - Date à formater (défaut: maintenant)
 * @param {string} userName - Nom d'utilisateur optionnel
 * @returns {string} Timestamp formaté
 */
export function generateTimestamp(date = new Date(), userName = null) {
  const timestamp = date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const userSuffix = userName ? ` (${userName})` : '';
  // Changed from [brackets] to (parentheses) to avoid Grist array parsing issues
  return `(${timestamp}${userSuffix})`;
}

/**
 * Parse un timestamp depuis un commentaire
 * @param {string} timestampString - String contenant le timestamp
 * @returns {Date|null} Date parsée ou null
 */
export function parseTimestamp(timestampString) {
  const match = timestampString.match(/\((\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
  if (!match) return null;
  
  const [datePart, timePart] = match[1].split(' ');
  const [day, month, year] = datePart.split('/');
  
  try {
    return new Date(`${year}-${month}-${day}T${timePart}:00`);
  } catch (e) {
    return null;
  }
}

/**
 * Calcule la durée entre deux dates en minutes
 * @param {Date|string} startDate - Date de début
 * @param {Date|string} endDate - Date de fin
 * @returns {number} Durée en minutes
 */
export function calculateDurationMinutes(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Formate une durée en minutes en format lisible
 * @param {number} minutes - Durée en minutes
 * @returns {string} Durée formatée (ex: "2h 30m")
 */
export function formatDuration(minutes) {
  if (!minutes || minutes === 0) return 'En cours...';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  } else if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}