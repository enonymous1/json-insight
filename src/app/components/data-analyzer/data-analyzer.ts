import { Component, computed, input } from '@angular/core';
import { analyzeJson } from '../../json-analysis';

@Component({
  selector: 'app-data-analyzer',
  templateUrl: './data-analyzer.html',
  styleUrl: './data-analyzer.css',
})
export class DataAnalyzer {
  readonly data = input<unknown>(null);

  protected readonly analysis = computed(() => analyzeJson(this.data()));

  protected readonly dataTypesAsArray = computed(() => {
    const analysis = this.analysis();
    if (!analysis) return [];
    return Object.entries(analysis.dataTypes).map(([type, count]) => ({ type, count }));
  });
}
