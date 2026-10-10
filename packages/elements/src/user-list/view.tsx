/** The default look: one card, the column headings, the rows. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { UserListLogic } from './logic.js';

export const userListView = (l: UserListLogic) => (
  <section part="users" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); overflow: clip; }
      .columns { display: grid; grid-template-columns: minmax(0, 1.6fr) 150px minmax(0, 1fr) 90px 110px; gap: 12px; padding: 10px 20px; color: var(--idp-muted); font-size: 12.5px; font-weight: 500; background: var(--idp-surface-2); position: sticky; top: calc(var(--idp-topbar, 0px) + var(--idp-head, 0px)); z-index: 1; }
      .rows > :deep(idp-user-row) { display: block; }
      .empty { margin: 0; padding: 16px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); }
      @media (max-width: 860px) { .columns { display: none; } }
    `}</style>
    <div role="table" aria-label={() => l.labels().title}>
      <div class="columns" role="row">
        <span role="columnheader">{() => l.labels().user}</span>
        <span role="columnheader">{() => l.labels().status}</span>
        <span role="columnheader">{() => l.labels().roles}</span>
        <span role="columnheader">{() => l.labels().twoStep}</span>
        <span role="columnheader" />
      </div>
      <Show when={l.users().length} fallback={<p class="empty">{() => l.labels().empty}</p>}>
        <div class="rows">
          <For each={l.users()} by={(user) => user.id}>
            {(user) => <idp-user-row user={user()} labels={l.rowLabels()} describe={l.describe()} managesAdmins={l.managesAdmins()} />}
          </For>
        </div>
      </Show>
    </div>
  </section>
);

export const UserListView = viewToken<UserListLogic>('UserListView', userListView);
