import { Component, computed, signal } from '@angular/core';
import { DataAnalyzer } from './components/data-analyzer/data-analyzer';
import { TableView } from './components/table-view/table-view';
import { TreeView } from './components/tree-view/tree-view';
import { formatBytes, isArrayOfObjects } from './json-analysis';

export type ViewMode = 'tree' | 'table' | 'analysis';

/** Files larger than this are rejected before parsing so a huge file cannot freeze the tab. */
export const MAX_JSON_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-root',
  imports: [TreeView, TableView, DataAnalyzer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly title = signal('JSON Insight');
  readonly jsonData = signal<unknown>(null);
  readonly fileName = signal('');
  readonly error = signal<string | null>(null);
  readonly viewMode = signal<ViewMode>('analysis');
  readonly search = signal('');
  readonly dragOver = signal(false);
  readonly showPaste = signal(false);
  readonly pasteText = signal('');
  readonly fileSize = signal<number | null>(null);

  readonly isDataArrayOfObjects = computed(() => isArrayOfObjects(this.jsonData()));

  protected readonly fileSizeLabel = computed(() => {
    const size = this.fileSize();
    return size === null ? '' : formatBytes(size);
  });

  /** Single source of truth for the size limit shown in the empty state. */
  protected readonly maxJsonSizeLabel = formatBytes(MAX_JSON_BYTES);

  handleFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    target.value = '';
    if (!file) {
      return;
    }
    // The picker is deliberately more permissive than drag-and-drop: its
    // accept attribute is advisory and a user can pick a .txt file that
    // still contains JSON. The parser, not the extension, is the gate here.
    this.loadFile(file);
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      this.error.set('Only .json files are accepted.');
      return;
    }
    this.loadFile(file);
  }

  /**
   * Shared size check + FileReader path for the picker and drag-and-drop.
   * Kept as one method so the two entry points cannot drift apart again:
   * v2.0.0 duplicated the size check and the reader boilerplate in both.
   */
  private loadFile(file: File): void {
    if (file.size > MAX_JSON_BYTES) {
      this.failLoad(
        `File is too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_JSON_BYTES)}.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.loadJsonText(file.name, reader.result as string, file.size);
    };
    reader.onerror = () => {
      this.failLoad('Failed to read the file.');
    };
    reader.readAsText(file);
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  handleDragLeave(): void {
    this.dragOver.set(false);
  }

  /**
   * Single failure path for loading. Clearing fileName/fileSize here
   * matters: without it a failed load after a successful one left the
   * previous file's name and size in the signals while jsonData was null.
   */
  private failLoad(message: string): void {
    this.error.set(message);
    this.jsonData.set(null);
    this.fileName.set('');
    this.fileSize.set(null);
  }

  /** Parse pasted or loaded text. Kept separate from FileReader so tests can drive it directly. */
  loadJsonText(name: string, text: string, size: number | null = null): void {
    const byteSize =
      size ??
      (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : text.length);
    if (byteSize > MAX_JSON_BYTES) {
      this.failLoad(
        `Content is too large (${formatBytes(byteSize)}). The limit is ${formatBytes(MAX_JSON_BYTES)}.`,
      );
      return;
    }
    if (!text.trim()) {
      this.failLoad('Nothing to load: the content is empty.');
      return;
    }
    try {
      this.jsonData.set(JSON.parse(text));
      this.fileName.set(name);
      this.fileSize.set(byteSize);
      this.error.set(null);
      this.viewMode.set('analysis');
      this.showPaste.set(false);
    } catch (err) {
      this.failLoad(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  loadPaste(): void {
    this.loadJsonText('pasted.json', this.pasteText());
  }

  downloadJson(): void {
    const data = this.jsonData();
    // Compare against null, not truthiness: valid JSON values 0, false,
    // and "" are falsy, and v2.0.0 refused to download any of them.
    // A literal JSON null still loads as null, so it is indistinguishable
    // from "no data" here; that edge is documented in docs/REVIEW.md.
    if (data === null) {
      this.error.set('No JSON data to download.');
      return;
    }
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    try {
      a.href = url;
      a.download = this.fileName() || 'data.json';
      document.body.appendChild(a);
      a.click();
    } finally {
      // Revoke on a tick, not synchronously: revoking immediately after
      // click() can race the browser's download start. The finally also
      // guarantees the anchor and URL are cleaned up if click() throws.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      a.remove();
    }
  }

  clearData(): void {
    this.jsonData.set(null);
    this.fileName.set('');
    this.fileSize.set(null);
    this.error.set(null);
    this.search.set('');
    this.pasteText.set('');
    this.viewMode.set('analysis');
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onPasteInput(event: Event): void {
    this.pasteText.set((event.target as HTMLTextAreaElement).value);
  }
}
