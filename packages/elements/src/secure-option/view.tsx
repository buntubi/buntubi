/** The default look: the icon in a tinted tile, the name with its pill, the why, the button. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { rowStyles } from '../info-shared/rows.js';
import { viewToken } from '../view.js';
import type { SecureOptionLogic } from './logic.js';

export const secureOptionView = (o: SecureOptionLogic) => (
  <div part="option">
    <style scoped>{`${rowStyles}`}</style>
    <div class="row">
      <span class="icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d={o.icon()} />
        </svg>
      </span>
      <span class="text">
        <span class="title">
          {() => o.title()}
          <Show when={o.badge()}>
            <span class="pill ok">{() => o.badge()}</span>
          </Show>
        </span>
        <span class="sub">{() => o.text()}</span>
      </span>
      <Button variant="outline" size="sm" disabled={o.busy()} onPress={() => o.choose()}>
        {() => o.action()}
      </Button>
    </div>
  </div>
);

export const SecureOptionView = viewToken<SecureOptionLogic>('SecureOptionView', secureOptionView);
