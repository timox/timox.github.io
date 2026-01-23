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
  
  const $container = $(`#${containerId}`);
  if ($container.length) {
    const errorHtml = `
      <div class="alert alert-danger m-3 alert-dismissible fade show">
        <strong>Erreur Kanban:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    
    // Nettoyer les erreurs précédentes et ajouter la nouvelle
    $container.html(errorHtml);
    
    // Auto-suppression après 10 secondes
    setTimeout(() => {
      $container.find('.alert').fadeOut(() => {
        $container.empty();
      });
    }, 10000);
  }
  
  // Nettoyer le kanban si il affiche "Chargement"
  const $kanbanContainer = $('#kanban-container');
  if ($kanbanContainer.length && $kanbanContainer.html().includes('Chargement')) {
    $kanbanContainer.empty();
  }
}

/**
 * Affiche un message de succès
 * @param {string} message - Message de succès
 * @param {string} containerId - ID du container
 */
export function displaySuccess(message, containerId = 'error-container') {
  const $container = $(`#${containerId}`);
  if ($container.length) {
    const successHtml = `
      <div class="alert alert-success m-3 alert-dismissible fade show">
        <strong>Succès:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    
    $container.html(successHtml);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
      $container.find('.alert').fadeOut(() => {
        $container.empty();
      });
    }, 5000);
  }
}

/**
 * Affiche/cache le spinner de chargement
 * @param {boolean} show - Afficher ou cacher
 * @param {string} spinnerId - ID du spinner
 */
export function toggleLoadingSpinner(show, spinnerId = 'loading-spinner') {
  const $spinner = $(`#${spinnerId}`);
  if ($spinner.length) {
    $spinner.toggle(show);
    $spinner.toggleClass('is-visible', !!show);
    $spinner.attr('aria-hidden', show ? 'false' : 'true');
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
  const $select = $(`#${selectId}`);
  if (!$select.length) return;
  
  $select.empty();
  
  if (!Array.isArray(options)) return;
  
  // Option vide pour les selects simples
  if (addEmptyOption && !$select.prop('multiple')) {
    const defaultText = emptyText || (selectId.startsWith('filter-') ? "Tous" : "-- Choisir --");
    $select.append(`<option value="">${defaultText}</option>`);
  }
  
  // Ajouter les options
  options.forEach(value => {
    if (value !== null && typeof value !== 'undefined') {
      $select.append(`<option value="${value}">${value}</option>`);
    }
  });
}

/**
 * Définit les options sélectionnées d'un select multiple
 * @param {string} selectId - ID de l'élément select
 * @param {Array} valuesWithL - Valeurs au format Grist (avec 'L' initial)
 */
export function setSelectedOptions(selectId, valuesWithL) {
  const $select = $(`#${selectId}`);
  if (!$select.length) return;
  
  // Extraire les valeurs (sans le 'L' initial de Grist)
  const values = Array.isArray(valuesWithL) && valuesWithL[0] === 'L' ? valuesWithL.slice(1) : [];
  const lowerValues = values.map(v => String(v).trim().toLowerCase());
  
  // Marquer les options sélectionnées
  $select.find('option').each(function() {
    const optionValue = String($(this).val()).trim().toLowerCase();
    $(this).prop('selected', lowerValues.includes(optionValue));
  });
}

/**
 * Récupère les valeurs sélectionnées d'un select multiple au format Grist
 * @param {string} selectId - ID de l'élément select
 * @returns {Array} Valeurs au format Grist (['L', ...values])
 */
export function getSelectedOptionsAsGristFormat(selectId) {
  const $select = $(`#${selectId}`);
  if (!$select.length) return ['L'];

  const selectedValues = $select.val() || [];
  // Filtrer les valeurs vides ET le marqueur 'L' pour éviter les doublons
  const validValues = Array.isArray(selectedValues) ?
    selectedValues.filter(value => value && value.trim() !== '' && value !== 'L') :
    [selectedValues].filter(value => value && value.trim() !== '' && value !== 'L');

  // Toujours retourner avec le marqueur 'L' en premier
  return ['L', ...validValues];
}

/**
 * Nettoie le contenu d'un élément
 * @param {string} elementId - ID de l'élément à nettoyer
 */
export function clearElement(elementId) {
  $(`#${elementId}`).empty();
}

/**
 * Définit la valeur d'un champ de formulaire
 * @param {string} fieldId - ID du champ
 * @param {*} value - Valeur à définir
 */
export function setFieldValue(fieldId, value) {
  $(`#${fieldId}`).val(value || "");
}

/**
 * Récupère la valeur d'un champ de formulaire
 * @param {string} fieldId - ID du champ
 * @returns {string} Valeur du champ
 */
export function getFieldValue(fieldId) {
  return $(`#${fieldId}`).val() || "";
}

/**
 * Active/désactive un élément
 * @param {string} elementId - ID de l'élément
 * @param {boolean} enabled - Activer ou désactiver
 */
export function toggleElement(elementId, enabled) {
  const $element = $(`#${elementId}`);
  if ($element.length) {
    $element.prop('disabled', !enabled);
    $element.toggleClass('disabled', !enabled);
  }
}

/**
 * Affiche/cache un élément
 * @param {string} elementId - ID de l'élément
 * @param {boolean} visible - Afficher ou cacher
 * @param {string} displayType - Type d'affichage (block, inline, flex...)
 */
export function toggleVisibility(elementId, visible, displayType = 'block') {
  const $element = $(`#${elementId}`);
  if ($element.length) {
    $element.css('display', visible ? displayType : 'none');
  }
}

/**
 * Ajoute une classe CSS à un élément
 * @param {string} elementId - ID de l'élément
 * @param {string} className - Classe à ajouter
 */
export function addClass(elementId, className) {
  $(`#${elementId}`).addClass(className);
}

/**
 * Supprime une classe CSS d'un élément
 * @param {string} elementId - ID de l'élément
 * @param {string} className - Classe à supprimer
 */
export function removeClass(elementId, className) {
  $(`#${elementId}`).removeClass(className);
}

/**
 * Bascule une classe CSS sur un élément
 * @param {string} elementId - ID de l'élément
 * @param {string} className - Classe à basculer
 */
export function toggleClass(elementId, className) {
  $(`#${elementId}`).toggleClass(className);
}

/**
 * Focus sur un élément
 * @param {string} elementId - ID de l'élément
 */
export function focusElement(elementId) {
  $(`#${elementId}`).focus();
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
export function initializeTooltips(selector = '[data-bs-toggle="tooltip"], [title]:not(select):not(option)') {
  // D'abord, disposer de tous les tooltips existants
  document.querySelectorAll(selector).forEach(element => {
    const existingTooltip = bootstrap.Tooltip.getInstance(element);
    if (existingTooltip) {
      existingTooltip.dispose();
    }
  });
  
  // Nettoyer les tooltips orphelins dans le DOM
  document.querySelectorAll('.tooltip').forEach(tooltipEl => {
    if (tooltipEl.parentNode) {
      tooltipEl.parentNode.removeChild(tooltipEl);
    }
  });
  
  const tooltipTriggerList = document.querySelectorAll(selector);
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => 
    new bootstrap.Tooltip(tooltipTriggerEl, {
      delay: { show: 500, hide: 100 },
      placement: 'top',
      trigger: 'hover focus'
    })
  );
  
  console.log(`💡 ${tooltipList.length} tooltips réinitialisés`);
  return tooltipList;
}

/**
 * Force la fermeture de tous les tooltips ouverts
 */
export function hideAllTooltips() {
  // Fermer tous les tooltips via leur instance Bootstrap
  document.querySelectorAll('[data-bs-toggle="tooltip"], [title]:not(select):not(option)').forEach(element => {
    const tooltip = bootstrap.Tooltip.getInstance(element);
    if (tooltip) {
      tooltip.hide();
    }
  });
  
  // Forcer la suppression des éléments tooltip du DOM
  document.querySelectorAll('.tooltip.show, .tooltip.fade').forEach(tooltipEl => {
    tooltipEl.classList.remove('show', 'fade');
    if (tooltipEl.parentNode) {
      tooltipEl.parentNode.removeChild(tooltipEl);
    }
  });
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