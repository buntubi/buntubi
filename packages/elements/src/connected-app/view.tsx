/** The default look, after the board: the app, what it may see, and removing its access in place. */
import { css, For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { rowStyles } from '../info-shared/rows.js';
import { viewToken } from '../view.js';
import type { ConnectedAppLogic } from './logic.js';

const styles = css`
  .app { display: grid; gap: 10px; padding-bottom: 16px; }
  .app .row { padding-bottom: 0; }
  .icon { font-weight: 700; color: var(--idp-accent-ink); background: var(--idp-accent-soft); }
  .scopes { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 18px 0 72px; }
  .scope { padding: 4px 10px; border-radius: 8px; background: var(--idp-surface-2); font-size: 12.5px; }
  .confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 0 18px 0 72px; padding: 12px 14px; border-radius: 10px; background: color-mix(in srgb, var(--idp-bad) 7%, var(--idp-surface)); }
  .confirm span { flex: 1; min-width: 220px; font-size: 13px; }
  @media (max-width: 640px) { .scopes { padding-left: 18px; } .confirm { margin-left: 18px; } }
`;

export const connectedAppView = (a: ConnectedAppLogic) => (
  <div part="connected-app" class="app">
    <style scoped>{`${rowStyles}${styles}`}</style>
    <div class="row">
      <span class="icon" aria-hidden="true">
        <Show when={a.logo()} fallback={a.initial()}>
          <img src={a.logo()} alt="" />
        </Show>
      </span>
      <span class="text">
        <span class="title">
          {() => a.name()}
          <Show when={a.platform()}>
            <span class="pill quiet">{() => a.platform()}</span>
          </Show>
        </span>
        <span class="sub">{() => a.detail()}</span>
      </span>
      <Show when={!a.platform()}>
        <Button variant="outline" tone="neutral" size="sm" aria-expanded={a.confirming()} onPress={() => a.toggle()}>
          {() => (a.confirming() ? a.labels().cancel : a.labels().remove)}
        </Button>
      </Show>
    </div>
    <Show when={a.scopes().length}>
      <div class="scopes">
        <For each={a.scopes()}>{(scope) => <span class="scope">{scope}</span>}</For>
      </div>
    </Show>
    <Show when={a.confirming()}>
      <div class="confirm" role="group" aria-label={a.labels().remove}>
        <span>{() => a.labels().confirm.replace('{name}', a.name())}</span>
        <Button variant="outline" tone="danger" size="sm" disabled={a.busy()} onPress={() => void a.remove()}>
          {() => a.labels().removeNow}
        </Button>
      </div>
    </Show>
    <Show when={a.error()}>
      <p class="alert" role="alert">
        {() => a.error()}
      </p>
    </Show>
  </div>
);

export const ConnectedAppView = viewToken<ConnectedAppLogic>('ConnectedAppView', connectedAppView);
