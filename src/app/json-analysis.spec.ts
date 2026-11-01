import {
  analyzeJson,
  compareJsonValues,
  formatBytes,
  getJsonType,
  isArrayOfObjects,
  matchesSearch,
} from './json-analysis';

describe('getJsonType', () => {
  it('distinguishes null, arrays, and primitives', () => {
    expect(getJsonType(null)).toBe('null');
    expect(getJsonType([])).toBe('array');
    expect(getJsonType({})).toBe('object');
    expect(getJsonType('x')).toBe('string');
    expect(getJsonType(1)).toBe('number');
    expect(getJsonType(true)).toBe('boolean');
  });
});

describe('analyzeJson', () => {
  it('returns null for null and undefined', () => {
    expect(analyzeJson(null)).toBeNull();
    expect(analyzeJson(undefined)).toBeNull();
  });

  it('summarises an object', () => {
    const analysis = analyzeJson({ name: 'a', age: 3, tags: ['x', 'y'], nested: { ok: true } });
    expect(analysis?.topLevelType).toBe('object');
    expect(analysis?.itemCount).toBeUndefined();
    // name, age, tags, nested, tags[0], tags[1], nested.ok
    expect(analysis?.totalKeys).toBe(7);
    expect(analysis?.maxDepth).toBe(2);
    expect(analysis?.dataTypes['string']).toBe(3);
    expect(analysis?.dataTypes['number']).toBe(1);
    expect(analysis?.dataTypes['boolean']).toBe(1);
  });

  it('counts array items and depth', () => {
    const analysis = analyzeJson([{ a: 1 }, { a: 2, b: 3 }]);
    expect(analysis?.topLevelType).toBe('array');
    expect(analysis?.itemCount).toBe(2);
    expect(analysis?.totalKeys).toBe(5);
    expect(analysis?.maxDepth).toBe(2);
  });

  it('handles an empty object', () => {
    const analysis = analyzeJson({});
    expect(analysis?.totalKeys).toBe(0);
    expect(analysis?.maxDepth).toBe(1);
    expect(analysis?.dataTypes).toEqual({});
  });
});

describe('matchesSearch', () => {
  it('matches keys, values, and nested values case-insensitively', () => {
    expect(matchesSearch({ Name: 'Alice' }, null, 'alice')).toBe(true);
    expect(matchesSearch({ Name: 'Alice' }, null, 'NAME')).toBe(true);
    expect(matchesSearch({ nested: { city: 'Paris' } }, null, 'paris')).toBe(true);
    expect(matchesSearch(42, 'count', 'count')).toBe(true);
    expect(matchesSearch({ a: 1 }, null, 'zzz')).toBe(false);
    expect(matchesSearch({ a: 1 }, null, '')).toBe(true);
  });
});

describe('compareJsonValues', () => {
  it('sorts numbers numerically, not lexicographically', () => {
    expect(compareJsonValues(2, 10, 'asc')).toBeLessThan(0);
    expect(compareJsonValues(10, 2, 'asc')).toBeGreaterThan(0);
    expect(compareJsonValues(10, 2, 'desc')).toBeLessThan(0);
  });

  it('sorts strings with localeCompare and reverses with direction', () => {
    expect(compareJsonValues('a', 'b', 'asc')).toBeLessThan(0);
    expect(compareJsonValues('a', 'b', 'desc')).toBeGreaterThan(0);
  });

  it('sorts null and undefined last in both directions', () => {
    expect(compareJsonValues(null, 1, 'asc')).toBeGreaterThan(0);
    expect(compareJsonValues(null, 1, 'desc')).toBeGreaterThan(0);
    expect(compareJsonValues(1, undefined, 'asc')).toBeLessThan(0);
    expect(compareJsonValues(null, null, 'asc')).toBe(0);
  });
});

describe('isArrayOfObjects', () => {
  it('accepts non-empty arrays of objects and rejects the rest', () => {
    expect(isArrayOfObjects([{ a: 1 }])).toBe(true);
    expect(isArrayOfObjects([])).toBe(false);
    expect(isArrayOfObjects([1, 2])).toBe(false);
    expect(isArrayOfObjects([null])).toBe(false);
    expect(isArrayOfObjects({ a: 1 })).toBe(false);
    expect(isArrayOfObjects(null)).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formats B, KB, MB, and GB', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });
});

describe('compareJsonValues mixed types', () => {
  it('sorts by rank before value: booleans, then numbers, then strings', () => {
    expect(compareJsonValues(true, 1, 'asc')).toBeLessThan(0);
    expect(compareJsonValues(1, 'a', 'asc')).toBeLessThan(0);
    expect(compareJsonValues('a', {}, 'asc')).toBeLessThan(0);
  });
});
