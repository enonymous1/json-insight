import { TestBed } from '@angular/core/testing';
import { DataAnalyzer } from './data-analyzer';

describe('DataAnalyzer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataAnalyzer],
    }).compileComponents();
  });

  it('renders the analysis for an object', () => {
    const fixture = TestBed.createComponent(DataAnalyzer);
    fixture.componentRef.setInput('data', { name: 'a', nested: { ok: true } });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('JSON Analysis');
    expect(text).toContain('Top-Level Type');
    expect(text).toContain('object');
    expect(text).toContain('Total Keys');
  });

  it('shows item count for arrays and hides it for objects', () => {
    const fixture = TestBed.createComponent(DataAnalyzer);
    fixture.componentRef.setInput('data', [1, 2, 3]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Item Count');

    fixture.componentRef.setInput('data', { a: 1 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Item Count');
  });

  it('renders nothing for null data', () => {
    const fixture = TestBed.createComponent(DataAnalyzer);
    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});
