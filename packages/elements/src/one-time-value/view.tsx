/** The default look: a warm box, the note, the value in mono with the copy button beside it. */
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { OneTimeValueLogic } from './logic.js';

export const oneTimeValueView = (o: OneTimeValueLogic) => (
  <div part="once" class="once" role="status">
    <style scoped>{`
      .once { display: grid; gap: 8px; padding: 12px 14px; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--idp-warn) 35%, transparent); background: color-mix(in srgb, var(--idp-warn) 8%, var(--idp-surface)); font-size: 13px; }
      .row { display: flex; align-items: center; gap: 10px; }
      code { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 12.5px; }
    `}</style>
    <span>{() => o.note()}</span>
    <div class="row">
      <code>{() => o.value()}</code>
      <Button variant="outline" tone="neutral" size="sm" onPress={o.copy}>
        {() => o.copyLabel()}
      </Button>
    </div>
  </div>
);

export const OneTimeValueView = viewToken<OneTimeValueLogic>('idp-one-time-value', oneTimeValueView);
