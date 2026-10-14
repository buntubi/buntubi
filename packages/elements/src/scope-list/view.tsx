/** The default look: a card; title and the sensitivity filter, the column headings, the rows. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ScopeListLogic } from './logic.js';

export const scopeListView = (l: ScopeListLogic) => (
  <section part="scopes" class="card" aria-labelledby="idp-scopes-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); overflow: clip; }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) 120px 110px; gap: 12px; padding: 10px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); font-size: 12.5px; font-weight: 500; background: var(--idp-surface-2); position: sticky; top: calc(var(--idp-topbar, 0px) + var(--idp-head, 0px)); z-index: 1; }
      .rows > :deep(idp-scope-row) { display: block; }
      .empty { margin: 0; padding: 16px 20px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); }
      @media (max-width: 860px) { .columns { display: none; } }
    `}</style>
    <div class="head">
      <h2 id="idp-scopes-title">{() => l.labels().title}</h2>
      <idp-segmented options={l.filters()} value={l.filter()} label={l.labels().sensitivity} onChange={(event) => l.choose(event.detail.value)} />
    </div>
    <div role="table" aria-labelledby="idp-scopes-title">
      <div class="columns" role="row">
        <span role="columnheader">{() => l.labels().scope}</span>
        <span role="columnheader">{() => l.labels().description}</span>
        <span role="columnheader">{() => l.labels().api}</span>
        <span role="columnheader">{() => l.labels().sensitivity}</span>
      </div>
      <Show when={l.scopes().length} fallback={<p class="empty">{() => l.labels().empty}</p>}>
        <div class="rows">
          <For each={l.scopes()} by={(scope) => scope.name}>
            {(scope) => <idp-scope-row scope={scope()} locale={l.locale()} labels={l.rowLabels()} />}
          </For>
        </div>
      </Show>
    </div>
  </section>
);

export const ScopeListView = viewToken<ScopeListLogic>('idp-scope-list', scopeListView);
