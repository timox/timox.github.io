/**
 * Script de migration V3 - Version amelioree
 * Migre les donnees existantes vers la nouvelle taxonomie V3
 *
 * Analyse des donnees actuelles:
 * - type_tache_id contient le GENRE d'action (DOC, ANA, etc.)
 * - type_tache='Support' pour tous (pas discriminant)
 * - [MISSION], [SA] et [MEO] dans les titres indiquent PRJ
 * - 4 enregistrements ___TEMP_USER_RECORD___ a nettoyer
 *
 * Usage: Executer dans la console du navigateur sur la page Kanban
 */

(async function migrateToV3() {
  console.log('=== Migration V3 - Debut ===');
  console.log('Analyse et migration des donnees vers la taxonomie V3\n');

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

  // Deduction de nature_activite selon le contexte
  function deduceNatureActivite(record, titre) {
    // Priorite 1: Si deja defini, garder
    if (record.nature_activite) {
      return record.nature_activite;
    }

    // Priorite 2: Prefixes dans le titre
    if (titre.includes('[MISSION]')) return 'PRJ';
    if (titre.includes('[SA]')) return 'PRJ';  // Ancien préfixe sous-action
    if (titre.includes('[MEO]')) return 'PRJ'; // Nouveau préfixe mise en œuvre
    if (titre.includes('[INC]')) return 'INC';
    if (titre.includes('[MCO]')) return 'MCO';

    // Priorite 3: type_tache_id suggere la nature
    const typeId = record.type_tache_id || '';
    if (typeId.toLowerCase().includes('mco')) return 'MCO';
    if (typeId.toLowerCase().includes('audit')) return 'PRJ';
    if (typeId.toLowerCase().includes('deploiement')) return 'PRJ';
    if (typeId.toLowerCase().includes('facture') || typeId.toLowerCase().includes('budget')) return 'OVH';
    if (typeId.toLowerCase().includes('poc')) return 'PRJ';

    // Priorite 4: Mots-cles dans le titre
    const titreLower = titre.toLowerCase();
    if (titreLower.includes('incident') || titreLower.includes('panne')) return 'INC';
    if (titreLower.includes('reunion') || titreLower.includes('réunion')) return 'OVH';
    if (titreLower.includes('formation')) return 'OVH';

    // Par defaut: Support (activite courante)
    return 'SUP';
  }

  // Previsibilite par defaut selon nature
  const NATURE_PREVISIBILITE = {
    'INC': 'Imprévisible',
    'SUP': 'Imprévisible',
    'MCO': null,  // Variable - doit etre specifie manuellement
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
  const tableId = 'Ssir_principale_task';
  try {
    records = await grist.docApi.fetchTable(tableId);
    console.log(`Taches trouvees: ${records.id.length}`);
  } catch (error) {
    console.error('Erreur lors de la recuperation des taches:', error);
    return;
  }

  // Statistiques
  const stats = {
    total: records.id.length,
    tempRecords: 0,
    alreadyMigrated: 0,
    toMigrate: 0,
    migrated: 0,
    errors: 0
  };

  const toMigrate = [];
  const toDelete = [];

  // Analyser chaque tache
  for (let i = 0; i < records.id.length; i++) {
    const id = records.id[i];
    const titre = records.titre?.[i] || '';
    const typeId = records.type_tache_id?.[i] || '';
    const typeTache = records.type_tache?.[i] || '';
    const natureActivite = records.nature_activite?.[i] || '';
    const genreAction = records.genre_action?.[i] || '';
    const previsibilite = records.previsibilite?.[i] || records['previsibilité']?.[i] || '';

    // Detecter les enregistrements TEMP
    if (titre.includes('___TEMP')) {
      toDelete.push({ id, titre });
      stats.tempRecords++;
      continue;
    }

    // Verifier si deja migre
    if (natureActivite && genreAction) {
      stats.alreadyMigrated++;
      continue;
    }

    // Preparer les mises a jour
    const updates = {};

    // 1. Determiner nature_activite
    if (!natureActivite) {
      const record = { nature_activite: natureActivite, type_tache_id: typeId };
      updates.nature_activite = deduceNatureActivite(record, titre);
    }

    // 2. Migrer type_tache_id vers genre_action
    if (!genreAction && typeId) {
      const genre = TYPE_ID_TO_GENRE[typeId];
      if (genre) {
        updates.genre_action = genre;
      }
    }

    // 3. Definir previsibilite si non presente
    const finalNature = updates.nature_activite || natureActivite;
    if (!previsibilite && finalNature && NATURE_PREVISIBILITE[finalNature]) {
      updates.previsibilite = NATURE_PREVISIBILITE[finalNature];
    }

    // Ajouter a la liste si des mises a jour sont necessaires
    if (Object.keys(updates).length > 0) {
      toMigrate.push({ id, titre, typeId, typeTache, updates });
      stats.toMigrate++;
    }
  }

  // Afficher le rapport
  console.log('\n=== RAPPORT D\'ANALYSE ===');
  console.log(`Total taches: ${stats.total}`);
  console.log(`Enregistrements TEMP (a supprimer): ${stats.tempRecords}`);
  console.log(`Deja migrees: ${stats.alreadyMigrated}`);
  console.log(`A migrer: ${stats.toMigrate}`);

  // Afficher les TEMP
  if (toDelete.length > 0) {
    console.log('\n=== ENREGISTREMENTS TEMP ===');
    toDelete.forEach(({ id, titre }) => {
      console.log(`  [${id}] ${titre.substring(0, 50)}`);
    });
  }

  // Afficher apercu des migrations
  if (toMigrate.length > 0) {
    console.log('\n=== APERCU DES MIGRATIONS ===');

    // Grouper par type de migration
    const byNature = toMigrate.filter(m => m.updates.nature_activite);
    const byGenre = toMigrate.filter(m => m.updates.genre_action);
    const byPrev = toMigrate.filter(m => m.updates.previsibilite);

    console.log(`  nature_activite a definir: ${byNature.length}`);
    console.log(`  genre_action a definir: ${byGenre.length}`);
    console.log(`  previsibilite a definir: ${byPrev.length}`);

    console.log('\nExemples (10 premiers):');
    toMigrate.slice(0, 10).forEach(({ id, titre, updates }) => {
      const parts = [];
      if (updates.nature_activite) parts.push(`nat=${updates.nature_activite}`);
      if (updates.genre_action) parts.push(`gen=${updates.genre_action}`);
      if (updates.previsibilite) parts.push(`prev=${updates.previsibilite}`);
      console.log(`  [${id}] ${titre.substring(0, 40)}... -> ${parts.join(', ')}`);
    });
    if (toMigrate.length > 10) {
      console.log(`  ... et ${toMigrate.length - 10} autres`);
    }
  }

  // Retourner les resultats sans executer (mode dry-run par defaut)
  const result = {
    stats,
    toDelete,
    toMigrate,

    // Fonction pour supprimer les TEMP
    async deleteTemp() {
      if (toDelete.length === 0) {
        console.log('Aucun enregistrement TEMP a supprimer.');
        return;
      }

      const confirm = window.confirm(
        `Supprimer ${toDelete.length} enregistrements TEMP ?\n\n` +
        `Cette action est irreversible.`
      );

      if (!confirm) {
        console.log('Suppression annulee.');
        return;
      }

      console.log('\nSuppression des enregistrements TEMP...');
      for (const { id, titre } of toDelete) {
        try {
          await grist.docApi.applyUserActions([
            ['RemoveRecord', tableId, id]
          ]);
          console.log(`  Supprime: ${id}`);
        } catch (error) {
          console.error(`  Erreur suppression ${id}:`, error.message);
        }
      }
      console.log('Suppression terminee.');
    },

    // Fonction pour executer la migration
    async executeMigration() {
      if (toMigrate.length === 0) {
        console.log('Aucune tache a migrer.');
        return;
      }

      const confirm = window.confirm(
        `Migrer ${toMigrate.length} taches vers V3 ?\n\n` +
        `Les champs nature_activite, genre_action et previsibilite seront mis a jour.`
      );

      if (!confirm) {
        console.log('Migration annulee.');
        return;
      }

      console.log('\nExecution de la migration...');
      let migrated = 0;
      let errors = 0;

      for (const { id, updates } of toMigrate) {
        try {
          await grist.docApi.applyUserActions([
            ['UpdateRecord', tableId, id, updates]
          ]);
          migrated++;
          if (migrated % 10 === 0) {
            console.log(`  Progression: ${migrated}/${toMigrate.length}`);
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (error) {
          errors++;
          console.error(`  Erreur tache ${id}:`, error.message);
        }
      }

      console.log(`\nMigration terminee: ${migrated} OK, ${errors} erreurs`);
      console.log('Rafraichissez la page pour voir les changements.');
    }
  };

  console.log('\n=== COMMANDES DISPONIBLES ===');
  console.log('Stockees dans la variable: migrationResult');
  console.log('  migrationResult.deleteTemp()      - Supprimer les TEMP');
  console.log('  migrationResult.executeMigration() - Lancer la migration');
  console.log('  migrationResult.toMigrate          - Liste des taches a migrer');
  console.log('  migrationResult.toDelete           - Liste des TEMP');

  // Stocker le resultat globalement pour acces facile
  window.migrationResult = result;

  return result;
})();
