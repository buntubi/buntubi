/** The default look: one line, the link at its end. */
import { For } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { viewToken } from '../view.js';
import type { WaitingAppLogic } from './logic.js';

export const waitingAppView = (w: WaitingAppLogic) => (
  <div part="waiting-app" class="line">
    <style scoped>{`
      .line { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 0; font-size: 13.5px; }
      .meta { color: var(--idp-muted); font-size: 12.5px; }
      code { font-family: var(--idp-mono); font-size: 11.5px; padding: 1px 6px; border-radius: 6px; color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 12%, transparent); margin-left: 4px; }
      .line :deep(a) { color: var(--idp-accent-ink); font-weight: 500; text-decoration: none; }
    `}</style>
    <span>
      {() => w.name()} <span class="meta">{() => w.organization()}</span>
      <For each={w.scopes()}>{(scope) => <code>{scope}</code>}</For>
    </span>
    <Link href={w.href()}>{() => w.open()}</Link>
  </div>
);

export const WaitingAppView = viewToken<WaitingAppLogic>('WaitingAppView', waitingAppView);
