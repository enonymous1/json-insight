import { TestBed } from '@angular/core/testing';
import { TreeView } from './tree-view';

describe('TreeView', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeView],
    }).compileComponents();
  });

  it('renders keys and primitive values', () => {
    const fixture = TestBed.createComponent(TreeView);
    fixture.componentRef.setInput('data', { name: 'Alice', age: 30 });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('name');
    expect(text).toContain('Alice');
    expect(text).toContain('age');
    expect(text).toContain('30');
  });

  it('collapses children when the toggle is clicked', () => {
    const fixture = TestBed.createComponent(TreeView);
    fixture.componentRef.setInput('data', { nested: { a: 1 } });
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    button?.click();
    fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    // The nested value is no longer rendered once collapsed.
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('a:');
  });

  it('expands a matching branch while searching', () => {
    const fixture = TestBed.createComponent(TreeView);
    fixture.componentRef.setInput('data', { deep: { deeper: { city: 'Paris' } } });
    fixture.componentRef.setInput('search', 'paris');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paris');
  });
});
