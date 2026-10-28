import { TestBed } from '@angular/core/testing';
import { TableView } from './table-view';

const ROWS = [
  { name: 'Bob', age: 30 },
  { name: 'Alice', age: 25 },
  { name: 'Carol', age: 40 },
];

describe('TableView', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableView],
    }).compileComponents();
  });

  it('renders the union of headers and all rows', () => {
    const fixture = TestBed.createComponent(TableView);
    fixture.componentRef.setInput('data', [...ROWS, { name: 'Dan', city: 'NYC' }]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('city');
    expect(el.querySelectorAll('tbody tr')).toHaveLength(4);
  });

  it('sorts without mutating the input array', () => {
    const fixture = TestBed.createComponent(TableView);
    const input = [...ROWS];
    const before = [...input];
    fixture.componentRef.setInput('data', input);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    button?.click();
    fixture.detectChanges();
    expect(input).toEqual(before);
    const cells = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr td:first-child'),
    ).map((td) => td.textContent?.trim());
    expect(cells).toEqual(['Alice', 'Bob', 'Carol']);
    // Clicking again reverses the order.
    button?.click();
    fixture.detectChanges();
    const reversed = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr td:first-child'),
    ).map((td) => td.textContent?.trim());
    expect(reversed).toEqual(['Carol', 'Bob', 'Alice']);
  });

  it('sorts numbers numerically', () => {
    const fixture = TestBed.createComponent(TableView);
    fixture.componentRef.setInput('data', [{ n: 10 }, { n: 2 }, { n: 30 }]);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons[0]?.click();
    fixture.detectChanges();
    const cells = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr td'),
    ).map((td) => td.textContent?.trim());
    expect(cells).toEqual(['2', '10', '30']);
  });

  it('filters rows by the search query', () => {
    const fixture = TestBed.createComponent(TableView);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('search', 'alice');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('renders an empty message for non-array data', () => {
    const fixture = TestBed.createComponent(TableView);
    fixture.componentRef.setInput('data', { a: 1 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No rows to show.');
  });
});
