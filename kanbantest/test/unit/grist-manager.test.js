// === test/unit/grist-manager.test.js ===
// Tests for GristManager - prepareDataForGrist, _toGristTimestamp

// ---- Inline _toGristTimestamp for testing ----

function _toGristTimestamp(dateValue) {
  if (dateValue === null || dateValue === undefined) return null;

  if (typeof dateValue === 'number') {
    if (dateValue === 0) return null;
    return dateValue > 1e12 ? Math.floor(dateValue / 1000) : dateValue;
  }

  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : Math.floor(dateValue.getTime() / 1000);
  }

  if (typeof dateValue === 'string') {
    if (!dateValue.trim()) return null;
    var d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
  }

  return null;
}

// ---- Inline simplified prepareDataForGrist for testing ----

function prepareDataForGrist(recordData) {
  var gristData = {};

  var simpleFields = [
    'titre', 'description', 'statut', 'projet', 'urgence', 'impact', 'notes',
    'nature_activite', 'genre_action', 'etape_cycle', 'previsibilite',
    'code_mission', 'nom_mission', 'mission_responsable', 'mission_bureau',
    'mission_priorite', 'mission_date_debut', 'mission_date_fin',
    'mise_en_oeuvre_code', 'mise_en_oeuvre_nom', 'categorie',
    'mise_en_oeuvre_charge_estimee', 'mise_en_oeuvre_charge_reelle',
    'strategie_objectif', 'strategie_sous_objectif', 'strategie_action',
    'programme_id', 'responsable_id',
    'est_classifiee',
    'reference'
  ];

  simpleFields.forEach(function (field) {
    if (recordData.hasOwnProperty(field)) {
      gristData[field] = recordData[field] ?? null;
    }
  });

  // Bureau/qui ChoiceList
  if (recordData.bureau !== undefined && recordData.bureau !== null) {
    if (Array.isArray(recordData.bureau)) {
      gristData.bureau = recordData.bureau;
    } else if (typeof recordData.bureau === 'string' && recordData.bureau.trim()) {
      gristData.bureau = ['L'].concat(recordData.bureau.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
    } else {
      gristData.bureau = ['L'];
    }
  }

  if (recordData.qui !== undefined && recordData.qui !== null) {
    if (Array.isArray(recordData.qui)) {
      gristData.qui = recordData.qui;
    } else if (typeof recordData.qui === 'string' && recordData.qui.trim()) {
      gristData.qui = ['L'].concat(recordData.qui.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
    } else {
      gristData.qui = ['L'];
    }
  }

  // Strategie_id ReferenceList
  if (recordData.strategie_id !== undefined) {
    if (Array.isArray(recordData.strategie_id) && recordData.strategie_id.length >= 1 && recordData.strategie_id[0] === 'L') {
      gristData.strategie_id = recordData.strategie_id;
    } else if (typeof recordData.strategie_id === 'number') {
      gristData.strategie_id = ['L', recordData.strategie_id];
    } else if (typeof recordData.strategie_id === 'string' && /^\d+$/.test(recordData.strategie_id)) {
      gristData.strategie_id = ['L', parseInt(recordData.strategie_id, 10)];
    } else {
      gristData.strategie_id = ['L'];
    }
  }

  // Strategie_ids array
  if (recordData.strategie_ids && Array.isArray(recordData.strategie_ids) && recordData.strategie_ids.length > 0) {
    gristData.strategie_id = ['L'].concat(recordData.strategie_ids);
  }

  // Avancement
  if (recordData.avancement !== undefined) {
    gristData.avancement = typeof recordData.avancement === 'number' ? recordData.avancement : parseInt(recordData.avancement, 10) || 0;
  }

  // Jalons
  if (recordData.jalons !== undefined) {
    gristData.jalons = Array.isArray(recordData.jalons) ? JSON.stringify(recordData.jalons) : recordData.jalons || '';
  }

  // Liens → tache_liens
  if (recordData.liens !== undefined) {
    gristData.tache_liens = Array.isArray(recordData.liens) ? JSON.stringify(recordData.liens) : recordData.liens || '';
  }
  if (recordData.tache_liens !== undefined && !gristData.tache_liens) {
    gristData.tache_liens = typeof recordData.tache_liens === 'string' ? recordData.tache_liens : JSON.stringify(recordData.tache_liens);
  }

  // Dates
  if (recordData.hasOwnProperty('date_echeance')) {
    gristData.date_echeance = _toGristTimestamp(recordData.date_echeance);
  }
  if (recordData.hasOwnProperty('date_debut')) {
    gristData.date_debut = _toGristTimestamp(recordData.date_debut);
  }

  return gristData;
}

// ---- Tests ----

describe('GristManager -- _toGristTimestamp', function () {
  it('returns null for null', function () {
    assert.isNull(_toGristTimestamp(null));
  });

  it('returns null for undefined', function () {
    assert.isNull(_toGristTimestamp(undefined));
  });

  it('returns null for 0', function () {
    assert.isNull(_toGristTimestamp(0));
  });

  it('returns null for empty string', function () {
    assert.isNull(_toGristTimestamp(''));
  });

  it('returns null for whitespace string', function () {
    assert.isNull(_toGristTimestamp('   '));
  });

  it('passes through seconds timestamp as-is', function () {
    assert.equal(_toGristTimestamp(1735689600), 1735689600);
  });

  it('converts milliseconds timestamp to seconds', function () {
    assert.equal(_toGristTimestamp(1735689600000), 1735689600);
  });

  it('converts Date object to seconds timestamp', function () {
    var d = new Date('2025-01-01T00:00:00Z');
    var expected = Math.floor(d.getTime() / 1000);
    assert.equal(_toGristTimestamp(d), expected);
  });

  it('returns null for invalid Date object', function () {
    assert.isNull(_toGristTimestamp(new Date('invalid')));
  });

  it('converts YYYY-MM-DD string to seconds timestamp', function () {
    var result = _toGristTimestamp('2025-06-15');
    assert.typeOf(result, 'number');
    assert.greaterThan(result, 1000000000);
    // Verify round-trip: seconds back to date
    var d = new Date(result * 1000);
    assert.equal(d.getFullYear(), 2025);
  });

  it('converts ISO string to seconds timestamp', function () {
    var result = _toGristTimestamp('2025-01-01T12:00:00Z');
    assert.typeOf(result, 'number');
    assert.greaterThan(result, 1000000000);
  });

  it('returns null for unparseable string', function () {
    assert.isNull(_toGristTimestamp('not-a-date'));
  });
});

describe('GristManager -- prepareDataForGrist dates', function () {
  it('preserves seconds timestamp for date_echeance', function () {
    var data = prepareDataForGrist({ date_echeance: 1735689600 });
    assert.equal(data.date_echeance, 1735689600);
  });

  it('preserves seconds timestamp for date_debut', function () {
    var data = prepareDataForGrist({ date_debut: 1735689600 });
    assert.equal(data.date_debut, 1735689600);
  });

  it('converts milliseconds to seconds for dates', function () {
    var data = prepareDataForGrist({ date_echeance: 1735689600000 });
    assert.equal(data.date_echeance, 1735689600);
  });

  it('converts null date_echeance to null (clearing)', function () {
    var data = prepareDataForGrist({ date_echeance: null });
    assert.isNull(data.date_echeance);
  });

  it('converts null date_debut to null (clearing)', function () {
    var data = prepareDataForGrist({ date_debut: null });
    assert.isNull(data.date_debut);
  });

  it('does not output date fields when not in input', function () {
    var data = prepareDataForGrist({ titre: 'test' });
    assert.isFalse(data.hasOwnProperty('date_echeance'));
    assert.isFalse(data.hasOwnProperty('date_debut'));
  });
});

describe('GristManager -- prepareDataForGrist simpleFields ?? null', function () {
  it('preserves empty string for text fields', function () {
    var data = prepareDataForGrist({ titre: '' });
    assert.equal(data.titre, '');
  });

  it('preserves false for boolean fields', function () {
    var data = prepareDataForGrist({ est_classifiee: false });
    assert.isFalse(data.est_classifiee);
  });

  it('converts undefined (missing) to null', function () {
    // When a field exists but value is undefined
    var input = {};
    input.titre = undefined;
    var data = prepareDataForGrist(input);
    assert.isNull(data.titre);
  });

  it('passes through non-empty values unchanged', function () {
    var data = prepareDataForGrist({ titre: 'Mon titre', statut: 'En cours' });
    assert.equal(data.titre, 'Mon titre');
    assert.equal(data.statut, 'En cours');
  });

  it('passes through null as null', function () {
    var data = prepareDataForGrist({ titre: null });
    assert.isNull(data.titre);
  });
});

describe('GristManager -- prepareDataForGrist liens', function () {
  it('maps recordData.liens to gristData.tache_liens', function () {
    var liens = [{ targetId: 42, type: 'depends_on', createdAt: 12345 }];
    var data = prepareDataForGrist({ liens: liens });
    assert.ok(data.hasOwnProperty('tache_liens'));
    assert.isFalse(data.hasOwnProperty('liens'));
    assert.equal(data.tache_liens, JSON.stringify(liens));
  });

  it('handles empty liens array (clearing)', function () {
    var data = prepareDataForGrist({ liens: [] });
    assert.equal(data.tache_liens, '[]');
  });

  it('handles liens string passthrough', function () {
    var jsonStr = '[{"targetId":1}]';
    var data = prepareDataForGrist({ liens: jsonStr });
    assert.equal(data.tache_liens, jsonStr);
  });
});

describe('GristManager -- prepareDataForGrist jalons', function () {
  it('converts jalons array to JSON string', function () {
    var jalons = [{ titre: 'Jalon 1', date: '2025-06-15' }];
    var data = prepareDataForGrist({ jalons: jalons });
    assert.equal(data.jalons, JSON.stringify(jalons));
  });

  it('handles empty jalons array (clearing)', function () {
    var data = prepareDataForGrist({ jalons: [] });
    assert.equal(data.jalons, '[]');
  });

  it('passes through jalons string', function () {
    var data = prepareDataForGrist({ jalons: '[{"titre":"J1"}]' });
    assert.equal(data.jalons, '[{"titre":"J1"}]');
  });
});

describe('GristManager -- prepareDataForGrist avancement', function () {
  it('preserves 0 value', function () {
    var data = prepareDataForGrist({ avancement: 0 });
    assert.equal(data.avancement, 0);
  });

  it('preserves 100 value', function () {
    var data = prepareDataForGrist({ avancement: 100 });
    assert.equal(data.avancement, 100);
  });

  it('converts string to number', function () {
    var data = prepareDataForGrist({ avancement: '50' });
    assert.equal(data.avancement, 50);
  });
});

describe('GristManager -- prepareDataForGrist bureau/qui ChoiceList', function () {
  it('converts CSV bureau to ChoiceList format', function () {
    var data = prepareDataForGrist({ bureau: 'Reseaux, BDD' });
    assert.deepEqual(data.bureau, ['L', 'Reseaux', 'BDD']);
  });

  it('handles empty bureau string', function () {
    var data = prepareDataForGrist({ bureau: '' });
    assert.deepEqual(data.bureau, ['L']);
  });

  it('passes through array bureau', function () {
    var data = prepareDataForGrist({ bureau: ['L', 'Reseaux'] });
    assert.deepEqual(data.bureau, ['L', 'Reseaux']);
  });

  it('converts CSV qui to ChoiceList format', function () {
    var data = prepareDataForGrist({ qui: 'Alice, Bob' });
    assert.deepEqual(data.qui, ['L', 'Alice', 'Bob']);
  });
});

describe('GristManager -- prepareDataForGrist strategies', function () {
  it('clears strategie_id when null', function () {
    var data = prepareDataForGrist({ strategie_id: null });
    assert.deepEqual(data.strategie_id, ['L']);
  });

  it('converts strategie_ids array to ReferenceList', function () {
    var data = prepareDataForGrist({ strategie_ids: [10, 20] });
    assert.deepEqual(data.strategie_id, ['L', 10, 20]);
  });

  it('converts single strategie_id number to ReferenceList', function () {
    var data = prepareDataForGrist({ strategie_id: 42 });
    assert.deepEqual(data.strategie_id, ['L', 42]);
  });

  it('preserves existing ReferenceList format', function () {
    var data = prepareDataForGrist({ strategie_id: ['L', 10, 20] });
    assert.deepEqual(data.strategie_id, ['L', 10, 20]);
  });
});
