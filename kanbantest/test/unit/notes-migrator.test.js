// === test/unit/notes-migrator.test.js ===
// Tests for js/utils/NotesJsonMigrator.js

function createMockGristApi() {
  const calls = [];
  return {
    docApi: { applyUserActions: async function (actions) { calls.push(actions); return Promise.resolve(); } },
    getCalls: function () { return calls; },
    reset: function () { calls.length = 0; }
  };
}

const TABLE_ID = 'Ssir_principale_task';

class NotesJsonMigrator {
  constructor(gristApi) { this.grist = gristApi; }

  isJsonFormat(notes) {
    if (!notes || typeof notes !== 'string') return false;
    try { const p = JSON.parse(notes); return p && typeof p === 'object' && p.hasOwnProperty('content'); }
    catch (e) { return false; }
  }

  convertToJsonFormat(notes) { return JSON.stringify({ content: notes || '', history: [] }, null, 2); }

  async migrateAllRecords(records) {
    if (!Array.isArray(records)) return 0;
    const toMigrate = records.filter(r => r.notes && !this.isJsonFormat(r.notes));
    if (!toMigrate.length) return 0;
    let migrated = 0;
    for (let i = 0; i < toMigrate.length; i += 10) {
      const batch = toMigrate.slice(i, i + 10);
      const actions = batch.map(r => ['UpdateRecord', TABLE_ID, r.id, { notes: this.convertToJsonFormat(r.notes) }]);
      try { await this.grist.docApi.applyUserActions(actions); migrated += batch.length; } catch (e) { break; }
    }
    return migrated;
  }

  async migrateRecord(record) {
    if (!record.notes || this.isJsonFormat(record.notes)) return false;
    try { await this.grist.docApi.applyUserActions([['UpdateRecord', TABLE_ID, record.id, { notes: this.convertToJsonFormat(record.notes) }]]); return true; }
    catch (e) { return false; }
  }

  async addHistoryEntry(record, historyEntry) {
    let notesData = this.isJsonFormat(record.notes) ? JSON.parse(record.notes) : { content: record.notes || '', history: [] };
    const entry = {
      timestamp: new Date().toISOString(), user: historyEntry.user || 'System',
      action: historyEntry.action || 'update', details: historyEntry.details || '',
      status: historyEntry.status || record.statut
    };
    if (historyEntry.oldValue) entry.oldValue = historyEntry.oldValue;
    if (historyEntry.newValue) entry.newValue = historyEntry.newValue;
    notesData.history.push(entry);
    if (historyEntry.newValue && historyEntry.newValue.trim() !== '') notesData.content = historyEntry.newValue;
    if (notesData.history.length > 50) notesData.history = notesData.history.slice(-50);
    try { await this.grist.docApi.applyUserActions([['UpdateRecord', TABLE_ID, record.id, { notes: JSON.stringify(notesData, null, 2) }]]); } catch (e) {}
  }

  getHistory(record) {
    if (!record.notes || !this.isJsonFormat(record.notes)) return [];
    try { return JSON.parse(record.notes).history || []; } catch (e) { return []; }
  }

  getContent(record) {
    if (!record.notes) return '';
    if (this.isJsonFormat(record.notes)) { try { return JSON.parse(record.notes).content || ''; } catch (e) { return record.notes; } }
    return record.notes;
  }
}

// =================================================================
describe('NotesJsonMigrator -- isJsonFormat', function () {
  let m;
  beforeEach(function () { m = new NotesJsonMigrator(createMockGristApi()); });
  it('false for null', function () { assert.isFalse(m.isJsonFormat(null)); });
  it('false for undefined', function () { assert.isFalse(m.isJsonFormat(undefined)); });
  it('false for empty string', function () { assert.isFalse(m.isJsonFormat('')); });
  it('false for plain text', function () { assert.isFalse(m.isJsonFormat('plain text')); });
  it('false for JSON without content', function () { assert.isFalse(m.isJsonFormat('{"history":[]}')); });
  it('true for valid JSON with content', function () { assert.isTrue(m.isJsonFormat('{"content":"hi","history":[]}')); });
  it('true for empty content', function () { assert.isTrue(m.isJsonFormat('{"content":""}')); });
  it('false for invalid JSON', function () { assert.isFalse(m.isJsonFormat('{bad}')); });
  it('false for array JSON', function () { assert.isFalse(m.isJsonFormat('[1,2]')); });
});

describe('NotesJsonMigrator -- convertToJsonFormat', function () {
  let m;
  beforeEach(function () { m = new NotesJsonMigrator(createMockGristApi()); });
  it('converts plain text', function () { const r = JSON.parse(m.convertToJsonFormat('Hello')); assert.equal(r.content, 'Hello'); assert.deepEqual(r.history, []); });
  it('handles null as empty', function () { assert.equal(JSON.parse(m.convertToJsonFormat(null)).content, ''); });
  it('produces valid JSON', function () { assert.doesNotThrow(function () { JSON.parse(m.convertToJsonFormat('test')); }); });
});

describe('NotesJsonMigrator -- getContent', function () {
  let m;
  beforeEach(function () { m = new NotesJsonMigrator(createMockGristApi()); });
  it('empty for no notes', function () { assert.equal(m.getContent({ notes: null }), ''); });
  it('plain text as-is', function () { assert.equal(m.getContent({ notes: 'Hello' }), 'Hello'); });
  it('extracts from JSON', function () { assert.equal(m.getContent({ notes: JSON.stringify({ content: 'JSON', history: [] }) }), 'JSON'); });
});

describe('NotesJsonMigrator -- getHistory', function () {
  let m;
  beforeEach(function () { m = new NotesJsonMigrator(createMockGristApi()); });
  it('empty for no notes', function () { assert.deepEqual(m.getHistory({ notes: null }), []); });
  it('empty for plain text', function () { assert.deepEqual(m.getHistory({ notes: 'text' }), []); });
  it('returns array from JSON', function () { const j = JSON.stringify({ content: '', history: [{ action: 'x' }] }); assert.lengthOf(m.getHistory({ notes: j }), 1); });
});

describe('NotesJsonMigrator -- migrateRecord (async)', function () {
  let m, api;
  beforeEach(function () { api = createMockGristApi(); m = new NotesJsonMigrator(api); });
  it('false for no notes', async function () { assert.isFalse(await m.migrateRecord({ id: 1, notes: null })); assert.lengthOf(api.getCalls(), 0); });
  it('false for already JSON', async function () { assert.isFalse(await m.migrateRecord({ id: 1, notes: '{"content":"x","history":[]}' })); });
  it('migrates plain text', async function () { assert.isTrue(await m.migrateRecord({ id: 42, notes: 'Plain' })); assert.lengthOf(api.getCalls(), 1); const saved = JSON.parse(api.getCalls()[0][0][3].notes); assert.equal(saved.content, 'Plain'); });
});

describe('NotesJsonMigrator -- migrateAllRecords (async)', function () {
  let m, api;
  beforeEach(function () { api = createMockGristApi(); m = new NotesJsonMigrator(api); });
  it('0 for non-array', async function () { assert.equal(await m.migrateAllRecords(null), 0); });
  it('0 for empty', async function () { assert.equal(await m.migrateAllRecords([]), 0); });
  it('0 when all JSON', async function () { const j = '{"content":"","history":[]}'; assert.equal(await m.migrateAllRecords([{ id: 1, notes: j }]), 0); });
  it('migrates only plain text', async function () { const j = '{"content":"","history":[]}'; assert.equal(await m.migrateAllRecords([{ id: 1, notes: 'plain' }, { id: 2, notes: j }, { id: 3, notes: 'also' }]), 2); });
});

describe('NotesJsonMigrator -- addHistoryEntry (async)', function () {
  let m, api;
  beforeEach(function () { api = createMockGristApi(); m = new NotesJsonMigrator(api); });

  it('adds entry to existing JSON', async function () {
    await m.addHistoryEntry({ id: 1, notes: '{"content":"","history":[]}', statut: 'En cours' }, { user: 'Alice', action: 'comment' });
    const saved = JSON.parse(api.getCalls()[0][0][3].notes);
    assert.lengthOf(saved.history, 1); assert.equal(saved.history[0].user, 'Alice');
  });

  it('syncs content with newValue', async function () {
    await m.addHistoryEntry({ id: 1, notes: '{"content":"old","history":[]}', statut: 'X' }, { user: 'A', newValue: 'new' });
    assert.equal(JSON.parse(api.getCalls()[0][0][3].notes).content, 'new');
  });

  it('does not update content for empty newValue', async function () {
    await m.addHistoryEntry({ id: 1, notes: '{"content":"keep","history":[]}', statut: 'X' }, { user: 'A', newValue: '' });
    assert.equal(JSON.parse(api.getCalls()[0][0][3].notes).content, 'keep');
  });

  it('limits history to 50', async function () {
    const h = Array.from({ length: 55 }, () => ({ timestamp: '2025-01-01', action: 'x', user: 'sys' }));
    await m.addHistoryEntry({ id: 1, notes: JSON.stringify({ content: '', history: h }), statut: 'X' }, { user: 'New', action: 'add' });
    const saved = JSON.parse(api.getCalls()[0][0][3].notes);
    assert.equal(saved.history.length, 50); assert.equal(saved.history[49].user, 'New');
  });

  it('includes oldValue/newValue', async function () {
    await m.addHistoryEntry({ id: 1, notes: '{"content":"","history":[]}', statut: 'X' }, { user: 'A', oldValue: 'Backlog', newValue: 'En cours' });
    const e = JSON.parse(api.getCalls()[0][0][3].notes).history[0];
    assert.equal(e.oldValue, 'Backlog'); assert.equal(e.newValue, 'En cours');
  });

  it('defaults user to System', async function () {
    await m.addHistoryEntry({ id: 1, notes: '{"content":"","history":[]}', statut: 'X' }, {});
    assert.equal(JSON.parse(api.getCalls()[0][0][3].notes).history[0].user, 'System');
  });
});
