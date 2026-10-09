/** The default look: who, what they are, the switch; a refusal under the line. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { UserRowLogic } from './logic.js';

export const userRowView = (r: UserRowLogic) => (
  <div part="user" class="user" data-disabled={() => (r.user()?.disabled ? '' : undefined)}>
    <style scoped>{`
      .user { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 12px 0; }
      .user[data-disabled] .who { opacity: 0.55; }
      .who { display: grid; gap: 2px; min-width: 0; }
      .name { font-weight: 500; font-size: 13.5px; }
      .email { color: var(--idp-muted); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
      .tag { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; background: var(--idp-surface-2); color: var(--idp-muted); }
      .tag[data-tone='accent'] { color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 12%, transparent); }
      .tag[data-tone='ok'] { color: var(--idp-ok); background: color-mix(in srgb, var(--idp-ok) 12%, transparent); }
      .tag[data-tone='warn'] { color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 12%, transparent); }
      .tag[data-tone='bad'] { color: var(--idp-bad); background: color-mix(in srgb, var(--idp-bad) 12%, transparent); }
      .alert { grid-column: 1 / -1; margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 640px) { .user { grid-template-columns: 1fr auto; } .tags { grid-column: 1 / -1; justify-content: flex-start; } }
    `}</style>
    <span class="who">
      <span class="name">{() => r.name()}</span>
      <span class="email">{() => r.user()?.email ?? ''}</span>
    </span>
    <span class="tags">
      <Show when={r.user()?.disabled}>
        <span class="tag" data-tone="bad">{() => r.labels().disabled}</span>
      </Show>
      <Show when={r.user()?.roles.includes('admin')}>
        <span class="tag" data-tone="accent">{() => r.labels().admin}</span>
      </Show>
      <Show when={r.user()?.developer}>
        <span class="tag">{() => r.labels().developer}</span>
      </Show>
      <Show when={r.user()?.mfa}>
        <span class="tag" data-tone="ok">{() => r.labels().mfa}</span>
      </Show>
      <Show when={r.user() && !r.user()?.email_verified}>
        <span class="tag" data-tone="warn">{() => r.labels().unverified}</span>
      </Show>
    </span>
    <Button variant="ghost" tone={r.user()?.disabled ? 'neutral' : 'danger'} disabled={r.busy()} onPress={() => void r.toggle()}>
      {() => (r.user()?.disabled ? r.labels().enable : r.labels().disable)}
    </Button>
    <Show when={r.error()}>
      <p class="alert" role="alert">
        {() => r.error()}
      </p>
    </Show>
  </div>
);

export const UserRowView = viewToken<UserRowLogic>('UserRowView', userRowView);
