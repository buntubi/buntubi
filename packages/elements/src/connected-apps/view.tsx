/** The default look: a card of apps, then the note on the platform's own. */
import { css, For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ConnectedAppsLogic } from './logic.js';

const styles = css`
  .apps { display: grid; gap: 14px; }
  .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); overflow: clip; }
  .card > :deep(idp-connected-app) { display: block; }
  .card > :deep(idp-connected-app + idp-connected-app) { border-top: 1px solid var(--idp-border); }
  .empty { margin: 0; padding: 18px; color: var(--idp-muted); }
  .note { margin: 0; color: var(--idp-muted); font-size: 12.5px; }
`;

export const connectedAppsView = (c: ConnectedAppsLogic) => (
  <div part="connected-apps" class="apps">
    <style scoped>{`${styles}`}</style>
    <section class="card" aria-label={c.labels().title}>
      <Show when={c.apps().length} fallback={<p class="empty">{() => c.labels().empty}</p>}>
        <For each={c.apps()} by={(app) => app.id}>
          {(app) => (
            <idp-connected-app
              app={app()}
              brand={c.brand()}
              locale={c.locale()}
              scopeWords={c.scopeWords()}
              labels={c.labels().app}
              describe={c.describe()}
            />
          )}
        </For>
      </Show>
    </section>
    <Show when={c.note()}>
      <p class="note">{() => c.note()}</p>
    </Show>
  </div>
);

export const ConnectedAppsView = viewToken<ConnectedAppsLogic>('idp-connected-apps', connectedAppsView);
