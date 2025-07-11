// === utils/dom.js ===
// Utilitaires pour la manipulation du DOM et l'interface utilisateur

import { MESSAGES } from '../config/constants.js';

/**
 * Affiche un message d'erreur dans le container d'erreurs
 * @param {string} message - Message d'erreur à afficher
 * @param {string} containerId - ID du container (défaut: 'error-container')
 */
export function displayError(message, containerId = 'error-container') {
  console.error("ERREUR:", message);
  
  const container = document.getElementById(containerId);
  if (container) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-3 alert-dismissible fade show';
    errorDiv.innerHTML = `
      <strong>Erreur Kanban:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Nettoyer les erreurs précédentes
    container.innerHTML = '';
    container.appendChild(errorDiv);
    
    // Auto-suppression après 10 secondes
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 10000);
  }
  
  // Nettoyer le kanban si il affiche "Chargement"
  const kanbanContainer = document.getElementById('kanban-container');
  if (kanbanContainer && kanbanContainer.innerHTML.includes('Chargement')) {
    kanbanContainer.innerHTML = '';
  }
}

/**
 * Affiche un message de succès
 * @param {string} message - Message de succès
 * @param {string} containerId - ID du container
 */
export function displaySuccess(message, containerId = 'error-container') {
  const container = document.getElementById(containerId);
  if (container) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success m-3 alert-dismissible fade show';
    successDiv.innerHTML = `
      <strong>Succès:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    container.innerHTML = '';
    container.appendChild(successDiv);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 5000);
  }
}

/**
 * Affiche/cache le spinner de chargement
 * @param {boolean} show - Afficher ou cacher
 * @param {string} spinnerId - ID du spinner
 */
export function toggleLoadingSpinner(show, spinnerId = 'loading-spinner') {
  const spinner = document.getElementById(spinnerId);
  if (spinner) {
    spinner.style.display = show ? 'block' : 'none';
  }
}

/**
 * Peuple un élément select avec des options
 * @param {string} selectId - ID de l'élément select
 * @param {Array} options - Liste des options
 * @param {boolean} addEmptyOption - Ajouter une option vide
 * @param {string} emptyText - Texte de l'option vide
 */
export function populateSelect(selectId, options, addEmptyOption = true, emptyText = null) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '';
  
  if (!Array.isArray(options)) return;
  
  // Option vide pour les selects simples
  if (addEmptyOption && !select.multiple) {
    const emptyOption = document.createElement('option');
    emptyOption.value = "";
    emptyOption.text = emptyText || (selectId.startsWith('filter-') ? "Tous" : "-- Choisir --");
    select.appendChild(emptyOption);
  }
  
  // Ajouter les options
  options.forEach(value => {
    if (value !== null && typeof value !== 'undefined') {
      const option = document.createElement('option');
      option.value = value;
      option.text = value;
      select.appendChild(option);
    }
  });
}

/**
 * Définit les options sélectionnées d'un select multiple
 * @param {string} selectId - ID de l'élément select
 * @param {Array} valuesWithL - Valeurs au format Grist (avec 'L' initial)
 */
export function setSelectedOptions(selectId, valuesWithL) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  // Extraire les valeurs (sans le 'L' initial de Grist)
  const values = Array.isArray(valuesWithL) && valuesWithL[0] === 'L' ? valuesWithL.slice(1) : [];
  const lowerValues = values.map(v => String(v).trim().toLowerCase());
  
  // Marquer les options sélectionnées
  Array.from(select.options).forEach(option => {
    const optionValue = String(option.value).trim().toLowerCase();
    option.selected = lowerValues.includes(optionValue);
  });
}

/**
 * Récupère les valeurs sélectionnées d'un select multiple au format Grist
 * @param {string} selectId - ID de l'élément select
 * @returns {Array} Valeurs au format Grist (['L', ...values])
 */
export function getSelectedOptionsAsGristFormat(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return ['L'];
  
  const selectedValues = Array.from(select.selectedOptions)
    .map(option => option.value)
    .filter(value => value && value.trim() !== ''); // Filter out empty values
  
  return selectedValues.length > 0 ? ['L', ...selectedValues] : ['L'];
}

/**
 * Nettoie le contenu d'un élément
 * @param {string} elementId - ID de l'élément à nettoyer
 */
export function clearElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '';
  }
}

/**
 * Définit la valeur d'un champ de formulaire
 * @param {string} fieldId - ID du champ
 * @param {*} value - Valeur à définir
 */
export function setFieldValue(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.value = value || "";
  }
}

/**
 * Récupère la valeur d'un champ de formulaire
 * @param {string} fieldId - ID du champ
 * @returns {string} Valeur du champ
 */
export function getFieldValue(fieldId) {
  const field = document.getElementById(fieldId);
  return field ? field.value : "";
}

/**
 * Active/désactive un élément
 * @param {string} elementId - ID de l'élément
 * @param {boolean} enabled - Activer ou désactiver
 */
export function toggleElement(elementId, enabled) {
  const element = document.getElementById(elementId);
  if (element) {
    element.disabled = !enabled;
    if (enabled) {
      element.classList.remove('disabled');
    } else {
      element.classList.add('disabled');
    }
  }
}

/**
 * Affiche/cache un élément
 * @param {string} elementId - ID de l'élément
 * @param {boolean} visible - Afficher ou cacher
 * @param {string} displayType - Type d'affichage (block, inline, flex...)
 */
export function toggleVisibility(elementId, visible, displayType = 'block') {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = visible ? displayType : 'none';
  }
}

/**
 * Ajoute une classe CSS à un élément
 * @param {string} elementId - ID de l'élément
 * @param {string} className - Classe à ajouter
 */
export function addClass(elementId, className) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Supprime une classe CSS d'un élément
 * @param {string} elementId - ID de l'élément
 * @param {string} className - Classe à supprimer
 */
export function removeClass(elementId, className) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * Bascule une classe CSS sur un élément
 * @param {string} elementId - ID de l'élément
 * @param {string} className - Classe à basculer
 */
export function toggleClass(elementId, className) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.toggle(className);
  }
}

/**
 * Focus sur un élément
 * @param {string} elementId - ID de l'élément
 */
export function focusElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.focus();
  }
}

/**
 * Défile vers un élément
 * @param {string} elementId - ID de l'élément
 * @param {object} options - Options de défilement
 */
export function scrollToElement(elementId, options = { behavior: 'smooth', block: 'center' }) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView(options);
  }
}

/**
 * Confirme une action avec l'utilisateur
 * @param {string} message - Message de confirmation
 * @param {string} type - Type de confirmation (delete, clear, etc.)
 * @returns {boolean} True si confirmé
 */
export function confirmAction(message, type = 'default') {
  // Utiliser le message prédéfini si disponible
  const confirmMessage = MESSAGES.CONFIRM[type.toUpperCase()] || message;
  return confirm(confirmMessage);
}

/**
 * Crée un élément avec des attributs
 * @param {string} tagName - Nom de la balise
 * @param {object} attributes - Attributs de l'élément
 * @param {string} content - Contenu HTML ou texte
 * @returns {HTMLElement} Élément créé
 */
export function createElement(tagName, attributes = {}, content = '') {
  const element = document.createElement(tagName);
  
  // Définir les attributs
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Définir le contenu
  if (content) {
    element.innerHTML = content;
  }
  
  return element;
}

/**
 * Ajoute un écouteur d'événement avec gestion d'erreur
 * @param {string} elementId - ID de l'élément
 * @param {string} event - Type d'événement
 * @param {Function} handler - Gestionnaire d'événement
 * @param {object} options - Options d'événement
 */
export function addEventListenerSafe(elementId, event, handler, options = {}) {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener(event, (e) => {
      try {
        handler(e);
      } catch (error) {
        console.error(`Erreur dans le gestionnaire d'événement ${event} pour ${elementId}:`, error);
        displayError(`Erreur d'interface: ${error.message}`);
      }
    }, options);
  }
}

/**
 * Initialise les tooltips Bootstrap
 * @param {string} selector - Sélecteur CSS pour les tooltips
 */
export function initializeTooltips(selector = '[data-bs-toggle="tooltip"]') {
  const tooltipTriggerList = document.querySelectorAll(selector);
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  return tooltipList;
}

/**
 * Initialise les popovers Bootstrap
 * @param {string} selector - Sélecteur CSS pour les popovers
 */
export function initializePopovers(selector = '[data-bs-toggle="popover"]') {
  const popoverTriggerList = document.querySelectorAll(selector);
  const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
  return popoverList;
}

/**
 * Valide un formulaire et affiche les erreurs
 * @param {string} formId - ID du formulaire
 * @returns {boolean} True si valide
 */
export function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;
  
  // Utiliser la validation HTML5
  if (form.checkValidity()) {
    form.classList.remove('was-validated');
    return true;
  } else {
    form.classList.add('was-validated');
    
    // Focus sur le premier champ invalide
    const firstInvalidField = form.querySelector(':invalid');
    if (firstInvalidField) {
      firstInvalidField.focus();
    }
    
    return false;
  }
}

/**
 * Réinitialise un formulaire
 * @param {string} formId - ID du formulaire
 */
export function resetForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();
    form.classList.remove('was-validated');
  }
}

/**
 * Anime un élément avec une classe CSS
 * @param {string} elementId - ID de l'élément
 * @param {string} animationClass - Classe d'animation
 * @param {number} duration - Durée en ms
 */
export function animateElement(elementId, animationClass, duration = 1000) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add(animationClass);
    
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, duration);
  }
}

/**
 * Copie du texte dans le presse-papiers
 * @param {string} text - Texte à copier
 * @returns {Promise<boolean>} True si succès
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Erreur copie presse-papiers:', error);
    
    // Fallback pour les navigateurs anciens
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackError) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Débounce une fonction
 * @param {Function} func - Fonction à débouncer
 * @param {number} wait - Délai en ms
 * @returns {Function} Fonction debouncée
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle une fonction
 * @param {Function} func - Fonction à throttler
 * @param {number} limit - Limite en ms
 * @returns {Function} Fonction throttlée
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}