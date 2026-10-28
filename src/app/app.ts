import { Component, computed, signal } from '@angular/core';
import { DataAnalyzer } from './components/data-analyzer/data-analyzer';
import { TableView } from './components/table-view/table-view';
import { TreeView } from './components/tree-view/tree-view';
import { formatBytes } from './json-analysis';

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

  readonly isDataArrayOfObjects = computed(
    () =>
      Array.isArray(this.jsonData()) &&
      this.jsonData() !== null &&
      (this.jsonData() as unknown[]).length > 0 &&
      typeof (this.jsonData() as unknown[])[0] === 'object' &&
      (this.jsonData() as unknown[])[0] !== null,
  );

  protected readonly fileSizeLabel = computed(() => {
    const size = this.fileSize();
    return size === null ? '' : formatBytes(size);
  });

  handleFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) {
      this.error.set('No file selected.');
      return;
    }
    if (file.size > MAX_JSON_BYTES) {
      this.error.set(
        `File is too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_JSON_BYTES)}.`,
      );
      this.jsonData.set(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.loadJsonText(file.name, reader.result as string, file.size);
    };
    reader.onerror = () => {
      this.error.set('Failed to read the file.');
      this.jsonData.set(null);
    };
    reader.readAsText(file);
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
    if (file.size > MAX_JSON_BYTES) {
      this.error.set(
        `File is too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_JSON_BYTES)}.`,
      );
      this.jsonData.set(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.loadJsonText(file.name, reader.result as string, file.size);
    };
    reader.onerror = () => {
      this.error.set('Failed to read the file.');
      this.jsonData.set(null);
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

  /** Parse pasted or loaded text. Kept separate from FileReader so tests can drive it directly. */
  loadJsonText(name: string, text: string, size: number | null = null): void {
    const byteSize =
      size ??
      (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : text.length);
    if (byteSize > MAX_JSON_BYTES) {
      this.error.set(
        `Content is too large (${formatBytes(byteSize)}). The limit is ${formatBytes(MAX_JSON_BYTES)}.`,
      );
      this.jsonData.set(null);
      return;
    }
    if (!text.trim()) {
      this.error.set('Nothing to load: the content is empty.');
      this.jsonData.set(null);
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
      this.error.set(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      this.jsonData.set(null);
    }
  }

  loadPaste(): void {
    this.loadJsonText('pasted.json', this.pasteText());
  }

  downloadJson(): void {
    const data = this.jsonData();
    if (!data) {
      this.error.set('No JSON data to download.');
      return;
    }
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName() || 'data.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
