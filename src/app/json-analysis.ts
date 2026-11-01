/** Pure JSON helpers shared by the components. Kept free of Angular APIs so they
 *  can be unit-tested in isolation and reused without a component fixture. */

export interface Analysis {
  /**
   * Keys counted while walking the value, including array indices: an array
   * contributes one "key" per element. The root value itself is not counted,
   * so a top-level primitive reports 0.
   */
  totalKeys: number;
  /**
   * Nesting depth of the value. Objects and arrays add one level; a
   * top-level primitive is depth 0 and an empty object/array is depth 1.
   */
  maxDepth: number;
  /**
   * How many values of each type were found below the root. The root value
   * itself is not counted, so a top-level primitive reports an empty map.
   */
  dataTypes: Record<string, number>;
  topLevelType: string;
  /** Present only when the top-level value is an array: its element count. */
  itemCount?: number;
}

/** The `typeof` result, with `null` and arrays distinguished from objects. */
export function getJsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** Summarise a parsed JSON value. Returns null for null/undefined input. */
export function analyzeJson(data: unknown): Analysis | null {
  if (data === null || data === undefined) {
    return null;
  }

  let keyCount = 0;
  const typeCounts: Record<string, number> = {};

  const getMaxDepth = (obj: unknown): number => {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }
    let depth = 0;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        depth = Math.max(depth, getMaxDepth((obj as Record<string, unknown>)[key]));
      }
    }
    return depth + 1;
  };

  const traverse = (obj: unknown): void => {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keyCount++;
        const value = (obj as Record<string, unknown>)[key];
        const type = getJsonType(value);
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        if (typeof value === 'object' && value !== null) {
          traverse(value);
        }
      }
    }
  };

  traverse(data);

  return {
    totalKeys: keyCount,
    maxDepth: getMaxDepth(data),
    dataTypes: typeCounts,
    topLevelType: getJsonType(data),
    itemCount: Array.isArray(data) ? data.length : undefined,
  };
}

/** True when a key or any value in the subtree contains the query (case-insensitive). */
export function matchesSearch(value: unknown, key: string | null, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  if (key !== null && key.toLowerCase().includes(q)) {
    return true;
  }
  if (typeof value === 'object' && value !== null) {
    for (const childKey in value) {
      if (Object.prototype.hasOwnProperty.call(value, childKey)) {
        if (matchesSearch((value as Record<string, unknown>)[childKey], childKey, q)) {
          return true;
        }
      }
    }
    return false;
  }
  return String(value).toLowerCase().includes(q);
}

/**
 * True when the value is a non-empty array whose first element is an object.
 * Only the first element is inspected on purpose: the table view builds its
 * headers as the union of all rows' keys, so a mixed array still renders,
 * with non-object rows showing "—" for every column. An empty array is not
 * a table, so it returns false and the Analysis view stays selected.
 */
export function isArrayOfObjects(value: unknown): boolean {
  return (
    Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null
  );
}

/**
 * Sort rank for table columns. The order is arbitrary but deliberate: it
 * keeps every column's values in one predictable order instead of falling
 * back to string comparison, which would sort 10 before 2. Null and
 * undefined share the highest rank so compareJsonValues can pin them last
 * in both directions, rather than letting a descending sort drag them first.
 */
function compareRank(value: unknown): number {
  if (value === undefined || value === null) return 4;
  if (typeof value === 'boolean') return 0;
  if (typeof value === 'number') return 1;
  if (typeof value === 'string') return 2;
  return 3;
}

/**
 * Compare two JSON values for table sorting. Null/undefined always sort last,
 * regardless of direction. Numbers compare numerically, strings with
 * localeCompare, booleans false before true, and objects/arrays by their
 * JSON text. Mixed-type columns sort by rank (boolean, number, string,
 * object/array) before any of those rules apply. Never mutates its inputs.
 * Note: string ordering uses the runtime's default locale, so it can differ
 * between browsers; pinning a locale here would change the sort users see
 * without a test to lock it in, so that is left as a deliberate follow-up.
 */
export function compareJsonValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  const rankA = compareRank(a);
  const rankB = compareRank(b);
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  if (a === undefined || a === null || b === undefined || b === null) {
    return 0;
  }
  let result: number;
  if (typeof a === 'number' && typeof b === 'number') {
    result = a - b;
  } else if (typeof a === 'boolean' && typeof b === 'boolean') {
    result = a === b ? 0 : a ? 1 : -1;
  } else if (typeof a === 'string' && typeof b === 'string') {
    result = a.localeCompare(b);
  } else {
    result = JSON.stringify(a).localeCompare(JSON.stringify(b));
  }
  return direction === 'asc' ? result : -result;
}

/**
 * Human-readable byte size with one decimal for KB and above. The GB branch
 * matters for the rejection message: without it a 2 GB file would be
 * reported as "2048.0 MB". Values are expected to be non-negative file
 * sizes; anything else is passed through unchanged rather than clamped,
 * so a programming error stays visible instead of silently becoming "0 B".
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
