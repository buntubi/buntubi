/** The default look: a card with a heading, the rows divided by rules. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ScopeListLogic } from './logic.js';

export const scopeListView = (l: ScopeListLogic) => (
  <section part="scopes" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 4px; }
      h2 { margin: 0 0 6px; font-size: 15px; font-weight: 600; }
      .rows > :deep(idp-scope-row) { display: block; }
      .rows > :deep(idp-scope-row + idp-scope-row) { border-top: 1px solid var(--idp-border); }
      .empty { margin: 0; color: var(--idp-muted); }
    `}</style>
    <h2>{() => l.title()}</h2>
    <Show when={l.scopes().length} fallback={<p class="empty">{() => l.empty()}</p>}>
      <div class="rows">
        <For each={l.scopes()} by={(scope) => scope.name}>
          {(scope) => <idp-scope-row scope={scope()} locale={l.locale()} labels={l.rowLabels()} />}
        </For>
      </div>
    </Show>
  </section>
);

export const ScopeListView = viewToken<ScopeListLogic>('ScopeListView', scopeListView);
