// ================================================================
// WHY THIS FILE EXISTS (Presence Bar):
// Shows coloured avatar dots for every user currently viewing
// this board. Firebase's onDisconnect() removes a user's presence
// when they close the tab — so this list is always accurate.
//
// WHY SEPARATE COMPONENT:
// The presence logic (watchPresence, join, leave) could live in
// the board component but it's complex enough to deserve its own
// file. Also makes it reusable — you could put it in a sidebar later.
// ================================================================

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Presence }     from '../../../core/models';

@Component({
  selector: 'app-presence-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="presence-bar">
      <!-- User avatars -->
      <div class="avatars">
        @for (user of presence; track user.uid; let i = $index) {
          @if (i < maxVisible) {
            <div
              class="avatar"
              [style.background]="user.color + '22'"
              [style.border-color]="user.color + '55'"
              [style.color]="user.color"
              [style.z-index]="presence.length - i"
              [title]="user.displayName"
              [style.margin-left]="i === 0 ? '0' : '-8px'"
            >
              {{ initial(user.displayName) }}
            </div>
          }
        }

        @if (presence.length > maxVisible) {
          <div class="avatar overflow">+{{ presence.length - maxVisible }}</div>
        }
      </div>

      <!-- Online indicator -->
      @if (presence.length > 0) {
        <div class="online-label">
          <span class="online-dot"></span>
          {{ presence.length }} online
        </div>
      }
    </div>
  `,
  styles: [`
    .presence-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatars { display: flex; align-items: center; }

    .avatar {
      width: 30px; height: 30px;
      border-radius: 50%;
      border: 1.5px solid;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display);
      font-size: 11px; font-weight: 700;
      position: relative;
      transition: transform 0.15s;
      cursor: default;
    }
    .avatar:hover { transform: translateY(-2px) scale(1.1); z-index: 99 !important; }

    .overflow {
      background: var(--bg3);
      border-color: var(--border-hover);
      color: var(--muted);
      font-size: 10px;
    }

    .online-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 300;
    }
    .online-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%,100% { opacity: 1; }
      50%      { opacity: 0.5; }
    }
  `]
})
export class PresenceBarComponent {
  @Input({ required: true }) presence: Presence[] = [];
  @Input() maxVisible = 5;

  initial(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
}
