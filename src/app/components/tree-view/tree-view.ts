import { Component, computed, input, OnInit, signal } from '@angular/core';
import { getJsonType, matchesSearch } from '../../json-analysis';

@Component({
  selector: 'app-tree-view',
  imports: [TreeView],
  templateUrl: './tree-view.html',
  styleUrl: './tree-view.css',
})
export class TreeView implements OnInit {
  readonly data = input<unknown>(null);
  readonly nodeKey = input<string | null>(null, { alias: 'key' });
  readonly isRoot = input<boolean>(true);
  readonly depth = input<number>(0);
  readonly search = input<string>('');

  protected readonly expanded = signal(true);

  ngOnInit(): void {
    // Collapse deeper levels by default so large files stay readable; the
    // root and its children start expanded.
    if (this.depth() >= 2) {
      this.expanded.set(false);
    }
  }

  protected readonly isObject = computed(
    () => typeof this.data() === 'object' && this.data() !== null,
  );

  protected readonly keys = computed(() =>
    this.isObject() ? Object.keys(this.data() as Record<string, unknown>) : [],
  );

  /** When searching, matching branches expand automatically; otherwise the toggle wins. */
  protected readonly showChildren = computed(() => {
    const query = this.search();
    if (query.trim()) {
      return matchesSearch(this.data(), this.nodeKey(), query);
    }
    return this.expanded();
  });

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }

  protected childValue(key: string): unknown {
    const data = this.data();
    if (typeof data === 'object' && data !== null) {
      return (data as Record<string, unknown>)[key];
    }
    return undefined;
  }

  protected getType(value: unknown): string {
    return getJsonType(value);
  }

  protected readonly openingBracket = computed(() => (Array.isArray(this.data()) ? '[' : '{'));
  protected readonly closingBracket = computed(() => (Array.isArray(this.data()) ? ']' : '}'));

  protected readonly itemCount = computed(() => {
    const len = this.keys().length;
    return len === 1 ? '1 item' : `${len} items`;
  });
}
