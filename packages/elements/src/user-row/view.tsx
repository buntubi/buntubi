/** The default look: a table row; who, status, roles, two-step, then the action. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { UserRowLogic } from './logic.js';

export const userRowView = (r: UserRowLogic) => (
  <div part="user" class="user" role="row" data-disabled={() => (r.user()?.disabled ? '' : undefined)}>
    <style scoped>{`
      .user { display: grid; grid-template-columns: minmax(0, 1.6fr) 150px minmax(0, 1fr) 90px 110px; gap: 12px; align-items: center; padding: 12px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      .who { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .user[data-disabled] .who { opacity: 0.55; }
      .initials { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 600; color: var(--idp-muted); background: var(--idp-surface-2); }
      .names { display: grid; min-width: 0; }
      .name { font-weight: 500; }
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
      .alert { grid-column: 1 / -1; margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 860px) { .user { grid-template-columns: minmax(0, 1fr) auto; } .state, .tags, .two { grid-column: 1; } .action { grid-row: 1; grid-column: 2; } }
    `}</style>
    <span role="cell" class="who">
      <span class="initials" aria-hidden="true">{() => r.initials()}</span>
      <span class="names">
        <span class="name">{() => r.name()}</span>
        <span class="email">{() => r.user()?.email ?? ''}</span>
      </span>
    </span>
    <span role="cell">
      <span class="state" data-tone={() => (r.user()?.disabled ? 'bad' : r.user()?.email_verified === false ? 'warn' : undefined)}>
        {() => (r.user()?.disabled ? r.labels().disabled : r.user()?.email_verified === false ? r.labels().unverified : r.labels().active)}
      </span>
    </span>
    <span role="cell" class="tags">
      <Show when={r.user()?.roles.includes('admin')}>
        <span class="tag" data-tone="accent">{() => r.labels().admin}</span>
      </Show>
      <Show when={r.user()?.developer}>
        <span class="tag">{() => r.labels().developer}</span>
      </Show>
    </span>
    <span role="cell">
      <span class="two" data-on={() => (r.user()?.mfa ? '' : undefined)}>
        {() => (r.user()?.mfa ? r.labels().on : r.labels().off)}
      </span>
    </span>
    <span role="cell" class="action">
      <Button variant="ghost" size="sm" tone={r.user()?.disabled ? 'neutral' : 'danger'} disabled={r.busy()} onPress={() => void r.toggle()}>
        {() => (r.user()?.disabled ? r.labels().enable : r.labels().disable)}
      </Button>
    </span>
    <Show when={r.error()}>
      <p class="alert" role="alert">
        {() => r.error()}
      </p>
    </Show>
  </div>
);

export const UserRowView = viewToken<UserRowLogic>('UserRowView', userRowView);
