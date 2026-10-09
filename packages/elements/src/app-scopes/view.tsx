/** The default look: a card, one line per stage with its scopes. */
import { For, Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { viewToken } from '../view.js';
import type { AppScopesLogic } from './logic.js';

export const appScopesView = (a: AppScopesLogic) => (
  <section part="scopes" class="card" aria-labelledby="idp-app-scopes-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 12px; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .head :deep(a) { font-size: 13px; font-weight: 500; color: var(--idp-accent-ink); text-decoration: none; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      dl { margin: 0; display: grid; gap: 10px; }
      .row { display: grid; grid-template-columns: 180px 1fr; gap: 12px; align-items: baseline; font-size: 13.5px; }
      dt { color: var(--idp-muted); }
      dd { margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
      code { font-family: var(--idp-mono); font-size: 12px; padding: 2px 7px; border-radius: 6px; background: var(--idp-surface-2); border: 1px solid var(--idp-border); }
      .muted { color: var(--idp-muted); }
      @media (max-width: 640px) { .row { grid-template-columns: 1fr; gap: 4px; } }
    `}</style>
    <div class="head">
      <h2 id="idp-app-scopes-title">{() => a.labels().title}</h2>
      <Show when={a.manageHref()}>
        <Link href={a.manageHref()}>{() => a.labels().manage}</Link>
      </Show>
    </div>
    <dl>
      <For each={a.rows()} by={(row) => row.key}>
        {(row) => (
          <div class="row">
            <dt>{() => row().label}</dt>
            <dd>
              <Show when={row().scopes.length} fallback={<span class="muted">{() => a.labels().none}</span>}>
                <For each={row().scopes}>{(scope) => <code>{scope}</code>}</For>
              </Show>
            </dd>
          </div>
        )}
      </For>
    </dl>
  </section>
);

export const AppScopesView = viewToken<AppScopesLogic>('AppScopesView', appScopesView);
