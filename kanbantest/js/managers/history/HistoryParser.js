// === managers/history/HistoryParser.js ===
// Fonctions pures pour parser l'historique des taches et commentaires

import { calculateDurationMinutes } from '../../utils/dates.js';

/**
 * Parse l'historique d'une tache depuis les donnees Grist
 * @param {object} task - Donnees de la tache
 * @param {object} logger - Logger optionnel
 * @returns {object} Historique parse
 */
export function parseTaskHistory(task, logger) {
  let history = [];
  let comments = [];

  logger?.debug('Parsing task history', task.id);

  // Parser l'historique des statuts
  if (task.historique_statuts) {
    try {
      const historyData = JSON.parse(task.historique_statuts);
      if (historyData && historyData.historique) {
        history = historyData.historique;
        logger?.debug('Status history found:', history.length, 'entries');
      }
    } catch (error) {
      logger?.warn('Error parsing historique_statuts:', error);
    }
  }

  // Ne plus parser les commentaires depuis description (ancien systeme)
  // Tous les commentaires doivent maintenant etre dans notes.history

  // Parser les entrees depuis les notes JSON (nouveau systeme)
  if (task.notes) {
    try {
      const notesData = JSON.parse(task.notes);
      // Notes trouvees
      if (notesData && notesData.history && Array.isArray(notesData.history)) {

        // Traiter chaque entree selon son type d'action
        notesData.history.forEach(entry => {
          if (entry.action === 'comment') {
            // Extraire le contenu du commentaire de facon sure
            let commentContent = entry.newValue || entry.details || '';

            // Si c'est du JSON complet, extraire le content
            if (commentContent.startsWith('{') && commentContent.includes('"content"')) {
              try {
                const jsonData = JSON.parse(commentContent);
                if (jsonData.content) {
                  commentContent = jsonData.content;
                  logger?.debug('Migration: JSON comment extracted', entry.timestamp);
                }
              } catch (e) {
                // Si parsing echoue, utiliser le contenu brut
                logger?.warn('Failed to parse comment JSON:', e);
              }
            }

            // Nettoyer les prefixes comme "Commentaire ajoute:"
            commentContent = commentContent.replace(/^Commentaire ajouté:\s*/, '');

            // Si apres extraction il reste du JSON, c'est un cas problematique mais on garde l'info
            if (commentContent.startsWith('{') && commentContent.includes('"timestamp"')) {
              logger?.warn('Problematic JSON comment preserved for user review:', entry.timestamp);
              // On garde le commentaire mais on le marque comme problematique
              commentContent = `[MIGRATION] Données à vérifier: ${commentContent.substring(0, 100)}...`;
            }

            // Ajouter aux commentaires
            comments.push({
              timestamp: normalizeTimestamp(entry.timestamp),
              content: commentContent,
              user: entry.user || 'Utilisateur'
            });
          } else if (entry.action === 'status_change') {
            // Filtrer les changements de statut invalides (meme statut)
            const isValidStatusChange = entry.details &&
              !entry.details.match(/from (.+) to \1$/); // Regex pour detecter "from X to X"

            if (isValidStatusChange) {
              const normalizedTs = normalizeTimestamp(entry.timestamp);
              history.push({
                timestamp: normalizedTs,
                statut: entry.status,
                date_entree: normalizedTs,
                note: entry.details,
                user: entry.user || 'Utilisateur'
              });
            } else {
              logger?.debug('Changement de statut invalide ignore:', entry.details);
            }
          } else if (entry.action === 'jalons_update') {
            // Changements de jalons
            const normalizedTs = normalizeTimestamp(entry.timestamp);
            history.push({
              timestamp: normalizedTs,
              statut: entry.status || task.statut,
              date_entree: normalizedTs,
              note: `🎯 Jalons: ${entry.details}`,
              user: entry.user || 'Utilisateur'
            });
          } else if (entry.action === 'strategies_update') {
            // Changements de strategies
            const normalizedTs = normalizeTimestamp(entry.timestamp);
            history.push({
              timestamp: normalizedTs,
              statut: entry.status || task.statut,
              date_entree: normalizedTs,
              note: `🎯 Stratégies: ${entry.details}`,
              user: entry.user || 'Utilisateur'
            });
          } else if (entry.action === 'update' || entry.action === 'field_change') {
            // Filtrer les doublons de commentaires (eviter "Commentaire modifie:")
            const isCommentUpdate = entry.details &&
              (entry.details.includes('Commentaire modifié:') ||
               entry.details.includes('Commentaire ajouté:'));

            if (!isCommentUpdate) {
              // Nettoyer et extraire l'information utile
              const cleanNote = extractFieldChangeInfo(entry.details);

              if (cleanNote) {
                const normalizedTs = normalizeTimestamp(entry.timestamp);
                history.push({
                  timestamp: normalizedTs,
                  statut: entry.status || task.statut,
                  date_entree: normalizedTs,
                  note: cleanNote,
                  user: entry.user || 'Utilisateur'
                });
              }
            } else {
              logger?.debug('Doublon de commentaire ignore dans update:', entry.details);
            }
          }
        });

        logger?.debug('JSON history found:', history.length, 'entries,', comments.length, 'comments');
      }
    } catch (error) {
      logger?.warn('Error parsing notes JSON:', error);
    }
  }

  // Calculer les statistiques
  const stats = calculateHistoryStats(history, comments, task);

  // Fusionner historique et commentaires par chronologie
  const timeline = mergeHistoryAndComments(history, comments);

  return {
    task,
    history,
    comments,
    timeline,
    stats
  };
}

/**
 * Extrait l'information utile d'une modification de champ
 * @param {string} details - Details bruts de la modification
 * @returns {string|null} Information nettoyee ou null si pas pertinente
 */
export function extractFieldChangeInfo(details) {
  if (!details) return null;

  // Extraire les modifications d'equipe/responsables
  const teamMatch = details.match(/Équipe modifiée:\s*([^→]+)→\s*(.+)/);
  if (teamMatch) {
    const avant = teamMatch[1].trim();
    const apres = teamMatch[2].trim();
    return `Équipe modifiée: ${avant} → ${apres}`;
  }

  // Extraire les modifications de responsables
  const responsableMatch = details.match(/Responsables?\s+modifiée?s?:\s*([^→]+)→\s*(.+)/);
  if (responsableMatch) {
    const avant = responsableMatch[1].trim();
    const apres = responsableMatch[2].trim();
    return `Responsables modifiés: ${avant} → ${apres}`;
  }

  // Extraire les modifications de bureau
  const bureauMatch = details.match(/Bureau modifié:\s*([^→]+)→\s*(.+)/);
  if (bureauMatch) {
    const avant = bureauMatch[1].trim();
    const apres = bureauMatch[2].trim();
    return `Bureau modifié: ${avant} → ${apres}`;
  }

  // Extraire les modifications de titre
  const titreMatch = details.match(/Titre modifié:\s*([^→]+)→\s*(.+)/);
  if (titreMatch) {
    const avant = titreMatch[1].trim();
    const apres = titreMatch[2].trim();
    // Limiter la longueur pour la lisibilite
    const avantCourt = avant.length > 30 ? avant.substring(0, 30) + '...' : avant;
    const apresCourt = apres.length > 30 ? apres.substring(0, 30) + '...' : apres;
    return `Titre modifié: ${avantCourt} → ${apresCourt}`;
  }

  // Extraire les modifications de projet
  const projetMatch = details.match(/Projet modifié:\s*([^→]+)→\s*(.+)/);
  if (projetMatch) {
    const avant = projetMatch[1].trim();
    const apres = projetMatch[2].trim();
    return `Projet modifié: ${avant} → ${apres}`;
  }

  // Extraire les modifications de priorite/urgence/impact
  const prioriteMatch = details.match(/(Urgence|Impact|Priorité)\s+modifiée?:\s*([^→]+)→\s*(.+)/);
  if (prioriteMatch) {
    const champ = prioriteMatch[1];
    const avant = prioriteMatch[2].trim();
    const apres = prioriteMatch[3].trim();
    return `${champ} modifiée: ${avant} → ${apres}`;
  }

  // Extraire les modifications de date
  const dateMatch = details.match(/Date\s+[^:]*modifiée:\s*([^→]+)→\s*(.+)/);
  if (dateMatch) {
    const avant = dateMatch[1].trim();
    const apres = dateMatch[2].trim();
    return `Date d'échéance modifiée: ${avant} → ${apres}`;
  }

  // Pour toutes les autres modifications, essayer d'extraire le pattern general "X modifie: avant -> apres"
  const generalMatch = details.match(/([^:]+)\s+modifiée?s?:\s*([^→]+)→\s*(.+)/);
  if (generalMatch) {
    const champ = generalMatch[1].trim();
    const avant = generalMatch[2].trim();
    const apres = generalMatch[3].trim();

    // Limiter la longueur si c'est trop long
    const avantCourt = avant.length > 50 ? avant.substring(0, 50) + '...' : avant;
    const apresCourt = apres.length > 50 ? apres.substring(0, 50) + '...' : apres;

    return `${champ} modifié: ${avantCourt} → ${apresCourt}`;
  }

  // Si pas de pattern reconnu, ignorer (probablement du contenu de tache)
  return null;
}

/**
 * Convertit un timestamp en objet Date valide
 * @param {*} timestamp - Timestamp a convertir
 * @returns {Date} Objet Date valide
 */
export function normalizeTimestamp(timestamp) {
  if (!timestamp) return new Date();

  // Deja un objet Date
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? new Date() : timestamp;
  }

  // String ou nombre
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  // Fallback
  return new Date();
}

/**
 * Fusionne l'historique des statuts et les commentaires
 * @param {Array} history - Historique des statuts
 * @param {Array} comments - Commentaires
 * @returns {Array} Timeline fusionnee
 */
export function mergeHistoryAndComments(history, comments) {
  const timeline = [];

  // Filtrer les entrees techniques inutiles pour l'utilisateur
  const isUserRelevant = (entry) => {
    if (!entry.note && !entry.details) return false;

    const content = entry.note || entry.details || '';

    // Masquer les changements techniques automatiques
    const technicalPatterns = [
      /Date d'échéance modifiée:/,
      /Date de début modifiée:/,
      /Priorité modifiée:/,
      /Assigné à modifiée:/,
      /field_change/,
      /Description mise à jour/,
      /Commentaire modifié:/
    ];

    return !technicalPatterns.some(pattern => pattern.test(content));
  };

  // Ajouter les changements de statut (seulement ceux pertinents)
  history.forEach(entry => {
    if (entry.timestamp && isUserRelevant(entry)) {
      timeline.push({
        type: 'status_change',
        timestamp: entry.timestamp, // Deja normalise dans parseTaskHistory
        ...entry
      });
    }
  });

  // Ajouter les commentaires
  comments.forEach(comment => {
    timeline.push({
      type: 'comment',
      timestamp: comment.timestamp, // Deja normalise dans parseTaskHistory
      ...comment
    });
  });

  // Trier par timestamp chronologique (plus recent en premier)
  // En cas d'egalite, donner priorite aux commentaires
  return timeline.sort((a, b) => {
    // Securite supplementaire : verifier que timestamp est bien un objet Date
    const timeA = (a.timestamp instanceof Date) ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
    const timeB = (b.timestamp instanceof Date) ? b.timestamp.getTime() : new Date(b.timestamp).getTime();

    if (timeA === timeB) {
      // En cas d'egalite, commentaires en premier
      if (a.type === 'comment' && b.type !== 'comment') return -1;
      if (b.type === 'comment' && a.type !== 'comment') return 1;
      return 0;
    }

    return timeB - timeA; // Plus recent en premier
  });
}

/**
 * Calcule les statistiques de l'historique
 * @param {Array} history - Historique des statuts
 * @param {Array} comments - Commentaires
 * @param {object} task - Donnees de la tache
 * @returns {object} Statistiques
 */
export function calculateHistoryStats(history, comments, task) {
  const stats = {
    totalSteps: history.length,
    totalComments: comments.length,
    currentStatus: task.statut,
    creationDate: null,
    lastModified: null,
    totalDuration: 0,
    averageStepDuration: 0
  };

  if (history.length > 0) {
    // Trier l'historique par timestamp pour avoir le bon ordre chronologique
    const sortedHistory = [...history].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB; // Plus ancien en premier
    });

    // Date de creation (premier statut chronologique)
    const firstEntry = sortedHistory[0];
    if (firstEntry.timestamp) {
      stats.creationDate = new Date(firstEntry.timestamp);
    }

    // Derniere modification (dernier statut chronologique)
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    if (lastEntry.timestamp) {
      stats.lastModified = new Date(lastEntry.timestamp);
    }

    // Duree totale
    if (stats.creationDate && stats.lastModified) {
      stats.totalDuration = calculateDurationMinutes(stats.creationDate, stats.lastModified);
      stats.averageStepDuration = Math.round(stats.totalDuration / history.length);
    }
  }

  // Inclure les commentaires dans la date de derniere modification
  if (comments.length > 0 && comments[0].timestamp) {
    const lastCommentDate = comments[0].timestamp;
    if (!stats.lastModified || lastCommentDate > stats.lastModified) {
      stats.lastModified = lastCommentDate;
    }
  }

  return stats;
}
