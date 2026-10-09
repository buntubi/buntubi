/** The default look: a grid row matching the client card's secret columns. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { SecretRowLogic } from './logic.js';

export const secretRowView = (s: SecretRowLogic) => (
  <div part="secret" class="row" role="row">
    <style scoped>{`
      .row { display: grid; grid-template-columns: minmax(0, 1.6fr) 1fr 1fr 1fr 90px; gap: 12px; align-items: center; padding: 12px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      code { font-size: 12.5px; }
      .end { justify-self: end; }
      @media (max-width: 760px) { .row { grid-template-columns: minmax(0, 1fr) auto; } .wide { display: none; } }
    `}</style>
    <span role="cell"><code>{() => `${s.prefix()} ••••••••`}</code></span>
    <span role="cell" class="wide">{() => s.created()}</span>
    <span role="cell" class="wide">{() => s.lastUsed()}</span>
    <span role="cell" class="wide">{() => s.expires()}</span>
    <span role="cell" class="end">
      <Show when={s.canRevoke()}>
        <Button variant="outline" tone="danger" size="sm" disabled={s.busy()} onPress={s.revoke}>
          {() => s.revokeLabel()}
        </Button>
      </Show>
    </span>
  </div>
);

export const SecretRowView = viewToken<SecretRowLogic>('SecretRowView', secretRowView);
