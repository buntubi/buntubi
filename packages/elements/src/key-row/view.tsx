/** The default look: a tinted box, name over meta on the left, the prefix and Revoke on the right. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { KeyRowLogic } from './logic.js';

export const keyRowView = (k: KeyRowLogic) => (
  <div part="key" class="key">
    <style scoped>{`
      .key { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; padding: 12px 14px; border-radius: 10px; background: var(--idp-surface-2); }
      .name { font-weight: 500; }
      .meta { grid-column: 1; color: var(--idp-muted); font-size: 12.5px; }
      .side { grid-row: 1 / span 2; grid-column: 2; display: grid; justify-items: end; gap: 4px; }
      code { font-size: 12px; color: var(--idp-muted); }
    `}</style>
    <span class="name">{() => k.name()}</span>
    <span class="meta">{() => k.meta()}</span>
    <span class="side">
      <code>{() => `${k.prefix()}…`}</code>
      <Show when={k.canRevoke()}>
        <Button variant="ghost" tone="danger" size="sm" disabled={k.busy()} onPress={k.revoke}>
          {() => k.revokeLabel()}
        </Button>
      </Show>
    </span>
  </div>
);

export const KeyRowView = viewToken<KeyRowLogic>('KeyRowView', keyRowView);
