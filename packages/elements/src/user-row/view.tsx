/** The default look: a table row; who, status, roles, two-step, then the action. */
import { Show } from '@fluixi/core';
import { Link } from '../link.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@fluixi-ui/dropdown-menu';
import { viewToken } from '../view.js';
import type { UserRowLogic } from './logic.js';

export const userRowView = (r: UserRowLogic) => (
  <div part="user" class="user" role="row" data-disabled={() => (r.user()?.disabled ? '' : undefined)}>
    <style scoped>{`
      .user { display: grid; grid-template-columns: minmax(0, 1.6fr) 130px minmax(0, 1fr) 110px 120px 90px 48px; gap: 12px; align-items: center; padding: 12px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      .who { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .user[data-disabled] .who { opacity: 0.55; }
      .initials { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 600; color: var(--idp-muted); background: var(--idp-surface-2); }
      .names { display: grid; min-width: 0; }
      /* Link and the menu trigger are components: their elements carry no scope, so :deep. */
      .names > :deep(a) { font-weight: 500; color: inherit; text-decoration: none; justify-self: start; }
      .names > :deep(a:hover) { color: var(--idp-accent-ink); text-decoration: underline; }
      .date { color: var(--idp-muted); font-size: 13px; font-variant-numeric: tabular-nums; }
      .email { color: var(--idp-muted); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; }
      .state { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--idp-ok); }
      .state[data-tone='bad'] { color: var(--idp-bad); }
      .state[data-tone='warn'] { color: var(--idp-warn); }
      .state::before, .two::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .tag { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; background: var(--idp-surface-2); color: var(--idp-muted); }
      .tag[data-tone='accent'] { color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 12%, transparent); }
      .two { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--idp-muted); }
      .two[data-on] { color: var(--idp-ok); }
      .action { display: flex; justify-content: flex-end; }
      .action :deep(button) { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--idp-muted); fill: currentColor; cursor: pointer; }
      .action :deep(button:hover), .action :deep(button[data-state='open']) { background: var(--idp-surface-2); color: var(--idp-text); }
      .alert { grid-column: 1 / -1; margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 860px) { .user { grid-template-columns: minmax(0, 1fr) auto; } .state, .tags, .two, .date { grid-column: 1; } .action { grid-row: 1; grid-column: 2; } }
    `}</style>
    <span role="cell" class="who">
      <span class="initials" aria-hidden="true">{() => r.initials()}</span>
      <span class="names">
        <Link class="name" href={r.href()}>{() => r.name()}</Link>
        <span class="email">{() => r.user()?.email ?? ''}</span>
      </span>
    </span>
    <span role="cell">
      <span class="state" data-tone={() => (r.user()?.disabled ? 'bad' : r.user()?.email_verified === false ? 'warn' : undefined)}>
        {() => (r.user()?.disabled ? r.labels().disabled : r.user()?.email_verified === false ? r.labels().unverified : r.labels().active)}
      </span>
    </span>
    <span role="cell" class="tags">
      <Show when={r.user()?.superadmin} fallback={<Show when={r.user()?.roles.includes('admin')}>
        <span class="tag" data-tone="accent">{() => r.labels().admin}</span>
      </Show>}>
        <span class="tag" data-tone="accent">{() => r.labels().superadmin}</span>
      </Show>
      <Show when={r.user()?.developer}>
        <span class="tag">{() => r.labels().developer}</span>
      </Show>
    </span>
    <span role="cell" class="date">{() => r.signedUp()}</span>
    <span role="cell" class="date">
      {() => (r.user()?.password_set === false ? r.labels().invited : r.lastSignIn())}
    </span>
    <span role="cell">
      <span class="two" data-on={() => (r.user()?.mfa ? '' : undefined)}>
        {() => (r.user()?.mfa ? r.labels().on : r.labels().off)}
      </span>
    </span>
    <span role="cell" class="action">
      {/* A superadmin is managed from the command line only: no actions here. */}
      <Show when={!r.user()?.superadmin}>
        <DropdownMenu placement="bottom-end">
          <DropdownMenuTrigger class="more" aria-label={() => `${r.labels().actions}: ${r.name()}`} disabled={r.busy()}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent>
              <Show when={r.managesAdmins()}>
                <DropdownMenuItem onSelect={() => void r.toggleAdmin()}>
                  {() => (r.user()?.roles.includes('admin') ? r.labels().removeAdmin : r.labels().makeAdmin)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </Show>
              <DropdownMenuItem onSelect={() => void r.toggle()}>
                {() => (r.user()?.disabled ? r.labels().enable : r.labels().disable)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </Show>
    </span>
    <Show when={r.error()}>
      <p class="alert" role="alert">
        {() => r.error()}
      </p>
    </Show>
  </div>
);

export const UserRowView = viewToken<UserRowLogic>('idp-user-row', userRowView);
