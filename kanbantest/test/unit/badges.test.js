// === test/unit/badges.test.js ===
// Tests for js/utils/badges.js

const BUREAU_ICONS = {
  'exploit': 'bi-gear-wide-connected', 'reseau': 'bi-diagram-3', 'bdd': 'bi-database',
  'chef': 'bi-person-badge-fill', 'ssir': 'bi-person-badge-fill', 'sig': 'bi-map',
  'nexsis': 'bi-broadcast-pin', 'rrf': 'bi-broadcast-pin', 'default': 'bi-building'
};

function normalizeBureauName(bureau) {
  return bureau.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^chef-/, '');
}
function getBureauIcon(bureau) {
  const bl = bureau.toLowerCase();
  for (const [kw, icon] of Object.entries(BUREAU_ICONS)) { if (kw !== 'default' && bl.includes(kw)) return icon; }
  return BUREAU_ICONS.default;
}
function generateSingleBureauBadge(bureau) {
  const n = normalizeBureauName(bureau), icon = getBureauIcon(bureau);
  return '<span class="bureau-badge bureau-' + n + '" title="Bureau lead: ' + bureau + '"><i class="' + icon + '"></i> ' + bureau + '</span>';
}
function generateBureauBadges(bureauList, isCompact) {
  if (!Array.isArray(bureauList) || bureauList.length <= 1) return '';
  const bureaux = bureauList.filter(i => i !== 'L' && Boolean(i));
  if (bureaux.length === 0) return '';
  if (isCompact && bureaux.length > 2)
    return '<div class="bureau-badges compact">' + generateSingleBureauBadge(bureaux[0]) + '<span class="badge badge-secondary">+' + (bureaux.length - 1) + '</span></div>';
  const cls = bureaux.length > 1 ? 'bureau-badges multiple-bureaux' : 'bureau-badges';
  return '<div class="' + cls + '">' + bureaux.map(b => generateSingleBureauBadge(b)).join('') + '</div>';
}
function generatePriorityBadge(p) {
  if (!p || p < 1 || p > 4) p = 3;
  return '<span class="priority-badge priority-' + p + '">P' + p + '</span>';
}
function generateProjectBadge(d) {
  if (!d.projet) return '';
  return '<span class="badge bg-info text-dark" title="' + d.projet.replace(/"/g, '&quot;') + '">' + d.projet + '</span>';
}
function generateResponsableBadge(r) { return r ? '<span class="personne-badge">' + r + '</span>' : ''; }
function generateResponsablesBadges(list) {
  if (!Array.isArray(list) || list.length <= 1) return '';
  const rs = list.filter(i => i !== 'L' && Boolean(i));
  return rs.length ? '<div class="personnes-list">' + rs.map(r => generateResponsableBadge(r)).join(' ') + '</div>' : '';
}
function generateHistoryBadge(count, taskId) {
  return (!count || count <= 1) ? '' : '<button class="btn-history btn-timeline" title="Voir l\'historique" data-task-id="' + taskId + '"><i class="bi bi-clock-history"></i></button>';
}
function generateUrgenceImpactBadge(u, i) {
  if (!u && !i) return '';
  let cls = 'badge bg-secondary';
  if (u === 'Imm\u00e9diate' || i === 'Critique') cls = 'badge bg-danger';
  else if (u === 'Courte' || i === 'Important') cls = 'badge bg-warning';
  else if (u === 'Moyenne' || i === 'Mod\u00e9r\u00e9') cls = 'badge bg-info';
  const txt = (u && i) ? u + ' / ' + i : (u || i);
  return '<span class="' + cls + '">' + txt + '</span>';
}
function isValidBureau(b, list) { return list.includes(b); }
function validateBureauList(bl, avail) {
  if (!Array.isArray(bl) || bl.length <= 1) return [];
  return bl.filter(i => i !== 'L' && Boolean(i)).filter(b => isValidBureau(b, avail));
}
function generateCustomBadge(text, color, icon) {
  color = color || 'secondary';
  const ic = icon ? '<i class="' + icon + ' me-1"></i>' : '';
  return '<span class="badge bg-' + color + '">' + ic + text + '</span>';
}
function generateCountBadge(count, label) { return '<span class="board-count">' + count + (label ? ' ' + label : '') + '</span>'; }

// =================================================================
describe('badges.js -- normalizeBureauName', function () {
  it('should lowercase and hyphenate', function () { assert.equal(normalizeBureauName('Bureau Exploit'), 'bureau-exploit'); });
  it('should remove accented chars', function () { assert.equal(normalizeBureauName('R\u00e9seaux'), 'rseaux'); });
  it('should strip Chef- prefix', function () { assert.equal(normalizeBureauName('Chef SSIR'), 'ssir'); });
});

describe('badges.js -- getBureauIcon', function () {
  it('should return exploit icon', function () { assert.equal(getBureauIcon('Exploit'), 'bi-gear-wide-connected'); });
  it('should return database icon for BDD', function () { assert.equal(getBureauIcon('BDD'), 'bi-database'); });
  it('should return default for unknown', function () { assert.equal(getBureauIcon('Unknown'), 'bi-building'); });
  it('should be case-insensitive', function () { assert.equal(getBureauIcon('EXPLOIT'), 'bi-gear-wide-connected'); });
});

describe('badges.js -- generateBureauBadges', function () {
  it('should return empty for non-array', function () { assert.equal(generateBureauBadges(null), ''); });
  it('should return empty for [L] only', function () { assert.equal(generateBureauBadges(['L']), ''); });
  it('should generate for Grist list', function () { const r = generateBureauBadges(['L', 'Exploit', 'BDD']); assert.includes(r, 'Exploit'); assert.includes(r, 'BDD'); });
  it('should use multiple-bureaux class', function () { assert.includes(generateBureauBadges(['L', 'A', 'B']), 'multiple-bureaux'); });
  it('should show +N in compact mode', function () { const r = generateBureauBadges(['L', 'A', 'B', 'C'], true); assert.includes(r, '+2'); });
});

describe('badges.js -- generatePriorityBadge', function () {
  it('should generate P1', function () { assert.includes(generatePriorityBadge(1), 'P1'); assert.includes(generatePriorityBadge(1), 'priority-1'); });
  it('should generate P4', function () { assert.includes(generatePriorityBadge(4), 'P4'); });
  it('should default to P3 for null', function () { assert.includes(generatePriorityBadge(null), 'P3'); });
  it('should default to P3 for out of range', function () { assert.includes(generatePriorityBadge(0), 'P3'); assert.includes(generatePriorityBadge(5), 'P3'); });
});

describe('badges.js -- generateProjectBadge', function () {
  it('should return empty for missing project', function () { assert.equal(generateProjectBadge({}), ''); });
  it('should include project name', function () { assert.includes(generateProjectBadge({ projet: 'Mon' }), 'Mon'); });
  it('should escape quotes', function () { assert.includes(generateProjectBadge({ projet: '"Test"' }), '&quot;'); });
});

describe('badges.js -- generateResponsablesBadges', function () {
  it('should return empty for non-array', function () { assert.equal(generateResponsablesBadges(null), ''); });
  it('should return empty for [L]', function () { assert.equal(generateResponsablesBadges(['L']), ''); });
  it('should generate badges', function () { const r = generateResponsablesBadges(['L', 'Alex', 'Paul']); assert.includes(r, 'Alex'); assert.includes(r, 'Paul'); });
});

describe('badges.js -- generateHistoryBadge', function () {
  it('should return empty for 0', function () { assert.equal(generateHistoryBadge(0, 1), ''); });
  it('should return empty for 1', function () { assert.equal(generateHistoryBadge(1, 1), ''); });
  it('should return button for >1', function () { assert.includes(generateHistoryBadge(5, 42), 'data-task-id="42"'); });
});

describe('badges.js -- generateUrgenceImpactBadge', function () {
  it('should return empty for both null', function () { assert.equal(generateUrgenceImpactBadge(null, null), ''); });
  it('should use bg-danger for Critique', function () { assert.includes(generateUrgenceImpactBadge(null, 'Critique'), 'bg-danger'); });
  it('should use bg-warning for Important', function () { assert.includes(generateUrgenceImpactBadge(null, 'Important'), 'bg-warning'); });
  it('should combine urgence and impact', function () { assert.includes(generateUrgenceImpactBadge('Courte', 'Important'), 'Courte / Important'); });
});

describe('badges.js -- validateBureauList', function () {
  it('should return empty for non-array', function () { assert.deepEqual(validateBureauList(null, []), []); });
  it('should filter invalid', function () { assert.deepEqual(validateBureauList(['L', 'Exploit', 'Bad', 'BDD'], ['Exploit', 'BDD']), ['Exploit', 'BDD']); });
});

describe('badges.js -- generateCustomBadge / generateCountBadge', function () {
  it('custom badge with color', function () { assert.includes(generateCustomBadge('Test', 'primary'), 'bg-primary'); });
  it('custom badge with icon', function () { assert.includes(generateCustomBadge('Test', 'primary', 'bi-star'), 'bi-star'); });
  it('count badge with label', function () { assert.includes(generateCountBadge(5, 'items'), '5 items'); });
  it('count badge without label', function () { assert.includes(generateCountBadge(3), '3'); });
});
