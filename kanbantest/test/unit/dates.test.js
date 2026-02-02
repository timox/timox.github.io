// === test/unit/dates.test.js ===
// Tests for js/utils/dates.js

// ---- Inline dependencies from constants.js ----
const TIME_THRESHOLDS = { URGENT_DAYS: 3, SOON_DAYS: 7 };
const CSS_CLASSES = {
  ECHEANCES: {
    OK: 'echeance-ok',
    BIENTOT: 'echeance-bientot',
    URGENT: 'echeance-urgent',
    AUJOURD_HUI: 'echeance-aujourd-hui',
    DEPASSEE: 'echeance-depassee'
  }
};

// ---- Inline copies of functions under test ----

function normalizeDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    if (!isNaN(dateValue.getTime())) return dateValue.toISOString().slice(0, 10);
    return null;
  }
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) return dateValue;
  if (typeof dateValue === 'number' || (typeof dateValue === 'string' && !isNaN(dateValue))) {
    const timestamp = typeof dateValue === 'string' ? parseFloat(dateValue) : dateValue;
    let date;
    if (timestamp > 1000000000000) date = new Date(timestamp);
    else if (timestamp > 1000000000) date = new Date(timestamp * 1000);
    else date = new Date((timestamp - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  if (typeof dateValue === 'string') {
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    } catch (e) {}
  }
  return null;
}

function formatDate(dateValue, options = {}) {
  const normalizedDate = normalizeDate(dateValue);
  if (!normalizedDate) return '';
  try {
    const defaultOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    const formatOptions = { ...defaultOptions, ...options };
    return new Date(normalizedDate).toLocaleDateString('fr-FR', formatOptions);
  } catch (e) {
    return normalizedDate;
  }
}

function prepareDateForGrist(dateString) {
  if (!dateString || dateString.trim() === '') return null;
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  } catch (e) {}
  return null;
}

function getDaysFromToday(dateValue) {
  const normalizedDate = normalizeDate(dateValue);
  if (!normalizedDate) return 0;
  const targetDate = new Date(normalizedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getEcheanceClass(dateValue) {
  const daysFromToday = getDaysFromToday(dateValue);
  if (daysFromToday < 0) return CSS_CLASSES.ECHEANCES.DEPASSEE;
  else if (daysFromToday === 0) return CSS_CLASSES.ECHEANCES.AUJOURD_HUI;
  else if (daysFromToday <= TIME_THRESHOLDS.URGENT_DAYS) return CSS_CLASSES.ECHEANCES.URGENT;
  else if (daysFromToday <= TIME_THRESHOLDS.SOON_DAYS) return CSS_CLASSES.ECHEANCES.BIENTOT;
  else return CSS_CLASSES.ECHEANCES.OK;
}

function getEcheanceText(dateValue, compact = false) {
  const daysFromToday = getDaysFromToday(dateValue);
  if (daysFromToday < 0) {
    return compact ? 'J' + daysFromToday : 'D\u00e9pass\u00e9 de ' + Math.abs(daysFromToday) + ' jour' + (Math.abs(daysFromToday) > 1 ? 's' : '');
  } else if (daysFromToday === 0) {
    return compact ? 'Auj.' : "Aujourd'hui";
  } else if (daysFromToday <= TIME_THRESHOLDS.URGENT_DAYS) {
    return compact ? 'J+' + daysFromToday : daysFromToday + 'j restant' + (daysFromToday > 1 ? 's' : '');
  } else if (daysFromToday <= TIME_THRESHOLDS.SOON_DAYS) {
    return compact ? 'J+' + daysFromToday : daysFromToday + 'j restant' + (daysFromToday > 1 ? 's' : '');
  } else {
    return compact ? 'J+' + daysFromToday : 'J+' + daysFromToday;
  }
}

function isFutureDate(dateValue) { return getDaysFromToday(dateValue) >= 0; }
function isToday(dateValue) { return getDaysFromToday(dateValue) === 0; }

function generateTimestamp(date = new Date(), userName = null) {
  const timestamp = date.toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const userSuffix = userName ? ' (' + userName + ')' : '';
  return '(' + timestamp + userSuffix + ')';
}

function parseTimestamp(timestampString) {
  const match = timestampString.match(/\((\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
  if (!match) return null;
  const [datePart, timePart] = match[1].split(' ');
  const [day, month, year] = datePart.split('/');
  try { return new Date(year + '-' + month + '-' + day + 'T' + timePart + ':00'); } catch (e) { return null; }
}

function calculateDurationMinutes(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

function formatDuration(minutes) {
  if (!minutes || minutes === 0) return 'En cours...';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return remainingMinutes + 'm';
  else if (remainingMinutes === 0) return hours + 'h';
  else return hours + 'h ' + remainingMinutes + 'm';
}

// ---- Helper ----
function daysFromNow(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  // Use local date components to avoid UTC shift in positive-offset timezones
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

// =================================================================
// TESTS
// =================================================================

describe('dates.js -- normalizeDate', function () {
  it('should return null for null input', function () { assert.isNull(normalizeDate(null)); });
  it('should return null for undefined input', function () { assert.isNull(normalizeDate(undefined)); });
  it('should return null for empty string', function () { assert.isNull(normalizeDate('')); });
  it('should return null for zero', function () { assert.isNull(normalizeDate(0)); });
  it('should pass through YYYY-MM-DD strings unchanged', function () { assert.equal(normalizeDate('2025-06-15'), '2025-06-15'); });
  it('should normalize a valid Date object', function () { assert.equal(normalizeDate(new Date('2025-03-20T12:00:00Z')), '2025-03-20'); });
  it('should return null for an invalid Date object', function () { assert.isNull(normalizeDate(new Date('invalid'))); });
  it('should handle millisecond timestamps', function () { assert.equal(normalizeDate(1735689600000), '2025-01-01'); });
  it('should handle second timestamps', function () { assert.equal(normalizeDate(1735689600), '2025-01-01'); });
  it('should handle Excel timestamps', function () { const r = normalizeDate(44927); assert.ok(r); assert.match(r, /^\d{4}-\d{2}-\d{2}$/); });
  it('should handle numeric strings', function () { assert.equal(normalizeDate('1735689600000'), '2025-01-01'); });
  it('should handle parseable date strings', function () { var expected = new Date('March 20, 2025').toISOString().slice(0, 10); assert.equal(normalizeDate('March 20, 2025'), expected); });
  it('should return null for unparseable strings', function () { assert.isNull(normalizeDate('not-a-date-at-all')); });
});

describe('dates.js -- formatDate', function () {
  it('should return empty string for null input', function () { assert.equal(formatDate(null), ''); });
  it('should return a French-formatted date', function () { const r = formatDate('2025-06-15'); assert.ok(r.length > 0); assert.includes(r, '2025'); });
  it('should accept custom formatting options', function () { const r = formatDate('2025-06-15', { weekday: undefined, year: undefined }); assert.ok(r.length > 0); });
});

describe('dates.js -- prepareDateForGrist', function () {
  it('should return null for null input', function () { assert.isNull(prepareDateForGrist(null)); });
  it('should return null for empty string', function () { assert.isNull(prepareDateForGrist('')); });
  it('should return null for whitespace', function () { assert.isNull(prepareDateForGrist('   ')); });
  it('should pass through YYYY-MM-DD', function () { assert.equal(prepareDateForGrist('2025-06-15'), '2025-06-15'); });
  it('should parse valid date strings', function () { var expected = new Date('June 15, 2025').toISOString().slice(0, 10); assert.equal(prepareDateForGrist('June 15, 2025'), expected); });
  it('should return null for invalid strings', function () { assert.isNull(prepareDateForGrist('not-a-date')); });
});

describe('dates.js -- getDaysFromToday', function () {
  it('should return 0 for null', function () { assert.equal(getDaysFromToday(null), 0); });
  it('should return 0 for today', function () { assert.equal(getDaysFromToday(new Date().toISOString().slice(0, 10)), 0); });
  it('should return negative for past', function () { assert.equal(getDaysFromToday(daysFromNow(-1)), -1); });
  it('should return positive for future', function () { assert.equal(getDaysFromToday(daysFromNow(1)), 1); });
  it('should handle 10 days in future', function () { assert.equal(getDaysFromToday(daysFromNow(10)), 10); });
});

describe('dates.js -- getEcheanceClass', function () {
  it('should return DEPASSEE for past', function () { assert.equal(getEcheanceClass(daysFromNow(-5)), 'echeance-depassee'); });
  it('should return AUJOURD_HUI for today', function () { assert.equal(getEcheanceClass(daysFromNow(0)), 'echeance-aujourd-hui'); });
  it('should return URGENT for 1-3 days', function () { assert.equal(getEcheanceClass(daysFromNow(2)), 'echeance-urgent'); });
  it('should return BIENTOT for 4-7 days', function () { assert.equal(getEcheanceClass(daysFromNow(5)), 'echeance-bientot'); });
  it('should return OK for 8+ days', function () { assert.equal(getEcheanceClass(daysFromNow(10)), 'echeance-ok'); });
});

describe('dates.js -- getEcheanceText', function () {
  it('should show "Aujourd\'hui" for today', function () { assert.equal(getEcheanceText(daysFromNow(0), false), "Aujourd'hui"); });
  it('should show "Auj." for today compact', function () { assert.equal(getEcheanceText(daysFromNow(0), true), 'Auj.'); });
  it('should show days remaining for urgent', function () { assert.includes(getEcheanceText(daysFromNow(2), false), '2j restant'); });
  it('should show J+N compact', function () { assert.equal(getEcheanceText(daysFromNow(2), true), 'J+2'); });
  it('should show singular for 1 day', function () { const t = getEcheanceText(daysFromNow(1), false); assert.includes(t, '1j restant'); });
  it('should show overdue for past', function () { assert.includes(getEcheanceText(daysFromNow(-3), false), '3 jour'); });
  it('should show J-N compact for past', function () { assert.equal(getEcheanceText(daysFromNow(-3), true), 'J-3'); });
});

describe('dates.js -- isFutureDate / isToday', function () {
  it('isFutureDate true for tomorrow', function () { assert.isTrue(isFutureDate(daysFromNow(1))); });
  it('isFutureDate true for today', function () { assert.isTrue(isFutureDate(daysFromNow(0))); });
  it('isFutureDate false for yesterday', function () { assert.isFalse(isFutureDate(daysFromNow(-1))); });
  it('isToday true for today', function () { assert.isTrue(isToday(daysFromNow(0))); });
  it('isToday false for tomorrow', function () { assert.isFalse(isToday(daysFromNow(1))); });
  it('isToday false for yesterday', function () { assert.isFalse(isToday(daysFromNow(-1))); });
});

describe('dates.js -- generateTimestamp', function () {
  it('should wrap in parentheses', function () { const ts = generateTimestamp(new Date()); assert.ok(ts.startsWith('(')); assert.ok(ts.endsWith(')')); });
  it('should include username', function () { assert.includes(generateTimestamp(new Date(), 'Alice'), '(Alice)'); });
  it('should not include username when null', function () { const ts = generateTimestamp(new Date(), null); const inner = ts.slice(1, -1); assert.isFalse(inner.includes('(')); });
});

describe('dates.js -- parseTimestamp', function () {
  it('should parse valid French timestamp', function () { const r = parseTimestamp('(15/06/2025 10:30)'); assert.isNotNull(r); assert.equal(r.getFullYear(), 2025); });
  it('should parse with username suffix', function () { const r = parseTimestamp('(15/06/2025 10:30 (Alice))'); assert.isNotNull(r); });
  it('should return null for invalid', function () { assert.isNull(parseTimestamp('no timestamp here')); });
  it('should return null for empty', function () { assert.isNull(parseTimestamp('')); });
});

describe('dates.js -- calculateDurationMinutes', function () {
  it('should calculate 60 min for 1 hour', function () { assert.equal(calculateDurationMinutes('2025-01-01T10:00:00', '2025-01-01T11:00:00'), 60); });
  it('should calculate 90 min for 1.5 hours', function () { assert.equal(calculateDurationMinutes('2025-01-01T10:00:00', '2025-01-01T11:30:00'), 90); });
  it('should return 0 for invalid start', function () { assert.equal(calculateDurationMinutes('invalid', '2025-01-01T10:00:00'), 0); });
  it('should return 0 for invalid end', function () { assert.equal(calculateDurationMinutes('2025-01-01T10:00:00', 'invalid'), 0); });
  it('should return negative for reversed', function () { assert.lessThan(calculateDurationMinutes('2025-01-01T11:00:00', '2025-01-01T10:00:00'), 0); });
});

describe('dates.js -- formatDuration', function () {
  it('should return "En cours..." for 0', function () { assert.equal(formatDuration(0), 'En cours...'); });
  it('should return "En cours..." for null', function () { assert.equal(formatDuration(null), 'En cours...'); });
  it('should return minutes only under 60', function () { assert.equal(formatDuration(45), '45m'); });
  it('should return hours only when exact', function () { assert.equal(formatDuration(120), '2h'); });
  it('should return hours and minutes', function () { assert.equal(formatDuration(150), '2h 30m'); });
  it('should return 1m for 1 minute', function () { assert.equal(formatDuration(1), '1m'); });
});
