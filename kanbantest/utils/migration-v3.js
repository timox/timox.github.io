/**
 * Script de migration V3
 * Migre les donnees existantes vers la nouvelle taxonomie V3
 *
 * Usage: Executer dans la console du navigateur sur la page Kanban
 *
 * 1. Ouvrir la page Kanban connectee a Grist
 * 2. Ouvrir la console (F12 > Console)
 * 3. Copier-coller ce script et executer
 */

(async function migrateToV3() {
  console.log('=== Migration V3 - Debut ===');

  // Mapping type_tache (legacy) -> nature_activite (V3)
  const TYPE_TO_NATURE = {
    'Incident': 'INC',
    'Support': 'SUP',
    'MCO': 'MCO',
    'Projet': 'PRJ',
    'Overhead': 'OVH'
  };

  // Previsibilite par defaut selon nature
  const NATURE_PREVISIBILITE = {
    'INC': 'Imprévisible',
    'SUP': 'Imprévisible',
    'MCO': null,  // Variable - ne pas forcer
    'PRJ': 'Prévisible',
    'OVH': 'Prévisible'
  };

  // Verifier que Grist est disponible
  if (typeof grist === 'undefined') {
    console.error('Grist API non disponible. Assurez-vous d\'etre sur la page Kanban.');
    return;
  }

  // Recuperer toutes les taches
  let records;
  try {
    const tableId = 'Ssir_principale_task';
    records = await grist.docApi.fetchTable(tableId);
    console.log(`Nombre de taches trouvees: ${records.id.length}`);
  } catch (error) {
    console.error('Erreur lors de la recuperation des taches:', error);
    return;
  }

  // Analyser les donnees existantes
  const stats = {
    total: records.id.length,
    withTypeTache: 0,
    withNatureActivite: 0,
    toMigrate: 0,
    migrated: 0,
    errors: 0
  };

  const toMigrate = [];

  for (let i = 0; i < records.id.length; i++) {
    const id = records.id[i];
    const typeTache = records.type_tache?.[i] || '';
    const natureActivite = records.nature_activite?.[i] || '';
    const previsibilite = records.previsibilite?.[i] || records['previsibilité']?.[i] || '';

    if (typeTache) stats.withTypeTache++;
    if (natureActivite) stats.withNatureActivite++;

    // Migrer si type_tache existe mais pas nature_activite
    if (typeTache && !natureActivite) {
      const newNature = TYPE_TO_NATURE[typeTache];
      if (newNature) {
        const updates = { nature_activite: newNature };

        // Ajouter previsibilite si non definie et nature connue
        if (!previsibilite && NATURE_PREVISIBILITE[newNature]) {
          updates.previsibilite = NATURE_PREVISIBILITE[newNature];
        }

        toMigrate.push({ id, typeTache, updates });
        stats.toMigrate++;
      }
    }
  }

  console.log('\n=== Statistiques avant migration ===');
  console.log(`Total taches: ${stats.total}`);
  console.log(`Avec type_tache: ${stats.withTypeTache}`);
  console.log(`Avec nature_activite: ${stats.withNatureActivite}`);
  console.log(`A migrer: ${stats.toMigrate}`);

  if (toMigrate.length === 0) {
    console.log('\nAucune tache a migrer.');
    return { stats, migrated: [] };
  }

  // Afficher apercu
  console.log('\n=== Apercu des migrations ===');
  toMigrate.slice(0, 10).forEach(({ id, typeTache, updates }) => {
    console.log(`  Tache ${id}: ${typeTache} -> ${updates.nature_activite}${updates.previsibilite ? ` (prev: ${updates.previsibilite})` : ''}`);
  });
  if (toMigrate.length > 10) {
    console.log(`  ... et ${toMigrate.length - 10} autres`);
  }

  // Demander confirmation
  const confirm = window.confirm(
    `Migration V3: ${toMigrate.length} taches a migrer.\n\n` +
    `Cliquez OK pour lancer la migration.\n` +
    `Cliquez Annuler pour voir uniquement le rapport.`
  );

  if (!confirm) {
    console.log('\nMigration annulee par l\'utilisateur.');
    return { stats, toMigrate, dryRun: true };
  }

  // Executer la migration
  console.log('\n=== Execution de la migration ===');
  const migrated = [];
  const errors = [];

  for (const { id, typeTache, updates } of toMigrate) {
    try {
      await grist.docApi.applyUserActions([
        ['UpdateRecord', 'Ssir_principale_task', id, updates]
      ]);
      migrated.push({ id, typeTache, updates });
      stats.migrated++;
      console.log(`  OK: Tache ${id} migree`);
    } catch (error) {
      errors.push({ id, typeTache, error: error.message });
      stats.errors++;
      console.error(`  ERREUR: Tache ${id}:`, error.message);
    }

    // Pause pour eviter surcharge API
    if (migrated.length % 10 === 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log('\n=== Resultat de la migration ===');
  console.log(`Migrees avec succes: ${stats.migrated}`);
  console.log(`Erreurs: ${stats.errors}`);

  if (errors.length > 0) {
    console.log('\nTaches en erreur:');
    errors.forEach(({ id, error }) => console.log(`  - Tache ${id}: ${error}`));
  }

  console.log('\n=== Migration V3 - Terminee ===');
  console.log('Rafraichissez la page pour voir les changements.');

  return { stats, migrated, errors };
})();
