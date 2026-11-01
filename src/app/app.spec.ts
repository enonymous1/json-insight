import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App, MAX_JSON_BYTES } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the JSON Insight title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('JSON Insight');
  });

  it('loads valid JSON text and clears the error', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('data.json', '{"a": 1}');
    expect(app.jsonData()).toEqual({ a: 1 });
    expect(app.fileName()).toBe('data.json');
    expect(app.error()).toBeNull();
    expect(app.viewMode()).toBe('analysis');
  });

  it('a failed load clears the previous file name and size', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('data.json', '{"a": 1}');
    expect(app.fileName()).toBe('data.json');
    app.loadJsonText('bad.json', '{"a": }');
    expect(app.jsonData()).toBeNull();
    expect(app.fileName()).toBe('');
    expect(app.fileSize()).toBeNull();
  });

  it('reports invalid JSON with the parser message and clears data', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('bad.json', '{"a": }');
    expect(app.jsonData()).toBeNull();
    expect(app.error()).toContain('Invalid JSON');
  });

  it('rejects empty content', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('empty.json', '  ');
    expect(app.jsonData()).toBeNull();
    expect(app.error()).toContain('empty');
  });

  it('rejects content over the size limit without parsing', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('big.json', '{"a": 1}', MAX_JSON_BYTES + 1);
    expect(app.jsonData()).toBeNull();
    expect(app.error()).toContain('too large');
  });

  it('detects arrays of objects for the table view', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('rows.json', '[{"a": 1}, {"a": 2}]');
    expect(app.isDataArrayOfObjects()).toBe(true);
    app.loadJsonText('obj.json', '{"a": 1}');
    expect(app.isDataArrayOfObjects()).toBe(false);
  });

  it('clearData resets state', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('data.json', '{"a": 1}');
    app.clearData();
    expect(app.jsonData()).toBeNull();
    expect(app.fileName()).toBe('');
    expect(app.error()).toBeNull();
  });

  it('downloadJson reports an error with no data', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.downloadJson();
    expect(app.error()).toBe('No JSON data to download.');
  });

  it('downloadJson triggers a download with the file name', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.loadJsonText('data.json', '{"a": 1}');
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const realCreateElement = document.createElement.bind(document);
    const captured: { anchor?: HTMLAnchorElement } = {};
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((
      ...args: [string, ...unknown[]]
    ) => {
      const el = realCreateElement(args[0] as 'a');
      if (args[0] === 'a') {
        captured.anchor = el as HTMLAnchorElement;
        vi.spyOn(captured.anchor, 'click').mockImplementation(() => {});
      }
      return el;
    }) as typeof document.createElement);
    try {
      app.downloadJson();
      // The blob URL is revoked on a tick, not synchronously, so the
      // browser's download start cannot race the revoke.
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      vi.unstubAllGlobals();
      createElementSpy.mockRestore();
    }
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(captured.anchor?.download).toBe('data.json');
    expect(captured.anchor?.href).toBe('blob:mock');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('downloadJson downloads falsy JSON values instead of reporting no data', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    for (const text of ['0', 'false', '""']) {
      app.loadJsonText('data.json', text);
      // loadJsonText of a falsy value must not be mistaken for "no data".
      expect(app.jsonData()).not.toBeNull();
      const createObjectURL = vi.fn(() => 'blob:mock');
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      try {
        app.downloadJson();
        expect(app.error()).toBeNull();
        expect(createObjectURL).toHaveBeenCalledTimes(1);
      } finally {
        vi.unstubAllGlobals();
        clickSpy.mockRestore();
      }
    }
  });
});
