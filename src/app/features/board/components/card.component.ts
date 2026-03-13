import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { Card, CardPriority } from '../../../core/models';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDragHandle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" cdkDrag [cdkDragData]="card">
      <div class="drag-handle" cdkDragHandle>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="4" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="4" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="4" cy="11" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="11" r="1.5" fill="currentColor"/>
        </svg>
      </div>

      <!-- Priority indicator -->
      <div class="priority-dot" [class]="'priority-' + card.priority"
           [title]="card.priority + ' priority'"></div>

      <div class="card-body">
        <h4 class="card-title">{{ card.title }}</h4>

        @if (card.description) {
          <p class="card-desc">{{ card.description }}</p>
        }

        <!-- Labels -->
        @if (card.labels && card.labels.length > 0) {
          <div class="labels">
            @for (label of card.labels; track label) {
              <span class="label">{{ label }}</span>
            }
          </div>
        }

        <!-- Card footer -->
        <div class="card-footer">
          @if (card.dueDate) {
            <span class="due-date" [class.overdue]="isOverdue">
              {{ card.dueDate | date: 'MMM d' }}
            </span>
          }
          <div class="card-actions">
            <button class="icon-btn" (click)="edit.emit(card)" title="Edit card">✎</button>
            <button class="icon-btn danger" (click)="delete.emit(card)" title="Delete card">✕</button>
          </div>
        </div>
      </div>

      <div *cdkDragPreview class="drag-preview">
        <span>{{ card.title }}</span>
      </div>

      <div *cdkDragPlaceholder class="drag-placeholder"></div>
    </div>
  `,
  styles: [`
    .card {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      display: flex;
      gap: 8px;
      padding: 12px 10px 12px 6px;
      cursor: default;
      transition: border-color 0.15s, box-shadow 0.15s;
      position: relative;
    }
    .card:hover {
      border-color: var(--border-hover);
      box-shadow: var(--shadow-sm);
    }

    .drag-handle {
      color: var(--muted2);
      cursor: grab;
      padding: 2px 2px 0;
      flex-shrink: 0;
      transition: color 0.15s;
      display: flex;
      align-items: flex-start;
    }
    .drag-handle:hover { color: var(--muted); }
    .drag-handle:active { cursor: grabbing; }

    .priority-dot {
      width: 4px;
      border-radius: 2px;
      flex-shrink: 0;
      align-self: stretch;
      margin: 2px 0;
    }
    .priority-low    { background: var(--success); }
    .priority-medium { background: var(--warning); }
    .priority-high   { background: #ff8c00; }
    .priority-urgent { background: var(--danger); }

    .card-body { flex: 1; min-width: 0; }

    .card-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      line-height: 1.45;
      margin-bottom: 4px;
      word-break: break-word;
    }

    .card-desc {
      font-size: 12px;
      color: var(--muted);
      font-weight: 300;
      line-height: 1.5;
      margin-bottom: 6px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }
    .label {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 99px;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--accent-border);
      font-weight: 500;
      letter-spacing: 0.03em;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6px;
    }
    .due-date {
      font-size: 10px;
      color: var(--muted);
      font-weight: 300;
    }
    .due-date.overdue { color: var(--danger); }

    .card-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
    .card:hover .card-actions { opacity: 1; }
    .icon-btn {
      background: transparent; border: none; color: var(--muted);
      font-size: 11px; padding: 3px 5px; border-radius: 4px;
      transition: background 0.15s, color 0.15s; line-height: 1;
    }
    .icon-btn:hover { background: var(--bg3); color: var(--text); }
    .icon-btn.danger:hover { color: var(--danger); }

    .drag-preview {
      background: var(--surface2);
      border: 1px solid var(--accent-border);
      border-radius: var(--radius-md);
      padding: 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      box-shadow: var(--shadow-lg);
      max-width: 280px;
    }

    .drag-placeholder {
      background: var(--accent-dim);
      border: 1px dashed var(--accent-border);
      border-radius: var(--radius-md);
      min-height: 60px;
    }
  `]
})
export class CardComponent {
  @Input({ required: true }) card!: Card;
  @Output() edit   = new EventEmitter<Card>();
  @Output() delete = new EventEmitter<Card>();

  get isOverdue(): boolean {
    return !!this.card.dueDate && this.card.dueDate < Date.now();
  }
}
