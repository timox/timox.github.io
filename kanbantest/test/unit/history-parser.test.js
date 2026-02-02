// === test/unit/history-parser.test.js ===
// Tests for pure functions extracted from HistoryManager.js and SharedTaskModal.js

// ---- Inline copies of functions under test ----

function normalizeTimestamp(timestamp) {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? new Date() : timestamp;
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}

function extractFieldChangeInfo(details) {
  if (!details) return null;
  const teamMatch = details.match(/Équipe modifiée:\s*([^→]+)→\s*(.+)/);
  if (teamMatch) { return `Équipe modifiée: ${teamMatch[1].trim()} → ${teamMatch[2].trim()}`; }
  const responsableMatch = details.match(/Responsables?\s+modifiée?s?:\s*([^→]+)→\s*(.+)/);
  if (responsableMatch) { return `Responsables modifiés: ${responsableMatch[1].trim()} → ${responsableMatch[2].trim()}`; }
  const bureauMatch = details.match(/Bureau modifié:\s*([^→]+)→\s*(.+)/);
  if (bureauMatch) { return `Bureau modifié: ${bureauMatch[1].trim()} → ${bureauMatch[2].trim()}`; }
  const titreMatch = details.match(/Titre modifié:\s*([^→]+)→\s*(.+)/);
  if (titreMatch) {
    const avant = titreMatch[1].trim();
    const apres = titreMatch[2].trim();
    const avantCourt = avant.length > 30 ? avant.substring(0, 30) + '...' : avant;
    const apresCourt = apres.length > 30 ? apres.substring(0, 30) + '...' : apres;
    return `Titre modifié: ${avantCourt} → ${apresCourt}`;
  }
  const projetMatch = details.match(/Projet modifié:\s*([^→]+)→\s*(.+)/);
  if (projetMatch) { return `Projet modifié: ${projetMatch[1].trim()} → ${projetMatch[2].trim()}`; }
  const prioriteMatch = details.match(/(Urgence|Impact|Priorité)\s+modifiée?:\s*([^→]+)→\s*(.+)/);
  if (prioriteMatch) { return `${prioriteMatch[1]} modifiée: ${prioriteMatch[2].trim()} → ${prioriteMatch[3].trim()}`; }
  const dateMatch = details.match(/Date\s+[^:]*modifiée:\s*([^→]+)→\s*(.+)/);
  if (dateMatch) { return `Date d'échéance modifiée: ${dateMatch[1].trim()} → ${dateMatch[2].trim()}`; }
  const generalMatch = details.match(/([^:]+)\s+modifiée?s?:\s*([^→]+)→\s*(.+)/);
  if (generalMatch) {
    const champ = generalMatch[1].trim();
    const avant = generalMatch[2].trim();
    const apres = generalMatch[3].trim();
    const avantCourt = avant.length > 50 ? avant.substring(0, 50) + '...' : avant;
    const apresCourt = apres.length > 50 ? apres.substring(0, 50) + '...' : apres;
    return `${champ} modifié: ${avantCourt} → ${apresCourt}`;
  }
  return null;
}

function validateHistoryStructure(historyJSON) {
  try {
    const data = JSON.parse(historyJSON);
    if (!data.historique || !Array.isArray(data.historique)) {
      return { isValid: false, error: 'Structure historique invalide' };
    }
    const invalidEntries = data.historique.filter(entry => !entry.statut || !entry.date_entree);
    if (invalidEntries.length > 0) {
      return { isValid: false, error: `${invalidEntries.length} entrée(s) invalide(s) trouvée(s)` };
    }
    return { isValid: true, entriesCount: data.historique.length };
  } catch (error) {
    return { isValid: false, error: 'JSON invalide' };
  }
}

function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function getActionLabel(action) {
  const labels = {
    'comment': 'Commentaire',
    'status_change': 'Changement de statut',
    'update': 'Modification',
    'field_change': 'Modification',
    'jalons_update': 'Jalons modifiés',
    'strategies_update': 'Stratégies modifiées',
    'create': 'Création'
  };
  return labels[action] || action || 'Modification';
}

// ---- Tests ----

TestFramework.describe('normalizeTimestamp', function () {

  it('should return a valid Date for null input', function () {
    var result = normalizeTimestamp(null);
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

  it('should return a valid Date for undefined input', function () {
    var result = normalizeTimestamp(undefined);
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

  it('should return a valid Date for 0 input', function () {
    var result = normalizeTimestamp(0);
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

  it('should return a valid Date for false input', function () {
    var result = normalizeTimestamp(false);
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

  it('should pass through a valid Date object unchanged', function () {
    var input = new Date('2025-06-15T12:00:00Z');
    var result = normalizeTimestamp(input);
    assert.equal(result.getTime(), input.getTime());
  });

  it('should return a fallback Date for an invalid Date object', function () {
    var result = normalizeTimestamp(new Date('not-a-date'));
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

  it('should handle a Unix timestamp number (milliseconds)', function () {
    var ts = 1736899200000; // 2025-01-15T00:00:00Z
    var result = normalizeTimestamp(ts);
    assert.ok(result instanceof Date);
    assert.equal(result.getTime(), ts);
  });

  it('should handle an ISO string', function () {
    var result = normalizeTimestamp('2025-01-15T10:30:00Z');
    assert.ok(result instanceof Date);
    assert.equal(result.getFullYear(), 2025);
    assert.equal(result.getUTCMonth(), 0); // January
    assert.equal(result.getUTCDate(), 15);
    assert.equal(result.getUTCHours(), 10);
    assert.equal(result.getUTCMinutes(), 30);
  });

  it('should return a valid fallback Date for an invalid string', function () {
    var result = normalizeTimestamp('completely-invalid-garbage');
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

  it('should return a fallback Date for object input', function () {
    var result = normalizeTimestamp({ foo: 'bar' });
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

  it('should return a fallback Date for array input', function () {
    var result = normalizeTimestamp([1, 2, 3]);
    assert.ok(result instanceof Date);
    assert.isFalse(isNaN(result.getTime()));
  });

});

TestFramework.describe('extractFieldChangeInfo', function () {

  it('should return null for null input', function () {
    assert.isNull(extractFieldChangeInfo(null));
  });

  it('should return null for empty string', function () {
    assert.isNull(extractFieldChangeInfo(''));
  });

  it('should parse team change', function () {
    var result = extractFieldChangeInfo('Équipe modifiée: A, B → C, D');
    assert.equal(result, 'Équipe modifiée: A, B → C, D');
  });

  it('should parse responsable change', function () {
    var result = extractFieldChangeInfo('Responsable modifiée: Xavier → Yolanda');
    assert.equal(result, 'Responsables modifiés: Xavier → Yolanda');
  });

  it('should parse bureau change', function () {
    var result = extractFieldChangeInfo('Bureau modifié: Réseaux → BDD');
    assert.equal(result, 'Bureau modifié: Réseaux → BDD');
  });

  it('should truncate title change when values exceed 30 chars', function () {
    var longBefore = 'Un titre vraiment tres long qui depasse trente caracteres facilement';
    var longAfter = 'Un autre titre tout aussi long qui depasse trente caracteres aussi';
    var input = 'Titre modifié: ' + longBefore + ' → ' + longAfter;
    var result = extractFieldChangeInfo(input);
    assert.ok(result !== null);
    assert.includes(result, 'Titre modifié:');
    assert.includes(result, '...');
    // The truncated before value should be 30 chars + '...'
    var parts = result.replace('Titre modifié: ', '').split(' → ');
    assert.ok(parts[0].endsWith('...'));
    assert.ok(parts[1].endsWith('...'));
    assert.equal(parts[0].length, 33); // 30 + '...'
    assert.equal(parts[1].length, 33);
  });

  it('should not truncate title change when values are short', function () {
    var result = extractFieldChangeInfo('Titre modifié: Court → Bref');
    assert.equal(result, 'Titre modifié: Court → Bref');
  });

  it('should parse project change', function () {
    var result = extractFieldChangeInfo('Projet modifié: Alpha → Beta');
    assert.equal(result, 'Projet modifié: Alpha → Beta');
  });

  it('should parse urgence priority change', function () {
    var result = extractFieldChangeInfo('Urgence modifiée: Haute → Basse');
    assert.equal(result, 'Urgence modifiée: Haute → Basse');
  });

  it('should parse impact priority change', function () {
    var result = extractFieldChangeInfo('Impact modifiée: Critique → Modéré');
    assert.equal(result, 'Impact modifiée: Critique → Modéré');
  });

  it('should parse date change', function () {
    var result = extractFieldChangeInfo("Date d'échéance modifiée: 2025-01-15 → 2025-06-30");
    assert.equal(result, "Date d'échéance modifiée: 2025-01-15 → 2025-06-30");
  });

  it('should return null for unrecognized pattern without arrow', function () {
    assert.isNull(extractFieldChangeInfo('Ceci est juste un texte libre'));
  });

  it('should match the general fallback pattern for other field changes', function () {
    var result = extractFieldChangeInfo('Catégorie modifiée: MCO → Projet');
    assert.ok(result !== null);
    assert.includes(result, 'modifié');
    assert.includes(result, 'MCO');
    assert.includes(result, 'Projet');
  });

});

TestFramework.describe('validateHistoryStructure', function () {

  it('should return error for invalid JSON', function () {
    var result = validateHistoryStructure('not json {{{');
    assert.isFalse(result.isValid);
    assert.equal(result.error, 'JSON invalide');
  });

  it('should return error when historique key is missing', function () {
    var result = validateHistoryStructure(JSON.stringify({ data: [] }));
    assert.isFalse(result.isValid);
    assert.equal(result.error, 'Structure historique invalide');
  });

  it('should return error when historique is not an array', function () {
    var result = validateHistoryStructure(JSON.stringify({ historique: 'not-array' }));
    assert.isFalse(result.isValid);
    assert.equal(result.error, 'Structure historique invalide');
  });

  it('should return valid with 0 entries for empty historique array', function () {
    var result = validateHistoryStructure(JSON.stringify({ historique: [] }));
    assert.isTrue(result.isValid);
    assert.equal(result.entriesCount, 0);
  });

  it('should return valid for entries with statut and date_entree', function () {
    var json = JSON.stringify({
      historique: [
        { statut: 'En cours', date_entree: '2025-01-10' },
        { statut: 'Terminé', date_entree: '2025-02-20' }
      ]
    });
    var result = validateHistoryStructure(json);
    assert.isTrue(result.isValid);
    assert.equal(result.entriesCount, 2);
  });

  it('should detect mixed valid and invalid entries', function () {
    var json = JSON.stringify({
      historique: [
        { statut: 'En cours', date_entree: '2025-01-10' },
        { statut: 'Backlog' },       // missing date_entree
        { date_entree: '2025-03-01' } // missing statut
      ]
    });
    var result = validateHistoryStructure(json);
    assert.isFalse(result.isValid);
    assert.equal(result.error, '2 entrée(s) invalide(s) trouvée(s)');
  });

  it('should detect all invalid entries', function () {
    var json = JSON.stringify({
      historique: [
        { note: 'No statut or date' },
        { description: 'Also missing' }
      ]
    });
    var result = validateHistoryStructure(json);
    assert.isFalse(result.isValid);
    assert.equal(result.error, '2 entrée(s) invalide(s) trouvée(s)');
  });

  it('should handle nested JSON structures with valid historique', function () {
    var json = JSON.stringify({
      meta: { version: 2, source: 'import' },
      historique: [
        { statut: 'Nouveau', date_entree: '2025-05-01', details: { user: 'Alice' } }
      ]
    });
    var result = validateHistoryStructure(json);
    assert.isTrue(result.isValid);
    assert.equal(result.entriesCount, 1);
  });

});

TestFramework.describe('truncate', function () {

  it('should leave a short string unchanged', function () {
    assert.equal(truncate('Hello', 10), 'Hello');
  });

  it('should leave a string at exact length unchanged', function () {
    assert.equal(truncate('12345', 5), '12345');
  });

  it('should truncate a longer string with ellipsis', function () {
    assert.equal(truncate('Hello World', 5), 'Hello...');
  });

  it('should handle an empty string', function () {
    assert.equal(truncate('', 10), '');
  });

  it('should truncate to 0 length with ellipsis', function () {
    assert.equal(truncate('Hello', 0), '...');
  });

});

TestFramework.describe('getActionLabel', function () {

  it('should return Commentaire for comment', function () {
    assert.equal(getActionLabel('comment'), 'Commentaire');
  });

  it('should return Changement de statut for status_change', function () {
    assert.equal(getActionLabel('status_change'), 'Changement de statut');
  });

  it('should return Modification for update', function () {
    assert.equal(getActionLabel('update'), 'Modification');
  });

  it('should return Création for create', function () {
    assert.equal(getActionLabel('create'), 'Création');
  });

  it('should return the action string itself for unknown action', function () {
    assert.equal(getActionLabel('custom_action'), 'custom_action');
  });

  it('should return Modification for null or undefined', function () {
    assert.equal(getActionLabel(null), 'Modification');
    assert.equal(getActionLabel(undefined), 'Modification');
  });

});
