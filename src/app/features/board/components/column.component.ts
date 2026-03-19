import { Component, Input, Output, EventEmitter,
         ChangeDetectionStrategy }  from '@angular/core';
import { CommonModule }             from '@angular/common';
import { FormsModule }              from '@angular/forms';
import { CdkDropList, CdkDrag,
         CdkDragDrop }              from '@angular/cdk/drag-drop';
import { CardComponent }            from './card.component';
import { Column, Card, DragResult } from '../../../core/models';

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="column">
      <!-- Column header -->
      <div class="col-header">
        <div class="col-title-row">
          @if (column.color) {
            <span class="col-dot" [style.background]="column.color"></span>
          }
          <h3 class="col-title">{{ column.title }}</h3>
          <span class="col-count">{{ cards.length }}</span>
        </div>
        <div class="col-actions">
          <button class="icon-btn" (click)="deleteColumn.emit(column.id)"
                  title="Delete column">✕</button>
        </div>
      </div>

      <div
        class="card-list"
        cdkDropList
        [id]="column.id"
        [cdkDropListData]="cards"
        [cdkDropListConnectedTo]="connectedColumnIds"
        (cdkDropListDropped)="onDrop($event)"
        [class.drag-over]="isDragOver"
      >
        @for (card of orderedCards; track card.id) {
          <app-card
            [card]="card"
            (edit)="editCard.emit($event)"
            (delete)="onDeleteCard($event)"
          />
        }

        @if (cards.length === 0) {
          <div class="empty-column">Drop cards here</div>
        }
      </div>

      <!-- Add card form -->
      @if (addingCard) {
        <div class="add-card-form">
          <textarea
            [(ngModel)]="newCardTitle"
            placeholder="Card title…"
            (keyup.enter)="submitCard()"
            (keyup.escape)="cancelAdd()"
            rows="2"
            autofocus
          ></textarea>
          <div class="add-card-actions">
            <button class="btn-add" (click)="submitCard()"
                    [disabled]="!newCardTitle.trim()">Add card</button>
            <button class="btn-cancel" (click)="cancelAdd()">Cancel</button>
          </div>
        </div>
      } @else {
        <button class="btn-add-card" (click)="addingCard = true">
          + Add card
        </button>
      }
    </div>
  `,
  styles: [`
    .column {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      width: 300px;
      min-width: 300px;
      max-height: calc(100vh - 120px);
      flex-shrink: 0;
    }

    .col-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border);
    }
    .col-title-row { display: flex; align-items: center; gap: 8px; }
    .col-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .col-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text);
    }
    .col-count {
      font-size: 11px;
      color: var(--muted2);
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 99px;
      padding: 1px 7px;
      font-weight: 500;
    }
    .col-actions { display: flex; gap: 4px; }
    .icon-btn {
      background: transparent; border: none;
      color: var(--muted2); font-size: 11px;
      padding: 4px 6px; border-radius: 4px;
      transition: all 0.15s;
    }
    .icon-btn:hover { background: var(--bg3); color: var(--danger); }

    .card-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 10px 4px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 80px;
      transition: background 0.2s;
    }
    .card-list.drag-over {
      background: rgba(200,245,90,0.04);
    }

    .empty-column {
      text-align: center;
      padding: 24px 16px;
      font-size: 12px;
      color: var(--muted2);
      border: 1px dashed var(--border);
      border-radius: var(--radius-md);
      letter-spacing: 0.03em;
    }

    /* Add card form */
    .add-card-form { padding: 10px; }
    .add-card-form textarea {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--accent-border);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      color: var(--text);
      font-size: 13px;
      resize: none;
      outline: none;
      line-height: 1.5;
    }
    .add-card-actions { display: flex; gap: 6px; margin-top: 6px; }
    .btn-add {
      background: var(--accent); color: #0a0a0a;
      font-family: var(--font-display); font-weight: 700;
      font-size: 12px; padding: 7px 14px;
      border-radius: var(--radius-sm); border: none;
    }
    .btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-cancel {
      background: transparent; color: var(--muted);
      font-size: 12px; padding: 7px 12px;
      border: 1px solid var(--border); border-radius: var(--radius-sm);
    }

    .btn-add-card {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 13px;
      padding: 10px 16px;
      text-align: left;
      width: 100%;
      transition: color 0.15s, background 0.15s;
      border-top: 1px solid var(--border);
    }
    .btn-add-card:hover { color: var(--accent); background: var(--accent-dim); }
  `]
})
export class ColumnComponent {
  @Input({ required: true }) column!: Column;
  @Input({ required: true }) cards: Card[] = [];
  @Input({ required: true }) connectedColumnIds: string[] = [];

  @Output() cardDropped    = new EventEmitter<DragResult>();
  @Output() addCard        = new EventEmitter<{ columnId: string; title: string }>();
  @Output() deleteCard     = new EventEmitter<{ cardId: string; columnId: string }>();
  @Output() deleteColumn   = new EventEmitter<string>();
  @Output() editCard       = new EventEmitter<Card>();

  addingCard    = false;
  newCardTitle  = '';
  isDragOver    = false;

  get orderedCards(): Card[] {
        if (!this.column?.cardOrder || !this.cards) return [];

    return this.column.cardOrder
      .map(id => this.cards.find(c => c.id === id))
      .filter((c): c is Card => !!c);
  }
  onDrop(event: CdkDragDrop<Card[]>) {
    const drag: DragResult = {
      cardId:       event.item.data.id,
      fromColumnId: event.previousContainer.id,
      toColumnId:   event.container.id,
      fromIndex:    event.previousIndex,
      toIndex:      event.currentIndex,
    };
    // Only emit if something actually changed
    if (drag.fromColumnId !== drag.toColumnId || drag.fromIndex !== drag.toIndex) {
      this.cardDropped.emit(drag);
    }
  }

  submitCard() {
    if (!this.newCardTitle.trim()) return;
    this.addCard.emit({ columnId: this.column.id, title: this.newCardTitle.trim() });
    this.newCardTitle = '';
    this.addingCard   = false;
  }

  cancelAdd() {
    this.newCardTitle = '';
    this.addingCard   = false;
  }

  onDeleteCard(card: Card) {
    this.deleteCard.emit({ cardId: card.id, columnId: card.columnId });
  }
}
