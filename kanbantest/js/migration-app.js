// === migration-app.js ===
// Application de migration V3 pour la taxonomie

const TABLE_ID = 'Ssir_principale_task';

/**
 * Convertit une valeur Grist en string
 * Gere les cas: string, number, array ['L', 'val'], Reference, null
 */
function toStr(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    // ChoiceList format: ['L', 'val1', 'val2']
    if (value[0] === 'L') return value.slice(1).join(', ');
    return value.join(', ');
  }
  if (typeof value === 'object') {
    // Reference format: peut avoir une propriété displayValue
    if (value.displayValue) return String(value.displayValue);
    return '';
  }
  return String(value);
}

// Mapping type_tache_id (ancien) -> genre_action (V3)
const TYPE_ID_TO_GENRE = {
  'Rédaction documentation': 'DOC',
  'Redaction documentation': 'DOC',
  'Analyse et remédiation': 'ANA',
  'Analyse et remediation': 'ANA',
  'Audit de sécurité': 'VER',
  'Audit de securite': 'VER',
  'Déploiement politique sécurité': 'INS',
  'Deploiement politique securite': 'INS',
  'Identification prérequis': 'ANA',
  'Identification prerequis': 'ANA',
  'Mise à jour infrastructure': 'CFG',
  'Mise a jour infrastructure': 'CFG',
  'AMOA et MCO limitée': 'SUI',
  'AMOA et MCO limitee': 'SUI',
  'gestion des factures, suivi budget': 'SUI',
  'poc': 'DEV'
};

// Previsibilite par defaut selon nature
const NATURE_PREVISIBILITE = {
  'INC': 'Imprévisible',
  'SUP': 'Imprévisible',
  'MCO': null,
  'PRJ': 'Prévisible',
  'OVH': 'Prévisible'
};

/**
 * Application de migration
 */
class MigrationApp {
  constructor() {
    this.records = [];
    this.toMigrate = [];
    this.toDelete = [];
    this.duplicates = []; // Doublons [MISSION] et [SA]
    this.isAnalyzed = false;
  }

  /**
   * Initialise l'application
   */
  async init() {
    this.log('Initialisation...', 'info');

    // Attendre que Grist soit pret
    await this.waitForGrist();

    // Event listeners
    $('#btn-analyze').on('click', () => this.analyze());
    $('#btn-delete-temp').on('click', () => this.deleteTemp());
    $('#btn-delete-duplicates').on('click', () => this.deleteDuplicates());
    $('#btn-migrate').on('click', () => this.migrate());

    this.log('Application prete. Cliquez sur "Analyser".', 'success');
  }

  /**
   * Attend que Grist soit pret
   */
  async waitForGrist() {
    return new Promise((resolve, reject) => {
      if (typeof grist === 'undefined') {
        this.log('API Grist non disponible!', 'error');
        reject(new Error('Grist API not available'));
        return;
      }

      // Acces complet au document - pas besoin de mapper les colonnes
      grist.ready({ requiredAccess: 'full' });

      // Attendre que l'API soit prete
      setTimeout(() => {
        this.log('Grist connecte', 'success');
        resolve();
      }, 500);
    });
  }

  /**
   * Analyse les donnees
   */
  async analyze() {
    this.log('=== ANALYSE DES DONNEES ===', 'info');

    try {
      // Charger les donnees
      const data = await grist.docApi.fetchTable(TABLE_ID);

      if (!data || !data.id) {
        this.log('Aucune donnee trouvee!', 'error');
        return;
      }

      // Convertir en tableau d'objets (avec conversion string securisee)
      this.records = [];
      for (let i = 0; i < data.id.length; i++) {
        this.records.push({
          id: data.id[i],
          titre: toStr(data.titre?.[i]),
          type_tache_id: toStr(data.type_tache_id?.[i]),
          type_tache: toStr(data.type_tache?.[i]),
          nature_activite: toStr(data.nature_activite?.[i]),
          genre_action: toStr(data.genre_action?.[i]),
          etape_code: toStr(data.etape_code?.[i]),
          previsibilite: toStr(data.previsibilite?.[i]) || toStr(data['previsibilité']?.[i])
        });
      }

      this.log(`${this.records.length} taches chargees`, 'info');

      // Analyser
      this.toDelete = [];
      this.toMigrate = [];
      this.duplicates = [];
      let alreadyMigrated = 0;

      // Détection des doublons par titre pour [MISSION] et [SA]
      const titleCounts = {};
      for (const record of this.records) {
        if (record.titre && (record.titre.startsWith('[MISSION]') || record.titre.startsWith('[SA]'))) {
          titleCounts[record.titre] = titleCounts[record.titre] || [];
          titleCounts[record.titre].push(record);
        }
      }

      // Identifier les doublons (garder le premier, supprimer les autres)
      for (const [titre, records] of Object.entries(titleCounts)) {
        if (records.length > 1) {
          // Trier par ID pour garder le plus ancien
          records.sort((a, b) => a.id - b.id);
          // Les enregistrements après le premier sont des doublons
          for (let i = 1; i < records.length; i++) {
            this.duplicates.push(records[i]);
          }
        }
      }

      for (const record of this.records) {
        // Ignorer les doublons déjà identifiés
        if (this.duplicates.some(d => d.id === record.id)) {
          continue;
        }

        // Detecter TEMP
        if (record.titre.includes('___TEMP')) {
          this.toDelete.push(record);
          continue;
        }

        // Deja migre?
        if (record.nature_activite && record.genre_action) {
          alreadyMigrated++;
          continue;
        }

        // Preparer migration
        const updates = {};

        // Nature activite
        if (!record.nature_activite) {
          updates.nature_activite = this.deduceNature(record);
        }

        // Genre action
        if (!record.genre_action && record.type_tache_id) {
          const genre = TYPE_ID_TO_GENRE[record.type_tache_id];
          if (genre) {
            updates.genre_action = genre;
          }
        }

        // Previsibilite
        const finalNature = updates.nature_activite || record.nature_activite;
        if (!record.previsibilite && finalNature && NATURE_PREVISIBILITE[finalNature]) {
          updates.previsibilite = NATURE_PREVISIBILITE[finalNature];
        }

        if (Object.keys(updates).length > 0) {
          this.toMigrate.push({ record, updates });
        }
      }

      // Mettre a jour l'UI
      $('#stat-total').text(this.records.length);
      $('#stat-temp').text(this.toDelete.length);
      $('#stat-migrated').text(alreadyMigrated);
      $('#stat-to-migrate').text(this.toMigrate.length);
      $('#stat-duplicates').text(this.duplicates.length);
      $('#count-temp').text(this.toDelete.length);
      $('#count-migrate').text(this.toMigrate.length);
      $('#count-duplicates').text(this.duplicates.length);

      // Activer/desactiver boutons
      $('#btn-delete-temp').prop('disabled', this.toDelete.length === 0);
      $('#btn-delete-duplicates').prop('disabled', this.duplicates.length === 0);
      $('#btn-migrate').prop('disabled', this.toMigrate.length === 0);

      // Afficher apercu
      this.renderPreview();

      // Log resume
      this.log(`TEMP a supprimer: ${this.toDelete.length}`, this.toDelete.length > 0 ? 'warning' : 'info');
      this.log(`Doublons [MISSION]/[SA]: ${this.duplicates.length}`, this.duplicates.length > 0 ? 'error' : 'success');
      this.log(`Deja migrees: ${alreadyMigrated}`, 'success');
      this.log(`A migrer: ${this.toMigrate.length}`, this.toMigrate.length > 0 ? 'info' : 'success');

      this.isAnalyzed = true;

    } catch (error) {
      this.log(`Erreur: ${error.message}`, 'error');
      console.error(error);
    }
  }

  /**
   * Deduit la nature d'activite
   */
  deduceNature(record) {
    const titre = record.titre || '';
    const typeId = record.type_tache_id || '';

    // Prefixes dans le titre
    if (titre.includes('[MISSION]')) return 'PRJ';
    if (titre.includes('[SA]')) return 'PRJ';
    if (titre.includes('[INC]')) return 'INC';
    if (titre.includes('[MCO]')) return 'MCO';

    // type_tache_id suggere la nature
    const typeIdLower = typeId.toLowerCase();
    if (typeIdLower.includes('mco')) return 'MCO';
    if (typeIdLower.includes('audit')) return 'PRJ';
    if (typeIdLower.includes('deploiement')) return 'PRJ';
    if (typeIdLower.includes('facture') || typeIdLower.includes('budget')) return 'OVH';
    if (typeIdLower.includes('poc')) return 'PRJ';

    // Mots-cles dans le titre
    const titreLower = titre.toLowerCase();
    if (titreLower.includes('incident') || titreLower.includes('panne')) return 'INC';
    if (titreLower.includes('reunion') || titreLower.includes('réunion')) return 'OVH';
    if (titreLower.includes('formation')) return 'OVH';

    // Par defaut
    return 'SUP';
  }

  /**
   * Affiche l'apercu
   */
  renderPreview() {
    const $container = $('#preview-container');

    if (this.toMigrate.length === 0 && this.toDelete.length === 0 && this.duplicates.length === 0) {
      $container.html('<p class="text-success"><i class="bi bi-check-circle me-2"></i>Toutes les taches sont deja migrees et pas de doublons!</p>');
      return;
    }

    let html = '';

    // Doublons [MISSION] et [SA]
    if (this.duplicates.length > 0) {
      html += '<h6 class="text-danger"><i class="bi bi-files me-2"></i>Doublons [MISSION]/[SA]</h6>';
      html += '<ul class="list-group mb-3">';
      this.duplicates.slice(0, 5).forEach(r => {
        html += `<li class="list-group-item list-group-item-warning small">[${r.id}] ${this.escapeHtml(r.titre.substring(0, 50))}...</li>`;
      });
      if (this.duplicates.length > 5) {
        html += `<li class="list-group-item text-muted">... et ${this.duplicates.length - 5} autres doublons</li>`;
      }
      html += '</ul>';
    }

    // TEMP
    if (this.toDelete.length > 0) {
      html += '<h6 class="text-danger"><i class="bi bi-trash me-2"></i>Enregistrements TEMP</h6>';
      html += '<ul class="list-group mb-3">';
      this.toDelete.slice(0, 5).forEach(r => {
        html += `<li class="list-group-item list-group-item-danger small">[${r.id}] ${this.escapeHtml(r.titre.substring(0, 40))}</li>`;
      });
      if (this.toDelete.length > 5) {
        html += `<li class="list-group-item text-muted">... et ${this.toDelete.length - 5} autres</li>`;
      }
      html += '</ul>';
    }

    // Migrations
    if (this.toMigrate.length > 0) {
      html += '<h6 class="text-primary"><i class="bi bi-arrow-right me-2"></i>Migrations</h6>';
      html += '<ul class="list-group">';
      this.toMigrate.slice(0, 10).forEach(({ record, updates }) => {
        const badges = [];
        if (updates.nature_activite) badges.push(`<span class="badge badge-nature">${updates.nature_activite}</span>`);
        if (updates.genre_action) badges.push(`<span class="badge badge-genre">${updates.genre_action}</span>`);
        if (updates.previsibilite) badges.push(`<span class="badge badge-etape">${updates.previsibilite.substring(0, 6)}</span>`);

        html += `
          <li class="list-group-item small">
            <div class="d-flex justify-content-between align-items-center">
              <span class="text-truncate" style="max-width: 200px;">${this.escapeHtml(record.titre)}</span>
              <span>${badges.join(' ')}</span>
            </div>
          </li>
        `;
      });
      if (this.toMigrate.length > 10) {
        html += `<li class="list-group-item text-muted">... et ${this.toMigrate.length - 10} autres</li>`;
      }
      html += '</ul>';
    }

    $container.html(html);
  }

  /**
   * Supprime les enregistrements TEMP
   */
  async deleteTemp() {
    if (this.toDelete.length === 0) {
      this.log('Aucun TEMP a supprimer', 'info');
      return;
    }

    if (!confirm(`Supprimer ${this.toDelete.length} enregistrements TEMP ?\n\nCette action est irreversible!`)) {
      this.log('Suppression annulee', 'warning');
      return;
    }

    this.log(`Suppression de ${this.toDelete.length} TEMP...`, 'info');
    $('#btn-delete-temp').prop('disabled', true).html('<i class="bi bi-hourglass-split me-1"></i>Suppression...');

    let deleted = 0;
    let errors = 0;

    for (const record of this.toDelete) {
      try {
        await grist.docApi.applyUserActions([
          ['RemoveRecord', TABLE_ID, record.id]
        ]);
        deleted++;
        this.log(`  Supprime: ${record.id}`, 'success');
      } catch (error) {
        errors++;
        this.log(`  Erreur ${record.id}: ${error.message}`, 'error');
      }

      // Pause
      if (deleted % 5 === 0) {
        await this.sleep(100);
      }
    }

    this.log(`Suppression terminee: ${deleted} OK, ${errors} erreurs`, deleted === this.toDelete.length ? 'success' : 'warning');

    // Re-analyser
    await this.analyze();
  }

  /**
   * Supprime les doublons [MISSION] et [SA]
   */
  async deleteDuplicates() {
    if (this.duplicates.length === 0) {
      this.log('Aucun doublon a supprimer', 'info');
      return;
    }

    if (!confirm(`Supprimer ${this.duplicates.length} enregistrements en double ([MISSION] et [SA]) ?\n\nLe premier enregistrement de chaque doublon sera conserve.\n\nCette action est irreversible!`)) {
      this.log('Suppression annulee', 'warning');
      return;
    }

    this.log(`Suppression de ${this.duplicates.length} doublons...`, 'info');
    $('#btn-delete-duplicates').prop('disabled', true).html('<i class="bi bi-hourglass-split me-1"></i>Suppression...');

    let deleted = 0;
    let errors = 0;

    // Supprimer par lots pour de meilleures performances
    const batchSize = 50;
    for (let i = 0; i < this.duplicates.length; i += batchSize) {
      const batch = this.duplicates.slice(i, i + batchSize);
      const ids = batch.map(r => r.id);

      try {
        await grist.docApi.applyUserActions([
          ['BulkRemoveRecord', TABLE_ID, ids]
        ]);
        deleted += ids.length;
        this.log(`  Supprime: ${deleted}/${this.duplicates.length}`, 'success');
      } catch (error) {
        // Si BulkRemoveRecord echoue, essayer un par un
        for (const record of batch) {
          try {
            await grist.docApi.applyUserActions([
              ['RemoveRecord', TABLE_ID, record.id]
            ]);
            deleted++;
          } catch (err) {
            errors++;
            this.log(`  Erreur ${record.id}: ${err.message}`, 'error');
          }
        }
      }

      // Pause entre lots
      await this.sleep(100);
    }

    this.log(`Suppression doublons terminee: ${deleted} OK, ${errors} erreurs`, deleted === this.duplicates.length ? 'success' : 'warning');

    // Remettre le bouton
    $('#btn-delete-duplicates').html('<i class="bi bi-files me-1"></i>Suppr. doublons (<span id="count-duplicates">0</span>)');

    // Re-analyser
    await this.analyze();
  }

  /**
   * Execute la migration
   */
  async migrate() {
    if (this.toMigrate.length === 0) {
      this.log('Aucune tache a migrer', 'info');
      return;
    }

    if (!confirm(`Migrer ${this.toMigrate.length} taches vers V3 ?\n\nLes champs nature_activite, genre_action et previsibilite seront mis a jour.`)) {
      this.log('Migration annulee', 'warning');
      return;
    }

    this.log(`Migration de ${this.toMigrate.length} taches...`, 'info');
    $('#btn-migrate').prop('disabled', true).html('<i class="bi bi-hourglass-split me-1"></i>Migration...');

    let migrated = 0;
    let errors = 0;

    for (const { record, updates } of this.toMigrate) {
      try {
        await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, record.id, updates]
        ]);
        migrated++;

        if (migrated % 10 === 0) {
          this.log(`  Progression: ${migrated}/${this.toMigrate.length}`, 'info');
          await this.sleep(100);
        }
      } catch (error) {
        errors++;
        this.log(`  Erreur ${record.id}: ${error.message}`, 'error');
      }
    }

    this.log(`=== MIGRATION TERMINEE ===`, 'success');
    this.log(`Migrees: ${migrated}`, 'success');
    if (errors > 0) {
      this.log(`Erreurs: ${errors}`, 'error');
    }

    // Re-analyser
    await this.analyze();
  }

  /**
   * Log dans la console UI
   */
  log(message, type = 'info') {
    const $container = $('#log-container');
    const timestamp = new Date().toLocaleTimeString();
    const className = `log-${type}`;

    $container.append(`<div class="${className}">[${timestamp}] ${this.escapeHtml(message)}</div>`);
    $container.scrollTop($container[0].scrollHeight);

    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Pause
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Echappe HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

// === INITIALISATION ===
$(document).ready(() => {
  const app = new MigrationApp();
  app.init();
});
