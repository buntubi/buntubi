/** The default look: a card, the title, the tiles in a wrapping row. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { AppLauncherLogic } from './logic.js';

export const appLauncherView = (l: AppLauncherLogic) => (
  <Show when={l.apps().length}>
    <section part="apps" class="card" aria-labelledby="idp-app-launcher-title">
      <style scoped>{`
        .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 16px 18px; display: grid; gap: 12px; }
        h2 { margin: 0; font-size: 15px; font-weight: 600; }
        .tiles { display: flex; flex-wrap: wrap; gap: 10px; }
        .tile { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid var(--idp-border); border-radius: 10px; color: var(--idp-text); text-decoration: none; font-weight: 500; }
        .tile:hover { background: var(--idp-surface-2); }
        .mark { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; font-weight: 700; font-size: 13px; color: var(--idp-accent-ink); background: var(--idp-accent-soft); overflow: hidden; }
        .mark img { width: 100%; height: 100%; object-fit: cover; }
      `}</style>
      <h2 id="idp-app-launcher-title">{() => l.title()}</h2>
      <div class="tiles">
        <For each={l.apps()} by={(app) => app.name}>
          {(app) => (
            <a class="tile" href={app().url ?? '#'}>
              <span class="mark" aria-hidden="true">
                <Show when={app().logo} fallback={l.initial(app())}>
                  <img src={app().logo ?? ''} alt="" />
                </Show>
              </span>
              {() => app().name}
            </a>
          )}
        </For>
      </div>
    </section>
  </Show>
);

export const AppLauncherView = viewToken<AppLauncherLogic>('idp-app-launcher', appLauncherView);
