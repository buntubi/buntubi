/** The default look: the label, the number large, a toned note; a link when it leads somewhere. */
import { Show } from '@fluixi/core';
import { Card } from '@fluixi-ui/card';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { StatCardLogic } from './logic.js';

export const statCardView = (s: StatCardLogic) => (
  <div part="stat" class="stat" data-attention={() => (s.attention() ? '' : undefined)} data-tone={() => s.tone()}>
    <style scoped>{`
      .stat > :deep(a), .stat > .plain { box-sizing: border-box; height: 100%; display: grid; gap: 6px; align-content: start; padding: 18px; color: var(--idp-text); text-decoration: none; }
      .stat[data-attention] > :deep(a), .stat[data-attention] > .plain { --flx-ui-card-border: 1px solid color-mix(in srgb, var(--flx-ui-color-warning) 45%, var(--flx-ui-color-border)); }
      .label { color: var(--idp-muted); font-size: 13px; }
      .value { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
      .note { font-size: 12.5px; color: var(--idp-muted); }
      [data-tone='ok'] .note { color: var(--idp-ok); }
      [data-tone='warn'] .note { color: var(--idp-warn); }
      [data-tone='bad'] .note { color: var(--idp-bad); }
      [data-tone='info'] .note { color: var(--idp-info); }
    `}</style>
    {/* Written out in both branches: the scoped style reaches only what this view's JSX holds. */}
    <Show
      when={s.href()}
      fallback={
        <Card class="plain">
          <span class="label">{() => s.label()}</span>
          <span class="value">{() => s.value()}</span>
          <Show when={s.note()}>
            <span class="note">{() => s.note()}</span>
          </Show>
        </Card>
      }
    >
      <Link href={s.href()} data-card="">
        <span class="label">{() => s.label()}</span>
        <span class="value">{() => s.value()}</span>
        <Show when={s.note()}>
          <span class="note">{() => s.note()}</span>
        </Show>
      </Link>
    </Show>
  </div>
);

export const StatCardView = viewToken<StatCardLogic>('idp-stat-card', statCardView);
