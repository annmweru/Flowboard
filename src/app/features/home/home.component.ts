// ================================================================
// WHY THIS FILE EXISTS (Home Component):
// Shows the user's boards. Dispatches loadBoards on init which
// opens a live Firebase listener — so if another user shares a
// board with you, it appears in real time without refresh.
// ================================================================

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink }   from '@angular/router';
import { Store }        from '@ngrx/store';
import { BoardActions, selectBoards, selectLoadingBoard } from '../board/store/board.store';
import { AuthActions, selectUser } from '../auth/store/auth.store';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <!-- Top bar -->
      <header class="topbar">
        <div class="logo">flow<span>board</span></div>
        <div class="user-area">
          <span class="username">{{ (user$ | async)?.displayName }}</span>
          <button class="btn-sign-out" (click)="signOut()">Sign out</button>
        </div>
      </header>

      <main class="main">
        <div class="page-header">
          <h1 class="page-title">Your <span>boards</span></h1>
          <!-- Create board inline form -->
          <div class="create-form">
            <input
              type="text"
              [(ngModel)]="newBoardTitle"
              placeholder="New board name…"
              (keyup.enter)="createBoard()"
              maxlength="60"
            />
            <button class="btn-create" (click)="createBoard()"
                    [disabled]="!newBoardTitle.trim()">
              + New board
            </button>
          </div>
        </div>

        <!-- Loading -->
        @if (loading$ | async) {
          <div class="loading-grid">
            @for (i of [1,2,3]; track i) {
              <div class="board-skeleton"></div>
            }
          </div>
        }

        <!-- Boards grid -->
        @if (!(loading$ | async)) {
          <div class="boards-grid">
            @for (board of boards$ | async; track board.id) {
              <a [routerLink]="['/board', board.id]" class="board-card">
                <div class="board-card-accent"></div>
                <div class="board-card-body">
                  <h3 class="board-name">{{ board.title }}</h3>
                  <p class="board-meta">
                    {{ board.columnOrder.length }} columns ·
                    {{ board.memberIds.length }} member{{ board.memberIds.length !== 1 ? 's' : '' }}
                  </p>
                </div>
                <div class="board-card-arrow">→</div>
              </a>
            }

            @if ((boards$ | async)?.length === 0) {
              <div class="empty-state">
                <p>No boards yet. Create your first one above.</p>
              </div>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; display: flex; flex-direction: column; }
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 40px;
      border-bottom: 1px solid var(--border);
      background: rgba(10,10,10,0.9);
      backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 50;
    }
    .logo { font-family: var(--font-display); font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
    .logo span { color: var(--accent); }
    .user-area { display: flex; align-items: center; gap: 16px; }
    .username { font-size: 13px; color: var(--muted); }
    .btn-sign-out { background: transparent; border: 1px solid var(--border); color: var(--muted); font-size: 12px; padding: 6px 14px; border-radius: var(--radius-sm); transition: all 0.2s; }
    .btn-sign-out:hover { border-color: var(--border-hover); color: var(--text); }

    .main { flex: 1; max-width: 1100px; margin: 0 auto; width: 100%; padding: 48px 40px; }

    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
    .page-title { font-family: var(--font-display); font-size: 32px; font-weight: 800; letter-spacing: -0.025em; }
    .page-title span { color: var(--accent); }

    .create-form { display: flex; gap: 8px; }
    .create-form input {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 10px 14px;
      color: var(--text); font-size: 13px; width: 240px; outline: none;
      transition: border-color 0.2s;
    }
    .create-form input:focus { border-color: var(--accent); }
    .btn-create {
      background: var(--accent); color: #0a0a0a;
      font-family: var(--font-display); font-weight: 700; font-size: 13px;
      padding: 10px 18px; border-radius: var(--radius-md); border: none;
      white-space: nowrap; transition: background 0.2s, opacity 0.2s;
    }
    .btn-create:hover:not(:disabled) { background: #a8d440; }
    .btn-create:disabled { opacity: 0.4; cursor: not-allowed; }

    .boards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

    .board-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden;
      display: flex; flex-direction: column;
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    }
    .board-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .board-card-accent { height: 4px; background: var(--accent); opacity: 0.6; }
    .board-card-body { padding: 20px; flex: 1; }
    .board-name { font-family: var(--font-display); font-size: 17px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 6px; }
    .board-meta { font-size: 12px; color: var(--muted); font-weight: 300; }
    .board-card-arrow { padding: 12px 20px; font-size: 16px; color: var(--muted); text-align: right; transition: color 0.15s; }
    .board-card:hover .board-card-arrow { color: var(--accent); }

    .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .board-skeleton { height: 120px; background: var(--surface); border-radius: var(--radius-lg); animation: shimmer 1.5s ease-in-out infinite; }
    @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }

    .empty-state { grid-column: 1/-1; padding: 48px; text-align: center; color: var(--muted); font-size: 14px; background: var(--surface); border-radius: var(--radius-lg); border: 1px dashed var(--border); }

    @media (max-width: 600px) {
      .topbar { padding: 14px 20px; }
      .main { padding: 32px 20px; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .create-form { width: 100%; }
      .create-form input { flex: 1; width: auto; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private store = inject(Store);

  boards$   = this.store.select(selectBoards);
  loading$  = this.store.select(selectLoadingBoard);
  user$     = this.store.select(selectUser);

  newBoardTitle = '';

  ngOnInit() {
    // Dispatch loadBoards — the Effect opens a live Firebase listener
    this.store.dispatch(BoardActions.loadBoards());
  }

  createBoard() {
    if (!this.newBoardTitle.trim()) return;
    this.store.dispatch(BoardActions.createBoard({ title: this.newBoardTitle.trim() }));
    this.newBoardTitle = '';
  }

  signOut() {
    this.store.dispatch(AuthActions.signOut());
  }
}
