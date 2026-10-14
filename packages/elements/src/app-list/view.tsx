/** The default look: a card, the title and the filter, the column heads, one row element per app. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { AppListLogic } from './logic.js';

export const appListView = (l: AppListLogic) => (
  <section part="list" class="list" aria-labelledby="idp-app-list-title">
    <style scoped>{`
      .list { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; padding: 14px 18px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .columns { display: grid; grid-template-columns: minmax(0, 1.6fr) 160px minmax(0, 1fr); gap: 16px; padding: 10px 18px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); font-size: 12.5px; font-weight: 500; }
      .table > :deep(idp-app-row) { display: block; }
      .empty { margin: 0; padding: 28px 18px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); text-align: center; }
      @media (max-width: 640px) { .columns { display: none; } }
    `}</style>
    <div class="head">
      <h2 id="idp-app-list-title">{() => l.labels().title}</h2>
      <idp-segmented
        options={l.filters()}
        value={l.filter()}
        label={l.labels().title}
        onChange={(event) => l.choose(event.detail.value)}
      />
    </div>
    <Show when={l.rows().length} fallback={<p class="empty">{() => l.labels().empty}</p>}>
      <div class="table" role="table" aria-labelledby="idp-app-list-title">
        <div class="columns" role="row">
          <span role="columnheader">{() => l.labels().app}</span>
          <span role="columnheader">{() => l.labels().status}</span>
          <span role="columnheader">{() => l.labels().apis}</span>
        </div>
        <For each={l.rows()} by={(row) => row.client_id}>
          {(row) => (
            <idp-app-row
              name={row().name}
              meta={`${row().client_id} · ${l.labels().environments[row().environment]}`}
              href={row().href}
              status={row().status}
              statusLabel={l.labels().statuses[row().status]}
              apis={row().apis}
            />
          )}
        </For>
      </div>
    </Show>
  </section>
);

export const AppListView = viewToken<AppListLogic>('idp-app-list', appListView);
