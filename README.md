# FlowBoard — Real-time Collaborative Kanban

Angular 17 · Firebase Realtime Database · NgRx · Angular CDK DnD

---

## Setup (10 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it "flowboard"
3. **Authentication** → Get started → Email/Password → Enable
4. **Realtime Database** → Create database → Start in **test mode** (you'll add rules later)
5. **Project Settings** (gear icon) → Your apps → Web app (</>)
6. Copy the `firebaseConfig` object

### 3. Paste your Firebase config
Open `src/environments/environment.ts` and replace the placeholder values:
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "your-actual-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    // ... etc
  }
};
```

### 4. Add security rules
In Firebase Console → Realtime Database → Rules tab, paste the contents of `database.rules.json`.

### 5. Run
```bash
npm start
```
Open `http://localhost:4200` and create an account.

### 6. Test real-time sync (the fun part)
Open the same board URL in two browser windows side-by-side.  
Drag a card in one window — watch it move in the other instantly. 🎉

---

## File Structure & Why Each File Exists

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   └── index.ts              ← TypeScript interfaces for all data shapes
│   │   ├── services/
│   │   │   └── firebase.service.ts   ← ALL Firebase calls (boards, cards, presence)
│   │   └── guards/
│   │       └── auth.guard.ts         ← Redirects unauthenticated users to /login
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── store/
│   │   │   │   └── auth.store.ts     ← NgRx actions, reducer, effects, selectors for auth
│   │   │   └── components/
│   │   │       ├── login.component.ts
│   │   │       └── register.component.ts
│   │   │
│   │   ├── board/
│   │   │   ├── store/
│   │   │   │   └── board.store.ts    ← NgRx state for boards, columns, cards, presence
│   │   │   └── components/
│   │   │       ├── board.component.ts       ← Smart: reads NgRx, dispatches actions
│   │   │       ├── column.component.ts      ← CDK drop list, card add form
│   │   │       ├── card.component.ts        ← Dumb: cdkDrag, emits events up
│   │   │       └── presence-bar.component.ts ← Renders "who's online" dots
│   │   │
│   │   └── home/
│   │       └── home.component.ts     ← Boards list, create board
│   │
│   ├── shared/
│   │   └── pipes/
│   │       └── column-ids.pipe.ts    ← Transforms Column[] to string[] for CDK
│   │
│   ├── app.component.ts  ← Root: listens to Firebase auth state, syncs to NgRx
│   ├── app.config.ts     ← Providers: Firebase, NgRx, Router (replaces AppModule)
│   └── app.routes.ts     ← Routes with lazy loading + auth guard
│
├── environments/
│   ├── environment.ts            ← YOUR FIREBASE CONFIG GOES HERE
│   └── environment.production.ts
│
├── styles.scss           ← Design tokens (CSS variables) + CDK drag global styles
└── index.html
```

---

## Architecture Decisions — Interview Talking Points

### Why NgRx?
Multiple Firebase listeners run simultaneously (board, columns, cards, presence).
Without a store, you'd have multiple services with shared state causing race conditions.
NgRx gives you a single source of truth — one place to debug what the UI is showing.

### Why normalised state (flat entities)?
Storing cards nested inside columns nested inside a board means every card drag
rewrites the entire board tree. Flat state (like a database table) means a card move
is a tiny targeted update to one card and two column `cardOrder` arrays.
NgRx Entity gives O(1) lookups by ID for free.

### Why optimistic updates for drag-and-drop?
If we wait for Firebase to confirm before moving the card visually, there's a 50–200ms
delay between releasing the mouse and seeing the card move. That feels broken.
We update the store immediately (optimistic), then write to Firebase in the background.
If Firebase fails, the Effect dispatches `moveCardRevert` to undo the UI change.

### Why Firebase `onDisconnect()`?
Firebase's `onDisconnect()` schedules a server-side deletion for when a client's
WebSocket drops. Even if the browser crashes or the user closes the tab without
clicking "leave", Firebase removes their presence record within 60 seconds.
This is how the "who's online" dots stay accurate without any polling.

### Why separate Firebase paths for boards/columns/cards?
Firebase Realtime Database charges for data transferred. If cards were nested inside
columns inside boards, reading one card downloads the entire board tree.
Separate paths = pay only for what you read. Also prevents write conflicts when
multiple users move cards simultaneously (each write targets a small, unique path).

### Why Angular CDK over a custom drag solution?
CDK handles: mouse + touch events, drag preview rendering, accessible keyboard support,
drop zone detection, connected lists, and animation timing. Building this from scratch
would take a week and still have edge cases. Using CDK and knowing WHY you chose it
is itself a senior signal.

### Why ChangeDetectionStrategy.OnPush everywhere?
With 50+ cards on screen, Angular's default change detection checks EVERY component
on every event. OnPush limits re-renders to when @Input() references change or an
async pipe emits. On a live collaborative board with frequent Firebase updates,
this is the difference between a smooth 60fps UI and a laggy one.

---

## What to say in an interview

"I built a real-time collaborative kanban board. The interesting engineering challenges were:

1. **Distributed state** — multiple users editing the same data simultaneously.
   I normalised the data model so cards, columns, and boards live in separate Firebase
   paths, which prevents write conflicts and makes targeted updates cheap.

2. **Optimistic UI** — I update the local NgRx store immediately on drag-drop,
   then commit to Firebase asynchronously. If Firebase rejects the write, I revert.
   This gives sub-16ms visual feedback regardless of network latency.

3. **Presence tracking** — Firebase's onDisconnect() schedules a server-side deletion
   when a WebSocket drops. So even a browser crash removes the user's presence dot
   automatically. No polling, no cleanup code needed client-side.

4. **Performance** — ChangeDetectionStrategy.OnPush on all components, NgRx Entity
   for O(1) lookups, and lazy-loaded routes to minimise the initial bundle."
