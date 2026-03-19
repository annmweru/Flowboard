import { Column } from './../../../core/models/index';
// ================================================================
// WHY THIS FILE EXISTS (Board Store):
// This is the heart of the app's state management.
// It manages: boards list, current board, columns, cards, presence.
//
// KEY INSIGHT — Why separate columns and cards from the board:
// If cards were nested inside columns inside the board object,
// EVERY card update would require rewriting the entire board tree.
// With flat normalised state (like a database), updating a single
// card is a tiny targeted write. NgRx Entity helps manage this.
// ================================================================

import { createAction, props, createReducer, on,
         createSelector, createFeatureSelector } from '@ngrx/store';
import{createEffect,
         Actions, ofType } from '@ngrx/effects';
import { createEntityAdapter, EntityState, EntityAdapter } from '@ngrx/entity';
import { Injectable, inject } from '@angular/core';
import { switchMap, map, catchError, mergeMap, tap,
         withLatestFrom, EMPTY, 
         merge} from 'rxjs';
import { of, Observable } from 'rxjs';
import { Store }          from '@ngrx/store';
import { FirebaseService } from '../../../core/services/firebase.service';
import { Board, Card, Presence, DragResult } from '../../../core/models';
import { selectUser }     from '../../auth/store/auth.store';

// ── Normalised State ───────────────────────────────────────
// WHY ENTITY ADAPTER: NgRx Entity gives us O(1) lookups by id,
// and helpers like addMany, upsertOne, removeOne for free.
// Without it, updating one card in an array = O(n) .map().
export interface BoardState {
  boards:         EntityState<Board>;
  columns:        EntityState<Column>;
  cards:          EntityState<Card>;
  presence:       Presence[];
  activeBoardId:  string | null;
  loadingBoard:   boolean;
  loadingBoards:  boolean;
  error:          string | null;
}

const boardAdapter:  EntityAdapter<Board>  = createEntityAdapter<Board>();
const columnAdapter: EntityAdapter<Column> = createEntityAdapter<Column>();
const cardAdapter:   EntityAdapter<Card>   = createEntityAdapter<Card>();

const initialState: BoardState = {
  boards:        boardAdapter.getInitialState(),
  columns:       columnAdapter.getInitialState(),
  cards:         cardAdapter.getInitialState(),
  presence:      [],
  activeBoardId: null,
  loadingBoard:  false,
  loadingBoards: false,
  error:         null,
};

// ── Actions ────────────────────────────────────────────────
export const BoardActions = {
  // Board list
  loadBoards:        createAction('[Board] Load Boards'),
  boardsLoaded:      createAction('[Board] Boards Loaded',       props<{ boards: Board[] }>()),
  createBoard:       createAction('[Board] Create Board',        props<{ title: string }>()),

  // Single board
  openBoard:         createAction('[Board] Open Board',          props<{ boardId: string }>()),
  boardLoaded:       createAction('[Board] Board Loaded',        props<{ board: Board }>()),
  columnsLoaded:     createAction('[Board] Columns Loaded',      props<{ columns: Column[] }>()),
  cardsLoaded:       createAction('[Board] Cards Loaded',        props<{ cards: Card[] }>()),
  presenceUpdated:   createAction('[Board] Presence Updated',    props<{ presence: Presence[] }>()),
  closeBoard:        createAction('[Board] Close Board'),

  // Columns
  addColumn:         createAction('[Board] Add Column',          props<{ title: string }>()),
  deleteColumn:      createAction('[Board] Delete Column',       props<{ columnId: string }>()),

  // Cards
  addCard:           createAction('[Board] Add Card',            props<{ columnId: string; title: string }>()),
  updateCard:        createAction('[Board] Update Card',         props<{ cardId: string; changes: Partial<Card> }>()),
  deleteCard:        createAction('[Board] Delete Card',         props<{ cardId: string; columnId: string }>()),

  // Drag & drop — this is the key one!
  // WHY TWO ACTIONS: We dispatch moveCardOptimistic IMMEDIATELY
  // (so the UI updates before Firebase confirms), then moveCardCommit
  // sends it to Firebase. If Firebase fails, we can revert.
  moveCardOptimistic: createAction('[Board] Move Card Optimistic', props<{ drag: DragResult }>()),
  moveCardCommit:     createAction('[Board] Move Card Commit',     props<{ drag: DragResult }>()),
  moveCardRevert:     createAction('[Board] Move Card Revert',     props<{ drag: DragResult; originalFromOrder: string[]; originalToOrder: string[] }>()),

  error:             createAction('[Board] Error',                props<{ error: string }>()),
};

// ── Reducer ────────────────────────────────────────────────
export const boardReducer = createReducer(
  initialState,

  on(BoardActions.loadBoards,
    s => ({ ...s, loadingBoards: true })),

  on(BoardActions.boardsLoaded, (s, { boards }) => ({
    ...s,
    loadingBoards: false,
    boards: boardAdapter.setAll(boards, s.boards)
  })),

  on(BoardActions.openBoard, (s, { boardId }) => ({
    ...s, activeBoardId: boardId, loadingBoard: true
  })),

  on(BoardActions.boardLoaded, (s, { board }) => ({
    ...s,
    loadingBoard: false,
    boards: boardAdapter.upsertOne(board, s.boards)
  })),

  on(BoardActions.columnsLoaded, (s, { columns }) => ({
    ...s,
    columns: columnAdapter.setAll(columns, s.columns)
  })),

  on(BoardActions.cardsLoaded, (s, { cards }) => ({
    ...s,
    cards: cardAdapter.setAll(cards, s.cards)
  })),

  on(BoardActions.presenceUpdated, (s, { presence }) => ({
    ...s, presence
  })),

  on(BoardActions.closeBoard, s => ({
    ...s,
    activeBoardId: null,
    columns: columnAdapter.removeAll(s.columns),
    cards:   cardAdapter.removeAll(s.cards),
    presence: [],
  })),

  // OPTIMISTIC UPDATE: Update UI immediately when drag completes.
  // The columns' cardOrder arrays are updated before Firebase confirms.
  // If Firebase fails, moveCardRevert will undo this.
  on(BoardActions.moveCardOptimistic, (s, { drag }) => {
    const fromCol = s.columns.entities[drag.fromColumnId];
    const toCol   = s.columns.entities[drag.toColumnId];
    if (!fromCol || !toCol) return s;

    const newFromOrder = [...fromCol.cardOrder];
    newFromOrder.splice(drag.fromIndex, 1);

    let newToOrder: string[];
    if (drag.fromColumnId === drag.toColumnId) {
      newToOrder = [...newFromOrder];
    } else {
      newToOrder = [...toCol.cardOrder];
    }
    newToOrder.splice(drag.toIndex, 0, drag.cardId);

    const updates: Column[] = [];
    if (drag.fromColumnId !== drag.toColumnId) {
      updates.push({ ...fromCol, cardOrder: newFromOrder });
    }
    updates.push({ ...toCol, cardOrder: newToOrder });

    const newCards = drag.fromColumnId !== drag.toColumnId
      ? cardAdapter.updateOne(
          { id: drag.cardId, changes: { columnId: drag.toColumnId } },
          s.cards
        )
      : s.cards;

    return {
      ...s,
      columns: columnAdapter.upsertMany(updates, s.columns),
      cards: newCards,
    };
  }),

  on(BoardActions.moveCardRevert, (s, { drag, originalFromOrder, originalToOrder }) => {
    const fromCol = s.columns.entities[drag.fromColumnId];
    const toCol   = s.columns.entities[drag.toColumnId];
    if (!fromCol || !toCol) return s;
    const updates: Column[] = [
      { ...fromCol, cardOrder: originalFromOrder },
      { ...toCol,   cardOrder: originalToOrder   },
    ];
    return { ...s, columns: columnAdapter.upsertMany(updates, s.columns) };
  }),
);

// ── Selectors ──────────────────────────────────────────────
const selectBoardFeature = createFeatureSelector<BoardState>('board');

const { selectAll: allBoards }  = boardAdapter.getSelectors();
const { selectAll: allColumns } = columnAdapter.getSelectors();
const { selectAll: allCards }   = cardAdapter.getSelectors();

export const selectBoards  = createSelector(selectBoardFeature, s => allBoards(s.boards));
export const selectColumns = createSelector(selectBoardFeature, s => allColumns(s.columns));
export const selectCards   = createSelector(selectBoardFeature, s => allCards(s.cards));
export const selectPresence = createSelector(selectBoardFeature, s => s.presence);
export const selectActiveBoardId = createSelector(selectBoardFeature, s => s.activeBoardId);
export const selectLoadingBoard  = createSelector(selectBoardFeature, s => s.loadingBoard);

export const selectActiveBoard = createSelector(
  selectBoardFeature, selectActiveBoardId,
  (s, id) => id ? s.boards.entities[id] ?? null : null
);

export const selectOrderedColumns = createSelector(
  selectActiveBoard, selectColumns,
  (board, cols) => {
    if (!board) return [];
    return board.columnOrder
      .map(id => cols.find(c => c.id === id))
      .filter((c): c is Column => !!c);
  }
);

export const selectCardsByColumn = createSelector(
  selectCards,
  cards => {
    const map = new Map<string, Card[]>();
    for (const card of cards) {
      const list = map.get(card.columnId) ?? [];
      list.push(card);
      map.set(card.columnId, list);
    }
    return map;
  }
);

@Injectable()
export class BoardEffects {
  private actions$ = inject(Actions);
  private fb       = inject(FirebaseService);
  private store    = inject(Store);

  loadBoards$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.loadBoards),
      withLatestFrom(this.store.select(selectUser)),
      switchMap(([_, user]) => {
        if (!user) return of(BoardActions.boardsLoaded({ boards: [] }));
        return this.fb.watchBoards(user.uid).pipe(
          map(boards => BoardActions.boardsLoaded({ boards })),
          catchError(err => of(BoardActions.error({ error: err.message })))
        );
      })
    )
  );


openBoard$ = createEffect(() =>
  this.actions$.pipe(
    ofType(BoardActions.openBoard),
    switchMap(({ boardId }) =>
      merge(
        this.fb.watchBoard(boardId).pipe(
          map(board =>
            board
              ? BoardActions.boardLoaded({ board })
              : BoardActions.error({ error: 'Board not found' })
          )
        ),
        this.fb.watchColumns(boardId).pipe(
          map(columns => BoardActions.columnsLoaded({ columns }))
        ),
        this.fb.watchCards(boardId).pipe(
          map(cards => BoardActions.cardsLoaded({ cards }))
        ),
        this.fb.watchPresence(boardId).pipe(
          map(presence => BoardActions.presenceUpdated({ presence }))
        )
      )
    )
  )
);

  joinBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.openBoard),
      withLatestFrom(this.store.select(selectUser)),
      tap(([{ boardId }, user]) => {
        if (user) this.fb.joinBoard(boardId, user);
      })
    ),
    { dispatch: false }
  );

  leaveBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.closeBoard),
      withLatestFrom(this.store.select(selectUser), this.store.select(selectActiveBoardId)),
      tap(([_, user, boardId]) => {
        if (user && boardId) this.fb.leaveBoard(boardId, user.uid);
      })
    ),
    { dispatch: false }
  );

  addCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.addCard),
      withLatestFrom(
        this.store.select(selectUser),
        this.store.select(selectActiveBoardId),
        this.store.select(selectColumns)
      ),
      switchMap(([{ columnId, title }, user, boardId, columns]) => {
        if (!user || !boardId) return EMPTY;
        const col = columns.find(c => c.id === columnId);
        if (!col) return EMPTY;
        return this.fb.addCard(boardId, columnId, title, user.uid, col.cardOrder).then(() => null);
      })
    ),
    { dispatch: false }
  );

  updateCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.updateCard),
      withLatestFrom(this.store.select(selectActiveBoardId)),
      switchMap(([{ cardId, changes }, boardId]) => {
        if (!boardId) return EMPTY;
        return this.fb.updateCard(boardId, cardId, changes).then(() => null);
      })
    ),
    { dispatch: false }
  );

  deleteCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.deleteCard),
      withLatestFrom(
        this.store.select(selectActiveBoardId),
        this.store.select(selectColumns)
      ),
      switchMap(([{ cardId, columnId }, boardId, columns]) => {
        if (!boardId) return EMPTY;
        const col = columns.find((c:Column) => c.id === columnId);
        if (!col) return EMPTY;
        return this.fb.deleteCard(boardId, cardId, columnId, col.cardOrder).then(() => null);
      })
    ),
    { dispatch: false }
  );

  moveCardCommit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.moveCardCommit),
      withLatestFrom(
        this.store.select(selectActiveBoardId),
        this.store.select(selectColumns)
      ),
      switchMap(([{ drag }, boardId, columns]) => {
        if (!boardId) return EMPTY;
        const fromCol = columns.find((c: Column) => c.id === drag.fromColumnId);
        const toCol   = columns.find((c: Column) => c.id === drag.toColumnId);
        if (!fromCol || !toCol) return EMPTY;
        return this.fb.moveCard(boardId, drag, fromCol.cardOrder, toCol.cardOrder)
          .then(() => null)
          .catch(err => {
            // Revert optimistic update on Firebase failure
            this.store.dispatch(BoardActions.moveCardRevert({
              drag,
              originalFromOrder: fromCol.cardOrder,
              originalToOrder:   toCol.cardOrder
            }));
            return null;
          });
      })
    ),
    { dispatch: false }
  );

  addColumn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.addColumn),
      withLatestFrom(
        this.store.select(selectActiveBoardId),
        this.store.select(selectActiveBoard)
      ),
      switchMap(([{ title }, boardId, board]) => {
        if (!boardId || !board) return EMPTY;
        return this.fb.addColumn(boardId, title, board.columnOrder).then(() => null);
      })
    ),
    { dispatch: false }
  );

  createBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BoardActions.createBoard),
      withLatestFrom(this.store.select(selectUser)),
      switchMap(([{ title }, user]) => {
        if (!user) return EMPTY;
        return this.fb.createBoard(title, user.uid).then(() => null);
      })
    ),
    { dispatch: false }
  );
}
