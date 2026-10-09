/** The default look: one card, the rows divided by rules. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { UserListLogic } from './logic.js';

export const userListView = (l: UserListLogic) => (
  <section part="users" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 4px 18px; }
      .card > :deep(idp-user-row) { display: block; }
      .card > :deep(idp-user-row + idp-user-row) { border-top: 1px solid var(--idp-border); }
      .empty { margin: 0; padding: 12px 0; color: var(--idp-muted); }
    `}</style>
    <Show when={l.users().length} fallback={<p class="empty">{() => l.empty()}</p>}>
      <For each={l.users()} by={(user) => user.id}>
        {(user) => <idp-user-row user={user()} labels={l.rowLabels()} describe={l.describe()} />}
      </For>
    </Show>
  </section>
);

export const UserListView = viewToken<UserListLogic>('UserListView', userListView);
