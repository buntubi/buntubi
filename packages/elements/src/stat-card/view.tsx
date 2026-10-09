/** The default look: the number large, its name under it. */
import { Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { viewToken } from '../view.js';
import type { StatCardLogic } from './logic.js';

export const statCardView = (s: StatCardLogic) => (
  <div part="stat" class="stat" data-attention={() => (s.attention() ? '' : undefined)}>
    <style scoped>{`
      .stat > :deep(a), .stat > .plain { display: grid; gap: 4px; padding: 16px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); color: var(--idp-text); text-decoration: none; }
      .stat[data-attention] > :deep(a), .stat[data-attention] > .plain { border-color: color-mix(in srgb, var(--idp-warn) 45%, var(--idp-border)); background: color-mix(in srgb, var(--idp-warn) 8%, var(--idp-surface)); }
      .value { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
      .name { color: var(--idp-muted); font-size: 13px; }
    `}</style>
    {/* Written out in both branches: the scoped style reaches only what this view's JSX holds. */}
    <Show
      when={s.href()}
      fallback={
        <div class="plain">
          <span class="value">{() => s.value()}</span>
          <span class="name">{() => s.label()}</span>
        </div>
      }
    >
      <Link href={s.href()}>
        <span class="value">{() => s.value()}</span>
        <span class="name">{() => s.label()}</span>
      </Link>
    </Show>
  </div>
);

export const StatCardView = viewToken<StatCardLogic>('StatCardView', statCardView);
