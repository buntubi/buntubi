/** The default look: a grid row matching the list's columns. */
import { Avatar, AvatarFallback } from '@fluixi-ui/avatar';
import { Badge } from '@fluixi-ui/badge';
import { Link } from '../link.js';
import { toneColor, type Tone } from '../tone.js';
import { viewToken } from '../view.js';
import type { AppRowLogic } from './logic.js';

const TONE = { live: 'success', in_review: 'info', changes_requested: 'warning', draft: 'neutral' } as const satisfies Record<string, Tone>;

export const appRowView = (r: AppRowLogic) => (
  <div part="app-row" class="row" role="row">
    <style scoped>{`
      .row { display: grid; grid-template-columns: minmax(0, 1.6fr) 160px minmax(0, 1fr); gap: 16px; align-items: center; padding: 12px 18px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      .row :deep(a) { display: flex; align-items: center; gap: 12px; min-width: 0; color: var(--idp-text); text-decoration: none; }
      .mark { flex: none; width: 32px; height: 32px; border-radius: 9px; font-weight: 600; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
      .names { display: grid; min-width: 0; }
      .name { font-weight: 500; }
      .meta { font-family: var(--idp-mono); font-size: 11.5px; color: var(--idp-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .apis { color: var(--idp-muted); }
      @media (max-width: 640px) { .row { grid-template-columns: minmax(0, 1fr) auto; } .apis { display: none; } }
    `}</style>
    <span role="cell" style={() => `--tone: ${toneColor(TONE[r.status()])}`}>
      <Link href={r.href()}>
        <Avatar class="mark" aria-hidden="true"><AvatarFallback>{() => r.mark()}</AvatarFallback></Avatar>
        <span class="names">
          <span class="name">{() => r.name()}</span>
          <span class="meta">{() => r.meta()}</span>
        </span>
      </Link>
    </span>
    <span role="cell">
      <Badge tone={TONE[r.status()]}>
        <span class="dot" />
        {() => r.statusLabel()}
      </Badge>
    </span>
    <span role="cell" class="apis">{() => r.apis()}</span>
  </div>
);

export const AppRowView = viewToken<AppRowLogic>('idp-app-row', appRowView);
