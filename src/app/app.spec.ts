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

  it('downloadJson triggers a download with the file name', () => {
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
    } finally {
      vi.unstubAllGlobals();
      createElementSpy.mockRestore();
    }
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(captured.anchor?.download).toBe('data.json');
    expect(captured.anchor?.href).toBe('blob:mock');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
