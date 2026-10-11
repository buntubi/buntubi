/** The default look, after the board: the summary and the sign-out-all button over a card of rows. */
import { css, For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { DevicesLogic } from './logic.js';

const styles = css`
  .devices { display: grid; gap: 14px; }
  .bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
  .muted { color: var(--idp-muted); font-size: 13px; }
  .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); overflow: clip; }
  .card > :deep(idp-device) { display: block; }
  .card > :deep(idp-device + idp-device) { border-top: 1px solid var(--idp-border); }
  .note { margin: 0; color: var(--idp-muted); font-size: 12.5px; }
  .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
`;

export const devicesView = (d: DevicesLogic) => (
  <div part="devices" class="devices">
    <style scoped>{`${styles}`}</style>
    <div class="bar">
      <span class="muted">{() => d.summary()}</span>
      <Show when={d.others()}>
        <Button variant="outline" tone="danger" size="sm" disabled={d.busy()} onPress={() => void d.signOutOthers()}>
          {() => d.labels().signOutOthers}
        </Button>
      </Show>
    </div>
    <Show when={d.error()}>
      <p class="alert" role="alert">
        {() => d.error()}
      </p>
    </Show>
    <section class="card" aria-label={d.labels().title}>
      <For each={d.devices()} by={(device) => device.id}>
        {(device) => <idp-device device={device()} locale={d.locale()} labels={d.labels().device} describe={d.describe()} />}
      </For>
    </section>
    <p class="note">{() => d.labels().note}</p>
  </div>
);

export const DevicesView = viewToken<DevicesLogic>('DevicesView', devicesView);
