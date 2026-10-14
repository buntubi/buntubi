/** The review queue's default look: one row per app, its scopes, its wait, and the way in. */
import { For, Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { ReviewQueueLogic } from './logic.js';

export const reviewQueueView = (q: ReviewQueueLogic) => (
  <section part="queue" class="queue">
    <style scoped>{`
      .queue { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .scroll { overflow-x: auto; }
      table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 13.5px; }
      th { padding: 10px 18px; text-align: left; color: var(--idp-muted); font-size: 12px; font-weight: 500; border-bottom: 1px solid var(--idp-border); }
      td { padding: 12px 18px; border-bottom: 1px solid var(--idp-border); vertical-align: middle; }
      tr:last-child td { border-bottom: 0; }
      .app { display: flex; align-items: center; gap: 12px; }
      .mark { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; font-weight: 600; background: var(--idp-accent-soft); color: var(--idp-accent-ink); flex: none; }
      .names { display: flex; flex-direction: column; }
      .id, .meta { font-size: 12px; color: var(--idp-muted); }
      .id { font-family: var(--idp-mono); }
      .chips { display: flex; flex-wrap: wrap; gap: 4px; }
      code { font-family: var(--idp-mono); font-size: 11.5px; padding: 1px 6px; border-radius: 6px; color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 12%, transparent); }
      .end { text-align: right; }
      td :deep(a) { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: var(--idp-radius-sm); background: var(--idp-accent); color: var(--idp-accent-fg); font-weight: 500; font-size: 13px; text-decoration: none; }
      .empty { margin: 0; padding: 28px 18px; color: var(--idp-muted); text-align: center; }
    `}</style>
    <Show when={q.rows().length} fallback={<p class="empty">{() => q.labels().empty}</p>}>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>{() => q.labels().app}</th>
              <th>{() => q.labels().organization}</th>
              <th>{() => q.labels().scopes}</th>
              <th>{() => q.labels().waiting}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <For each={q.rows()} by={(row) => row.client_id}>
              {(row) => (
                <tr part="row">
                  <td>
                    <span class="app">
                      <span class="mark">{() => row().name.slice(0, 1).toUpperCase()}</span>
                      <span class="names">
                        <span>{() => row().name}</span>
                        <span class="id">{() => row().client_id}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span class="names">
                      <span>{() => row().organization?.name ?? ''}</span>
                      <span class="meta">{() => row().owner?.email ?? ''}</span>
                    </span>
                  </td>
                  <td>
                    <span class="chips">
                      <For each={row().sensitive_scopes}>{(scope) => <code>{scope}</code>}</For>
                    </span>
                  </td>
                  <td>{() => row().waited}</td>
                  <td class="end">
                    <Link href={row().href}>{() => q.labels().open}</Link>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  </section>
);

export const ReviewQueueView = viewToken<ReviewQueueLogic>('ReviewQueueView', reviewQueueView);
