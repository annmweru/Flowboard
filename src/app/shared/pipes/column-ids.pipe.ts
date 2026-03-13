// ================================================================
// WHY THIS FILE EXISTS (ColumnIds Pipe):
// CdkDropList's [cdkDropListConnectedTo] requires an array of
// string IDs — not column objects. This pipe transforms
// Column[] → string[] in the template cleanly.
//
// WHY A PIPE (not a method):
// Template methods are called on every change detection cycle.
// A pure pipe is only recalculated when its input changes.
// This is a micro-optimisation but good practice.
// ================================================================

import { Pipe, PipeTransform } from '@angular/core';
import { Column } from '../../core/models';

@Pipe({
  name: 'columnIds',
  standalone: true,
  pure: true,  // only recalculates when input reference changes
})
export class ColumnIdsPipe implements PipeTransform {
  transform(columns: Column[] | null): string[] {
    if (!columns) return [];
    return columns.map(c => c.id);
  }
}
