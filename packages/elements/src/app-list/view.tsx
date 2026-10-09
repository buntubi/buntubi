/** The app list's default look: a table with a segmented filter above it. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Link } from '@fluixi/core/router';
import { viewToken } from '../view.js';
import type { AppListLogic, AppStatus } from './logic.js';

const TONE: Record<AppStatus, string> = {
  live: 'var(--idp-ok)',
  in_review: 'var(--idp-info)',
  changes_requested: 'var(--idp-warn)',
  draft: 'var(--idp-muted)',
};

export const appListView = (l: AppListLogic) => (
  <section part="list" class="list">
    <style scoped>{`
      .list { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--idp-border); }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .filters { display: flex; flex-wrap: wrap; gap: 2px; padding: 3px; border-radius: 9px; background: var(--idp-surface-2); }
      .scroll { overflow-x: auto; }
      table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 13.5px; }
      th { padding: 10px 18px; text-align: left; color: var(--idp-muted); font-size: 12px; font-weight: 500; }
      td { padding: 12px 18px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); }
      /* The row's link is a Link's own <a>, outside the scope: styled through its cell. */
      td :deep(.app) { display: flex; align-items: center; gap: 12px; color: var(--idp-text); text-decoration: none; }
      .mark { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; font-weight: 600; background: var(--idp-accent-soft); color: var(--idp-accent-ink); }
      .names { display: flex; flex-direction: column; }
      .name { font-weight: 500; }
      .id { font-family: var(--idp-mono); font-size: 11.5px; color: var(--idp-muted); }
      .pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
      .pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .empty { margin: 0; padding: 28px 18px; color: var(--idp-muted); text-align: center; }
    `}</style>
    <div class="head">
      <h2>{() => l.labels().title}</h2>
      <div part="filters" class="filters" role="group">
        <For each={l.filters()}>
          {(filter) => (
            <Button
              variant={filter.current ? 'outline' : 'ghost'}
              tone="neutral"
              size="sm"
              part="filter"
              aria-pressed={filter.current ? 'true' : 'false'}
              onPress={filter.choose}
            >
              {l.labels().filters[filter.value]} {filter.count}
            </Button>
          )}
        </For>
      </div>
    </div>
    <Show when={l.rows().length} fallback={<p class="empty">{() => l.labels().empty}</p>}>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>{() => l.labels().app}</th>
              <th>{() => l.labels().status}</th>
              <th>{() => l.labels().apis}</th>
            </tr>
          </thead>
          <tbody>
            <For each={l.rows()}>
              {(row) => (
                <tr part="row">
                  <td>
                    <Link href={row.href} class="app">
                      <span class="mark">{row.name.slice(0, 1).toUpperCase()}</span>
                      <span class="names">
                        <span class="name">{row.name}</span>
                        <span class="id">
                          {row.client_id} · {l.labels().environments[row.environment]}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span class="pill" style={`--tone: ${TONE[row.status]}`}>
                      {l.labels().statuses[row.status]}
                    </span>
                  </td>
                  <td>{row.apis.join(', ')}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  </section>
);

export const AppListView = viewToken<AppListLogic>('AppListView', appListView);
