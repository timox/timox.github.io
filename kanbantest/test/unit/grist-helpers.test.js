// === test/unit/grist-helpers.test.js ===
// Tests for js/utils/grist-helpers.js

// ---- Inline copies of functions under test ----

function extractGristRefId(value) {
  if (value === null || value === undefined) { return null; }
  if (Array.isArray(value) && value.length >= 2 && value[0] === 'L') { return value[1]; }
  if (typeof value === 'number') { return value; }
  if (typeof value === 'string' && /^\d+$/.test(value)) { return parseInt(value, 10); }
  return null;
}

function extractGristRefIds(value) {
  if (value === null || value === undefined) { return []; }
  if (Array.isArray(value) && value.length >= 1 && value[0] === 'L') { return value.slice(1).filter(id => typeof id === 'number'); }
  if (typeof value === 'number') { return [value]; }
  if (typeof value === 'string' && /^\d+$/.test(value)) { return [parseInt(value, 10)]; }
  return [];
}

function toGristString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value[0] === 'L') return value.slice(1).join(', ');
    return value.join(', ');
  }
  if (typeof value === 'object') {
    if (value.displayValue) return String(value.displayValue);
    return '';
  }
  return String(value);
}

function toGristList(values) {
  if (!Array.isArray(values) || values.length === 0) return ['L'];
  return ['L', ...values];
}

function isGristListEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) && value[0] === 'L') return value.length <= 1;
  return false;
}

// ---- Tests ----

TestFramework.describe('extractGristRefId', () => {
  it('should return null for null input', () => {
    assert.isNull(extractGristRefId(null));
  });

  it('should return null for undefined input', () => {
    assert.isNull(extractGristRefId(undefined));
  });

  it('should return the number directly for a numeric value', () => {
    assert.equal(extractGristRefId(42), 42);
  });

  it('should return 0 for numeric zero', () => {
    assert.equal(extractGristRefId(0), 0);
  });

  it('should parse a numeric string to an integer', () => {
    assert.equal(extractGristRefId('123'), 123);
  });

  it('should return null for a non-numeric string', () => {
    assert.isNull(extractGristRefId('hello'));
  });

  it('should return null for a string with spaces around digits', () => {
    assert.isNull(extractGristRefId(' 42 '));
  });

  it('should return the first ID from a ReferenceList ["L", id]', () => {
    assert.equal(extractGristRefId(['L', 7]), 7);
  });

  it('should return only the first ID from ["L", id1, id2]', () => {
    assert.equal(extractGristRefId(['L', 10, 20]), 10);
  });

  it('should return null for an empty Grist list ["L"]', () => {
    assert.isNull(extractGristRefId(['L']));
  });

  it('should return null for an object', () => {
    assert.isNull(extractGristRefId({ id: 1 }));
  });

  it('should return null for a boolean', () => {
    assert.isNull(extractGristRefId(true));
  });

  it('should return null for an array without the L prefix', () => {
    assert.isNull(extractGristRefId([1, 2, 3]));
  });

  it('should return null for an empty string', () => {
    assert.isNull(extractGristRefId(''));
  });
});

TestFramework.describe('extractGristRefIds', () => {
  it('should return empty array for null', () => {
    assert.deepEqual(extractGristRefIds(null), []);
  });

  it('should return empty array for undefined', () => {
    assert.deepEqual(extractGristRefIds(undefined), []);
  });

  it('should wrap a single number in an array', () => {
    assert.deepEqual(extractGristRefIds(42), [42]);
  });

  it('should parse a numeric string and wrap in array', () => {
    assert.deepEqual(extractGristRefIds('99'), [99]);
  });

  it('should return empty array for a non-numeric string', () => {
    assert.deepEqual(extractGristRefIds('abc'), []);
  });

  it('should extract all IDs from a Grist ReferenceList', () => {
    assert.deepEqual(extractGristRefIds(['L', 1, 2, 3]), [1, 2, 3]);
  });

  it('should return empty array for ["L"] with no IDs', () => {
    assert.deepEqual(extractGristRefIds(['L']), []);
  });

  it('should filter out non-number values from mixed array', () => {
    assert.deepEqual(extractGristRefIds(['L', 1, 'foo', 2, null, 3]), [1, 2, 3]);
  });

  it('should return empty array for a boolean', () => {
    assert.deepEqual(extractGristRefIds(true), []);
  });

  it('should return empty array for an object', () => {
    assert.deepEqual(extractGristRefIds({ id: 5 }), []);
  });

  it('should return empty array for array without L prefix', () => {
    assert.deepEqual(extractGristRefIds([1, 2, 3]), []);
  });
});

TestFramework.describe('toGristString', () => {
  it('should return empty string for null', () => {
    assert.equal(toGristString(null), '');
  });

  it('should return empty string for undefined', () => {
    assert.equal(toGristString(undefined), '');
  });

  it('should return the string as-is for a string value', () => {
    assert.equal(toGristString('hello'), 'hello');
  });

  it('should return empty string for empty string input', () => {
    assert.equal(toGristString(''), '');
  });

  it('should convert a number to its string representation', () => {
    assert.equal(toGristString(42), '42');
  });

  it('should join a ChoiceList ["L", "a", "b"] without the L prefix', () => {
    assert.equal(toGristString(['L', 'a', 'b']), 'a, b');
  });

  it('should return empty string for ["L"] with no items', () => {
    assert.equal(toGristString(['L']), '');
  });

  it('should join a regular array without L prefix', () => {
    assert.equal(toGristString(['x', 'y', 'z']), 'x, y, z');
  });

  it('should return displayValue from an object that has it', () => {
    assert.equal(toGristString({ displayValue: 'Bureau A' }), 'Bureau A');
  });

  it('should return empty string from an object without displayValue', () => {
    assert.equal(toGristString({ id: 1, name: 'test' }), '');
  });

  it('should convert a boolean to its string representation', () => {
    assert.equal(toGristString(true), 'true');
  });

  it('should handle a number displayValue in object', () => {
    assert.equal(toGristString({ displayValue: 123 }), '123');
  });
});

TestFramework.describe('toGristList', () => {
  it('should return ["L"] for an empty array', () => {
    assert.deepEqual(toGristList([]), ['L']);
  });

  it('should return ["L"] for null (non-array)', () => {
    assert.deepEqual(toGristList(null), ['L']);
  });

  it('should return ["L"] for undefined (non-array)', () => {
    assert.deepEqual(toGristList(undefined), ['L']);
  });

  it('should return ["L"] for a string (non-array)', () => {
    assert.deepEqual(toGristList('hello'), ['L']);
  });

  it('should prepend "L" to an array of values', () => {
    assert.deepEqual(toGristList([1, 2, 3]), ['L', 1, 2, 3]);
  });

  it('should prepend "L" to an array of strings', () => {
    assert.deepEqual(toGristList(['a', 'b']), ['L', 'a', 'b']);
  });
});

TestFramework.describe('isGristListEmpty', () => {
  it('should return true for null', () => {
    assert.isTrue(isGristListEmpty(null));
  });

  it('should return true for undefined', () => {
    assert.isTrue(isGristListEmpty(undefined));
  });

  it('should return true for ["L"] (empty Grist list)', () => {
    assert.isTrue(isGristListEmpty(['L']));
  });

  it('should return false for ["L", 1] (non-empty Grist list)', () => {
    assert.isFalse(isGristListEmpty(['L', 1]));
  });

  it('should return false for ["L", "a", "b"] (multiple items)', () => {
    assert.isFalse(isGristListEmpty(['L', 'a', 'b']));
  });

  it('should return false for a non-array value (number)', () => {
    assert.isFalse(isGristListEmpty(42));
  });

  it('should return false for a non-array value (string)', () => {
    assert.isFalse(isGristListEmpty('hello'));
  });

  it('should return false for a regular array without L prefix', () => {
    assert.isFalse(isGristListEmpty([1, 2, 3]));
  });
});
