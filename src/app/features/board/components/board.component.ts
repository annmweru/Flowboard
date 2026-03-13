// ================================================================
// WHY THIS FILE EXISTS (Board Component):
// The top-level container for the kanban board view. This is the
// SMART component — it talks to the NgRx store and passes data
// down to dumb components (ColumnComponent, PresenceBarComponent).
//
// WHY THIS IS THE MOST COMPLEX COMPONENT:
// It must orchestrate: routing params, board loading, column
// ordering, drag-and-drop across multiple drop lists, presence
// join/leave, and column creation. Each of these talks to the store.
// ================================================================

import { Component, OnInit, OnDestroy, inject,
         ChangeDetectionStrategy }      from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { RouterLink, ActivatedRoute }   from '@angular/router';
import { FormsModule }                  from '@angular/forms';
import { Store }                        from '@ngrx/store';
import { Subject }                      from 'rxjs';
import { takeUntil, map }               from 'rxjs/operators';
import { DragDropModule }               from '@angular/cdk/drag-drop';
import { ColumnComponent }              from './column.component';
import { PresenceBarComponent }         from './presence-bar.component';
import { BoardActions, selectActiveBoard, selectOrderedColumns,
         selectCardsByColumn, selectPresence,
         selectLoadingBoard }           from '../store/board.store';
import { AuthActions, selectUser }      from '../../auth/store/auth.store';
import { DragResult, Card }             from '../../../core/models';
import { ColumnIdsPipe } from "../../../shared/pipes/column-ids.pipe";

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DragDropModule,
    ColumnComponent, PresenceBarComponent, ColumnIdsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board-page">

      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <a routerLink="/boards" class="back-btn">← Boards</a>
          <h1 class="board-title">
            {{ (board$ | async)?.title ?? 'Loading…' }}
          </h1>
        </div>

        <div class="topbar-right">
          <!-- Live presence dots — the star feature -->
          <app-presence-bar [presence]="(presence$ | async) ?? []" />

          <!-- Add column -->
          @if (addingColumn) {
            <div class="add-col-form">
              <input
                type="text"
                [(ngModel)]="newColTitle"
                placeholder="Column name…"
                (keyup.enter)="submitColumn()"
                (keyup.escape)="addingColumn = false"
                maxlength="40"
              />
              <button class="btn-sm-primary" (click)="submitColumn()"
                      [disabled]="!newColTitle.trim()">Add</button>
              <button class="btn-sm-ghost" (click)="addingColumn = false">✕</button>
            </div>
          } @else {
            <button class="btn-add-col" (click)="addingColumn = true">+ Column</button>
          }

          <button class="btn-sign-out" (click)="signOut()">Sign out</button>
        </div>
      </header>

      <!-- Loading state -->
      @if (loading$ | async) {
        <div class="loading-board">
          @for (i of [1,2,3]; track i) {
            <div class="col-skeleton"></div>
          }
        </div>
      }

      <!-- Board canvas — horizontally scrollable -->
      <!-- WHY HORIZONTAL SCROLL: Boards can have many columns.
           The horizontal scroll happens here, not on the window. -->
      @if (!(loading$ | async)) {
        <div class="board-canvas">
          @for (column of orderedColumns$ | async; track column.id) {
            <app-column
              [column]="column"
              [cards]="(cardsByColumn$ | async)?.get(column.id) ?? []"
              [connectedColumnIds]="(allColumnIds$ | async) ?? []"
              (cardDropped)="onCardDropped($event)"
              (addCard)="onAddCard($event)"
              (deleteCard)="onDeleteCard($event)"
              (deleteColumn)="onDeleteColumn($event)"
              (editCard)="onEditCard($event)"
            />
          }

          <!-- Empty board hint -->
          @if ((orderedColumns$ | async)?.length === 0) {
            <div class="empty-board">
              <p>This board has no columns yet.</p>
              <button class="btn-add-col" (click)="addingColumn = true">+ Add your first column</button>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .board-page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

    /* Top bar */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px;
      border-bottom: 1px solid var(--border);
      background: rgba(10,10,10,0.95);
      backdrop-filter: blur(12px);
      flex-shrink: 0;
      gap: 16px;
      flex-wrap: wrap;
    }
    .topbar-left  { display: flex; align-items: center; gap: 16px; }
    .topbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

    .back-btn { font-size: 13px; color: var(--muted); transition: color 0.15s; }
    .back-btn:hover { color: var(--text); }

    .board-title {
      font-family: var(--font-display);
      font-size: 18px; font-weight: 700; letter-spacing: -0.015em;
    }

    /* Add column form */
    .add-col-form { display: flex; gap: 6px; align-items: center; }
    .add-col-form input {
      background: var(--surface); border: 1px solid var(--accent-border);
      border-radius: var(--radius-sm); padding: 7px 12px;
      color: var(--text); font-size: 13px; outline: none; width: 180px;
    }
    .btn-sm-primary {
      background: var(--accent); color: #0a0a0a;
      font-family: var(--font-display); font-weight: 700;
      font-size: 12px; padding: 7px 12px;
      border-radius: var(--radius-sm); border: none;
    }
    .btn-sm-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-sm-ghost {
      background: transparent; color: var(--muted);
      border: 1px solid var(--border); font-size: 12px;
      padding: 7px 10px; border-radius: var(--radius-sm);
    }

    .btn-add-col {
      background: transparent; color: var(--muted);
      border: 1px solid var(--border); font-size: 13px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      transition: all 0.2s; white-space: nowrap;
    }
    .btn-add-col:hover { border-color: var(--accent); color: var(--accent); }

    .btn-sign-out {
      background: transparent; color: var(--muted2);
      border: 1px solid var(--border); font-size: 12px;
      padding: 7px 12px; border-radius: var(--radius-sm);
      transition: all 0.15s;
    }
    .btn-sign-out:hover { color: var(--text); border-color: var(--border-hover); }

    /* Board canvas */
    .board-canvas {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      display: flex;
      gap: 16px;
      padding: 20px 24px;
      align-items: flex-start;
    }

    /* Loading skeletons */
    .loading-board {
      display: flex; gap: 16px; padding: 20px 24px; flex: 1;
    }
    .col-skeleton {
      width: 300px; min-width: 300px; height: 400px;
      background: var(--surface); border-radius: var(--radius-lg);
      animation: shimmer 1.5s ease-in-out infinite; flex-shrink: 0;
    }
    @keyframes shimmer { 0%,100% { opacity: 0.3; } 50% { opacity: 0.7; } }

    .empty-board {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 16px;
      width: 100%; padding: 80px;
      color: var(--muted); font-size: 14px;
    }
  `]
})
export class BoardComponent implements OnInit, OnDestroy {
  private store   = inject(Store);
  private route   = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  board$          = this.store.select(selectActiveBoard);
  orderedColumns$ = this.store.select(selectOrderedColumns);
  cardsByColumn$  = this.store.select(selectCardsByColumn);
  presence$       = this.store.select(selectPresence);
  loading$        = this.store.select(selectLoadingBoard);

  // Used by [cdkDropListConnectedTo] — needs an array of all column IDs
  allColumnIds$   = this.store.select(selectOrderedColumns).pipe(
    map(cols => cols.map(c => c.id))
  );

  addingColumn  = false;
  newColTitle   = '';

  ngOnInit() {
    // Get board ID from URL param and open the board
    // takeUntil(destroy$) prevents memory leaks
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.store.dispatch(BoardActions.openBoard({ boardId: params['id'] }));
      }
    });
  }

  // ── Drag & Drop handler ──────────────────────────────────
  // WHY TWO DISPATCHES (optimistic + commit):
  // 1. moveCardOptimistic → updates the UI store immediately
  //    so the card visually moves without waiting for Firebase
  // 2. moveCardCommit → writes to Firebase asynchronously
  //    If it fails, the Effect dispatches moveCardRevert
  onCardDropped(drag: DragResult) {
    this.store.dispatch(BoardActions.moveCardOptimistic({ drag }));
    this.store.dispatch(BoardActions.moveCardCommit({ drag }));
  }

  onAddCard({ columnId, title }: { columnId: string; title: string }) {
    this.store.dispatch(BoardActions.addCard({ columnId, title }));
  }

  onDeleteCard({ cardId, columnId }: { cardId: string; columnId: string }) {
    this.store.dispatch(BoardActions.deleteCard({ cardId, columnId }));
  }

  onDeleteColumn(columnId: string) {
    this.store.dispatch(BoardActions.deleteColumn({ columnId }));
  }

  onEditCard(card: Card) {
    // TODO: open a modal/drawer for editing card details
    // For now just log — extend this with a CardEditDialogComponent
    console.log('Edit card:', card);
  }

  submitColumn() {
    if (!this.newColTitle.trim()) return;
    this.store.dispatch(BoardActions.addColumn({ title: this.newColTitle.trim() }));
    this.newColTitle  = '';
    this.addingColumn = false;
  }

  signOut() { this.store.dispatch(AuthActions.signOut()); }

  ngOnDestroy() {
    // Close board listeners when navigating away
    this.store.dispatch(BoardActions.closeBoard());
    this.destroy$.next();
    this.destroy$.complete();
  }
}
