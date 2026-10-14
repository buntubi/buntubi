/** The default look: one card, the column headings, the rows. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ClientListLogic } from './logic.js';

export const clientListView = (l: ClientListLogic) => (
  <section part="clients" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); overflow: clip; }
      .columns { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) 110px 110px; gap: 12px; padding: 10px 20px; color: var(--idp-muted); font-size: 12.5px; font-weight: 500; background: var(--idp-surface-2); position: sticky; top: calc(var(--idp-topbar, 0px) + var(--idp-head, 0px)); z-index: 1; }
      .columns > :last-child { text-align: right; }
      .rows > :deep(idp-client-row) { display: block; }
      .empty { margin: 0; padding: 16px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); }
      @media (max-width: 860px) { .columns { display: none; } }
    `}</style>
    <div role="table" aria-label={() => l.labels().title}>
      <div class="columns" role="row">
        <span role="columnheader">{() => l.labels().app}</span>
        <span role="columnheader">{() => l.labels().organization}</span>
        <span role="columnheader">{() => l.labels().environment}</span>
        <span role="columnheader">{() => l.labels().firstParty}</span>
      </div>
      <Show when={l.clients().length} fallback={<p class="empty">{() => l.labels().empty}</p>}>
        <div class="rows">
          <For each={l.clients()} by={(client) => client.client_id}>
            {(client) => <idp-client-row client={client()} href={l.href()} labels={l.rowLabels()} describe={l.describe()} />}
          </For>
        </div>
      </Show>
    </div>
  </section>
);

export const ClientListView = viewToken<ClientListLogic>('idp-client-list', clientListView);
