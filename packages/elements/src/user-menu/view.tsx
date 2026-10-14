/** The default look: the initials, name over role, and the menu opening upwards. */
import { Show } from '@fluixi/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@fluixi-ui/dropdown-menu';
import { viewToken } from '../view.js';
import type { UserMenuLogic } from './logic.js';

export const userMenuView = (u: UserMenuLogic) => (
  <DropdownMenu placement="top-start">
    <DropdownMenuTrigger data-user-menu="" part="user" aria-label={() => `${u.labels().menu}: ${u.name()}`}>
      <style scoped>{`
        .mark { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--idp-accent) 12%, transparent); color: var(--idp-accent-ink); font-size: 11.5px; font-weight: 700; }
        .who { display: flex; flex-direction: column; min-width: 0; text-align: left; line-height: 1.3; }
        .name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .detail { color: var(--idp-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
      <span class="mark" aria-hidden="true">{() => u.mark()}</span>
      <Show when={!u.compact()}>
        <span class="who">
          <span class="name">{() => u.name()}</span>
          <span class="detail">{() => u.detail()}</span>
        </span>
      </Show>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={u.language}>{() => u.labels().language}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={u.signOut}>{() => u.labels().signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenu>
);

export const UserMenuView = viewToken<UserMenuLogic>('idp-user-menu', userMenuView);
