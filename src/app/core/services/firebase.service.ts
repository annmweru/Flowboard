
import { Injectable, inject, OnDestroy } from '@angular/core';
import { Database, ref, set, push, update, remove,
         onValue, onDisconnect, serverTimestamp,
         DatabaseReference } from '@angular/fire/database';
import { Auth, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, signOut,
         onAuthStateChanged, updateProfile } from '@angular/fire/auth';
import { Observable, from, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Board, Column, Card, User, Presence, DragResult } from '../models';
import { environment } from '../../../environments/environment';

const PRESENCE_COLORS = [
  '#c8f55a', '#7ec8f0', '#ffb080', '#c8a0ff',
  '#ff8fa3', '#80ffcc', '#ffd858', '#ff9580'
];

@Injectable({ providedIn: 'root' })
export class FirebaseService implements OnDestroy {

  private db    = inject(Database);
  private auth  = inject(Auth);
  private destroy$ = new Subject<void>();

  get authState$(): Observable<User | null> {
    return new Observable(observer => {
      const unsub = onAuthStateChanged(this.auth, fireUser => {
        if (!fireUser) { observer.next(null); return; }
        observer.next({
          uid:         fireUser.uid,
          email:       fireUser.email ?? '',
          displayName: fireUser.displayName ?? fireUser.email ?? 'Anonymous',
          photoURL:    fireUser.photoURL ?? undefined,
          createdAt:   Date.now(),
        });
      });
      return unsub; 
    });
  }

  signIn(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  register(email: string, password: string, displayName: string) {
    return from(
      createUserWithEmailAndPassword(this.auth, email, password).then(cred => {
        return updateProfile(cred.user, { displayName }).then(() => cred);
      })
    );
  }

  signOut() { return from(signOut(this.auth)); }

  get currentUser() { return this.auth.currentUser; }

  watchBoards(userId: string): Observable<Board[]> {
    return new Observable(observer => {
      const boardsRef = ref(this.db, 'boards');
      const unsub = onValue(boardsRef, snapshot => {
        const boards: Board[] = [];
        snapshot.forEach(child => {
          const board = child.val() as Board;
          if (board.memberIds?.includes(userId)) {
            boards.push({ ...board, id: child.key! });
          }
        });
        observer.next(boards);
      }, err => observer.error(err));
      return unsub;
    });
  }

  watchBoard(boardId: string): Observable<Board | null> {
    return new Observable(observer => {
      const unsub = onValue(ref(this.db, `boards/${boardId}`), snap => {
        observer.next(snap.exists() ? { ...snap.val(), id: snap.key } : null);
      }, err => observer.error(err));
      return unsub;
    });
  }

  async createBoard(title: string, userId: string): Promise<string> {
    const boardsRef = ref(this.db, 'boards');
    const newRef    = push(boardsRef);
    const boardId   = newRef.key!;

    const todoId    = this.newKey('columns/' + boardId);
    const doingId   = this.newKey('columns/' + boardId);
    const doneId    = this.newKey('columns/' + boardId);

    const updates: Record<string, any> = {};
    updates[`boards/${boardId}`] = {
      id: boardId, title, ownerId: userId,
      memberIds: [userId],
      columnOrder: [todoId, doingId, doneId],
      createdAt: Date.now(), updatedAt: Date.now()
    };
    updates[`columns/${boardId}/${todoId}`] = {
      id: todoId, boardId, title: 'To Do',
      cardOrder: [], createdAt: Date.now()
    };
    updates[`columns/${boardId}/${doingId}`] = {
      id: doingId, boardId, title: 'In Progress',
      cardOrder: [], color: '#c8f55a', createdAt: Date.now()
    };
    updates[`columns/${boardId}/${doneId}`] = {
      id: doneId, boardId, title: 'Done',
      cardOrder: [], createdAt: Date.now()
    };

    await update(ref(this.db), updates);
    return boardId;
  }

  // ── Columns ────────────────────────────────────────────────

 watchColumns(boardId: string): Observable<Column[]> {
  return new Observable(observer => {
    const unsub = onValue(ref(this.db, `columns/${boardId}`), snap => {
      const cols: Column[] = [];
      snap.forEach(child => {
        cols.push({ ...child.val(), id: child.key! });
      });
      observer.next(cols);
    }, err => observer.error(err));
    return unsub;
  });
}

  async addColumn(boardId: string, title: string, columnOrder: string[]): Promise<void> {
    const colRef  = push(ref(this.db, `columns/${boardId}`));
    const colId   = colRef.key!;
    const updates: Record<string, any> = {};
    updates[`columns/${boardId}/${colId}`] = {
      id: colId, boardId, title, cardOrder: [], createdAt: Date.now()
    };
    updates[`boards/${boardId}/columnOrder`] = [...columnOrder, colId];
    updates[`boards/${boardId}/updatedAt`]   = Date.now();
    await update(ref(this.db), updates);
  }

  async deleteColumn(boardId: string, colId: string, columnOrder: string[]): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`columns/${boardId}/${colId}`]   = null; // null = delete in RTDB
    updates[`boards/${boardId}/columnOrder`] = columnOrder.filter(id => id !== colId);
    updates[`boards/${boardId}/updatedAt`]   = Date.now();
    await update(ref(this.db), updates);
  }

  // ── Cards ──────────────────────────────────────────────────

watchCards(boardId: string): Observable<Card[]> {
  return new Observable(observer => {
    const unsub = onValue(ref(this.db, `cards/${boardId}`), snap => {
      const cards: Card[] = [];
      snap.forEach(child => {
        cards.push({ ...child.val(), id: child.key! });
      });
      observer.next(cards);
    }, err => observer.error(err));
    return unsub;
  });
}
  async addCard(boardId: string, columnId: string, title: string,
                userId: string, cardOrder: string[]): Promise<void> {
    const cardRef = push(ref(this.db, `cards/${boardId}`));
    const cardId  = cardRef.key!;
    const updates: Record<string, any> = {};
    updates[`cards/${boardId}/${cardId}`] = {
      id: cardId, boardId, columnId, title,
      priority: 'medium', labels: [],
      createdBy: userId, createdAt: Date.now(), updatedAt: Date.now()
    };
updates[`columns/${boardId}/${columnId}/cardOrder`] = [...(cardOrder ?? []), cardId];
    await update(ref(this.db), updates);
  }

  async updateCard(boardId: string, cardId: string, changes: Partial<Card>): Promise<void> {
    await update(ref(this.db, `cards/${boardId}/${cardId}`), {
      ...changes,
      updatedAt: Date.now()
    });
  }

  async deleteCard(boardId: string, cardId: string,
                   columnId: string, cardOrder: string[]): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`cards/${boardId}/${cardId}`] = null;
    updates[`columns/${boardId}/${columnId}/cardOrder`] = cardOrder.filter(id => id !== cardId);
    await update(ref(this.db), updates);
  }

  // ── Drag & Drop ────────────────────────────────────────────
  async moveCard(boardId: string, drag: DragResult,
                 fromOrder: string[], toOrder: string[]): Promise<void> {
    const sameColumn = drag.fromColumnId === drag.toColumnId;

    const newFrom = [...fromOrder];
    newFrom.splice(drag.fromIndex, 1); 
    let newTo: string[];
    if (sameColumn) {
      newTo = [...newFrom];
      newTo.splice(drag.toIndex, 0, drag.cardId); 
    } else {
      newTo = [...toOrder];
      newTo.splice(drag.toIndex, 0, drag.cardId);
    }

    const updates: Record<string, any> = {};

    if (sameColumn) {
      updates[`columns/${boardId}/${drag.fromColumnId}/cardOrder`] = newTo;
    } else {
      updates[`columns/${boardId}/${drag.fromColumnId}/cardOrder`] = newFrom;
      updates[`columns/${boardId}/${drag.toColumnId}/cardOrder`]   = newTo;
      // Update the card's columnId so it knows where it lives
      updates[`cards/${boardId}/${drag.cardId}/columnId`]         = drag.toColumnId;
      updates[`cards/${boardId}/${drag.cardId}/updatedAt`]        = Date.now();
    }


    await update(ref(this.db), updates);
  }

  // ── Presence ───────────────────────────────────────────────
  async joinBoard(boardId: string, user: User): Promise<void> {
    const color = PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
    const presRef = ref(this.db, `presence/${boardId}/${user.uid}`);
    const presence: Presence = {
      uid: user.uid,
      displayName: user.displayName,
      color,
      connectedAt: Date.now(),
      lastSeen: Date.now()
    };
    await set(presRef, presence);
    await onDisconnect(presRef).remove();
  }

  async leaveBoard(boardId: string, userId: string): Promise<void> {
    await remove(ref(this.db, `presence/${boardId}/${userId}`));
  }

watchPresence(boardId: string): Observable<Presence[]> {
  return new Observable(observer => {
    const unsub = onValue(ref(this.db, `presence/${boardId}`), snap => {
      const users: Presence[] = [];
      snap.forEach(child => {
        users.push(child.val() as Presence);
      });
      observer.next(users);
    }, err => observer.error(err));
    return unsub;
  });
}

  // ── Helpers ────────────────────────────────────────────────
  private newKey(path: string): string {
    return push(ref(this.db, path)).key!;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
