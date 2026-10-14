/** The default look: tinted pills with a dot, in a wrapping row. */
import { For } from '@fluixi/core';
import { viewToken } from '../view.js';
import { STATE_TONE, type PermissionLegendLogic } from './logic.js';

export const permissionLegendView = (l: PermissionLegendLogic) => (
  <ul part="legend" class="legend" aria-label={() => l.label()}>
    <style scoped>{`
      .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
      li { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 12%, transparent); }
      li::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    `}</style>
    <For each={l.entries()} by={(entry) => entry.state}>
      {(entry) => <li style={() => `--tone: ${STATE_TONE[entry().state]}`}>{() => entry().label}</li>}
    </For>
  </ul>
);

export const PermissionLegendView = viewToken<PermissionLegendLogic>('idp-permission-legend', permissionLegendView);
