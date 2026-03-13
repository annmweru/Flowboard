// ================================================================
// WHY THIS FILE EXISTS:
// TypeScript interfaces define the SHAPE of every piece of data
// in the app. This is the contract between Firebase, NgRx store,
// and your components. If you change a model here, TypeScript
// will immediately tell you every place in the app that breaks.
// This is what separates professional code from tutorial code.
// ================================================================

// ── User ─────────────────────────────────────────────────────
// Stored in Firebase Auth + mirrored to /users/{uid} in RTDB
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;       // Unix timestamp
}

// ── Presence ─────────────────────────────────────────────────
// Stored at /presence/{boardId}/{uid} in RTDB.
// Firebase automatically removes this when the user disconnects
// (via onDisconnect). This powers the "3 active users" dots.
export interface Presence {
  uid: string;
  displayName: string;
  color: string;           // unique colour assigned per user for their dot
  connectedAt: number;
  lastSeen: number;
}

// ── Board ────────────────────────────────────────────────────
// The top-level container. Stored at /boards/{boardId}
export interface Board {
  id: string;
  title: string;
  ownerId: string;
  memberIds: string[];     // UIDs of all members — used for security rules
  columnOrder: string[];   // ordered array of columnIds — controls left→right order
  createdAt: number;
  updatedAt: number;
}

// ── Column ───────────────────────────────────────────────────
// Stored at /columns/{boardId}/{columnId}
// WHY SEPARATE FROM BOARD: Storing columns nested inside board
// objects creates a write conflict when multiple users reorder
// cards simultaneously. Separate paths = independent writes.
export interface Column {
  id: string;
  boardId: string;
  title: string;
  cardOrder: string[];     // ordered array of cardIds within this column
  createdAt: number;
  color?: string;          // optional accent colour for the column header
}

// ── Card ─────────────────────────────────────────────────────
// Stored at /cards/{boardId}/{cardId}
// WHY SEPARATE FROM COLUMN: Same reason — separate Firebase paths
// means concurrent writes don't overwrite each other.
export interface Card {
  id: string;
  boardId: string;
  columnId: string;        // which column this card currently lives in
  title: string;
  description?: string;
  assigneeId?: string;
  priority: CardPriority;
  labels?: string[];
  dueDate?: number;        // Unix timestamp
  createdBy: string;       // UID
  createdAt: number;
  updatedAt: number;
}

export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';

// ── Drag Event ───────────────────────────────────────────────
// The shape of data we produce when a drag completes.
// WHY THIS EXISTS: Angular CDK's CdkDragDrop event is complex.
// We normalise it into this simple shape before dispatching
// to NgRx, keeping our reducer logic clean and testable.
export interface DragResult {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  fromIndex: number;
  toIndex: number;
}
