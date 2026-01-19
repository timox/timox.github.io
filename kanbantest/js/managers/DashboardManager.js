// === managers/DashboardManager.js ===
// Gestionnaire du dashboard Kanban V3

import {
  PREVISIBILITE,
  TYPE_TACHES,
  CIBLES_POURCENTAGES,
  SEMAINE_TYPE,
  SEUILS_ALERTES
} from '../config/constants.js';

import { normalizeDate } from '../utils/dates.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

export class DashboardManager {
  constructor(kanban) {
    this.kanban = kanban;
    this.logger = createModuleLogger('DashboardManager');
    this.container = document.getElementById('dashboard-container');
  }

  renderDashboard(records = []) {
    if (!this.container) {
      return;
    }

    const stats = this.calculerStatistiquesDetaillees(records);
    const alertes = this.genererAlertes(stats, records);
    this.container.innerHTML = this.genererDashboardHTML(stats, alertes);
  }

  calculerStatistiquesDetaillees(records) {
    const activeRecords = records.filter(record => !['Terminé', 'En pause'].includes(record.statut));
    const total = activeRecords.length;
    const enPause = records.filter(record => record.statut === 'En pause').length;

    const parPrevisibilite = this.computeStatsByCategory(
      PREVISIBILITE,
      activeRecords,
      'previsibilite',
      CIBLES_POURCENTAGES.previsibilite,
      (record) => this.getPrevisibiliteValue(record)
    );

    const parType = this.computeStatsByCategory(
      TYPE_TACHES,
      activeRecords,
      'type_tache',
      CIBLES_POURCENTAGES.type,
      (record) => record.type_tache || record.type_tache_id
    );

    const taxonomieManquante = {
      previsibilite: this.countMissingField(activeRecords, 'previsibilite') + this.countMissingField(activeRecords, 'previsibilité'),
      type_tache: this.countMissingField(activeRecords, 'type_tache')
    };

    const tempsEstime = this.computeTempsEstime(activeRecords);
    const dettesTechniques = this.countDettesTechniques(activeRecords);

    return {
      total,
      enPause,
      parPrevisibilite,
      parType,
      taxonomieManquante,
      tempsEstime,
      dettesTechniques
    };
  }

  genererAlertes(stats, records) {
    const alertes = [];
    const imprevisible = this.hasColumn('previsibilite') ? stats.parPrevisibilite['Imprévisible'] : null;
    const projet = this.hasColumn('type_tache') ? stats.parType['Projet'] : null;

    if (imprevisible?.pourcent >= SEUILS_ALERTES.imprevisible_critique) {
      alertes.push(this.buildAlerte('critical', 'bi-exclamation-triangle-fill', 'Charge imprévisible critique', `Imprévisible à ${this.formatPourcent(imprevisible.pourcent)}.`));
    } else if (imprevisible?.pourcent >= SEUILS_ALERTES.imprevisible_warning) {
      alertes.push(this.buildAlerte('warning', 'bi-exclamation-circle', 'Charge imprévisible élevée', `Imprévisible à ${this.formatPourcent(imprevisible.pourcent)}.`));
    }

    if (projet && projet.pourcent <= SEUILS_ALERTES.projet_critique) {
      alertes.push(this.buildAlerte('critical', 'bi-lightning-fill', 'Capacité projet critique', `Projet à ${this.formatPourcent(projet.pourcent)}.`));
    } else if (projet && projet.pourcent <= SEUILS_ALERTES.projet_warning) {
      alertes.push(this.buildAlerte('warning', 'bi-lightning', 'Capacité projet faible', `Projet à ${this.formatPourcent(projet.pourcent)}.`));
    }

    const dettesAnciennes = this.countDettesAnciennes(records);
    if (dettesAnciennes > 0) {
      alertes.push(this.buildAlerte('warning', 'bi-tools', 'Dettes techniques anciennes', `${dettesAnciennes} dette(s) technique(s) > ${SEUILS_ALERTES.dette_technique_jours} jours.`));
    }

    const bloquees = this.countTachesBloquees(records);
    if (bloquees > 0) {
      alertes.push(this.buildAlerte('warning', 'bi-lock-fill', 'Tâches bloquées persistantes', `${bloquees} tâche(s) bloquée(s) > ${SEUILS_ALERTES.bloque_jours} jours.`));
    }

    return alertes;
  }

  genererDashboardHTML(stats, alertes) {
    const colonnesManquantes = this.getMissingColumnsNotice();
    const alertesHTML = alertes.length > 0
      ? `<div class="dashboard-alertes">${alertes.map(alerte => this.renderAlerte(alerte)).join('')}</div>`
      : '';

    const previsibiliteHTML = PREVISIBILITE.map(item => this.renderStatItem(stats.parPrevisibilite[item.id], item)).join('');
    const typeHTML = TYPE_TACHES.map(item => this.renderStatItem(stats.parType[item.id], item)).join('');

    const tempsEstimeTotal = stats.tempsEstime.total;
    const semaineTypeHTML = tempsEstimeTotal > 0
      ? this.renderSemaineType(stats.tempsEstime)
      : '<div class="dashboard-empty">Aucun temps estimé renseigné.</div>';

    const projetCible = CIBLES_POURCENTAGES.type.Projet?.ideal ?? 0;
    const projetActuel = stats.parType.Projet?.pourcent ?? 0;
    const projetEcart = projetActuel - projetCible;
    const capacitePerdue = Math.max(0, (stats.parPrevisibilite['Imprévisible']?.pourcent ?? 0) - (SEMAINE_TYPE.repartition['Imprévisible'] / SEMAINE_TYPE.heures_totales * 100));

    const taxonomieHTML = this.renderTaxonomieManquante(stats.taxonomieManquante);

    return `
      <div class="dashboard-container">
        ${alertesHTML}
        ${colonnesManquantes}
        <div class="dashboard-header">
          <div>
            <h3>Dashboard Kanban</h3>
            <p>${stats.total} tâche(s) actives</p>
          </div>
          <div class="dashboard-meta">
            <span class="dashboard-pill">En pause: ${stats.enPause}</span>
            <span class="dashboard-pill">Dettes: ${stats.dettesTechniques}</span>
          </div>
        </div>
        <div class="dashboard-grid">
          <div class="dashboard-section">
            <h4>Prévisibilité</h4>
            <div class="dashboard-list">${previsibiliteHTML}</div>
          </div>
          <div class="dashboard-section">
            <h4>Type de tâches</h4>
            <div class="dashboard-list">${typeHTML}</div>
          </div>
        </div>
        <div class="dashboard-capacite">
          <h4>Capacité Projet</h4>
          <div class="dashboard-capacite-grid">
            <div>
              <span class="label">Théorique</span>
              <strong>${this.formatPourcent(projetCible)}</strong>
            </div>
            <div>
              <span class="label">Réel</span>
              <strong>${this.formatPourcent(projetActuel)}</strong>
            </div>
            <div>
              <span class="label">Écart</span>
              <strong class="${projetEcart < 0 ? 'text-warning' : 'text-success'}">${this.formatPourcent(projetEcart, true)}</strong>
            </div>
            <div>
              <span class="label">Capacité perdue</span>
              <strong>${this.formatPourcent(capacitePerdue)}</strong>
            </div>
          </div>
        </div>
        <div class="dashboard-semaine-type">
          <h4>Semaine type (temps estimé)</h4>
          ${semaineTypeHTML}
        </div>
        ${taxonomieHTML}
      </div>
    `;
  }

  computeStatsByCategory(categories, records, field, targets = {}, valueGetter = null) {
    const stats = {};
    const hasField = this.hasColumn(field) || (field === 'previsibilite' && this.hasColumn('previsibilité'));
    const total = hasField ? records.length : 0;

    categories.forEach(category => {
      const count = hasField ? records.filter(record => {
        const value = valueGetter ? valueGetter(record) : record[field];
        return value === category.id;
      }).length : 0;
      const pourcent = total > 0 ? (count / total) * 100 : 0;
      const cible = targets?.[category.id] || null;
      const statut = this.getStatutFromCible(pourcent, cible, total);
      const ecart = cible ? pourcent - cible.ideal : 0;

      stats[category.id] = {
        ...category,
        count,
        pourcent,
        cible,
        statut,
        ecart
      };
    });

    return stats;
  }

  computeTempsEstime(records) {
    const temps = {
      total: 0,
      parPrevisibilite: {}
    };

    PREVISIBILITE.forEach(item => {
      temps.parPrevisibilite[item.id] = 0;
    });

    if (!this.hasColumn('temps_estime_heures')) {
      return temps;
    }

    records.forEach(record => {
      const hours = Number(record.temps_estime_heures);
      if (!Number.isFinite(hours)) return;
      temps.total += hours;
      const previsibiliteValue = this.getPrevisibiliteValue(record);
      if (this.hasColumn('previsibilite') || this.hasColumn('previsibilité')) {
        if (previsibiliteValue && temps.parPrevisibilite[previsibiliteValue] !== undefined) {
          temps.parPrevisibilite[previsibiliteValue] += hours;
        }
      }
    });

    return temps;
  }

  countDettesTechniques(records) {
    if (!this.hasColumn('est_dette_technique')) {
      return 0;
    }
    return records.filter(record => record.est_dette_technique === true || record.est_dette_technique === 'Oui').length;
  }

  countDettesAnciennes(records) {
    if (!this.hasColumn('est_dette_technique')) {
      return 0;
    }
    return records.filter(record => {
      if (!(record.est_dette_technique === true || record.est_dette_technique === 'Oui')) {
        return false;
      }
      const dateValue = record.date_debut || record.date_creation || record.date_modif;
      const days = this.getDaysSince(dateValue);
      return days !== null && days > SEUILS_ALERTES.dette_technique_jours;
    }).length;
  }

  countTachesBloquees(records) {
    if (!this.hasColumn('date_derniere_maj') && !this.hasColumn('date_modif') && !this.hasColumn('date_debut')) {
      return 0;
    }
    return records.filter(record => {
      if (record.statut !== 'Bloqué') return false;
      const dateValue = record.date_derniere_maj || record.date_modif || record.date_debut;
      const days = this.getDaysSince(dateValue);
      return days !== null && days > SEUILS_ALERTES.bloque_jours;
    }).length;
  }

  getDaysSince(dateValue) {
    const normalized = normalizeDate(dateValue);
    if (!normalized) return null;
    const date = new Date(normalized);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = today.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getStatutFromCible(pourcent, cible, total) {
    if (!cible || total === 0) {
      return 'neutral';
    }
    if (pourcent < cible.min) return 'critical';
    if (pourcent > cible.max) return 'warning';
    return 'ok';
  }

  renderStatItem(stat, category) {
    const statutClass = `dashboard-stat-${stat.statut}`;
    const targetLabel = stat.cible
      ? `Cible ${stat.cible.ideal}%`
      : 'Cible non définie';

    return `
      <div class="dashboard-stat-item ${statutClass}">
        <div class="dashboard-stat-main">
          <span class="dashboard-stat-emoji">${category.emoji}</span>
          <div>
            <div class="dashboard-stat-title">${category.id}</div>
            <div class="dashboard-stat-meta">${stat.count} tâche(s)</div>
          </div>
        </div>
        <div class="dashboard-stat-values">
          <span>${this.formatPourcent(stat.pourcent)}</span>
          <small>${targetLabel}</small>
        </div>
      </div>
    `;
  }

  renderSemaineType(tempsEstime) {
    const items = PREVISIBILITE.map(item => {
      const heures = tempsEstime.parPrevisibilite[item.id] || 0;
      const cible = SEMAINE_TYPE.repartition[item.id] || 0;
      return `
        <div class="dashboard-semaine-item">
          <span class="label">${item.emoji} ${item.id}</span>
          <span>${heures.toFixed(1)}h / ${cible}h</span>
        </div>
      `;
    }).join('');

    return `
      <div class="dashboard-semaine-grid">
        ${items}
        <div class="dashboard-semaine-item total">
          <span class="label">Total</span>
          <span>${tempsEstime.total.toFixed(1)}h / ${SEMAINE_TYPE.heures_totales}h</span>
        </div>
      </div>
    `;
  }

  renderTaxonomieManquante(taxonomieManquante) {
    if (!taxonomieManquante) {
      return '';
    }

    const hasMissing = Object.values(taxonomieManquante).some(value => value > 0);
    if (!hasMissing) {
      return '';
    }

    return `
      <div class="dashboard-footer">
        <h4>Données à compléter</h4>
        <div class="dashboard-missing">
          <span>${taxonomieManquante.previsibilite} tâche(s) sans prévisibilité</span>
          <span>${taxonomieManquante.type_tache} tâche(s) sans type</span>
        </div>
      </div>
    `;
  }

  buildAlerte(niveau, icone, titre, message) {
    return { niveau, icone, titre, message };
  }

  renderAlerte(alerte) {
    return `
      <div class="dashboard-alerte dashboard-alerte-${alerte.niveau}">
        <i class="bi ${alerte.icone}"></i>
        <div>
          <strong>${alerte.titre}</strong>
          <div>${alerte.message}</div>
        </div>
      </div>
    `;
  }

  formatPourcent(value, signed = false) {
    if (!Number.isFinite(value)) return '0%';
    const rounded = Math.round(value);
    if (signed && rounded > 0) {
      return `+${rounded}%`;
    }
    return `${rounded}%`;
  }

  getMissingColumnsNotice() {
    const missing = [];
    if (!this.hasColumn('previsibilite') && !this.hasColumn('previsibilité')) {
      missing.push('previsibilite/previsibilité');
    }
    if (!this.hasColumn('type_tache')) missing.push('type_tache');
    if (!this.hasColumn('est_dette_technique')) missing.push('est_dette_technique');
    if (!this.hasColumn('temps_estime_heures')) missing.push('temps_estime_heures');

    if (missing.length === 0) {
      return '';
    }

    return `
      <div class="dashboard-notice">
        Certaines colonnes V3 sont absentes dans Grist : ${missing.join(', ')}.
      </div>
    `;
  }

  hasColumn(columnName) {
    const availableColumns = this.kanban?.gristManager?.availableColumns || this.kanban?.availableColumns;
    return availableColumns instanceof Set ? availableColumns.has(columnName) : false;
  }

  countMissingField(records, field) {
    if (!this.hasColumn(field)) {
      return 0;
    }
    return records.filter(record => !record[field]).length;
  }

  getPrevisibiliteValue(record) {
    return record.previsibilite || record['previsibilité'] || '';
  }
}
