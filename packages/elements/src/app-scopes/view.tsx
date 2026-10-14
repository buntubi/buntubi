/** The default look: a card, one line per stage with its scopes. */
import { For, Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { AppScopesLogic } from './logic.js';

export const appScopesView = (a: AppScopesLogic) => (
  <section part="scopes" class="card" aria-labelledby="idp-app-scopes-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px 22px; display: grid; gap: 14px; align-content: start; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .head :deep(a) { font-size: 13px; font-weight: 500; color: var(--idp-accent-ink); text-decoration: none; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      dl { margin: 0; display: grid; gap: 14px; }
      .row { display: grid; gap: 8px; }
      dt { display: flex; align-items: center; gap: 8px; color: var(--idp-muted); font-size: 13px; }
      dt::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--tone); }
      .row[data-key='live'] { --tone: var(--idp-ok); }
      .row[data-key='waiting'] { --tone: var(--idp-warn); }
      .row[data-key='sandbox'] { --tone: var(--idp-muted); }
      dd { margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
      code { font-size: 12px; padding: 2px 8px; border-radius: 6px; background: var(--idp-surface-2); border: 1px solid var(--idp-border); }
      .muted { color: var(--idp-muted); font-size: 13px; }
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
          <div class="row" data-key={() => row().key}>
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
