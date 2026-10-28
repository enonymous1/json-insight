/** Pure JSON helpers shared by the components. Kept free of Angular APIs so they
 *  can be unit-tested in isolation and reused without a component fixture. */

export interface Analysis {
  totalKeys: number;
  maxDepth: number;
  dataTypes: Record<string, number>;
  topLevelType: string;
  itemCount?: number;
}

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
 * JSON text. Never mutates its inputs.
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
