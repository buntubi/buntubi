/** The default look: a grid that fits as many cards per row as the width allows. */
import { For } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { StatGroupLogic } from './logic.js';

export const statGroupView = (g: StatGroupLogic) => (
  <div part="stats" class="stats">
    <style scoped>{`
      .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    `}</style>
    <For each={g.stats()} by={(stat) => stat.key}>
      {(stat) => (
        <idp-stat-card label={stat().label} value={stat().value} href={stat().href ?? ''} attention={stat().attention ?? false}
          note={stat().note ?? ''}
          tone={stat().tone ?? 'muted'}
        />
      )}
    </For>
  </div>
);

export const StatGroupView = viewToken<StatGroupLogic>('idp-stat-group', statGroupView);
