/** The default look: the device's icon, its name, address and last use, and its sign-out button. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { rowStyles } from '../info-shared/rows.js';
import { viewToken } from '../view.js';
import type { DeviceLogic } from './logic.js';

const LAPTOP = 'M4 5h16v10H4zM2 19h20';
const PHONE = 'M7 2h10v20H7zM11 18h2';

export const deviceView = (d: DeviceLogic) => (
  <div part="device">
    <style scoped>{`${rowStyles}`}</style>
    <div class="row">
      <span class="icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d={d.phone() ? PHONE : LAPTOP} />
        </svg>
      </span>
      <span class="text">
        <span class="title">
          {() => d.name()}
          <Show when={d.here()}>
            <span class="pill ok">{() => d.labels().here}</span>
          </Show>
        </span>
        <Show when={d.network()}>
          <span class="sub">{() => d.network()}</span>
        </Show>
        <span class="sub">{() => d.seen()}</span>
      </span>
      <Show when={!d.here()}>
        <Button variant="outline" tone="neutral" size="sm" disabled={d.busy()} onPress={() => void d.signOut()}>
          {() => d.labels().signOut}
        </Button>
      </Show>
    </div>
    <Show when={d.error()}>
      <p class="alert" role="alert">
        {() => d.error()}
      </p>
    </Show>
  </div>
);

export const DeviceView = viewToken<DeviceLogic>('DeviceView', deviceView);
