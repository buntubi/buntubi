/** The default look: the product's name and link on one line, two scope cards to a row. */
import { For, Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { ScopeGroupLogic } from './logic.js';

export const scopeGroupView = (g: ScopeGroupLogic) => (
  <section part="scope-group" class="group">
    <style scoped>{`
      .group { display: grid; gap: 10px; }
      .head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .head :deep(a) { color: var(--idp-accent-ink); font-size: 13px; font-weight: 500; text-decoration: none; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .grid > :deep(idp-scope-card) { display: block; }
      @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
    `}</style>
    <div class="head">
      <h2>{() => g.name()}</h2>
      <Show when={g.detailsHref()}>
        <Link href={g.detailsHref()}>{() => g.detailsLabel()}</Link>
      </Show>
    </div>
    <div class="grid">
      <For each={g.scopes()} by={(scope) => scope.name}>
        {(scope) => (
          <idp-scope-card
            name={scope().name}
            text={scope().description}
            state={scope().state}
            stateLabel={g.stateLabel(scope())}
            selected={scope().selected}
            locked={scope().locked}
            onToggle={() => g.toggle(scope().name)}
          />
        )}
      </For>
    </div>
  </section>
);

export const ScopeGroupView = viewToken<ScopeGroupLogic>('idp-scope-group', scopeGroupView);
