/**
 * Script d'initialisation Grist pour la taxonomie V3
 *
 * Ce script configure les colonnes de la table principale avec les bons types
 * et importe le jeu de données test.
 *
 * Usage: Exécuter dans la console du navigateur depuis une page Grist
 * ou via un widget custom.
 */

const GRIST_SETUP = {
  tableName: 'Ssir_principale_task',

  // Colonnes V3 à créer/vérifier
  columns: {
    nature_activite: {
      type: 'Choice',
      label: 'Nature activité',
      widgetOptions: {
        choices: ['INC', 'SUP', 'MCO', 'PRJ', 'OVH'],
        choiceOptions: {
          'INC': { fillColor: '#dc3545', textColor: '#ffffff' },
          'SUP': { fillColor: '#0d6efd', textColor: '#ffffff' },
          'MCO': { fillColor: '#6f42c1', textColor: '#ffffff' },
          'PRJ': { fillColor: '#198754', textColor: '#ffffff' },
          'OVH': { fillColor: '#6c757d', textColor: '#ffffff' }
        }
      }
    },
    genre_action: {
      type: 'Choice',
      label: 'Genre action',
      widgetOptions: {
        choices: ['DOC', 'ANA', 'CON', 'RCH', 'DEV', 'TST', 'VAL', 'VER', 'COR', 'INS', 'CFG', 'INV', 'SEC', 'REU', 'FOR', 'SUI'],
        choiceOptions: {
          'DOC': { fillColor: '#3b82f6' },
          'ANA': { fillColor: '#8b5cf6' },
          'CON': { fillColor: '#6366f1' },
          'RCH': { fillColor: '#a855f7' },
          'DEV': { fillColor: '#7c3aed' },
          'TST': { fillColor: '#10b981' },
          'VAL': { fillColor: '#22c55e' },
          'VER': { fillColor: '#14b8a6' },
          'COR': { fillColor: '#ef4444' },
          'INS': { fillColor: '#059669' },
          'CFG': { fillColor: '#f97316' },
          'INV': { fillColor: '#f59e0b' },
          'SEC': { fillColor: '#dc2626' },
          'REU': { fillColor: '#0ea5e9' },
          'FOR': { fillColor: '#06b6d4' },
          'SUI': { fillColor: '#eab308' }
        }
      }
    },
    etape_code: {
      type: 'Choice',
      label: 'Étape cycle',
      widgetOptions: {
        choices: ['ETP.VIS', 'ETP.ANA', 'ETP.CON', 'ETP.PLN', 'ETP.REA', 'ETP.DEP', 'ETP.EXP', 'ETP.AME'],
        choiceOptions: {
          'ETP.VIS': { fillColor: '#8b5cf6' },
          'ETP.ANA': { fillColor: '#6366f1' },
          'ETP.CON': { fillColor: '#3b82f6' },
          'ETP.PLN': { fillColor: '#0ea5e9' },
          'ETP.REA': { fillColor: '#14b8a6' },
          'ETP.DEP': { fillColor: '#22c55e' },
          'ETP.EXP': { fillColor: '#f59e0b' },
          'ETP.AME': { fillColor: '#eab308' }
        }
      }
    },
    previsibilite: {
      type: 'Choice',
      label: 'Prévisibilité',
      widgetOptions: {
        choices: ['Prévisible', 'Imprévisible'],
        choiceOptions: {
          'Prévisible': { fillColor: '#198754', textColor: '#ffffff' },
          'Imprévisible': { fillColor: '#dc3545', textColor: '#ffffff' }
        }
      }
    }
  },

  // Vues à créer (pour documentation, non automatisable via API)
  views: [
    {
      name: 'Kanban Principal',
      type: 'custom',
      url: 'kanban.html',
      description: 'Vue Kanban avec colonnes par statut'
    },
    {
      name: 'Timeline',
      type: 'custom',
      url: 'kanban.html',
      description: 'Vue timeline intégrée au Kanban (bouton bascule)'
    },
    {
      name: 'Graphe Tâches',
      type: 'custom',
      url: 'taches.html',
      description: 'Visualisation des liens entre tâches'
    },
    {
      name: 'Par Nature',
      type: 'table',
      groupBy: 'nature_activite',
      description: 'Groupement par nature d\'activité (INC/SUP/MCO/PRJ/OVH)'
    },
    {
      name: 'Par Étape',
      type: 'table',
      groupBy: 'etape_code',
      description: 'Groupement par étape du cycle (TOGAF ADM)'
    },
    {
      name: 'Par Genre',
      type: 'table',
      groupBy: 'genre_action',
      description: 'Groupement par genre d\'action (COBIT)'
    },
    {
      name: 'Matrice Nature×Étape',
      type: 'summary',
      groupBy: ['nature_activite', 'etape_code'],
      description: 'Tableau croisé dynamique'
    }
  ]
};

/**
 * Configure les colonnes V3 dans Grist
 */
async function setupV3Columns() {
  if (typeof grist === 'undefined') {
    console.error('Grist API non disponible. Exécutez ce script depuis un widget Grist.');
    return;
  }

  const docApi = grist.docApi;
  const table = GRIST_SETUP.tableName;

  console.log('Configuration des colonnes V3...');

  for (const [colId, config] of Object.entries(GRIST_SETUP.columns)) {
    try {
      // Vérifier si la colonne existe
      const tables = await docApi.fetchTable(table);
      const hasColumn = colId in tables;

      if (!hasColumn) {
        // Créer la colonne
        console.log(`Création de la colonne ${colId}...`);
        await docApi.applyUserActions([
          ['AddColumn', table, colId, { type: config.type, label: config.label }]
        ]);
      }

      // Mettre à jour les options de widget (couleurs des choices)
      if (config.widgetOptions) {
        console.log(`Configuration des options pour ${colId}...`);
        await docApi.applyUserActions([
          ['ModifyColumn', table, colId, {
            widgetOptions: JSON.stringify(config.widgetOptions)
          }]
        ]);
      }

      console.log(`✓ ${colId} configuré`);
    } catch (error) {
      console.error(`✗ Erreur pour ${colId}:`, error.message);
    }
  }

  console.log('Configuration terminée.');
}

/**
 * Importe les données test depuis le CSV
 */
async function importTestData(csvUrl) {
  console.log('Import des données test...');

  try {
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    // Parser CSV simple
    const lines = csvText.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const record = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        // Convertir les dates
        if (header.includes('date') && value) {
          value = new Date(value).getTime() / 1000;
        }
        record[header] = value;
      });
      records.push(record);
    }

    console.log(`${records.length} enregistrements à importer`);

    // Importer via Grist API
    const docApi = grist.docApi;
    const columns = {};
    headers.forEach(h => { columns[h] = []; });

    records.forEach(record => {
      headers.forEach(h => {
        columns[h].push(record[h]);
      });
    });

    await docApi.applyUserActions([
      ['BulkAddRecord', GRIST_SETUP.tableName, records.map(() => null), columns]
    ]);

    console.log('✓ Import terminé');
  } catch (error) {
    console.error('✗ Erreur import:', error.message);
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Export pour utilisation
if (typeof module !== 'undefined') {
  module.exports = { GRIST_SETUP, setupV3Columns, importTestData };
}

// Instructions
console.log(`
╔══════════════════════════════════════════════════════════════╗
║  GRIST SETUP V3 - Instructions                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. Ouvrir ce script dans un widget Custom (page setup.html) ║
║  2. Ou copier-coller dans la console Grist (F12)             ║
║                                                              ║
║  Commandes disponibles :                                     ║
║  • setupV3Columns()     - Configure les colonnes V3          ║
║  • importTestData(url)  - Importe le CSV test                ║
║                                                              ║
║  Vues à créer manuellement :                                 ║
║  • Kanban Principal (widget custom → kanban.html)            ║
║  • Graphe Tâches (widget custom → taches.html)               ║
║  • Tables groupées par nature/étape/genre                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
