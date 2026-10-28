import { Component, computed, input, signal } from '@angular/core';
import { compareJsonValues, matchesSearch } from '../../json-analysis';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.html',
  styleUrl: './table-view.css',
})
export class TableView {
  readonly data = input<unknown>(null);
  readonly search = input<string>('');

  protected readonly rows = computed(() =>
    Array.isArray(this.data()) ? (this.data() as readonly unknown[]) : [],
  );

  protected readonly sortKey = signal<string | null>(null);
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

  /** Union of all keys across every row, in first-seen order. */
  protected readonly headers = computed(() => {
    const allKeys = new Set<string>();
    for (const item of this.rows()) {
      if (typeof item === 'object' && item !== null) {
        for (const key of Object.keys(item)) {
          allKeys.add(key);
        }
      }
    }
    return Array.from(allKeys);
  });

  protected readonly filteredData = computed(() => {
    const query = this.search();
    if (!query.trim()) {
      return this.rows();
    }
    return this.rows().filter((item) => matchesSearch(item, null, query));
  });

  /** A sorted copy: the input array is never mutated. */
  protected readonly sortedData = computed(() => {
    const key = this.sortKey();
    const rows = [...this.filteredData()];
    if (key === null) {
      return rows;
    }
    const direction = this.sortDirection();
    return rows.sort((a, b) => compareJsonValues(rowValue(a, key), rowValue(b, key), direction));
  });

  protected getValue(item: unknown, header: string): unknown {
    const value = rowValue(item, header);
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value !== undefined ? value : '—';
  }

  protected sortBy(key: string): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }
}

function rowValue(item: unknown, header: string): unknown {
  if (typeof item === 'object' && item !== null) {
    return (item as Record<string, unknown>)[header];
  }
  return undefined;
}
