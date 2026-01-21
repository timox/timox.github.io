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
    this.duplicates = []; // Doublons [MISSION] et [SA]/[MEO]
    this.obsoletePrefixes = []; // Tâches avec préfixes obsolètes à nettoyer
    this.existingColumns = []; // Cache des colonnes existantes
    this.agents = []; // Liste des agents pour synchronisation
    this.isAnalyzed = false;
  }

  /**
   * Initialise l'application
   */
  async init() {
    this.log('Initialisation...', 'info');

    // Attendre que Grist soit pret
    await this.waitForGrist();

    // Event listeners - Migration V3
    $('#btn-analyze').on('click', () => this.analyze());
    $('#btn-delete-temp').on('click', () => this.deleteTemp());
    $('#btn-delete-duplicates').on('click', () => this.deleteDuplicates());
    $('#btn-clean-prefixes').on('click', () => this.cleanObsoletePrefixes());
    $('#btn-migrate').on('click', () => this.migrate());

    // Event listeners - Synchronisation Agents
    $('#btn-load-agents').on('click', () => this.loadAgents());
    $('#btn-sync-agents').on('click', () => this.syncAgents());

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

      // Liste des colonnes disponibles
      const availableCols = Object.keys(data);
      this.log(`Colonnes disponibles: ${availableCols.join(', ')}`, 'info');

      // Convertir en tableau d'objets (noms de colonnes en minuscules)
      const getNatureActivite = (idx) => toStr(data.nature_activite?.[idx]);
      const getGenreAction = (idx) => toStr(data.genre_action?.[idx]);
      const getEtapeCycle = (idx) => toStr(data.etape_cycle?.[idx]);
      const getPrevisibilite = (idx) => toStr(data.previsibilite?.[idx]);

      this.records = [];
      for (let i = 0; i < data.id.length; i++) {
        this.records.push({
          id: data.id[i],
          titre: toStr(data.titre?.[i]),
          type_tache_id: toStr(data.type_tache_id?.[i]),
          type_tache: toStr(data.type_tache?.[i]),
          nature_activite: getNatureActivite(i),
          genre_action: getGenreAction(i),
          etape_code: getEtapeCycle(i),
          previsibilite: getPrevisibilite(i)
        });
      }

      this.log(`${this.records.length} taches chargees`, 'info');

      // Analyser
      this.toDelete = [];
      this.toMigrate = [];
      this.duplicates = [];
      this.obsoletePrefixes = [];
      let alreadyMigrated = 0;

      // Détection des doublons par titre pour [MISSION], [SA] et [MEO]
      const titleCounts = {};
      for (const record of this.records) {
        if (record.titre && (record.titre.startsWith('[MISSION]') || record.titre.startsWith('[SA]') || record.titre.startsWith('[MEO]'))) {
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

      // Identifier les tâches avec préfixes obsolètes [MISSION] ou [SA] (non doublons)
      // Note: [MEO] est le nouveau préfixe valide pour les mises en œuvre
      for (const record of this.records) {
        // Ne pas inclure les doublons
        if (this.duplicates.some(d => d.id === record.id)) continue;

        if (record.titre && (record.titre.startsWith('[MISSION]') || record.titre.startsWith('[SA]'))) {
          this.obsoletePrefixes.push(record);
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
        // NOTE: Les noms de colonnes sont en minuscules dans Grist
        const updates = {};

        // Nature activite (Choice - valeur simple string)
        if (!record.nature_activite) {
          const nature = this.deduceNature(record);
          if (nature) {
            updates.nature_activite = nature;
          }
        }

        // Genre action (Choice - valeur simple string)
        if (!record.genre_action && record.type_tache_id) {
          const genre = TYPE_ID_TO_GENRE[record.type_tache_id];
          if (genre) {
            updates.genre_action = genre;
          }
        }

        // Previsibilite (Choice - valeur simple string)
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
      $('#stat-prefixes').text(this.obsoletePrefixes.length);
      $('#count-temp').text(this.toDelete.length);
      $('#count-migrate').text(this.toMigrate.length);
      $('#count-duplicates').text(this.duplicates.length);
      $('#count-prefixes').text(this.obsoletePrefixes.length);

      // Activer/desactiver boutons
      $('#btn-delete-temp').prop('disabled', this.toDelete.length === 0);
      $('#btn-delete-duplicates').prop('disabled', this.duplicates.length === 0);
      $('#btn-clean-prefixes').prop('disabled', this.obsoletePrefixes.length === 0);
      $('#btn-migrate').prop('disabled', this.toMigrate.length === 0);

      // Afficher apercu
      this.renderPreview();

      // Log resume
      this.log(`TEMP a supprimer: ${this.toDelete.length}`, this.toDelete.length > 0 ? 'warning' : 'info');
      this.log(`Doublons [MISSION]/[SA]: ${this.duplicates.length}`, this.duplicates.length > 0 ? 'error' : 'success');
      this.log(`Préfixes obsolètes à nettoyer: ${this.obsoletePrefixes.length}`, this.obsoletePrefixes.length > 0 ? 'warning' : 'success');
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
    if (titre.includes('[SA]')) return 'PRJ';  // Ancien préfixe sous-action
    if (titre.includes('[MEO]')) return 'PRJ'; // Nouveau préfixe mise en œuvre
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

    if (this.toMigrate.length === 0 && this.toDelete.length === 0 && this.duplicates.length === 0 && this.obsoletePrefixes.length === 0) {
      $container.html('<p class="text-success"><i class="bi bi-check-circle me-2"></i>Toutes les taches sont deja migrees, pas de doublons et pas de préfixes obsolètes!</p>');
      return;
    }

    let html = '';

    // Doublons [MISSION], [SA] et [MEO]
    if (this.duplicates.length > 0) {
      html += '<h6 class="text-danger"><i class="bi bi-files me-2"></i>Doublons [MISSION]/[SA]/[MEO]</h6>';
      html += '<ul class="list-group mb-3">';
      this.duplicates.slice(0, 5).forEach(r => {
        html += `<li class="list-group-item list-group-item-warning small">[${r.id}] ${this.escapeHtml(r.titre.substring(0, 50))}...</li>`;
      });
      if (this.duplicates.length > 5) {
        html += `<li class="list-group-item text-muted">... et ${this.duplicates.length - 5} autres doublons</li>`;
      }
      html += '</ul>';
    }

    // Préfixes obsolètes [MISSION] et [SA]
    if (this.obsoletePrefixes.length > 0) {
      html += '<h6 class="text-warning"><i class="bi bi-tag me-2"></i>Préfixes obsolètes [MISSION]/[SA]</h6>';
      html += '<p class="small text-muted">Ces tâches ont des préfixes [MISSION] ou [SA] qui seront supprimés du titre.</p>';
      html += '<ul class="list-group mb-3">';
      this.obsoletePrefixes.slice(0, 5).forEach(r => {
        const cleanedTitle = r.titre.replace(/^\[MISSION\]\s*/, '').replace(/^\[SA\]\s*/, '');
        html += `<li class="list-group-item list-group-item-warning small">
          <div><strong>Avant:</strong> ${this.escapeHtml(r.titre.substring(0, 50))}...</div>
          <div class="text-success"><strong>Après:</strong> ${this.escapeHtml(cleanedTitle.substring(0, 50))}...</div>
        </li>`;
      });
      if (this.obsoletePrefixes.length > 5) {
        html += `<li class="list-group-item text-muted">... et ${this.obsoletePrefixes.length - 5} autres</li>`;
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
        // Les valeurs sont des strings simples (type Choice)
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
   * Supprime les doublons [MISSION], [SA] et [MEO]
   */
  async deleteDuplicates() {
    if (this.duplicates.length === 0) {
      this.log('Aucun doublon a supprimer', 'info');
      return;
    }

    if (!confirm(`Supprimer ${this.duplicates.length} enregistrements en double ([MISSION], [SA] et [MEO]) ?\n\nLe premier enregistrement de chaque doublon sera conserve.\n\nCette action est irreversible!`)) {
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
   * Nettoie les préfixes obsolètes [MISSION] et [SA] des titres
   */
  async cleanObsoletePrefixes() {
    if (this.obsoletePrefixes.length === 0) {
      this.log('Aucun préfixe obsolète à nettoyer', 'info');
      return;
    }

    if (!confirm(`Nettoyer ${this.obsoletePrefixes.length} titres avec préfixes obsolètes ([MISSION] et [SA]) ?\n\nLes préfixes seront supprimés des titres.\n\nCette action est irreversible!`)) {
      this.log('Nettoyage annulé', 'warning');
      return;
    }

    this.log(`Nettoyage de ${this.obsoletePrefixes.length} préfixes obsolètes...`, 'info');
    $('#btn-clean-prefixes').prop('disabled', true).html('<i class="bi bi-hourglass-split me-1"></i>Nettoyage...');

    let cleaned = 0;
    let errors = 0;

    for (const record of this.obsoletePrefixes) {
      try {
        // Nettoyer le titre en enlevant les préfixes [MISSION] et [SA]
        const cleanedTitle = record.titre
          .replace(/^\[MISSION\]\s*/i, '')
          .replace(/^\[SA\]\s*/i, '');

        await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, record.id, { titre: cleanedTitle }]
        ]);
        cleaned++;

        if (cleaned % 10 === 0) {
          this.log(`  Progression: ${cleaned}/${this.obsoletePrefixes.length}`, 'info');
          await this.sleep(100);
        }
      } catch (error) {
        errors++;
        this.log(`  Erreur ${record.id}: ${error.message}`, 'error');
      }
    }

    this.log(`Nettoyage terminé: ${cleaned} OK, ${errors} erreurs`, cleaned === this.obsoletePrefixes.length ? 'success' : 'warning');

    // Remettre le bouton
    $('#btn-clean-prefixes').html('<i class="bi bi-tag me-1"></i>Nettoyer préfixes (<span id="count-prefixes">0</span>)');

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

    // Forcer le rechargement du cache et vérifier les colonnes V3
    this.existingColumns = [];
    const existingCols = await this.getExistingColumns();
    this.log(`Colonnes disponibles (${existingCols.length}): ${existingCols.join(', ')}`, 'info');

    // Vérifier quelles colonnes V3 existent (noms en minuscules)
    const v3Cols = ['nature_activite', 'genre_action', 'etape_cycle', 'previsibilite'];
    const missingCols = v3Cols.filter(c => !existingCols.includes(c));

    if (missingCols.length > 0) {
      this.log(`Colonnes manquantes: ${missingCols.join(', ')} - création...`, 'warning');
      await this.ensureV3Columns();
      // Rafraîchir le cache après création
      this.existingColumns = [];
      await this.getExistingColumns();
    } else {
      this.log('Toutes les colonnes V3 sont présentes', 'success');
    }

    let migrated = 0;
    let errors = 0;

    for (const { record, updates } of this.toMigrate) {
      try {
        // Filtrer les updates pour ne garder que les colonnes qui existent
        // Les noms de colonnes sont en minuscules
        const safeUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
          if (existingCols.includes(key)) {
            safeUpdates[key] = value;
          } else {
            this.log(`  ⚠ Colonne "${key}" ignorée (n'existe pas)`, 'warning');
          }
        }

        if (Object.keys(safeUpdates).length === 0) {
          this.log(`  #${record.id}: aucune colonne valide à mettre à jour`, 'warning');
          continue;
        }

        // Log les updates pour debug
        this.log(`  Migration #${record.id}: ${JSON.stringify(safeUpdates)}`, 'info');

        await grist.docApi.applyUserActions([
          ['UpdateRecord', TABLE_ID, record.id, safeUpdates]
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

    // Remettre le bouton
    $('#btn-migrate').prop('disabled', false).html('<i class="bi bi-arrow-right-circle me-1"></i>4. Migrer (<span id="count-migrate">0</span>)');

    // Re-analyser
    await this.analyze();
  }

  /**
   * Récupère la liste des colonnes existantes dans la table
   */
  async getExistingColumns() {
    if (this.existingColumns.length > 0) {
      return this.existingColumns;
    }

    try {
      const tableData = await grist.docApi.fetchTable(TABLE_ID);
      this.existingColumns = Object.keys(tableData).filter(k => k !== 'id' && k !== 'manualSort');
      this.log(`Colonnes existantes: ${this.existingColumns.length}`, 'info');
      return this.existingColumns;
    } catch (e) {
      this.log(`Erreur lecture colonnes: ${e.message}`, 'error');
      return [];
    }
  }

  /**
   * Ajoute une colonne si elle n'existe pas
   */
  async ensureColumn(colId, config) {
    const existingCols = this.existingColumns;

    this.log(`  Vérification colonne ${colId}...`, 'info');

    // Vérifier si la colonne existe (nom exact)
    if (existingCols.includes(colId)) {
      this.log(`  ✓ Colonne ${colId} existe`, 'success');
      return { success: true, action: 'exists', message: `${colId} existe déjà` };
    }

    // La colonne n'existe pas - la créer
    this.log(`  ⚠ Colonne ${colId} non trouvée, création...`, 'warning');
    try {
      await grist.docApi.applyUserActions([
        ['AddColumn', TABLE_ID, colId, {
          type: config.type,
          label: config.label,
          widgetOptions: config.widgetOptions
        }]
      ]);
      // Mettre à jour le cache
      this.existingColumns.push(colId);
      return { success: true, action: 'created', message: `${colId} créée` };
    } catch (e) {
      // Si l'erreur indique que la colonne existe déjà, c'est OK
      if (e.message && e.message.includes('already exists')) {
        this.log(`  ✓ Colonne ${colId} existe déjà (confirmé par erreur)`, 'info');
        return { success: true, action: 'exists', message: `${colId} existe déjà` };
      }
      return { success: false, action: 'error', message: `${colId}: ${e.message}` };
    }
  }

  /**
   * S'assure que les colonnes V3 existent, les cree si necessaire
   */
  async ensureV3Columns() {
    this.log('Vérification des colonnes V3...', 'info');

    // Forcer le rechargement du cache des colonnes
    this.existingColumns = [];
    const cols = await this.getExistingColumns();
    this.log(`Colonnes actuelles (${cols.length}): ${cols.join(', ')}`, 'info');

    // Colonnes V3 en minuscules - Type Choice (valeur unique)
    const columns = {
      nature_activite: {
        type: 'Choice',
        label: 'Nature activité',
        widgetOptions: JSON.stringify({
          choices: ['INC', 'SUP', 'MCO', 'PRJ', 'OVH'],
          choiceOptions: {
            'INC': { fillColor: '#dc3545', textColor: '#ffffff' },
            'SUP': { fillColor: '#0d6efd', textColor: '#ffffff' },
            'MCO': { fillColor: '#6f42c1', textColor: '#ffffff' },
            'PRJ': { fillColor: '#198754', textColor: '#ffffff' },
            'OVH': { fillColor: '#6c757d', textColor: '#ffffff' }
          }
        })
      },
      genre_action: {
        type: 'Choice',
        label: 'Genre action',
        widgetOptions: JSON.stringify({
          choices: ['DOC', 'ANA', 'CON', 'RCH', 'DEV', 'TST', 'VAL', 'VER', 'COR', 'INS', 'CFG', 'INV', 'SEC', 'REU', 'FOR', 'SUI'],
          choiceOptions: {
            'DOC': { fillColor: '#3b82f6', textColor: '#ffffff' },
            'ANA': { fillColor: '#8b5cf6', textColor: '#ffffff' },
            'CON': { fillColor: '#6366f1', textColor: '#ffffff' },
            'RCH': { fillColor: '#a855f7', textColor: '#ffffff' },
            'DEV': { fillColor: '#7c3aed', textColor: '#ffffff' },
            'TST': { fillColor: '#10b981', textColor: '#ffffff' },
            'VAL': { fillColor: '#22c55e', textColor: '#ffffff' },
            'VER': { fillColor: '#14b8a6', textColor: '#ffffff' },
            'COR': { fillColor: '#ef4444', textColor: '#ffffff' },
            'INS': { fillColor: '#059669', textColor: '#ffffff' },
            'CFG': { fillColor: '#f97316', textColor: '#ffffff' },
            'INV': { fillColor: '#f59e0b', textColor: '#ffffff' },
            'SEC': { fillColor: '#dc2626', textColor: '#ffffff' },
            'REU': { fillColor: '#0ea5e9', textColor: '#ffffff' },
            'FOR': { fillColor: '#06b6d4', textColor: '#ffffff' },
            'SUI': { fillColor: '#eab308', textColor: '#ffffff' }
          }
        })
      },
      etape_cycle: {
        type: 'Choice',
        label: 'Étape cycle',
        widgetOptions: JSON.stringify({
          choices: ['ETP.VIS', 'ETP.ANA', 'ETP.CON', 'ETP.PLN', 'ETP.REA', 'ETP.DEP', 'ETP.EXP', 'ETP.AME'],
          choiceOptions: {
            'ETP.VIS': { fillColor: '#8b5cf6', textColor: '#ffffff' },
            'ETP.ANA': { fillColor: '#6366f1', textColor: '#ffffff' },
            'ETP.CON': { fillColor: '#3b82f6', textColor: '#ffffff' },
            'ETP.PLN': { fillColor: '#0ea5e9', textColor: '#ffffff' },
            'ETP.REA': { fillColor: '#14b8a6', textColor: '#ffffff' },
            'ETP.DEP': { fillColor: '#22c55e', textColor: '#ffffff' },
            'ETP.EXP': { fillColor: '#f59e0b', textColor: '#ffffff' },
            'ETP.AME': { fillColor: '#eab308', textColor: '#ffffff' }
          }
        })
      },
      previsibilite: {
        type: 'Choice',
        label: 'Prévisibilité',
        widgetOptions: JSON.stringify({
          choices: ['Prévisible', 'Imprévisible'],
          choiceOptions: {
            'Prévisible': { fillColor: '#198754', textColor: '#ffffff' },
            'Imprévisible': { fillColor: '#dc3545', textColor: '#ffffff' }
          }
        })
      }
    };

    for (const [colId, config] of Object.entries(columns)) {
      const result = await this.ensureColumn(colId, config);
      if (result.success) {
        this.log(`  ✓ ${result.message}`, 'success');
      } else {
        this.log(`  ✗ ${result.message}`, 'error');
      }
    }

    this.log('Colonnes V3 prêtes', 'success');
  }

  // ========== SYNCHRONISATION AGENTS ==========

  /**
   * Charge les agents depuis la configuration (localStorage) ou les données existantes
   */
  async loadAgents() {
    this.log('=== CHARGEMENT DES AGENTS ===', 'info');
    this.agents = [];

    try {
      // 1. Essayer de charger depuis localStorage (config.html)
      const stored = localStorage.getItem('kanban_config');
      if (stored) {
        const config = JSON.parse(stored);
        if (config.personnes && Array.isArray(config.personnes)) {
          this.agents = config.personnes.map(p => p.nom).filter(Boolean);
          this.log(`${this.agents.length} agents chargés depuis la configuration`, 'success');
        }
      }

      // 2. Si pas de config, extraire des données existantes (champ "qui")
      if (this.agents.length === 0) {
        this.log('Pas de config locale, extraction depuis les données Grist...', 'info');
        const data = await grist.docApi.fetchTable(TABLE_ID);
        const quiColumn = data.qui || [];

        const uniqueAgents = new Set();
        for (const val of quiColumn) {
          if (Array.isArray(val) && val[0] === 'L') {
            // Format ChoiceList ['L', 'agent1', 'agent2']
            val.slice(1).forEach(a => {
              if (a && typeof a === 'string') uniqueAgents.add(a);
            });
          } else if (typeof val === 'string' && val) {
            uniqueAgents.add(val);
          }
        }

        this.agents = [...uniqueAgents].sort();
        this.log(`${this.agents.length} agents extraits des données existantes`, 'success');
      }

      // 3. Ajouter les agents par défaut s'ils ne sont pas déjà présents
      const defaultAgents = ['Alex', 'Timothée', 'Isabelle', 'Chloé', 'Paul', 'Théo',
        'Gaël', 'Thomas', 'Elie', 'Landry', 'Presta', 'Yvon', 'Clarisse', 'Hervé', 'Didier'];

      for (const agent of defaultAgents) {
        if (!this.agents.includes(agent)) {
          this.agents.push(agent);
        }
      }
      this.agents.sort();

      // Mettre à jour l'UI
      this.renderAgentsList();
      $('#count-agents').text(this.agents.length);
      $('#btn-sync-agents').prop('disabled', this.agents.length === 0);

      this.log(`Total: ${this.agents.length} agents disponibles`, 'success');

    } catch (error) {
      this.log(`Erreur chargement agents: ${error.message}`, 'error');
      console.error(error);
    }
  }

  /**
   * Affiche la liste des agents
   */
  renderAgentsList() {
    const $container = $('#agents-list');

    if (this.agents.length === 0) {
      $container.html('<span class="text-muted">Aucun agent trouvé.</span>');
      return;
    }

    const badges = this.agents.map(agent =>
      `<span class="badge bg-secondary me-1 mb-1">${this.escapeHtml(agent)}</span>`
    ).join('');

    $container.html(badges);
  }

  /**
   * Synchronise les agents avec les colonnes de choix
   */
  async syncAgents() {
    if (this.agents.length === 0) {
      this.log('Aucun agent à synchroniser. Chargez d\'abord les agents.', 'warning');
      return;
    }

    // Récupérer les champs à synchroniser
    const syncQui = $('#sync-qui').is(':checked');
    const syncResponsable = $('#sync-responsable').is(':checked');
    const syncResponsableMission = $('#sync-responsable-mission').is(':checked');

    if (!syncQui && !syncResponsable && !syncResponsableMission) {
      this.log('Aucun champ sélectionné pour la synchronisation.', 'warning');
      return;
    }

    this.log('=== SYNCHRONISATION DES AGENTS ===', 'info');
    this.log(`Agents: ${this.agents.join(', ')}`, 'info');

    const widgetOptions = JSON.stringify({
      choices: this.agents,
      choiceOptions: {} // Pas de couleurs personnalisées pour les agents
    });

    let updated = 0;
    let errors = 0;

    // Synchroniser le champ "qui" (ChoiceList)
    if (syncQui) {
      try {
        this.log('Mise à jour du champ "qui" (ChoiceList)...', 'info');
        await grist.docApi.applyUserActions([
          ['ModifyColumn', TABLE_ID, 'qui', {
            type: 'ChoiceList',
            widgetOptions: widgetOptions
          }]
        ]);
        updated++;
        this.log('  ✓ Champ "qui" synchronisé', 'success');
      } catch (e) {
        errors++;
        this.log(`  ✗ Erreur "qui": ${e.message}`, 'error');
      }
    }

    // Synchroniser le champ "responsable" (Choice)
    if (syncResponsable) {
      try {
        this.log('Mise à jour du champ "responsable" (Choice)...', 'info');
        await grist.docApi.applyUserActions([
          ['ModifyColumn', TABLE_ID, 'responsable', {
            type: 'Choice',
            widgetOptions: widgetOptions
          }]
        ]);
        updated++;
        this.log('  ✓ Champ "responsable" synchronisé', 'success');
      } catch (e) {
        // Si le champ n'existe pas, le créer
        if (e.message && e.message.includes('does not exist')) {
          try {
            await grist.docApi.applyUserActions([
              ['AddColumn', TABLE_ID, 'responsable', {
                type: 'Choice',
                label: 'Responsable',
                widgetOptions: widgetOptions
              }]
            ]);
            updated++;
            this.log('  ✓ Champ "responsable" créé et synchronisé', 'success');
          } catch (e2) {
            errors++;
            this.log(`  ✗ Erreur création "responsable": ${e2.message}`, 'error');
          }
        } else {
          errors++;
          this.log(`  ✗ Erreur "responsable": ${e.message}`, 'error');
        }
      }
    }

    // Synchroniser le champ "responsable_mission" (Choice) - sur la table stratégie
    if (syncResponsableMission) {
      try {
        this.log('Mise à jour du champ "responsable_mission" (Choice)...', 'info');
        // Le champ responsable_mission peut être sur Ssir_principale_task ou sur Ssir_strategie2
        // Essayer d'abord sur la table principale
        await grist.docApi.applyUserActions([
          ['ModifyColumn', TABLE_ID, 'responsable_mission', {
            type: 'Choice',
            widgetOptions: widgetOptions
          }]
        ]);
        updated++;
        this.log('  ✓ Champ "responsable_mission" synchronisé', 'success');
      } catch (e) {
        // Essayer sur Ssir_strategie2
        try {
          await grist.docApi.applyUserActions([
            ['ModifyColumn', 'Ssir_strategie2', 'responsable', {
              type: 'Choice',
              widgetOptions: widgetOptions
            }]
          ]);
          updated++;
          this.log('  ✓ Champ "responsable" sur Ssir_strategie2 synchronisé', 'success');
        } catch (e2) {
          errors++;
          this.log(`  ✗ Erreur "responsable_mission": ${e.message}`, 'error');
        }
      }
    }

    this.log(`=== SYNCHRONISATION TERMINÉE ===`, updated > 0 ? 'success' : 'warning');
    this.log(`${updated} champ(s) mis à jour, ${errors} erreur(s)`, updated > 0 ? 'success' : 'warning');
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
